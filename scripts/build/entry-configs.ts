import a11yConfig from '../../code/addons/a11y/build-config.ts';
import docsConfig from '../../code/addons/docs/build-config.ts';
import linksConfig from '../../code/addons/links/build-config.ts';
import mcpAddonConfig from '../../code/addons/mcp/build-config.ts';
import pseudoStatesConfig from '../../code/addons/pseudo-states/build-config.ts';
import themesConfig from '../../code/addons/themes/build-config.ts';
import vitestConfig from '../../code/addons/vitest/build-config.ts';
import builderViteConfig from '../../code/builders/builder-vite/build-config.ts';
import storybookConfig from '../../code/core/build-config.ts';
import nextjsViteFrameworkConfig from '../../code/frameworks/nextjs-vite/build-config.ts';
import reactViteFrameworkConfig from '../../code/frameworks/react-vite/build-config.ts';
import cliConfig from '../../code/lib/cli-storybook/build-config.ts';
import createStorybookConfig from '../../code/lib/create-storybook/build-config.ts';
import mcpConfig from '../../code/lib/mcp/build-config.ts';
import vitePluginStorybookNextjsConfig from '../../code/lib/vite-plugin-storybook-nextjs/build-config.ts';
import reactRendererConfig from '../../code/renderers/react/build-config.ts';
import type { BuildEntriesByPackageName } from './utils/entry-utils.ts';

export const buildEntries = {
  storybook: storybookConfig,

  // addons
  '@storybook/addon-a11y': a11yConfig,
  '@storybook/addon-docs': docsConfig,
  '@storybook/addon-links': linksConfig,
  '@storybook/addon-mcp': mcpAddonConfig,
  'storybook-addon-pseudo-states': pseudoStatesConfig,
  '@storybook/addon-themes': themesConfig,
  '@storybook/addon-vitest': vitestConfig,

  // builders
  '@storybook/builder-vite': builderViteConfig,

  // frameworks
  '@storybook/nextjs-vite': nextjsViteFrameworkConfig,
  '@storybook/react-vite': reactViteFrameworkConfig,

  // lib
  '@storybook/cli': cliConfig,
  '@storybook/mcp': mcpConfig,
  'create-storybook': createStorybookConfig,
  'vite-plugin-storybook-nextjs': vitePluginStorybookNextjsConfig,

  // renderers
  '@storybook/react': reactRendererConfig,
};

export function isBuildEntries(key: string): key is keyof typeof buildEntries {
  return key in buildEntries;
}

export function hasPrebuild(
  entry: BuildEntriesByPackageName[keyof BuildEntriesByPackageName]
): entry is BuildEntriesByPackageName[keyof BuildEntriesByPackageName] & {
  prebuild: (cwd: string) => Promise<void>;
} {
  return 'prebuild' in entry;
}
