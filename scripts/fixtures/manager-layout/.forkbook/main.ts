import type { StorybookConfig } from '@aussieljk/forkbook/react-vite';

// A small Forkbook for the manager layout test (scripts/manager-layout.test.ts).
const config: StorybookConfig = {
  framework: '@aussieljk/forkbook/react-vite',
  stories: ['../*.mdx', '../*.stories.tsx'],
  addons: ['@aussieljk/forkbook/addon-docs'],
  core: { disableTelemetry: true },
};

export default config;
