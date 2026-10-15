import React from 'react';

import styles from './EmptyTabContent.module.css';

interface Props {
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
}

export const EmptyTabContent = ({ title, description, footer }: Props) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        {description && <div className={styles.description}>{description}</div>}
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};
