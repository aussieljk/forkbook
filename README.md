# Forkbook

[![npm](https://img.shields.io/npm/v/@aussieljk/forkbook?label=npm)](https://www.npmjs.com/package/@aussieljk/forkbook)
[![Docs](https://img.shields.io/badge/docs-forkbook.ljk.dev-0F766E)](https://forkbook.ljk.dev)

Forkbook is a small, fast fork of [Storybook](https://github.com/storybookjs/storybook). Use it to develop, document and test UI components in isolation.

- npm: [`@aussieljk/forkbook`](https://www.npmjs.com/package/@aussieljk/forkbook)
- Docs: [forkbook.ljk.dev](https://forkbook.ljk.dev)

## What is different

- It is one package. The renderer, the frameworks, the Vite builder, the addons and the CLI are subpaths of `@aussieljk/forkbook`.
- It supports only React with Vite and Next.js with Vite.
- The CLI is `forkbook`, and the config folder is `.forkbook`.
- It sends no telemetry.

## Start

```sh
bun add -d @aussieljk/forkbook
bunx forkbook init
bunx forkbook dev
```

`.forkbook/main.ts`:

```ts
import type { StorybookConfig } from '@aussieljk/forkbook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: '@aussieljk/forkbook/react-vite',
  addons: ['@aussieljk/forkbook/addon-docs', '@aussieljk/forkbook/addon-a11y'],
};

export default config;
```

## Subpaths

| Subpath | Use |
|---|---|
| `@aussieljk/forkbook/react-vite` | React with Vite (framework) |
| `@aussieljk/forkbook/nextjs-vite` | Next.js with Vite (framework) |
| `@aussieljk/forkbook/react` | React renderer and types |
| `@aussieljk/forkbook/addon-docs` | Docs pages and MDX |
| `@aussieljk/forkbook/addon-a11y` | Accessibility checks |
| `@aussieljk/forkbook/addon-vitest` | Run stories as Vitest tests |
| `@aussieljk/forkbook/addon-themes` | Theme switcher |
| `@aussieljk/forkbook/addon-links` | Links between stories |
| `@aussieljk/forkbook/addon-pseudo-states` | Hover, focus and active states |
| `@aussieljk/forkbook/addon-mcp` | MCP server for agents |
| `@aussieljk/forkbook/test` | `fn`, `expect` and `userEvent` |

## Develop

See [CLAUDE.md](./CLAUDE.md) for the commands. `bun run verify` builds, type-checks and tests the repo.

## Licence

MIT. Forkbook is a fork of Storybook. See [LICENSE](./LICENSE).
