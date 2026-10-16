import type { FC } from 'react';
import React from 'react';

import {
  BookmarkSimpleIcon,
  FileTextIcon,
  FlaskIcon,
  FolderIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react';

import styles from './IconSymbols.module.css';

// The tree icons are defined once as SVG symbols and used everywhere with <use>. Each symbol holds
// a 14 px Phosphor icon. The status marks are simple shapes.

const GROUP_ID = 'icon--group';
const COMPONENT_ID = 'icon--component';
const DOCUMENT_ID = 'icon--document';
const STORY_ID = 'icon--story';
const TEST_ID = 'icon--test';
const SUCCESS_ID = 'icon--success';
const ERROR_ID = 'icon--error';
const WARNING_ID = 'icon--warning';
const DOT_ID = 'icon--dot';
const NEW_ID = 'icon--new';
const MODIFIED_ID = 'icon--modified';
const AFFECTED_ID = 'icon--affected';
const REVIEWING_ID = 'icon--reviewing';

export const IconSymbols: FC = () => {
  return (
    <svg className={styles.svg} data-chromatic="ignore">
      <symbol id={GROUP_ID}>
        <FolderIcon size={14} />
      </symbol>
      <symbol id={COMPONENT_ID}>
        <SquaresFourIcon size={14} />
      </symbol>
      <symbol id={DOCUMENT_ID}>
        <FileTextIcon size={14} />
      </symbol>
      <symbol id={STORY_ID}>
        <BookmarkSimpleIcon size={14} />
      </symbol>
      <symbol id={TEST_ID}>
        <FlaskIcon size={14} />
      </symbol>
      <symbol id={SUCCESS_ID}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.854 4.146a.5.5 0 010 .708l-5 5a.5.5 0 01-.708 0l-2-2a.5.5 0 11.708-.708L5.5 8.793l4.646-4.647a.5.5 0 01.708 0z"
          fill="currentColor"
        />
      </symbol>
      <symbol id={ERROR_ID}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7 4a3 3 0 100 6 3 3 0 000-6zM3 7a4 4 0 118 0 4 4 0 01-8 0z"
          fill="currentColor"
        />
      </symbol>
      <symbol id={WARNING_ID}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.206 3.044a.498.498 0 01.23.212l3.492 5.985a.494.494 0 01.006.507.497.497 0 01-.443.252H3.51a.499.499 0 01-.437-.76l3.492-5.984a.497.497 0 01.642-.212zM7 4.492L4.37 9h5.26L7 4.492z"
          fill="currentColor"
        />
      </symbol>
      <symbol id={DOT_ID}>
        <circle cx="3" cy="3" r="3" fill="currentColor" />
      </symbol>
      <symbol id={NEW_ID}>
        <rect x="6" y="3.5" width="2" height="7" rx="1" fill="currentColor" />
        <rect x="3.5" y="6" width="7" height="2" rx="1" fill="currentColor" />
      </symbol>
      <symbol id={MODIFIED_ID}>
        <circle cx="7" cy="7" r="3" fill="currentColor" />
      </symbol>
      <symbol id={AFFECTED_ID}>
        <circle cx="7" cy="7" r="3" fill="currentColor" />
      </symbol>
      <symbol id={REVIEWING_ID}>
        <path
          d="M7.052 3.004c.01 0 .02 0 .03.002.004 0 .01.003.015.004a.493.493 0 01.051.013l.043.015a.497.497 0 01.089.049l.03.023c.015.012.029.023.042.036.012.012.023.026.035.04l.023.03c.01.015.019.03.027.047.008.014.016.028.022.043.006.014.01.028.015.043.005.017.01.034.013.051l.005.017.03.182A3.5 3.5 0 0010.4 6.476l.182.03c.005 0 .01.003.016.004a.494.494 0 01.051.013l.043.015a.503.503 0 01.089.049l.03.023c.015.012.029.023.042.036.012.012.023.026.035.04l.023.03c.01.015.019.03.027.047.008.014.016.028.022.043l.014.04.014.054.005.017c.002.01 0 .019.001.028.002.018.004.036.004.054 0 .018-.002.035-.004.053v.03l-.006.015a.479.479 0 01-.013.051l-.015.043a.507.507 0 01-.049.089l-.023.03-.035.042-.042.035-.03.023a.503.503 0 01-.046.027c-.014.008-.028.016-.043.022-.014.006-.028.01-.043.015a.491.491 0 01-.051.013l-.016.005-.182.03A3.5 3.5 0 007.522 10.4l-.03.182c0 .005-.004.01-.005.016a.491.491 0 01-.013.051l-.015.043a.503.503 0 01-.049.089l-.023.03-.035.042-.041.035-.03.023a.507.507 0 01-.047.027c-.014.008-.028.016-.043.022-.014.006-.028.01-.043.015a.479.479 0 01-.051.013l-.016.005c-.01.002-.02 0-.03.001-.017.002-.034.004-.052.004-.018 0-.036-.002-.054-.004h-.028c-.006-.002-.011-.005-.017-.006a.503.503 0 01-.051-.013l-.043-.015a.505.505 0 01-.089-.049l-.03-.023c-.015-.012-.029-.023-.041-.035-.013-.013-.024-.027-.036-.042l-.023-.03a.503.503 0 01-.027-.046c-.008-.014-.016-.028-.022-.043-.006-.014-.01-.028-.015-.043a.494.494 0 01-.013-.051l-.004-.016-.03-.182a3.5 3.5 0 00-2.877-2.877l-.182-.03c-.006 0-.011-.004-.017-.005a.493.493 0 01-.051-.013l-.043-.015a.492.492 0 01-.089-.049l-.03-.023c-.015-.012-.029-.023-.041-.035-.013-.013-.024-.027-.036-.041l-.023-.03a.497.497 0 01-.027-.047c-.008-.014-.016-.028-.022-.043-.006-.013-.01-.028-.015-.043a.493.493 0 01-.013-.051l-.004-.016c-.002-.01-.001-.02-.002-.03C3.002 7.035 3 7.018 3 7c0-.018.002-.036.004-.054 0-.009 0-.019.002-.028 0-.006.003-.011.004-.017l.015-.054.013-.04a.498.498 0 01.049-.089l.023-.03.026-.032.02-.02.03-.025.03-.023a.498.498 0 01.047-.027c.014-.008.028-.016.043-.022.014-.006.028-.01.043-.015A.493.493 0 013.4 6.51l.017-.004.182-.03a3.5 3.5 0 002.877-2.877l.03-.182c0-.006.003-.011.004-.017a.493.493 0 01.013-.051l.015-.043a.498.498 0 01.049-.089l.023-.03.026-.032.02-.02.03-.025.03-.023a.498.498 0 01.047-.027c.014-.008.028-.016.043-.022.014-.006.028-.01.043-.015A.493.493 0 016.9 3.01l.017-.004c.01-.002.019-.001.028-.002C6.963 3.002 6.981 3 7 3c.018 0 .035.002.053.004z"
          fill="currentColor"
        />
      </symbol>
    </svg>
  );
};

export const UseSymbol: FC<{
  type:
    | 'group'
    | 'component'
    | 'document'
    | 'story'
    | 'test'
    | 'success'
    | 'error'
    | 'warning'
    | 'dot'
    | 'new'
    | 'reviewing'
    | 'modified'
    | 'affected';
}> = ({ type }) => {
  if (type === 'group') {
    return <use xlinkHref={`#${GROUP_ID}`} />;
  }

  if (type === 'component') {
    return <use xlinkHref={`#${COMPONENT_ID}`} />;
  }

  if (type === 'document') {
    return <use xlinkHref={`#${DOCUMENT_ID}`} />;
  }

  if (type === 'story') {
    return <use xlinkHref={`#${STORY_ID}`} />;
  }

  if (type === 'test') {
    return <use xlinkHref={`#${TEST_ID}`} />;
  }

  if (type === 'success') {
    return <use xlinkHref={`#${SUCCESS_ID}`} />;
  }

  if (type === 'error') {
    return <use xlinkHref={`#${ERROR_ID}`} />;
  }

  if (type === 'warning') {
    return <use xlinkHref={`#${WARNING_ID}`} />;
  }

  if (type === 'dot') {
    return <use xlinkHref={`#${DOT_ID}`} />;
  }

  if (type === 'new') {
    return <use xlinkHref={`#${NEW_ID}`} />;
  }

  if (type === 'reviewing') {
    return <use xlinkHref={`#${REVIEWING_ID}`} />;
  }

  if (type === 'modified') {
    return <use xlinkHref={`#${MODIFIED_ID}`} />;
  }

  if (type === 'affected') {
    return <use xlinkHref={`#${AFFECTED_ID}`} />;
  }

  return null;
};
