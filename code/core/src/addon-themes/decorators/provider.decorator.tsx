import type { ComponentType } from 'react';
import React from 'react';

import type { DecoratorFunction, Renderer } from '@aussieljk/forkbook/internal/types';

import { useMemo } from '@aussieljk/forkbook/preview-api';

import { PARAM_KEY } from '../constants.ts';
import { initializeThemeState, pluckThemeFromContext } from './helpers.ts';

type Theme = Record<string, unknown>;
type ThemeMap = Record<string, Theme>;

export interface ProviderStrategyConfiguration {
  // A theme provider has its own theme type, so `any` lets any provider fit.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Provider?: ComponentType<any>;
  GlobalStyles?: ComponentType;
  defaultTheme?: string;
  themes?: ThemeMap;
}

const pluckThemeFromKeyPairTuple = ([_, themeConfig]: [string, Theme]): Theme => themeConfig;

export const withThemeFromJSXProvider = <TRenderer extends Renderer = Renderer>({
  Provider,
  GlobalStyles,
  defaultTheme,
  themes = {},
}: ProviderStrategyConfiguration): DecoratorFunction<TRenderer> => {
  const themeNames = Object.keys(themes);
  const initialTheme = defaultTheme || themeNames[0];

  initializeThemeState(themeNames, initialTheme);

  const decorator: DecoratorFunction<TRenderer> = (storyFn, context) => {
    const { themeOverride } = context.parameters[PARAM_KEY] ?? {};
    const selected = pluckThemeFromContext(context);

    const theme = useMemo(() => {
      const selectedThemeName = themeOverride || selected || initialTheme;
      const pairs = Object.entries(themes);

      return pairs.length === 1 ? pluckThemeFromKeyPairTuple(pairs[0]) : themes[selectedThemeName];
    }, [selected, themeOverride]);

    if (!Provider) {
      return (
        <>
          {GlobalStyles && <GlobalStyles />}
          {storyFn()}
        </>
      );
    }

    return (
      <Provider theme={theme}>
        {GlobalStyles && <GlobalStyles />}
        {storyFn()}
      </Provider>
    );
  };

  return decorator;
};
