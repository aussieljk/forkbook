import type { ReactElement, ReactNode } from 'react';
import React, { createElement, isValidElement } from 'react';

import { logger } from '@aussieljk/forkbook/internal/client-logger';
import { SourceType, getDocgenSection } from '@aussieljk/forkbook/internal/docs-tools';
import type {
  PartialStoryFn,
  StoryContext,
  StoryContextForRender,
} from '@aussieljk/forkbook/internal/types';

import type { Options } from 'react-element-to-jsx-string';
// Import the ESM build: our bundling prefers the `browser` field, but that yields CJS.
// `react/typings.d.ts` declares the types of this path.
import reactElementToJSXString from 'react-element-to-jsx-string/dist/esm/index.js';
import { emitTransformCode, useEffect, useRef } from '@aussieljk/forkbook/preview-api';

import type { ReactRenderer } from '../types';
import { field, isForwardRef, isMemo } from './lib/componentTypes';

const toPascalCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Converts a React symbol to a React-like displayName
 *
 * Symbols come from here
 * https://github.com/facebook/react/blob/338dddc089d5865761219f02b5175db85c54c489/packages/react-devtools-shared/src/backend/ReactSymbols.js
 *
 * @example
 *
 * ```
 * Symbol(react.suspense) -> React.Suspense
 * Symbol(react.strict_mode) -> React.StrictMode
 * Symbol(react.server_context.defaultValue) -> React.ServerContext.DefaultValue
 * ```
 *
 * @param {Symbol} elementType - The symbol to convert
 * @returns {string | null} A displayName for the Symbol in case elementType is a Symbol; otherwise,
 *   null.
 */
export const getReactSymbolName = (elementType: unknown): string => {
  const elementName = field(elementType, '$$typeof') || elementType;
  const symbolDescription = String(elementName).replace(/^Symbol\((.*)\)$/, '$1');

  const reactComponentName = symbolDescription
    .split('.')
    .map((segment) => {
      // Split segment by underscore to handle cases like 'strict_mode' separately, and PascalCase them
      return segment.split('_').map(toPascalCase).join('');
    })
    .join('.');
  return reactComponentName;
};

// Recursively remove "_owner" property from elements to avoid crash on docs page when passing components as an array prop (#17482)
// Note: It may be better to use this function only in development environment.
function simplifyNodeForStringify(node: ReactNode): ReactNode {
  if (isValidElement<Record<string, ReactNode>>(node)) {
    const props = Object.keys(node.props).reduce<Record<string, ReactNode>>((acc, cur) => {
      acc[cur] = simplifyNodeForStringify(node.props[cur]);
      return acc;
    }, {});
    // `_owner` is an internal React field, so the element type does not declare it.
    const simplified = { ...node, props, _owner: null };
    return simplified;
  }
  if (Array.isArray(node)) {
    return node.map(simplifyNodeForStringify);
  }
  return node;
}

type JSXOptions = Options & {
  /** How many wrappers to skip when rendering the jsx */
  skip?: number;
  /** Whether to show the function in the jsx tab */
  showFunctions?: boolean;
  /** Whether to format HTML or Vue markup */
  enableBeautify?: boolean;
  /** Override the display name used for a component */
  displayName?: string | Options['displayName'];
  /** The meta's `component`. Used to recover names for subcomponents attached as parent properties */
  parentComponent?: React.ComponentType<never>;
};

type StoryElement = React.ReactElement<{ children?: unknown }>;

