import type { InvokedToolsetOutcome } from '../../../shared/open-service/toolset-definition.ts';
import type { ToolsetMethodId } from '../../../shared/open-service/toolset-names.ts';
import type { ToolsAttachGateReason } from './errors.ts';
import type { ToolsetJsonSchema } from './json-schema.ts';
import type { ToolsRuntime } from './local-runtime.ts';

/**
 * How the SDK hosts the target project's tools.
 *
 * `attached` talks to a running Forkbook dev server. `local` loads the target configuration
 * without one: in this process when `cwd` already matches, otherwise in a child host started from
 * that directory. `auto` prefers attached and falls back to local.
 */
export type ToolsMode = 'auto' | 'attached' | 'local';

export type ToolsHostKind = 'in-process' | 'child';

/** Identifies the surface calling the SDK, for the attach handshake and for telemetry. */
export type ToolsClientInfo = {
  name: string;
  version: string;
  /** Defaults to `sdk`; first-party surfaces stamp their own, as the `forkbook tools` CLI does. */
  kind?: 'sdk' | 'cli';
};

export type CreateToolsOptions = {
  /** Project directory of the target Forkbook; defaults to `process.cwd()`. */
  cwd?: string;
  /** Directory to load the Forkbook configuration from; relative paths resolve from `cwd`. */
  configDir?: string;
  /** Port of a running Forkbook; a known port targets that instance without cwd or config dir. */
  port?: number;
  /** Defaults to `auto`. */
  mode?: ToolsMode;
  /** Whether the SDK may start a child host in the target project's own environment. */
  autoSpawn?: boolean;
  clientInfo?: ToolsClientInfo;
};

/** A running instance that also matched the target project but was not attached to. */
export type ToolsSiblingInstance = {
  url: string;
  port: number;
  pid: number;
  cwd: string;
  configDir?: string;
};

/** What the resolved host knows about the Forkbook it serves. */
export type ToolsStorybookInfo = {
  version: string;
  configDir: string;
  /** Base URL of the running Forkbook, including any deployment subpath. */
  url?: string;
  /** Process id of the running Forkbook. */
  pid?: number;
  /** Port of the running Forkbook, as recorded by `forkbook dev`. */
  port?: number;
  /** Directory the running Forkbook was started from. */
  cwd?: string;
  /**
   * Set when attach chose among several matching instances: the competing instances, best first,
   * so callers can warn and name `port` as the way to target another one.
   */
  siblings?: ToolsSiblingInstance[];
};

/** One callable tool, described for an agent that has only this catalog to go on. */
export type ToolsetCatalogMethod = {
  /** Dotted `toolsetId.methodName`, as passed to {@link Tools.call}. */
  ref: ToolsetMethodId;
  title: string;
  description: string;
  requiresDevServer: boolean;
  /** `undefined` when the method's schema has no JSON Schema representation. */
  input: ToolsetJsonSchema | undefined;
  output?: ToolsetJsonSchema;
};

export type ToolsetCatalogEntry = {
  id: string;
  description: string;
  methods: ToolsetCatalogMethod[];
};

/** Every tool the target Forkbook configuration registers. */
export type ToolsetCatalog = {
  configDir: string;
  toolsets: ToolsetCatalogEntry[];
};

export type ToolsDescribeOptions = {
  /** Restrict the catalog to one toolset id. */
  toolset?: string;
};

export type ToolsCallOptions = {
  signal?: AbortSignal;
  /** Overrides the host's Forkbook origin for this call. */
  origin?: string;
};

type ToolsBase = {
  clientInfo: Required<ToolsClientInfo>;
  storybook: ToolsStorybookInfo;
  /** The `mode` passed to `createTools`; `auto` when omitted. */
  requestedMode: ToolsMode;
  /** `in-process` unless this host is a project-local child. */
  host: ToolsHostKind;
  /** Set when `auto` mode could not attach for an unexpected reason and loaded locally instead. */
  fallbackNotice?: string;
  /** Why `auto` loaded locally instead of attaching. */
  fallbackReason?: ToolsAttachGateReason;
  /** Toolset registry and service accessor for an in-process host. Empty when this host is a child. */
  runtime: ToolsRuntime;
  describe(options?: ToolsDescribeOptions): Promise<ToolsetCatalog>;
  /**
   * Run one tool by its dotted `toolsetId.methodName` reference.
   *
   * A tool that ran and reported bad news resolves to an outcome with `ok: false`; only a fault
   * that stopped the tool from running rejects.
   *
   * @throws {ToolsRuntimeError} When the reference is unknown, the input fails the method's
   *   schema, or the host can no longer serve calls.
   * @throws {AttachUnavailableError} When the method needs a running Forkbook the host has not
   *   attached to.
   */
  call(
    ref: string,
    input?: Record<string, unknown>,
    options?: ToolsCallOptions
  ): Promise<InvokedToolsetOutcome>;
  close(): Promise<void>;
};

/**
 * A host that loaded the target configuration without a running Forkbook.
 */
export type LocalTools = ToolsBase & {
  mode: 'local';
};

/** A host that joined a running Forkbook over its channel. */
export type AttachedTools = ToolsBase & {
  mode: 'attached';
};

export type Tools = LocalTools | AttachedTools;
