import React from 'react';

import { ForkbookMark } from './StorybookIcon.tsx';

type StorybookLogoProps = {
  alt: string;
} & React.SVGAttributes<SVGSVGElement>;

export const StorybookLogo = ({ alt, ...props }: StorybookLogoProps) => (
  <svg width="200px" height="40px" viewBox="0 0 200 40" {...props} role="img">
    {alt ? <title>{alt}</title> : null}
    <g transform="translate(0 2) scale(0.5625)">
      <ForkbookMark />
    </g>
    <text
      x="46"
      y="29"
      fill="currentColor"
      fontFamily="'Nunito Sans', -apple-system, system-ui, sans-serif"
      fontSize="27"
      fontWeight="700"
    >
      Forkbook
    </text>
  </svg>
);
