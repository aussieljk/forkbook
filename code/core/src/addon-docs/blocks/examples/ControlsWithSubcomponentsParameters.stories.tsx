import type { ComponentProps } from 'react';

import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

import { ControlsParameters, SubcomponentA, SubcomponentB } from './ControlsParameters.tsx';

/** The props, plus the args that only these stories add arg types for. */
type StoryArgs = ComponentProps<typeof ControlsParameters> & {
  extraMetaArgType?: string;
  extraStoryArgType?: string;
  c?: unknown;
  d?: unknown;
  e?: unknown;
  f?: unknown;
};

/** Reference stories to be used by the Controls stories */
const meta = {
  title: 'examples/Stories for the Controls Block with Subcomponents',
  component: ControlsParameters,
  subcomponents: { SubcomponentA, SubcomponentB },
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
