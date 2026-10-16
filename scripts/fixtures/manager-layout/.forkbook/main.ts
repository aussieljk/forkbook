import type { StorybookConfig } from '@aussieljk/forkbook/react-vite';

// A small Forkbook for the manager layout test (scripts/manager-layout.test.ts).
const config: StorybookConfig = {
  framework: '@aussieljk/forkbook/react-vite',
  stories: ['../*.stories.tsx'],
  core: { disableTelemetry: true },
};

export default config;
