export interface PrintResultType {
  code: string;
  /** The source map from recast. */
  map?: object;
  toString(): string;
}
