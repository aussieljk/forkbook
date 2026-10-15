import React, { useEffect, useMemo, useState } from 'react';

import { styled } from 'storybook/theming';
import { highlight } from 'sugar-high';
import { lang } from 'sugar-high/lang';

import { ActionBar } from '../ActionBar/ActionBar.tsx';
import type { ScrollAreaProps } from '../ScrollArea/ScrollArea.tsx';
import { ScrollArea } from '../ScrollArea/ScrollArea.tsx';
import { useCopyButton } from '../../../shared/useCopyButton.ts';
import { formatter as defaultFormatter } from './formatter.ts';
import type { SyntaxHighlighterProps } from './syntaxhighlighter-types.ts';

export interface WrapperProps {
  bordered?: boolean;
  padded?: boolean;
  showLineNumbers?: boolean;
}

const Wrapper = styled.div<WrapperProps>(
  ({ theme }) => ({
    position: 'relative',
    display: 'flex',
    flexWrap: 'wrap',
    overflow: 'hidden',
    color: theme.color.defaultText,
    colorScheme: theme.base,
  }),
  ({ theme, bordered }) =>
    bordered
      ? {
          border: `1px solid ${theme.appBorderColor}`,
          borderRadius: theme.borderRadius,
          background: theme.background.content,
        }
      : {}
);

const UnstyledScroller = ({ children, className }: ScrollAreaProps) => (
  <ScrollArea horizontal vertical focusable className={className}>
    {children}
  </ScrollArea>
);
const Scroller = styled(UnstyledScroller)({
  flex: 1,
  flexShrink: 0,
  flexBasis: 'fit-content',
  maxWidth: '100%',
});

interface PreProps {
  padded?: boolean;
  showLineNumbers?: boolean;
  wrapLongLines?: boolean;
}

const Pre = styled.pre<PreProps>(({ theme, padded, showLineNumbers, wrapLongLines }) => ({
  ...theme.code,
  margin: 0,
  padding: padded ? theme.layoutMargin : 0,
  paddingRight: theme.layoutMargin,
  fontFamily: theme.typography.fonts.mono,
  whiteSpace: wrapLongLines ? 'pre-wrap' : 'pre',
  counterReset: 'sh-line',

  '.sh__line': {
    display: 'block',
  },
  '.sh__token--comment': {
    fontStyle: 'italic',
  },
  ...(showLineNumbers && {
    '.sh__line::before': {
      counterIncrement: 'sh-line',
      content: 'counter(sh-line)',
      display: 'inline-block',
      minWidth: '2.25em',
      paddingRight: '1em',
      textAlign: 'right',
      opacity: 0.5,
    },
  }),
}));

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
    <Wrapper bordered={bordered} padded={padded} className={className}>
      <Scroller>
        <Pre
          padded={padded || bordered}
          showLineNumbers={showLineNumbers}
          wrapLongLines={wrapLongLines}
          className={`language-${language}`}
        >
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </Pre>
      </Scroller>

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
    </Wrapper>
  );
};

export default SyntaxHighlighter;
