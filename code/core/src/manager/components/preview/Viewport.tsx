import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ActionList } from '@aussieljk/forkbook/internal/components';

import { TransferIcon, UndoIcon } from '@storybook/icons';

import {
  VIEWPORT_MIN_HEIGHT,
  VIEWPORT_MIN_WIDTH,
  useViewport,
} from '../../../viewport/useViewport.ts';
import { IFrame } from './Iframe.tsx';
import { NumericInput } from './NumericInput.tsx';
import styles from './Viewport.module.css';

type DragSide = 'none' | 'both' | 'bottom' | 'right';

export const Viewport = ({
  active,
  id,
  src,
  scale,
}: {
  active: boolean;
  id: string;
  src: string;
  scale: number;
}) => {
  const { width, height, isCustom, isDefault, lastSelectedOption, resize, rotate, select } =
    useViewport();

  const [dragging, setDragging] = useState<DragSide>('none');
  const targetRef = useRef<HTMLDivElement>(null);
  const dragRefX = useRef<HTMLDivElement>(null);
  const dragRefY = useRef<HTMLDivElement>(null);
  const dragRefXY = useRef<HTMLDivElement>(null);
  const dragSide = useRef<DragSide>('none');
  const dragStart = useRef<[number, number] | undefined>();
  const dragScrollTarget = useRef<Element | null | undefined>(null);

  useEffect(() => {
    const onDrag = (e: MouseEvent) => {
      if (!targetRef.current || !dragStart.current) {
        return;
      }
      if (dragRefX.current && (dragSide.current === 'both' || dragSide.current === 'right')) {
        const newWidth = Math.max(VIEWPORT_MIN_WIDTH, dragStart.current[0] + e.clientX);
        targetRef.current.style.width = `${newWidth}px`;
        dragRefX.current.dataset.value = `${Math.round(newWidth / scale)}`;
      }
      if (dragRefY.current && (dragSide.current === 'both' || dragSide.current === 'bottom')) {
        const newHeight = Math.max(VIEWPORT_MIN_HEIGHT, dragStart.current[1] + e.clientY);
        targetRef.current.style.height = `${newHeight}px`;
        dragRefY.current.dataset.value = `${Math.round(newHeight / scale)}`;
      }
      if (dragScrollTarget.current) {
        dragScrollTarget.current.scrollIntoView({ block: 'center', inline: 'center' });
      }
    };

    const onEnd = () => {
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('mousemove', onDrag);
      setDragging('none');
      dragStart.current = undefined;
      if (targetRef.current) {
        const { clientWidth, clientHeight, dataset } = targetRef.current;
        const scale = Number(dataset.scale) || 1;
        resize(`${Math.round(clientWidth / scale)}px`, `${Math.round(clientHeight / scale)}px`);
      }
    };

    const onStart = (e: MouseEvent) => {
      e.preventDefault();
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('mousemove', onDrag);
      dragSide.current = (e.currentTarget as HTMLElement).dataset.side as DragSide;
      dragStart.current = [
        (targetRef.current?.clientWidth ?? 0) - e.clientX,
        (targetRef.current?.clientHeight ?? 0) - e.clientY,
      ];
      dragScrollTarget.current = targetRef.current?.querySelector(
        `[data-edge="${dragSide.current}"]`
      );
      setDragging(dragSide.current);
    };

    const handles = [dragRefX.current, dragRefY.current, dragRefXY.current];
    handles.forEach((el) => el?.addEventListener('mousedown', onStart));
    return () => handles.forEach((el) => el?.removeEventListener('mousedown', onStart));
  }, [resize, scale]);

  const dimensions = useMemo(() => {
    const [, nx = '', ux = 'px'] = width.match(/^(\d+(?:\.\d+)?)(\%|[a-z]{1,4})?$/) || [];
    const [, ny = '', uy = 'px'] = height.match(/^(\d+(?:\.\d+)?)(\%|[a-z]{1,4})?$/) || [];
    return {
      frame: {
        width: `calc(${width} * ${scale})`,
        height: `calc(${height} * ${scale})`,
      },
      display: {
        width: `${nx || width}${ux === 'px' ? '' : ux}`,
        height: `${ny || height}${uy === 'px' ? '' : uy}`,
      },
      locked: {
        width: !nx || !ny,
        height: !nx || !ny,
      },
    };
  }, [width, height, scale]);

  return (
    <div
      key={id}
      className={styles.viewportWrapper}
      data-active={active || undefined}
      data-default={isDefault || undefined}
    >
      {!isDefault && (
        <div className={styles.viewportControls}>
          <div className={styles.viewportDimensions}>
            <NumericInput
              className={styles.sizeInput}
              aria-label="Viewport width"
              data-size-input="width"
              label="Viewport width"
              before={
                <ActionList.Action size="small" readOnly aria-hidden>
                  W
                </ActionList.Action>
              }
              value={width}
              minValue={0}
              setValue={(value) => resize(value, height)}
              disabled={dimensions.locked.width}
            />
            <ActionList.Button
              key="viewport-rotate"
              size="small"
              padding="small"
              ariaLabel="Rotate viewport"
              onClick={rotate}
            >
              <TransferIcon />
            </ActionList.Button>
            <NumericInput
              className={styles.sizeInput}
              aria-label="Viewport height"
              data-size-input="height"
              label="Viewport height"
              before={
                <ActionList.Action size="small" readOnly aria-hidden>
                  H
                </ActionList.Action>
              }
              value={height}
              minValue={0}
              setValue={(value) => resize(width, value)}
              disabled={dimensions.locked.height}
            />
            {isCustom && lastSelectedOption && (
              <ActionList.Button
                key="viewport-restore"
                size="small"
                padding="small"
                ariaLabel="Restore viewport"
                onClick={() => select(lastSelectedOption)}
              >
                <UndoIcon />
              </ActionList.Button>
            )}
          </div>
        </div>
      )}
      <div
        className={styles.frameWrapper}
        data-default={isDefault || undefined}
        data-dragging={dragging}
        data-scale={scale}
        style={{
          minWidth: VIEWPORT_MIN_WIDTH,
          minHeight: VIEWPORT_MIN_HEIGHT,
          ...(isDefault ? { height: '100%', width: '100%' } : dimensions.frame),
        }}
        ref={targetRef}
      >
        <div
          style={{
            height: `${(1 / scale) * 100}%`,
            width: `${(1 / scale) * 100}%`,
            transform: scale !== 1 ? `scale(${scale})` : 'none',
            transformOrigin: 'top left',
          }}
        >
          <IFrame allowFullScreen active={active} key={id} id={id} title={id} src={src} scale={1} />
          {!isDefault && (
            <>
              <div className={styles.scrollEdge} data-edge="right" />
              <div className={styles.scrollEdge} data-edge="bottom" />
              <div className={styles.scrollEdge} data-edge="both" />
            </>
          )}
        </div>
        {!dimensions.locked.width && (
          <div
            className={styles.dragHandle}
            ref={dragRefX}
            data-default={isDefault || undefined}
            data-side="right"
            data-value={dimensions.display.width}
          />
        )}
        {!dimensions.locked.height && (
          <div
            className={styles.dragHandle}
            ref={dragRefY}
            data-default={isDefault || undefined}
            data-side="bottom"
            data-value={dimensions.display.height}
          />
        )}
        {!dimensions.locked.width && !dimensions.locked.height && (
          <div
            className={styles.dragHandle}
            ref={dragRefXY}
            data-default={isDefault || undefined}
            data-side="both"
          />
        )}
      </div>
    </div>
  );
};
