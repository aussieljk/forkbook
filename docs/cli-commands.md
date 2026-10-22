# Forkbook

## CLI

The Forkbook CLI adds Forkbook to your project. Go to your project and run:

```sh
bun add -d @aussieljk/forkbook
bunx forkbook init
```

The CLI also has these commands:

- `add`: adds an addon and registers it.
- `remove`: removes an addon.
- `migrate`: moves a project from Storybook to Forkbook. It removes the `storybook` and `@storybook/*` packages, adds Forkbook, changes the imports, and renames `STORYBOOK_*`, `sb-` and `--sb-`. Use `--dry-run` to see the changes first.
- `init --pages` (alias `pages`): for a Next.js App Router project, writes one `page.stories.tsx` for each `page.tsx`.

Use `-h` to see all commands and options.

## Core APIs

This package has multiple sub-exports to can be used to gain access to storybook's APIs.

### `@aussieljk/forkbook/components`

This export contains a list of components very useful for building out addons.
We recommend addon-authors to use these components to ensure a consistent look and feel, and to reduce the amount of code they need to write.

### `@aussieljk/forkbook/theming`

This export exposes a few utility functions to help writing components that automatically adapt to the current theme.
Useful for addon authors who want to make their addons theme-aware.

### `@aussieljk/forkbook/preview-api`

This export contains the API that is available in the preview iframe.

### `@aussieljk/forkbook/manager-api`

This export contains the API that is available in the manager iframe.

### `@aussieljk/forkbook/types`

This export exposes a lot of TypeScript interfaces used throughout storybook, including for storybook configuration, addons etc.

Learn more about Forkbook at [storybook.js.org](https://storybook.js.org/?ref=readme).
