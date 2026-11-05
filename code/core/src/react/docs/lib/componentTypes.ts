/** Reads a field of a value whose shape is not known, such as a React element type. */
export const field = (value: unknown, key: string): unknown =>
  value == null ? undefined : Reflect.get(Object(value), key);

export const isMemo = (component: unknown) =>
  field(component, '$$typeof') === Symbol.for('react.memo');
export const isForwardRef = (component: unknown) =>
  field(component, '$$typeof') === Symbol.for('react.forward_ref');
