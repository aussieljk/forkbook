import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Builds a small Forkbook with the built package (code/core/dist) and checks the manager layout in
 * Chromium. The unit tests and the browser stories use the source, so they did not see a manager
 * that the build broke (hashed grid area names, theme variables with an old prefix).
 */
const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'code/core/dist/bin/dispatcher.js');
const CONFIG_DIR = join(import.meta.dirname, 'fixtures/manager-layout/.forkbook');

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

let out: string;
let server: Server;
let browser: Browser;
let base: string;

beforeAll(async () => {
  out = mkdtempSync(join(tmpdir(), 'forkbook-layout-'));
  execFileSync('node', [BIN, 'build', '--config-dir', CONFIG_DIR, '-o', out, '--quiet'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  server = createServer((req, res) => {
    let path = new URL(req.url ?? '/', 'http://x').pathname;
    // Like a static host: a story URL such as `/box/default` gets `/box/default/index.html`.
    if (path.endsWith('/')) {
      path += 'index.html';
    } else if (!extname(path)) {
      path += '/index.html';
    }
    try {
      const body = readFileSync(join(out, decodeURIComponent(path)));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  base = `http://localhost:${typeof address === 'object' && address ? address.port : 0}`;

  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
  server?.close();
  rmSync(out, { recursive: true, force: true });
});

describe('the built manager', () => {
  it('has the sidebar on the left, the toolbar and the preview, the panel below, and Inter', async () => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(`${base}/box/default`);
    await page.locator('.sidebar-container').waitFor();
    await page.getByRole('tab', { name: 'Controls' }).waitFor();

    const layout = await page.evaluate(() => {
      const box = (el: Element | null) => {
        const rect = el?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      };
      const serif = [...document.querySelectorAll('#root *')]
        .filter((el) => el.getClientRects().length > 0 && el.textContent?.trim())
        .map((el) => getComputedStyle(el).fontFamily)
        .filter((font) => !font.includes('sans-serif') && !font.includes('monospace'));

      return {
        sidebar: box(document.querySelector('.sidebar-container')),
        iframe: box(document.querySelector('#storybook-preview-iframe')),
        tab: box(document.querySelector('[role="tab"]')),
        sidebarFont: getComputedStyle(document.querySelector('.sidebar-container')!).fontFamily,
        serif: [...new Set(serif)],
      };
    });
    await page.close();

    const { sidebar, iframe, tab } = layout;
    expect(sidebar).not.toBeNull();
    expect(iframe).not.toBeNull();
    expect(tab).not.toBeNull();

    expect(sidebar!.x).toBeLessThan(5);
    expect(sidebar!.width).toBeGreaterThan(150);
    expect(iframe!.x).toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width - 1);
    expect(iframe!.width).toBeGreaterThan(700);
    // The toolbar is above the preview.
    expect(iframe!.y).toBeGreaterThan(30);
    // The addons panel is below the preview.
    expect(tab!.y).toBeGreaterThanOrEqual(iframe!.y + iframe!.height - 1);

    expect(layout.sidebarFont).toMatch(/^"?Inter Variable"?/);
    expect(layout.serif).toEqual([]);
  }, 60_000);

  it('renders markdown tables, and scrolls from one docs page into the next', async () => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(`${base}/first/docs`);
    const preview = page.frameLocator('#storybook-preview-iframe');
    await preview.locator('h1', { hasText: 'First page' }).waitFor();

    // GitHub-flavoured markdown: the pipe table is a table.
    expect(await preview.locator('table td', { hasText: 'alpha' }).count()).toBe(1);

    // The next docs page loads below the first one.
    const frame = page.frame({ name: 'storybook-preview-iframe' })!;
    await frame.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const second = preview.locator('.fb-infinite-docs-page h1', { hasText: 'Second page' });
    await second.waitFor();

    // The URL follows the page in view, without a new render of the preview.
    await frame.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/second\/docs$/);
    expect(await preview.locator('h1', { hasText: 'First page' }).count()).toBe(1);
    await page.close();
  }, 60_000);
});
