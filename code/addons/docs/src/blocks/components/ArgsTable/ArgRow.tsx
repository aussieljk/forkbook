import type { FC } from 'react';
import React from 'react';

import Markdown from 'markdown-to-jsx';

import type { ArgControlProps } from './ArgControl';
import { ArgControl } from './ArgControl';
import { ArgJsDoc } from './ArgJsDoc';
import { ArgValue } from './ArgValue';
import type { ArgType, Args, TableAnnotation } from './types';
import styles from './ArgRow.module.css';

interface ArgRowProps {
  row: ArgType;
  arg: any;
  updateArgs?: (args: Args) => void;
  compact?: boolean;
  expandable?: boolean;
  initialExpandedArgs?: boolean;
  storyId?: string;
  controlsId?: string;
  docsLang?: string;
}

const toSummary = (value: any) => {
  if (!value) {
    return value;
  }
  const val = typeof value === 'string' ? value : value.name;
  return { summary: val };
};

export const ArgRow: FC<ArgRowProps> = (props) => {
  const { row, updateArgs, compact, expandable, initialExpandedArgs, docsLang } = props;
  const { name, description } = row;
  const table = (row.table || {}) as TableAnnotation;
  const type = table.type || toSummary(row.type);
  const defaultValue = table.defaultValue;
  const required = row.type?.required;
  const hasDescription = description != null && description !== '';

  return (
    <tr className={styles.row}>
      <td className={styles.nameCell} data-expandable={expandable || undefined}>
        <span className={styles.name}>{name}</span>
        {required ? (
          <span className={styles.required} aria-hidden title="Required">
            *
          </span>
        ) : null}
      </td>
      {compact ? null : (
        <td>
          {hasDescription && (
            <div className={styles.description} lang={docsLang}>
              <Markdown>{description}</Markdown>
            </div>
          )}
          {table.jsDocTags != null ? (
            <>
              <div
                className={styles.typeWithJsDoc}
                data-has-description={hasDescription || undefined}
              >
                <ArgValue value={type} initialExpandedArgs={initialExpandedArgs} />
              </div>
              <ArgJsDoc tags={table.jsDocTags} />
            </>
          ) : (
            <div className={styles.type} data-has-description={hasDescription || undefined}>
              <ArgValue value={type} initialExpandedArgs={initialExpandedArgs} />
            </div>
          )}
        </td>
      )}
      {compact ? null : (
        <td>
          <ArgValue value={defaultValue} initialExpandedArgs={initialExpandedArgs} />
        </td>
      )}
      {updateArgs ? (
        <td>
          <ArgControl {...(props as ArgControlProps)} isRequired={!!required} />
        </td>
      ) : null}
    </tr>
  );
};
