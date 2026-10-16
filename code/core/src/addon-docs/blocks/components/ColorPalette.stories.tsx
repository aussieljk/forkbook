import React from 'react';

import { ColorItem, ColorPalette } from './ColorPalette';

export default {
  component: ColorPalette,
};

export const DefaultStyle = () => (
  <ColorPalette>
    <ColorItem
      title="theme.color.greyscale"
      subtitle="Some of the greys"
      colors={['#FFFFFF', '#F8F8F8', '#F3F3F3']}
    />
    <ColorItem title="theme.color.primary" subtitle="System blue" colors={['#007AFF']} />
    <ColorItem title="theme.color.secondary" subtitle="System blue (dark)" colors={['#0A84FF']} />
    <ColorItem
      title="theme.color.positive"
      subtitle="Green"
      colors={[
        'rgba(102,191,60,1)',
        'rgba(102,191,60,.8)',
        'rgba(102,191,60,.6)',
        'rgba(102,191,60,.3)',
      ]}
    />
    <ColorItem
      title="gradient"
      subtitle="Grayscale"
      colors={['linear-gradient(to right,white,black)']}
    />
  </ColorPalette>
);

export const NamedColors = () => (
  <ColorPalette>
    <ColorItem
      title="theme.color.greyscale"
      subtitle="Some of the greys"
      colors={{
        White: '#FFFFFF',
        Alabaster: '#F8F8F8',
        Concrete: '#F3F3F3',
      }}
    />
    <ColorItem
      title="theme.color.primary"
      subtitle="System blue"
      colors={{
        SystemBlue: '#007AFF',
      }}
    />
    <ColorItem
      title="theme.color.secondary"
      subtitle="Ocean"
      colors={{
        SystemBlueDark: '#0A84FF',
      }}
    />
    <ColorItem
      title="theme.color.positive"
      subtitle="Green"
      colors={{
        Apple: 'rgba(102,191,60,1)',
        Apple80: 'rgba(102,191,60,.8)',
        Apple60: 'rgba(102,191,60,.6)',
        Apple30: 'rgba(102,191,60,.3)',
      }}
    />
    <ColorItem
      title="gradient"
      subtitle="Grayscale"
      colors={{
        Gradient: 'linear-gradient(to right,white,black)',
      }}
    />
  </ColorPalette>
);
