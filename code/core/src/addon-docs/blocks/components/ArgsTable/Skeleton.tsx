import type { FC } from 'react';
import React from 'react';

import styles from './Skeleton.module.css';

const SkeletonText = ({ width }: { width: string }) => (
  <div className={styles.skeletonText} style={{ width }} />
);

export const Skeleton: FC = () => (
  <div className={styles.tableWrapper}>
    <div className={styles.row}>
      <div className={styles.column} data-position="first">
        <SkeletonText width="60%" />
      </div>
      <div className={styles.column} data-position="second">
        <SkeletonText width="30%" />
      </div>
      <div className={styles.column} data-position="third">
        <SkeletonText width="60%" />
      </div>
      <div className={styles.column} data-position="last">
        <SkeletonText width="60%" />
      </div>
    </div>
    <div className={styles.row}>
      <div className={styles.column} data-position="first">
        <SkeletonText width="60%" />
      </div>
      <div className={styles.column} data-position="second">
        <SkeletonText width="80%" />
        <SkeletonText width="30%" />
      </div>
      <div className={styles.column} data-position="third">
        <SkeletonText width="60%" />
      </div>
      <div className={styles.column} data-position="last">
        <SkeletonText width="60%" />
      </div>
    </div>
    <div className={styles.row}>
      <div className={styles.column} data-position="first">
        <SkeletonText width="60%" />
      </div>
      <div className={styles.column} data-position="second">
        <SkeletonText width="80%" />
        <SkeletonText width="30%" />
      </div>
      <div className={styles.column} data-position="third">
        <SkeletonText width="60%" />
      </div>
      <div className={styles.column} data-position="last">
        <SkeletonText width="60%" />
      </div>
    </div>
    <div className={styles.row}>
      <div className={styles.column} data-position="first">
        <SkeletonText width="60%" />
      </div>
      <div className={styles.column} data-position="second">
        <SkeletonText width="80%" />
        <SkeletonText width="30%" />
      </div>
      <div className={styles.column} data-position="third">
        <SkeletonText width="60%" />
      </div>
      <div className={styles.column} data-position="last">
        <SkeletonText width="60%" />
      </div>
    </div>
  </div>
);
