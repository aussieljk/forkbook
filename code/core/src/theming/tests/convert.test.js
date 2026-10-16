import { describe, expect, it } from 'vitest';

import { convert } from '../convert';
import { create } from '../create';
import darkThemeVars from '../themes/dark';
import lightThemeVars from '../themes/light';

describe('convert', () => {
  it('should return the default theme when no params', () => {
    const result = convert();

    expect(result.base).toEqual('light');
  });
  it('should return a valid dark theme', () => {
    const result = convert(darkThemeVars);

    expect(result.base).toEqual('dark');
    expect(result).toMatchObject({
      color: expect.objectContaining({
        ancillary: '#30B0C7',
        border: 'rgba(60, 60, 67, 0.18)',
        critical: '#FFFFFF',
        dark: '#636366',
        darker: '#48484A',
        darkest: '#1C1C1E',
        defaultText: '#F2F2F7',
        gold: '#FFCC00',
        green: '#34C759',
        inverseText: '#1C1C1E',
        light: '#E5E5EA',
        lighter: '#F2F2F7',
        lightest: '#FFFFFF',
        medium: '#D1D1D6',
        mediumdark: '#8E8E93',
        mediumlight: '#E5E5EA',
        negative: '#FF3B30',
        negativeText: '#D70015',
        orange: '#FF9500',
        positive: '#34C759',
        positiveText: '#248A3D',
        primary: '#0A84FF',
        purple: '#AF52DE',
        seafoam: '#32ADE6',
        secondary: '#0A84FF',
        tertiary: '#F2F2F7',
        ultraviolet: '#5856D6',
        warning: '#FF9500',
        warningText: '#C93400',
      }),
      background: expect.objectContaining({
        app: '#000000',
        bar: '#1C1C1E',
        content: '#1C1C1E',
        critical: '#D70015',
        gridCellSize: 10,
        hoverable: '#2C2C2E',
        negative: '#FFEBEA',
        positive: '#EAF9EE',
        preview: '#FFFFFF',
        warning: '#FFF4E5',
      }),
    });
  });
  it('should return a valid light theme', () => {
    const result = convert(lightThemeVars);

    expect(result.base).toEqual('light');
    expect(result).toMatchObject({
      color: expect.objectContaining({
        ancillary: '#30B0C7',
        border: 'rgba(60, 60, 67, 0.18)',
        critical: '#FFFFFF',
        dark: '#636366',
        darker: '#48484A',
        darkest: '#1C1C1E',
        defaultText: '#1C1C1E',
        gold: '#FFCC00',
        green: '#34C759',
        inverseText: '#FFFFFF',
        light: '#E5E5EA',
        lighter: '#F2F2F7',
        lightest: '#FFFFFF',
        medium: '#D1D1D6',
        mediumdark: '#8E8E93',
        mediumlight: '#E5E5EA',
        negative: '#FF3B30',
        negativeText: '#D70015',
        orange: '#FF9500',
        positive: '#34C759',
        positiveText: '#248A3D',
        primary: '#007AFF',
        purple: '#AF52DE',
        seafoam: '#32ADE6',
        secondary: '#007AFF',
        tertiary: '#F2F2F7',
        ultraviolet: '#5856D6',
        warning: '#FF9500',
        warningText: '#C93400',
      }),
      background: expect.objectContaining({
        app: '#F2F2F7',
        bar: '#FFFFFF',
        content: '#FFFFFF',
        critical: '#D70015',
        gridCellSize: 10,
        hoverable: '#E5E5EA',
        negative: '#FFEBEA',
        positive: '#EAF9EE',
        preview: '#FFFFFF',
        warning: '#FFF4E5',
      }),
    });
  });
  it('should map optional vars', () => {
    const customVars = create({
      base: 'light',
      brandTitle: 'my custom storybook',
      brandTarget: '_self',
      gridCellSize: 12,
    });

    const result = convert(customVars);
    expect(result.base).toEqual('light');
    expect(result).toMatchObject({
      background: expect.objectContaining({
        gridCellSize: 12,
      }),
      brand: expect.objectContaining({
        title: 'my custom storybook',
        target: '_self',
      }),
    });
  });
});
