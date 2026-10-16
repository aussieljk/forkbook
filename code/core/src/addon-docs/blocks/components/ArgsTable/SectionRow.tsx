import type { FC } from 'react';
import React, { useState } from 'react';

import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react';

import styles from './SectionRow.module.css';

type Level = 'section' | 'subsection';

export interface SectionRowProps {
  children?: React.ReactNode;
  label: string;
  level: Level;
  initialExpanded?: boolean;
  colSpan: number;
}

export const SectionRow: FC<SectionRowProps> = ({
  level = 'section',
  label,
  children,
  initialExpanded = true,
  colSpan = 3,
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const levelClassName = level === 'subsection' ? styles.subsection : styles.section;
  // @ts-expect-error (Converted from ts-ignore)
  const itemCount = children?.length || 0;
  const caption = level === 'subsection' ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : '';

  const helperText = `${expanded ? 'Hide' : 'Show'} ${
    level === 'subsection' ? itemCount : label
  } item${itemCount !== 1 ? 's' : ''}`;

  return (
    <>
      <tr className={styles.row} title={helperText}>
        <td className={levelClassName} colSpan={1}>
          <button
            className={styles.clickIntercept}
            onClick={(e) => setExpanded(!expanded)}
            tabIndex={0}
          >
            {helperText}
          </button>
          <span className={styles.flexWrapper}>
            {expanded ? (
              <CaretDownIcon className={styles.expanderIcon} />
            ) : (
              <CaretRightIcon className={styles.expanderIcon} />
            )}
            {label}
          </span>
        </td>
        <td className={styles.cell} colSpan={colSpan - 1}>
          <button
            className={styles.clickIntercept}
            onClick={(e) => setExpanded(!expanded)}
            tabIndex={-1}
            style={{ outline: 'none' }}
          >
            {helperText}
          </button>
          {expanded ? null : caption}
        </td>
      </tr>
      {expanded ? children : null}
    </>
  );
};
