// @ts-nocheck

const path = require('path');
const cache = {};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure the imports-paths of packages in the monorepo is correct',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/storybookjs/storybook/blob/next/code/core/README.md',
    },
    fixable: 'code',
  },
  create(context) {
    return {
      ImportDeclaration: (node) => {
        const fileName = context.getPhysicalFilename();
        const isInCLI = !!fileName.includes(path.join('code', 'lib', 'cli') + path.sep);
        const isInCodemod = !!fileName.includes(path.join('code', 'lib', 'codemod'));
        const isInCreateStorybook = !!fileName.includes(
          path.join('code', 'lib', '@aussieljk/forkbook/internal/create')
        );
        const isInCore = !!fileName.includes(path.join('code', 'core'));

        if (
          node.source.value.startsWith('@storybook/core/') &&
          !isInCLI &&
          !isInCore &&
          !isInCodemod &&
          !isInCreateStorybook
        ) {
          const newPath = node.source.value
            .replace('@storybook/core', '@aussieljk/forkbook/internal')
            .replace('/src', '');
          context.report({
            node: node,
            message: `Cannot import from @storybook/core in this package. Use @aussieljk/forkbook/internal instead.`,
            fix: (fixer) => {
              return fixer.replaceText(node.source, `'${newPath}'`);
            },
          });
        }

        if (
          node.source.value.startsWith('@storybook/core/') &&
          (isInCore || isInCLI || isInCodemod || isInCreateStorybook)
        ) {
          const newPath = node.source.value
            .replace('@storybook/core', '@aussieljk/forkbook/internal')
            .replace('/src', '');
          context.report({
            node: node,
            message: `Cannot import from @storybook/core in this package. Use @aussieljk/forkbook/internal instead.`,
            fix: (fixer) => {
              return fixer.replaceText(node.source, `'${newPath}'`);
            },
          });
        }
      },
    };
  },
};
