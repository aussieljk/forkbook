/** A segment name, or a `[param, value]` pair for a dynamic segment. */
export type RouteSegment = string | [string, string | string[]];

export type RouteParams = {
  pathname: string;
  query: Record<string, string>;
  segments?: RouteSegment[];
  [key: string]: unknown;
};

export type NextAppDirectory = boolean;
