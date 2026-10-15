import type { FC } from 'react';
import React from 'react';

import { Select } from '@aussieljk/forkbook/internal/components';

import { useGlobals, useStorybookApi } from '@aussieljk/forkbook/manager-api';
import { Icons } from '../../components/components/icon/icon.tsx';
import type { ToolbarMenuProps } from '../types.ts';
import { getSelectedItem } from '../utils/get-selected.ts';
import { registerShortcuts } from '../utils/register-shortcuts.ts';
import styles from './ToolbarMenuSelect.module.css';

// We can't remove the Icons component just yet because there's no way for now to import icons
// in the preview directly. Before having a better solution, we are going to keep the Icons component
// for now and remove the deprecated warning.

export const ToolbarMenuSelect: FC<ToolbarMenuProps> = ({
  id,
  name,
  description,
  toolbar: {
    icon: _icon,
    items,
    title: _title,
    preventDynamicIcon,
    dynamicTitle = true,
    shortcuts,
  },
}) => {
  const api = useStorybookApi();
  const [globals, updateGlobals, storyGlobals] = useGlobals();

  const currentValue = globals[id];
  const isOverridden = id in storyGlobals;
  let icon = _icon;
  let title = _title;

  if (!preventDynamicIcon) {
    icon = getSelectedItem({ currentValue, items })?.icon || icon;
  }

  if (dynamicTitle) {
    title = getSelectedItem({ currentValue, items })?.title || title;
  }

  if (!title && !icon) {
    console.warn(`Toolbar '${id}' has no title or icon`);
  }

  const resetItem = items.find((item) => item.type === 'reset');
  const resetLabel = resetItem?.title;
  const options = React.useMemo(
    () =>
      items
        .filter((item) => item.type !== 'reset')
        .map((item) => {
          const itemTitle = item.title ?? item.value ?? 'Untitled';
          const iconComponent =
            !item.hideIcon && item.icon ? (
              <Icons icon={item.icon} __suppressDeprecationWarning={true} />
            ) : undefined;

          if (item.right) {
            return {
              title: itemTitle,
              value: item.value,
              children: (
                <div className={styles.item}>
                  {iconComponent}
                  <div className={styles.itemMiddle}>{item.title ?? item.value}</div>
                  {item.right}
                </div>
              ),
            };
          } else {
            return {
              title: itemTitle,
              value: item.value,
              icon: iconComponent,
            };
          }
        }),
    [items]
  );

  React.useEffect(() => {
    if (shortcuts) {
      const length = options.length;
      void registerShortcuts(api, id, {
        next: {
          ...shortcuts.next,
          action: () => {
            const idx = options.findIndex((i) => i.value === globals[id]);
            const nextIdx = idx < 0 ? 0 : (idx + 1) % length;
            updateGlobals({ [id]: options[nextIdx].value });
          },
        },
        previous: {
          ...shortcuts.previous,
          action: () => {
            const idx = options.findIndex((i) => i.value === globals[id]);
            const previousIdx = idx < 0 ? length - 1 : (idx + length - 1) % length;
            updateGlobals({ [id]: options[previousIdx].value });
          },
        },
        reset: {
          ...shortcuts.reset,
          action: () => {
            updateGlobals({ [id]: undefined });
          },
        },
      });
    }
  }, [api, id, shortcuts, globals, options, updateGlobals]);

  // FIXME: description should become an aria-description, with a separate ariaLabel prop on tools
  const ariaLabel = description || title || name || id;

  return (
    <Select
      defaultOptions={[currentValue]}
      options={options}
      disabled={isOverridden}
      ariaLabel={ariaLabel}
      tooltip={ariaLabel}
      resetLabel={resetLabel}
      onReset={resetItem ? () => updateGlobals({ [id]: resetItem?.value }) : undefined}
      onSelect={(selected) => updateGlobals({ [id]: selected })}
      icon={icon && <Icons icon={icon} __suppressDeprecationWarning={true} />}
      showSelectedOptionTitle={dynamicTitle}
    >
      {title}
    </Select>
  );
};
