import type { ComponentPropsWithoutRef, ElementType, ReactElement, ReactNode } from 'react';
import React, { forwardRef, useEffect, useMemo, useState } from 'react';

import { deprecate } from '@aussieljk/forkbook/internal/client-logger';

import { useRender } from '@base-ui/react/use-render';
import { clsx } from 'clsx';
import {
  shortcutToAriaKeyshortcuts,
  type API_KeyCollection,
} from '@aussieljk/forkbook/manager-api';
import type { PopperPlacement } from '../shared/overlayHelpers.tsx';

import { InteractiveTooltipWrapper } from './helpers/InteractiveTooltipWrapper.tsx';
import { useAriaDescription } from './helpers/useAriaDescription.tsx';
import styles from './Button.module.css';

/** Renders its only child with the props given to it, so a Button can style a link (`asChild`). */
const Slot = forwardRef<HTMLElement, { children?: ReactNode }>(({ children, ...props }, ref) =>
  useRender({ render: children as ReactElement, props, ref })
);
Slot.displayName = 'Slot';

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  as?: ElementType;
  asChild?: boolean;

  size?: 'small' | 'medium';
  padding?: 'small' | 'medium' | 'none';
  appearance?: 'default' | 'agentic';
  variant?: 'outline' | 'solid' | 'ghost';
  /** @deprecated Use specialized components like `ToggleButton` or `Select` instead. */
  active?: boolean;
  readOnly?: boolean;
  /** An animation for the icon, played on click. */
  animation?: 'none' | 'rotate360' | 'glow' | 'jiggle';

  /**
   * A concise action label for the button announced by screen readers. Needed for buttons without
   * text or with text that relies on visual cues to be understood. Pass false to indicate that the
   * Button's content is already accessible to all. When a string is passed, it is also used as the
   * default tooltip text.
   */
  ariaLabel?: string | false;

  /**
   * An optional tooltip to display when the Button is hovered. If the Button has no text content,
   * consider making this the same as the aria-label.
   */
  tooltip?: string;

  /**
   * The preferred placement of the tooltip.
   */
  tooltipPlacement?: PopperPlacement;

  /**
   * Only use this flag when tooltips on button interfere with other keyboard interactions, like
   * when building a custom select or menu button. Disables tooltips from the `tooltip`, `shortcut`
   * and `ariaLabel` props.
   */
  disableAllTooltips?: boolean;

  /**
   * A more thorough description of what the Button does, provided to non-sighted users through an
   * aria-describedby attribute. Use sparingly for buttons that trigger complex actions.
   */
  ariaDescription?: string;

  /**
   * An optional keyboard shortcut to enable the button. Will be displayed in the tooltip and passed
   * to aria-keyshortcuts for assistive technologies. The binding of the shortcut and action is
   * managed globally in the manager's shortcuts module.
   */
  shortcut?: API_KeyCollection;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      as = 'button',
      asChild = false,
      animation = 'none',
      size = 'small',
      appearance = 'default',
      variant = 'outline',
      padding = 'medium',
      disabled = false,
      readOnly = false,
      active,
      onClick,
      ariaLabel,
      ariaDescription = undefined,
      tooltip = undefined,
      tooltipPlacement = 'top',
      shortcut = undefined,
      disableAllTooltips = false,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : as;

    let deprecated = undefined;
    if (!readOnly && (ariaLabel === undefined || ariaLabel === '')) {
      deprecated = 'ariaLabel';
      deprecate(
        `The 'ariaLabel' prop on 'Button' will become mandatory in Forkbook 11. Buttons with text content should set 'ariaLabel={false}' to indicate that they are accessible as-is. Buttons without text content must provide a meaningful 'ariaLabel' for accessibility. The button content is: ${props.children}.`
      );

      // TODO in Forkbook 11
      // throw new Error(
      //   'Button requires an ARIA label to be accessible. Please provide a valid ariaLabel prop.'
      // );
    }

    if (active !== undefined) {
      deprecated = 'active';
      deprecate(
        'The `active` prop on `Button` is deprecated and will be removed in Forkbook 11. Use specialized components like `ToggleButton` or `Select` instead.'
      );
    }

    const { ariaDescriptionAttrs, AriaDescription } = useAriaDescription(ariaDescription);

    const shortcutAttribute = useMemo(() => {
      return shortcut ? shortcutToAriaKeyshortcuts(shortcut) : undefined;
    }, [shortcut]);

    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick: ButtonProps['onClick'] = (event) => {
      if (onClick) {
        onClick(event);
      }

      if (animation === 'none') {
        return;
      }
      setIsAnimating(true);
    };

    useEffect(() => {
      // Only arm the timer while animating: an unconditional timeout costs one timer per
      // mounted Button, which adds up fast (the sidebar mounts one per visible tree row).
      if (!isAnimating) {
        return undefined;
      }
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }, [isAnimating]);

    const finalTooltip = tooltip || (ariaLabel !== false ? ariaLabel : undefined);

    return (
      <>
        <InteractiveTooltipWrapper
          disableAllTooltips={disableAllTooltips}
          shortcut={shortcut}
          tooltip={finalTooltip}
          tooltipPlacement={tooltipPlacement}
        >
          <Comp
            data-deprecated={deprecated}
            ref={ref}
            className={clsx(styles.button, className)}
            data-appearance={appearance}
            data-variant={variant}
            data-size={size}
            data-padding={padding}
            data-disabled={disabled || readOnly || undefined}
            data-readonly={readOnly || undefined}
            data-active={active || undefined}
            data-animating={isAnimating && animation !== 'none' ? animation : undefined}
            aria-disabled={disabled || readOnly ? 'true' : undefined}
            onClick={disabled || readOnly ? undefined : handleClick}
            aria-label={!readOnly && ariaLabel !== false ? ariaLabel : undefined}
            aria-keyshortcuts={readOnly ? undefined : shortcutAttribute}
            {...(readOnly ? {} : ariaDescriptionAttrs)}
            {...props}
          />
        </InteractiveTooltipWrapper>
        <AriaDescription />
      </>
    );
  }
);

Button.displayName = 'Button';

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  deprecate('`IconButton` is deprecated and will be removed in Forkbook 11, use `Button` instead.');

  return <Button ref={ref} {...props} data-deprecated="IconButton" />;
});
IconButton.displayName = 'IconButton';
