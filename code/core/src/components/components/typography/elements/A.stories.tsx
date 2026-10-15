import React from 'react';

import { expect } from '@aussieljk/forkbook/test';

import { A } from './A.tsx';

export default {
  component: A,
};

export const Default = {
  render: () => <A href="https://example.com">Link Text</A>,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // Links must not rely on colour alone (WCAG SC 1.4.1).
    for (const link of canvasElement.querySelectorAll('a')) {
      await expect(link.textContent).toBe('Link Text');
      await expect(getComputedStyle(link).textDecorationLine).toContain('underline');
    }
  },
};

export const Anchor = {
  render: () => (
    <div style={{ position: 'relative', paddingLeft: 30 }}>
      <A href="#heading" className="anchor">
        Anchor Link
      </A>
    </div>
  ),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // Anchor position markers are not underlined.
    for (const link of canvasElement.querySelectorAll('a.anchor')) {
      await expect(getComputedStyle(link).textDecorationLine).not.toContain('underline');
    }
  },
};
