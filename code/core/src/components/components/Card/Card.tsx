import React, {
  forwardRef,
  type ComponentProps,
  type CSSProperties,
  type DOMAttributes,
} from 'react';

import { clsx } from 'clsx';
import type { StorybookTheme } from '@aussieljk/forkbook/theming';

import styles from './Card.module.css';

type ThemeColor = keyof StorybookTheme['color'] | keyof StorybookTheme['fgColor'];

const kebab = (key: string) => key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

// A ThemeColor may live in any of theme.color / fgColor / bgColor / borderColor, which don't share
// a key space. So each lookup is a chain of CSS variables, `var(--a, var(--b))`. When no variable
// exists, the CSS property falls back to inherit/default.
const varChain = (names: (string | false | undefined)[], fallback = '') =>
  names.reduceRight<string>(
    (inner, name) => (name ? `var(${name}${inner ? `, ${inner}` : ''})` : inner),
    fallback
  ) || undefined;

const colorVars = (color?: ThemeColor) => ({
  '--card-color':
    color && varChain([`--fb-fg-color-${kebab(color)}`, `--fb-color-${kebab(color)}`]),
  '--card-background': varChain(
    [color && `--fb-bg-color-${kebab(color)}`],
    'var(--fb-background-content)'
  ),
});

interface CardContentProps extends ComponentProps<'div'> {
  color?: ThemeColor;
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(function CardContent(
  { color, className, style, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={clsx(styles.content, className)}
      style={{ ...colorVars(color), ...style } as CSSProperties}
      {...props}
    />
  );
});

interface CardOutlineProps extends ComponentProps<'div'> {
  animation?: 'none' | 'rainbow' | 'spin';
  color?: ThemeColor;
  outlineColor?: ThemeColor;
}

const CardOutline = forwardRef<HTMLDivElement, CardOutlineProps>(function CardOutline(
  { animation = 'none', color, outlineColor = color, className, style, ...props },
  ref
) {
  // The outline only takes the theme colour when it has no animation.
  const borderColor =
    animation === 'none'
      ? varChain([
          color && `--fb-border-color-${kebab(color)}`,
          outlineColor && `--fb-color-${kebab(outlineColor)}`,
        ])
      : undefined;

  return (
    <div
      ref={ref}
      className={clsx(styles.outline, className)}
      data-animation={animation}
      data-outline-color={outlineColor}
      style={{ ...colorVars(color), '--card-border-color': borderColor, ...style } as CSSProperties}
      {...props}
    />
  );
});

interface CardProps extends CardContentProps {
  outlineAnimation?: 'none' | 'rainbow' | 'spin';
  outlineColor?: ThemeColor;
  outlineAttrs?: DOMAttributes<HTMLDivElement>;
}

export const Card = Object.assign(
  forwardRef<HTMLDivElement, CardProps>(function Card(
    { outlineAnimation = 'none', color, outlineColor, outlineAttrs = {}, ...props },
    ref
  ) {
    return (
      <CardOutline
        animation={outlineAnimation}
        color={color}
        outlineColor={outlineColor}
        ref={ref}
        {...outlineAttrs}
      >
        <CardContent color={color} {...props} />
      </CardOutline>
    );
  }),
  {
    Content: CardContent,
    Outline: CardOutline,
  }
);
