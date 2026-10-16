import type { CSSProperties } from 'react';
import React from 'react';

import { LightningSlashIcon } from '@phosphor-icons/react';

import styles from './Loader.module.css';

interface Progress {
  value: number;
  message: string;
  modules?: {
    complete: number;
    total: number;
  };
}

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  progress?: Progress;
  error?: Error;
  size?: number;
}

export const Loader = ({ progress, error, size = 32, ...props }: LoaderProps) => {
  if (error) {
    return (
      <div
        className={styles.progressWrapper}
        aria-label={error.toString()}
        aria-live="polite"
        role="status"
        {...props}
      >
        <LightningSlashIcon className={styles.errorIcon} />
        <div className={styles.progressMessage}>{error.message}</div>
      </div>
    );
  }

  if (progress) {
    const { value, modules } = progress;
    let { message } = progress;

    if (modules) {
      message += ` ${modules.complete} / ${modules.total} modules`;
    }
    return (
      <div
        className={styles.progressWrapper}
        aria-label="Content is loading..."
        aria-live="polite"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value * 100}
        aria-valuetext={message}
        role="progressbar"
        {...props}
      >
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${value * 100}%` }} />
        </div>
        <div className={styles.progressMessage}>
          {message}
          {value < 1 && <span className={styles.ellipsis} key={message} />}
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.loader}
      aria-label="Content is loading..."
      aria-live="polite"
      role="status"
      {...props}
      style={{ '--loader-size': `${size}px`, ...props.style } as CSSProperties}
    />
  );
};
