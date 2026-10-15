import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StoryIndexGenerator } from 'storybook/internal/core-server';
import type { EnrichCsfOptions } from 'storybook/internal/csf-tools';
import type { Options, PresetProperty, StorybookConfigRaw } from 'storybook/internal/types';

import { resolvePackageDir } from '../shared/utils/module';
import { csfPlugin } from './csf-plugin/index.ts';
import type { CompileOptions } from './compiler';
import { registerMdxService } from './mdx-service/server.ts';

type DocsOptions = Options & {
  csfPluginOptions?: EnrichCsfOptions | null;
  mdxPluginOptions?: CompileOptions;
};

/**
 * Get the resolvedReact preset, which points either to the user's react dependencies or the react
 * dependencies shipped with addon-docs if the user has not installed react explicitly.
 */
const getResolvedReact = async (options: Options) => {
  const resolvedReact = (await options.presets.apply('resolvedReact', {})) as any;
  // resolvedReact should always be set by the time we get here, but just in case, we'll default to addon-docs's react dependencies
  return {
    react: resolvedReact.react ?? resolvePackageDir('react'),
    reactDom: resolvedReact.reactDom ?? resolvePackageDir('react-dom'),
    // Explicitly alias @mdx-js/react, so that symlinked MDX files can resolve it when it is not hoisted
    mdx: resolvedReact.mdx ?? fileURLToPath(import.meta.resolve('@mdx-js/react')),
  };
};

const docs: PresetProperty<'docs'> = (input = {}, options) => {
  if (options?.build?.test?.disableAutoDocs) {
    return undefined;
  }

  const result: StorybookConfigRaw['docs'] = {
    ...input,
    defaultName: 'Docs',
  };

  const docsMode = options.docs;
  if (docsMode) {
    result.docsMode = docsMode;
  }
  return result;
};

export const viteFinal = async (config: any, options: DocsOptions) => {
  const { plugins = [] } = config;
  const { csfPluginOptions = {} } = options;

  const { mdxPlugin } = await import('./mdx-plugin');
  const enrichCsf = await options.presets.apply('experimental_enrichCsf');

  // Use the resolvedReact preset to alias react and react-dom to either the users version or the version shipped with addon-docs
  const { react, reactDom, mdx } = await getResolvedReact(options);

  const packageDeduplicationPlugin = {
    name: 'storybook:package-deduplication',
    enforce: 'pre',
    config: () => ({
      resolve: {
        alias: {
          react,
          // Vite doesn't respect export maps when resolving an absolute path, so we need to do that manually here
          ...(isAbsolute(reactDom) && { 'react-dom/server': `${reactDom}/server.browser.js` }),
          'react-dom': reactDom,
          '@mdx-js/react': mdx,
        },
      },
    }),
  };

  if (csfPluginOptions) {
    plugins.unshift(
      csfPlugin({
        ...csfPluginOptions,
        enrichCsf,
      })
    );
  }

  // add alias plugin early to ensure any other plugins that also add the aliases will override this
  plugins.unshift(packageDeduplicationPlugin);
  // mdx plugin needs to be before any react plugins
  plugins.unshift(mdxPlugin(options));

  return {
    ...config,
    plugins,
  };
};

/*
 * This is a workaround for https://github.com/Swatinem/rollup-plugin-dts/issues/162
 * something down the dependency chain is using typescript namespaces, which are not supported by rollup-plugin-dts
 */
const docsX = docs as any;

/**
 * If the user has not installed react explicitly in their project, the resolvedReact preset will
 * not be set. We then set it here in addon-docs to use addon-docs's react version that always
 * exists. This is just a fallback that never overrides the existing preset, but ensures that there
 * is always a resolved react.
 */
export const resolvedReact = async (existing: any) => ({
  react: existing?.react ?? resolvePackageDir('react'),
  reactDom: existing?.reactDom ?? resolvePackageDir('react-dom'),
  mdx: existing?.mdx ?? fileURLToPath(import.meta.resolve('@mdx-js/react')),
});

export const services = async (_value: void, options: Options): Promise<void> => {
  const features = await options.presets.apply('features');

  if (features?.docgenServer && features?.componentsManifest) {
    registerMdxService({
      getIndex: () =>
        options.presets
          .apply<StoryIndexGenerator>('storyIndexGenerator')
          .then((generator) => generator.getIndex()),
    });
  }
};

const optimizeViteDeps = [
  'storybook/addon-docs',
  'storybook/addon-docs/blocks',
  'storybook/addon-docs > @mdx-js/react',
  'react-dom/client',
  'react/jsx-runtime',
  'react',
];

export { docsX as docs, optimizeViteDeps };
export { manifests as experimental_manifests } from './manifest';
