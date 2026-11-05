import type { KnipConfig } from 'knip';

import coreBuildConfig from '../code/core/build-config.ts';

// Files we want to exclude from analysis are negated project patterns, not `ignores`.
// docs: https://knip.dev/guides/configuring-project-files
const project = [
  'src/**/*.{js,jsx,ts,tsx,mdx}',
  '!**/__testfixtures__/**',
  '!**/__mockdata__/**',
  '!**/__mocks__/**',
];

// An explicit MDX "compiler", as the dependency knip looks for (@mdx-js/mdx or astro) is not listed.
// docs: https://knip.dev/features/compilers
const importMatcher = /import[^'"]+['"]([^'"]+)['"]/g;
const fencedCodeBlockMatcher = /```[\s\S]*?```/g;
const mdx = (text: string) =>
  [...text.replace(fencedCodeBlockMatcher, '').matchAll(importMatcher)]
    .map(([statement]) => statement)
    .join(';\n');

// Each source file that the build bundles. Some of them (bins, runtimes) are not package exports.
const coreEntries = Object.values(coreBuildConfig.entries).flatMap((entries) =>
  entries.map(({ entryPoint }) => entryPoint)
);

export default {
  storybook: { entry: ['**/*.@(mdx|stories.@(mdx|js|jsx|mjs|ts|tsx))'] },
  workspaces: {
    '.': {
      entry: ['.forkbook/*.{ts,tsx}', 'vitest.config.forkbook.ts'],
      project: ['.forkbook/**/*.{ts,tsx}', '*.ts'],
    },
    core: {
      entry: [
        ...coreEntries,
        'src/manager-api/index.mock.ts',
        'src/core-server/presets/*.ts',
        'src/*/vitest.{config,setup}.ts',
      ],
      project,
    },
  },
  compilers: { mdx },
} satisfies KnipConfig;
