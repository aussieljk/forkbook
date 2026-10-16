import type { CSSProperties, FC, PropsWithChildren, ReactElement, ReactNode } from 'react';
import React, { Children, useCallback, useContext, useId, useMemo, useState } from 'react';

import { logger } from '@aussieljk/forkbook/internal/client-logger';
import type { ActionItem } from '@aussieljk/forkbook/internal/components';
import { Bar, Button, ToggleButton, Zoom } from '@aussieljk/forkbook/internal/components';

import { CopyIcon, MarkupIcon } from '@storybook/icons';

import { clsx } from 'clsx';

import type { SourceProps } from '.';
import { Source } from '.';
import { DocsContext } from '../blocks/DocsContext';
import { getStoryId } from '../blocks/Story';
import { blockBackground } from './BlockBackgroundStyles';
import { SnippetWarning } from './SnippetWarning';
import { StorySkeleton } from './Story';
import { Toolbar } from './Toolbar';
import { ZoomContext } from './ZoomContext';
import styles from './Preview.module.css';

export type PreviewProps = PropsWithChildren<{
  isLoading?: true;
  layout?: Layout;
  inline?: boolean;
  isColumn?: boolean;
  columns?: number;
  withSource?: SourceProps;
  isExpanded?: boolean;
  withToolbar?: boolean;
  className?: string;
  additionalActions?: ActionItem[];
  onReloadStory?: () => void;
}>;

export type Layout = 'padded' | 'fullscreen' | 'centered';

function getChildProps(children: ReactNode) {
  if (Children.count(children) === 1) {
    const elt = children as ReactElement;
    if (elt.props) {
      return elt.props;
    }
  }
  return null;
}

const COPIED_LABEL_ANIMATION_DURATION = 2000;

/**
 * A preview component for showing one or more component `Story` items. The preview also shows the
 * source for the component as a drop-down.
 */
export const Preview: FC<PreviewProps> = ({
  isLoading,
  isColumn,
  columns,
  children,
  withSource,
  withToolbar = false,
  isExpanded = false,
  additionalActions,
  className,
  layout = 'padded',
  inline = false,
  onReloadStory,
  ...props
}) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const [copied, setCopied] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const additionalActionItems = useMemo(
    () => (additionalActions ? [...additionalActions] : []),
    [additionalActions]
  );
  const sourceId = useId();

  const context = useContext(DocsContext);

  const copyToClipboard = useCallback(async (text: string) => {
    const { createCopyToClipboardFunction } =
      await import('@aussieljk/forkbook/internal/components');
    await createCopyToClipboardFunction()(text);
  }, []);

  const handleCopyCode = useCallback(async () => {
    try {
      await copyToClipboard(withSource?.code ?? '');
      setCopied('Copied!');
    } catch (err) {
      logger.error(err);
      setCopied('Copy error!');
    }

    globalThis.window.setTimeout(() => setCopied(null), COPIED_LABEL_ANIMATION_DURATION);
  }, [copyToClipboard, withSource?.code]);

  const childProps = getChildProps(children);

  const { warning: sourceWarning, ...sourceProps } = withSource ?? {};
  const hasSourceError = !!(withSource && withSource.error);
  const hasValidSource = !!(withSource && !withSource.error);
  const showsColumn = isColumn || !Array.isArray(children);

  return (
    <>
      <div
        {...props}
        data-with-toolbar={withToolbar || undefined}
        className={clsx(
          blockBackground,
          styles.previewContainer,
          className,
          'sbdocs sbdocs-preview fb-unstyled'
        )}
      >
        {withToolbar && (
          <Toolbar
            className={styles.positionedToolbar}
            isLoading={isLoading}
            border
            zoom={(z: number) => setScale(scale * z)}
            resetZoom={() => setScale(1)}
            storyId={!isLoading && childProps ? getStoryId(childProps, context) : undefined}
            onReloadStory={onReloadStory}
          />
        )}
        <ZoomContext.Provider value={{ scale }}>
          <div
            className={clsx(styles.childrenContainer, 'docs-story')}
            data-column={showsColumn || undefined}
            data-flex={(!showsColumn && !!columns) || undefined}
            data-layout={layout}
            data-inline={inline || undefined}
            data-columns={(columns && columns > 1) || undefined}
            style={
              columns && columns > 1
                ? ({ '--preview-columns': columns } as CSSProperties)
                : undefined
            }
          >
            <Zoom.Element centered={layout === 'centered'} scale={inline ? scale : 1}>
              {Array.isArray(children) ? (
                children.map((child, i) => <div key={i}>{child}</div>)
              ) : (
                <div>{children}</div>
              )}
            </Zoom.Element>
          </div>
        </ZoomContext.Provider>
        {hasValidSource && expanded && (
          <div id={sourceId}>
            <Source {...sourceProps} className={styles.source} dark copyable={false} />
          </div>
        )}
      </div>
      {(withSource || additionalActionItems.length > 0) && (
        <Bar
          className={clsx(styles.actionBar, 'sbdocs sbdocs-preview-actions')}
          innerStyle={{ paddingInline: 0 }}
        >
          {hasSourceError && (
            <Button
              lang="en"
              ariaLabel={false}
              disabled
              variant="ghost"
              className="docblock-code-toggle docblock-code-toggle--disabled"
            >
              <MarkupIcon /> No code available
            </Button>
          )}
          {hasValidSource && (
            <>
              <ToggleButton
                lang="en"
                ariaLabel={false}
                pressed={expanded}
                aria-expanded={expanded}
                aria-controls={sourceId}
                onClick={() => setExpanded(!expanded)}
                variant="ghost"
                className={`docblock-code-toggle${expanded ? ' docblock-code-toggle--expanded' : ''}`}
              >
                <MarkupIcon /> {expanded ? 'Hide code' : 'Show code'}
              </ToggleButton>
              <Button lang="en" ariaLabel={false} variant="ghost" onClick={handleCopyCode}>
                <CopyIcon /> {copied ?? 'Copy code'}
              </Button>
            </>
          )}
          {additionalActionItems.map(
            ({ title, ariaLabel, className, onClick, disabled }, index: number) => (
              <Button
                key={index}
                ariaLabel={ariaLabel ?? false}
                className={className}
                onClick={onClick}
                disabled={!!disabled}
                variant="ghost"
              >
                {title}
              </Button>
            )
          )}
          {hasValidSource && (
            <SnippetWarning className={styles.trailingSnippetWarning} warning={sourceWarning} />
          )}
        </Bar>
      )}
    </>
  );
};

export const PreviewSkeleton = () => (
  <Preview className={styles.skeleton} isLoading withToolbar>
    <StorySkeleton />
  </Preview>
);
