import type { ComponentProps, FC } from 'react';
import React from 'react';

import { Button } from 'storybook/internal/components';

import { clsx } from 'clsx';

import { Brand } from './Brand.tsx';
import type { MenuList, SidebarMenuProps } from './Menu.tsx';
import { SidebarMenu } from './Menu.tsx';
import styles from './Heading.module.css';

export interface HeadingProps {
  menuHighlighted?: boolean;
  menu: MenuList;
  skipLinkHref?: string;
  isLoading: boolean;
  onMenuClick?: SidebarMenuProps['onClick'];
}

export const Heading: FC<HeadingProps & ComponentProps<'div'>> = ({
  menuHighlighted = false,
  menu,
  skipLinkHref,
  isLoading,
  onMenuClick,
  className,
  ...props
}) => {
  return (
    <div className={clsx(styles.headingWrapper, className)} {...props}>
      {skipLinkHref && (
        <Button className={styles.skipToCanvasLink} ariaLabel={false} asChild>
          <a href={skipLinkHref} tabIndex={0}>
            Skip to content
          </a>
        </Button>
      )}

      <div className={styles.brandArea}>
        <Brand />
      </div>

      <SidebarMenu menu={menu} isHighlighted={menuHighlighted} onClick={onMenuClick} />
    </div>
  );
};
