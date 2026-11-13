---
area: Frontend
title: Comments and agent review
sources:
  - code/core/src/addon-comments/**
  - code/core/src/manager/components/review/**
  - code/core/src/shared/review/**
  - code/core/src/shared/open-service/services/review/**
---
Paths are relative to `code/core/src`. Both features hand work between a person in the manager and a coding agent.

### Comments
```mermaid
sequenceDiagram
  participant U as Person
  participant T as Comments tool
  participant P as Preview picker
  participant R as comments REST
  participant A as Agent via MCP
  U->>T: start pick
  T->>P: PICK_START
  P->>T: PICKED selector and text
  U->>R: POST add with note and args
  A->>R: list_comments
  A->>R: resolve_comment with reply
  U->>R: GET on panel open
```

- REST: GET/POST `/__forkbook/comments` (`addon-comments/preset.ts:97`); actions add, resolve, reopen, delete.
- `store.ts` writes `.forkbook/comments.json` through one queue with temp-file rename. MCP tools in `addon-mcp/tools/comments.ts` share it.
- `prompt.ts` writes a Claude Code prompt that tells the agent to call `resolve_comment`. The panel has no polling.

### Review
An agent calls the `review.create` tool. The `core/review` open-service stores `ReviewState {title, description, collections, changedFiles, stale}` (`shared/review/review-state.ts`), and the manager shows it at `/review/` (`manager/components/review/screens/SummaryScreen.tsx`).
