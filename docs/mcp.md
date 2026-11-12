# Forkbook MCP

Reusable MCP package for Forkbook component and docs knowledge.

Learn more about Forkbook at [forkbook.ljk.dev](https://forkbook.ljk.dev).

## Self-hosting `@aussieljk/forkbook/mcp`

This package is a library: the tarball ships one module and no executable. It declares no `bin`,
starts no process, and has no CLI. You register its tools on an MCP server you own, using the
snippets below. If you want a running Forkbook MCP server with no code at all, use the dev server
instead — `forkbook dev` serves one at `/mcp` through `@aussieljk/forkbook/addon-mcp`.

### Prerequisites

- Node.js 22.12+
- A manifests source containing:
  - `components.json` (required)
  - `docs.json` (optional)

### Example implementation

The Forkbook repository has a local stdio server built on this package,
[`bin.ts`](https://github.com/aussieljk/forkbook/blob/master/code/core/src/mcp/bin.ts), that loads
manifests from a directory or URL. It is a development harness and is not part of the published
package.

The snippets below cover the common self-hosting patterns.

#### Minimal implementation

```ts
import { createForkbookMcpHandler } from '@aussieljk/forkbook/mcp';

const forkbookMcpHandler = await createForkbookMcpHandler();

export async function handleRequest(request: Request): Promise<Response> {
  if (new URL(request.url).pathname === '/mcp') {
    return forkbookMcpHandler(request);
  }

  return new Response('Not found', { status: 404 });
}
```

#### With custom manifest source

Use `manifestProvider` when your manifests are not available from the same origin/path layout:

```ts
const forkbookMcpHandler = await createForkbookMcpHandler({
  manifestProvider: async (_request, path) => {
    return asyncReadManifestFromSomewhere(path);
  },
});
```

### API reference

#### `createForkbookMcpHandler`

Type:

```ts
(options?: ForkbookMcpHandlerOptions) => Promise<Handler>;

type Handler = (req: Request, context?: ForkbookContext) => Promise<Response>;
```

Creates and configures an MCP HTTP handler with all built-in docs tools registered.

##### Parameters

###### `options`

Type: [`ForkbookMcpHandlerOptions`](#handler-options-and-request-context)

Default: `{}`

Server-level configuration. The handler uses this at creation time and as a fallback for per-request context.

##### Returns

Type: `Promise<Handler>`

A fetch-compatible request handler for your `/mcp` endpoint.

##### Behavior

- Registers these MCP tools:
  - [`docs-list`](https://forkbook.ljk.dev/docs/ai/mcp/overview)
  - [`docs-show`](https://forkbook.ljk.dev/docs/ai/mcp/overview)
  - [`docs-show-story`](https://forkbook.ljk.dev/docs/ai/mcp/overview)
- Uses HTTP transport from [`@tmcp/transport-http`](https://github.com/paoloricciuti/tmcp/).
- For each request, the handler always passes the current `Request` as `context.request`.
- Per-request `context` overrides handler-level `options` for:
  - [`manifestProvider`](#manifestprovider)
  - [`onListAllDocumentation`](#onlistalldocumentation)
  - [`onGetDocumentation`](#ongetdocumentation)

> Note: [`onSessionInitialize`](#handler-options-and-request-context) can only be set at handler creation time (in `options`).

##### Example

```ts
import { createForkbookMcpHandler } from '@aussieljk/forkbook/mcp';

const mcp = await createForkbookMcpHandler({
  manifestProvider: async (_request, path) => {
    return await fetchManifest(path);
  },
});

export async function handleRequest(request: Request) {
  if (new URL(request.url).pathname !== '/mcp') {
    return new Response('Not found', { status: 404 });
  }

  return mcp(request);
}
```

#### Handler options and request context

`@aussieljk/forkbook/mcp` uses the same core fields in two places:

- Handler creation (`createForkbookMcpHandler(options)`)
- Per-request override (`handler(request, context)`)

Type:

```ts
type ForkbookContext = {
  request?: Request;
  manifestProvider?: (
    request: Request | undefined,
    path: string,
    source?: Source,
  ) => Promise<string>;
  sources?: Source[];
  onListAllDocumentation?: (params: {
    context: ForkbookContext;
    manifests: AllManifests;
    resultText: string;
    sources?: SourceManifests[];
  }) => void | Promise<void>;
  onGetDocumentation?: (
    params:
      | {
          context: ForkbookContext;
          input: { id: string; storybookId?: string };
          foundDocumentation: ComponentManifest | Doc;
          resultText: string;
        }
      | {
          context: ForkbookContext;
          input: { id: string; storybookId?: string };
        },
  ) => void | Promise<void>;
};

type ForkbookMcpHandlerOptions = ForkbookContext & {
  onSessionInitialize?: (initializeRequestParams: InitializeRequestParams) => void | Promise<void>;
};
```

> [!NOTE]
> `onSessionInitialize` is only used when provided at handler creation time (`createForkbookMcpHandler(options)`). It is ignored in per-request `context`.
>
> `InitializeRequestParams` is the [`tmcp`](https://github.com/paoloricciuti/tmcp/) initialize payload type, and its exact structure may change in patch versions. Prefer treating it as an opaque protocol payload unless you need specific fields.

##### `manifestProvider`

Type:

```ts
(request: Request | undefined, path: string, source?: Source) => Promise<string>;
```

Primary extension point for production setups.

Use this when manifests are not available at the default same-origin paths. Your function returns the raw JSON string for each requested manifest path.

For a real customization example (switching between HTTP and filesystem-backed manifest loading), see the [Example implementation](#example-implementation) section above.

Manifest paths requested by built-in tools:

- `./manifests/components.json` (required)
- `./manifests/docs.json` (optional)

##### `request`

Type: `Request`

The incoming HTTP request for the current call, as a Web Fetch API (`WHATWG`) `Request`.

This is **not** a Node.js `http.IncomingMessage`. In Node runtimes, pass a fetch-compatible `Request` (for example, Node's global `Request` from Undici in modern Node versions), or convert your server's native request object before calling the handler.

`createForkbookMcpHandler` automatically sets this field when you invoke the returned handler with `(request, context?)`.

##### `onListAllDocumentation`

Type:

```ts
(params: {
  context: ForkbookContext;
  manifests: AllManifests;
  resultText: string;
  sources?: SourceManifests[];
}) => void | Promise<void>
```

Optional callback after `docs-list` resolves successfully.

##### `onGetDocumentation`

Type:

```ts
(
  params:
    | {
        context: ForkbookContext;
        input: { id: string; storybookId?: string };
        foundDocumentation: ComponentManifest | Doc;
        resultText: string;
      }
    | {
        context: ForkbookContext;
        input: { id: string; storybookId?: string };
      },
) => void | Promise<void>
```

Optional callback after `docs-show` runs:

- When a component/docs entry is found, receives `foundDocumentation` and `resultText`.
- When not found, receives only `context` and `input`.

##### `sources`

Type: `Source[]`

Optional multi-source configuration for composing multiple Forkbook MCP sources. This is supported but relatively uncommon for most user setups.

#### `Source`

Type:

```ts
type Source = {
  id: string;
  title: string;
  url?: string;
};
```

Represents one Forkbook source in multi-source mode.

#### `SourceManifests`

Type:

```ts
type SourceManifests = {
  source: Source;
  componentManifest: ComponentManifestMap;
  docsManifest?: DocsManifestMap;
  error?: string;
  notice?: RequiresOwnMcpNotice;
};
```

Represents fetched manifests, an error, or non-error routing guidance for a single source.

#### `RequiresOwnMcpNotice`

Type:

```ts
type RequiresOwnMcpNotice = {
  kind: 'requires-own-mcp';
  endpoint: string;
};
```

Indicates that a composed Forkbook source cannot be read through the local MCP proxy and should be accessed through its own MCP endpoint instead.

#### Tool registration exports

Use these when you want to build your own [`tmcp`](https://github.com/paoloricciuti/tmcp/) server instead of using `createForkbookMcpHandler`, while still reusing Forkbook's docs tools.

This approach is useful when you need to:

- register Forkbook tools alongside your own custom tools,
- customize transport/session setup yourself,
- or conditionally enable tools based on your own server context.

> [!IMPORTANT]
> These composition helpers are built for `tmcp`'s `McpServer` and **cannot** be directly composed into a server built with the [official MCP TypeScript SDK (`@modelcontextprotocol/sdk`)](https://github.com/modelcontextprotocol/typescript-sdk).

Minimal composition example:

```ts
import { McpServer } from 'tmcp';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import {
  addGetStoryDocumentationTool,
  addGetDocumentationTool,
  addListAllDocumentationTool,
  type ForkbookContext,
} from '@aussieljk/forkbook/mcp';

const adapter = new ValibotJsonSchemaAdapter();
const server = new McpServer(
  { name: 'custom-mcp', version: '1.0.0' },
  {
    adapter,
    capabilities: {
      tools: { listChanged: true },
    },
  },
).withContext<ForkbookContext>();

await addListAllDocumentationTool(server);
await addGetDocumentationTool(server);
await addGetStoryDocumentationTool(server);
```

After registration, wire your own transport and pass `ForkbookContext` per request so tools can resolve manifests (`request`, `manifestProvider`, and optional `sources`).

#### `addListAllDocumentationTool`

Type:

```ts
(server: McpServer<any, ForkbookContext>, enabled?: () => boolean | Promise<boolean>) =>
  Promise<void>;
```

Registers the [list tool](https://forkbook.ljk.dev/docs/ai/mcp/overview) that returns all component/docs IDs from manifests.

#### `addGetDocumentationTool`

Type:

```ts
(
  server: McpServer<any, ForkbookContext>,
  enabled?: () => boolean | Promise<boolean>,
  options?: { multiSource?: boolean },
) => Promise<void>;
```

Registers [documentation lookup](https://forkbook.ljk.dev/docs/ai/mcp/overview) by component/docs `id`.

When `options.multiSource` is `true`, the tool schema takes an optional `storybookId` input, defaulting to `local`.

#### `addGetStoryDocumentationTool`

Type:

```ts
(
  server: McpServer<any, ForkbookContext>,
  enabled?: () => boolean | Promise<boolean>,
  options?: { multiSource?: boolean },
) => Promise<void>;
```

Registers [story-level documentation lookup](https://forkbook.ljk.dev/docs/ai/mcp/overview) for a specific story variant by `componentId` and `storyName`.
