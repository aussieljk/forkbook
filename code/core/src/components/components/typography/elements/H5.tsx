import { withClassName } from '../lib/withClassName.tsx';
import { headerCommon, withReset } from '../lib/common.tsx';
import styles from './H5.module.css';

export const H5 = withClassName('h5', withReset, headerCommon, styles.h5);
