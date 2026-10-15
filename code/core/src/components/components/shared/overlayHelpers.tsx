import React, {
  type ButtonHTMLAttributes,
  type ReactNode,
  createContext,
  forwardRef,
  useState,
} from 'react';

import type { DecoratorFunction } from '@aussieljk/forkbook/internal/csf';

export const POPPER_PLACEMENTS = [
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end',
] as const;

export type PopperPlacement = (typeof POPPER_PLACEMENTS)[number];

/** Converts a Popper.js placement to the `side` and `align` props of a Base UI positioner. */
export const convertToBaseUiPlacement = (placement: PopperPlacement) => {
  const [side, align = 'center'] = placement.split('-') as [
    'top' | 'bottom' | 'left' | 'right',
    'start' | 'center' | 'end' | undefined,
  ];
  return { side, align };
};

/**
 * The element that overlays (popovers, tooltips and modals) are portalled into. When it is
 * undefined, overlays go into the document body.
 */
export const PortalContainerContext = createContext<HTMLElement | undefined>(undefined);

// Story helper
interface TriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}
export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>((props, ref) => (
  <button
    {...props}
    ref={ref}
    style={{
      width: 120,
      height: 50,
      margin: 10,
    }}
  />
));
Trigger.displayName = 'Trigger';

/**
 * Forkbook decorator to help render PopoverProvider in stories. Internal to Forkbook. Use at your
 * own risk.
 */
export const OverlayTriggerDecorator: DecoratorFunction = (Story, { args }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <div
      style={{
        width: 500,
        height: 500,
        paddingTop: 100,
        overflowY: 'scroll',
        background: '#eee',
        position: 'relative',
      }}
    >
      <PortalContainerContext.Provider value={container ?? undefined}>
        <Story args={args} />
      </PortalContainerContext.Provider>
      <div id="portal" ref={(element) => setContainer(element ?? null)}></div>
    </div>
  );
};
