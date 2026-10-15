import { withClassName } from '../lib/withClassName.tsx';
import { headerCommon, withReset } from '../lib/common.tsx';
import styles from './H6.module.css';

export const H6 = withClassName('h6', withReset, headerCommon, styles.h6);
