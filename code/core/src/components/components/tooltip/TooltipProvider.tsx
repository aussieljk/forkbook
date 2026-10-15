import type { DOMAttributes, ReactElement, ReactNode } from 'react';
import React, { useContext, useId, useState } from 'react';

import { deprecate } from 'storybook/internal/client-logger';

import { Tooltip } from '@base-ui/react/tooltip';

import {
  type PopperPlacement,
  PortalContainerContext,
  convertToBaseUiPlacement,
} from '../shared/overlayHelpers.tsx';
import { PortalTheme } from '../shared/PortalTheme.tsx';

export interface TooltipProviderProps {
  /** Tooltips trigger on hover and focus by default. To trigger on focus only, set this to `true`. */
  triggerOnFocusOnly?: boolean;

  /** Distance between the trigger and tooltip. Customize only if you have a good reason to. */
  offset?: number;

  /**
   * Placement of the tooltip. Start and End variants involve additional JS dimension calculations
   * and should be used sparingly. Left and Right get inverted in RTL.
   */
  placement?: PopperPlacement;

  /** Tooltip content */
  tooltip: ReactNode;

  /** Tooltip trigger, must be a single child that can receive focus and click/key events. */
  children: ReactElement<DOMAttributes<Element>, string>;

  /** Delay before showing the tooltip, defaults to 200ms. Always instant on focus. */
  delayShow?: number;

  /** Delay before hiding the tooltip, defaults to 400ms. */
  delayHide?: number;

  /** Uncontrolled state: whether the tooltip is visible by default. */
  defaultVisible?: boolean;

  /** Deprecated property - use defaultVisible instead. */
  startOpen?: boolean;

  /** Controlled state: whether the tooltip is visible. */
  visible?: boolean;

  /** Controlled state: fires when user interaction causes the tooltip to change visibility. */
  onVisibleChange?: (isVisible: boolean) => void;
}

const TooltipProvider = ({
  triggerOnFocusOnly = false,
  placement = 'top',
  offset = 8,
  tooltip,
  children,
  defaultVisible,
  startOpen,
  delayShow = 400,
  delayHide = 200,
  visible,
  onVisibleChange,
}: TooltipProviderProps) => {
  const portalContainer = useContext(PortalContainerContext);
  // Base UI needs the trigger ID to position a tooltip that is visible before any hover.
  const child = React.Children.only(children);
  const generatedId = useId();
  const triggerId = (child.props as { id?: string }).id ?? generatedId;

  if (startOpen !== undefined) {
    deprecate('The `startOpen` prop is deprecated. Please use `defaultVisible` instead.');
  }

  const [isOpen, setIsOpen] = useState(defaultVisible ?? startOpen ?? false);
  const onOpenChange = (open: boolean, { reason }: Tooltip.Root.ChangeEventDetails) => {
    if (open && triggerOnFocusOnly && reason === 'trigger-hover') {
      return;
    }
    setIsOpen(open);
    onVisibleChange?.(open);
  };

  return (
    <Tooltip.Root open={visible ?? isOpen} onOpenChange={onOpenChange} triggerId={triggerId}>
      <Tooltip.Trigger id={triggerId} delay={delayShow} closeDelay={delayHide} render={child} />
      <Tooltip.Portal container={portalContainer}>
        <PortalTheme>
          <Tooltip.Positioner
            {...convertToBaseUiPlacement(placement)}
            sideOffset={offset}
            style={{ zIndex: 100000 }}
          >
            <Tooltip.Popup role="tooltip" data-testid="tooltip" style={{ outline: 'none' }}>
              {tooltip}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </PortalTheme>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

export { TooltipProvider };
