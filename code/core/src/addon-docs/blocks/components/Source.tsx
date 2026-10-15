import type { ComponentProps, FunctionComponent } from 'react';
import React from 'react';

import type { SupportedLanguage, SyntaxHighlighterProps } from 'storybook/internal/components';
import { SyntaxHighlighter } from 'storybook/internal/components';

import { clsx } from 'clsx';
import { ThemeProvider, convert, themes, useTheme } from 'storybook/theming';

import { EmptyBlock } from './EmptyBlock';
import { SnippetWarning } from './SnippetWarning';
import styles from './Source.module.css';

const StyledSyntaxHighlighter: FunctionComponent<SyntaxHighlighterProps> = ({
  className,
  ...props
}) => <SyntaxHighlighter className={clsx(styles.syntaxHighlighter, className)} {...props} />;

export enum SourceError {
  NO_STORY = 'There\u2019s no story here.',
  SOURCE_UNAVAILABLE = 'Oh no! The source is not available.',
}

export interface SourceCodeProps {
  /** The language the syntax highlighter uses for your story’s code */
  language?: SupportedLanguage;
  /** Use this to override the content of the source block. */
  code?: string;
  /** The formatter the syntax highlighter uses for your story’s code. */
  format?: ComponentProps<typeof SyntaxHighlighter>['format'];
  /** Display the source snippet in a dark mode. */
  dark?: boolean;
  /** Whether to show the copy button. Defaults to true. */
  copyable?: boolean;
}

export interface SourceProps extends SourceCodeProps {
  isLoading?: boolean;
  error?: SourceError;
  /** Why the snippet is an incomplete example, when it is one; see `StoryDoc.warning`. */
  warning?: string;
  /** Replaces the `docblock-source` class names of the code block. */
  className?: string;
}

const SourceSkeleton = () => (
  <div className={styles.skeletonWrapper}>
    <div className={styles.skeletonPlaceholder} />
    <div className={styles.skeletonPlaceholder} style={{ width: '80%' }} />
    <div className={styles.skeletonPlaceholder} style={{ width: '30%' }} />
    <div className={styles.skeletonPlaceholder} style={{ width: '80%' }} />
  </div>
);

/** Syntax-highlighted source code for a component (or anything!) */
const Source: FunctionComponent<SourceProps> = ({
  isLoading,
  error,
  language,
  code,
  dark,
  format = true,
  copyable = true,
  warning,
  ...rest
}) => {
  const { typography } = useTheme();
  if (isLoading) {
    return <SourceSkeleton />;
  }
  if (error) {
    return <EmptyBlock>{error}</EmptyBlock>;
  }

  const highlighter = (
    <StyledSyntaxHighlighter
      bordered
      copyable={copyable}
      format={format}
      language={language ?? 'jsx'}
      className="docblock-source sb-unstyled"
      {...rest}
    >
      {code}
    </StyledSyntaxHighlighter>
  );

  const syntaxHighlighter = warning ? (
    <div className={styles.sourceWrapper}>
      {highlighter}
      <SnippetWarning className={styles.snippetWarning} warning={warning} />
    </div>
  ) : (
    highlighter
  );
  if (typeof dark === 'undefined') {
    return syntaxHighlighter;
  }
  const overrideTheme = dark ? themes.dark : themes.light;
  return (
    <ThemeProvider
      theme={convert({
        ...overrideTheme,
        fontCode: typography.fonts.mono,
        fontBase: typography.fonts.base,
      })}
    >
      {syntaxHighlighter}
    </ThemeProvider>
  );
};

export { Source, StyledSyntaxHighlighter };
