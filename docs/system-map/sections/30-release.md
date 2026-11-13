---
area: Shipping
title: Verify, merge and release
sources:
  - scripts/verify.ts
  - scripts/merge-agent.ts
  - scripts/release.ts
  - .github/workflows/release.yml
  - ci/**
---
Agents work in worktrees; the main session merges and pushes `master`, and CI publishes.

```mermaid
sequenceDiagram
  participant AG as Agent worktree
  participant MA as merge-agent.ts
  participant V as verify.ts
  participant GH as GitHub master
  participant RW as release.yml
  participant NPM as npm
  AG->>MA: branch done
  MA->>MA: merge, fix bun.lock, bun install
  MA->>V: verify --changed unless tree verified
  V->>V: build, then lint, fmt, typecheck, vitest
  MA->>MA: remove worktree and branch
  MA->>GH: main session pushes
  GH->>RW: push to master
  RW->>RW: build, typecheck, lint, fmt, unit tests
  RW->>NPM: release.ts --if-changed, publish via OIDC
  RW->>GH: Release commit and tag v
```

`scripts/release.ts` order: skip if `code/core/` is unchanged; stop on a dirty tree; refuse `NODE_AUTH_TOKEN` in CI and need npm 11.5.1 or later; bump `X.Y.Z-N` if the version is on npm; `bun run build`; `npm publish --tag latest`; commit "Release v"; tag; push.

`verify.ts` records a passing tree hash in `VERIFIED_TREES`; logs are in `node_modules/.cache/verify`. Workflows are generated from `ci/workflows.ts` by `ci/generate.ts`.
