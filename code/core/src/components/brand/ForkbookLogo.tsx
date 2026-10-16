import React from 'react';

import { ForkbookMark } from './ForkbookIcon.tsx';

type ForkbookLogoProps = {
  alt: string;
} & React.SVGAttributes<SVGSVGElement>;

/** The mirror ball and the "Forkbook" text mark in Inter Variable, bold. */
export const ForkbookLogo = ({ alt, ...props }: ForkbookLogoProps) => (
  <svg width="200px" height="40px" viewBox="0 0 200 40" {...props} role="img">
    {alt ? <title>{alt}</title> : null}
    <g transform="translate(0 2) scale(0.5625)">
      <ForkbookMark />
    </g>
    <text
      x="44"
      y="29"
      fill="currentColor"
      fontFamily="'Inter Variable', Inter, -apple-system, system-ui, sans-serif"
      fontSize="27"
      fontWeight="700"
      letterSpacing="-0.5"
    >
      Forkbook
    </text>
  </svg>
);
