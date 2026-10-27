import type { ForkbookConfig } from '@aussieljk/forkbook/nextjs-vite';

// The Forkbook docs site. Each page is an MDX file in ../docs.
const config: ForkbookConfig = {
  framework: '@aussieljk/forkbook/nextjs-vite',
  stories: ['../docs/**/*.mdx'],
  addons: ['@aussieljk/forkbook/addon-docs'],
  // Images that code and stories link to (placeholders, doc assets).
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
};

export default config;
