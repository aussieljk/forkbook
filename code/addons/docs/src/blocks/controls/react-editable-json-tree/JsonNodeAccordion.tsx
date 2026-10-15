import type { ComponentPropsWithoutRef } from 'react';
import React from 'react';

import { clsx } from 'clsx';

import styles from './JsonNodeAccordion.module.css';

type AccordionProps = {
  name: string;
  keyPath: string[];
  collapsed: boolean;
  deep: number;
} & ComponentPropsWithoutRef<'button'>;

export function JsonNodeAccordion({
  children,
  name,
  collapsed,
  keyPath,
  deep,
  className,
  ...props
}: AccordionProps) {
  const parentPropertyName = keyPath.at(-1) ?? 'root';

  const accordionKey = `${parentPropertyName}-${name}-${deep}`;

  const ids = {
    trigger: `${accordionKey}-trigger`,
    region: `${accordionKey}-region`,
  };

  const Container = keyPath.length > 0 ? 'li' : 'div';

  return (
    <Container className={styles.container}>
      <button
        type="button"
        aria-expanded={!collapsed}
        id={ids.trigger}
        aria-controls={ids.region}
        className={clsx(styles.trigger, 'rejt-accordion-button', className)}
        {...props}
      >
        {name} :
      </button>
      <div
        role="group"
        id={ids.region}
        aria-labelledby={ids.trigger}
        className={clsx(styles.region, 'rejt-accordion-region')}
      >
        {children}
      </div>
    </Container>
  );
}
