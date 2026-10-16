/// <reference path="./emotionAugmentation.d.ts" />
import styled, { type StyledComponent } from '@emotion/native';
import { useTheme, withTheme, ThemeProvider } from '@emotion/react';

import type { StorybookTheme } from './theme.ts';

export { theme, darkTheme, type StorybookTheme } from './theme.ts';
export type Theme = StorybookTheme;

export { styled, useTheme, withTheme, ThemeProvider, type StyledComponent };
