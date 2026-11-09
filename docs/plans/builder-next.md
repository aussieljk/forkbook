# Forkbook: builder-next plan

Status: ready. 9 Nov 2026. Replaces [single-port-builder-vite.md](./single-port-builder-vite.md), whose useful parts are phase 0 below.

## Decisions

builder-next makes `next dev` serve the story preview with the app's real config. Vite stays for static builds and Vitest.

| Topic | Decision |
| --- | --- |
| Role | Hybrid: builder-next for `forkbook dev` only. builder-vite stays for `forkbook build` and the Vitest story tests. |
| Route | Virtual: `withForkbook` adds the preview route. No files in the user's repo. |
| Server Components | Rendered in the browser with mocks, as today. Real server rendering is in `MAYBE.md`. |
| Dev and build differences | A parity check renders the same stories both ways and compares screenshots. |
| `next/*` mocks | Test both approaches (module aliases, context providers). Document the pros and cons, then pick one. |
| Setup | `withForkbook` in `next.config` is the recommended way. `forkbook dev --builder next` also works without it and then starts `next dev` itself. |
| Base path | `/_forkbook` by default, configurable. |
| Static build | Goes to `forkbook-static` by default. An option writes it to `public/_forkbook`. |
| Target | Latest Next.js (16.x), Turbopack. Test app: `~/p/app/toolweight`. |

## Architecture

```
Browser (one host, one port)
   |
   v  all requests
next dev (Turbopack)  ---- rewrite <base>/* ---->  Forkbook server (child process)
 - /            the real app                        - <base>        manager (prebuilt)
 - <base>/iframe virtual preview route              - index.json, manifests, docgen
 - real next.config, next/font, next/image          - <base>/fb-channel (WebSocket)
 - story HMR through Next                           - writes the story loader module

Parity check: screenshots Next preview vs Vite build (mini only)
Vite (builder-vite): forkbook build and Vitest story tests only
```

Next gets every request. It serves the app and the preview iframe, and rewrites the rest of `/_forkbook` to the Forkbook server that `withForkbook` starts. Vite never runs in dev.

## WebSockets through Next rewrites (tested)

Next 16.4.5 `next dev` proxies WebSocket upgrades through an external `rewrites()` destination (`beforeFiles` and `fallback`), with no experimental flag.

- Source: `next/dist/server/lib/router-server.js:730-806` sends upgrades that resolve to an external URL to `proxyRequest` (httpxy, `ws: true`, `changeOrigin: true`; `router-utils/proxy-request.js:30-38,104`).
- A path with a trailing slash (`/_forkbook/ws/`, `/_forkbook/?token=…`) times out unless `skipTrailingSlashRedirect: true` is set. The rewrite also drops the trailing slash, so Forkbook uses paths without one.
- The upstream sees `Host: localhost:<port>` and `x-forwarded-host: <site host>`. Absolute URLs must read `x-forwarded-host`.
- The site host may need to be in `allowedDevOrigins` (`router-server.js:741`).
- Not tested: `next start`.

## Phases

Phase 1 decides whether the virtual route works. If it fails, the plan stops and builder-vite stays the only builder.

0. **Base path and `withForkbook`.** `basePath` option, default `/_forkbook`, also `--base-path`. The Forkbook server mounts everything under it once (manager, `index.json`, manifests, thumbnails, favicon, statics). The channel moves from `/storybook-server-channel` to `<base>/fb-channel` on client and server. `withForkbook` starts Forkbook on a free port (works with portless), adds the `<base>` and `<base>/:path*` rewrites, sets `skipTrailingSlashRedirect: true`, adds the site host to `allowedDevOrigins`, stops the child when Next exits, and reuses a running child when Next reloads the config. Vite `base` is set from the base path for `forkbook build`. Option to write the build to `public/_forkbook`, off by default.
   - Places to change: `channels/websocket/index.ts:50`, `core-server/utils/get-server-channel.ts:58`, `builder-vite/vite-config.ts:102`, `builder-vite/index.ts:73`, `core-server/utils/index-json.ts:61`, `core-server/utils/manifests/manifests.ts:390`, `core-server/utils/thumbnails.ts:12`, `core-server/utils/server-statics.ts:82,131`. `preview/preview-navigator.ts:24` is already relative.
