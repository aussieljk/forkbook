import React, { type HTMLAttributes, createContext, useContext, useEffect, useState } from 'react';

import { deprecate } from '@aussieljk/forkbook/internal/client-logger';
import type { DecoratorFunction } from '@aussieljk/forkbook/internal/csf';

import { Dialog } from '@base-ui/react/dialog';
import { useTransitionState } from 'react-transition-state';
import { themeToCssVars, useTheme } from '@aussieljk/forkbook/theming';

import { useMediaQuery } from '../../../manager/hooks/useMedia.tsx';
import { PortalContainerContext } from '../shared/overlayHelpers.tsx';
import { trapTabKey } from '../shared/trapTabKey.ts';
import * as Components from './Modal.styled.tsx';

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  container?: HTMLElement;

  portalSelector?: string;

  /** Width of the Modal. Defaults to `740`. */
  width?: number | string;

  /** Height of the Modal. Defaults to `auto`. */
  height?: number | string;

  /** Modal content. */
  children: React.ReactNode;

  /** Additional class names for the Modal. */
  className?: string;

  /** Controlled state: whether the Modal is currently open. */
  open?: boolean;

  /** Uncontrolled state: whether the Modal is initially open on the first. */
  defaultOpen?: boolean;

  /** @deprecated Use `dismissOnEscape` instead. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;

  /** @deprecated Use `dismissOnInteractOutside` instead. */
  onInteractOutside?: (event: FocusEvent | MouseEvent | TouchEvent) => void;

  /** Handler called when visibility of the Modal changes. */
  onOpenChange?: (isOpen: boolean) => void;

  // TODO: Forkbook 11, make this required
  /** The accessible name for the modal. */
  ariaLabel?: string;

  /** Whether the modal can be dismissed by clicking outside. Defaults to `true`. */
  dismissOnClickOutside?: boolean;

  /** Whether the modal can be dismissed by pressing Escape. Defaults to `true`. */
  dismissOnEscape?: boolean;

  /** Transition duration, so we can slow down transitions on mobile. */
  transitionDuration?: number;

  /** The max dimensions, initial position and animations of the Modal. Defaults to 'dialog'. */
  variant?: 'dialog' | 'bottom-drawer';
}

// Create a context to provide the close function like Radix Dialog
export const ModalContext = createContext<{ close?: () => void }>({});

function BaseModal({
  container,
  portalSelector,
  children,
  width,
  height,
  ariaLabel,
  dismissOnClickOutside = true,
  dismissOnEscape = true,
  className,
  open,
  onEscapeKeyDown,
  onInteractOutside,
  onOpenChange,
  defaultOpen,
  transitionDuration = 200,
  variant = 'dialog',
  ...props
}: ModalProps) {
  let deprecated = undefined;
  if (ariaLabel === undefined || ariaLabel === '') {
    deprecated = 'ariaLabel';
    deprecate('The `ariaLabel` prop on `Modal` will become mandatory in Forkbook 11.');
    // TODO in Forkbook 11
    // throw new Error(
    //   'Modal requires an ARIA label to be accessible. Please provide a valid ariaLabel prop.'
    // );
  }

  if (onEscapeKeyDown !== undefined) {
    deprecated = 'onEscapeKeyDown';
    deprecate(
      'The `onEscapeKeyDown` prop is deprecated and will be removed in Forkbook 11. Use `dismissOnEscape` instead.'
    );
  }

  if (onInteractOutside !== undefined) {
    deprecated = 'onInteractOutside';
    deprecate(
      'The `onInteractOutside` prop is deprecated and will be removed in Forkbook 11. Use `dismissOnInteractOutside` instead.'
    );
  }

  const portalContainer = useContext(PortalContainerContext);
  // The portal renders outside the ThemeProvider element, so the overlay and the dialog get the
  // theme variables themselves. A wrapper element would change which element Base UI hides when
  // modals are stacked.
  const theme = useTheme();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [{ status, isMounted }, toggle] = useTransitionState({
    timeout: reducedMotion ? 0 : transitionDuration,
    mountOnEnter: true,
    unmountOnExit: true,
  });

  const close = () => {
    toggle(false);
    onOpenChange?.(false);
  };

  // Sync external open state with transition state
  useEffect(() => {
    const shouldBeOpen = open ?? defaultOpen ?? false;
    if (shouldBeOpen && !isMounted) {
      toggle(true);
    } else if (!shouldBeOpen && isMounted) {
      toggle(false);
    }
  }, [open, defaultOpen, isMounted, toggle]);

  // Call onOpenChange ourselves when the modal is initially opened
  useEffect(() => {
    if (isMounted && (open || defaultOpen)) {
      onOpenChange?.(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  if (!isMounted || status === 'exited' || status === 'unmounted') {
    return null;
  }

  // Base UI asks before it closes the dialog. We stay open (and play the exit transition
  // ourselves) unless the dismissal is allowed.
  const handleOpenChange = (nextOpen: boolean, details: Dialog.Root.ChangeEventDetails) => {
    if (nextOpen) {
      return;
    }
    if (details.reason === 'escape-key') {
      if (!dismissOnEscape) {
        return;
      }
      // The deprecated handler can veto the close by preventing default (Radix contract).
      onEscapeKeyDown?.(details.event as KeyboardEvent);
      if (details.event.defaultPrevented) {
        return;
      }
    }
    if (details.reason === 'outside-press') {
      onInteractOutside?.(details.event as MouseEvent);
      if (details.event.defaultPrevented) {
        return;
      }
    }
    close();
  };

  const containerElement =
    container ??
    (portalSelector ? document.querySelector<HTMLElement>(portalSelector) : undefined) ??
    portalContainer;

  return (
    <Dialog.Root
      open
      onOpenChange={handleOpenChange}
      disablePointerDismissal={!dismissOnClickOutside}
    >
      <Dialog.Portal container={containerElement}>
        <Dialog.Backdrop
          forceRender
          render={
            <Components.Overlay
              $status={status}
              $transitionDuration={transitionDuration}
              data-sb-theme={theme.base}
              style={themeToCssVars(theme)}
            />
          }
        />
        <Dialog.Popup
          aria-label={ariaLabel}
          // Base UI traps focus with focus guards. We also wrap Tab ourselves, so focus does not
          // stop on the guards.
          onKeyDown={(event) => trapTabKey(event.nativeEvent, event.currentTarget)}
          render={
            <Components.Container
              data-deprecated={deprecated}
              $variant={variant}
              $status={status}
              $transitionDuration={transitionDuration}
              className={className}
              width={width}
              height={height}
              data-sb-theme={theme.base}
              {...props}
              style={{ ...themeToCssVars(theme), ...props.style }}
            />
          }
        >
          <ModalContext.Provider value={{ close }}>{children}</ModalContext.Provider>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const Modal = Object.assign(BaseModal, Components);

/**
 * Forkbook decorator to help render Modals in stories with multiple theme layouts. Internal to
 * Forkbook. Use at your own risk.
 */
export const ModalDecorator: DecoratorFunction = (Story, { args }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  if (args.container || args.portalSelector) {
    return <Story {...{ args }} />;
  }

  return (
    <>
      <PortalContainerContext.Provider value={container ?? undefined}>
        <Story args={args} />
      </PortalContainerContext.Provider>
      <div
        ref={(element) => setContainer(element ?? null)}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '600px',
          transform: 'translateZ(0)',
        }}
      ></div>
    </>
  );
};
