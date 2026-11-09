/**
 * End-to-end test of builder-next with a real Next.js 16 app (`__fixtures__/next-app`).
 *
 * It is slow (it packs Forkbook, installs Next.js and starts `next dev`), so it runs only when
 * asked:
 *
 *     bun run build:changed
 *     FORKBOOK_NEXT_E2E=1 bun x vitest run --project core code/core/src/builder-next/next-app.e2e.test.ts
 *
 * Set `FORKBOOK_NEXT_E2E_KEEP=1` to keep the app folder for debugging.
 */
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const enabled = process.env.FORKBOOK_NEXT_E2E === '1';
const NEXT_VERSION = '16.4.5';
const coreDir = join(import.meta.dirname, '..', '..');
const fixtureDir = join(import.meta.dirname, '__fixtures__', 'next-app');

/** The cached Chromium of Playwright can be another revision than the installed Playwright. */
async function launchChromium() {
  const { chromium } = await import('playwright');
  if (existsSync(chromium.executablePath())) {
    return chromium.launch();
  }
  const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  const shells = existsSync(cache)
    ? readdirSync(cache)
        .filter((name) => name.startsWith('chromium_headless_shell-'))
        .sort()
        .reverse()
    : [];
  for (const shell of shells) {
    const executablePath = join(
      cache,
      shell,
      'chrome-headless-shell-mac-arm64',
      'chrome-headless-shell'
    );
    if (existsSync(executablePath)) {
      return chromium.launch({ executablePath });
    }
  }
  return chromium.launch();
}

async function waitFor<T>(check: () => Promise<T | undefined>, timeout: number, what: string) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await check().catch(() => undefined);
    if (value !== undefined) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out: ${what}`);
}

describe.skipIf(!enabled)('builder-next with next dev (Next.js 16)', () => {
  let appDir: string;
  let next: ChildProcess | undefined;
  let origin: string;
  let log = '';

  beforeAll(async () => {
    appDir = mkdtempSync(join(tmpdir(), 'forkbook-next-e2e-'));
    cpSync(fixtureDir, appDir, { recursive: true });
    const tarball = execFileSync('bun', ['pm', 'pack', '--destination', appDir, '--quiet'], {
      cwd: coreDir,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .pop()!;
    const reactVersion = JSON.parse(
      readFileSync(join(coreDir, '..', '..', 'node_modules', 'react', 'package.json'), 'utf8')
    ).version;
    writeFileSync(
      join(appDir, 'package.json'),
      JSON.stringify(
        {
          name: 'forkbook-next-e2e',
          private: true,
          type: 'module',
          dependencies: {
            '@aussieljk/forkbook': `file:${join(appDir, tarball.replace(/^.*[\\/]/, ''))}`,
            'fixture-greeting': 'file:./fixture-greeting',
            next: NEXT_VERSION,
            react: reactVersion,
            'react-dom': reactVersion,
          },
        },
        null,
        2
      )
    );
    execFileSync('git', ['init', '-q'], { cwd: appDir });
    execFileSync('bun', ['install', '--silent'], { cwd: appDir, stdio: 'inherit' });

    const port = 3900 + Math.floor(Math.random() * 90);
    origin = `http://localhost:${port}`;
    next = spawn(join(appDir, 'node_modules', '.bin', 'next'), ['dev', '-p', String(port)], {
      cwd: appDir,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', FORKBOOK_PARENT_PID: '' },
      detached: true,
    });
    next.stdout?.on('data', (chunk) => (log += chunk));
    next.stderr?.on('data', (chunk) => (log += chunk));
    await waitFor(
      async () => ((await fetch(`${origin}/_forkbook/index.json`)).ok ? true : undefined),
      120_000,
      'Forkbook index through next dev'
    );
  }, 600_000);

  afterAll(() => {
    if (next?.pid) {
      try {
        process.kill(-next.pid, 'SIGTERM');
      } catch {
        // It stopped already.
      }
    }
    if (process.env.FORKBOOK_NEXT_E2E_KEEP !== '1' && appDir) {
      rmSync(appDir, { recursive: true, force: true });
    }
  });

  it('keeps the real app, writes the route and hides it from git', async () => {
    const home = await fetch(`${origin}/`);
    const html = await home.text();
    expect(html).toContain('The real app');
    // The app uses the same Button as the story, but the story mock does not leak into the app.
    expect(html).toContain('Real greeting');
    expect(html).not.toContain('Mock greeting');
    expect(existsSync(join(appDir, 'app', '(forkbook)', '%5Fforkbook', 'iframe', 'page.tsx'))).toBe(
      true
    );
    const status = execFileSync('git', ['status', '--porcelain', '-uall'], {
      cwd: appDir,
      encoding: 'utf8',
    });
    expect(status).not.toContain('(forkbook)');
  });

  it('renders a story in the manager, hot reloads it and sends channel events', async () => {
    const browser = await launchChromium();
    try {
      const page = await browser.newPage();
      await page.goto(`${origin}/_forkbook/?path=/story/button--primary`);
      const frame = page.frameLocator('#storybook-preview-iframe');
      const label = frame.locator('[data-testid=label]');
      await label.waitFor({ timeout: 180_000 });
      expect(await label.textContent()).toBe('Hello from Next');
      // previewMocks replace the module in the story graph only.
      expect(await frame.locator('[data-testid=greeting]').textContent()).toBe('Mock greeting');

      const preview = page.frames().find((f) => f.url().includes('/_forkbook/iframe?'))!;
      expect(preview, 'the preview iframe is served by Next.js at <base>/iframe').toBeTruthy();
      // The CSS of the app and next/image work in the preview.
      expect(
        await frame
          .locator('[data-testid=button]')
          .evaluate((el) => getComputedStyle(el).backgroundColor)
      ).toBe('rgb(10, 20, 30)');
      expect(await frame.locator('img').getAttribute('src')).toContain('/_next/');

      // Hot reload: edit the story file. The page must not reload.
      await preview.evaluate(() => ((window as { __kept?: boolean }).__kept = true));
      const storyFile = join(appDir, 'src', 'Button.stories.jsx');
      writeFileSync(
        storyFile,
        readFileSync(storyFile, 'utf8').replace('Hello from Next', 'Edited story')
      );
      await frame.locator('text=Edited story').waitFor({ timeout: 60_000 });
      expect(await preview.evaluate(() => (window as { __kept?: boolean }).__kept)).toBe(true);

      // Channel: the preview gets updateStoryArgs and answers with storyArgsUpdated.
      const event = await preview.evaluate(
        () =>
          new Promise((resolve) => {
            const { channel } = (window as any).__FORKBOOK_PREVIEW__;
            channel.on('storyArgsUpdated', resolve);
            channel.emit('updateStoryArgs', {
              storyId: 'button--primary',
              updatedArgs: { label: 'From channel' },
            });
          })
      );
      expect(event).toMatchObject({ storyId: 'button--primary', args: { label: 'From channel' } });
      await frame.locator('text=From channel').waitFor({ timeout: 10_000 });

      // The preview has its own WebSocket to the Forkbook server through next dev.
      const socketState = await preview.evaluate(() => {
        const transports = (window as any).__FORKBOOK_SERVER_CHANNEL__?.transports ?? [];
        return transports.find((t: { socket?: WebSocket }) => t.socket)?.socket.readyState;
      });
      expect(socketState).toBe(1);
    } catch (error) {
      console.error(log.slice(-4000));
      throw error;
    } finally {
      await browser.close();
    }
  }, 300_000);
});
