import { telemetry } from '@aussieljk/forkbook/internal/telemetry';
import type { CoreConfig, Options } from '@aussieljk/forkbook/internal/types';

import type { Polka } from 'polka';
import invariant from 'tiny-invariant';

import type { StoryIndexGenerator } from './StoryIndexGenerator.ts';
import { summarizeIndex } from './summarizeIndex.ts';
import { versionStatus } from './versionStatus.ts';

export async function doTelemetry(
  app: Polka,
  core: CoreConfig,
  storyIndexGeneratorPromise: Promise<StoryIndexGenerator>,
  options: Options
) {
  const { versionCheck, versionUpdates } = options;
  invariant(
    !versionUpdates || (versionUpdates && versionCheck),
    'versionCheck should be defined when versionUpdates is true'
  );
  telemetry('dev', async () => {
    const indexAndStats = await (await storyIndexGeneratorPromise)?.getIndexAndStats();
    if (!indexAndStats) {
      return {};
    }
    return {
      versionStatus: versionUpdates && versionCheck ? versionStatus(versionCheck) : 'disabled',
      storyIndex: summarizeIndex(indexAndStats.storyIndex),
      storyStats: indexAndStats.stats,
    };
  });
}
