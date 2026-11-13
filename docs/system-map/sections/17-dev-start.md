---
area: Backend
title: Dev server and static build lifecycle
sources:
  - code/core/src/core-server/build-dev.ts
  - code/core/src/core-server/dev-server.ts
  - code/core/src/core-server/build-static.ts
---
Paths are relative to `code/core/src/core-server`.

```mermaid
sequenceDiagram
  participant CLI as forkbook dev
  participant B as build-dev.ts
  participant D as dev-server.ts
  participant MB as Manager builder
  participant PB as Preview builder
  participant R as Instance registry
  CLI->>B: buildDevStandalone
  B->>B: port, update check, main config
  B->>B: presets pass 1, builders
  B->>B: WS channel, presets pass 2
  B->>D: storybookDevServer
  D->>D: index generator, middleware, routes
  D->>D: listen on 127.0.0.1
  par build
    D->>MB: start
    D->>PB: start
  end
  D->>D: manifests, telemetry, signals
  B->>R: write instance record
```

Static build (`build-static.ts:76`): clear output, presets, manager build, then in parallel copy statics, open-service JSON and manifests, `index.json`, route pages and thumbnails, preview build; then `build` telemetry.

`FORKBOOK_PARENT_PID` makes the server exit when its parent dies (2 s check, `build-dev.ts:365`).
