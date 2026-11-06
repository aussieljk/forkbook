# Forkbook Comments Addon

Leave notes on stories for Claude Code (or any agent).

## Set up

Add the addon in `.forkbook/main.ts`:

```ts
export default {
  addons: ['@aussieljk/forkbook/addon-comments', '@aussieljk/forkbook/addon-mcp'],
};
```

## Use

- Click the comment button in the toolbar (or **Add comment on element** in the **Comments** panel). Then click an element in the story. Write the note and click **Save comment**.
- Click **Comment on whole story** to add a note without an element.
- Each comment keeps the story id, title and name, the story file path, a CSS selector and a text snippet of the element, the current args and the note.
- In the panel you can resolve, reopen and delete comments.
- **Copy for Claude** copies a ready prompt for one comment. **Copy all open** copies one prompt for all open comments. Paste it into Claude Code.

## Storage

The comments are in `.forkbook/comments.json` in the project root, so they stay after a restart. You can commit the file or add it to `.gitignore`.

The dev server serves the file at `/__forkbook/comments`:

- `GET /__forkbook/comments?status=open|resolved|all&storyId=<id>` lists comments.
- `POST /__forkbook/comments` with `Content-Type: application/json` applies one action: `{ "action": "add", "comment": {...} }`, `{ "action": "resolve", "id": "...", "reply": "..." }`, `{ "action": "reopen", "id": "..." }` or `{ "action": "delete", "id": "..." }`.

## MCP tools

With `@aussieljk/forkbook/addon-mcp`, agents can read and resolve comments. See [addon-mcp](./addon-mcp.md#comment-tools).
