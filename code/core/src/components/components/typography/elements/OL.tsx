import { withClassName } from '../lib/withClassName.tsx';
import { withMargin, withReset } from '../lib/common.tsx';
import styles from './OL.module.css';

export const OL = withClassName('ol', withReset, withMargin, styles.ol);
