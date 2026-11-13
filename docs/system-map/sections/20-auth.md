---
area: Backend
title: Auth and access checks
sources:
  - code/core/src/core-server/presets/wsToken.ts
  - code/core/src/core-server/utils/validate-token.ts
  - code/core/src/core-server/utils/get-server-channel.ts
  - code/core/src/addon-mcp/auth/**
  - code/core/src/addon-mcp/preset.ts
  - code/core/src/addon-comments/preset.ts
---
Forkbook has no user accounts. It protects a local server. Paths are relative to `code/core/src`.

| Credential | Lifetime | Checked by |
|---|---|---|
| WebSocket token (random UUID) | one server process | `core-server/utils/validate-token.ts` (constant time) |
| Same token in instance record | until record is pruned | `cli/tools/instances/registry.ts:15` |
| Bearer token for composed refs | set by the ref's OAuth server | `addon-mcp/auth/composition-auth.ts` |

```mermaid
sequenceDiagram
  participant B as Browser or agent
  participant S as Dev server
  participant R as Ref server
  B->>S: WS fb-channel with token and page
  S->>S: origin check, else 403
  S->>S: token check, else 401
  S->>B: open, role from page
  B->>S: POST /mcp
  S->>S: origin and JSON checks
  S->>R: fetch .well-known if refs need auth
  S->>B: 401 with resource metadata, or result
```

- The token is in the page HTML; the browser re-reads it on reconnect.
- The comments route checks only same-site origin (`addon-comments/preset.ts`).
- Origin and DNS-rebinding checks are skipped in WebContainers.
