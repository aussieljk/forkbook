/**
 * The port that the browser uses to reach Forkbook when a proxy is in front of it (portless, or
 * `next dev` with `withForkbook`). The Vite HMR client must connect to this port, not to the port
 * of the Forkbook process. Reads `PORTLESS_URL`, then `FORKBOOK_PUBLIC_URL`.
 */
export function getPublicClientPort(env: NodeJS.ProcessEnv = process.env): number | undefined {
  for (const value of [env.PORTLESS_URL, env.FORKBOOK_PUBLIC_URL]) {
    if (!value) {
      continue;
    }
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      continue;
    }
    if (url.port) {
      return Number(url.port);
    }
    if (url.protocol === 'https:' || url.protocol === 'wss:') {
      return 443;
    }
    if (url.protocol === 'http:' || url.protocol === 'ws:') {
      return 80;
    }
  }
  return undefined;
}
