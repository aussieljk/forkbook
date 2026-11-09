/// <reference path="../typings.d.ts" />

import { UniversalStore } from '../shared/universal-store/index.ts';
import { Channel } from './main.ts';
import { PostMessageTransport } from './postmessage/index.ts';
import type { ChannelTransport, Config } from './types.ts';
import { getChannelUrl, normalizeBasePath } from './base-path.ts';
import { WebsocketTransport } from './websocket/index.ts';

export * from './main.ts';
export {
  clearChannel,
  ensureChannel,
  getChannel,
  installNoopChannel,
  requireChannel,
  setChannel,
} from './channel-slot.ts';

export default Channel;

export { PostMessageTransport } from './postmessage/index.ts';
export { WebsocketTransport, HEARTBEAT_INTERVAL, SERVER_CHANNEL_PATH } from './websocket/index.ts';
export {
  CHANNEL_PATH_SEGMENT,
  DEFAULT_BASE_PATH,
  getChannelPath,
  getChannelUrl,
  joinBasePath,
  normalizeBasePath,
  stripBasePath,
} from './base-path.ts';
export type { ChannelUrlOptions } from './base-path.ts';
export type { ChannelWebSocket } from './websocket/index.ts';

type Options = Config & {
  extraTransports?: ChannelTransport[];
};

/**
 * Creates a new browser channel instance.
 *
 * @param {Options} options - The options object.
 * @param {Page} options.page - Page identifier.
 * @param {ChannelTransport[]} [options.extraTransports=[]] - An optional array of extra channel
 *   transports. Default is `[]`
 * @returns {Channel} - The new channel instance.
 */
export function createBrowserChannel({ page, extraTransports = [] }: Options): Channel {
  const transports: ChannelTransport[] = [new PostMessageTransport({ page }), ...extraTransports];

  if (globalThis.CONFIG_TYPE === 'DEVELOPMENT') {
    const { wsToken, basePath } = globalThis.CHANNEL_OPTIONS || {};
    // `location.host` is the host the browser sees, so a proxy (for example `next dev`) in front of
    // Forkbook also gets the channel.
    const urlFor = (token: string | undefined) =>
      getChannelUrl({
        protocol: window.location.protocol,
        host: window.location.host,
        basePath: normalizeBasePath(basePath),
        token: String(token),
        page,
      });

    transports.push(
      new WebsocketTransport({
        url: urlFor(wsToken),
        onError: () => {},
        page,
        reconnect: {
          // A restarted dev server makes a new token. Read it from the page HTML again.
          getUrl: async () => urlFor((await fetchCurrentWsToken()) ?? wsToken),
        },
      })
    );
  }

  const channel = new Channel({ transports });
  UniversalStore.__prepare(
    channel,
    page === 'manager' ? UniversalStore.Environment.MANAGER : UniversalStore.Environment.PREVIEW
  );

  return channel;
}

/** Reads the channel token from the HTML of the current page, as the dev server serves it now. */
export async function fetchCurrentWsToken(): Promise<string | undefined> {
  try {
    const response = await fetch(window.location.href, { cache: 'no-store' });
    if (!response.ok) {
      return undefined;
    }
    return parseWsToken(await response.text());
  } catch {
    return undefined;
  }
}

export const parseWsToken = (html: string): string | undefined =>
  /"wsToken"\s*:\s*"([^"]+)"/.exec(html)?.[1];

export type {
  Listener,
  ChannelEvent,
  ChannelTransport,
  ChannelHandler,
  ChannelLike,
} from './types.ts';
