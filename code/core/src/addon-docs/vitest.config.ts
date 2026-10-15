import { defineConfig, mergeConfig } from 'vitest/config';

import { vitestCommonConfig } from '../../../vitest.shared';

export default mergeConfig(
  vitestCommonConfig,
  defineConfig({
    // Apply the CSS modules, so tests can check computed styles. happy-dom does not support CSS
    // nesting, so lightningcss lowers it.
    test: { css: true },
    css: {
      transformer: 'lightningcss',
      lightningcss: { targets: { chrome: 100 << 16 } },
    },
  })
);
