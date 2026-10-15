import { withClassName } from '../lib/withClassName.tsx';
import { headerCommon, withReset } from '../lib/common.tsx';
import styles from './H2.module.css';

export const H2 = withClassName('h2', withReset, headerCommon, styles.h2);
