import { Channel } from '@aussieljk/forkbook/internal/channels';
import { cache } from '@aussieljk/forkbook/internal/common';
import { buildIndexStandalone, withTelemetry } from '@aussieljk/forkbook/internal/core-server';
import type { BuilderOptions, CLIBaseOptions } from '@aussieljk/forkbook/internal/types';

export interface CLIIndexOptions extends CLIBaseOptions {
  configDir?: string;
  outputFile?: string;
}

export const buildIndex = async (
  cliOptions: CLIIndexOptions & { packageJson?: Record<string, any> }
) => {
  const options = {
    ...cliOptions,
    configDir: cliOptions.configDir || '.forkbook',
    outputFile: cliOptions.outputFile || 'index.json',
    configType: 'PRODUCTION' as BuilderOptions['configType'],
    cache,
    packageJson: cliOptions.packageJson,
  };
  const presetOptions = {
    ...options,
    corePresets: [],
    overridePresets: [],
    channel: new Channel({}),
  } as unknown as Parameters<typeof withTelemetry>[1]['presetOptions'];
  await withTelemetry('index', { cliOptions, presetOptions }, () => buildIndexStandalone(options));
};
