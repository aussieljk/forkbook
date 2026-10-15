import React, { useEffect, useMemo, useState } from 'react';

import { clsx } from 'clsx';
import { highlight } from 'sugar-high';
import { lang } from 'sugar-high/lang';

import { ActionBar } from '../ActionBar/ActionBar.tsx';
import { ScrollArea } from '../ScrollArea/ScrollArea.tsx';
import { useCopyButton } from '../../../shared/useCopyButton.ts';
import { formatter as defaultFormatter } from './formatter.ts';
import type { SyntaxHighlighterProps } from './syntaxhighlighter-types.ts';
import styles from './syntaxhighlighter.module.css';

export interface WrapperProps {
  bordered?: boolean;
  padded?: boolean;
  showLineNumbers?: boolean;
}

export const SyntaxHighlighter = ({
  children,
  language = 'jsx',
  copyable = false,
  bordered = false,
  padded = false,
  format = true,
  formatter = defaultFormatter,
  className = undefined,
  showLineNumbers = false,
  wrapLongLines = false,
}: SyntaxHighlighterProps) => {
  const [code, setCode] = useState('');

  useEffect(() => {
    if (typeof children === 'string') {
      formatter(format, children).then((formatted) => setCode(formatted.trim()));
    }
  }, [children, format, formatter]);

  const html = useMemo(
    () => highlight(code, { lang: lang(language) ?? 'plaintext' }),
    [code, language]
  );

  const { children: copyChildren, buttonProps: copyButtonProps } = useCopyButton<string>({
    content: code,
  });

  if (typeof children !== 'string' || !children.trim()) {
    return null;
  }

  return (
    <div className={clsx(styles.wrapper, className)} data-bordered={bordered || undefined}>
      <ScrollArea horizontal vertical focusable className={styles.scroller}>
        <pre
          className={clsx(styles.pre, `language-${language}`)}
          data-padded={padded || bordered || undefined}
          data-line-numbers={showLineNumbers || undefined}
          data-wrap={wrapLongLines || undefined}
        >
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </ScrollArea>

      {copyable ? (
        <ActionBar
          actionItems={[
            {
              title: copyChildren,
              onClick: copyButtonProps.onClick,
            },
          ]}
          flexLayout
        />
      ) : null}
    </div>
  );
};

export default SyntaxHighlighter;
