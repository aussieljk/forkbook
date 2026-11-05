import type { types as t } from '@aussieljk/forkbook/internal/babel';

import { dedent } from 'ts-dedent';

export const formatLocation = (node: t.Node | null | undefined, fileName?: string) => {
  const loc = node?.loc ? `(line ${node.loc.start.line}, col ${node.loc.start.column})` : '';
  return `${fileName || ''} ${loc}`.trim();
};

const metaErrorMessage = (message: string, node: t.Node, fileName?: string) => dedent`
  CSF: ${message.trim()} ${formatLocation(node, fileName)}

  More info: https://forkbook.ljk.dev/docs/writing-stories#default-export
`;

export class NoMetaError extends Error {
  constructor(message: string, ast: t.Node, fileName?: string) {
    super(metaErrorMessage(message, ast, fileName));
    this.name = this.constructor.name;
  }
}

export class MultipleMetaError extends Error {
  constructor(message: string, ast: t.Node, fileName?: string) {
    super(metaErrorMessage(message, ast, fileName));
    this.name = this.constructor.name;
  }
}

export class MixedFactoryError extends Error {
  constructor(message: string, ast: t.Node, fileName?: string) {
    super(metaErrorMessage(message, ast, fileName));
    this.name = this.constructor.name;
  }
}

export class BadMetaError extends Error {
  constructor(message: string, ast: t.Node, fileName?: string) {
    super(metaErrorMessage(message, ast, fileName));
    this.name = this.constructor.name;
  }
}
