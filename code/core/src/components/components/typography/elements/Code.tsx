import type { ComponentProps } from 'react';
import React, { Children } from 'react';

import { clsx } from 'clsx';

import { SyntaxHighlighter } from '../../syntaxhighlighter/syntaxhighlighter.tsx';
import { codeCommon } from '../lib/common.tsx';
import { isReactChildString } from '../lib/isReactChildString.tsx';
import styles from './Code.module.css';

const isInlineCodeRegex = /[\n\r]/g;

export const Code = ({ className, children, ...props }: ComponentProps<'code'>) => {
  const language = (className || '').match(/lang-(\S+)/);
  const childrenArray = Children.toArray(children);
  const isInlineCode = !childrenArray
    .filter(isReactChildString)
    .some((child) => child.match(isInlineCodeRegex));

  if (isInlineCode) {
    return (
      <code {...props} className={clsx(codeCommon, styles.inlineCode, className)}>
        {childrenArray}
      </code>
    );
  }

  return (
    <SyntaxHighlighter
      className={styles.codeBlock}
      bordered
      copyable
      language={language?.[1] ?? 'text'}
      format={false}
      {...props}
    >
      {children}
    </SyntaxHighlighter>
  );
};
