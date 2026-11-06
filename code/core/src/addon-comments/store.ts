import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { COMMENTS_FILE } from './constants.ts';
import type {
  CommentAction,
  CommentStatus,
  CommentsFile,
  NewStoryComment,
  StoryComment,
} from './types.ts';

export const getCommentsFilePath = (projectRoot: string) => join(projectRoot, COMMENTS_FILE);

export type CommentFilter = { status?: CommentStatus | 'all'; storyId?: string };

/**
 * Reads and writes `.forkbook/comments.json`. All writes go through one queue, so two requests at
 * the same time cannot lose a change.
 */
export class CommentStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    readonly filePath: string,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => randomUUID().slice(0, 8)
  ) {}

  async list(filter: CommentFilter = {}): Promise<StoryComment[]> {
    await this.queue;
    const { comments } = await this.read();
    const status = filter.status ?? 'all';
    return comments.filter(
      (comment) =>
        (status === 'all' || comment.status === status) &&
        (!filter.storyId || comment.storyId === filter.storyId)
    );
  }

  add(input: NewStoryComment): Promise<StoryComment> {
    const note = typeof input?.note === 'string' ? input.note.trim() : '';
    if (!note) {
      return Promise.reject(new Error('A comment must have a note'));
    }
    if (!input.storyId) {
      return Promise.reject(new Error('A comment must have a story id'));
    }
    return this.update((comments) => {
      const comment: StoryComment = {
        id: this.createId(),
        status: 'open',
        createdAt: this.now().toISOString(),
        storyId: input.storyId,
        title: input.title ?? '',
        name: input.name ?? '',
        ...(input.importPath ? { importPath: input.importPath } : {}),
        ...(input.element ? { element: input.element } : {}),
        ...(input.args ? { args: input.args } : {}),
        note,
      };
      comments.push(comment);
      return comment;
    });
  }

  resolve(id: string, reply?: string): Promise<StoryComment> {
    return this.change(id, (comment) => {
      comment.status = 'resolved';
      comment.resolvedAt = this.now().toISOString();
      if (reply?.trim()) {
        comment.reply = reply.trim();
      }
    });
  }

  reopen(id: string): Promise<StoryComment> {
    return this.change(id, (comment) => {
      comment.status = 'open';
      delete comment.resolvedAt;
    });
  }

  delete(id: string): Promise<StoryComment> {
    return this.update((comments) => {
      const index = comments.findIndex((comment) => comment.id === id);
      if (index === -1) {
        throw new Error(`No comment with id "${id}"`);
      }
      return comments.splice(index, 1)[0];
    });
  }

  /** Applies an action from the REST route. */
  apply(action: CommentAction): Promise<StoryComment> {
    switch (action?.action) {
      case 'add':
        return this.add(action.comment);
      case 'resolve':
        return this.resolve(action.id, action.reply);
      case 'reopen':
        return this.reopen(action.id);
      case 'delete':
        return this.delete(action.id);
      default:
        return Promise.reject(new Error('Unknown comment action'));
    }
  }

  private change(id: string, fn: (comment: StoryComment) => void) {
    return this.update((comments) => {
      const comment = comments.find((item) => item.id === id);
      if (!comment) {
        throw new Error(`No comment with id "${id}"`);
      }
      fn(comment);
      return comment;
    });
  }

  private update<T>(fn: (comments: StoryComment[]) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const file = await this.read();
      const result = fn(file.comments);
      await this.write(file);
      return result;
    });
    this.queue = run.catch(() => {});
    return run;
  }

  private async read(): Promise<CommentsFile> {
    let text: string;
    try {
      text = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: 1, comments: [] };
      }
      throw error;
    }
    const data = JSON.parse(text) as Partial<CommentsFile>;
    return { version: 1, comments: Array.isArray(data.comments) ? data.comments : [] };
  }

  private async write(file: CommentsFile) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(file, null, 2)}\n`);
    await rename(temp, this.filePath);
  }
}

const stores = new Map<string, CommentStore>();

/** One store for each file, so the REST route and the MCP tools share the write queue. */
export function getCommentStore(projectRoot: string): CommentStore {
  const filePath = getCommentsFilePath(projectRoot);
  let store = stores.get(filePath);
  if (!store) {
    store = new CommentStore(filePath);
    stores.set(filePath, store);
  }
  return store;
}
