import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';

import {
  Button,
  Card,
  Collapsible,
  DocumentWrapper,
  ForkbookIcon,
  IconButton,
  ScrollArea,
  ToggleButton,
} from '@aussieljk/forkbook/internal/components';

import { clsx } from 'clsx';

import {
  CaretDownIcon,
  CaretLeftIcon,
  CheckIcon,
  CopyIcon,
  MagicWandIcon,
  XIcon,
} from '@phosphor-icons/react';

import { useLandmark } from '../../../hooks/useLandmark.ts';
import { AttentionBanner } from '../components/AttentionBanner.tsx';
import { CollectionGrid } from '../components/CollectionGrid.tsx';
import { CopyButton } from '../components/CopyButton.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { ReviewHeader } from '../components/ReviewHeader.tsx';
import type { ReviewBanner } from '../review-context.ts';
import {
  REVIEW_SUMMARY_BACK_ATTR,
  buildReviewStoryHref,
  buildSummaryBackHref,
} from '../review-navigation.ts';
import type { ReviewState } from '../review-state.ts';
import type { StoryInfo } from '../review-types.ts';
import styles from './SummaryScreen.module.css';

const SummaryLandmark: FC<{ children: ReactNode }> = ({ children }) => {
  const asideRef = useRef<HTMLElement>(null);
  const { landmarkProps } = useLandmark(
    { role: 'complementary', 'aria-label': 'Summary' },
    asideRef
  );
  return (
    <aside ref={asideRef} {...landmarkProps}>
      {children}
    </aside>
  );
};

const CollectionLandmark: FC<{ titleId: string; children: ReactNode }> = ({
  titleId,
  children,
}) => {
  const regionRef = useRef<HTMLElement>(null);
  const { landmarkProps } = useLandmark({ role: 'region', 'aria-labelledby': titleId }, regionRef);
  return (
    <section ref={regionRef} {...landmarkProps}>
      {children}
    </section>
  );
};

const FooterLandmark: FC<{ children: ReactNode }> = ({ children }) => {
  const footerRef = useRef<HTMLElement>(null);
  const { landmarkProps } = useLandmark(
    { role: 'contentinfo', 'aria-label': 'About this review' },
    footerRef
  );
  return (
    <footer className={styles.footer} ref={footerRef} {...landmarkProps}>
      {children}
    </footer>
  );
};

const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

const formatCreatedAgo = (createdAt: number, nowMs: number): string => {
  const elapsedMs = Math.max(0, nowMs - createdAt);
  if (elapsedMs < 60_000) {
    return 'just now';
  }
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }
  return `${Math.floor(elapsedMinutes / 60)}h ago`;
};

export interface SummaryScreenProps {
  state: ReviewState | null;
  /** Story id → component title + name, resolved from the Forkbook index. */
  storyInfo?: Record<string, StoryInfo>;
  /** Builds the (frozen) preview iframe src for a story thumbnail. */
  getStoryPreviewHref: (storyId: string) => string;
  /** Attention banner to render at the top (pending-update or stale). */
  banner?: ReviewBanner;
  /** Keep summary preview iframes mounted while the overlay is hidden. */
  summaryHidden?: boolean;
  /** Clears the active review (if any) and returns to the pre-review canvas. */
  onDismiss: () => void;
  /** Pre-review canvas search, or root when none is recorded yet. */
  returnSearch?: string | null;
}

