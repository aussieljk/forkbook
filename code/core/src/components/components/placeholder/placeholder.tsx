import React, { Children } from 'react';

import styles from './placeholder.module.css';

export interface PlaceholderProps {
  children?: React.ReactNode;
}

export const Placeholder = ({ children, ...props }: PlaceholderProps) => {
  const [title, desc] = Children.toArray(children);
  return (
    <div className={styles.message} {...props}>
      <div className={styles.title}>{title}</div>
      {desc && <div>{desc}</div>}
    </div>
  );
};
