import type { ComponentProps, FC } from 'react';
import React from 'react';

import { clsx } from 'clsx';
import Markdown from 'markdown-to-jsx';

import type { JsDocTags } from './types';
import styles from './ArgJsDoc.module.css';

interface ArgJsDocArgs {
  tags: JsDocTags;
}

export const Table = ({ className, ...props }: ComponentProps<'table'>) => (
  <table className={clsx(styles.table, className)} {...props} />
);

export const ArgJsDoc: FC<ArgJsDocArgs> = ({ tags }) => {
  const params = (tags.params || []).filter((x) => x.description);
  const hasDisplayableParams = params.length !== 0;
  const hasDisplayableDeprecated = tags.deprecated != null;
  const hasDisplayableReturns = tags.returns != null && tags.returns.description != null;

  if (!hasDisplayableParams && !hasDisplayableReturns && !hasDisplayableDeprecated) {
    return null;
  }

  return (
    <>
      <Table>
        <tbody>
          {hasDisplayableDeprecated && (
            <tr key="deprecated">
              <td colSpan={2}>
                <strong>Deprecated</strong>: {tags.deprecated?.toString()}
              </td>
            </tr>
          )}
          {hasDisplayableParams &&
            params.map((x) => {
              return (
                <tr key={x.name}>
                  <td>
                    <code>{x.name}</code>
                  </td>
                  <td>{x.description && <Markdown>{x.description}</Markdown>}</td>
                </tr>
              );
            })}
          {hasDisplayableReturns && (
            <tr key="returns">
              <td>
                <code>Returns</code>
              </td>
              <td>
                {tags.returns?.description && <Markdown>{tags.returns.description}</Markdown>}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
};
