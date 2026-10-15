import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getProjectRoot } from 'storybook/internal/common';
import type { ArgTypes } from 'storybook/internal/csf';
import type { PresetProperty } from 'storybook/internal/types';

import { resolvePackageDir } from '../shared/utils/module.ts';
import { getSharedComponentMetaManager } from './componentManifest/componentMetaManagerSingleton.ts';
import { extractArgTypesFromComponentMeta } from './docgen/buildDocgen.ts';

export { manifests as experimental_manifests } from './componentManifest/generator.ts';

export { enrichCsf as experimental_enrichCsf } from './enrichCsf.ts';

export { experimental_docgenProvider } from './docgen/preset.ts';

// Turns `features.docgenServer` on; read through `presets.apply('isDocgenProviderEnabled')` so the
// default never has to call the provider, which itself reads `features`.
export const isDocgenProviderEnabled = () => true;

export { experimental_storyDocsProvider } from './docgen/story-docs-preset.ts';

export const features: PresetProperty<'features'> = async (existing) => ({
  ...existing,
  componentsManifest: true,
});

export const previewAnnotations: PresetProperty<'previewAnnotations'> = async (
  input = [],
  options
) => {
  const [docsConfig, features] = await Promise.all([
    options.presets.apply('docs', {}, options),
    options.presets.apply('features', {}, options),
  ]);
  const docsEnabled = Object.keys(docsConfig).length > 0;
  const experimentalRSC = features?.experimentalRSC;
  const result: string[] = [];

  return result
    .concat(input)
    .concat([
      fileURLToPath(import.meta.resolve('storybook/react/entry-preview')),
      fileURLToPath(import.meta.resolve('storybook/react/entry-preview-argtypes')),
    ])
    .concat(
      docsEnabled ? [fileURLToPath(import.meta.resolve('storybook/react/entry-preview-docs'))] : []
    )
    .concat(
      experimentalRSC
        ? [fileURLToPath(import.meta.resolve('storybook/react/entry-preview-rsc'))]
        : []
    );
};

/**
 * Try to resolve react and react-dom from the root node_modules of the project addon-docs uses this
 * to alias react and react-dom to the project's version when possible If the user doesn't have an
 * explicit dependency on react this will return the existing values Which will be the versions
 * shipped with addon-docs
 */
export const resolvedReact = async (existing: any) => {
  try {
    return {
      ...existing,
      react: resolvePackageDir('react'),
      reactDom: resolvePackageDir('react-dom'),
    };
  } catch {
    return existing;
  }
};

/** ArgTypes of a component export, for the component tests of `storybook/addon-vitest`. */
export async function internal_getArgTypesData(
  _input: unknown,
  options: { componentFilePath?: string; componentExportName?: string }
): Promise<ArgTypes | null> {
  const { componentFilePath, componentExportName } = options ?? {};
  if (!componentFilePath) {
    return null;
  }
  const filePath = path.isAbsolute(componentFilePath)
    ? componentFilePath
    : join(getProjectRoot(), componentFilePath);
  const doc = getSharedComponentMetaManager()?.extractFromFile(filePath, componentExportName);
  return extractArgTypesFromComponentMeta(doc) ?? null;
}

export const optimizeViteDeps: string[] = [
  'react-dom/client',
  'react-dom/test-utils',
  'react/jsx-runtime',
];
