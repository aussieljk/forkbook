import type { ReactNode } from 'react';

import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

import { Optional } from './Optional.tsx';

const Resizing = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: 'inline-flex',
      justifyContent: 'space-between',
      width: '250px',
      animation: 'optional-story-resize 3s ease-in-out infinite alternate',
      border: '1px solid silver',
    }}
  >
    <style>{'@keyframes optional-story-resize { to { width: 150px; } }'}</style>
    {children}
  </div>
);

const meta = {
  title: 'Optional',
  component: Optional,
  decorators: [
    (Story) => (
      <Resizing>
        <Story />
        <div style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>Other stuff</div>
      </Resizing>
    ),
  ],
} satisfies Meta<typeof Optional>;

export default meta;

export const Default: StoryObj<typeof meta> = {
  args: {
    content: (
      <div style={{ display: 'inline-block', whiteSpace: 'nowrap', background: 'papayawhip' }}>
        Optional content
      </div>
    ),
  },
};

export const Fallback: StoryObj<typeof meta> = {
  args: {
    content: (
      <div style={{ display: 'inline-block', whiteSpace: 'nowrap', background: 'papayawhip' }}>
        Optional content
      </div>
    ),
    fallback: (
      <div style={{ display: 'inline-block', whiteSpace: 'nowrap', background: 'palevioletred' }}>
        Fallback
      </div>
    ),
  },
};
