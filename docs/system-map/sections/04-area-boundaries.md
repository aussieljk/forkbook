---
area: Big picture
title: Area import boundaries
sources:
  - code/core/build-config.ts
  - code/core/build-config/*.ts
  - scripts/import-cycles.test.ts
  - code/.oxlintrc.json
---
All code is in one package, so the "packages" that matter are the folders in `code/core/src/`. Each folder is a subpath export (159 in total). Counts below are imports of `@aussieljk/forkbook/<area>`; relative imports are not counted.

```mermaid
flowchart TB
  manager["manager"] --> mapi["manager-api"]
  manager --> comps["components"]
  manager --> theming["theming"]
  mapi --> channels["channels"]
  mapi --> router["router"]
  papi["preview-api"] --> channels
  papi --> csf["csf"]
  channels --> events["core-events"]
  cs["core-server"] --> csft["csf-tools"]
  cs --> channels
  csft --> babel["babel"]
  cli["cli"] --> cs
  create["create"] --> cli
  rn["react-native"] --> papi
  rn --> rnui["react-native-ui"]
```

### Enforced rules
- `scripts/import-cycles.test.ts:13`: core-server must not import cli; csf-tools must not import core-server; node-logger must not import common; core-events must not import preview-api.
- `code/.oxlintrc.json`: no `core-server` imports inside `cli/skills/content/**`; no root imports of `@base-ui/react` or `es-toolkit`.
- `scripts/manager-layout.test.ts` builds a fixture and checks the manager layout in Chromium.
