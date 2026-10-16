import React from 'react';

import {
  BrowserIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  DiamondIcon,
  WatchIcon,
} from '@phosphor-icons/react';

import type { Viewport } from './types.ts';

export const iconsMap: Record<NonNullable<Viewport['type']>, React.ReactNode> = {
  desktop: <BrowserIcon />,
  mobile: <DeviceMobileIcon />,
  tablet: <DeviceTabletIcon />,
  watch: <WatchIcon />,
  other: <DiamondIcon />,
};
