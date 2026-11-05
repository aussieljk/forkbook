import React from 'react';

import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

import './CustomElementNested.tsx';
import './grid.css';
import { PseudoStateGrid } from './PseudoStateGrid.tsx';

const meta = {
  title: 'CustomElementNested',
  parameters: {
    chromatic: { disableSnapshot: true },
  },
  render: (args, context) => React.createElement('custom-element-nested', null, context.name),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const All: Story = {
  render: () => (
    <PseudoStateGrid
      render={(label) => React.createElement('custom-element-nested', null, label)}
    />
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
