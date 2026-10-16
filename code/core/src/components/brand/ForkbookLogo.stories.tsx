import React from 'react';

import { ForkbookIcon } from './ForkbookIcon.tsx';
import { ForkbookLogo } from './ForkbookLogo.tsx';

export default {
  component: ForkbookLogo,
};

export const Normal = () => <ForkbookLogo alt="Forkbook logo" />;

export const Icon = () => <ForkbookIcon width={64} height={64} />;
