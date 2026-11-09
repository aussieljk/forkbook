/**
 * Sends WebSocket upgrades under the Forkbook base path straight to the Forkbook child.
 *
 * `next.config` cannot get the HTTP server of `next dev`. Next.js proxies upgrades for external
 * rewrites, but only after its cross-site check and route resolution, and the result depends on
 * the Next.js version. So `withForkbook` patches `http.Server.prototype.emit` in the process that
 * loads `next.config`: an `upgrade` event whose URL is under the base path goes to the child over a
 * plain TCP pipe, and Next.js never sees it. All other events (and upgrades for other paths, such
 * as `/_next/webpack-hmr`) go to Next.js as before.
 */
import http from 'node:http';
import net from 'node:net';
import type { Duplex } from 'node:stream';

interface UpgradeTarget {
  basePath: string;
  port: number;
}

/** The targets by base path. The newest config load wins. */
const targets = new Map<string, UpgradeTarget>();
let installed = false;

/** True when `url` is `<base>` or under `<base>/`. */
export function isUnderBasePath(url: string | undefined, basePath: string): boolean {
  if (!url) {
    return false;
  }
  const path = url.split('?')[0];
  return path === basePath || path.startsWith(`${basePath}/`);
}

export function findUpgradeTarget(url: string | undefined): UpgradeTarget | undefined {
  for (const target of targets.values()) {
    if (isUnderBasePath(url, target.basePath)) {
      return target;
    }
  }
  return undefined;
}

/**
 * Writes the upgrade request to the child and pipes the two sockets. The Host header becomes the
 * child (Vite checks it against `allowedHosts`), and the original host goes in `X-Forwarded-Host`.
 */
export function pipeUpgrade(
  req: http.IncomingMessage,
  socket: Duplex,
  head: Buffer,
  port: number
): void {
  const upstream = net.connect({ host: '127.0.0.1', port });
  const close = () => {
    upstream.destroy();
    socket.destroy();
  };
  upstream.once('error', close);
  socket.once('error', close);
  upstream.once('connect', () => {
    const lines = [`${req.method ?? 'GET'} ${req.url} HTTP/${req.httpVersion}`];
    const raw = req.rawHeaders;
    for (let i = 0; i < raw.length; i += 2) {
      const name = raw[i].toLowerCase();
      if (name === 'host' || name === 'x-forwarded-host') {
        continue;
      }
      lines.push(`${raw[i]}: ${raw[i + 1]}`);
    }
    lines.push(`Host: 127.0.0.1:${port}`);
    if (req.headers.host) {
      lines.push(`X-Forwarded-Host: ${req.headers.host}`);
    }
    upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head.length > 0) {
      upstream.write(head);
    }
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
}

/** Sends upgrades under `basePath` in this process to `127.0.0.1:<port>`. */
export function forwardUpgrades(basePath: string, port: number): void {
  targets.set(basePath, { basePath, port });
  if (installed) {
    return;
  }
  installed = true;
  const emit = http.Server.prototype.emit;
  http.Server.prototype.emit = function (this: http.Server, event: string, ...args: unknown[]) {
    if (event === 'upgrade') {
      const [req, socket, head] = args as [http.IncomingMessage, Duplex, Buffer];
      const target = findUpgradeTarget(req.url);
      const own = this.address();
      // Never send a server its own upgrades (the child could run in this process).
      if (target && !(own && typeof own === 'object' && own.port === target.port)) {
        pipeUpgrade(req, socket, head, target.port);
        return true;
      }
    }
    return emit.call(this, event, ...args);
  } as typeof emit;
}
