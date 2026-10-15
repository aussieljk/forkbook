import type { CSSProperties, FunctionComponent } from 'react';
import React from 'react';

import { ResetWrapper } from 'storybook/internal/components';

import { clsx } from 'clsx';

import { blockBackground } from './BlockBackgroundStyles';
import styles from './ColorPalette.module.css';

type Colors = string[] | { [key: string]: string };

interface ColorItemProps {
  title: string;
  subtitle: string;
  colors: Colors;
}

function renderSwatch(color: string, index: number) {
  return (
    <div
      key={`${color}-${index}`}
      className={styles.swatch}
      title={color}
      style={{ '--swatch-background': color } as CSSProperties}
    />
  );
}

function renderSwatchLabel(color: string, index: number, colorDescription?: string) {
  return (
    <div key={`${color}-${index}`} className={styles.swatchLabel} title={color}>
      <div>
        {color}
        {colorDescription && <span>{colorDescription}</span>}
      </div>
    </div>
  );
}

function renderSwatchSpecimen(colors: Colors) {
  if (Array.isArray(colors)) {
    return (
      <div className={styles.swatchSpecimen}>
        <div className={clsx(blockBackground, styles.swatchColors)}>
          {colors.map((color, index) => renderSwatch(color, index))}
        </div>
        <div className={styles.swatchLabels}>
          {colors.map((color, index) => renderSwatchLabel(color, index))}
        </div>
      </div>
    );
  }

  const swatchElements = [];
  const labelElements = [];

  for (const colorKey in colors) {
    const colorValue = colors[colorKey];
    swatchElements.push(renderSwatch(colorValue, swatchElements.length));
    labelElements.push(renderSwatchLabel(colorKey, labelElements.length, colorValue));
  }

  return (
    <div className={styles.swatchSpecimen}>
      <div className={clsx(blockBackground, styles.swatchColors)}>{swatchElements}</div>
      <div className={styles.swatchLabels}>{labelElements}</div>
    </div>
  );
}

/**
 * A single color row your styleguide showing title, subtitle and one or more colors, used as a
 * child of `ColorPalette`.
 */
export const ColorItem: FunctionComponent<ColorItemProps> = ({ title, subtitle, colors }) => {
  return (
    <div className={styles.item}>
      <div className={styles.itemDescription}>
        <div className={styles.itemTitle}>{title}</div>
        <div className={styles.itemSubtitle}>{subtitle}</div>
      </div>
      <div className={styles.swatches}>{renderSwatchSpecimen(colors)}</div>
    </div>
  );
};

interface ColorPaletteProps {
  children?: React.ReactNode;
}

/**
 * Styleguide documentation for colors, including names, captions, and color swatches, all specified
 * as `ColorItem` children of this wrapper component.
 */
export const ColorPalette: FunctionComponent<ColorPaletteProps> = ({ children, ...props }) => (
  <ResetWrapper>
    <div {...props} className={clsx(styles.list, 'docblock-colorpalette sb-unstyled')}>
      <div className={styles.listHeading}>
        <div className={styles.listName}>Name</div>
        <div className={styles.listSwatches}>Swatches</div>
      </div>
      {children}
    </div>
  </ResetWrapper>
);
