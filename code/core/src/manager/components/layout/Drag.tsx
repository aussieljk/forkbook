import React, { forwardRef } from 'react';

import type { PopperPlacement } from '../../../components/index.ts';
import { TooltipNote } from '../../../components/components/tooltip/TooltipNote.tsx';
import { TooltipProvider } from '../../../components/components/tooltip/TooltipProvider.tsx';
import styles from './Drag.module.css';

interface DragProps {
  /** Which side the drag handle sits on, relative to the content it resizes. Determines orientation. */
  position: 'left' | 'right' | 'top' | 'bottom';

  /** Whether the drag handle overlaps the adjacent content area. */
  overlapping?: boolean;

  /** Accessible label describing what this separator resizes. */
  'aria-label': string;

  /** Current size (in pixels) of the region controlled by this separator. */
  'aria-valuenow': number;

  /** Maximum size (in pixels) for the region controlled by this separator. */
  'aria-valuemax'?: number;
}

const oppositePosition: Record<string, PopperPlacement> = {
  left: 'right',
  right: 'left',
  top: 'bottom',
  bottom: 'top',
};

/**
 * Drag handle for the sidebar and panel resizers. Can be horizontal (bottom panel) or vertical
 * (sidebar or right panel). Implements the WAI-ARIA separator role with keyboard resize support.
 *
 * The component automatically sets `role="separator"`, `tabIndex={0}`, and `aria-valuemin={0}`. A
 * tooltip is shown on focus advertising the arrow keys available for keyboard resizing.
 */
export const Drag = forwardRef<HTMLDivElement, DragProps>(function Drag(props, ref) {
  const {
    overlapping = true,
    position,
    'aria-label': ariaLabel,
    'aria-valuenow': ariaValueNow,
    'aria-valuemax': ariaValueMax,
    ...rest
  } = props;

  const orientation = position === 'left' || position === 'right' ? 'vertical' : 'horizontal';
  const tooltipNote = orientation === 'vertical' ? '← → to resize' : '↑ ↓ to resize';

  return (
    <TooltipProvider
      triggerOnFocusOnly
      placement={oppositePosition[position]}
      tooltip={<TooltipNote note={tooltipNote} />}
    >
      <div
        className={styles.drag}
        ref={ref}
        data-overlapping={overlapping || undefined}
        data-position={position}
        role="separator"
        tabIndex={0}
        aria-orientation={orientation}
        aria-label={ariaLabel}
        aria-valuenow={ariaValueNow}
        aria-valuemin={0}
        aria-valuemax={ariaValueMax}
        {...rest}
      />
    </TooltipProvider>
  );
});
