---
area: Frontend
title: Theming and components
sources:
  - code/core/src/theming/**
  - code/core/src/components/components/syntaxhighlighter/**
  - code/core/src/manager/index.tsx
---
Paths are relative to `code/core/src`.

- Themes: `theming/themes/light.ts` and `dark.ts`. `create()` falls back to `prefers-color-scheme` (`theming/create.ts:20`, `theming/utils.ts:66`).
- The manager theme is in layout state; `manager/index.tsx:78` wraps the UI in `ThemeProvider`.
- `themeToCssVars` (`theming/css-vars.ts:31`) turns the theme into `--fb-*` variables, written on `:root` by `manager/App.tsx`. Components use CSS modules that read them.
- Base UI (`@base-ui/react`) gives tabs, popover, tooltip, scroll-area and dialog to `components/`. Root imports are blocked by lint.
- Syntax highlighting: `sugar-high` in `components/components/syntaxhighlighter/syntaxhighlighter.tsx:4`; `--sh-*` colours come from `theming/modules/syntax.ts:98`.
- React Native has its own emotion-based theme in `react-native-theming/`.
