import { withClassName } from '../lib/withClassName.tsx';
import { withReset } from '../lib/common.tsx';
import styles from './Span.module.css';

export const Span = withClassName('span', withReset, styles.span);
