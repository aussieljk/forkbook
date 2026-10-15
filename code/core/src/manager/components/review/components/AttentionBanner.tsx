import React, { type FC, useRef } from 'react';

import { Button, Link, PopoverProvider } from 'storybook/internal/components';

import { CheckIcon, CopyIcon, TransferIcon } from '@storybook/icons';
import { useLandmark } from '../../../hooks/useLandmark.ts';
import { CopyButton } from './CopyButton.tsx';
import styles from './AttentionBanner.module.css';

const STALE_REFRESH_PROMPT =
  'Generate a fresh review including my latest changes using the review-create tool.';

export type AttentionBannerKind = 'stale' | 'pending-update';

export type AttentionBannerProps =
  | { kind: 'stale' }
  | { kind: 'pending-update'; onAccept: () => void };

/**
 * Attention bar at the top of review screens. Stale warns that source files
 * changed after the review was created; pending-update offers a newer push.
 */
export const AttentionBanner: FC<AttentionBannerProps> = (props) => {
  const { kind } = props;
  const regionRef = useRef<HTMLDivElement>(null);
  const { landmarkProps } = useLandmark(
    { role: 'region', 'aria-label': 'Review status' },
    regionRef
  );

  if (kind === 'pending-update') {
    const { onAccept } = props;
    return (
      <div className={styles.region} ref={regionRef} {...landmarkProps}>
        <div className={styles.bar} role="status" aria-live="polite">
          <span>A new review is available.</span>
          <Button variant="solid" padding="small" onClick={onAccept}>
            Update
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.region} ref={regionRef} {...landmarkProps}>
      <div className={styles.bar} role="status" aria-live="polite">
        <span>
          Code changes detected. This review may be stale.{' '}
          <PopoverProvider
            ariaLabel="Prompt to refresh stale review"
            placement="bottom"
            padding={0}
            popover={
              <div className={styles.popoverContent}>
                <div className={styles.message}>
                  <div className={styles.title}>Prompt for your agent to refresh this review:</div>
                  <p className={styles.prompt}>{STALE_REFRESH_PROMPT}</p>
                  <CopyButton
                    appearance="agentic"
                    padding="small"
                    ariaLabel="Copy prompt to refresh this review"
                    ariaLabelOnCopy="Prompt copied to clipboard"
                    content={STALE_REFRESH_PROMPT}
                    childrenOnCopy={
                      <>
                        <CheckIcon /> Copy prompt
                      </>
                    }
                  >
                    <CopyIcon />
                    Copy prompt
                  </CopyButton>
                </div>
              </div>
            }
          >
            <Link>
              <strong>Ask your agent to refresh it.</strong>
            </Link>
          </PopoverProvider>
        </span>
      </div>
    </div>
  );
};
