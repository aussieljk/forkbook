import type { ReactNode } from 'react';

export type SyntaxHighlighterFormatTypes = boolean | 'dedent';

/** A sugar-high language name, alias or file extension, such as `tsx`, `css` or `bash`. */
export type SupportedLanguage = string;

export interface SyntaxHighlighterProps {
  children?: ReactNode;
  language?: SupportedLanguage;
  copyable?: boolean;
  bordered?: boolean;
  padded?: boolean;
  format?: SyntaxHighlighterFormatTypes;
  formatter?: (type: SyntaxHighlighterFormatTypes, source: string) => Promise<string>;
  className?: string;
  showLineNumbers?: boolean;
  wrapLongLines?: boolean;
}
