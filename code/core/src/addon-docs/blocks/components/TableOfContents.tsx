import type { FC, ReactElement } from 'react';
import React, { useEffect } from 'react';

import type { Channel } from '@aussieljk/forkbook/internal/channels';
import { NAVIGATE_URL } from '@aussieljk/forkbook/internal/core-events';

import { clsx } from 'clsx';
import tocbot from 'tocbot';

import styles from './TableOfContents.module.css';

// Define our own interface based on tocbot's actual options
interface TocbotOptions {
  tocSelector: string;
  contentSelector: string;
  headingSelector: string;
  ignoreSelector?: string;
  headingsOffset?: number;
  scrollSmoothOffset?: number;
  orderedList?: boolean;
  onClick?: (e: MouseEvent) => void;
  scrollEndCallback?: () => void;
  [key: string]: unknown;
}

export interface TocParameters {
  /** CSS selector for the container to search for headings. */
  contentsSelector?: string;

  /**
   * When true, hide the TOC. We still show the empty container (as opposed to showing nothing at
   * all) because it affects the page layout and we want to preserve the layout across pages.
   */
  disable?: boolean;

  /** CSS selector to match headings to list in the TOC. */
  headingSelector?: string;

  /** Headings that match the ignoreSelector will be skipped. */
  ignoreSelector?: string;

  /** Custom title ReactElement or string to display above the TOC. */
  title?: ReactElement | string | null;

  /**
   * TocBot options, not guaranteed to be available in future versions.
   *
   * @see tocbot docs {@link https://tscanlin.github.io/tocbot/#usage}
   */
  unsafeTocbotOptions?: Omit<TocbotOptions, 'onClick' | 'scrollEndCallback'>;
}

type TableOfContentsProps = React.PropsWithChildren<
  TocParameters & {
    className?: string;
    channel: Channel;
  }
>;

const Title: FC<{
  headingId: string;
  title: TableOfContentsProps['title'];
}> = ({ headingId, title }) => {
  // General case.
  if (typeof title === 'string' || !title) {
    return (
      <h2
        id={headingId}
        className={clsx(styles.heading, !title && 'fb-sr-only')}
        lang={title ? undefined : 'en'}
      >
        {title || 'Table of contents'}
      </h2>
    );
  }

  // Custom JSX title: we must ensure an ID is set for ARIA attributes to work.
  return <div id={headingId}>{title}</div>;
};

export const TableOfContents = ({
  title,
  disable,
  headingSelector,
  contentsSelector,
  ignoreSelector,
  unsafeTocbotOptions,
  channel,
  className,
}: TableOfContentsProps) => {
  useEffect(() => {
    // Do not initialize tocbot when we won't be rendering a ToC.
    if (disable) {
      return () => {};
    }

    const configuration = {
      tocSelector: '.toc-wrapper',
      contentSelector: contentsSelector ?? '.sbdocs-content',
      headingSelector: headingSelector ?? 'h3',
      /** Ignore headings that did not come from the main markdown code. */
      ignoreSelector: ignoreSelector ?? '.docs-story *, .skip-toc',
      headingsOffset: 40,
      scrollSmoothOffset: -40,
      orderedList: false,
      /** Prevent default linking behavior, leaving only the smooth scrolling. */
      onClick: (e: MouseEvent) => {
        e.preventDefault();
        if (e.currentTarget instanceof HTMLAnchorElement) {
          const [, headerId] = e.currentTarget.href.split('#');
          if (headerId) {
            channel.emit(NAVIGATE_URL, `#${headerId}`);
          }
        }
      },
      ...unsafeTocbotOptions,
    };

    /** Wait for the DOM to be ready. */
    const timeout = setTimeout(() => tocbot.init(configuration), 100);
    return () => {
      clearTimeout(timeout);
      tocbot.destroy();
    };
  }, [channel, disable, ignoreSelector, contentsSelector, headingSelector, unsafeTocbotOptions]);

  const headingId = 'table-of-contents';

  return (
    <aside className={clsx(styles.aside, className)}>
      {!disable ? (
        <nav className={styles.nav} aria-labelledby={headingId}>
          <Title headingId={headingId} title={title} />
          <div className="toc-wrapper" />
        </nav>
      ) : null}
    </aside>
  );
};
