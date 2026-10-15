import React from 'react';

import styles from './TooltipNote.module.css';

/** Wide enough for a label to stay on one line, narrow enough that a sentence stays a note. */
const DEFAULT_MAX_WIDTH = 260;

export interface TooltipNoteProps {
  /* The note to display. A note may also present a shortcut alone. */
  note?: string;
  /* The optional keyboard shortcut for the action being presented. */
  shortcut?: string;
  /* The maximum width of the note. */
  maxWidth?: number;
}

export const TooltipNote = ({
  note,
  maxWidth = DEFAULT_MAX_WIDTH,
  shortcut,
  ...props
}: TooltipNoteProps) => {
  return (
    <div className={styles.note} style={{ maxWidth }} {...props}>
      {note && <span>{note}</span>}
      {shortcut && <code>{shortcut}</code>}
    </div>
  );
};
