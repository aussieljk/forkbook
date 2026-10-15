import type { CSSProperties, ReactNode } from 'react';
import React, { createContext, useContext, useMemo } from 'react';

// TODO(emotion): remove this bridge once no component uses Emotion.
import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';

import { convert } from './convert.ts';
import { themeToCssVars } from './css-vars.ts';
import type { StorybookTheme } from './types.ts';

const ThemeContext = createContext<StorybookTheme | undefined>(undefined);

/** Returns the theme from the nearest `ThemeProvider`, or the default theme. */
export const useTheme = (): StorybookTheme => useContext(ThemeContext) ?? defaultTheme();

let fallbackTheme: StorybookTheme | undefined;
const defaultTheme = () => (fallbackTheme ??= convert());

/**
 * Gives the theme to `useTheme` and writes it as CSS variables on a wrapper element, so the CSS
 * below can use `var(--sb-...)`. The `data-sb-theme` attribute holds the theme base (`light` or
 * `dark`).
 */
export const ThemeProvider = ({
  theme,
  children,
}: {
  theme: StorybookTheme;
  children?: ReactNode;
}) => {
  const style = useMemo(
    () => ({ display: 'contents', ...themeToCssVars(theme) }) as CSSProperties,
    [theme]
  );

  return (
    <ThemeContext.Provider value={theme}>
      <div data-sb-theme={theme.base} style={style}>
        <EmotionThemeProvider theme={theme}>{children}</EmotionThemeProvider>
      </div>
    </ThemeContext.Provider>
  );
};
