import { joinBasePath, normalizeBasePath } from '../channels/base-path.ts';
import { COMMENTS_API_PATH } from './constants.ts';
import type { CommentAction, StoryComment } from './types.ts';

/**
 * The URL of the comments route under the Forkbook base path, for example
 * `/_forkbook/__forkbook/comments`. The base path comes from the channel options of the dev
 * server. A host app (for example `next dev` through `withForkbook`) sends only paths under the
 * base path to Forkbook, so a path outside it gives 404.
 */
export function getCommentsApiUrl(
  basePath: string | undefined = (globalThis as { CHANNEL_OPTIONS?: { basePath?: string } })
    .CHANNEL_OPTIONS?.basePath
): string {
  return joinBasePath(normalizeBasePath(basePath), COMMENTS_API_PATH);
}

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
    await fetchImpl(getCommentsApiUrl(), { headers: { Accept: 'application/json' } })
  );
  return body.comments ?? [];
}

/** Sends one action to the dev server. */
export async function sendCommentAction(
  action: CommentAction,
  fetchImpl: typeof fetch = fetch
): Promise<StoryComment | undefined> {
  const body = await parse(
    await fetchImpl(getCommentsApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    })
  );
  return body.comment;
}
