import type { FC, HTMLAttributes, ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import { deprecate } from '@aussieljk/forkbook/internal/client-logger';

import { global } from '@storybook/global';

import type { PopperOptions, Config as ReactPopperTooltipConfig } from 'react-popper-tooltip';
import { usePopperTooltip } from 'react-popper-tooltip';
import type { Color } from '@aussieljk/forkbook/theming';

import { PortalTheme } from '../shared/PortalTheme.tsx';
import styles from './WithTooltip.module.css';

const { document } = global;

export interface ArrowProps {
  color: keyof Color;
  placement: string;
}

export interface WrapperProps {
  color: keyof Color | undefined;
  hidden?: boolean;
  hasChrome: boolean;
}

export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  children?: React.ReactNode;
  tooltipRef?: any;
  hasChrome?: boolean;
  arrowProps?: any;
  placement?: string;
  color?: keyof Color;
  withArrows?: boolean;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      placement = 'top',
      hasChrome = true,
      children,
      arrowProps = {},
      tooltipRef,
      color,
      withArrows,
      hidden,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <div
        data-testid="tooltip"
        ref={ref}
        hidden={hidden}
        {...props}
        className={[styles.wrapper, className].filter(Boolean).join(' ')}
        style={{ display: hidden ? 'none' : undefined, ...style }}
        data-chrome={hasChrome || undefined}
        data-color={color}
      >
        {hasChrome && withArrows && (
          <div
            className={styles.arrow}
            data-side={placement.split('-')[0]}
            {...arrowProps}
            data-color={color}
          />
        )}
        {children}
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';

interface WithHideFn {
  onHide: () => void;
}

export interface WithTooltipPureProps
  extends
    Omit<ReactPopperTooltipConfig, 'closeOnOutsideClick'>,
    Omit<HTMLAttributes<HTMLElement>, 'children'>,
    PopperOptions {
  svg?: boolean;
  withArrows?: boolean;
  hasChrome?: boolean;
  tooltip: ReactNode | ((p: WithHideFn) => ReactNode);
  children: ReactNode;
  onDoubleClick?: () => void;
  /**
   * If `true`, a click outside the trigger element closes the tooltip
   *
   * @default false
   */
  closeOnOutsideClick?: boolean;
  /**
   * Optional container to portal the tooltip into. Can be a CSS selector string or a DOM Element.
   * Falls back to document.body.
   */
  portalContainer?: Element | string | null;
}

// Pure, does not bind to the body
const WithTooltipPure = ({
  svg = false,
  trigger = 'click',
  closeOnOutsideClick = false,
  placement = 'top',
  modifiers = [
    {
      name: 'preventOverflow',
      options: {
        padding: 8,
      },
    },
    {
      name: 'offset',
      options: {
        offset: [8, 8],
      },
    },
    {
      name: 'arrow',
      options: {
        padding: 8,
      },
    },
  ],
  hasChrome = true,
  defaultVisible = false,
  withArrows,
  offset,
  tooltip,
  children,
  closeOnTriggerHidden,
  mutationObserverOptions,
  delayHide = trigger === 'hover' ? 200 : 0,
  visible,
  interactive,
  delayShow = trigger === 'hover' ? 400 : 0,
  strategy,
  followCursor,
  onVisibleChange,
  portalContainer,
  ...props
}: WithTooltipPureProps) => {
  const Container = svg ? 'g' : 'div';
  const isHover = trigger === 'hover' || (Array.isArray(trigger) && trigger.includes('hover'));
  const {
    getArrowProps,
    getTooltipProps,
    setTooltipRef,
    setTriggerRef,
    visible: isVisible,
    state,
  } = usePopperTooltip(
    {
      trigger,
      placement,
      defaultVisible,
      delayHide,
      interactive,
      closeOnOutsideClick,
      closeOnTriggerHidden,
      onVisibleChange,
      delayShow,
      followCursor,
      mutationObserverOptions,
      visible,
      offset,
    },
    {
      modifiers,
      strategy,
    }
  );

  const portalTarget: Element =
    (typeof portalContainer === 'string'
      ? document.querySelector(portalContainer)
      : portalContainer) || document.body;

  const tooltipComponent = isVisible ? (
    <Tooltip
      placement={state?.placement}
      ref={setTooltipRef}
      hasChrome={hasChrome}
      arrowProps={getArrowProps()}
      withArrows={withArrows}
      {...getTooltipProps()}
    >
      {/* @ts-expect-error (non strict) */}
      {typeof tooltip === 'function' ? tooltip({ onHide: () => onVisibleChange(false) }) : tooltip}
    </Tooltip>
  ) : null;

  return (
    <>
      <Container
        className={svg ? styles.targetSvg : styles.target}
        data-hover={isHover || undefined}
        ref={setTriggerRef as any}
        {...(props as any)}
      >
        {children}
      </Container>
      {isVisible &&
        ReactDOM.createPortal(<PortalTheme>{tooltipComponent}</PortalTheme>, portalTarget)}
    </>
  );
};

export interface WithTooltipStateProps extends Omit<WithTooltipPureProps, 'onVisibleChange'> {
  startOpen?: boolean;
  onVisibleChange?: (visible: boolean) => void | boolean;
}

const WithToolTipState = ({
  startOpen = false,
  onVisibleChange: onChange,
  ...rest
}: WithTooltipStateProps) => {
  const [tooltipShown, setTooltipShown] = useState(startOpen);
  const onVisibilityChange = useCallback(
    (visibility: boolean) => {
      if (onChange && onChange(visibility) === false) {
        return;
      }
      setTooltipShown(visibility);
    },
    [onChange]
  );

  useEffect(() => {
    const hide = () => onVisibilityChange(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hide();
      }
    };
    document.addEventListener('keydown', handleKeyDown, false);

    // Find all iframes on the screen and bind to clicks inside them (waiting until the iframe is ready)
    const iframes: HTMLIFrameElement[] = Array.from(document.getElementsByTagName('iframe'));
    const unbinders: (() => void)[] = [];
    iframes.forEach((iframe) => {
      const bind = () => {
        try {
          // @ts-expect-error (non strict)
          if (iframe.contentWindow.document) {
            // @ts-expect-error (non strict)
            iframe.contentWindow.document.addEventListener('click', hide);
            unbinders.push(() => {
              try {
                // @ts-expect-error (non strict)
                iframe.contentWindow.document.removeEventListener('click', hide);
              } catch (e) {
                // logger.debug('Removing a click listener from iframe failed: ', e);
              }
            });
          }
        } catch (e) {
          // logger.debug('Adding a click listener to iframe failed: ', e);
        }
      };

      bind(); // I don't know how to find out if it's already loaded so I potentially will bind twice
      iframe.addEventListener('load', bind);
      unbinders.push(() => {
        iframe.removeEventListener('load', bind);
      });
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unbinders.forEach((unbind) => {
        unbind();
      });
    };
  });

  return <WithTooltipPure {...rest} visible={tooltipShown} onVisibleChange={onVisibilityChange} />;
};

const DeprecatedPure: FC<WithTooltipPureProps> = (props: WithTooltipPureProps) => {
  deprecate(
    'WithTooltipPure is deprecated and will be removed in Forkbook 11. Please use WithTooltip instead.'
  );
  return <WithTooltipPure data-deprecated="WithTooltipPure" {...props} />;
};

const DeprecatedState: FC<WithTooltipStateProps> = (props: WithTooltipStateProps) => {
  deprecate(
    'WithToolTipState is deprecated and will be removed in Forkbook 11. Please use WithTooltip instead.'
  );
  return <WithToolTipState data-deprecated="WithToolTipState" {...props} />;
};

export {
  DeprecatedPure as WithTooltipPure,
  DeprecatedState as WithToolTipState,
  WithToolTipState as WithTooltip,
};
