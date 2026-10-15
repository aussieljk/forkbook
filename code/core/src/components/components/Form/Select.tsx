import React, { type SelectHTMLAttributes } from 'react';

import { clsx } from 'clsx';

import { isTestEnvironment } from '../../../preview-api/modules/preview-web/render/animation-utils.ts';
import { type Alignments, type Sizes, type ValidationStates, sizeClassName } from './styles.ts';
import styles from './Select.module.css';

type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
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
};
export const Select = ({
  children,
  size,
  align,
  valid,
  height,
  className,
  ...props
}: SelectProps) => {
  return (
    <select {...props} className={clsx(sizeClassName, styles.select, className)} data-size={size}>
      {/* TODO Remove condition when this issue is resolved: https://github.com/facebook/react/issues/33609 */}
      {!isTestEnvironment() && (
        <button>
          {/* @ts-expect-error Not yet supported */}
          <selectedcontent></selectedcontent>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6"></path>
          </svg>
        </button>
      )}
      <optgroup>{children}</optgroup>
    </select>
  );
};
