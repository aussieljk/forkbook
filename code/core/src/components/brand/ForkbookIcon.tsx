import React from 'react';

import { mirrorBall } from './mirror-ball.ts';

/** The Forkbook mark: the mirror ball. It uses a 64 by 64 view box. */
export const ForkbookMark = () => <image href={mirrorBall} width="64" height="64" />;

export const ForkbookIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg viewBox="0 0 64 64" {...props}>
    <title>Forkbook icon</title>
    <ForkbookMark />
  </svg>
);
