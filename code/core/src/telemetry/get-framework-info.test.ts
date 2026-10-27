import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ForkbookConfig } from '@aussieljk/forkbook/internal/types';

import { getFrameworkInfo } from './get-framework-info.ts';

vi.mock('@aussieljk/forkbook/internal/common', () => ({
  getStorybookInfo: vi.fn(),
}));

describe('getFrameworkInfo', () => {
  const defaultInfo = {
    frameworkPackage: '@aussieljk/forkbook/react',
    rendererPackage: '@aussieljk/forkbook/react',
    builderPackage: '@aussieljk/forkbook/builder-vite',
  };

  beforeEach(async () => {
    const { getStorybookInfo } = await import('@aussieljk/forkbook/internal/common');
    vi.mocked(getStorybookInfo).mockResolvedValue(defaultInfo as any);
  });

  it('returns framework/builder/renderer with empty options when no framework provided', async () => {
    const result = await getFrameworkInfo({} as ForkbookConfig, '/tmp/.forkbook');
    expect(result).toEqual({
      framework: { name: defaultInfo.frameworkPackage, options: {} },
      builder: defaultInfo.builderPackage,
      renderer: defaultInfo.rendererPackage,
    });
  });

  it('passes configDir to getStorybookInfo', async () => {
    const configDir = '/my/project/.forkbook';
    const { getStorybookInfo } = await import('@aussieljk/forkbook/internal/common');
    await getFrameworkInfo({} as ForkbookConfig, configDir);
    expect(getStorybookInfo).toHaveBeenCalledWith(configDir);
  });

  it('returns provided framework options when object is passed', async () => {
    const options = { foo: 'bar' } as any;
    const result = await getFrameworkInfo(
      { framework: { name: '@aussieljk/forkbook/react', options } } as any,
      '/tmp/.forkbook'
    );
    expect(result.framework.options).toEqual(options);
  });
});
