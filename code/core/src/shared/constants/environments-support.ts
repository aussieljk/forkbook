// Targets in the esbuild and oxc format (https://esbuild.github.io/api/#target).
export const BROWSER_TARGETS: string[] = [
  'chrome147',
  'edge150',
  'firefox152',
  'safari26.5',
  'ios26.5',
];

export const NODE_TARGET = 'node22.12';

// https://esbuild.github.io/api/#supported
export const SUPPORTED_FEATURES: Record<string, boolean> = {
  // React Native does not support class static blocks without a specific babel plugin
  'class-static-blocks': false,
};
