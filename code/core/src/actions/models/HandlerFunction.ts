// A handler stands in for any callback prop, so it must fit every function type, including ones
// with typed parameters and a return value. Only `any` allows that.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HandlerFunction = (...args: any[]) => any;
