import { resolve } from 'node:path';

import { cache, PackageManagerName } from '@aussieljk/forkbook/internal/common';
import { telemetry } from '@aussieljk/forkbook/internal/telemetry';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { ProjectInfo } from './project-info.ts';
import { recordSetupRun } from './record-setup-run.ts';

vi.mock('@aussieljk/forkbook/internal/telemetry', { spy: true });

const projectInfo = {
  framework: '@aussieljk/forkbook/react-vite',
  rendererPackage: '@aussieljk/forkbook/react',
  builderPackage: '@aussieljk/forkbook/builder-vite',
  configDir: '.forkbook',
  language: 'ts',
  packageManager: { type: PackageManagerName.NPM },
} as ProjectInfo;

beforeEach(() => {
  vi.mocked(telemetry).mockResolvedValue(undefined);
  vi.spyOn(cache, 'set').mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('persists a project-scoped flag and reports the setup session under the same run id', async () => {
  await recordSetupRun({ projectInfo, prompt: 'optimized-tests' });

  const [, flag] = vi.mocked(cache.set).mock.calls[0];
  expect(cache.set).toHaveBeenCalledWith('ai-setup-ran', {
    timestamp: expect.any(Number),
    runId: expect.any(String),
    configDir: resolve('.forkbook'),
  });
  expect(telemetry).toHaveBeenCalledWith(
    'ai-setup',
    {
      cliOptions: { packageManager: 'npm', prompt: 'optimized-tests' },
      project: {
        framework: '@aussieljk/forkbook/react-vite',
        renderer: '@aussieljk/forkbook/react',
        builder: '@aussieljk/forkbook/builder-vite',
        language: 'ts',
      },
      runId: (flag as { runId: string }).runId,
    },
    { configDir: resolve('.forkbook') }
  );
});

it('still reports the setup session when the flag cannot be written', async () => {
  vi.mocked(cache.set).mockRejectedValue(new Error('read-only cache'));

  await recordSetupRun({ projectInfo, prompt: 'optimized-tests' });

  expect(telemetry).toHaveBeenCalledWith('ai-setup', expect.anything(), expect.anything());
});
