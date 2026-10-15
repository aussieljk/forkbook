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

export const buildFrameworkGlobalsFromOptions = async (options: Options) => {
  const globals: Record<string, any> = {};

  const { builder: builderConfig, channelOptions } = await options.presets.apply('core');
  const builderName = typeof builderConfig === 'string' ? builderConfig : builderConfig?.name;
  const builder = Object.values(SupportedBuilder).find((builder) => builderName?.includes(builder));

  const frameworkName = await getFrameworkName(options);
  const frameworkPackageName = extractFrameworkPackageName(frameworkName);
  const framework = frameworkPackages[frameworkPackageName];
  const renderer = frameworkToRenderer[framework];

  if (options.configType === 'DEVELOPMENT') {
    // Manager only needs the token currently, so we don't pass any other channel options.
    globals.CHANNEL_OPTIONS = { wsToken: channelOptions?.wsToken };
  }
  globals.FORKBOOK_BUILDER = builder;
  globals.FORKBOOK_FRAMEWORK = framework;
  globals.FORKBOOK_RENDERER = renderer;
  globals.FORKBOOK_NETWORK_ADDRESS = options.host ? options.networkAddress : undefined;

  const security = await options.presets.apply<SecurityConfig | undefined>('security');
  if (security?.insecureIframeMessaging) {
    globals.INSECURE_IFRAME_MESSAGING = true;
  }

  return globals;
};
