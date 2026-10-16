import type { FC } from 'react';
import React from 'react';

import { Link } from '@aussieljk/forkbook/internal/components';

import { clsx } from 'clsx';

import styles from './SettingsFooter.module.css';

const SettingsFooter: FC<any> = ({ className, ...props }) => (
  <div className={clsx(styles.footer, className)} {...props}>
    <Link secondary href="https://forkbook.ljk.dev" cancel={false} target="_blank">
      Docs
    </Link>
    <Link secondary href="https://github.com/aussieljk/forkbook" cancel={false} target="_blank">
      GitHub
    </Link>
    <Link
      secondary
      href="https://forkbook.ljk.dev/community#support"
      cancel={false}
      target="_blank"
    >
      Support
    </Link>
  </div>
);

export default SettingsFooter;
