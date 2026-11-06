import type { CommentElement } from './types.ts';

/** Manager state that the toolbar button and the panel share. */
export interface CommentsAddonState {
  /** True while the user picks an element in the preview. */
  picking: boolean;
  /** The element that the user picked, for the next comment. */
  pending?: CommentElement;
  /** Set when the user starts a new comment on the whole story. */
  wholeStory?: boolean;
}

export const DEFAULT_STATE: CommentsAddonState = { picking: false };
