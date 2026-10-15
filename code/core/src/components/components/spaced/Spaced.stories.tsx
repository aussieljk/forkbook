import type { ComponentProps } from 'react';
import React from 'react';

import { Spaced } from './Spaced.tsx';

const PlaceholderBlock = ({ color }: { color?: string }) => (
  <div style={{ background: color || 'hotpink', padding: 20 }} />
);
const PlaceholderInline = ({ color }: { color?: string }) => (
  <span style={{ background: color || 'hotpink', display: 'inline-block', padding: 20 }} />
);

export default {
  component: Spaced,
};

export const Default = (args: ComponentProps<typeof Spaced>) => (
  <div>
    <PlaceholderBlock color="silver" />
    <Spaced {...args}>
      <PlaceholderBlock />
      <PlaceholderBlock />
      <PlaceholderBlock />
    </Spaced>
    <PlaceholderBlock color="silver" />
  </div>
);

export const Column = {
  render: (args: ComponentProps<typeof Spaced>) => (
    <div>
      <PlaceholderBlock color="silver" />
      <Spaced {...args}>
        <PlaceholderBlock />
        <PlaceholderBlock />
        <PlaceholderBlock />
      </Spaced>
      <PlaceholderBlock color="silver" />
    </div>
  ),
};
export const Row = {
  render: (args: ComponentProps<typeof Spaced>) => (
    <div>
      <PlaceholderInline color="silver" />
      <Spaced {...args}>
        <PlaceholderInline />
        <PlaceholderInline />
        <PlaceholderInline />
      </Spaced>
      <PlaceholderInline color="silver" />
    </div>
  ),
};
