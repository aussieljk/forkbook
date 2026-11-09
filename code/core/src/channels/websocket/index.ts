/// <reference path="../../typings.d.ts" />
import * as EVENTS from '@aussieljk/forkbook/internal/core-events';

import { isJSON, parse, stringify } from 'telejson';
import invariant from 'tiny-invariant';

import type { ChannelEvent, ChannelHandler, ChannelTransport, Config } from '../types.ts';

type OnError = (message: Event) => void;

/** A channel event, or the transport's own reply to a server ping. */
type OutgoingMessage = ChannelEvent | { type: 'pong' };

/**
 * The slice of the WebSocket API this transport drives, so a Node runtime can supply a `ws` socket
 * where the DOM `WebSocket` global is unusable.
 */
export interface ChannelWebSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  // The handler parameters stay `any` so both the DOM `WebSocket` and a `ws` socket satisfy this
  // interface: their event types share no common supertype, and property assignment is checked
  // contravariantly.
  onopen: ((event: any) => void) | null;
  onmessage: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onclose: ((event: any) => void) | null;
}

export interface WebsocketReconnectOptions {
  /** Gives the URL for the next attempt, for example with a new token. Default: the first URL. */
  getUrl?: () => string | Promise<string>;
  /** The first wait before a new attempt, in ms. The wait doubles up to `maxDelay`. */
  initialDelay?: number;
  maxDelay?: number;
}

interface WebsocketTransportArgs extends Partial<Config> {
  url: string;
  onError: OnError;
  createSocket?: (url: string) => ChannelWebSocket;
  /**
   * When set, the transport opens a new socket after the socket closes (for example when the dev
   * server restarts), and sends CHANNEL_WS_RECONNECT when it is open again.
   */
  reconnect?: WebsocketReconnectOptions | boolean;
}

export const HEARTBEAT_INTERVAL = 15000;
/** The channel path for the default base path. Use `getChannelPath(basePath)` for another base. */
export const SERVER_CHANNEL_PATH = '/_forkbook/fb-channel';
export const RECONNECT_INITIAL_DELAY = 500;
export const RECONNECT_MAX_DELAY = 5000;
/** The most messages kept while the socket is not open. Older messages are dropped. */
const MAX_BUFFER = 500;

const CHANNEL_OPTIONS = globalThis.CHANNEL_OPTIONS || {};

export class WebsocketTransport implements ChannelTransport {
  private buffer: OutgoingMessage[] = [];

  private handler?: ChannelHandler;

  private socket: ChannelWebSocket;

  private isReady = false;

  private isClosed = false;

  private hasDisconnected = false;

  private attempt = 0;

  private readonly url: string;

  private readonly page: NonNullable<Config['page']>;

  private readonly onError: OnError;

  private readonly createSocket: (url: string) => ChannelWebSocket;

  private readonly reconnect?: WebsocketReconnectOptions;

  constructor({ url, onError, page, createSocket, reconnect }: WebsocketTransportArgs) {
    this.url = url;
    this.page = page || 'preview';
    this.onError = onError;
    this.createSocket = createSocket ?? ((socketUrl) => new WebSocket(socketUrl));
    this.reconnect = reconnect === true ? {} : reconnect || undefined;
    this.socket = this.connect(url);
  }

  private connect(url: string): ChannelWebSocket {
    const socket = this.createSocket(url);
    socket.onopen = () => {
      this.isReady = true;
      this.attempt = 0;
      this.flush();
      if (this.hasDisconnected) {
        this.hasDisconnected = false;
        this.handler?.({ type: EVENTS.CHANNEL_WS_RECONNECT, args: [], from: this.page });
      }
    };
    socket.onmessage = ({ data }: { data: unknown }) => {
      const event = typeof data === 'string' && isJSON(data) ? parse(data) : data;
      invariant(this.handler, 'WebsocketTransport handler should be set');

      if (event.type === 'ping') {
        // Pings are internal to the transport and have no channel listeners.
        this.send({ type: 'pong' });
        return;
      }

      this.handler(event);
    };
    socket.onerror = (e: Event) => {
      if (this.onError) {
        this.onError(e);
      }
    };
    socket.onclose = (ev: { code: number; reason: string }) => {
      const wasOpen = this.isReady;
      this.isReady = false;
      if (!this.reconnect) {
        invariant(this.handler, 'WebsocketTransport handler should be set');
        this.handler({
          type: EVENTS.CHANNEL_WS_DISCONNECT,
          args: [{ reason: ev.reason, code: ev.code }],
          from: this.page,
        });
        this.isClosed = true;
        return;
      }
      // Tell the listeners once for each outage, not once for each failed attempt.
      if (wasOpen || !this.hasDisconnected) {
        this.hasDisconnected = true;
        this.handler?.({
          type: EVENTS.CHANNEL_WS_DISCONNECT,
          args: [{ reason: ev.reason, code: ev.code, reconnecting: true }],
          from: this.page,
        });
      }
      this.scheduleReconnect();
    };
    return socket;
  }

  private scheduleReconnect() {
    const {
      initialDelay = RECONNECT_INITIAL_DELAY,
      maxDelay = RECONNECT_MAX_DELAY,
      getUrl,
    } = this.reconnect ?? {};
    const delay = Math.min(initialDelay * 2 ** this.attempt, maxDelay);
    this.attempt += 1;
    setTimeout(async () => {
      let nextUrl = this.url;
      try {
        nextUrl = getUrl ? await getUrl() : this.url;
      } catch {
        // Use the first URL.
      }
      this.socket = this.connect(nextUrl);
    }, delay);
  }

  setHandler(handler: ChannelHandler) {
    this.handler = handler;
  }

  send(event: OutgoingMessage) {
    if (!this.isClosed) {
      if (!this.isReady) {
        this.sendLater(event);
      } else {
        this.sendNow(event);
      }
    }
  }

  private sendLater(event: OutgoingMessage) {
    // A pong is only useful for the socket that sent the ping.
    if (event.type === 'pong') {
      return;
    }
    this.buffer.push(event);
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer.shift();
    }
  }

  private sendNow(event: OutgoingMessage) {
    const data = stringify(event, {
      maxDepth: 15,
      ...CHANNEL_OPTIONS,
    });
    this.socket.send(data);
  }

  private flush() {
    const { buffer } = this;
    this.buffer = [];
    buffer.forEach((event) => this.send(event));
  }
}
