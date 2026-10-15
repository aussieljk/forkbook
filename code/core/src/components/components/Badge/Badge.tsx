import React from 'react';

import styles from './Badge.module.css';

export interface BadgeProps {
  compact?: boolean;
  status?: 'positive' | 'negative' | 'neutral' | 'warning' | 'critical' | 'active';
  children?: React.ReactNode;
}

export const Badge = ({ compact, status, children }: BadgeProps) => (
  <div className={styles.badge} data-compact={compact || undefined} data-status={status}>
    {children}
  </div>
);
