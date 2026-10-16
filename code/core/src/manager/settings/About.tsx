import type { FC } from 'react';
import React from 'react';

import { Button, Link, StorybookLogo } from '@aussieljk/forkbook/internal/components';

import { DocumentIcon, GithubIcon } from '@storybook/icons';

import { UpgradeBlock } from '../components/upgrade/UpgradeBlock.tsx';
import styles from './About.module.css';

const AboutScreen: FC<{ onNavigateToWhatsNew?: () => void }> = ({ onNavigateToWhatsNew }) => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <StorybookLogo alt="Forkbook" />
      </header>
      <UpgradeBlock onNavigateToWhatsNew={onNavigateToWhatsNew} />
      <div className={styles.footer}>
        <div className={styles.actions}>
          <Button ariaLabel={false} asChild>
            <a href="https://github.com/aussieljk/forkbook">
              <GithubIcon />
              GitHub
            </a>
          </Button>
          <Button ariaLabel={false} asChild>
            <a href="https://forkbook.ljk.dev/docs">
              <DocumentIcon style={{ display: 'inline', marginRight: 5 }} />
              Documentation
            </a>
          </Button>
        </div>
        <div>
          Open source software maintained by{' '}
          <Link className={styles.link} href="https://www.chromatic.com/">
            Chromatic
          </Link>{' '}
          and the{' '}
          <Link
            className={styles.link}
            href="https://github.com/aussieljk/forkbook/graphs/contributors"
          >
            Forkbook Community
          </Link>
        </div>
      </div>
    </div>
  );
};

export { AboutScreen };