/** Apply the users parameters and render the jsx for a story */
export const renderJsx = (code: React.ReactElement, options?: JSXOptions) => {
  if (typeof code === 'undefined') {
    logger.warn('Too many skip or undefined component');
    return null;
  }

  // The skip loop only reads the children of each element.
  let renderedJSX = code as StoryElement;
  const Type = renderedJSX.type;

  for (let i = 0; i < (options?.skip ?? 0); i += 1) {
    if (typeof renderedJSX === 'undefined') {
      logger.warn('Cannot skip undefined element');
      return null;
    }

    if (React.Children.count(renderedJSX) > 1) {
      logger.warn('Trying to skip an array of elements');
      return null;
    }

    if (typeof renderedJSX.props.children === 'undefined') {
      logger.warn('Not enough children to skip elements.');

      if (typeof renderedJSX.type === 'function' && renderedJSX.type.name === '') {
        renderedJSX = <Type {...renderedJSX.props} />;
      }
    } else if (typeof renderedJSX.props.children === 'function') {
      renderedJSX = renderedJSX.props.children();
    } else {
      renderedJSX = renderedJSX.props.children as StoryElement;
    }
  }

  let displayNameDefaults;

  if (typeof options?.displayName === 'string') {
    displayNameDefaults = { showFunctions: true, displayName: () => options.displayName };
    /**
     * Add `renderedJSX?.type`to handle this case:
     *
     * https://github.com/zhyd1997/storybook/blob/20863a75ba4026d7eba6b288991a2cf091d4dfff/code/renderers/react/template/stories/errors.stories.tsx#L14
     *
     * Or it show the error message when run `forkbook build --quiet`:
     *
     * Cannot read properties of undefined (reading '__docgenInfo').
     */
  } else {
    displayNameDefaults = {
      // To get exotic component names resolving properly
      // The element type can be a string, a function, a class, a symbol, or an exotic object
      // (memo, forwardRef), so `field` reads its fields.
      displayName: (el: ReactNode): string => {
        const type = field(el, 'type');
        const typeName = field(type, 'name');
        if (field(type, 'displayName')) {
          return field(type, 'displayName') as string;
        } else if (getDocgenSection(type, 'displayName')) {
          return getDocgenSection(type, 'displayName') as string;
        } else if (field(field(type, 'render'), 'displayName')) {
          return field(field(type, 'render'), 'displayName') as string;
        } else if (typeof type === 'symbol' || typeof field(type, '$$typeof') === 'symbol') {
          return getReactSymbolName(type);
        } else if (typeName && typeName !== '_default') {
          return typeName as string;
        } else if (typeof type === 'function') {
          const parent = options?.parentComponent;
          if (parent) {
            for (const [key, value] of Object.entries(parent)) {
              if (/^[A-Z]/.test(key) && value === type) {
                const parentName = parent.displayName || parent.name || '';
                return parentName ? `${parentName}.${key}` : key;
              }
            }
          }
          return 'No Display Name';
        } else if (isForwardRef(type)) {
          return field(field(type, 'render'), 'name') as string;
        } else if (isMemo(type)) {
          return field(field(type, 'type'), 'name') as string;
        } else {
          return type as string;
        }
      },
    };
  }

  const filterDefaults = {
    filterProps: (value: unknown, key: string): boolean => value !== undefined,
  };

  const opts = {
    ...displayNameDefaults,
    ...filterDefaults,
    ...options,
  };

  const result = React.Children.map(code, (c) => {
    const child = typeof c === 'number' ? String(c) : c;
    const toJSXString =
      typeof reactElementToJSXString === 'function'
        ? reactElementToJSXString
        : // CJS interop: the module can be the namespace object.
          (reactElementToJSXString as unknown as { default: typeof reactElementToJSXString })
            .default;
    let string: string = toJSXString(simplifyNodeForStringify(child), opts as Options);

    if (string.indexOf('&quot;') > -1) {
      const matches = string.match(/\S+=\\"([^"]*)\\"/g);
      if (matches) {
        matches.forEach((match) => {
          string = string.replace(match, match.replace(/&quot;/g, "'"));
        });
      }
    }

    return string;
  }).join('\n');

  return result.replace(/function\s+noRefCheck\(\)\s*\{\}/g, '() => {}');
};

const defaultOpts = {
  skip: 0,
  showFunctions: false,
  enableBeautify: true,
  showDefaultProps: false,
};

export const skipJsxRender = (context: StoryContext<ReactRenderer>) => {
  const sourceParams = context?.parameters.docs?.source;
  const isArgsStory = context?.parameters.__isArgsStory;

  // Portable stories (vitest, playwright/jest portable) have no Source doc block consuming the
  // emitted snippet, so serializing the story to a JSX string is pure overhead. Skip it.
  if (context?.parameters.__isPortableStory) {
    return true;
  }

  // always render if the user forces it
  if (sourceParams?.type === SourceType.DYNAMIC) {
    return false;
  }

  // never render if the user is forcing the block to render code, or
  // if the user provides code, or if it's not an args story.
  return !isArgsStory || sourceParams?.code || sourceParams?.type === SourceType.CODE;
};

/** An element that MDX 1 made. It keeps the real element type in `originalType`. */
type MdxElement = ReactElement<{
  mdxType: string;
  originalType: React.ElementType;
  children?: ReactElement | ReactElement[];
}>;

const isMdx = (node: unknown): node is MdxElement =>
  field(field(node, 'type'), 'displayName') === 'MDXCreateElement' &&
  !!field(field(node, 'props'), 'mdxType');

const mdxToJsx = (node: ReactElement): ReactElement => {
  if (!isMdx(node)) {
    return node;
  }
  const { mdxType, originalType, children, ...rest } = node.props;
  let jsxChildren = [] as ReactElement[];
  if (children) {
    const array = Array.isArray(children) ? children : [children];
    jsxChildren = array.map(mdxToJsx);
  }
  return createElement(originalType, rest, ...jsxChildren);
};

export const jsxDecorator = (
  storyFn: PartialStoryFn<ReactRenderer>,
  context: StoryContextForRender<ReactRenderer>
) => {
  const jsx = useRef<undefined | string>(undefined);
  const story = storyFn();

  const skip = skipJsxRender(context);

  const options = {
    ...defaultOpts,
    ...(context?.parameters.jsx || {}),
    parentComponent: context?.component,
  } as Required<JSXOptions>;

  const storyJsx = context.originalStoryFn(context.args, context);

  useEffect(() => {
    if (skip) {
      return;
    }

    const sourceJsx = mdxToJsx(storyJsx);

    const rendered = renderJsx(sourceJsx, options);
    if (rendered && jsx.current !== rendered) {
      emitTransformCode(rendered, context);
      jsx.current = rendered;
    }
  });

  return story;
};
