import type { FocusEvent } from 'react';

import type { ArgType } from '../components/ArgsTable/types.ts';

export interface ControlProps<T> {
  name: string;
  storyId?: string;
  controlsId?: string;
  value?: T;
  defaultValue?: T;
  argType?: ArgType;
  /** Whether the underlying arg is required; surfaced as `aria-required` on the control's input. */
  required?: boolean;
  onChange: (value?: T) => T | void;
  onFocus?: (evt: FocusEvent<HTMLElement>) => void;
  onBlur?: (evt: FocusEvent<HTMLElement>) => void;
}

export type BooleanValue = boolean;
export interface BooleanConfig {}

export type ColorValue = string;
export type PresetColor = ColorValue | { color: ColorValue; title?: string };
export interface ColorConfig {
  presetColors?: PresetColor[];
  /**
   * Maximum number of preset colors shown in the color picker. When the number of presets exceeds
   * this value, the oldest presets are removed first (most-recently-used order). Set to `Infinity`
   * or `0` to disable the limit and show all presets.
   *
   * @default 27
   */
  maxPresetColors?: number;
  /**
   * Whether the color picker should be open by default when rendered.
   *
   * @default false
   */
  startOpen?: boolean;
}

export type DateValue = Date | number;
export interface DateConfig {}

export type NumberValue = number;
export interface NumberConfig {
  min?: number;
  max?: number;
  step?: number;
}

export type RangeConfig = NumberConfig;

export type ObjectValue = unknown;
export interface ObjectConfig {}

export type OptionsSingleSelection = unknown;
export type OptionsMultiSelection = unknown[];
export type OptionsSelection = OptionsSingleSelection | OptionsMultiSelection;
export type OptionsArray = readonly unknown[];
export type OptionsObject = Record<string, unknown>;
export type Options = OptionsArray | OptionsObject;
export type OptionsControlType =
  | 'radio'
  | 'inline-radio'
  | 'check'
  | 'inline-check'
  | 'select'
  | 'multi-select';

export interface OptionsConfig {
  /** Some docgen tools give an array here. The controls then show each option as it is. */
  labels?: Record<PropertyKey, string | undefined> | string[];
  type: OptionsControlType;
}

export interface NormalizedOptionsConfig {
  options: OptionsObject;
}

export type TextValue = string;
export interface TextConfig {
  maxLength?: number;
}

export type ControlType =
  | 'array'
  | 'boolean'
  | 'color'
  | 'date'
  | 'number'
  | 'range'
  | 'object'
  | OptionsControlType
  | 'text';

export type Control =
  | BooleanConfig
  | ColorConfig
  | DateConfig
  | NumberConfig
  | ObjectConfig
  | OptionsConfig
  | RangeConfig
  | TextConfig;
