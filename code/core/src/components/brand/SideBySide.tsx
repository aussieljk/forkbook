import type { ReactNode } from 'react';
import React from 'react';

import styles from './SideBySide.module.css';

export const SideBySide = ({ children }: { children?: ReactNode }) => (
  <div className={styles.sideBySide}>{children}</div>
);
