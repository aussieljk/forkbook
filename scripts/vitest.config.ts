import { defineConfig } from 'vitest/config';

/** In CI, run the script tests in one worker, because GitHub Actions runners have few vCPUs. */
const threadCount = process.env.CI ? 1 : undefined;

export default defineConfig({
  test: {
    name: 'scripts',
    clearMocks: true,
    pool: 'threads',
    maxWorkers: threadCount,
  },
});
