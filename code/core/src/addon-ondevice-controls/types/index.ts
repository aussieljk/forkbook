import TextType from './Text.tsx';
import NumberType from './Number.tsx';
import ColorType from './Color.tsx';
import BooleanType from './Boolean.tsx';
import ObjectType from './Object.tsx';
import SelectType from './Select.tsx';
import DateType from './Date.tsx';
import ArrayType from './Array.tsx';
import RadioType from './Radio.tsx';
import { ControlTypes } from '../sharedTypes.ts';

export default {
  text: TextType,
  number: NumberType,
  color: ColorType,
  boolean: BooleanType,
  object: ObjectType,
  select: SelectType,
  date: DateType,
  array: ArrayType,
  radio: RadioType,
  'inline-radio': RadioType,
  'multi-select': SelectType,
  range: NumberType,
} satisfies Record<ControlTypes, React.ComponentType<any>>;
