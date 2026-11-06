const MAX_TEXT = 120;

const escapeIdent = (value: string) =>
  typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/[^\w-]/g, '\\$&');

/**
 * Makes a CSS selector for an element. It stops at the first ancestor with an id or a
 * `data-testid`, so the selector stays short and stable.
 */
export function getCssSelector(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current.tagName.toLowerCase() !== 'html') {
    const tag = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${escapeIdent(current.id)}`);
      break;
    }
    const testId = current.getAttribute('data-testid');
    if (testId) {
      parts.unshift(`${tag}[data-testid="${testId.replace(/"/g, '\\"')}"]`);
      break;
    }
    let part = tag;
    const parent: Element | null = current.parentElement;
    if (parent) {
      const tagName = current.tagName;
      const sameTag = Array.from(parent.children).filter((child) => child.tagName === tagName);
      if (sameTag.length > 1) {
        part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
      }
    }
    parts.unshift(part);
    if (tag === 'body') {
      break;
    }
    current = parent;
  }
  return parts.join(' > ');
}

/** A short snippet of the outer text of an element, on one line. */
export function getTextSnippet(element: Element): string {
  const text = ((element as HTMLElement).innerText || element.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text;
}
