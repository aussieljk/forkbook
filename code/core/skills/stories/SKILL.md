---
name: stories
description: Use when you create or change a UI component in a project that uses Forkbook. Gives the workflow for UI changes, with every command it needs to look up components, write stories, test them and publish a review.
---

# Forkbook: the UI change workflow

Forkbook makes this skill for the project that you are in. It knows the framework, the preview file and the addons that are installed. Run this command and follow its output:

```sh
npx forkbook skills stories
```

If the Forkbook MCP server is connected, its server instructions give the same workflow. You can use them in place of the command.

If the command fails, use these rules:

1. Before you edit a file, run `npx forkbook tools docs list`, then `npx forkbook tools docs show --id <id>` for each component that your change uses. Reuse the components that exist. Use only the props that `docs show` documents.
2. Each component that you create or change gets a story for each state that it can reach (variants, loading, empty, error, disabled). Use realistic props.
3. An interactive component also gets a `play` function that drives it and asserts the visible result.
4. Do not export a story with the name of a global such as `Error`. Export `ErrorState` and set `name: 'Error'`.
