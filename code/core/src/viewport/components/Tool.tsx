import React from 'react';

import { useViewport } from '../useViewport.ts';
import { FrameSize, usePreviewFrameSize } from './FrameSize.tsx';
import { ViewportSegments } from './ViewportSegments.tsx';

export const ViewportTool = () => {
  const { option, isDefault, isLocked, options, reset, resize, select } = useViewport();
  const frameSize = usePreviewFrameSize();

  return (
    <>
      <ViewportSegments
        viewports={options}
        value={option}
        isDefault={isDefault}
        isLocked={isLocked}
        onSelect={select}
        onReset={reset}
      />
      <FrameSize
        size={frameSize}
        disabled={isLocked}
        onApply={({ width, height }) => resize(`${width}px`, `${height}px`)}
      />
    </>
  );
};
