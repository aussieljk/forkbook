import type { ComponentProps, FC } from 'react';
import React, { useState } from 'react';

import {
  ActionList,
  Button,
  PopoverProvider,
  ToggleButton,
} from '@aussieljk/forkbook/internal/components';

import { SettingsIcon, XIcon } from 'lucide-react';

import { clsx } from 'clsx';
import { useStorybookApi } from '@aussieljk/forkbook/manager-api';

import type { useMenu } from '../../container/Menu.tsx';
import { useLayout } from '../layout/LayoutProvider.tsx';
import styles from './Menu.module.css';

export type MenuList = ReturnType<typeof useMenu>;

interface SidebarButtonStyleProps {
  highlighted: boolean;
  isMobile: boolean;
}

/** Props that style a menu button: a dot when highlighted, a bigger size on mobile. */
const sidebarButtonProps = (
  { highlighted, isMobile }: SidebarButtonStyleProps,
  className: string | undefined
) => ({
  className: clsx(styles.sidebarButton, className),
  'data-highlighted': highlighted || undefined,
  'data-mobile': isMobile || undefined,
});

export const SidebarButton = ({
  highlighted,
  isMobile,
  className,
  ...props
}: ComponentProps<typeof Button> & SidebarButtonStyleProps) => (
  <Button {...sidebarButtonProps({ highlighted, isMobile }, className)} {...props} />
);

export const SidebarToggleButton = ({
  highlighted,
  isMobile,
  className,
  ...props
}: ComponentProps<typeof ToggleButton> & SidebarButtonStyleProps) => (
  <ToggleButton {...sidebarButtonProps({ highlighted, isMobile }, className)} {...props} />
);

const SidebarMenuList: FC<{
  menu: MenuList;
  onHide: () => void;
}> = ({ menu, onHide }) => (
  <div className={styles.container}>
    {menu
      .filter((links) => links.length)
      .flatMap((links) => (
        <ActionList key={links.map((link) => link.id).join('_')}>
          {links.map((link) => {
            const linkContent = (
              <>
                {(link.icon || link.input) && (
                  <ActionList.Icon>{link.icon || link.input}</ActionList.Icon>
                )}
                {(link.title || link.center) && (
                  <ActionList.Text>{link.title || link.center}</ActionList.Text>
                )}
                {link.right}
              </>
            );

            return (
              <ActionList.Item key={link.id} active={link.active}>
                <ActionList.Action
                  asChild={!!link.href}
                  ariaLabel={false}
                  id={`list-item-${link.id}`}
                  disabled={link.disabled}
                  onClick={(e) => {
                    // Prevent interaction with disabled links
                    if (link.disabled) {
                      e.preventDefault();
                      return;
                    }
                    // Prevent browser navigation for internal links, where we'll use our
                    // router API instead, but want to show an `href` for UX/SEO purposes.
                    if (link.href && link.internal) {
                      e.preventDefault();
                    }
                    link.onClick?.(e, {
                      id: link.id,
                      active: link.active,
                      disabled: link.disabled,
                      title: link.title,
                      href: link.href,
                    });
                    if (link.closeOnClick) {
                      onHide();
                    }
                  }}
                >
                  {link.href ? (
                    <a
                      href={link.href}
                      target={link.internal ? undefined : '_blank'}
                      rel={link.internal ? 'canonical' : 'noreferrer'}
                    >
                      {linkContent}
                    </a>
                  ) : (
                    linkContent
                  )}
                </ActionList.Action>
              </ActionList.Item>
            );
          })}
        </ActionList>
      ))}
  </div>
);

export interface SidebarMenuProps {
  menu: MenuList;
  isHighlighted?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export const SidebarMenu: FC<SidebarMenuProps> = ({ menu, isHighlighted, onClick }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const { isMobile } = useLayout();
  const api = useStorybookApi();

  if (isMobile) {
    return (
      <div className={styles.menuButtonGroup}>
        <SidebarButton
          padding="small"
          variant="ghost"
          ariaLabel="About Forkbook"
          highlighted={!!isHighlighted}
          onClick={(e) => {
            onClick?.(e);
            e.preventDefault();
          }}
          isMobile={true}
          asChild
        >
          <a href="./settings/about" rel="canonical">
            <SettingsIcon />
          </a>
        </SidebarButton>
        <SidebarButton
          padding="small"
          variant="ghost"
          ariaLabel="Close menu"
          highlighted={false}
          onClick={() => api.setMobileNavigation(false)}
          isMobile={true}
        >
          <XIcon />
        </SidebarButton>
      </div>
    );
  }

  return (
    <PopoverProvider
      ariaLabel="Forkbook menu"
      placement={'bottom-start'}
      padding={0}
      popover={({ onHide }) => <SidebarMenuList onHide={onHide} menu={menu} />}
      onVisibleChange={setIsTooltipVisible}
    >
      <SidebarToggleButton
        ariaLabel="Settings"
        pressed={isTooltipVisible}
        highlighted={!!isHighlighted}
        padding="small"
        variant="ghost"
        size="medium"
        isMobile={false}
      >
        <SettingsIcon />
      </SidebarToggleButton>
    </PopoverProvider>
  );
};
