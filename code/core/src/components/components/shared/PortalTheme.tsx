import type { ReactNode } from 'react';
import React from 'react';

import { ThemeProvider, useTheme } from '@aussieljk/forkbook/theming';

/**
 * Portals render outside the element of the ThemeProvider, so the theme CSS variables do not reach
 * them. This writes the variables of the current theme again, inside the portal.
 */
export const PortalTheme = ({ children }: { children?: ReactNode }) => (
  <ThemeProvider theme={useTheme()}>{children}</ThemeProvider>
);
