import { withClassName } from '../lib/withClassName.tsx';
import { headerCommon, withReset } from '../lib/common.tsx';
import styles from './H4.module.css';

export const H4 = withClassName('h4', withReset, headerCommon, styles.h4);
