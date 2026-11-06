import React from 'react';

import type { StoryIndexFileError } from '@aussieljk/forkbook/internal/types';

import styles from './IndexFileErrors.module.css';

/** Lists the story files that failed to index. The stories of the other files still show. */
export const IndexFileErrors = ({ errors }: { errors?: StoryIndexFileError[] }) => {
  if (!errors?.length) {
    return null;
  }
  return (
    <div className={styles.container} role="alert" data-testid="index-file-errors">
      <div className={styles.heading}>
        {errors.length === 1
          ? '1 story file failed to load'
          : `${errors.length} story files failed to load`}
      </div>
      <ul className={styles.list}>
        {errors.map((error) => (
          <li key={error.importPaths.join(',')} className={styles.item}>
            <code className={styles.path}>{error.importPaths.join(', ')}</code>
            <pre className={styles.message}>{error.message}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
};
