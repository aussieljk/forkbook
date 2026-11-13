---
area: Backend
title: Server modules
sources:
  - code/core/src/core-server/**
  - code/core/src/shared/open-service/**
  - code/core/src/react/componentManifest/**
  - code/core/src/builder-*/**
---
Paths are relative to `code/core/src`.

```mermaid
mindmap
  root((core-server))
    Start
      build-dev.ts
      dev-server.ts
      build-static.ts
    Index
      StoryIndexGenerator.ts
      csfIndexer
      watch-story-specifiers.ts
      watchConfig.ts
    Presets
      common-preset.ts
      common-override-preset.ts
    Change detection
      change-detection-service.ts
      GitDiffProvider.ts
      IndexBaselineService.ts
    Stores
      status.ts
      test-provider.ts
    Builders
      builder-vite
      builder-next
      builder-manager
    Open service
      docgen worker
      module-graph
      story-docs
      review
```

- `StoryIndexGenerator` (`core-server/utils/StoryIndexGenerator.ts:119`) indexes CSF files with `csf-tools` `loadCsf`; `invalidate` (:904) runs on watcher events from `@parcel/watcher`.
- `ComponentMetaManager` (`react/componentManifest/componentMeta/ComponentMetaManager.ts`) runs tsgo docgen in a worker thread (`shared/open-service/services/docgen/worker/docgen-worker-client.ts:55`).
- `get-builders.ts` resolves the manager and preview builders.
- The change-detection service compares git state with the index baseline and writes results to the status store.
