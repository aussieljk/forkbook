import type { FC } from 'react';
import React, { useEffect, useRef } from 'react';

import { ActionList, Button, Link, ScrollArea } from '@aussieljk/forkbook/internal/components';

import { ArrowLeftIcon, GithubIcon, ShareAltIcon, StorybookIcon } from '@storybook/icons';

import { useTransitionState } from 'react-transition-state';

import { MOBILE_TRANSITION_DURATION } from '../../../constants.ts';
import { useFocusTrap } from '../../../hooks/useFocusTrap.ts';
import { useLayout } from '../../layout/LayoutProvider.tsx';
import { UpgradeBlock } from '../../upgrade/UpgradeBlock.tsx';
import styles from './MobileAbout.module.css';

export const MobileAbout: FC = () => {
  const { isMobileAboutOpen, setMobileAboutOpen } = useLayout();
  const aboutRef = useRef<HTMLDivElement>(null);

  const [state, toggle] = useTransitionState({
    timeout: MOBILE_TRANSITION_DURATION,
    mountOnEnter: true,
    unmountOnExit: true,
  });

  // Update transition state when isMobileAboutOpen changes
  useEffect(() => {
    toggle(isMobileAboutOpen);
  }, [isMobileAboutOpen, toggle]);

  // The overlay covers the menu drawer's content but stays inside its focus trap, so without a
  // trap of its own, Tab would keep cycling through the obscured menu underneath.
  useFocusTrap(aboutRef, state.isMounted);

  if (!state.isMounted) {
    return null;
  }

  return (
    <div
      className={styles.container}
      ref={aboutRef}
      data-status={state.status}
      style={{ animationDuration: `${MOBILE_TRANSITION_DURATION}ms` }}
    >
      <ScrollArea vertical offset={3} scrollbarSize={6}>
        <div className={styles.innerArea}>
          <Button
            className={styles.closeButton}
            onClick={() => setMobileAboutOpen(false)}
            ariaLabel="Close about section"
            tooltip="Close about section"
            variant="ghost"
          >
            <ArrowLeftIcon />
            Back
          </Button>
          <ActionList className={styles.linkList}>
            <ActionList.Item>
              <ActionList.Link
                ariaLabel={false}
                href="https://github.com/aussieljk/forkbook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ActionList.Icon>
                  <GithubIcon />
                </ActionList.Icon>
                <ActionList.Text>
                  <span>GitHub</span>
                </ActionList.Text>
                <ActionList.Icon>
                  <ShareAltIcon />
                </ActionList.Icon>
              </ActionList.Link>
            </ActionList.Item>
            <ActionList.Item>
              <ActionList.Link
                ariaLabel={false}
                href="https://forkbook.ljk.dev/docs/get-started/install"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ActionList.Icon>
                  <StorybookIcon />
                </ActionList.Icon>
                <ActionList.Text>
                  <span>Documentation</span>
                </ActionList.Text>
                <ActionList.Icon>
                  <ShareAltIcon />
                </ActionList.Icon>
              </ActionList.Link>
            </ActionList.Item>
          </ActionList>
          <UpgradeBlock />
          <div className={styles.bottomText}>
            Open source software maintained by{' '}
            <Link href="https://chromatic.com" target="_blank" rel="noopener noreferrer">
              Chromatic
            </Link>{' '}
            and the{' '}
            <Link
              href="https://github.com/aussieljk/forkbook/graphs/contributors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Forkbook Community
            </Link>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
