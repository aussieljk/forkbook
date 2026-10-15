import type { CSSProperties, ComponentProps } from 'react';
import React, { forwardRef, useContext } from 'react';

import { deprecate } from '@aussieljk/forkbook/internal/client-logger';

import { CrossIcon } from '@storybook/icons';

import type { TransitionStatus } from 'react-transition-state';
import { clsx } from 'clsx';

import { Button } from '../Button/Button.tsx';
// Import the ModalContext from the main Modal component
import { ModalContext } from './Modal.tsx';
import styles from './Modal.module.css';

/** A div with a class, which accepts a className and the other div props. */
const divWithClass = (baseClassName: string, displayName: string) => {
  const Component = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={clsx(baseClassName, className)} {...props} />
    )
  );
  Component.displayName = displayName;
  return Component;
};

interface TransitionProps {
  $status?: TransitionStatus;
  $transitionDuration?: number;
}

const transitionAttributes = ({ $status, $transitionDuration }: TransitionProps) => ({
  'data-exiting': $status === 'exiting' || $status === 'preExit' || undefined,
  style: { '--sb-modal-duration': `${$transitionDuration}ms` } as CSSProperties,
});

export const Overlay = forwardRef<HTMLDivElement, ComponentProps<'div'> & TransitionProps>(
  ({ $status, $transitionDuration, className, style, ...props }, ref) => {
    const attributes = transitionAttributes({ $status, $transitionDuration });
    return (
      <div
        ref={ref}
        {...props}
        data-exiting={attributes['data-exiting']}
        className={clsx(styles.overlay, className)}
        style={{ ...attributes.style, ...style }}
      />
    );
  }
);
Overlay.displayName = 'Overlay';

export const Container = forwardRef<
  HTMLDivElement,
  Omit<ComponentProps<'div'>, 'width' | 'height'> &
    TransitionProps & {
      $variant: 'dialog' | 'bottom-drawer';
      width?: number | string;
      height?: number | string;
    }
>(({ $variant, $status, $transitionDuration, width, height, className, style, ...props }, ref) => {
  const attributes = transitionAttributes({ $status, $transitionDuration });
  return (
    <div
      ref={ref}
      {...props}
      data-variant={$variant}
      data-exiting={attributes['data-exiting']}
      className={clsx(styles.container, className)}
      style={{ ...attributes.style, width, height, ...style }}
    />
  );
});
Container.displayName = 'Container';

interface CloseProps {
  asChild?: boolean;
  children?: React.ReactElement<
    {
      onClick?: (event: React.MouseEvent) => void;
    },
    | string
    | React.JSXElementConstructor<{
        onClick?: (event: React.MouseEvent) => void;
      }>
  >;
  onClick?: (event: React.MouseEvent) => void;
}

export const Close = ({ asChild, children, onClick, ...props }: CloseProps) => {
  const { close } = useContext(ModalContext);

  if (asChild && React.isValidElement(children)) {
    const handleClick = (event: React.MouseEvent) => {
      onClick?.(event);
      children.props.onClick?.(event);
      close?.();
    };

    return React.cloneElement(children, {
      ...props,
      onClick: handleClick,
    });
  }

  return (
    <Button
      type="button"
      padding="small"
      ariaLabel="Close modal"
      variant="ghost"
      shortcut={['Escape']}
      onClick={close}
    >
      <CrossIcon />
    </Button>
  );
};

export const Dialog = {
  Close: () => {
    deprecate('Modal.Dialog.Close is deprecated, please use Modal.Close instead.');
    return <Close data-deprecated="Modal.Dialog.Close" />;
  },
};

export const CloseButton = ({ ariaLabel, ...props }: React.ComponentProps<typeof Button>) => {
  deprecate('Modal.CloseButton is deprecated, please use Modal.Close instead.');

  return (
    <Close asChild>
      <Button ariaLabel={ariaLabel || 'Close'} data-deprecated="Modal.CloseButton" {...props}>
        <CrossIcon />
      </Button>
    </Close>
  );
};

export const Content = divWithClass(styles.content, 'Content');

export const Row = divWithClass(styles.row, 'Row');

export const Col = divWithClass(styles.col, 'Col');

export const Header = ({
  hasClose = true,
  onClose,
  ...props
}: React.ComponentProps<typeof Col> & { hasClose?: boolean; onClose?: () => void }) => (
  <Row>
    <Col {...props} />
    {hasClose && <Close onClick={onClose} />}
  </Row>
);

export const Title = forwardRef<HTMLHeadingElement, ComponentProps<'h2'>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={clsx(styles.title, className)} {...props} />
  )
);
Title.displayName = 'Title';

export const Description = forwardRef<HTMLSpanElement, ComponentProps<'span'>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={clsx(styles.description, className)} {...props} />
  )
);
Description.displayName = 'Description';

export const Actions = divWithClass(styles.actions, 'Actions');

export const ErrorWrapper = divWithClass(styles.errorWrapper, 'ErrorWrapper');

export const Error = ({
  children,
  ...props
}: { children: React.ReactNode } & ComponentProps<typeof ErrorWrapper>) => (
  <ErrorWrapper {...props}>
    <div>{children}</div>
  </ErrorWrapper>
);
