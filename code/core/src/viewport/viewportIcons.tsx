import React from 'react';

import { AppWindowIcon, SmartphoneIcon, TabletIcon, DiamondIcon, WatchIcon } from 'lucide-react';

import type { Viewport } from './types.ts';

export const iconsMap: Record<NonNullable<Viewport['type']>, React.ReactNode> = {
  desktop: <AppWindowIcon />,
  mobile: <SmartphoneIcon />,
  tablet: <TabletIcon />,
  watch: <WatchIcon />,
  other: <DiamondIcon />,
};
