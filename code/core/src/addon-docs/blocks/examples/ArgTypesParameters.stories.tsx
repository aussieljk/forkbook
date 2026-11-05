import type { ComponentProps } from 'react';

import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

import { ArgTypesParameters } from './ArgTypesParameters.tsx';

/** The props, plus the args that only these stories add arg types for. */
type StoryArgs = ComponentProps<typeof ArgTypesParameters> & {
  extraMetaArgType?: string;
  extraStoryArgType?: string;
  c?: unknown;
  d?: unknown;
  e?: unknown;
  f?: unknown;
};

/** Reference stories to be used by the ArgTypes stories */
const meta = {
  title: 'examples/Stories for the ArgTypes Block',
  component: ArgTypesParameters,
  args: { b: 'b' },
  argTypes: {
    extraMetaArgType: {
      type: { name: 'string' },
      name: 'Extra Meta',
      description: 'An extra argtype added at the meta level',
      table: { defaultValue: { summary: "'a default value'" } },
    },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<Meta<StoryArgs>>;

export const NoParameters: Story = {
  argTypes: {
    extraStoryArgType: {
      type: { name: 'string' },
      name: 'Extra Story',
      description: 'An extra argtype added at the story level',
      table: { defaultValue: { summary: "'a default value'" } },
    },
  },
};

export const Include: Story = {
  ...NoParameters,
  parameters: { docs: { argTypes: { include: ['a'] } } },
};

export const Exclude: Story = {
  ...NoParameters,
  parameters: { docs: { argTypes: { exclude: ['a'] } } },
};

export const Sort: Story = {
  ...NoParameters,
  parameters: { docs: { argTypes: { sort: 'alpha' } } },
};

export const Categories: Story = {
  ...NoParameters,
  argTypes: {
    c: {
      description: 'a description',
      table: {
        category: 'the first category',
      },
    },
    d: {
      table: {
        category: 'the first category',
        subcategory: 'a subcategory',
      },
    },
    e: {
      table: {
        subcategory: 'a subcategory without a category',
      },
    },
    f: {
      table: {
        category: 'the second category',
      },
    },
  },
};
