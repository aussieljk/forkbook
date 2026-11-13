---
area: Shipping
title: forkbook CLI commands and lint rules
sources:
  - code/core/src/bin/**
  - code/core/src/cli-commands/**
  - code/core/src/create/**
  - code/core/src/react-native/bin/**
  - .oxlintrc.json
  - code/.oxlintrc.json
  - scripts/eslint-plugin-local-rules/**
---
Paths are relative to `code/core/src`. `bin/dispatcher.ts:51` routes each command to a built entry.

| Command | Entry | Notes |
|---|---|---|
| `dev` | `bin/core.ts:97` | `-p`, `-c`, `--https`, `--base-path` (default `/_forkbook`), `--preview-only`, `--exact-port` |
| `build` | `bin/core.ts:148` | `-o`, `--docs`, `--test`, `--build-to-public` |
| `index` | `bin/core.ts:189` | writes `index.json` |
| `tools`, `skills` | `bin/core.ts:229,236` | agent SDK; `--no-attach` |
| `init` | `create/bin/run.ts:18` | generators NEXTJS, REACT, REACT_NATIVE; `--agent` |
| `add`, `remove` | `cli-commands/bin/run.ts` | addon install and uninstall |
| `migrate` | `cli-commands/migrate.ts:8` | rewrites Storybook names to Forkbook names |
| `pages` | `cli-commands/` | Next.js App Router page stories (also `init --pages`) |
| `info` | `cli-commands/` | envinfo |
| `rn-stories` | `react-native/bin/get-stories.ts` | regenerate RN requires |

`init` steps (`create/commands/*`): Preflight, ProjectDetection, FrameworkDetection, UserPreferences, GeneratorExecution, AddonConfiguration, DependencyInstallation, Finalization.

### Lint
- oxlint with import, jsx-a11y, typescript and react plugins (`.oxlintrc.json`).
- `code/.oxlintrc.json` adds local rules `no-uncategorized-errors` and `no-duplicated-error-codes` (`scripts/eslint-plugin-local-rules/index.js`) and import bans.
- oxfmt: print width 100, single quotes, ES5 trailing commas (`.oxfmtrc.json`).
