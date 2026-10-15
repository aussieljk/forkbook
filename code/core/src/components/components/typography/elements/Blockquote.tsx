import { withClassName } from '../lib/withClassName.tsx';
import { withMargin, withReset } from '../lib/common.tsx';
import styles from './Blockquote.module.css';

export const Blockquote = withClassName('blockquote', withReset, withMargin, styles.blockquote);
