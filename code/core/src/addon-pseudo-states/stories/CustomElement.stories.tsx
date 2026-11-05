import React from 'react';

import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

import './CustomElement.tsx';
import './grid.css';
import { PseudoStateGrid } from './PseudoStateGrid.tsx';

const meta = {
  title: 'CustomElement',
  parameters: {
    chromatic: { disableSnapshot: true },
  },
  render: (args, context) => React.createElement('custom-element', null, context.name),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const All: Story = {
  render: () => (
    <PseudoStateGrid render={(label) => React.createElement('custom-element', null, label)} />
  ),
};

export const Default: Story = {};

export const Hover: Story = {
  parameters: {
    pseudo: { hover: true },
  },
};

export const Focus: Story = {
  parameters: {
    pseudo: { focus: true },
  },
};

export const Active: Story = {
  parameters: {
    pseudo: { active: true },
  },
};
