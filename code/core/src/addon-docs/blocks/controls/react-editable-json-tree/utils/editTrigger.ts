import type { HTMLAttributes } from 'react';

/** Props that make a value open its edit form on a click, or on Enter when it has focus. */
export const editTriggerProps = (onEdit: () => void): HTMLAttributes<HTMLElement> => ({
  role: 'button',
  tabIndex: 0,
  onClick: onEdit,
  onKeyDown: (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onEdit();
    }
  },
});