1. **Spike (1 day, toolweight).** Prove one story renders inside `next dev` at `/_forkbook/iframe` with no files in the repo. Try in order: a route folder generated under `.next/forkbook/app` and added through `turbopack.resolveAlias` / `pageExtensions`; a catch-all route served by a Next plugin hook; as a last resort a gitignored `app/(forkbook)` folder. Check `next/font`, `next/image`, Tailwind, hot reload.
   - Gate: one approach works with no committed files.
2. **Virtual route and story loader.** The route renders the preview runtime (`preview-api`) as a client component. Story files load through a generated module that maps each story id to a lazy `import()`, written from the story index. A change to the index rewrites that module, so Turbopack's HMR picks it up. Forkbook's server keeps the manager, `index.json`, manifests and the channel. Next serves only `/_forkbook/iframe` and its chunks.
3. **Mocks bake-off.** Build both approaches (below) behind a flag, run the same 10 toolweight stories through each, record results in `docs/builder-next-mocks.md`, pick one, delete the other.
4. **Config and selection.** `framework: { name: 'nextjs', options: { builder: 'next' } }` in `main.ts`, or `forkbook dev --builder next`. `withForkbook` turns the route on only when Forkbook asks for it. The preset still loads `nextjs-vite` for `build` and Vitest.
5. **Parity check.** A script runs `forkbook dev --builder next` and the Vite static build, screenshots every story in both with Playwright, and fails on a pixel diff above a set limit. Runs only on the mini: `verify --all` on the Air sends it over SSH. Also `bun run parity`.
6. **Docs and release.** A Next.js page: when to use each builder, known differences, the parity check. Lead with `withForkbook`.

## Mock approaches

Both are built in phase 3 and judged on the same 10 toolweight stories. The expected trade-off is below. The bake-off replaces it with measured results.

| | A: Turbopack aliases | B: Context providers |
| --- | --- | --- |
| How | `withForkbook` points `next/navigation`, `next/headers`, `next/cache` at Forkbook mocks with `turbopack.resolveAlias` | Stories are wrapped in Next's own providers (`AppRouterContext`, `PathnameContext`, `SearchParamsContext`) filled with story values |
| Covers | Every import, including `headers()`, `cookies()`, `redirect()`, `notFound()` | Only hooks that read context. `headers()`, `cookies()`, `redirect()` are not covered |
| Main risk | Aliases are global: they may leak into the real app routes unless scoped to the preview route | Next's context names are internal and change between versions |
| Per-story values | Shared mock store, like `nextjs-vite` today | Provider props |
| Code reuse | Reuses `nextjs-vite-plugin/mocks` | New code |

Judged on: stories that render correctly, whether the real app at `/` still works, hot reload time, and lines of Forkbook code needed.

## Agents

Phase 0 runs first, alone. Phases 1 and 2 run as one agent, because the spike decides the route design. Then three agents run in parallel.

| Agent | Folders | Phases |
| --- | --- | --- |
| Set-up | `core-server`, `channels`, `builder-vite`, `cli`, `types`, new `src/next` (helper) | 0 |
| A | new `src/builder-next` | 1, 2 |
| B | `src/builder-next/mocks-aliases`, `src/builder-next/mocks-context` | 3 |
| C | `src/nextjs-vite/preset.ts`, `src/cli` | 4 |
| D | `scripts/parity.ts`, docs | 5, 6 |

## Risks

| Risk | Fallback |
| --- | --- |
| Next has no supported way to add a route with no files | Gitignored `app/(forkbook)` folder that `withForkbook` writes and removes |
| Turbopack aliases leak into the real app | Use context providers (approach B) |
| The story loader module makes Turbopack recompile everything on each story change | One loader module per story file |
| Next reloads `next.config` and starts a second Forkbook | Lock file under `node_modules/.cache/forkbook`, reuse the child |
| Parity check is flaky (fonts, animations) | Turn off animations, wait for fonts, set a diff limit per story |
| Next changes its internals between minor versions | Pin the tested Next range in `peerDependencies`, run the spike test in CI |

## Tests

- Unit: base path joins, channel URL, rewrites from `withForkbook`, story loader generation.
- Integration: a fixture Next 16 app. Start `next dev`, open `/_forkbook` in Playwright, check a story renders, edit a story and check HMR, send a channel event.
- Parity: phase 5, on the mini.
- Manual: toolweight with `portless run next dev`, on the mini.
