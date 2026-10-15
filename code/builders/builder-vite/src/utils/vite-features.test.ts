import { describe, expect, it } from 'vitest';

import type { UserConfig } from 'vite';

import { applyChunkedPreviewRuntime, ensureStrictExecutionOrder } from './vite-features.ts';

describe('ensureStrictExecutionOrder', () => {
  it('sets strictExecutionOrder on every output', () => {
    const config: UserConfig = { build: { rolldownOptions: { output: [{}, {}] } } };
    ensureStrictExecutionOrder(config);

    expect(config.build?.rolldownOptions?.output).toEqual([
      { strictExecutionOrder: true },
      { strictExecutionOrder: true },
    ]);
  });
});

describe('applyChunkedPreviewRuntime', () => {
  it('does not add a second preview runtime alias', () => {
    const config: UserConfig = {};
    applyChunkedPreviewRuntime(config);

    expect(config.resolve?.alias).toBeUndefined();
  });

  it('caps chunks and keeps existing groups', () => {
    const config: UserConfig = {
      build: {
        rolldownOptions: {
          output: { codeSplitting: { groups: [{ name: 'vendor', test: /node_modules/ }] } },
        },
      },
    };
    applyChunkedPreviewRuntime(config);

    expect(config.build?.rolldownOptions?.output).toEqual({
      codeSplitting: {
        groups: [
          { name: 'vendor', test: /node_modules/ },
          { name: 'sb', maxSize: 500 * 1024 },
        ],
      },
    });
  });
});
