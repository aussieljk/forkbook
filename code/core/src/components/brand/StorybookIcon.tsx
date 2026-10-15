import React from 'react';

/** The Forkbook mark: a fork on a rounded square. It uses a 64 by 64 view box. */
export const ForkbookMark = () => (
  <g fillRule="nonzero">
    <rect width="64" height="64" rx="14" fill="#0F766E" />
    <g fill="#FFFFFF">
      <rect x="20" y="10" width="5" height="20" rx="2.5" />
      <rect x="29.5" y="10" width="5" height="20" rx="2.5" />
      <rect x="39" y="10" width="5" height="20" rx="2.5" />
      <rect x="20" y="25" width="24" height="9" rx="4.5" />
      <rect x="28.5" y="30" width="7" height="25" rx="3.5" />
    </g>
  </g>
);

export const StorybookIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg viewBox="0 0 64 64" {...props}>
    <title>Forkbook icon</title>
    <ForkbookMark />
  </svg>
);
