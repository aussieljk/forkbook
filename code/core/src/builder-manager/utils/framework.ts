import {
  extractFrameworkPackageName,
  frameworkPackages,
  frameworkToRenderer,
  getFrameworkName,
} from '@aussieljk/forkbook/internal/common';
import {
  type Options,
  type SecurityConfig,
  SupportedBuilder,
} from '@aussieljk/forkbook/internal/types';

import { resolveRootPage } from '../../shared/root-page.ts';

export const buildFrameworkGlobalsFromOptions = async (options: Options) => {
  const globals: Record<string, unknown> = {};

  const { builder: builderConfig, channelOptions } = await options.presets.apply('core');
  const builderName = typeof builderConfig === 'string' ? builderConfig : builderConfig?.name;
  const builder = Object.values(SupportedBuilder).find((builder) => builderName?.includes(builder));

  const frameworkName = await getFrameworkName(options);
  const frameworkPackageName = extractFrameworkPackageName(frameworkName);
  const framework = frameworkPackages[frameworkPackageName];
  const renderer = frameworkToRenderer[framework];

  if (options.configType === 'DEVELOPMENT') {
    // The manager only needs the token and the base path, so other channel options stay out.
    globals.CHANNEL_OPTIONS = {
      wsToken: channelOptions?.wsToken,
      basePath: channelOptions?.basePath,
    };
  }
  globals.FORKBOOK_BUILDER = builder;
  globals.FORKBOOK_FRAMEWORK = framework;
  globals.FORKBOOK_RENDERER = renderer;
  globals.FORKBOOK_NETWORK_ADDRESS = options.host ? options.networkAddress : undefined;

  const security = await options.presets.apply<SecurityConfig | undefined>('security');
  if (security?.insecureIframeMessaging) {
    globals.INSECURE_IFRAME_MESSAGING = true;
  }

  globals.FORKBOOK_ROOT = resolveRootPage(await options.presets.apply('root'), {
    configDir: options.configDir,
    workingDir: process.cwd(),
  });

  return globals;
};
