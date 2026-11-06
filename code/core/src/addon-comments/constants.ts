export const ADDON_ID = '@aussieljk/forkbook/comments' as const;
export const PANEL_ID = `${ADDON_ID}/panel` as const;
export const TOOL_ID = `${ADDON_ID}/tool` as const;

/** REST route that the dev server serves. The manager reads and writes comments through it. */
export const COMMENTS_API_PATH = '/__forkbook/comments' as const;

/** File, relative to the project root, that keeps the comments between restarts. */
export const COMMENTS_FILE = '.forkbook/comments.json' as const;

export const EVENTS = {
  /** Manager to preview: start the element picker. */
  PICK_START: `${ADDON_ID}/pick-start`,
  /** Manager to preview: stop the element picker. */
  PICK_CANCEL: `${ADDON_ID}/pick-cancel`,
  /** Preview to manager: the user clicked an element. */
  PICKED: `${ADDON_ID}/picked`,
  /** Preview to manager: the user stopped the picker (Escape). */
  PICK_ENDED: `${ADDON_ID}/pick-ended`,
} as const;
