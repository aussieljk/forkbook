---
area: Backend
title: Dev server HTTP routes
sources:
  - code/core/src/core-server/dev-server.ts
  - code/core/src/core-server/utils/index-json.ts
  - code/core/src/core-server/utils/server-statics.ts
  - code/core/src/core-server/utils/manifests/**
  - code/core/src/builder-manager/index.ts
  - code/core/src/builder-vite/index.ts
  - code/core/src/builder-next/index.ts
  - code/core/src/addon-mcp/preset.ts
  - code/core/src/addon-comments/preset.ts
---
Paths are relative to `code/core/src`. The server is polka, mounted under the base path (default `/_forkbook`). Middleware order: compression, `extendServer`, host check, access control, security headers, `no-store` (`core-server/dev-server.ts:86-102`).

| Method | Path | Handler | Purpose |
|---|---|---|---|
| ANY | `/index.json` | `core-server/utils/index-json.ts:61` | story index, CORS `*` |
| ANY | `/thumbnails/*` | `core-server/utils/thumbnails.ts:12` | story thumbnails |
| ANY | user `middleware.{js,mjs,cjs}` | `core-server/utils/middleware.ts` | project hook |
| GET, POST | `/mcp` | `addon-mcp/preset.ts:145,177` | MCP; HTML status for browsers |
| GET | `/.well-known/oauth-protected-resource` | `addon-mcp/preset.ts:120` | only with ref auth |
| GET, POST | `/__forkbook/comments` | `addon-comments/preset.ts:40` | comment store |
| GET | `/<favicon>?status=` | `core-server/utils/server-statics.ts:82` | status favicon |
| GET | `/fb-common-assets`, `/coverage` | `server-statics.ts:115` | static dirs |
| GET | `/fb-manager`, `/fb-addons`, `/` | `builder-manager/index.ts:116,161` | manager app |
| GET | `/iframe.html` | `builder-vite/index.ts:87` | preview via Vite |
| GET | `/iframe.html` (302), `/iframe-globals.json` | `builder-next/index.ts:176,181` | preview via next dev |
| GET | `/manifests/:name.json`, `/manifests/components.html` | `core-server/utils/manifests/manifests.ts:390,421` | component manifest |
| WS | `/fb-channel` | `core-server/utils/get-server-channel.ts:63` | server channel |

Checks: `/mcp` and the WebSocket check origin (403) and token (401); POST bodies must be JSON (415); body limits are 4 MB for MCP and 1 MB for comments.
