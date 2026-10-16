import React, { forwardRef } from 'react';

import { clsx } from 'clsx';
import TextareaAutoResize from 'react-textarea-autosize';

import {
  type Alignments,
  type Sizes,
  type ValidationStates,
  controlClassName,
  sizeClassName,
} from './styles.ts';
import styles from './Textarea.module.css';

/**
 * These types are copied from `react-textarea-autosize`. I copied them because of
 * https://github.com/storybookjs/storybook/issues/18734 Maybe there's some bug in `tsup` or
 * `react-textarea-autosize`?
 */
type TextareaPropsRaw = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
type Style = Omit<NonNullable<TextareaPropsRaw['style']>, 'maxHeight' | 'minHeight'> & {
  height?: number;
};
type TextareaHeightChangeMeta = {
  rowHeight: number;
};
export interface TextareaAutosizeProps extends Omit<TextareaPropsRaw, 'style'> {
  maxRows?: number;
  minRows?: number;
  onHeightChange?: (height: number, meta: TextareaHeightChangeMeta) => void;
  cacheMeasurements?: boolean;
  style?: Style;
}

type TextareaProps = Omit<
  TextareaAutosizeProps,
  keyof {
    size?: Sizes;
    align?: Alignments;
    valid?: ValidationStates;
    height?: number;
  }
> & {
  size?: Sizes;
  align?: Alignments;
  valid?: ValidationStates;
  height?: number;
} & React.RefAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<any, TextareaProps>(function Textarea(
  { size, valid, align, height = 400, className, style, ...props },
  ref
) {
  return (
    <TextareaAutoResize
      {...props}
      ref={ref}
      className={clsx(controlClassName, sizeClassName, styles.textarea, className)}
      data-size={size}
      data-align={align}
      data-valid={valid}
      style={{ ...style, '--fb-textarea-max-height': `${height}px` } as Style}
    />
  );
});
Textarea.displayName = 'Textarea';
