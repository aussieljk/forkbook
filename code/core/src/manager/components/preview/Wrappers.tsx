import type { FC, PropsWithChildren } from 'react';
import React, { Fragment } from 'react';

import { Addon_TypesEnum } from '@aussieljk/forkbook/internal/types';
import type { Addon_WrapperType } from '@aussieljk/forkbook/internal/types';

import type { ApplyWrappersProps } from './utils/types.tsx';
import styles from './Wrappers.module.css';

export const ApplyWrappers: FC<PropsWithChildren<ApplyWrappersProps>> = ({
  wrappers,
  id,
  storyId,
  children,
}) => {
  return (
    <Fragment>
      {wrappers.reduceRight(
        (acc, wrapper, index) => (
          <wrapper.render {...{ index, children: acc, id, storyId }} />
        ),
        children
      )}
    </Fragment>
  );
};

export const defaultWrappers: Addon_WrapperType[] = [
  {
    id: 'iframe-wrapper',
    type: Addon_TypesEnum.PREVIEW,
    render: (p) => (
      <div className={styles.iframeWrapper} id="storybook-preview-wrapper">
        {p.children}
      </div>
    ),
  },
];
