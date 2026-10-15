import type { ComponentProps } from 'react';
import React from 'react';

import type { IconType } from './icon.tsx';
import { Icons, icons } from './icon.tsx';
import styles from './icon.stories.module.css';

const Header = ({ children }: { children: React.ReactNode }) => (
  <h2 className={styles.header}>{children}</h2>
);

const List = ({ children }: { children: React.ReactNode }) => (
  <ul className={styles.list}>{children}</ul>
);

const Item = ({ minimal, children }: { minimal?: boolean; children: React.ReactNode }) => (
  <li className={styles.item} data-minimal={minimal || undefined}>
    {children}
  </li>
);

export default {
  title: 'Icons (deprecated)',
  component: Icons,
  argTypes: {
    color: { control: 'color' },
  },
};

export const Basic = (args: ComponentProps<typeof Icons>) => <Icons {...args} />;
Basic.args = { icon: 'watch' };

export const Labels = (args: ComponentProps<typeof Icons>) => (
  <>
    <Header>{Object.keys(icons).length} icons</Header>
    <List>
      {Object.keys(icons).map((key) => (
        <Item key={key}>
          {/* @ts-expect-error (not strict) */}
          <Icons icon={key as IconType} aria-hidden {...args} />
          <div className={styles.meta}>{key}</div>
        </Item>
      ))}
    </List>
  </>
);

export const NoLabels = (args: ComponentProps<typeof Icons>) => (
  <>
    <Header>{Object.keys(icons).length} icons</Header>
    <List>
      {Object.keys(icons).map((key) => (
        <Item minimal key={key}>
          {/* @ts-expect-error (not strict) */}
          <Icons icon={key as IconType} aria-label={key} {...args} />
        </Item>
      ))}
    </List>
  </>
);

export const NoDeprecateWarning = (args: ComponentProps<typeof Icons>) => (
  <>
    <Header>{Object.keys(icons).length} icons</Header>
    <List>
      {Object.keys(icons).map((key) => (
        <Item minimal key={key}>
          {/* @ts-expect-error (not strict) */}
          <Icons icon={key as IconType} aria-label={key} __suppressDeprecationWarning {...args} />
        </Item>
      ))}
    </List>
  </>
);
