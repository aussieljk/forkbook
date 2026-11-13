---
area: Backend
title: Timers and timeouts
sources:
  - code/core/src/core-server/utils/get-server-channel.ts
  - code/core/src/core-server/utils/index-json.ts
  - code/core/src/core-server/change-detection/change-detection-service.ts
  - code/core/src/core-server/utils/update-check.ts
  - code/core/src/shared/open-service/services/docgen/worker/docgen-worker-client.ts
  - code/core/src/addon-vitest/node/**
  - code/core/src/common/utils/file-lock.ts
  - code/core/src/react-native/metro/channelServer.ts
---
There are no cron jobs. Paths are relative to `code/core/src`.

| Timer | Value | File |
|---|---|---|
| WebSocket ping | 15 s | `core-server/utils/get-server-channel.ts:115` |
| RN channel ping | 10 s | `react-native/metro/channelServer.ts:176` |
| Parent-process watch | 2 s | `core-server/build-dev.ts:365` |
| Index invalidation debounce | 100 ms | `core-server/utils/index-json.ts:41` |
| Change-detection debounce | 200 ms | `core-server/change-detection/change-detection-service.ts:26` |
| Update check timeout / interval | 1.5 s / 24 h | `core-server/utils/update-check.ts:18` |
| Save-story render wait | 3 s | `core-server/utils/save-story/save-story.ts:116` |
| Docgen worker task | 120 s | `docgen-worker-client.ts:16` |
| Vitest child boot | 30 s | `addon-vitest/node/boot-test-runner.ts:33` |
| Test result flush | 500 ms | `addon-vitest/node/test-manager.ts:267` |
| Agent test run | 30 min | `addon-vitest/node/toolset/run.ts:15` |
| Open-service ack / sync silence | 300 ms / 1 s | `shared/open-service/service-transport.ts:99` |
| File lock poll / stale / wait | 50 ms / 30 s / 20 s | `common/utils/file-lock.ts` |
| RN select-story-sync | 1000 ms / 500 ms | `react-native/metro/selectStorySyncEndpoint.ts:4` |