export const SummaryScreen: FC<SummaryScreenProps> = ({
  state,
  storyInfo = {},
  getStoryPreviewHref,
  banner = null,
  summaryHidden = false,
  onDismiss,
  returnSearch = null,
}) => {
  const [expandedCollections, setExpandedCollections] = useState<Set<number>>(() => new Set());
  const [showAllCollections, setShowAllCollections] = useState<Set<number>>(() => new Set());
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, []);

  useLayoutEffect(() => {
    if (!state) {
      setExpandedCollections(new Set());
      setShowAllCollections(new Set());
      return;
    }
    setExpandedCollections(new Set(state.collections.map((_, index) => index)));
    setShowAllCollections(new Set());
  }, [state?.createdAt]);

  // Must be computed before the early return — hooks cannot be called conditionally.
  const newStoryCount = useMemo(
    () =>
      new Set(
        (state?.collections ?? [])
          .flatMap((c) => c.storyIds)
          .filter((id) => storyInfo[id]?.isNewlyAdded)
      ).size,
    [state, storyInfo]
  );

  const visibleCollections = useMemo(
    () =>
      (state?.collections ?? [])
        .map((collection, index) => {
          const storyIds = showNewOnly
            ? collection.storyIds.filter((id) => storyInfo[id]?.isNewlyAdded)
            : collection.storyIds;
          return { collection, index, storyIds };
        })
        .filter((entry) => entry.storyIds.length > 0),
    [state?.collections, showNewOnly, storyInfo]
  );

  if (!state) {
    return (
      <div className={styles.empty}>
        <span>Waiting for the agent to display a review…</span>
        <div>
          <CopyButton
            appearance="agentic"
            padding="small"
            ariaLabel="Copy prompt to refresh this review"
            ariaLabelOnCopy="Prompt copied to clipboard"
            content="Generate a Forkbook review including my latest changes using the review-create tool."
            childrenOnCopy={
              <>
                <CheckIcon /> Copy prompt
              </>
            }
          >
            <CopyIcon />
            Copy prompt
          </CopyButton>
          <Button padding="small" onClick={onDismiss} ariaLabel="Close review screen">
            <XIcon />
            Close
          </Button>
        </div>
      </div>
    );
  }

  const storyCount = new Set(state.collections.flatMap((collection) => collection.storyIds)).size;
  const createdAgo = state.createdAt ? formatCreatedAgo(state.createdAt, nowMs) : null;

  const toggleCollection = (index: number) => {
    setExpandedCollections((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };
  const markCollectionShowAll = (index: number) => {
    setShowAllCollections((previous) =>
      previous.has(index) ? previous : new Set(previous).add(index)
    );
  };

  return (
    <div className={styles.page}>
      {banner && <AttentionBanner {...banner} />}
      <ReviewHeader
        leading={
          <Button variant="ghost" size="small" padding="small" ariaLabel="Exit review" asChild>
            <a href={buildSummaryBackHref(returnSearch)} {...{ [REVIEW_SUMMARY_BACK_ATTR]: '' }}>
              <CaretLeftIcon />
              <ForkbookIcon width={14} height={14} aria-hidden="true" />
            </a>
          </Button>
        }
        title={state.title}
        subtitle={
          <>
            <span>Showing {pluralize(storyCount, 'story', 'stories')} for quick review</span>
            {createdAgo ? (
              <>
                <span>&bull;</span>
                <span>{createdAgo}</span>
              </>
            ) : null}
          </>
        }
        actions={
          newStoryCount > 0 ? (
            <ToggleButton
              variant="ghost"
              size="small"
              padding="small"
              ariaLabel={false}
              tooltip="Toggle filtering of new stories"
              pressed={showNewOnly}
              onClick={() => setShowNewOnly((v) => !v)}
            >
              {newStoryCount} new
            </ToggleButton>
          ) : null
        }
      />

      <div className={styles.listScroll}>
        <ScrollArea vertical>
          <main className={styles.main}>
            <SummaryLandmark>
              <Card className={styles.summaryCard} color="agentic">
                <MagicWandIcon />
                <DocumentWrapper className={clsx(styles.markdownWrapper, styles.summaryContent)}>
                  <h2 className={styles.summaryHeading}>Summary:</h2>{' '}
                  <Markdown>{state.description}</Markdown>
                </DocumentWrapper>
              </Card>
            </SummaryLandmark>
            {visibleCollections.length === 0 ? (
              <p className={styles.emptyMessage}>
                {showNewOnly ? 'No new stories found.' : 'No collections found.'}
              </p>
            ) : (
              visibleCollections.map(({ collection, index, storyIds }) => {
                const isExpanded = expandedCollections.has(index);
                const titleId = `review-collection-title-${index}`;
                return (
                  <CollectionLandmark key={`${collection.title}-${index}`} titleId={titleId}>
                    <Card>
                      <Collapsible
                        collapsed={!isExpanded}
                        summary={
                          <div className={styles.cardHead} onClick={() => toggleCollection(index)}>
                            <h2 className={styles.cardTitle} id={titleId}>
                              {collection.title}
                            </h2>
                            <div className={styles.cardControls}>
                              <span
                                className={styles.cardCount}
                                aria-label={pluralize(storyIds.length, 'story', 'stories')}
                              >
                                {storyIds.length}
                              </span>
                              <IconButton
                                variant="ghost"
                                size="small"
                                padding="small"
                                ariaLabel={
                                  isExpanded
                                    ? `Collapse collection ${collection.title}`
                                    : `Expand collection ${collection.title}`
                                }
                                aria-expanded={isExpanded}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleCollection(index);
                                }}
                              >
                                <CaretDownIcon
                                  className={styles.toggleChevronIcon}
                                  style={{ transform: `rotate(${isExpanded ? -180 : 0}deg)` }}
                                />
                              </IconButton>
                            </div>
                          </div>
                        }
                      >
                        {collection.rationale ? (
                          <DocumentWrapper
                            className={clsx(styles.markdownWrapper, styles.cardRationale)}
                          >
                            <Markdown>{collection.rationale}</Markdown>
                          </DocumentWrapper>
                        ) : null}
                        <CollectionGrid
                          storyIds={storyIds}
                          showAll={showAllCollections.has(index)}
                          onShowAll={() => markCollectionShowAll(index)}
                          storyInfo={storyInfo}
                          getStoryHref={(storyId) =>
                            buildReviewStoryHref({ collectionIndex: index, storyId })
                          }
                          getStoryPreviewHref={getStoryPreviewHref}
                          summaryHidden={summaryHidden}
                        />
                      </Collapsible>
                    </Card>
                  </CollectionLandmark>
                );
              })
            )}
          </main>
          <FooterLandmark>
            This review shows the {pluralize(storyCount, 'story', 'stories')} most relevant for you
            to spot-check right now. Because this is AI-curated, results may be inaccurate or
            incomplete.
          </FooterLandmark>
        </ScrollArea>
      </div>
    </div>
  );
};
