---
area: Native and agents
title: React Native device connection
sources:
  - code/core/src/react-native/View.tsx
  - code/core/src/react-native/Start.tsx
  - code/core/src/react-native/metro/channelServer.ts
  - code/core/src/react-native/metro/selectStorySyncEndpoint.ts
  - code/core/src/addon-ondevice-controls/**
  - code/core/src/addon-ondevice-actions/**
---
Paths are relative to `code/core/src`. The RN code is vendored from storybookjs/react-native v10.6.1 (`code/core/build-config/react-native.ts`). The channel server in Metro relays each JSON message to all other clients (`react-native/metro/channelServer.ts:191`).

```mermaid
sequenceDiagram
  participant D as Device View
  participant C as Channel server 7007
  participant W as Web manager or tool
  D->>C: WS connect, host from FORKBOOK_WEBSOCKET
  W->>C: RN_GET_INDEX
  C->>D: relay
  D->>C: RN_GET_INDEX_RESPONSE index
  C->>W: relay
  W->>C: POST /select-story-sync/id
  C->>D: SET_CURRENT_STORY
  D->>C: storyRendered
  C->>W: 200, or timeout after 1000 ms
  C->>D: ping every 10 s
```

- Host falls back to `10.0.2.2` on Android or `localhost`; port 7007 (`react-native/View.tsx:220`).
- Other REST: `GET /index.json` (built with `buildIndex`), `POST /send-event`.
- `start()` (`react-native/Start.tsx`) turns `require.context` keys into a `StoryIndex` and runs `ReactNativePreview`; web-only features (measure, outline, viewport, highlight, backgrounds) are off.
- On-device Controls send `UPDATE_STORY_ARGS` (`addon-ondevice-controls/hooks.ts:45`); Actions listen to `EVENT_ID`.
- UI: `react-native-ui/` (sidebar tree, search, bottom-sheet addons panel), shared parts in `react-native-ui-common/`.
