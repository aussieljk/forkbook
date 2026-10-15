import type { FC } from 'react';
import React from 'react';

import { Link } from 'storybook/internal/components';

import { clsx } from 'clsx';

import styles from './SettingsFooter.module.css';

const SettingsFooter: FC<any> = ({ className, ...props }) => (
  <div className={clsx(styles.footer, className)} {...props}>
    <Link secondary href="https://storybook.js.org?ref=ui" cancel={false} target="_blank">
      Docs
    </Link>
    <Link secondary href="https://github.com/storybookjs/storybook" cancel={false} target="_blank">
      GitHub
    </Link>
    <Link
      secondary
      href="https://storybook.js.org/community?ref=ui#support"
      cancel={false}
      target="_blank"
    >
      Support
    </Link>
  </div>
);

export default SettingsFooter;
