import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CommentStore, getCommentsFilePath } from '../../addon-comments/store.ts';
import type { AddonMcpServer } from '../types.ts';
import { addCommentTools, LIST_COMMENTS_TOOL_NAME, RESOLVE_COMMENT_TOOL_NAME } from './comments.ts';

type Handler = (input: any) => Promise<{ content: { text: string }[]; isError?: boolean }>;

let dir: string;
let store: CommentStore;
let handlers: Record<string, Handler>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'forkbook-mcp-comments-'));
  store = new CommentStore(getCommentsFilePath(dir));
  handlers = {};
  const server = {
    tool: (meta: { name: string }, handler: Handler) => {
      handlers[meta.name] = handler;
    },
  } as unknown as AddonMcpServer;
  addCommentTools(server, undefined, () => store);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const base = { storyId: 'button--primary', title: 'Button', name: 'Primary' };

describe('comment MCP tools', () => {
  it('lists only open comments by default', async () => {
    const open = await store.add({ ...base, note: 'open one' });
    const done = await store.add({ ...base, note: 'done one' });
    await store.resolve(done.id);

    const result = await handlers[LIST_COMMENTS_TOOL_NAME]({});
    expect(result.content[0].text).toContain('open one');
    expect(result.content[0].text).not.toContain('done one');
    expect(JSON.parse(result.content[1].text).comments.map((c: { id: string }) => c.id)).toEqual([
      open.id,
    ]);

    const all = await handlers[LIST_COMMENTS_TOOL_NAME]({ status: 'all' });
    expect(JSON.parse(all.content[1].text).comments).toHaveLength(2);
  });

  it('resolves a comment with a reply', async () => {
    const comment = await store.add({ ...base, note: 'fix it' });
    const result = await handlers[RESOLVE_COMMENT_TOOL_NAME]({ id: comment.id, reply: 'Fixed' });
    expect(result.content[0].text).toContain(`Resolved comment ${comment.id}`);
    expect(await store.list({ status: 'resolved' })).toMatchObject([{ reply: 'Fixed' }]);
  });

  it('returns an error for an unknown id', async () => {
    const result = await handlers[RESOLVE_COMMENT_TOOL_NAME]({ id: 'missing' });
    expect(result.isError).toBe(true);
  });
});
