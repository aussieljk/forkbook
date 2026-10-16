# 🪩 Forkbook

[![npm](https://img.shields.io/npm/v/@aussieljk/forkbook?style=flat-square&color=555&labelColor=333&label=npm)](https://www.npmjs.com/package/@aussieljk/forkbook)
[![licence](https://img.shields.io/npm/l/@aussieljk/forkbook?style=flat-square&color=555&labelColor=333&label=licence)](https://www.npmjs.com/package/@aussieljk/forkbook)

Forkbook is a small, fast workshop for UI components. Use it to develop, document and test components in isolation. It reads Storybook stories (CSF) and MDX docs.

It supports React with Vite, Next.js with Vite, and React Native (iOS, Expo).

## Install

```sh
bun add -d @aussieljk/forkbook
bunx forkbook init
bunx forkbook dev
```

```ts
import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';
```

## Quick start

- React with Vite: [forkbook.ljk.dev/docs/get-started/frameworks/react-vite](https://forkbook.ljk.dev/docs/get-started/frameworks/react-vite)
- Next.js with Vite: [forkbook.ljk.dev/docs/get-started/frameworks/nextjs-vite](https://forkbook.ljk.dev/docs/get-started/frameworks/nextjs-vite)
- React Native (iOS): [forkbook.ljk.dev/docs/get-started/frameworks/react-native](https://forkbook.ljk.dev/docs/get-started/frameworks/react-native)

## Forkbook and Storybook

| | Forkbook | Storybook 10.6 |
|---|---|---|
| Packages | One: `@aussieljk/forkbook` | One for the core, plus one for each framework, renderer and addon |
| Frameworks | React (Vite), Next.js (Vite), React Native (iOS) | React, Vue, Angular, Svelte, Preact, Web Components and more |
| Bundler | Vite 8 only | Vite and webpack |
| UI styles | CSS variables and CSS modules | Emotion |
| Syntax highlight | sugar-high | react-syntax-highlighter (Prism) |
| Component docs | tsgo (TypeScript native) | react-docgen |
| Source formatter | oxfmt | Prettier |
| File watcher | @parcel/watcher | watchpack |
| React Native UI | Expo UI (SwiftUI sheets, slider, date picker) and SF Symbols | @gorhom/bottom-sheet, react-native-svg, community slider and date picker |
| Unpacked size (web and React Native packages) | 25.8 MB | 28.9 MB (`storybook`, `@storybook/react-vite`, `react`, `builder-vite`, `react-dom-shim`, `addon-docs`, `addon-a11y`, `addon-vitest`, `nextjs-vite` and the six React Native packages) |
| Telemetry | Off | On (you can turn it off) |

## Moving from Storybook

Replace the packages with `@aussieljk/forkbook` and change the imports. See [forkbook.ljk.dev/docs/migrate/from-storybook](https://forkbook.ljk.dev/docs/migrate/from-storybook).

## Notes

- Telemetry: Forkbook sends nothing. To send traces and logs to your own OpenTelemetry server, set `OTEL_EXPORTER_OTLP_ENDPOINT` ([telemetry](https://forkbook.ljk.dev/docs/configure/telemetry)).

## Links

- Docs: [forkbook.ljk.dev](https://forkbook.ljk.dev)
- Docs for agents: [forkbook.ljk.dev/llms.txt](https://forkbook.ljk.dev/llms.txt) (add `.md` to any docs page URL for markdown)
- Source: [github.com/aussieljk/forkbook](https://github.com/aussieljk/forkbook). To work on it, see [CLAUDE.md](https://github.com/aussieljk/forkbook/blob/master/CLAUDE.md). `bun run verify` builds, type-checks and tests the repo.

## Licence

MIT.
