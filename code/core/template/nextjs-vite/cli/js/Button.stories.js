import { fn } from '@aussieljk/forkbook/test';

import { Button } from './Button';

// More on how to set up stories at: https://forkbook.ljk.dev/docs/writing-stories#default-export
export default {
  title: 'Example/Button',
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://forkbook.ljk.dev/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://forkbook.ljk.dev/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://forkbook.ljk.dev/docs/api/arg-types
  argTypes: {
    backgroundColor: { control: 'color' },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://forkbook.ljk.dev/docs/essentials/actions#story-args
  args: { onClick: fn() },
};

// More on writing stories with args: https://forkbook.ljk.dev/docs/writing-stories/args
export const Primary = {
  args: {
    primary: true,
    label: 'Button',
  },
};

export const Secondary = {
  args: {
    label: 'Button',
  },
};

export const Large = {
  args: {
    size: 'large',
    label: 'Button',
  },
};

export const Small = {
  args: {
    size: 'small',
    label: 'Button',
  },
};
