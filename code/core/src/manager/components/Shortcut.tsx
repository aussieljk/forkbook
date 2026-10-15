import React from 'react';

import { shortcutToHumanString } from 'storybook/manager-api';

import styles from './Shortcut.module.css';

export const Shortcut = ({ keys }: { keys?: string[] }) => (
  <span className={styles.wrapper}>
    {(keys ?? []).map((key) => (
      <kbd className={styles.key} key={key}>
        {shortcutToHumanString([key])}
      </kbd>
    ))}
  </span>
);
