import React from 'react';

import styles from './ClipboardCode.module.css';

interface ClipboardCodeProps {
  code: string;
}

export const ClipboardCode = ({ code, ...props }: ClipboardCodeProps) => (
  <pre className={styles.code} id="clipboard-code" {...props}>
    {code}
  </pre>
);
