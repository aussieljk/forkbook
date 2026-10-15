import type { Meta, StoryObj } from 'storybook/react-vite';
import type { ReactNode } from 'react';
import React from 'react';

import { IconSymbols, UseSymbol } from './IconSymbols.tsx';
import { TypeIcon } from './TreeNode.tsx';

const TYPE_ICON_TYPES = ['group', 'component', 'document', 'story', 'test'] as const;
const STATUS_ICON_TYPES = [
  'success',
  'error',
  'warning',
  'dot',
  'new',
  'reviewing',
  'modified',
  'affected',
] as const;

const Grid = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: 16,
      padding: 16,
    }}
  >
    {children}
  </div>
);

const Item = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    {children}
  </div>
);

const Label = ({ children }: { children: ReactNode }) => (
  <span style={{ fontSize: 'var(--sb-size-s1)', color: 'var(--sb-color-mediumdark)' }}>
    {children}
  </span>
);

const meta = {
  component: IconSymbols,
  title: 'Sidebar/IconSymbols',
  parameters: { layout: 'padded' },
  decorators: [
    (StoryFn) => (
      <>
        <IconSymbols />
        <StoryFn />
      </>
    ),
  ],
} satisfies Meta<typeof IconSymbols>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Grid>
      {TYPE_ICON_TYPES.map((type) => (
        <Item key={type}>
          <TypeIcon viewBox="0 0 14 14" width="14" height="14" type={type}>
            <UseSymbol type={type} />
          </TypeIcon>
          <Label>{type}</Label>
        </Item>
      ))}
      {STATUS_ICON_TYPES.map((type) => (
        <Item key={type}>
          <svg
            viewBox="0 0 14 14"
            style={{ width: 14, height: 14, color: 'var(--sb-color-default-text)' }}
          >
            <UseSymbol type={type} />
          </svg>
          <Label>{type}</Label>
        </Item>
      ))}
    </Grid>
  ),
};
