import type { StorybookTheme } from './types.ts';

export type CssVars = Record<`--${string}`, string>;

const kebab = (key: string) => key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

const px = (value: number | string | undefined) =>
  typeof value === 'number' ? `${value}px` : value;

/** Adds `--sb-<prefix>-<key>` for each value of a theme group, for example `--fb-color-primary`. */
const addGroup = (
  vars: CssVars,
  prefix: string,
  group: Record<string, unknown> | undefined,
  unit: (value: any) => string | undefined = String
) => {
  for (const [key, value] of Object.entries(group ?? {})) {
    if (typeof value === 'string' || typeof value === 'number') {
      vars[`--sb-${prefix}-${kebab(key)}`] = unit(value) as string;
    }
  }
};

/**
 * Turns a theme into CSS variables. Component styles read the theme with `var(--sb-...)`.
 *
 * The names follow the theme object: `theme.color.defaultText` is `--fb-color-default-text`,
 * `theme.typography.size.s2` is `--fb-size-s2` and `theme.input.borderRadius` is
 * `--fb-input-border-radius`. Sizes are in pixels.
 */
export const themeToCssVars = (theme: StorybookTheme): CssVars => {
  const vars: CssVars = {};

  addGroup(vars, 'color', theme.color);
  addGroup(vars, 'fg-color', theme.fgColor);
  addGroup(vars, 'bg-color', theme.bgColor);
  addGroup(vars, 'border-color', theme.borderColor);
  addGroup(vars, 'background', theme.background, px);
  addGroup(vars, 'font', theme.typography?.fonts);
  addGroup(vars, 'weight', theme.typography?.weight);
  addGroup(vars, 'size', theme.typography?.size, px);
  addGroup(vars, 'input', theme.input, px);
  addGroup(vars, 'button', theme.button);
  addGroup(vars, 'boolean', theme.boolean);
  addGroup(vars, 'easing', theme.easing);
  addGroup(vars, 'app', {
    borderColor: theme.appBorderColor,
    borderRadius: px(theme.appBorderRadius),
  });
  addGroup(vars, 'bar', {
    textColor: theme.barTextColor,
    hoverColor: theme.barHoverColor,
    selectedColor: theme.barSelectedColor,
    bg: theme.barBg,
  });
  addGroup(vars, 'layout', { margin: px(theme.layoutMargin) });
  addGroup(vars, 'text', { mutedColor: theme.textMutedColor });

  // The syntax highlighter colours are CSS variables already.
  for (const [key, value] of Object.entries(theme.code ?? {})) {
    if (key.startsWith('--') && typeof value === 'string') {
      vars[key as `--${string}`] = value;
    }
  }

  return vars;
};

/** Writes CSS variables as declarations, for use in a style sheet rule. */
export const cssVarsToString = (vars: CssVars) =>
  Object.entries(vars)
    .map(([name, value]) => `${name}: ${value};`)
    .join('\n');
