import type { FC, PropsWithChildren, ReactChild, ReactElement, ReactNode } from 'react';
import React, { Children, forwardRef } from 'react';

import { deprecate } from '@aussieljk/forkbook/internal/client-logger';
import type { Addon_RenderOptions } from '@aussieljk/forkbook/internal/types';

import type { TabsProps } from './Tabs.tsx';

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
}

export const VisuallyHidden = forwardRef<HTMLDivElement, VisuallyHiddenProps>(
  ({ active, style, ...props }, ref) => (
    <div ref={ref} style={{ display: active ? 'block' : 'none', ...style }} {...props} />
  )
);
VisuallyHidden.displayName = 'VisuallyHidden';

export const childrenToList = (children: TabsProps['children']) => {
  deprecate('The `childrenToList` tabs helper is deprecated. Use `TabsView` instead.');
  return Children.toArray(children).map(
    // @ts-expect-error (non strict)
    ({
      props: { title, id, color, children: childrenOfChild },
    }: ReactElement<{
      children: FC<Addon_RenderOptions & PropsWithChildren> | ReactChild | null;
      title: ReactChild | null | FC;
      id: string;
      color?: string;
    }>) => {
      const content: FC<Addon_RenderOptions & PropsWithChildren> | ReactNode = Array.isArray(
        childrenOfChild
      )
        ? childrenOfChild[0]
        : childrenOfChild;

      const render: FC<Addon_RenderOptions & PropsWithChildren> = (
        typeof content === 'function'
          ? content
          : ({ active }) => (
              <VisuallyHidden active={active} role="tabpanel">
                {content}
              </VisuallyHidden>
            )
      ) as FC<Addon_RenderOptions & PropsWithChildren>;
      return {
        title,
        id,
        ...(color ? { color } : {}),
        render,
      };
    }
  );
};

export type ChildrenList = ReturnType<typeof childrenToList>;
export type ChildrenListComplete = Array<
  ReturnType<typeof childrenToList>[0] & {
    active: boolean;
  }
>;
