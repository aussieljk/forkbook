import React, { type ComponentProps, forwardRef } from 'react';

import { clsx } from 'clsx';

import { Button } from '../Button/Button.tsx';
import { Checkbox } from './Checkbox.tsx';
import { Field } from './Field.tsx';
import { Input } from './Input.tsx';
import { Radio } from './Radio.tsx';
import { Select } from './Select.tsx';
import { Textarea } from './Textarea.tsx';
import styles from './Form.module.css';

const FormRoot = forwardRef<HTMLFormElement, ComponentProps<'form'>>(
  ({ className, ...props }, ref) => (
    <form ref={ref} className={clsx(styles.form, className)} {...props} />
  )
);
FormRoot.displayName = 'Form';

export const Form = Object.assign(FormRoot, {
  Field,
  Input,
  Select,
  Textarea,
  Button,
  Checkbox,
  Radio,
});
