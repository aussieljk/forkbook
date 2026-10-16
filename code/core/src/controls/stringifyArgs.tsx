export const stringifyArgs = (args: Record<string, any>) =>
  JSON.stringify(args, (_, value) => {
    if (typeof value === 'function') {
      return '__fb_empty_function_arg__';
    }
    return value;
  });
