export interface BuilderStats {
  //
  toJson: () => unknown;
}

export type Builder_WithRequiredProperty<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};

export type Builder_Unpromise<T extends Promise<unknown>> = T extends Promise<infer U> ? U : never;

export type Builder_EnvsRaw = Record<string, string>;
