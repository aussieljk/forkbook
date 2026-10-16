import type { Preview } from '@aussieljk/forkbook/nextjs-vite';

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: [
          'Introduction',
          'Get started',
          'Moving from Storybook',
          'Writing stories',
          'Writing docs',
          'Writing tests',
          'Essentials',
          'Addons',
          'Configure',
          'API',
          'Sharing',
          'AI',
          'Builders',
          'FAQ',
        ],
      },
    },
  },
};

export default preview;
