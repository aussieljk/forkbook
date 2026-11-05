import type { ComponentProps } from 'react';
import React from 'react';

import { fn } from '@aussieljk/forkbook/test';

import { Field as FieldComponent } from './Field.tsx';
import { Input as InputComponent } from './Input.tsx';
import { Select as SelectComponent } from './Select.tsx';
import { Textarea as TextareaComponent } from './Textarea.tsx';

export default {
  title: 'Form/Field',
  component: FieldComponent,
  args: {
    label: 'Label',
  },
};

export const Input = {
  render: (args: ComponentProps<typeof FieldComponent>) => (
    <FieldComponent {...args}>
      <InputComponent value="Text" onChange={fn().mockName('onChange')} />
    </FieldComponent>
  ),
};

export const Select = {
  render: (args: ComponentProps<typeof FieldComponent>) => (
    <FieldComponent {...args}>
      <SelectComponent value="val2" onChange={fn().mockName('onChange')}>
        <option value="val1">Value 1</option>
        <option value="val2">Value 2</option>
        <option value="val3">Value 3</option>
      </SelectComponent>
    </FieldComponent>
  ),
};

export const Textarea = {
  render: (args: ComponentProps<typeof FieldComponent>) => (
    <FieldComponent {...args}>
      <TextareaComponent value="Content" onChange={fn().mockName('onChange')} />
    </FieldComponent>
  ),
};
