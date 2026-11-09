import type { IncomingMessage, ServerResponse } from 'node:http';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBasePathMount } from '../core-server/utils/base-path.ts';
import { fetchComments, getCommentsApiUrl, sendCommentAction } from './client.ts';
import { COMMENTS_API_PATH } from './constants.ts';

const g = globalThis as { CHANNEL_OPTIONS?: { basePath?: string } };

describe('comments client', () => {
  afterEach(() => {
    delete g.CHANNEL_OPTIONS;
  });

  it('puts the route under the base path', () => {
    expect(getCommentsApiUrl('/_forkbook')).toBe('/_forkbook/__forkbook/comments');
    expect(getCommentsApiUrl('/sb/')).toBe('/sb/__forkbook/comments');
    expect(getCommentsApiUrl('')).toBe('/__forkbook/comments');
  });

  it('reads the base path from the channel options, else uses the default', () => {
    expect(getCommentsApiUrl()).toBe('/_forkbook/__forkbook/comments');
    g.CHANNEL_OPTIONS = { basePath: '/docs/fb' };
    expect(getCommentsApiUrl()).toBe('/docs/fb/__forkbook/comments');
  });

  it('calls the route under the base path for GET and POST', async () => {
    g.CHANNEL_OPTIONS = { basePath: '/_forkbook' };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ comments: [] })));
    await fetchComments(fetchImpl as unknown as typeof fetch);
    await sendCommentAction({ action: 'delete', id: 'x' }, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl.mock.calls.map((call) => (call as unknown[])[0])).toEqual([
      '/_forkbook/__forkbook/comments',
      '/_forkbook/__forkbook/comments',
    ]);
  });

  it('reaches the server route after the base path mount removes the base', () => {
    const req = { url: getCommentsApiUrl('/_forkbook'), method: 'GET', headers: {} };
    const sent = createBasePathMount('/_forkbook')(
      req as unknown as IncomingMessage,
      {} as ServerResponse
    );
    expect(sent).toBe(false);
    expect(req.url).toBe(COMMENTS_API_PATH);
  });
});
