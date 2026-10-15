import { withClassName } from '../lib/withClassName.tsx';
import { withMargin, withReset } from '../lib/common.tsx';
import styles from './Table.module.css';

export const Table = withClassName('table', withReset, withMargin, styles.table);
