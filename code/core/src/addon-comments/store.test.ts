import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleCommentsRequest } from './preset.ts';
import { formatCommentsPrompt } from './prompt.ts';
import { CommentStore, getCommentsFilePath } from './store.ts';

let dir: string;
let store: CommentStore;
let nextId = 0;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'forkbook-comments-'));
  nextId = 0;
  store = new CommentStore(
    getCommentsFilePath(dir),
    () => new Date('2026-01-02T03:04:05.000Z'),
    () => `c${++nextId}`
  );
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const base = {
  storyId: 'button--primary',
  title: 'Button',
  name: 'Primary',
  importPath: './src/Button.stories.tsx',
};

describe('CommentStore', () => {
  it('returns no comments when the file does not exist', async () => {
    expect(await store.list()).toEqual([]);
  });

  it('adds a comment and keeps it in .forkbook/comments.json', async () => {
    const comment = await store.add({
      ...base,
      element: { selector: '#storybook-root > button', text: 'Click' },
      args: { label: 'Click' },
      note: '  Make it bigger  ',
    });
    expect(comment).toMatchObject({ id: 'c1', status: 'open', note: 'Make it bigger' });

    const file = JSON.parse(await readFile(join(dir, '.forkbook', 'comments.json'), 'utf8'));
    expect(file.comments).toHaveLength(1);

    // A new store on the same file sees the comment (it survives a restart).
    const reopened = new CommentStore(getCommentsFilePath(dir));
    expect(await reopened.list()).toEqual([comment]);
  });

  it('rejects a comment without a note', async () => {
    await expect(store.add({ ...base, note: '  ' })).rejects.toThrow('note');
  });

  it('resolves, reopens and deletes comments', async () => {
    await store.add({ ...base, note: 'one' });
    await store.add({ ...base, storyId: 'other', note: 'two' });

    const resolved = await store.resolve('c1', 'Done');
    expect(resolved).toMatchObject({ status: 'resolved', reply: 'Done' });
    expect((await store.list({ status: 'open' })).map((c) => c.id)).toEqual(['c2']);
    expect((await store.list({ storyId: 'button--primary' })).map((c) => c.id)).toEqual(['c1']);

    await store.reopen('c1');
    expect(await store.list({ status: 'open' })).toHaveLength(2);

    await store.delete('c2');
    expect((await store.list()).map((c) => c.id)).toEqual(['c1']);
    await expect(store.resolve('nope')).rejects.toThrow('No comment');
  });

  it('does not lose a change when writes happen at the same time', async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => store.add({ ...base, note: `note ${i}` }))
    );
    expect(await store.list()).toHaveLength(10);
  });
});

describe('formatCommentsPrompt', () => {
  it('includes the file, story, element, args and note', async () => {
    const comment = await store.add({
      ...base,
      element: { selector: 'button:nth-of-type(2)', text: 'Save' },
      args: { primary: true },
      note: 'Use the brand colour',
    });
    const prompt = formatCommentsPrompt([comment]);
    expect(prompt).toContain('File: ./src/Button.stories.tsx');
    expect(prompt).toContain('Story: Button / Primary (id: button--primary)');
    expect(prompt).toContain('Element: `button:nth-of-type(2)`');
    expect(prompt).toContain('Element text: "Save"');
    expect(prompt).toContain('"primary": true');
    expect(prompt).toContain('Note: Use the brand colour');
    expect(prompt).toContain('Comment id: c1');
    expect(prompt).toContain('resolve_comment');
  });

  it('says the comment is on the whole story when there is no element', async () => {
    const comment = await store.add({ ...base, note: 'Spacing is off' });
    expect(formatCommentsPrompt([comment])).toContain('Element: the whole story');
    expect(formatCommentsPrompt([])).toBe('There are no open Forkbook comments.');
  });
});

const request = (
  method: string,
  body?: unknown,
  contentType = 'application/json',
  headers: Record<string, string> = {}
) => {
  const req = new PassThrough() as unknown as IncomingMessage;
  Object.assign(req, {
    method,
    url: '/__forkbook/comments',
    headers: { 'content-type': contentType, ...headers },
  });
  (req as unknown as PassThrough).end(
    body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
  );
  let status = 0;
  let text = '';
  const res = {
    writeHead: (code: number) => {
      status = code;
    },
    end: (chunk: string) => {
      text = chunk;
    },
  } as unknown as ServerResponse;
  return { req, res, result: () => ({ status, body: JSON.parse(text) }) };
};

describe('handleCommentsRequest', () => {
  it('adds with POST and lists with GET', async () => {
    const post = request('POST', { action: 'add', comment: { ...base, note: 'Hi' } });
    await handleCommentsRequest(store, post.req, post.res);
    expect(post.result()).toMatchObject({ status: 200, body: { comment: { id: 'c1' } } });

    const get = request('GET');
    await handleCommentsRequest(store, get.req, get.res);
    expect(get.result().body.comments).toHaveLength(1);
  });

  it('rejects a POST that is not JSON', async () => {
    const post = request('POST', { action: 'add' }, 'text/plain');
    await handleCommentsRequest(store, post.req, post.res);
    expect(post.result().status).toBe(415);
  });

  it('accepts a POST from the same origin', async () => {
    const post = request(
      'POST',
      { action: 'add', comment: { ...base, note: 'Hi' } },
      'application/json',
      { 'sec-fetch-site': 'same-origin', origin: 'http://localhost:6006' }
    );
    await handleCommentsRequest(store, post.req, post.res);
    expect(post.result().status).toBe(200);
  });

  it.each<Record<string, string>>([
    { 'sec-fetch-site': 'cross-site' },
    { 'sec-fetch-site': 'same-site' },
    { origin: 'http://evil.example.com' },
  ])('rejects a cross-site POST with 403 (%o)', async (headers) => {
    const post = request(
      'POST',
      { action: 'add', comment: { ...base, note: 'Hi' } },
      'application/json',
      headers
    );
    await handleCommentsRequest(store, post.req, post.res);
    expect(post.result().status).toBe(403);
    expect(await store.list({ status: 'all' })).toHaveLength(0);
  });

  it('accepts an Origin that allowedHosts lists', async () => {
    const post = request(
      'POST',
      { action: 'add', comment: { ...base, note: 'Hi' } },
      'application/json',
      { origin: 'https://app.example.com' }
    );
    await handleCommentsRequest(store, post.req, post.res, {
      hostValidation: { allowedHosts: ['app.example.com'] },
    });
    expect(post.result().status).toBe(200);
  });

  it('rejects a body larger than the limit with 413', async () => {
    const post = request('POST', { action: 'add', comment: { ...base, note: 'x'.repeat(200) } });
    await handleCommentsRequest(store, post.req, post.res, {
      hostValidation: {},
      maxBodyBytes: 100,
    });
    expect(post.result().status).toBe(413);
    expect(await store.list({ status: 'all' })).toHaveLength(0);
  });

  it('rejects a Content-Length larger than the default limit with 413', async () => {
    const post = request('POST', '{}', 'application/json', {
      'content-length': String(2 * 1024 * 1024),
    });
    await handleCommentsRequest(store, post.req, post.res);
    expect(post.result().status).toBe(413);
  });

  it('returns 400 for a bad action', async () => {
    const post = request('POST', { action: 'resolve', id: 'missing' });
    await handleCommentsRequest(store, post.req, post.res);
    expect(post.result()).toMatchObject({ status: 400 });
  });
});
