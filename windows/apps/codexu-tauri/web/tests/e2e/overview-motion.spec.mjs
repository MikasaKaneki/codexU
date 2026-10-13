import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createVisualFixture } from './support/fixture-data.mjs';

async function load(page, { score = 42, theme = 'light', native = false, missing = false, longSkills = false, todayAgents = 6 } = {}) {
  const data = createVisualFixture();
  data.settings.config.theme = theme;
  data.dashboard.leadership.score = score;
  data.dashboard.leadership.report.reports[0].score = score;
  data.dashboard.leadership.report.reports.find(report => report.period === 'today').agent_count = todayAgents;
  if (longSkills) data.dashboard.codex.snapshot.local.skill_usages = Array.from({ length: 20 }, (_, index) => ({
    ...data.dashboard.codex.snapshot.local.skill_usages[0], id: `long-skill-${index}`, name: `Long skill ${index}`,
  }));
  if (missing) {
    data.dashboard.leadership.score = null;
    data.dashboard.codex.snapshot.five_hour_quota.used_percent = 100;
    data.dashboard.codex.snapshot.seven_day_quota.used_percent = null;
  }
  await page.addInitScript(({ data, native }) => {
    window.__CODEXU_VISUAL_DATA__ = data;
    if (!native) return;
    // Mock only the Tauri event transport and power/focus signals; business data remains the fixture.
    const callbacks = new Map(), listeners = new Map();
    let next = 0;
    window.isTauri = true;
    window.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' } },
      transformCallback(callback) { const id = ++next; callbacks.set(id, callback); return id; },
      async invoke(command, args) {
        if (command === 'plugin:event|listen') { const id = ++next; listeners.set(id, args); return id; }
        if (command === 'plugin:event|unlisten') { listeners.delete(args.eventId); return; }
        if (command === 'get_visual_power_save') return false;
        if (command === 'plugin:window|is_focused') return true;
        if (command === 'sync_runtime_language') return;
        throw new Error('Unexpected mock command: ' + command);
      },
    };
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
    window.__emitVisualEvent = (event, payload) => {
      for (const [id, listener] of listeners) if (listener.event === event) callbacks.get(listener.handler)?.({ event, id, payload });
    };
    window.__visualListenerCount = () => listeners.size;
  }, { data, native });
  await page.goto('/visual-test.html?surface=overview');
  await page.bringToFront();
  await expect(page.locator('.dashboard-home')).toBeVisible();
}

const host = page => page.locator('.leadership-overview-card .leadership-command-graphic');
const activeEffects = page => page.evaluate(() => document.getAnimations().filter(animation =>
  ['quota-flow', 'leadership-orbit', 'leadership-breath'].includes(animation.animationName)).length);

for (const [level, score, rings] of [[1, 10, 1], [2, 25, 2], [3, 42, 2], [4, 57, 2], [5, 71, 3], [6, 85, 3], [7, 96, 3]]) {
  for (const theme of ['light', 'dark']) {
    test(`Mac command radius keeps rank and node meaning: L${level} ${theme}`, async ({ page }, info) => {
      await load(page, { score, theme });
      await expect(host(page)).toHaveAttribute('data-ring-count', String(rings));
      await expect(host(page)).toHaveAttribute('data-motion', 'active');
      await expect(host(page).locator('.leadership-command-node')).toHaveCount(6);
      await expect(page.locator('.leadership-overview-card .leadership-command-plaque')).toContainText(`L${level}`);
      const [command, quota] = await Promise.all([host(page).boundingBox(), page.locator('.quota-overview-rings').boundingBox()]);
      expect(command.width).toBe(145); expect(command.height).toBe(145);
      expect(Math.abs(command.y - quota.y)).toBeLessThan(1);
      const folder = path.join(info.outputDir, 'evidence');
      await mkdir(folder, { recursive: true });
      await page.locator('.dashboard-home-command').screenshot({ path: path.join(folder, 'leadership.png'), animations: 'disabled' });
    });
  }
}

