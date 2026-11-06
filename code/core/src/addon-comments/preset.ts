import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { buffer } from 'node:stream/consumers';

import { getProjectRoot } from '@aussieljk/forkbook/internal/common';
import type { PresetPropertyFn } from '@aussieljk/forkbook/internal/types';

import { COMMENTS_API_PATH } from './constants.ts';
import { getCommentStore, type CommentStore } from './store.ts';
import type { CommentAction, CommentStatus } from './types.ts';

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

/**
 * Handles one request to the comments route. GET lists the comments. POST applies one action. POST
 * must send `application/json`, so a cross-origin page cannot send it without a CORS preflight,
 * which this server never approves.
 */
export async function handleCommentsRequest(
  store: CommentStore,
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const status = (url.searchParams.get('status') ?? 'all') as CommentStatus | 'all';
      const storyId = url.searchParams.get('storyId') ?? undefined;
      sendJson(res, 200, { comments: await store.list({ status, storyId }) });
      return;
    }

    const mediaType = req.headers['content-type']?.split(';')[0].trim().toLowerCase();
    if (mediaType !== 'application/json') {
      sendJson(res, 415, { error: 'Content-Type must be application/json' });
      return;
    }
    const action = JSON.parse((await buffer(req)).toString('utf8')) as CommentAction;
    sendJson(res, 200, { comment: await store.apply(action) });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

export const experimental_devServer: PresetPropertyFn<'experimental_devServer'> = async (app) => {
  const store = getCommentStore(getProjectRoot());
  app!.get(COMMENTS_API_PATH, (req, res) => handleCommentsRequest(store, req, res));
  app!.post(COMMENTS_API_PATH, (req, res) => handleCommentsRequest(store, req, res));
  return app;
};

/**
 * Forkbook adds this preset by itself in `forkbook dev` (see `build-dev.ts`), so the preset must
 * also give the manager and preview entries that the addon loader gives when it is in `addons`.
 * `build-dev.ts` does not add the preset when `addons` already has the addon.
 */
export const DEFAULT_ADDON = '@aussieljk/forkbook/addon-comments';

export const managerEntries = async (entries: string[] = [], options: unknown) =>
  (options as { forkbookDefaultComments?: boolean }).forkbookDefaultComments
    ? [...entries, fileURLToPath(import.meta.resolve(`${DEFAULT_ADDON}/manager`))]
    : entries;

export const previewAnnotations: PresetPropertyFn<'previewAnnotations'> = async (
  entries = [],
  options
) =>
  (options as { forkbookDefaultComments?: boolean }).forkbookDefaultComments
    ? [...entries, fileURLToPath(import.meta.resolve(`${DEFAULT_ADDON}/preview`))]
    : entries;
