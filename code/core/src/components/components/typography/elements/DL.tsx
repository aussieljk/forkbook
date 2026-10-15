import { withClassName } from '../lib/withClassName.tsx';
import { withMargin, withReset } from '../lib/common.tsx';
import styles from './DL.module.css';

export const DL = withClassName('dl', withReset, withMargin, styles.dl);
