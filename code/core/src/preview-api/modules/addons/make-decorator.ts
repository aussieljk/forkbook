import type {
  Addon_LegacyStoryFn,
  Addon_StoryContext,
  Addon_StoryWrapper,
} from '@aussieljk/forkbook/internal/types';

// The result is a decorator or a function that makes one, so callers can use it either way.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MakeDecoratorResult = (...args: any) => any;

export interface MakeDecoratorOptions {
  name: string;
  parameterName: string;
  skipIfNoParametersOrOptions?: boolean;
  wrapper: Addon_StoryWrapper;
}

/**
 * Creates a Forkbook decorator function that can be used to wrap stories with additional
 * functionality.
 *
 * @example
 *
 * ```jsx
 * const myDecorator = makeDecorator({
 *   name: 'My Decorator',
 *   parameterName: 'myDecorator',
 *   wrapper: (storyFn, context, { options }) => {
 *     const { myOption } = options;
 *     <div style={{ backgroundColor: myOption }}>{storyFn()}</div>;
 *   },
 * });
 *
 * export const decorators = [myDecorator];
 * ```
 *
 * @param {MakeDecoratorOptions} options - The options for the decorator.
 * @param {string} options.name - The name of the decorator.
 * @param {string} options.parameterName - The name of the parameter that will be used to pass
 *   options to the decorator.
 * @param {Addon_StoryWrapper} options.wrapper - The function that will be used to wrap the story.
 * @param {boolean} [options.skipIfNoParametersOrOptions=false] - Whether to skip the decorator if
 *   no options or parameters are provided. Default is `false`
 * @returns {MakeDecoratorResult} A function that can be used as a Forkbook decorator.
 */
export const makeDecorator = ({
  name,
  parameterName,
  wrapper,
  skipIfNoParametersOrOptions = false,
}: MakeDecoratorOptions): MakeDecoratorResult => {
  const decorator =
    (options?: object) => (storyFn: Addon_LegacyStoryFn, context: Addon_StoryContext) => {
      const parameters = context.parameters && context.parameters[parameterName];

      if (parameters && parameters.disable) {
        return storyFn(context);
      }

      if (skipIfNoParametersOrOptions && !options && !parameters) {
        return storyFn(context);
      }

      return wrapper(storyFn, context, {
        options: options as object,
        parameters,
      });
    };

  return (...args: unknown[]) => {
    // Used without options as .addDecorator(decorator)
    if (typeof args[0] === 'function') {
      return decorator()(args[0] as Addon_LegacyStoryFn, args[1] as Addon_StoryContext);
    }

    return (...innerArgs: unknown[]) => {
      const storyFn = innerArgs[0] as Addon_LegacyStoryFn;
      const context = innerArgs[1] as Addon_StoryContext;
      // Used as [.]addDecorator(decorator(options))
      if (innerArgs.length > 1) {
        // Used as [.]addDecorator(decorator(option1, option2))
        if (args.length > 1) {
          return decorator(args)(storyFn, context);
        }
        return decorator(args[0] as object | undefined)(storyFn, context);
      }

      throw new Error(
        `Passing stories directly into ${name}() is not allowed,
        instead use addDecorator(${name}) and pass options with the '${parameterName}' parameter`
      );
    };
  };
};
