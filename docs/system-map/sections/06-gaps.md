---
area: Big picture
title: Gaps found while mapping
sources:
  - code/core/src/core-server/utils/update-check.ts
  - code/core/src/core-server/utils/whats-new.ts
  - site/vercel.json
  - code/core/src/cli/tools/architecture.md
  - code/core/src/theming/README.md
  - code/core/src/core-events/index.ts
  - code/core/src/addon-mcp/tools/comments.ts
  - code/core/src/core-server/utils/runtime-instance-registry.ts
---
- The update check fetches `https://forkbook.ljk.dev/versions.json` (`code/core/src/core-server/utils/update-check.ts:9`), but nothing in `site/` builds a `versions.json`.
- What's new fetches `https://forkbook.ljk.dev/whats-new/v1` (`code/core/src/core-server/utils/whats-new.ts:32`), but `site/vercel.json:50` redirects `/whats-new/*` to `/docs`, so the request gets HTML, not data.
- `code/core/src/cli/tools/architecture.md` and `cli/tools/README.md` name the channel endpoint `/storybook-server-channel`; the code uses `<basePath>/fb-channel` (`code/core/src/core-server/utils/get-server-channel.ts:28`).
- `code/core/src/theming/README.md:5` says the CSS variables are `--sb-*`; the code writes `--fb-*` (`code/core/src/theming/css-vars.ts:31`).
- `AI_PROMPT_NUDGE` (`code/core/src/core-events/index.ts:102`) is handled by `core-server/server-channel/telemetry-channel.ts` and allowed in `event-senders.ts`, but nothing in `code/core/src` emits it.
- The comment MCP tools use snake_case names (`list_comments`, `resolve_comment` in `code/core/src/addon-mcp/tools/comments.ts:10`), unlike the kebab-case toolset names (`shared/open-service/toolset-names.ts:53`).
- Old Storybook names remain in code: `storybookDevServer` (`code/core/src/core-server/dev-server.ts:37`), `storybookVersion` and `storybookPath` in the instance record (`runtime-instance-registry.ts:70,77`), and the file `code/core/src/storybook-error.ts`.
- `code/core/src/mcp/bin.ts` is a stdio harness that is not in the package exports or bin, so only tests use it.
- The docs site has no deploy workflow; it ships only by a manual `bun run site:deploy` (root `package.json`), while npm releases are automatic.
