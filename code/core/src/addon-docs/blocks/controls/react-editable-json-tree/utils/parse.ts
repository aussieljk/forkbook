/**
 * Parse.
 *
 * @param string {String} string to parse
 * @returns {unknown} The parsed value, or the string when it is not JSON
 */
export function parse(string: string) {
  let result = string;

  // Check if string contains 'function' and start with it to eval it
  if (result.indexOf('function') === 0) {
    return (0, eval)(`(${result})`);
  }

  try {
    result = JSON.parse(string);
  } catch (e) {
    // Error
  }
  return result;
}
