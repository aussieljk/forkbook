---
area: Frontend
title: Addon panels and tools
sources:
  - code/core/src/controls/manager.tsx
  - code/core/src/actions/manager.tsx
  - code/core/src/component-testing/**
  - code/core/src/addon-*/manager.tsx
  - code/core/src/addon-links/manager.ts
  - code/core/src/toolbar/**
  - code/core/src/outline/**
  - code/core/src/measure/**
  - code/core/src/viewport/**
  - code/core/src/backgrounds/**
---
Paths are relative to `code/core/src`.

| Addon | UI | Talks over |
|---|---|---|
| `controls/manager.tsx` | PANEL | `SAVE_STORY_*`, `core/docgen` service |
| `actions/manager.tsx` | PANEL | action events |
| `component-testing/manager.tsx` | PANEL "Interactions" | instrumenter `START/BACK/GOTO/NEXT/END`, `FORCE_REMOUNT` |
| `addon-a11y/manager.tsx:50` | TOOL vision filter, PANEL | `EVENTS.MANUAL/RESULT/ERROR`, highlight |
| `addon-docs/manager.tsx:107` | PANEL "Code" | `SNIPPET_RENDERED` |
| `addon-comments/manager.tsx` | TOOL picker, PANEL | REST `/__forkbook/comments`, `PICK_START/PICKED` |
| `addon-vitest/manager.tsx` | TEST_PROVIDER (Vite only) | UniversalStore events |
| `addon-themes`, `addon-pseudo-states` | TOOL | `updateGlobals` |
| `outline`, `measure`, `viewport`, `backgrounds` | TOOL | globals |
| `toolbar/components/ToolbarManager.tsx` | one TOOL per `globalTypes[].toolbar` | globals |
| `addon-links/manager.ts` | none | answers `REQUEST` with `RECEIVE` |

Built-in toolbar tools (zoom, remount, share, open in editor) are in `manager/components/preview/tools/`.
