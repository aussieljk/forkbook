import { COMMENTS_API_PATH } from './constants.ts';
import type { CommentAction, StoryComment } from './types.ts';

const parse = async (response: Response) => {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    comments?: StoryComment[];
    comment?: StoryComment;
  };
  if (!response.ok) {
    throw new Error(body.error ?? `Comments request failed (${response.status})`);
  }
  return body;
};

/** Reads all comments from the dev server. */
export async function fetchComments(fetchImpl: typeof fetch = fetch): Promise<StoryComment[]> {
  const body = await parse(
    await fetchImpl(COMMENTS_API_PATH, { headers: { Accept: 'application/json' } })
  );
  return body.comments ?? [];
}

/** Sends one action to the dev server. */
export async function sendCommentAction(
  action: CommentAction,
  fetchImpl: typeof fetch = fetch
): Promise<StoryComment | undefined> {
  const body = await parse(
    await fetchImpl(COMMENTS_API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    })
  );
  return body.comment;
}
