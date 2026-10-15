import { withClassName } from '../lib/withClassName.tsx';
import { headerCommon, withReset } from '../lib/common.tsx';
import styles from './H3.module.css';

export const H3 = withClassName('h3', withReset, headerCommon, styles.h3);
