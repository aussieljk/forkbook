# Forkbook: Next.js single port with builder-vite

Status: replaced by [builder-next.md](./builder-next.md). Its phase 0 keeps the base path, the channel rename and `withForkbook`. This file is kept for reference.

## Decisions

| Topic            | Decision                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Single port      | `withForkbook(nextConfig)` with dev-only rewrites first. Forkbook running inside `next dev` comes later. |
| Ports            | The helper starts Forkbook on a free port itself. Random portless ports do not matter.                   |
| Base path        | `/_forkbook` by default. `--base-path` or `basePath` in `main.ts`. Applies to `dev` and `build`.         |
| Static build     | `forkbook-static` by default. An option writes it to `public/_forkbook`.                                 |
| Next.js target   | Latest Next.js (16.x) with Turbopack only.                                                               |
| Next.js features | Read the app's real `next.config`. Support App Router and Server Components.                             |
| Test app         | `~/p/app/toolweight` (Next 16.4, dev through `scripts/dev.ts`)                                           |

## WebSocket finding

Next 16.4.5 `next dev` (Turbopack) proxies WebSocket upgrades through an external `rewrites()` destination, `beforeFiles` and `fallback` alike, with no experimental flag. Trailing slashes break it unless `skipTrailingSlashRedirect: true` is set.

| Request through the Next port                   | Result                                                |
| ----------------------------------------------- | ----------------------------------------------------- |
| GET `/_forkbook/foo`, `/_forkbook/@vite/client` | Proxied                                               |
| WS `/_forkbook/ws`                              | Echoed, twice                                         |
| WS `/_forkbook/ws/` or `/_forkbook/?token=abc`  | Timed out. Fixed by `skipTrailingSlashRedirect: true` |
| GET `/_forkbook/`                               | Redirected to `/_forkbook`                            |
| Same app with `basePath: '/bp'`                 | Proxied. Next strips `/bp` first                      |

Source: `next/dist/server/lib/router-server.js:730-806` sends any upgrade that resolves to an external URL to `proxyRequest`, which is httpxy with `ws: true` and `changeOrigin: true` (`router-utils/proxy-request.js:30-38,104`).

- The rewrite drops a trailing slash, so Forkbook uses paths with none: `hmr.path = '/_forkbook/fb-hmr'`, `/_forkbook/fb-channel`.
- The upstream sees `Host: localhost:<forkbook port>` and `x-forwarded-host: <site host>`. The host check passes, but absolute URLs must read `x-forwarded-host`.
- The site host may need to be in Next's `allowedDevOrigins` (`router-server.js:741`).
- Not tested: `next start`, and a real Vite server behind the rewrite.

## Current state

Forkbook assumes it owns `/`. Only the manager works under a sub-path. Toolweight goes around this with a second portless host (`forkbook.toolweight.localhost`), started by `scripts/dev.ts`.

| Place                                                                                                    | Fixed to the root                                                            | Change                                            |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| `channels/websocket/index.ts:50`                                                                         | `SERVER_CHANNEL_PATH = '/storybook-server-channel'`                          | `<base>/fb-channel`                               |
| `core-server/utils/get-server-channel.ts:58`                                                             | `upgrade` handler matches the fixed path                                     | Match `<base>/fb-channel`                         |
| `builder-vite/vite-server.ts:21`                                                                         | `hmr: { port, server }`, no `path`                                           | `hmr.path` under the base path                    |
| `builder-vite/vite-config.ts:102`                                                                        | `base: './'`                                                                 | `base: '<base>/'` in dev and build                |
| `builder-vite/index.ts:73`                                                                               | `router.get('/iframe.html')`                                                 | Mount the router under the base path              |
| `core-server/utils/index-json.ts:61`, `manifests.ts:390`, `thumbnails.ts:12`, `server-statics.ts:82,131` | `/index.json`, `/manifests/...`, thumbnails, favicon, statics                | Mount the app under the base path once            |
| `preview/preview-navigator.ts:24`                                                                        | `./index.json` (relative)                                                    | Already correct                                   |
| `core-server/utils/getHostValidationMiddleware.ts`                                                       | `allowedHosts` in `core` config                                              | Add the Next host when the helper starts Forkbook |
| `nextjs-vite-plugin/utils/next-config.ts`                                                                | `loadNextConfig` loads the real config; only `images` and `distDir` are used | Use more of it (phase 3)                          |

## Phases

1. **Base path.** `basePath` in `core` config and `--base-path`, default `/_forkbook`. Mount every server route and the Vite middleware under it once. Vite `base` = `<base>/`. `hmr.path` = `<base>/fb-hmr`. Channel at `<base>/fb-channel`, client reads the base from a global the HTML sets. Read `x-forwarded-host` / `x-forwarded-proto` for absolute URLs.
   - Done when: `forkbook dev` serves everything under `/_forkbook`, nothing answers at `/`, and the static build works from a `/_forkbook/` folder.
2. **`withForkbook(nextConfig, opts)`** (subpath `@aussieljk/forkbook/next`). In `next dev` only, start Forkbook as a child on a free port, add `beforeFiles` rewrites for `<base>` and `<base>/:path*`, set `skipTrailingSlashRedirect: true`, add the site host to `allowedDevOrigins`, stop the child when Next exits, reuse it on config reload. In `next build` it adds nothing.
   - Done when: toolweight drops `scripts/dev.ts`, `portless run next dev` serves the site and `/_forkbook` on one host, and HMR and the channel work.
3. **Real `next.config`.** Add `env`, `basePath`/`assetPrefix`, `transpilePackages`, `turbopack.resolveAlias` and `resolveExtensions` → Vite `resolve`, `sassOptions`, `compiler`, `experimental.reactCompiler`, `i18n`. Warn once for ignored keys.
4. **App Router and Server Components.** App Router as default. Async server components through the `rsc` entry, `server-only` and `next/headers`/`cookies`/`draftMode` mocked per story. Server actions become `fn()` spies. `params`/`searchParams` args. Check `next/navigation` against Next 16.
5. **Embed mode (later).** Run Forkbook's Vite inside the Next dev process.

## Agents

| Agent  | Folders                                                   | Phase |
| ------ | --------------------------------------------------------- | ----- |
| Set-up | `core-server`, `builder-vite`, `channels`, `cli`, `types` | 1     |
| B      | new `src/next`, `build-config/next.ts`, docs              | 2     |
| C      | `nextjs-vite-plugin`                                      | 3     |
| D      | `nextjs-vite`, `react` (rsc entry)                        | 4     |

## Risks

| Risk                                                    | Fallback                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| Vite HMR through the rewrite fails on a real server     | Point `hmr.clientPort`/`path` straight at the Forkbook port     |
| Next reloads `next.config` and starts a second Forkbook | Lock file under `node_modules/.cache/forkbook`, reuse the child |
| Turbopack aliases do not map to Vite                    | Map the plain string aliases, warn for the rest                 |
| Async server components need a real server              | Client-rendered with mocks; true RSC out of scope               |
