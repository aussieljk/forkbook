---
area: Native and agents
title: Tools SDK, skills and sidecars
sources:
  - code/core/src/cli/tools/**
  - code/core/src/cli/skills/**
  - code/core/src/shared/open-service/**
  - code/core/src/oxc-parser/**
---
Paths are relative to `code/core/src`. `forkbook tools` and the `internal/tools` export give agents the same toolsets without MCP. `createTools({cwd, configDir, port, mode})` returns `.describe()`, `.call('docs.show', ...)` and `.close()` (`cli/tools/sdk/index.ts`).

```mermaid
sequenceDiagram
  participant A as Agent shell
  participant T as forkbook tools
  participant R as Instance registry
  participant S as Dev server
  participant C as Child host
  A->>T: tools docs list
  T->>R: find running server and token
  alt attached
    T->>S: WS fb-channel, services command-invoke
    S->>T: ack then result
  else local or version differs
    T->>C: fork, hello, init, call
    C->>T: result
  end
  T->>A: print result
```

- Child host IPC: `hello`, `init`, `describe`, `call`, `cancel`, `close`, `result`, `error` (`cli/tools/sdk/child-protocol.ts`).
- Skills: `forkbook skills <id>` prints `stories`, `write-story` or `setup` (`cli/skills/content/index.ts`).

### Long-lived helpers
| Helper | Kind | File |
|---|---|---|
| Docgen worker (tsgo) | worker thread, `init` and `extract` | `shared/open-service/services/docgen/worker/` |
| oxc parse pool | worker pool for import edges | `oxc-parser/worker-pool.ts` |
| Vitest child | forked process | `addon-vitest/node/boot-test-runner.ts` |
| RN channel server | in Metro, port 7007 | `react-native/metro/channelServer.ts` |
