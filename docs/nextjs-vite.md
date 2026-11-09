# Forkbook for Next.js with Vite Builder

See [documentation](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite?renderer=react&ref=readme) for installation instructions, usage examples, APIs, and more.

## Run Forkbook inside `next dev` (`withForkbook`)

`withForkbook` starts Forkbook as a child of `next dev` and serves it under a base path of the app, so the app and Forkbook use one host and port.

```ts
// next.config.ts
import { withForkbook } from '@aussieljk/forkbook/next';

export default withForkbook({ reactStrictMode: true }, { basePath: '/forkbook' });
```

When the child is ready, `next dev` prints `Forkbook: <url>`, for example `Forkbook: https://app.localhost/forkbook`. The origin is `FORKBOOK_PUBLIC_URL`, else `PORTLESS_URL`, else `http://localhost:<PORT>`.

- **WebSockets.** `withForkbook` sends WebSocket upgrades under the base path (Vite HMR and the Forkbook channel) straight to the child. Next.js does not see them. Set `forwardWebSockets: false` to turn this off.
- **Public URL.** The child gets `FORKBOOK_PUBLIC_URL` (the public origin of the app), so the HMR client connects to the app and not to the port of the child.
- **Stale child.** If the child in the lock file (`node_modules/.cache/forkbook/next-dev.lock.json`) does not answer on its port, `withForkbook` removes the lock and starts a new child.

### Keep the base path out of your middleware

Requests to Forkbook go through the middleware (`middleware.ts` or `proxy.ts`) of the app before the rewrite. A middleware that changes some paths (for example one that rewrites `*.md`) also changes the Forkbook `?raw` loads of those files, and the preview breaks. Exclude the base path in the `matcher`:

```ts
// middleware.ts (or proxy.ts)
export const config = {
  matcher: [
    // Everything except Forkbook, Next.js internals and static files.
    '/((?!forkbook|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

Use your own base path in place of `forkbook` (the default is `_forkbook`).

## Acknowledgements

This framework borrows heavily from these Forkbook addons:

- [storybook-addon-next](https://github.com/RyanClementsHax/storybook-addon-next) by [RyanClementsHax](https://github.com/RyanClementsHax/)
- [storybook-addon-next-router](https://github.com/lifeiscontent/storybook-addon-next-router) by [lifeiscontent](https://github.com/lifeiscontent)

Learn more about Forkbook at [forkbook.ljk.dev](https://forkbook.ljk.dev).
