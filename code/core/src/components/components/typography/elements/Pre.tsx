import { withClassName } from '../lib/withClassName.tsx';
import { withMargin, withReset } from '../lib/common.tsx';
import styles from './Pre.module.css';

export const Pre = withClassName('pre', withReset, withMargin, styles.pre);
