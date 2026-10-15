import { withClassName } from '../lib/withClassName.tsx';
import { headerCommon, withReset } from '../lib/common.tsx';
import styles from './H1.module.css';

export const H1 = withClassName('h1', withReset, headerCommon, styles.h1);
