import { cache, defaultConfigDir } from '@aussieljk/forkbook/internal/common';
import { buildStaticStandalone, withTelemetry } from '@aussieljk/forkbook/internal/core-server';
import type { CLIOptions } from '@aussieljk/forkbook/internal/types';

export const build = async (cliOptions: CLIOptions & { outputDir?: string }) => {
  const { default: packageJson } = await import('@aussieljk/forkbook/package.json', {
    with: { type: 'json' },
  });
  type Options = Parameters<typeof buildStaticStandalone>[0];

  const options = {
    ...cliOptions,
    configDir: cliOptions.configDir || defaultConfigDir(),
    outputDir: cliOptions.outputDir || './forkbook-static',
    configType: 'PRODUCTION',
    cache,
    packageJson,
  } as Options;
  await withTelemetry(
    'build',
    {
      cliOptions,
      presetOptions: options as Parameters<typeof withTelemetry>[1]['presetOptions'],
    },
    () => buildStaticStandalone(options)
  );
};
