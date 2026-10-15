# Forkbook

## CLI

Forkbook CLI (_Command Line Interface_) is the easiest way to add [Forkbook](https://github.com/storybookjs/storybook) to your project.

![Screenshot](docs/getstorybook.png)

Go to your project and run:

```sh
cd my-app
npx storybook@latest init
```

In addition to `init`, the CLI also has other commands:

- `add` - add an addon and register it
- `info` - print out system information for bug reports
- `upgrade` - upgrade to the latest version of Forkbook (or a specific version)
- `migrate` - run codemods to migrate your code

See the command-line help with `-h` (including other useful commands) for details.

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
