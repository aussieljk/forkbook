import type { StorybookConfig } from '@aussieljk/forkbook/nextjs-vite';

// The Forkbook docs site. Each page is an MDX file in ../docs.
const config: StorybookConfig = {
  framework: '@aussieljk/forkbook/nextjs-vite',
  stories: ['../docs/**/*.mdx'],
  addons: ['@aussieljk/forkbook/addon-docs'],
  core: { disableTelemetry: true },
};

export default config;
