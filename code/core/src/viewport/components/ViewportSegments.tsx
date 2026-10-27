import React, { useMemo } from 'react';

import { Button, Select } from '@aussieljk/forkbook/internal/components';

import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { EllipsisIcon, Maximize2Icon, MonitorIcon, SmartphoneIcon, TabletIcon } from 'lucide-react';

import type { ViewportMap } from '../types.ts';
import { iconsMap } from '../viewportIcons.tsx';
import { type SegmentKind, SEGMENT_KINDS, mapSegments } from './segments.ts';
import styles from './Tool.module.css';

const FULL = 'full';

const SEGMENT_ICONS: Record<SegmentKind, React.ReactNode> = {
  mobile: <SmartphoneIcon />,
  tablet: <TabletIcon />,
  desktop: <MonitorIcon />,
};

const SEGMENT_LABELS: Record<SegmentKind, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
};

export interface ViewportSegmentsProps {
  viewports: ViewportMap;
  /** The key of the selected viewport. Undefined when the default (full) viewport shows. */
  value: string | undefined;
  isDefault: boolean;
  isLocked?: boolean;
  onSelect: (key: string) => void;
  onReset: () => void;
}

export const ViewportSegments = ({
  viewports,
  value,
  isDefault,
  isLocked = false,
  onSelect,
  onReset,
}: ViewportSegmentsProps) => {
  const { segments, overflow } = useMemo(() => mapSegments(viewports), [viewports]);

  const pressed = isDefault ? FULL : SEGMENT_KINDS.find((kind) => segments[kind] === value);

  const overflowOptions = useMemo(
    () =>
      overflow.map((key) => ({
        value: key,
        title: viewports[key].name,
        icon: iconsMap[viewports[key].type ?? 'other'],
        right: (
          <div className={styles.dimensions}>
            <span>{viewports[key].styles.width.replace('px', '')}</span>
            <span>&times;</span>
            <span>{viewports[key].styles.height.replace('px', '')}</span>
          </div>
        ),
      })),
    [overflow, viewports]
  );

  const lockedNote = isLocked ? ' (set by story parameters)' : '';

  return (
    <>
      <ToggleGroup
        className={styles.segments}
        aria-label={`Viewport size${lockedNote}`}
        value={pressed ? [pressed] : []}
        disabled={isLocked}
        onValueChange={(next) => {
          const [picked] = next;
          if (picked === FULL) {
            onReset();
          } else if (picked && segments[picked as SegmentKind]) {
            onSelect(segments[picked as SegmentKind]!);
          }
        }}
      >
        {SEGMENT_KINDS.filter((kind) => segments[kind]).map((kind) => (
          <Toggle
            key={kind}
            value={kind}
            className={styles.segment}
            render={
              <Button
                variant="ghost"
                padding="small"
                size="small"
                ariaLabel={`${SEGMENT_LABELS[kind]}: ${viewports[segments[kind]!].name}${lockedNote}`}
              />
            }
          >
            {SEGMENT_ICONS[kind]}
          </Toggle>
        ))}
        <Toggle
          value={FULL}
          className={styles.segment}
          render={
            <Button
              variant="ghost"
              padding="small"
              size="small"
              ariaLabel={`Full size (reset viewport)${lockedNote}`}
            />
          }
        >
          <Maximize2Icon />
        </Toggle>
      </ToggleGroup>
      {overflowOptions.length > 0 && (
        <Select
          key="viewport-more"
          padding="small"
          disabled={isLocked}
          ariaLabel={`More viewports${lockedNote}`}
          tooltip="More viewports"
          defaultOptions={value && overflow.includes(value) ? value : undefined}
          options={overflowOptions}
          onSelect={(selected) => onSelect(selected as string)}
          icon={<EllipsisIcon />}
        />
      )}
    </>
  );
};
