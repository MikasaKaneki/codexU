import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const quota = readFileSync(new URL('../src/components/QuotaOverview.tsx', import.meta.url), 'utf8');
const leadership = readFileSync(new URL('../src/components/LeadershipPanel.tsx', import.meta.url), 'utf8');

test('Overview primary cards share the same visual hierarchy contract', () => {
  assert.match(quota, /dashboard-home-primary-card/);
  assert.match(quota, /dashboard-overview-header/);
  assert.match(quota, /quota-overview-state/);
  assert.match(quota, /quota-overview-state-empty/);
  assert.match(quota, /quota-overview-state-copy/);
  assert.match(quota, /quota-overview-rings/);
  assert.match(leadership, /dashboard-home-primary-card/);
  assert.match(leadership, /dashboard-overview-header/);
});

test('Quota overview presents official quota as remaining rings', () => {
  assert.match(quota, /quota-overview-ring/);
  assert.match(quota, /quota-overview-ring-fill/);
  assert.match(quota, /used_percent/);
  assert.match(quota, /quota\.officialSource/);
});
