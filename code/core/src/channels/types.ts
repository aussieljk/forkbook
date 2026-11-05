export interface Config {
  page: 'manager' | 'preview';
}

export interface BufferedEvent {
  event: ChannelEvent;
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

/** Per-event options: the target frame and the telejson `stringify` options. */
export interface ChannelSendOptions {
  target?: string;
  allowRegExp?: boolean;
  allowSymbol?: boolean;
  allowDate?: boolean;
  allowError?: boolean;
  allowUndefined?: boolean;
  maxDepth?: number;
  space?: number;
}

export type ChannelHandler = (event: ChannelEvent) => void;

export interface ChannelTransport {
  send(event: ChannelEvent, options?: ChannelSendOptions): void;
  setHandler(handler: ChannelHandler): void;
}

export interface ChannelEvent {
  type: string; // eventName
  from: string;
  args: unknown[];
}

export interface Listener {
  // Listeners declare their own parameter types, so `any` lets each one fit.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]): void;
}

export interface EventsKeyValue {
  [key: string]: Listener[];
}

/**
 * Structural interface for Channel, used in type declarations to avoid nominal incompatibility
 * between source and dist Channel class declarations.
 */
export interface ChannelLike {
  readonly isAsync: boolean;
  readonly hasTransport: boolean;
  addListener(eventName: string, listener: Listener): void;
  emit(eventName: string, ...args: unknown[]): void;
  last(eventName: string): unknown[] | undefined;
  eventNames(): string[];
  listenerCount(eventName: string): number;
  listeners(eventName: string): Listener[] | undefined;
  once(eventName: string, listener: Listener): void;
  removeAllListeners(eventName?: string): void;
  removeListener(eventName: string, listener: Listener): void;
  on(eventName: string, listener: Listener): void;
  off(eventName: string, listener: Listener): void;
  receive?(event: ChannelEvent): void;
}
export type ChannelArgs = ChannelArgsSingle | ChannelArgsMulti;
export interface ChannelArgsSingle {
  transport?: ChannelTransport;
  async?: boolean;
}
export interface ChannelArgsMulti {
  transports: ChannelTransport[];
  async?: boolean;
}
