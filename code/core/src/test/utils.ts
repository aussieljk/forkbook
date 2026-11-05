export type Promisify<Fn> = Fn extends { <T>(...args: infer Args): infer Return }
  ? { <T>(...args: Args): Return extends Promise<unknown> ? Return : Promise<Return> }
  : Fn extends { (...args: infer Args): infer Return }
    ? { (...args: Args): Return extends Promise<unknown> ? Return : Promise<Return> }
    : Fn;

export type PromisifyObject<O> = { [K in keyof O]: Promisify<O[K]> };
