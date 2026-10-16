import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';

import { clsx } from 'clsx';

import { useLocationHash } from '../../hooks/useLocation.ts';
import styles from './Focus.module.css';

type FocusOutlineProps = React.ComponentProps<'div'> & {
  active?: boolean;
  outlineOffset?: number;
};

const FocusOutline = forwardRef<HTMLDivElement, FocusOutlineProps>(
  ({ active = false, outlineOffset = 0, className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(styles.outline, className)}
      data-active={active || undefined}
      style={{ outlineOffset, ...style }}
      {...props}
    />
  )
);
FocusOutline.displayName = 'FocusOutline';

/** An outline that shows while the element with `data-target-id={targetId}` has visible focus. */
const FocusProxy = ({ targetId, ...props }: FocusOutlineProps & { targetId: string }) => {
  const id = useId();
  return (
    <>
      <style>
        {`[data-focus-proxy="${id}"]:has([data-target-id="${targetId}"]:focus-visible) { outline-color: var(--fb-color-secondary); }`}
      </style>
      <FocusOutline data-focus-proxy={id} {...props} />
    </>
  );
};

const FocusRing = ({
  active = false,
  highlightDuration,
  nodeRef,
  ...props
}: FocusOutlineProps & {
  highlightDuration?: number;
  nodeRef?: React.RefObject<HTMLDivElement>;
}) => {
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (highlightDuration) {
      setVisible(active);
      const timeout = setTimeout(setVisible, highlightDuration, false);
      return () => clearTimeout(timeout);
    }
  }, [active, highlightDuration]);

  return <FocusOutline {...props} active={highlightDuration ? visible : active} ref={nodeRef} />;
};

const FocusTarget = ({
  targetHash,
  highlightDuration,
  ...props
}: Omit<React.ComponentProps<typeof FocusRing>, 'active'> & {
  targetHash: string;
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const locationHash = useLocationHash();
  const [active, setActive] = useState(locationHash === targetHash);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    setActive(false);
    if (locationHash === targetHash) {
      timeouts.push(
        setTimeout(() => {
          setActive(true);
          nodeRef.current?.focus({ preventScroll: true });
          nodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0)
      );
      if (highlightDuration) {
        timeouts.push(setTimeout(setActive, highlightDuration, false));
      }
    }

    return () => timeouts.forEach(clearTimeout);
  }, [locationHash, targetHash, highlightDuration]);

  return <FocusRing {...props} active={active} nodeRef={nodeRef} tabIndex={-1} />;
};

export const Focus = {
  Outline: FocusOutline,
  Proxy: FocusProxy,
  Ring: FocusRing,
  Target: FocusTarget,
};
