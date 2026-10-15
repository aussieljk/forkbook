import { withClassName } from '../lib/withClassName.tsx';
import { withMargin, withReset } from '../lib/common.tsx';
import styles from './P.module.css';

export const P = withClassName('p', withReset, withMargin, styles.p);
