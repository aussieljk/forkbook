import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parse, stringify } from 'telejson';

import { HEARTBEAT_INTERVAL, WebsocketTransport } from './index.ts';

const socketRef = { current: undefined as unknown as MockWebSocket };

class MockWebSocket {
  static OPEN = 1;

  onopen?: () => void;

  onmessage?: (event: { data: string }) => void;

  onerror?: (event: unknown) => void;

  onclose?: (event: { code: number; reason: string }) => void;

  readyState = MockWebSocket.OPEN;

  sent: string[] = [];

  closed?: { code: number; reason: string };

  constructor(public url: string) {
    socketRef.current = this;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code: number, reason: string) {
    this.closed = { code, reason };
    this.onclose?.({ code, reason });
  }

  receive(event: unknown) {
    this.onmessage?.({ data: stringify(event) });
  }
}

const createConnectedTransport = () => {
  const handler = vi.fn();
  const onError = vi.fn();
  const transport = new WebsocketTransport({
    url: 'ws://localhost:6006',
    page: 'manager',
    onError,
  });
  transport.setHandler(handler);
  socketRef.current.onopen?.();
  return { transport, handler, socket: socketRef.current };
};

const sentEvents = (socket: MockWebSocket) => socket.sent.map((data) => parse(data));

describe('WebsocketTransport heartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not close the socket when no message arrives', () => {
    const { socket } = createConnectedTransport();

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL * 4);
    expect(socket.closed).toBeUndefined();
  });

  it('replies with pong when a ping is received', () => {
    const { socket } = createConnectedTransport();

    socket.receive({ type: 'ping' });

    expect(sentEvents(socket)).toContainEqual({ type: 'pong' });
    expect(socket.closed).toBeUndefined();
  });

  it('does not forward ping events to the channel handler', () => {
    const { handler, socket } = createConnectedTransport();

    socket.receive({ type: 'ping' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('forwards non-ping events to the channel handler', () => {
    const { handler, socket } = createConnectedTransport();

    socket.receive({ type: 'test', args: [], from: 'preview' });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'test' }));
  });

  it('replies with pong even when the channel handler throws', () => {
    const { transport, socket } = createConnectedTransport();

    transport.setHandler(() => {
      throw new Error('handler boom');
    });

    expect(() => socket.receive({ type: 'ping' })).not.toThrow();
    expect(sentEvents(socket)).toContainEqual({ type: 'pong' });
  });
});

describe('WebsocketTransport reconnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  const createReconnectingTransport = (getUrl?: () => string) => {
    const handler = vi.fn();
    const transport = new WebsocketTransport({
      url: 'ws://localhost:6006/?token=old',
      page: 'manager',
      onError: vi.fn(),
      reconnect: { getUrl, initialDelay: 100, maxDelay: 400 },
    });
    transport.setHandler(handler);
    socketRef.current.onopen?.();
    return { transport, handler };
  };

  const eventTypes = (handler: ReturnType<typeof vi.fn>) =>
    handler.mock.calls.map(([event]) => event.type);

  it('opens a new socket after the socket closes and sends CHANNEL_WS_RECONNECT', async () => {
    const { handler } = createReconnectingTransport(() => 'ws://localhost:6006/?token=new');
    const first = socketRef.current;

    first.onclose?.({ code: 1006, reason: '' });
    expect(eventTypes(handler)).toEqual(['channelWSDisconnect']);
    expect(handler.mock.calls[0][0].args[0]).toMatchObject({ reconnecting: true });

    await vi.advanceTimersByTimeAsync(100);
    const second = socketRef.current;
    expect(second).not.toBe(first);
    expect(second.url).toBe('ws://localhost:6006/?token=new');

    second.onopen?.();
    expect(eventTypes(handler)).toEqual(['channelWSDisconnect', 'channelWSReconnect']);
  });

  it('sends one disconnect event for each outage and backs off between attempts', async () => {
    const { handler } = createReconnectingTransport();

    socketRef.current.onclose?.({ code: 1006, reason: '' });
    await vi.advanceTimersByTimeAsync(100);
    socketRef.current.onclose?.({ code: 1006, reason: '' });
    const failed = socketRef.current;
    await vi.advanceTimersByTimeAsync(100);
    expect(socketRef.current).toBe(failed);
    await vi.advanceTimersByTimeAsync(100);
    expect(socketRef.current).not.toBe(failed);

    expect(eventTypes(handler)).toEqual(['channelWSDisconnect']);
  });

  it('keeps messages sent while disconnected and sends them when the socket is open again', async () => {
    const { transport } = createReconnectingTransport();

    socketRef.current.onclose?.({ code: 1006, reason: '' });
    transport.send({ type: 'later', args: [], from: 'manager' });
    await vi.advanceTimersByTimeAsync(100);
    const socket = socketRef.current;
    expect(socket.sent).toEqual([]);

    socket.onopen?.();
    expect(sentEvents(socket)).toContainEqual(expect.objectContaining({ type: 'later' }));
  });

  it('stays closed without the reconnect option', async () => {
    const { handler, socket } = createConnectedTransport();
    socket.onclose?.({ code: 1006, reason: '' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(socketRef.current).toBe(socket);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
