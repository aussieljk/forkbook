import { withClassName } from '../lib/withClassName.tsx';
import { withReset } from '../lib/common.tsx';
import styles from './LI.module.css';

export const LI = withClassName('li', withReset, styles.li);
