---
area: Backend
title: Data on disk
sources:
  - code/core/src/addon-comments/store.ts
  - code/core/src/addon-comments/types.ts
  - code/core/src/core-server/utils/runtime-instance-registry.ts
  - code/core/src/common/utils/resolve-path-in-cache.ts
  - code/core/src/common/utils/cache.ts
  - code/core/src/core-server/change-detection/IndexBaselineService.ts
---
There is no database. State lives in JSON files. Paths are relative to `code/core/src`.

```mermaid
erDiagram
  STORY_INDEX ||--o{ COMMENT : "storyId, importPath"
  STORY_INDEX ||--o| INDEX_BASELINE : "entryIds"
  INSTANCE ||--|| DEV_SERVER : "pid, port, token"
  COMMENT {
    string id
    string status
    string storyId
    string importPath
    string note
    string reply
  }
  INSTANCE {
    string instanceId
    int pid
    string url
    string token
    string configDir
  }
  INDEX_BASELINE {
    string entryIds
  }
```

| File | Content | Writer |
|---|---|---|
| `.forkbook/comments.json` | `{version: 1, comments}` | `addon-comments/store.ts` |
| `~/.forkbook/instances/<id>.json` (0600) | running server, token, MCP endpoint; pruned after 1 or 7 days | `core-server/utils/runtime-instance-registry.ts` |
| `node_modules/.cache/forkbook/<v>/dev-server/` | `lastUpdateCheck`, `whats-new-cache`, `index-baseline` | `common/utils/cache.ts` |
| `.../@aussieljk-forkbook/test` | test config, 14 day TTL | `addon-vitest/node/test-run-responder.ts:64` |
| Story CSF files, `main.ts` | saved args, What's new toggle | `save-story.ts`, `whats-new.ts` |
