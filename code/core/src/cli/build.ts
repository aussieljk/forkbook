import { cache } from '@aussieljk/forkbook/internal/common';
import { buildStaticStandalone, withTelemetry } from '@aussieljk/forkbook/internal/core-server';

export const build = async (cliOptions: any) => {
  const { default: packageJson } = await import('@aussieljk/forkbook/package.json', {
    with: { type: 'json' },
  });
  const options = {
    ...cliOptions,
    configDir: cliOptions.configDir || './.forkbook',
    outputDir: cliOptions.outputDir || './storybook-static',
    configType: 'PRODUCTION',
    cache,
    packageJson,
  };
  await withTelemetry('build', { cliOptions, presetOptions: options }, () =>
    buildStaticStandalone(options)
  );
};
