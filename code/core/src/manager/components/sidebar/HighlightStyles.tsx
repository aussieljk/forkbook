import type { FC } from 'react';
import React from 'react';

import type { Highlight } from './types.ts';

export const HighlightStyles: FC<NonNullable<Highlight>> = ({ refId, itemId }) => {
  const item = `[data-ref-id="${refId}"][data-item-id="${itemId}"]:not([data-selected="true"])`;
  const background = 'rgb(from var(--sb-color-secondary) r g b / calc(alpha - 0.85))';

  return (
    <style>{`
      ${item}:is([data-nodetype="component"], [data-nodetype="group"]),
      ${item}:is([data-nodetype="component"], [data-nodetype="group"]):is(:hover, :focus) {
        background: ${background};
      }

      ${item}:is([data-nodetype="story"], [data-nodetype="document"], [data-nodetype="test"]),
      ${item}:is([data-nodetype="story"], [data-nodetype="document"], [data-nodetype="test"]):is(:hover, :focus) {
        color: var(--sb-color-default-text);
        background: ${background};
      }
    `}</style>
  );
};