test('flow dots, orbit nodes and breathing glow visibly advance over time', async ({ page }) => {
  await load(page);
  await expect.poll(() => activeEffects(page)).toBeGreaterThan(0);
  const sample = () => page.evaluate(() => {
    const dot = document.querySelector('.quota-flow-dot').getBoundingClientRect();
    const node = document.querySelector('.leadership-command-node').getBoundingClientRect();
    return { dot: [dot.x, dot.y], node: [node.x, node.y], glow: getComputedStyle(document.querySelector('.leadership-command-breath')).opacity };
  });
  const before = await sample();
  await expect.poll(async () => (await sample()).dot).not.toEqual(before.dot);
  await expect.poll(async () => (await sample()).node).not.toEqual(before.node);
  await expect.poll(async () => (await sample()).glow).not.toBe(before.glow);
  await expect(page.getByRole('meter').first()).toHaveAttribute('aria-valuenow', '64');
});

test('blur, hide, offscreen and reduced motion remove effects and preserve readings', async ({ page }) => {
  await load(page, { longSkills: true });
  await expect.poll(() => activeEffects(page)).toBeGreaterThan(0);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(() => activeEffects(page)).toBe(0);
  await expect(page.locator('.quota-flow-dot')).toHaveCount(0);
  await expect(host(page).locator('.leadership-command-node')).toHaveCount(6);
  await expect(page.getByRole('meter').first()).toHaveAttribute('aria-valuenow', '64');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => activeEffects(page)).toBeGreaterThan(0);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => activeEffects(page)).toBe(0);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => activeEffects(page)).toBeGreaterThan(0);
  await page.getByRole('tab', { name: 'Skills', exact: true }).click();
  await page.getByText('Long skill 19', { exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(() => activeEffects(page)).toBe(0);
  await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('main.overflow-auto')?.scrollTo(0, 0); });
  await expect.poll(() => activeEffects(page)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => activeEffects(page)).toBe(0);
  await expect(page.locator('.quota-flow-dot')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => activeEffects(page)).toBeGreaterThan(0);
});

test('native power and focus events stop and resume without listener or animation growth', async ({ page }) => {
  await load(page, { native: true });
  await expect.poll(() => page.evaluate(() => window.__visualListenerCount())).toBe(3);
  const count = await activeEffects(page);
  expect(count).toBeGreaterThan(0);
  for (let cycle = 0; cycle < 5; cycle++) {
    await page.evaluate(() => window.__emitVisualEvent('visual-power-save', true));
    await expect.poll(() => activeEffects(page)).toBe(0);
    await page.evaluate(() => window.__emitVisualEvent('visual-power-save', false));
    await expect.poll(() => activeEffects(page)).toBe(count);
    await page.evaluate(() => window.__emitVisualEvent('tauri://blur', null));
    await expect.poll(() => activeEffects(page)).toBe(0);
    await page.evaluate(() => window.__emitVisualEvent('tauri://focus', null));
    await expect.poll(() => activeEffects(page)).toBe(count);
  }
  await expect.poll(() => page.evaluate(() => window.__visualListenerCount())).toBe(3);
});

test('exhausted or missing quota and unknown rank do not animate invented data', async ({ page }) => {
  await load(page, { missing: true });
  await expect(host(page)).toHaveAttribute('data-ring-count', '0');
  await expect(page.locator('.quota-flow-dot')).toHaveCount(0);
  await expect.poll(() => activeEffects(page)).toBe(0);
  await expect(page.getByRole('meter').first()).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByRole('meter').nth(1)).not.toHaveAttribute('aria-valuenow');
});

for (const todayAgents of [null, 0]) {
  test(`known rank visibly flows with ${todayAgents} today Agents without inventing nodes`, async ({ page }) => {
    await load(page, { todayAgents, native: true });
    await expect(host(page).locator('.leadership-command-node')).toHaveCount(0);
    const flow = host(page).locator('.leadership-command-flow');
    await expect(flow).toHaveCount(2);
    const transform = () => flow.first().evaluate(element => getComputedStyle(element).transform);
    const before = await transform();
    await expect.poll(transform).not.toBe(before);
    await page.evaluate(() => window.__emitVisualEvent('visual-power-save', true));
    await expect(flow).toHaveCount(0);
    await page.evaluate(() => window.__emitVisualEvent('visual-power-save', false));
    await expect(flow).toHaveCount(2);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(flow).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(flow).toHaveCount(2);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(flow).toHaveCount(0);
    await expect(host(page)).toHaveAttribute('data-ring-count', '2');
    await expect(host(page).locator('.leadership-command-node')).toHaveCount(0);
  });
}
