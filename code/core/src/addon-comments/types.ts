export type CommentStatus = 'open' | 'resolved';

export interface CommentElement {
  /** CSS selector of the element in the preview document. */
  selector: string;
  /** Short snippet of the text of the element. */
  text: string;
}

export interface StoryComment {
  id: string;
  status: CommentStatus;
  createdAt: string;
  resolvedAt?: string;
  storyId: string;
  title: string;
  name: string;
  /** Story file path, as the story index gives it (for example `./src/Button.stories.tsx`). */
  importPath?: string;
  /** Not set when the comment is on the whole story. */
  element?: CommentElement;
  args?: Record<string, unknown>;
  note: string;
  /** Optional reply, for example from an agent that resolved the comment. */
  reply?: string;
}

export type NewStoryComment = Pick<
  StoryComment,
  'storyId' | 'title' | 'name' | 'importPath' | 'element' | 'args' | 'note'
>;

export interface CommentsFile {
  version: 1;
  comments: StoryComment[];
}

export type CommentAction =
  | { action: 'add'; comment: NewStoryComment }
  | { action: 'resolve'; id: string; reply?: string }
  | { action: 'reopen'; id: string }
  | { action: 'delete'; id: string };
