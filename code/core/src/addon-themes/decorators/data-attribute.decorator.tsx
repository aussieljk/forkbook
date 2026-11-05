import type { DecoratorFunction, Renderer } from '@aussieljk/forkbook/internal/types';

import { useEffect } from '@aussieljk/forkbook/preview-api';

import { PARAM_KEY } from '../constants.ts';
import { initializeThemeState, pluckThemeFromContext } from './helpers.ts';

export interface DataAttributeStrategyConfiguration {
  themes: Record<string, string>;
  defaultTheme: string;
  parentSelector?: string;
  attributeName?: string;
}

const DEFAULT_ELEMENT_SELECTOR = 'html';
const DEFAULT_DATA_ATTRIBUTE = 'data-theme';

export const withThemeByDataAttribute = <TRenderer extends Renderer = Renderer>({
  themes,
  defaultTheme,
  parentSelector = DEFAULT_ELEMENT_SELECTOR,
  attributeName = DEFAULT_DATA_ATTRIBUTE,
}: DataAttributeStrategyConfiguration): DecoratorFunction<TRenderer> => {
  initializeThemeState(Object.keys(themes), defaultTheme);
  return (storyFn, context) => {
    const { themeOverride } = context.parameters[PARAM_KEY] ?? {};
    const selected = pluckThemeFromContext(context);

    useEffect(() => {
      const parentElement = document.querySelector(parentSelector);
      const themeKey = themeOverride || selected || defaultTheme;

      if (parentElement) {
        parentElement.setAttribute(attributeName, themes[themeKey]);
      }
    }, [themeOverride, selected]);

    return storyFn();
  };
};
