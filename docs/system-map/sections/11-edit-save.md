---
area: Frontend
title: Edit and save args sequence
sources:
  - code/core/src/controls/manager.tsx
  - code/core/src/manager-api/modules/stories.ts
  - code/core/src/core-server/utils/save-story/**
  - code/core/src/preview-api/modules/preview-web/Preview.tsx
---
Paths are relative to `code/core/src`. Controls edit args live; "save" writes them back into the CSF file. `saveStory` sends only args that differ from `initialArgs`; `createStory(name)` sends all args and a new name (`controls/manager.tsx:48`, `:101`).

```mermaid
sequenceDiagram
  participant C as Controls panel
  participant M as manager-api
  participant P as Preview
  participant S as save-story.ts
  participant F as Story file
  C->>M: updateStoryArgs
  M->>P: UPDATE_STORY_ARGS
  P->>M: STORY_ARGS_UPDATED, args in URL
  C->>S: SAVE_STORY_REQUEST
  S->>S: check importPath is inside project
  S->>F: update args or duplicate story, oxfmt, write
  F-->>P: HMR re-render
  P->>S: STORY_RENDERED, wait up to 3 s
  S->>C: SAVE_STORY_RESPONSE
  C->>M: resetStoryArgs, select newStoryId
```

Server helpers: `core-server/utils/save-story/update-args-in-csf-file.ts`, `duplicate-story-with-new-name.ts`, `valueToAST.ts`, `getDiff.ts`; registered at `core-server/presets/common-preset.ts:316`. There is no create-new-story-file flow.
