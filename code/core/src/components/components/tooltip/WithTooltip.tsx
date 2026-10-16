import type { FC, HTMLAttributes, ReactNode } from 'react';
import React, { useCallback, useContext, useEffect, useId, useState } from 'react';

import { deprecate } from '@aussieljk/forkbook/internal/client-logger';

import { global } from '../../../shared/global.ts';

import { Popover as BasePopover } from '@base-ui/react/popover';
import type { Color } from '@aussieljk/forkbook/theming';

import { PortalContainerContext } from '../shared/overlayHelpers.tsx';
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

type TriggerType = 'click' | 'double-click' | 'right-click' | 'hover' | 'focus';

export interface WithTooltipPureProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  svg?: boolean;
  withArrows?: boolean;
  hasChrome?: boolean;
  tooltip: ReactNode | ((p: WithHideFn) => ReactNode);
  children: ReactNode;
  onDoubleClick?: () => void;
  /** The interaction that shows the tooltip. `null` shows it only through `visible`. */
  trigger?: TriggerType | TriggerType[] | null;
  placement?: string;
  /** `[along the trigger, away from the trigger]`, in pixels. */
  offset?: [number, number];
  strategy?: 'absolute' | 'fixed';
  delayShow?: number;
  delayHide?: number;
  defaultVisible?: boolean;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  interactive?: boolean;
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

/** Base UI takes a side and an alignment. Popper's `auto` placements become `top`. */
const toSideAndAlign = (placement: string) => {
  const [side, align = 'center'] = placement.split('-');
  return {
    side: (side === 'auto' ? 'top' : side) as 'top' | 'bottom' | 'left' | 'right',
    align: align as 'start' | 'center' | 'end',
  };
};

// Pure, does not bind to the body
const WithTooltipPure = ({
  svg = false,
  trigger = 'click',
  closeOnOutsideClick = false,
  placement = 'top',
  hasChrome = true,
  defaultVisible = false,
  withArrows,
  offset = [0, 8],
  tooltip,
  children,
  delayHide = trigger === 'hover' ? 200 : 0,
  visible,
  interactive: _interactive,
  delayShow = trigger === 'hover' ? 400 : 0,
  strategy,
  onVisibleChange,
  portalContainer,
  ...props
}: WithTooltipPureProps) => {
  const Container = svg ? 'g' : 'div';
  const triggers = trigger === null ? [] : Array.isArray(trigger) ? trigger : [trigger];
  const isHover = triggers.includes('hover');
  const isClick = triggers.includes('click');
  const isFocus = triggers.includes('focus');
  const triggerId = useId();

  const [shown, setShown] = useState(defaultVisible);
  const isVisible = visible ?? shown;
  const setVisible = useCallback(
    (next: boolean) => {
      setShown(next);
      onVisibleChange?.(next);
    },
    [onVisibleChange]
  );

  // Base UI opens and closes for more reasons than the props allow. Keep only the allowed ones.
  const onOpenChange = useCallback(
    (open: boolean, { reason }: { reason: string }) => {
      if (
        (reason === 'trigger-press' && !isClick) ||
        (reason === 'trigger-hover' && !isHover) ||
        (reason === 'trigger-focus' && !isFocus) ||
        (reason === 'outside-press' && !closeOnOutsideClick)
      ) {
        return;
      }
      setVisible(open);
    },
    [isClick, isHover, isFocus, closeOnOutsideClick, setVisible]
  );

  const contextContainer = useContext(PortalContainerContext);
  const portalTarget =
    (typeof portalContainer === 'string'
      ? document.querySelector(portalContainer)
      : portalContainer) ||
    contextContainer ||
    document.body;

  return (
    <BasePopover.Root open={isVisible} onOpenChange={onOpenChange} triggerId={triggerId}>
      <BasePopover.Trigger
        id={triggerId}
        nativeButton={false}
        openOnHover={isHover}
        delay={delayShow}
        closeDelay={delayHide}
        render={
          <Container
            className={svg ? styles.targetSvg : styles.target}
            data-hover={isHover || undefined}
            {...(props as any)}
          />
        }
      >
        {children}
      </BasePopover.Trigger>
      <BasePopover.Portal container={portalTarget as HTMLElement}>
        <PortalTheme>
          <BasePopover.Positioner
            {...toSideAndAlign(placement)}
            sideOffset={offset[1]}
            alignOffset={offset[0]}
            collisionPadding={8}
            arrowPadding={8}
            positionMethod={strategy}
            style={{ zIndex: 2147483647 }}
          >
            <BasePopover.Popup
              initialFocus={false}
              finalFocus={false}
              render={<Tooltip hasChrome={hasChrome} />}
            >
              {hasChrome && withArrows && (
                <BasePopover.Arrow render={<div className={styles.arrow} />} />
              )}
              {typeof tooltip === 'function'
                ? tooltip({ onHide: () => setVisible(false) })
                : tooltip}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </PortalTheme>
      </BasePopover.Portal>
    </BasePopover.Root>
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
