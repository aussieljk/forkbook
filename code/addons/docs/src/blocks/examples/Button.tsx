import React from 'react';

import styles from './Button.module.css';

interface ButtonProps {
  /** Is this the principal call to action on the page? */
  primary?: boolean;
  /** What background color to use */
  backgroundColor?: string;
  /** How large should the button be? */
  size?: 'small' | 'medium' | 'large';
  /** Button contents */
  label: string;
  /** Optional click handler */
  onClick?: () => void;
}

/**
 * ## Example button component
 *
 * Comes in three sizes: `small`, `medium`, and `large`.
 *
 * Can be primary or secondary.
 *
 * _ This descriptions is written as a comment above the component_
 */
export const Button = ({
  primary = false,
  size = 'medium',
  backgroundColor,
  label,
  ...props
}: ButtonProps) => (
  <button
    type="button"
    className={styles.button}
    data-size={size}
    data-primary={primary || undefined}
    style={backgroundColor ? { backgroundColor } : undefined}
    {...props}
  >
    {label}
  </button>
);
