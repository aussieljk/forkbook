import * as v from 'valibot';
import type { Options } from '@aussieljk/forkbook/internal/types';
import type {
  DocsAccess,
  ManifestProvider,
  Source,
} from '@aussieljk/forkbook/internal/toolsets-docs';

const isLiteralEndpointPathname = (endpoint: string) => {
  try {
    const { pathname } = new URL(endpoint, 'http://storybook.local');
    return pathname === endpoint && pathname !== '/';
  } catch {
    return false;
  }
};

export const AddonOptions = v.object({
  endpoint: v.optional(
    v.pipe(
      v.string(),
      v.check(isLiteralEndpointPathname, 'Endpoint must be a literal URL pathname')
    )
  ),
  toolsets: v.optional(
    v.object({
      dev: v.exactOptional(v.boolean(), true),
      docs: v.exactOptional(v.boolean(), true),
      test: v.exactOptional(v.boolean(), true),
    }),
    {
      // Default values for toolsets
      dev: true,
      docs: true,
      test: true,
    }
  ),
});

export type AddonOptionsInput = v.InferInput<typeof AddonOptions>;
export type AddonOptionsOutput = v.InferOutput<typeof AddonOptions>;
/**
 * What serving the docs tools needs from the request being handled.
 *
 * Only a composition uses these: it reads several Storybooks, each through its own provider, and
 * the local one through its own access when docgen-server mode is on. A single Forkbook is served
 * by the docs toolset registered at boot and needs none of it.
 */
export type DocsServingContext = {
  /** The in-flight request; the default provider derives the manifest origin from it. */
  request?: Request;
  /** Fetches one manifest file, per source. */
  manifestProvider?: ManifestProvider;
  /** The composed Storybooks, when `refs` are configured. */
  sources?: Source[];
  /** Reads the local Forkbook directly, in docgen-server mode. */
  localAccess?: DocsAccess;
};

/**
 * Custom context passed to MCP server and tools.
 * Contains Forkbook-specific configuration and runtime information.
 */
export type AddonContext = DocsServingContext & {
  /**
   * The Forkbook options object containing configuration,
   * port, presets, and other runtime information.
   */
  options: Options;

  /**
   * The resolved MCP endpoint pathname for this Forkbook instance.
   */
  endpoint?: string;

  /**
   * The origin URL of the running Forkbook instance.
   * Typically http://localhost:{port}
   */
  origin: string;

  /**
   * Whether telemetry collection is disabled.
   */
  disableTelemetry: boolean;

  /**
   * Whether @aussieljk/forkbook/addon-a11y is enabled.
   * Used to dynamically tailor tool descriptions and guidance.
   */
  a11yEnabled?: boolean;

  toolsets?: NonNullable<AddonOptionsOutput>['toolsets'];
};
