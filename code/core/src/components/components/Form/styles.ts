import styles from './styles.module.css';

export type Sizes = '100%' | 'flex' | 'auto';
export type Alignments = 'end' | 'center' | 'start';
export type ValidationStates = 'valid' | 'error' | 'warn';

/** The class names of the shared input styles: `control` for text inputs, `size` for the `size` prop. */
export const { control: controlClassName, size: sizeClassName } = styles;
