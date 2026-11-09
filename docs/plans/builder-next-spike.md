# Forkbook: builder-next spike (phase 1)

Status: gate passed. 9 Nov 2026. Next.js 16.4.5, Turbopack, toolweight `apps/admin`.

## Result

`next dev` serves the story preview at `/_forkbook/iframe` with the real `next.config`, and no file is committed in the user's repo. The manager, `index.json` and the channel stay on the Forkbook server.

The approach that works is the last resort of the plan (c): `withForkbook` writes a route group `<app>/(forkbook)/%5Fforkbook/iframe` when `next dev` starts and removes it when `next dev` stops. Git does not see it, because `withForkbook` adds `(forkbook)/` to `.git/info/exclude`. That file is local to the clone and is never committed, so the user does not have to change `.gitignore`.

## Why (a) and (b) do not work

| Approach                                                                                             | Result                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) Route folder under `.next/forkbook/app`, added with `turbopack.resolveAlias` or `pageExtensions` | Not possible. Next.js finds the app folder only at `<project>/app` or `<project>/src/app` (`next/dist/lib/find-pages-dir.js`), and the Turbopack dev server gets that one folder (`hot-reloader-turbopack.js`, `opts.appDir`). `resolveAlias` changes how imports resolve, not which routes exist. `pageExtensions` only changes which file names in the app folder are routes. |
| (b) Catch-all route from a Next.js plugin hook                                                       | Not possible. Next.js has no plugin API that adds a route. `adapterPath` (Next.js 16 adapters) runs only for `next build`. A rewrite can only point at a route that exists or at an external URL.                                                                                                                                                                               |
| (c) Generated route group, ignored by Git                                                            | Works. See below.                                                                                                                                                                                                                                                                                                                                                               |

## What the route needs

- A folder that starts with `_` is a private folder in the App Router, so `/_forkbook` is written as `%5Fforkbook`.
- The route is under the root layout of the app. The story gets the fonts, global CSS and providers of that layout. The preview runs its own React root in `#storybook-root`, so React context of the layout does not reach the story.
- The page is a server component that renders a client component. The client component loads the preview runtime with `next/dynamic` and `ssr: false`, because the preview runtime and many story files read `window` when they load.
- The rewrite `<base>/:path*` must not take `<base>/iframe`. It is now `<base>/:path((?!(?:iframe)(?:/|$)).*)`. `<base>/iframe.html` still goes to Forkbook, which redirects it to `<base>/iframe`, so the manager needs no change.
- The preview globals (`CONFIG_TYPE`, `CHANNEL_OPTIONS` with the WebSocket token, and others) come from `<base>/iframe-globals.json` on the Forkbook server, so no secret is written to the app folder.
- The `nextjs-vite` framework preview needs the Vite aliases (`fb-original/*`), so builder-next leaves it out. Phase 3 gives the `next/*` mocks back.

## Checks (toolweight `apps/admin`, one temporary story)

| Check                                                                  | Result                                                                                                                                                     |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Story renders at `/_forkbook/iframe?id=…`                              | Yes                                                                                                                                                        |
| `next/font` (Inter from the app's `fonts.ts`)                          | Yes, the `Inter` family and fallback are on the story                                                                                                      |
| `next/image`                                                           | Yes. A static import gives `/_next/static/media/…` and loads. A string `src` uses the `public` folder of the Next.js app, not the `staticDirs` of Forkbook |
| Tailwind (v4, the app's `globals.css` through `.forkbook/preview.tsx`) | Yes, `bg-emerald-600` applies                                                                                                                              |
| Hot reload, component file                                             | Yes, about 100 ms, no page reload                                                                                                                          |
| Hot reload, story file                                                 | Yes, about 100 ms, no page reload                                                                                                                          |
| Manager at `/_forkbook`                                                | Yes. `iframe.html` redirects to `iframe` (302)                                                                                                             |
| Channel                                                                | Yes. The preview WebSocket at `/_forkbook/fb-channel` is open through `next dev`. `updateStoryArgs` gives `storyArgsUpdated` and a new render              |
| The real app at `/`                                                    | Still 200                                                                                                                                                  |
| `git status` of toolweight                                             | No change from the route                                                                                                                                   |

All 56 toolweight stories in one loader: 44 render with no mocks. The other 12 (the screen stories) fail with `invariant expected app router to be mounted`, because `next/link` and `useRouter` need the App Router context. That is phase 3.

## Problems found

- One story file that imports a Node module in the browser graph (`node:fs` in `src/app/teams/assets.ts`) makes Turbopack panic, and then no story renders. All lazy imports of the loader compile with the page, so one loader module per story file does not help. The fix is a browser-only alias: `turbopack.resolveAlias: { 'node:fs': { browser: './mock.ts' } }`. The server code of the app keeps the real module.
- Turbopack did not apply alias targets with an absolute path. Paths relative to the Next.js project folder work. `applyPreviewRouteMocks` makes absolute paths relative.
- Next.js dev shows its dev indicator ("N" button) in the preview iframe. The parity check (phase 5) must hide it, or the app sets `devIndicators: false`.
- `next dev` writes `AGENTS.md` in the project on its first run (Next.js 16.4 `agentRules`). That is not from Forkbook.
- The comments addon calls `/__forkbook/comments`, which is not under the base path, so it gives 404 through `next dev`. Phase 0 did not move it.

## How the spike ran

The toolweight repo was not changed: a temporary `withForkbook` in `apps/admin/next.config.ts`, a temporary `.forkbook-spike` config folder (the root config with `core.builder: '@aussieljk/forkbook/builder-next'`) and a temporary story, all removed after. The Forkbook build of the worktree was copied over `node_modules/@aussieljk/forkbook` and the original was put back. `git status` was the same before and after.
