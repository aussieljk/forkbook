// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { getCssSelector, getTextSnippet } from './selector.ts';

describe('getCssSelector', () => {
  it('stops at the nearest ancestor with an id', () => {
    document.body.innerHTML =
      '<div id="storybook-root"><ul><li>One</li><li><span>Two</span></li></ul></div>';
    const span = document.querySelector('span')!;
    const selector = getCssSelector(span);
    expect(selector).toBe('#storybook-root > ul > li:nth-of-type(2) > span');
    expect(document.querySelector(selector)).toBe(span);
  });

  it('uses data-testid when it is there', () => {
    document.body.innerHTML = '<main><button data-testid="save">Save</button></main>';
    expect(getCssSelector(document.querySelector('button')!)).toBe('button[data-testid="save"]');
  });

  it('goes up to body when there is no id', () => {
    document.body.innerHTML = '<section><p>x</p></section>';
    const selector = getCssSelector(document.querySelector('p')!);
    expect(selector).toBe('body > section > p');
    expect(document.querySelector(selector)).toBe(document.querySelector('p'));
  });
});

describe('getTextSnippet', () => {
  it('puts the text on one line and makes long text short', () => {
    document.body.innerHTML = `<p>  Hello\n   world  </p><div>${'a'.repeat(300)}</div>`;
    expect(getTextSnippet(document.querySelector('p')!)).toBe('Hello world');
    expect(getTextSnippet(document.querySelector('div')!)).toHaveLength(120);
  });
});
