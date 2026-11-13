---
area: Shipping
title: Package build
sources:
  - scripts/build-package.ts
  - scripts/build/**
  - code/core/build-config.ts
  - code/core/build-config/*.ts
---
One package is built from about 20 entry lists. `code/core/build-config.ts` merges `code/core/build-config/<area>.ts` by platform: `node`, `browser`, `runtime`, `globalizedRuntime`.

```mermaid
flowchart LR
  A["build-package.ts --changed"] -->|"find -newer .build-stamp"| B["scripts/build/build-package.ts"]
  B --> C["prebuild: generate-source-files.ts"]
  C --> D["generate-package-json.ts"]
  D --> E["esbuild and Rolldown bundles"]
  D --> F["rolldown-tsgo types, prod only"]
  E --> G["write .build-stamp, clear Vite cache"]
```

- `generate-package-json.ts` writes each export as `{code, types, default}`; `code` points at the source, so typecheck needs no build.
- Bundles run in parallel with types; OTel spans wrap each step (`scripts/utils/otel.ts`).
- After a build, `node_modules/.cache/forkbook` is removed so Vite sees the new `dist`.
- `scripts/rn-device-bundle.test.ts` loads the 10 built RN entries without `document`.
