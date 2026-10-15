import type { FC } from 'react';
import React from 'react';

import { Button, Link, TabList, TabPanel, useTabsState } from 'storybook/internal/components';

import { CheckIcon, CopyIcon } from '@storybook/icons';

import { useStorybookApi } from 'storybook/manager-api';

import { useCopyButton } from '../../../shared/useCopyButton.ts';
import styles from './UpgradeBlock.module.css';

interface UpgradeBlockProps {
  onNavigateToWhatsNew?: () => void;
}

const UpgradeSnippet: FC<{ command: string }> = ({ command }) => {
  const { children, buttonProps } = useCopyButton({
    children: <CopyIcon />,
    childrenOnCopy: <CheckIcon />,
    content: command,
    ariaLabel: 'Copy command',
    ariaLabelOnCopy: 'Command copied',
  });

  return (
    <pre className={styles.code}>
      {command}
      <Button variant="ghost" padding="small" size="small" {...buttonProps}>
        {children}
      </Button>
    </pre>
  );
};

export const UpgradeBlock: FC<UpgradeBlockProps> = ({ onNavigateToWhatsNew }) => {
  const api = useStorybookApi();
  const tabsState = useTabsState({
    defaultSelected: 'npm',
    tabs: [
      {
        id: 'npm',
        title: 'npm',
        children: <UpgradeSnippet command="npx storybook@latest upgrade" />,
      },
      {
        id: 'yarn',
        title: 'yarn',
        children: <UpgradeSnippet command="yarn dlx storybook@latest upgrade" />,
      },
      {
        id: 'pnpm',
        title: 'pnpm',
        children: <UpgradeSnippet command="pnpm dlx storybook@latest upgrade" />,
      },
    ],
  });

  return (
    <div className={styles.container}>
      <strong>You are on Storybook {api.getCurrentVersion().version}</strong>
      <p>Run the following script to check for updates and upgrade to the latest version.</p>
      <TabList state={tabsState} />
      <TabPanel state={tabsState} hasScrollbar={false} />
      {onNavigateToWhatsNew && (
        <Link onClick={onNavigateToWhatsNew}>See what's new in Storybook</Link>
      )}
    </div>
  );
};
