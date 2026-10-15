import type { ComponentProps, FC } from 'react';
import React from 'react';

import { withReset } from '@aussieljk/forkbook/internal/components';

import { clsx } from 'clsx';

import styles from './DocsPage.module.css';

export { Title } from './Title';

export const Subtitle = ({ className, ...props }: ComponentProps<'h2'>) => (
  <h2 className={clsx(withReset, styles.subtitle, className)} {...props} />
);

/** Styles the raw elements (headings, paragraphs, lists, tables, ...) of a docs page. */
export const DocsContent = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={clsx(styles.docsContent, className)} {...props} />
);

export const DocsWrapper = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={clsx(styles.docsWrapper, className)} {...props} />
);

interface DocsPageWrapperProps {
  children?: React.ReactNode;
  toc?: React.ReactNode;
  lang?: string;
}

export const DocsPageWrapper: FC<DocsPageWrapperProps> = ({ children, toc, lang = 'en' }) => (
  <DocsWrapper className="sbdocs sbdocs-wrapper">
    {toc}
    <DocsContent className="sbdocs sbdocs-content" lang={lang}>
      {children}
    </DocsContent>
  </DocsWrapper>
);
