# Forkbook

Forkbook (`@aussieljk/forkbook` on npm) is a small, fast fork of Storybook. It supports only React with Vite, Next.js with Vite, and React Native (iOS). It uses Bun, Vite 8, oxfmt, tsgo docgen, Base UI, sugar-high and @parcel/watcher.

## Commands

Run these from the repo root.

| Command | What it does | Time |
|---|---|---|
| `bun run verify` | Builds the packages that changed, runs typecheck, runs all tests. Prints a short summary. Full logs are in `node_modules/.cache/verify/`. | about 2 min |
| `bun run verify --changed` | The same, but runs only the tests that the changed files touch. | less than 1 min |
| `bun run verify --all` | The same, with a full build of every package. | add about 1 min |
| `bun run build:changed` | Builds only the packages with files newer than their last build (`dist/.build-stamp`). | seconds |
| `bun run build` | Builds every package. Core builds first. | about 1 min |
| `bun run typecheck` | `bun check` on all projects. Do not use `tsc`. | 5 to 25 s |
| `bun run test:changed` | Vitest, only the tests for changed files. | |
| `bun run test:unit` | All tests except the browser project. | |
| `bun run test:ui` | Only the browser project (`storybook-ui`, Playwright Chromium). | about 1 min |
| `bun x vitest run --project core path/to/file.test.ts` | One test file. | |
| `bun run merge-agent <branch>` | Merges an agent branch into master, fixes a `bun.lock` conflict, runs verify, and removes the worktree and the branch. | |
| `bun run browsers` | Installs the Playwright browsers (`pw-browsers`). | |
| `bun x oxfmt <files>` | Formats files. | |

While you work, use `verify --changed` or one test file. Run the full `bun run verify` once at the end.

## SigNoz (OpenTelemetry)

Data goes to `https://signoz.ljk.dev` when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
- Claude Code metrics and events: `.claude/settings.json`. Agent stop events: `scripts/otel-hook.ts`.
- `verify`, the package build and `merge-agent` send traces and events through `scripts/utils/otel.ts`.
- Tests: `scripts/vitest-otel-reporter.ts` sends a span for each test file and a log for each failed or flaky test.
- The key is `OTEL_EXPORTER_OTLP_HEADERS`. It is only in `.env.local` (Bun loads it) and `.claude/settings.local.json`. Git ignores both. Do not commit it.

## Rules for agents

- `master` is the only branch. Merge each agent branch with `bun run merge-agent <branch>`. Agents in worktrees do not push. The main session pushes master to GitHub after verify passes.
- A command that can take more than 2 minutes (full test run, full build) must run in the background. Wait for its completion notice. Do not let it reach the 10 minute tool limit.
- Plan parallel agents by folder. Two agents must not change the same files. A large change gets a set-up step first (for example the theme), then agents in parallel on separate folders (`code/core/src/components`, `code/core/src/manager`, `code/core/src/addon-*`).
- Each agent works in its own worktree and runs `bun install` first.
- Commit messages: ASD-STE100 Simplified Technical English, Australian spelling, no em dashes.

## Layout

- `code/core`: the one published package. Every area is a folder in `src/` and a subpath export:
  - Core: manager UI (`src/manager`), UI components (`src/components`), preview API, core server, CLI (`src/cli`, `src/bin`), theming (`src/theming`), docs tools, component docgen (tsgo).
  - Renderer and frameworks: `src/react` (argTypes, component manifest), `src/react-vite`, `src/nextjs-vite`, `src/nextjs-vite-plugin`, `src/builder-vite`.
  - Addons: `src/addon-a11y`, `-docs`, `-links`, `-mcp`, `-pseudo-states`, `-themes`, `-vitest`.
  - CLI parts: `src/create` (init), `src/cli-commands` (add, remove), `src/mcp` (docs MCP library).
  - `template/<area>`: stories and CLI templates for each area. `assets/<area>`: files that ship as they are.
- `code/core/build-config.ts` merges the entry lists in `code/core/build-config/<area>.ts`.
- An area with its own `src/<area>/vitest.config.ts` is its own Vitest project. The `core` project skips it.
- Next.js code has its own TypeScript project (`code/core/tsconfig.nextjs.json`), so the global Next.js types do not leak into the rest.
- `code/.forkbook`: the internal Forkbook. Its stories run as browser tests in the `storybook-ui` Vitest project.
- `scripts/`: build (`build-package.ts`, `build/`), `verify.ts`, `merge-agent.ts`.
- The build configs list the entries. `scripts/build/utils/generate-package-json.ts` writes the `exports` field. Each export has a `code` condition that points to the source. TypeScript uses it (`customConditions: ["code"]`), so the type check does not need a build.

## Known traps

- Some browser stories (Tabs, Popover) can fail once under full-suite load and pass alone. Run the one story file again before you change code.
- The browser tests use the built `dist` files, not the source. Build first. The build removes `node_modules/.cache/storybook`, because Vite does not see a new build in its pre-bundle cache.
- Do not run `playwright install`. Under Node 26 it can hang. Use `pw-browsers` (`bun run browsers`).
- `code/tsconfig.json` must keep `"jsx": "react-jsx"`. Vite 8 follows it, and `preserve` breaks every JSX test.
- `memfs` is pinned to 4.56.11. Later versions resolve relative paths from `/`, not from the current folder, which breaks many tests.
- oxfmt finds its config by walking up from the file. In this repo it finds the root `.oxfmtrc.json`, so tests that format files see this config.
- The tsgo API (`typescript-native/unstable/sync`) does not run under the Bun runtime. It runs under Node, which Forkbook and Vitest use.
- tsgo does not see file changes by itself. `ComponentMetaManager` reopens files when their modified time changes.
- Babel is version 7. Do not add Babel 8 packages.
- Patched dependencies are in `patches/` (`patchedDependencies` in the root `package.json`). Make a patch with `bun patch <pkg>`.
- The workspace uses `linker = "hoisted"` (`bunfig.toml`), because some packages import dependencies that only core declares.
