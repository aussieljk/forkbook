---
area: Big picture
title: External services
sources:
  - code/core/src/core-server/utils/update-check.ts
  - code/core/src/core-server/utils/whats-new.ts
  - code/core/src/telemetry/**
  - code/core/src/addon-mcp/auth/**
  - scripts/utils/otel.ts
  - site/vercel.json
---
Paths are relative to `code/core/src`.

| Service | What calls it | When | File |
|---|---|---|---|
| `forkbook.ljk.dev/versions.json` | dev server update check | start, at most every 24 h, 1.5 s timeout | `core-server/utils/update-check.ts:9` |
| `forkbook.ljk.dev/whats-new/v1` | What's new settings page | on request | `core-server/utils/whats-new.ts:32` |
| Sentry ingest (`FORKBOOK_SENTRY_DSN`) | telemetry `error` events | on error | `telemetry/sentry.ts:12` |
| OTLP (SigNoz) | telemetry logs and spans | when `OTEL_EXPORTER_OTLP_ENDPOINT` is set | `telemetry/otel.ts:34` |
| OTLP (SigNoz) | verify, build, merge-agent, Vitest reporter, Claude hook | same | `scripts/utils/otel.ts`, `scripts/otel-hook.ts` |
| Composed refs | MCP auth and manifests | on MCP calls to refs | `addon-mcp/auth/composition-auth.ts:244` |
| npm registry | release publish (OIDC) | push to master | `scripts/release.ts` |
| Vercel | docs site deploy | `bun run site:deploy` | root `package.json` |

`disableTelemetry` turns off both Sentry and OTEL in core. Telemetry has no user id; addon-test story ids are hashed (`telemetry/index.ts`).
