---
area: Big picture
title: System overview
sources:
  - code/core/src/bin/**
  - code/core/src/core-server/dev-server.ts
  - code/core/src/core-server/build-dev.ts
  - code/core/src/manager/App.tsx
  - code/core/src/preview-api/modules/preview-web/**
  - code/core/src/react-native/metro/**
---
Forkbook is one npm package, `@aussieljk/forkbook`, that runs as a local dev server for web projects and as a Metro plug-in for React Native. The manager UI and the preview iframe talk through a browser channel. The server joins the same channel over a WebSocket. Agents reach the server through MCP or the `forkbook tools` SDK.

```mermaid
flowchart LR
  CLI["forkbook CLI (bin/dispatcher.ts)"] -->|"dev / build"| S["Dev server (core-server)"]
  S -->|"index.json, manager HTML"| M["Manager UI (manager)"]
  S -->|"iframe.html via Vite or Next"| P["Preview iframe (preview-api)"]
  M <-->|"postMessage channel"| P
  M <-->|"WebSocket fb-channel"| S
  A["Agents (MCP, tools SDK)"] -->|"POST /mcp, channel commands"| S
  S -->|"read and write"| D["Story files, .forkbook/comments.json"]
  MT["Metro withForkbook"] -->|"port 7007 relay"| RN["RN device View"]
```

Web paths are in `code/core/src/core-server/dev-server.ts`; React Native paths are in `code/core/src/react-native/metro/withForkbook.ts`.
