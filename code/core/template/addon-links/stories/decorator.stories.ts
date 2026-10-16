import { global as globalThis } from '@storybook/global';

import { withLinks } from '@aussieljk/forkbook/addon-links';

export default {
  component: globalThis.__TEMPLATE_COMPONENTS__.Html,
  parameters: {
    chromatic: { disableSnapshot: true },
  },
  decorators: [withLinks],
};

export const Target = {
  args: {
    content: `
      <div>
      This is just a story to target with the links
      </div>
    `,
  },
  parameters: {
    chromatic: { disableSnapshot: true },
  },
};

export const KindAndStory = {
  args: {
    content: `
      <div>
        <a class="link" href="#" data-fb-kind="addons-links-decorator" data-fb-story="story-only">go to story only</a>
      </div>
    `,
  },
};

export const StoryOnly = {
  args: {
    content: `
      <div>
        <a class="link" href="#" data-fb-story="target">go to target</a>
      </div>
    `,
  },
};

export const KindOnly = {
  args: {
    content: `
      <div>
        <a class="link" href="#" data-fb-kind="addons-links-decorator">go to target</a>
      </div>
    `,
  },
};
