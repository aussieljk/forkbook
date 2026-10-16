const UNITS = ['h', 'min', 's', 'ms', 'μs', 'ns'];

/**
 * Formats a `process.hrtime()` duration in its largest unit that is 1 or more, for example
 * `1.25 s` or `340 ms`. A value under 10 gets up to two decimals.
 */
export function prettyTime([seconds, nanoseconds]: [number, number]): string {
  const values = [
    seconds / 3600,
    (seconds % 3600) / 60,
    (seconds % 60) + nanoseconds / 1e9,
    nanoseconds / 1e6,
    (nanoseconds % 1e6) / 1e3,
    nanoseconds % 1e3,
  ];
  const index = values.findIndex((value) => value >= 1);
  if (index === -1) {
    return '';
  }
  const value = values[index];
  return `${Number(value.toFixed(value >= 10 ? 0 : 2))} ${UNITS[index]}`;
}
