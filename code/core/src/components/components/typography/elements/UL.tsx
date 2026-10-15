import { withClassName } from '../lib/withClassName.tsx';
import { withMargin, withReset } from '../lib/common.tsx';
import styles from './UL.module.css';

export const UL = withClassName('ul', withReset, withMargin, styles.ul);
