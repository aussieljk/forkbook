# Forkbook MCP Addon

Forkbook addon for MCP-powered UI development workflows.

<div align="center">
	<img src="./addon-mcp-claude-code-showcase.gif" alt="Forkbook MCP Addon Demo" />
</div>

See [documentation](https://storybook.js.org/docs/next/ai/mcp/overview/?ref=readme) for installation instructions, usage examples, APIs, and more.

## Configuration

By default, the addon exposes its MCP server at `/mcp`. You can configure a
different literal endpoint path in `.forkbook/main.ts`:

```ts
export default {
  addons: [
    {
      name: '@aussieljk/forkbook/addon-mcp',
      options: {
        endpoint: '/custom-mcp',
      },
    },
  ],
};
```

The endpoint must be a URL pathname such as `/custom-mcp` or `/tools/mcp`.

## Comment tools

These tools read the notes that users leave on stories with
[`@aussieljk/forkbook/addon-comments`](./addon-comments.md). They read and write
`.forkbook/comments.json` in the project root. They are in the `dev` toolset.

| Tool              | Input                                                                      | What it does                                                                                                              |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `list_comments`   | `status` (`open`, `resolved` or `all`, default `open`), optional `storyId` | Returns a ready prompt and the comments as JSON: story id, title, name, file path, element selector and text, args, note. |
| `resolve_comment` | `id`, optional `reply`                                                     | Marks the comment as resolved. The reply shows in the Comments panel.                                                     |

A typical flow: ask Claude Code to "address the open Forkbook comments". It calls
`list_comments`, changes the code, then calls `resolve_comment` for each comment.

Learn more about Forkbook at [forkbook.ljk.dev](https://forkbook.ljk.dev).
