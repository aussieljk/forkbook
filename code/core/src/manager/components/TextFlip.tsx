import type { CSSProperties, ComponentProps } from 'react';
import React, { useRef, useState } from 'react';

import { clsx } from 'clsx';

import styles from './TextFlip.module.css';

export const TextFlip = ({
  text,
  duration = 250,
  placeholder,
  className,
  ...props
}: {
  text: string;
  duration?: number;
  placeholder?: string;
} & ComponentProps<'div'>) => {
  const textRef = useRef(text);
  const [staleValue, setStaleValue] = useState(text);

  const isAnimating = text !== staleValue;
  const reverse = isAnimating && numericCompare(staleValue, text);

  textRef.current = text;

  const style = { '--duration': `${duration}ms` } as CSSProperties;

  return (
    <div className={clsx(styles.container, className)} {...props}>
      {isAnimating && (
        <span
          aria-hidden
          className={styles.text}
          style={style}
          data-reverse={reverse || undefined}
          data-state="exiting"
          onAnimationEnd={() => setStaleValue(textRef.current)}
        >
          {staleValue}
        </span>
      )}
      <span
        className={styles.text}
        style={style}
        data-reverse={reverse || undefined}
        data-state={isAnimating ? 'entering' : undefined}
      >
        {text}
      </span>
      {placeholder && (
        <div className={styles.placeholder} aria-hidden>
          {placeholder}
        </div>
      )}
    </div>
  );
};

function numericCompare(a: string, b: string): boolean {
  const na = Number(a);
  const nb = Number(b);
  return Number.isNaN(na) || Number.isNaN(nb)
    ? a.localeCompare(b, undefined, { numeric: true }) > 0
    : na > nb;
}
