import { createRequire } from 'node:module';
import * as path from 'node:path';

import type { MetroConfig } from 'metro-config';

import { envVariableToBoolean, loadWebsocketEnvOverrides } from './env-tools.ts';
import { generate } from '../scripts/generate.ts';
import type { WebsocketsOptions } from '../types/index.ts';
import { createChannelServer } from './channelServer.ts';

/** The package name. Metro gives each import of it the custom resolve options below. */
const PACKAGE = '@aussieljk/forkbook';

/** Options for configuring Storybook with React Native. */
export interface WithStorybookOptions {
  /** The path to the Storybook config folder. Defaults to './.rnstorybook'. */
  configPath?: string;

  /** WebSocket configuration for syncing storybook instances or sending events to storybook. */
  websockets?: WebsocketsOptions | 'auto';

  /** Whether to write storybook.requires.js instead of storybook.requires.ts. Defaults to false. */
  useJs?: boolean;

  /** If false, Storybook is removed from the JS bundle. Defaults to true. */
  enabled?: boolean;

  /** Whether to include doc tools in the storybook.requires file. Defaults to true. */
  docTools?: boolean;

  /**
   * Whether to leave out the full on-device UI (`@aussieljk/forkbook/react-native-ui`), so the
   * bundle has no sheets and no icons. Defaults to false.
   */
  liteMode?: boolean;
}

type ResolveRequestFunction = (context: any, moduleName: string, platform: string | null) => any;

const isStorybookModule = (moduleName: string) =>
  moduleName.startsWith('storybook') ||
  moduleName.startsWith('@storybook') ||
  moduleName.startsWith(PACKAGE);

/** The module that takes the place of the config folder's index file when Storybook is disabled. */
const stubPath = () => createRequire(import.meta.url).resolve(`${PACKAGE}/react-native/stub`);

/**
 * Configures Metro to work with Storybook in React Native.
 *
 * @example
 *
 * ```js
 * const { getDefaultConfig } = require('expo/metro-config');
 * const { withStorybook } = require('@aussieljk/forkbook/react-native/metro/withStorybook');
 *
 * module.exports = withStorybook(getDefaultConfig(__dirname), {
 *   enabled: process.env.EXPO_PUBLIC_FORKBOOK_ENABLED === 'true',
 * });
 * ```
 */
export function withStorybook(
  config: MetroConfig,
  options: WithStorybookOptions = {}
): MetroConfig {
  const {
    configPath = path.resolve(process.cwd(), './.rnstorybook'),
    websockets,
    useJs = false,
    enabled = true,
    docTools = true,
    liteMode = false,
  } = options;

  const server = envVariableToBoolean(process.env.FORKBOOK_SERVER, true);

  if (!enabled) {
    return {
      ...config,
      resolver: {
        ...config.resolver,
        resolveRequest: (context: any, moduleName: string, platform: string | null) => {
          const resolveFunction: ResolveRequestFunction =
            config?.resolver?.resolveRequest ?? context.resolveRequest;

          if (isStorybookModule(moduleName)) {
            return { type: 'empty' };
          }

          // Node imports in the instrumenter crash Metro, even with Storybook disabled.
          if (platform !== 'web' && (moduleName === 'tty' || moduleName === 'os')) {
            return { type: 'empty' };
          }

          const resolved = resolveFunction(context, moduleName, platform);

          // Match the config folder's index file regardless of extension (ts, tsx, js, jsx)
          const configIndexRegex = new RegExp(`${configPath}/index\\.(tsx?|jsx?)$`);
          if (resolved.filePath && configIndexRegex.test(resolved.filePath)) {
            return { filePath: stubPath(), type: 'sourceFile' };
          }

          if (resolved.filePath?.includes?.(configPath)) {
            return { type: 'empty' };
          }

          return resolved;
        },
      },
    };
  }

  if (websockets != null || process.env.FORKBOOK_WS_HOST) {
    const resolvedWs = loadWebsocketEnvOverrides(websockets);
    const auto = websockets === 'auto' && !process.env.FORKBOOK_WS_HOST;
    const port = resolvedWs.port ?? 7007;
    const secured = resolvedWs.secured;

    if (server) {
      // With an undefined host the server binds only to the port and allows any connection
      // (localhost, 127.0.0.1, 0.0.0.0). The generator writes the LAN address for devices.
      createChannelServer({
        port,
        host: auto ? undefined : resolvedWs.host,
        configPath,
        websockets: true,
        secured,
        ssl:
          websockets && websockets !== 'auto'
            ? {
                key: websockets.key,
                cert: websockets.cert,
                ca: websockets.ca,
                passphrase: websockets.passphrase,
              }
            : undefined,
      });
    }

    generate({
      configPath,
      useJs,
      docTools,
      host: resolvedWs.host ?? (auto ? 'auto' : undefined),
      port,
      secured,
    });
  } else {
    generate({ configPath, useJs, docTools });
  }

  return {
    ...config,
    transformer: {
      ...config.transformer,
      unstable_allowRequireContext: true,
    },
    resolver: {
      ...config.resolver,
      resolveRequest: (context: any, moduleName: string, platform: string | null) => {
        const resolveFunction: ResolveRequestFunction =
          config?.resolver?.resolveRequest ?? context.resolveRequest;

        // The full on-device UI and its native dependencies stay out of the bundle in lite mode.
        if (liteMode && moduleName === `${PACKAGE}/react-native-ui`) {
          return { type: 'empty' };
        }

        // Node imports in the instrumenter crash Metro on native platforms. Web and server
        // bundles (Expo API Routes) need the real Node built-ins.
        if (platform !== 'web' && (moduleName === 'tty' || moduleName === 'os')) {
          return { type: 'empty' };
        }

        const theContext =
          isStorybookModule(moduleName) || moduleName.startsWith('uuid')
            ? {
                ...context,
                unstable_enablePackageExports: true,
                unstable_conditionNames: ['import'],
              }
            : context;

        return resolveFunction(theContext, moduleName, platform);
      },
    },
  };
}
