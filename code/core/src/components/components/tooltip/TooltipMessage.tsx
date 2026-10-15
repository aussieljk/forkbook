import type { ReactNode } from 'react';
import React from 'react';

import { deprecate } from 'storybook/internal/client-logger';

import { Link } from '../typography/link/link.tsx';
import styles from './TooltipMessage.module.css';

export interface TooltipMessageProps {
  title?: ReactNode;
  desc?: ReactNode;
  links?: {
    title: string;
    href?: string;
    onClick?: () => void;
  }[];
}

export const TooltipMessage = ({ title, desc, links }: TooltipMessageProps) => {
  deprecate(
    '`TooltipMessage` is deprecated and will be removed in Storybook 11, use `Popover` and `PopoverProvider` instead.'
  );

  return (
    <div className={styles.messageWrapper} data-deprecated="TooltipMessage">
      <div className={styles.message}>
        {title && <div className={styles.title}>{title}</div>}
        {desc && <span>{desc}</span>}
      </div>
      {links && (
        <div className={styles.links}>
          {links.map(({ title: linkTitle, ...other }) => (
            <Link {...other} key={linkTitle}>
              {linkTitle}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
