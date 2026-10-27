import React, { type FC, type ReactNode } from 'react';

import { Badge, Button } from '@aussieljk/forkbook/internal/components';

import { ChevronLeftIcon, ChevronRightIcon, WandSparklesIcon } from 'lucide-react';

import {
  buildReviewChangesSummaryHref,
  buildReviewStoryHref,
  type ReviewNavEntry,
} from '../review-navigation.ts';
import { useReviewContext } from '../review-context.ts';
import { AttentionBanner } from './AttentionBanner.tsx';
import { ReviewCollectionPicker } from './ReviewCollectionPicker.tsx';
import { ReviewHeader } from './ReviewHeader.tsx';
import styles from './ReviewToolbarHeader.module.css';

// Links to a review story when the target exists, or renders a disabled control
// at the ends of the sequence so prev/next stop at the boundaries (no wrap).
const NavButton: FC<{ entry: ReviewNavEntry | null; ariaLabel: string; icon: ReactNode }> = ({
  entry,
  ariaLabel,
  icon,
}) =>
  entry ? (
    <Button variant="ghost" size="small" padding="small" ariaLabel={ariaLabel} asChild>
      <a href={buildReviewStoryHref(entry)}>{icon}</a>
    </Button>
  ) : (
    <Button variant="ghost" size="small" padding="small" ariaLabel={ariaLabel} disabled>
      {icon}
    </Button>
  );

const componentName = (componentTitle: string): string =>
  componentTitle
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .pop() ?? componentTitle;

export const ReviewToolbarHeader: FC = () => {
  const {
    review,
    banner,
    storyInfo,
    flattenedEntries,
    newlyAddedStoryIds,
    activeEntry,
    activeIndex,
  } = useReviewContext();

  if (!review || !activeEntry || activeIndex < 0) {
    return null;
  }

  const collection = review.collections[activeEntry.collectionIndex];
  const collectionTitle = collection?.title ?? 'Review';
  const totalStories = flattenedEntries.length;
  // Prev/next are disabled (not wrapping) at the ends of the flattened sequence.
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < totalStories - 1;
  const previousEntry = hasPrevious ? flattenedEntries[activeIndex - 1] : null;
  const nextEntry = hasNext ? flattenedEntries[activeIndex + 1] : null;
  const progress = totalStories > 1 ? activeIndex / (totalStories - 1) : 0;
  const currentStoryInfo = storyInfo[activeEntry.storyId];
  const isNewlyAdded = newlyAddedStoryIds.has(activeEntry.storyId);

  const metadataSubtitle =
    currentStoryInfo?.title && currentStoryInfo.name ? (
      <>
        <span className={styles.subtitleStrong}>{componentName(currentStoryInfo.title)}</span>
        <span className={styles.subtitleText}>/</span>
        <span className={styles.subtitleText}>{currentStoryInfo.name}</span>
      </>
    ) : null;

  const subtitle =
    metadataSubtitle || isNewlyAdded ? (
      <>
        {metadataSubtitle}
        {isNewlyAdded ? <Badge status="positive">New</Badge> : null}
      </>
    ) : undefined;

  return (
    <div className={styles.root} data-testid="review-toolbar-header">
      {banner && <AttentionBanner {...banner} />}
      <div className={styles.headerWrap}>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-label="Review progress"
          aria-valuenow={activeIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalStories}
          data-testid="review-progress"
        >
          <div
            className={styles.progressFill}
            data-testid="review-progress-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <ReviewHeader
          variant="toolbar"
          leading={
            <Button variant="ghost" size="small" padding="small" ariaLabel="Back to review" asChild>
              <a href={buildReviewChangesSummaryHref()}>
                <ChevronLeftIcon />
                <WandSparklesIcon />
              </a>
            </Button>
          }
          title={collectionTitle}
          subtitle={subtitle}
          actions={
            <>
              <ReviewCollectionPicker
                entries={flattenedEntries}
                activeEntry={activeEntry}
                storyInfo={storyInfo}
              >
                <span className={styles.counter}>
                  {activeIndex + 1}/{totalStories}
                </span>
              </ReviewCollectionPicker>
              <NavButton
                entry={previousEntry}
                ariaLabel="Previous story"
                icon={<ChevronLeftIcon />}
              />
              <NavButton entry={nextEntry} ariaLabel="Next story" icon={<ChevronRightIcon />} />
            </>
          }
        />
      </div>
    </div>
  );
};
