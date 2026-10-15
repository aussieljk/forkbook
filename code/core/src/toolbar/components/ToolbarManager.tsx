import React, { type FC } from 'react';

import { Separator } from '@aussieljk/forkbook/internal/components';

import { useGlobalTypes } from '@aussieljk/forkbook/manager-api';

import { normalizeArgType } from '../utils/normalize-toolbar-arg-type.ts';
import { ToolbarMenuSelect } from './ToolbarMenuSelect.tsx';

/** A smart component for handling manager-preview interactions. */
export const ToolbarManager: FC = () => {
  const globalTypes = useGlobalTypes();
  const hasToolbars = Object.keys(globalTypes).some((id) => !!globalTypes[id].toolbar);

  if (!hasToolbars) {
    return null;
  }

  return (
    <>
      <Separator />
      {Object.keys(globalTypes).map((id) => {
        const normalizedArgType = normalizeArgType(id, globalTypes[id]);

        return normalizedArgType && <ToolbarMenuSelect key={id} id={id} {...normalizedArgType} />;
      })}
    </>
  );
};
