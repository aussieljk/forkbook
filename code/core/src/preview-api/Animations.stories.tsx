import React from 'react';

import type { Meta, StoryObj } from '@aussieljk/forkbook/react-vite';

import { within } from '@aussieljk/forkbook/test';
import { clsx } from 'clsx';

import styles from './Animations.module.css';

const Component = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <div className={clsx(styles.component, className)}>{children}</div>
);

const meta = {
  component: Component,
  title: 'Animations',
  args: {
    children: <strong>Content</strong>,
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FadeIn: Story = {
  args: {
    className: styles.fadeIn,
  },
};

export const Infinite: Story = {
  args: {
    className: styles.infinite,
  },
};

export const Scroll: Story = {
  args: {
    children: (
      <div className={styles.container}>
        <div className={styles.bar} />
        <span>A red bar appears as you scroll ↓</span>
      </div>
    ),
  },
  play: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    window.scroll({ top: 100, behavior: 'smooth' });
    await new Promise((resolve) => setTimeout(resolve, 300));
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export const Transition: Story = {
  args: {
    children: (
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className={styles.button}>I turn blue</button>
        <button className={styles.button}>I stay red</button>
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [button] = await canvas.findAllByRole('button');
    button.focus();
  },
};
