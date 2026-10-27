import React, { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

import styles from './FrameSize.module.css';

export const PREVIEW_IFRAME_ID = 'storybook-preview-iframe';

export interface Size {
  width: number;
  height: number;
}

/** Live size of the preview iframe in CSS px. It finds the iframe also when it mounts later. */
export const usePreviewFrameSize = (id = PREVIEW_IFRAME_ID): Size | undefined => {
  const [size, setSize] = useState<Size>();

  useEffect(() => {
    let observed: HTMLElement | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (observed) {
        setSize({ width: observed.clientWidth, height: observed.clientHeight });
      }
    });
    const attach = () => {
      const el = document.getElementById(id);
      if (el === observed) {
        return;
      }
      if (observed) {
        resizeObserver.unobserve(observed);
      }
      observed = el;
      if (el) {
        resizeObserver.observe(el);
      }
    };
    attach();
    const mutationObserver = new MutationObserver(attach);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [id]);

  return size;
};

const Dimension = ({
  label,
  value,
  disabled,
  onApply,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onApply: (value: number) => void;
}) => {
  const [draft, setDraft] = useState<string>();

  if (draft === undefined) {
    return (
      <button
        type="button"
        className={styles.value}
        aria-label={`${label}: ${value}px. Click to edit.`}
        disabled={disabled}
        onClick={() => setDraft(String(value))}
      >
        {value}
      </button>
    );
  }

  const apply = () => {
    const next = Math.round(Number(draft));
    setDraft(undefined);
    if (draft.trim() !== '' && Number.isFinite(next) && next > 0 && next !== value) {
      onApply(next);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      apply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setDraft(undefined);
    }
  };

  return (
    <input
      className={styles.input}
      aria-label={label}
      type="number"
      min={1}
      autoFocus
      value={draft}
      style={{ width: `${Math.max(draft.length, 2) + 2}ch` }}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={apply}
      onKeyDown={onKeyDown}
    />
  );
};

/** Shows "width × height" of the preview frame. Click a number to type a custom size. */
export const FrameSize = ({
  size,
  disabled,
  onApply,
}: {
  size: Size | undefined;
  disabled?: boolean;
  onApply: (size: Size) => void;
}) => {
  if (!size) {
    return null;
  }
  return (
    <span className={styles.wrapper} data-testid="frame-size">
      <Dimension
        label="Frame width"
        value={size.width}
        disabled={disabled}
        onApply={(width) => onApply({ ...size, width })}
      />
      <span aria-hidden className={styles.times}>
        &times;
      </span>
      <Dimension
        label="Frame height"
        value={size.height}
        disabled={disabled}
        onApply={(height) => onApply({ ...size, height })}
      />
    </span>
  );
};
