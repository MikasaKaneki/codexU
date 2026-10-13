import { test, expect } from '@playwright/test';
import { createVisualFixture } from './support/fixture-data.mjs';

const fields = { fiveHour: 'five_hour_quota', sevenDay: 'seven_day_quota', monthly: 'monthly_quota' };

async function load(page, windows, theme = 'light') {
  const data = createVisualFixture();
  data.settings.config.theme = theme;
  for (const [kind, field] of Object.entries(fields)) {
    data.dashboard.codex.snapshot[field] = kind in windows ? {
      used_percent: windows[kind], window_duration_mins: 300,
      resets_at: Date.UTC(2026, 9, 14, 6, 30),
    } : null;
  }
  await page.addInitScript(data => { window.__CODEXU_VISUAL_DATA__ = data; }, data);
  await page.goto('/visual-test.html?surface=overview');
  await expect(page.locator('.quota-overview-rings')).toBeVisible();
  return page.locator('.dashboard-home-quota');
}

for (const [name, windows, roles] of [
  ['five-hour only', { fiveHour: 30 }, ['primary']],
  ['weekly only', { sevenDay: 30 }, ['secondary']],
  ['monthly only', { monthly: 30 }, ['secondary']],
  ['five-hour and weekly', { fiveHour: 30, sevenDay: 60 }, ['primary', 'secondary']],
  ['five-hour and monthly', { fiveHour: 30, monthly: 60 }, ['primary', 'secondary']],
  ['weekly and monthly', { sevenDay: 30, monthly: 60 }, ['secondary', 'primary']],
  ['all three windows', { fiveHour: 30, sevenDay: 60, monthly: 80 }, ['primary', 'secondary', 'secondary']],
]) {
  test(`remaining rings preserve window identity: ${name}`, async ({ page }) => {
    const quota = await load(page, windows);
    const meters = quota.getByRole('meter');
    await expect(meters).toHaveCount(roles.length);
    for (const [index, [kind, used]] of Object.entries(windows).entries()) {
      const meter = meters.nth(index);
      await expect(meter).toHaveAttribute('data-quota-kind', kind);
      await expect(meter).toHaveAttribute('data-quota-role', roles[index]);
      await expect(meter).toHaveAttribute('aria-valuenow', String(100 - used));
      await expect(meter).toHaveAttribute('aria-valuetext', `${100 - used}% remaining`);
      expect((await meter.boundingBox()).width).toBe(index === 0 ? 145 : index === 1 ? 107 : 24);
    }
    await expect(quota.locator('.quota-overview-readouts')).toContainText('70%');
    const resets = quota.locator('.quota-overview-reset');
    await expect(resets).toHaveCount(roles.length);
    await resets.first().hover();
    await expect(resets.first()).toHaveAttribute('title', /Resets .*2026/);
    await expect(resets.first()).toContainText('2:30 PM');
    if (roles.length > 1) {
      const [outer, inner] = await Promise.all([meters.nth(0).boundingBox(), meters.nth(1).boundingBox()]);
      expect(outer.x + outer.width / 2).toBe(inner.x + inner.width / 2);
      expect(outer.y + outer.height / 2).toBe(inner.y + inner.height / 2);
    }
  });
}

test('full, empty and unavailable quota values stay distinct', async ({ page }) => {
  const quota = await load(page, { fiveHour: 0, sevenDay: 100, monthly: null });
  await expect(quota.getByRole('meter').nth(0)).toHaveAttribute('aria-valuenow', '100');
  await expect(quota.getByRole('meter').nth(1)).toHaveAttribute('aria-valuenow', '0');
  await expect(quota.getByRole('meter').nth(2)).not.toHaveAttribute('aria-valuenow');
  await expect(quota.getByRole('meter').nth(2)).toHaveAttribute('aria-valuetext', 'Not available');
  await expect(quota.getByRole('meter').nth(0).locator('.quota-overview-ring-fill')).toHaveCount(1);
  await expect(quota.getByRole('meter').nth(1).locator('.quota-overview-ring-fill')).toHaveCount(0);
  await expect(quota.getByRole('meter').nth(2).locator('.quota-overview-ring-fill')).toHaveCount(0);
  await expect(quota.locator('.quota-overview-extra')).toContainText('—');
});

test('refresh keeps the rings in place until a new snapshot arrives', async ({ page }) => {
  const quota = await load(page, { fiveHour: 30, sevenDay: 60 });
  const before = await quota.boundingBox();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(quota.getByRole('meter').first()).toHaveAttribute('aria-valuenow', '70');
  const after = await quota.boundingBox();
  expect({ width: after.width, height: after.height }).toEqual({ width: before.width, height: before.height });
});
