import { describe, expect, test } from 'vitest';

import { prepareStories } from './prepareStories.ts';

// The TextInput story file of the upstream expo example.
const textInputStories = () => ({
  default: {
    component: () => null,
    parameters: {
      notes: 'Use this example to test the software keyboard related issues.',
    },
  } as Record<string, any>,
  Basic: {
    args: {
      placeholder: 'Type something',
    },
  } as Record<string, any>,
});

describe('prepareStories', () => {
  test('prepares a standard CSF story file', () => {
    const req = () => textInputStories();
    req.keys = () => ['./TextInput.stories.tsx'];

    const result = prepareStories({
      storyEntries: [
        {
          titlePrefix: '',
          directory: './src',
          files: '**/*.stories.?(ts|tsx|js|jsx)',
          importPathMatcher:
            /^\.(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?\.stories\.(?:ts|tsx|js|jsx)?)$/,
          req,
        },
      ],
    });
    expect(result).toEqual<ReturnType<typeof prepareStories>>({
      importMap: {
        './src/TextInput.stories.tsx': {
          Basic: {
            args: {
              placeholder: 'Type something',
            },
          },
          default: {
            component: expect.any(Function),
            parameters: {
              notes: 'Use this example to test the software keyboard related issues.',
            },
          },
        },
      },
      index: {
        v: 5,
        entries: {
          'textinput--basic': {
            id: 'textinput--basic',
            importPath: './src/TextInput.stories.tsx',
            name: 'Basic',
            tags: ['story'],
            title: 'TextInput',
            type: 'story',
            subtype: 'story',
          },
        },
      },
    });
  });

  test('ignores stories matching excludeStories pattern', () => {
    const req = () => {
      const stories: Record<string, any> = textInputStories();
      stories.Ignored = stories.Basic;
      stories.default.excludeStories = /Ignored/;
      return stories;
    };
    req.keys = () => ['./TextInput.stories.tsx'];

    const result = prepareStories({
      storyEntries: [
        {
          titlePrefix: '',
          directory: './src',
          files: '**/*.stories.?(ts|tsx|js|jsx)',
          importPathMatcher:
            /^\.(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?\.stories\.(?:ts|tsx|js|jsx)?)$/,
          req,
        },
      ],
    });
    expect(result.importMap['./src/TextInput.stories.tsx'].Ignored).toBeUndefined();
    expect(result.index.entries['textinput--basic']).toBeDefined();
    expect(result.index.entries['textinput--ignored']).toBeUndefined();
  });

  test('ignores stories not matching includeStories pattern', () => {
    const req = () => {
      const stories: Record<string, any> = textInputStories();
      stories.Ignored = stories.Basic;
      stories.default.includeStories = /Basic/;
      return stories;
    };
    req.keys = () => ['./TextInput.stories.tsx'];

    const result = prepareStories({
      storyEntries: [
        {
          titlePrefix: '',
          directory: './src',
          files: '**/*.stories.?(ts|tsx|js|jsx)',
          importPathMatcher:
            /^\.(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?\.stories\.(?:ts|tsx|js|jsx)?)$/,
          req,
        },
      ],
    });
    expect(result.importMap['./src/TextInput.stories.tsx'].Ignored).toBeUndefined();
    expect(result.index.entries['textinput--basic']).toBeDefined();
    expect(result.index.entries['textinput--ignored']).toBeUndefined();
  });

  test('strips play functions from stories', () => {
    const req = () => {
      const stories: Record<string, any> = textInputStories();
      stories.Basic.play = () => {};
      return stories;
    };
    req.keys = () => ['./TextInput.stories.tsx'];

    const result = prepareStories({
      storyEntries: [
        {
          titlePrefix: '',
          directory: './src',
          files: '**/*.stories.?(ts|tsx|js|jsx)',
          importPathMatcher:
            /^\.(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?\.stories\.(?:ts|tsx|js|jsx)?)$/,
          req,
        },
      ],
    });
    expect(result.importMap['./src/TextInput.stories.tsx'].Basic.play).toBeUndefined();
  });
});
