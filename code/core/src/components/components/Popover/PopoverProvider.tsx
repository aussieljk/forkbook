import type { DOMAttributes, ReactElement, ReactNode } from 'react';
import React, { useCallback, useContext, useId, useState } from 'react';

import { deprecate } from 'storybook/internal/client-logger';

import { Popover as BasePopover } from '@base-ui/react/popover';

import {
  type PopperPlacement,
  PortalContainerContext,
  convertToBaseUiPlacement,
} from '../shared/overlayHelpers.tsx';
import { Popover } from './Popover.tsx';

export interface PopoverProviderProps {
  /**
   * An accessible label for the popover dialog, announced by screen readers. This prop will become
   * mandatory in Storybook 11. Provide a concise description of the popover's purpose.
   */
  ariaLabel?: string;

  /** Whether to display the Popover in a prestyled container. True by default. */
  hasChrome?: boolean;

  /**
   * Whether to display a close button in the top right corner of the popover overlay. Can overlap
   * with overlay content, make sure to test your use case. False by default.
   */
  hasCloseButton?: boolean;

  /** Optional custom label for the close button, if there is one. */
  closeLabel?: string;

  /** Optional custom padding for the popover overlay. */
  padding?: number | string;

  /** Distance between the trigger and Popover. Customize only if you have a good reason to. */
  offset?: number;

  /**
   * Placement of the Popover. Start and End variants involve additional JS dimension calculations
   * and should be used sparingly. Left and Right get inverted in RTL.
   */
  placement?: PopperPlacement;

  /**
   * Popover content. Pass a function to receive a onHide callback to collect to your close button,
   * or if you want to wait for the popover to be opened to call your content component.
   */
  popover: ReactNode | ((props: { onHide: () => void }) => ReactNode);

  /** Popover trigger, must be a single child with click/press events. Must forward refs. */
  children: ReactElement<DOMAttributes<Element>, string>;

  /** Uncontrolled state: whether the Popover is initially visible. */
  defaultVisible?: boolean;

  /** Controlled state: whether the Popover is visible. */
  visible?: boolean;

  /** Controlled state: fires when user interaction causes the Popover to change visibility. */
  onVisibleChange?: (isVisible: boolean) => void;
}

export const PopoverProvider = ({
  ariaLabel,
  placement = 'bottom-start',
  hasChrome = true,
  hasCloseButton = false,
  closeLabel,
  offset = 8,
  padding,
  popover,
  children,
  defaultVisible,
  visible,
  onVisibleChange,
}: PopoverProviderProps) => {
  if (!ariaLabel) {
    deprecate(
      "The 'ariaLabel' prop on 'PopoverProvider' will become mandatory in Storybook 11. Provide a concise, accessible label describing the popover's purpose."
    );
  }

  const portalContainer = useContext(PortalContainerContext);
  // Base UI needs the trigger ID to position a popover that is open before any click.
  const generatedId = useId();
  const triggerId = (children.props as { id?: string }).id ?? generatedId;

  const [isOpen, setIsOpen] = useState(defaultVisible ?? false);
  const onOpenChange = useCallback(
    (isOpen: boolean) => {
      setIsOpen(isOpen);
      onVisibleChange?.(isOpen);
    },
    [onVisibleChange]
  );
  const onHide = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <BasePopover.Root open={visible ?? isOpen} onOpenChange={onOpenChange} triggerId={triggerId}>
      <BasePopover.Trigger id={triggerId} render={children} />
      <BasePopover.Portal container={portalContainer}>
        <BasePopover.Positioner
          {...convertToBaseUiPlacement(placement)}
          sideOffset={offset}
          style={{ zIndex: 100000 }}
        >
          <BasePopover.Popup aria-label={ariaLabel} style={{ outline: 'none' }}>
            <Popover
              hasChrome={hasChrome}
              hideLabel={closeLabel}
              onHide={hasCloseButton ? onHide : undefined}
              padding={padding}
            >
              {typeof popover === 'function' ? popover({ onHide }) : popover}
            </Popover>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
};
