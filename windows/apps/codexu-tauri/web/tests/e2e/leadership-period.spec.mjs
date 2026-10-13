import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createVisualFixture } from './support/fixture-data.mjs';

const periods = ['today', 'sevenDays', 'twentyEightDays'];
const labels = { en: ['today', '7 days', '28 days'], 'zh-Hans': ['今天', '近 7 天', '近 28 天'] };

function distinctFixture() {
  const data = createVisualFixture();
  const base = data.dashboard.leadership.report.reports[0];
  data.dashboard.leadership.report.reports = periods.map((period, index) => ({
    ...base, period, score: [10, 57, 85][index], core_score: [11, 58, 86][index],
    evidence_coverage: [0.41, 0.72, 0.93][index], active_day_count: [1, 5, 21][index],
    maturity: [0.1, 0.5, 0.9][index], agent_count: [3, 17, 41][index],
    ai_hours: [2.1, 12.7, 93.8][index], peak_concurrency: [2, 6, 11][index],
    average_parallelism: [1.2, 2.3, 3.4][index],
    dimensions: base.dimensions.map((dimension, d) => ({
      ...dimension, score: 10 + index * 30 + d, summary_value: 20 + index * 30 + d,
    })),
    daily_points: [{ day: base.daily_points[0].day, agent_count: 30 + index,
      ai_hours: 40.1 + index, peak_concurrency: 50 + index }],
    projects: [{ ...base.projects[0], project_name: `Period project ${index}`, agent_count: 60 + index,
      ai_hours: 70.1 + index, autonomous_hours: 80.1 + index }],
  }));
  // Keep a deliberately different outer summary, as returned by the backend for the home overview.
  Object.assign(data.dashboard.leadership, { score: 85, evidence_coverage: 0.93, active_day_count: 21 });
  return data;
}

async function load(page, data, language = 'en', theme = 'light') {
  data.settings.config.language = language;
  data.settings.config.theme = theme;
  await page.addInitScript(data => { window.__CODEXU_VISUAL_DATA__ = data; }, data);
  await page.goto('/visual-test.html?surface=leadership');
  await page.getByRole('tab', { name: language === 'en' ? 'AI Leadership' : 'AI 领导力', exact: true }).click();
  return page.locator('#dashboard-home-panel-leadership');
}

async function select(panel, language, index) {
  const button = panel.getByRole('button', { name: labels[language][index], exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('.leadership-period-switcher [aria-pressed="true"]')).toHaveCount(1);
}

async function assertReport(panel, report, language) {
  const index = periods.indexOf(report.period);
  await expect(panel.locator('.leadership-period-badge')).toHaveText(labels[language][index]);
  await expect(panel.getByRole('heading', { name: language === 'en'
    ? `${labels[language][index]} · Trend Snapshot` : `${labels[language][index]}趋势快照`, exact: true })).toBeVisible();
  const known = report.score !== null && report.evidence_coverage > 0 && report.active_day_count > 0;
  const score = known ? `${Math.round(report.score)} / 100` : '--';
  await expect(panel.locator('.leadership-identity-score strong')).toHaveText(score);
  const facts = panel.locator('.leadership-panel-facts');
  await expect(facts).toContainText(score);
  await expect(facts).toContainText(String(report.agent_count));
  await expect(facts).toContainText(`${report.ai_hours.toFixed(1)}h`);
  await expect(facts).toContainText(String(report.peak_concurrency));
  await expect(panel.locator('.leadership-identity-meta')).toContainText(String(report.active_day_count));
  await expect(panel.locator('.leadership-identity-meta')).toContainText(`${Math.round(report.evidence_coverage * 100)}%`);
  for (const dimension of report.dimensions) {
    await expect(panel.locator('article').filter({ hasText: `${dimension.score.toFixed(1)} / 100` }))
      .toContainText(dimension.summary_value.toFixed(2));
  }
  await expect(panel).toContainText(report.core_score.toFixed(1));
  await expect(panel).toContainText(report.maturity.toFixed(1));
  await expect(panel).toContainText(`${report.average_parallelism.toFixed(2)}x`);
  for (const project of report.projects) {
    const row = panel.locator('div.rounded-lg').filter({ has: panel.page().getByText(project.project_name, { exact: true }) });
    await expect(row).toContainText(String(project.agent_count));
    await expect(row).toContainText(project.ai_hours.toFixed(1));
    await expect(row).toContainText(project.autonomous_hours.toFixed(1));
  }
  for (const point of report.daily_points) {
    const row = panel.locator('.grid.grid-cols-4').filter({ hasText: `${point.ai_hours.toFixed(1)}h` });
    await expect(row).toContainText(String(point.agent_count));
    await expect(row).toContainText(String(point.peak_concurrency));
  }
}

for (const language of ['en', 'zh-Hans']) for (const theme of ['light', 'dark']) {
  test(`all detail fields follow the selected period: ${language} ${theme}`, async ({ page }, info) => {
    const data = distinctFixture();
    const panel = await load(page, data, language, theme);
    await expect(panel.getByRole('button', { name: labels[language][2], exact: true })).toHaveAttribute('aria-pressed', 'true');
    const folder = path.join(info.outputDir, 'evidence');
    await mkdir(folder, { recursive: true });
    for (const index of [2, 0, 1, 2, 1, 0]) {
      await select(panel, language, index);
      const report = data.dashboard.leadership.report.reports[index];
      await assertReport(panel, report, language);
      await expect(panel.locator('.leadership-identity-title')).toContainText(['L1', 'L4', 'L6'][index]);
      await expect(panel.locator('.leadership-command-node')).toHaveCount(3);
      await expect(page.locator('.leadership-overview-card .leadership-command-node')).toHaveCount(3);
      await expect(page.locator('.leadership-overview-card')).toContainText('85 / 100');
      await expect(page.locator('.leadership-overview-card')).toContainText('93.8h');
      await expect(panel.locator('.leadership-period-switcher')).toBeVisible();
      const [control, details] = await Promise.all([
        panel.locator('.leadership-period-switcher').boundingBox(), panel.locator('.leadership-panel-primary').boundingBox(),
      ]);
      expect(control.y + control.height).toBeLessThan(details.y);
      const buttons = panel.locator('.leadership-period-switcher button');
      const backgrounds = await buttons.evaluateAll(items => items.map(item => getComputedStyle(item).backgroundColor));
      expect(backgrounds[index]).not.toBe(backgrounds[(index + 1) % 3]);
      const screenshot = await panel.screenshot({ path: path.join(folder, `${periods[index]}.png`), animations: 'disabled' });
      expect(screenshot.subarray(1, 4).toString()).toBe('PNG');
      expect(screenshot.readUInt32BE(16)).toBeGreaterThan(500);
      expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    const button = panel.getByRole('button', { name: labels[language][1], exact: true });
    await button.focus(); await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await assertReport(panel, data.dashboard.leadership.report.reports[1], language);
  });
}

for (const index of [0, 1, 2]) test(`missing ${periods[index]} never borrows another report and can recover`, async ({ page }) => {
  const data = distinctFixture();
  data.dashboard.leadership.report.reports.splice(index, 1);
  const panel = await load(page, data);
  await select(panel, 'en', index);
  await expect(panel.getByRole('status')).toContainText(labels.en[index]);
  await expect(panel.locator('.leadership-panel-primary')).toHaveCount(0);
  await expect(panel).not.toContainText('Period project');
  const other = index === 0 ? 1 : 0;
  await select(panel, 'en', other);
  await assertReport(panel, data.dashboard.leadership.report.reports.find(report => report.period === periods[other]), 'en');
});

for (const [name, changes, expected] of [
  ['null score', { score: null }, '--'],
  ['no evidence', { evidence_coverage: 0 }, '--'],
  ['no active days', { active_day_count: 0 }, '--'],
  ['real zero score', { score: 0 }, '0 / 100'],
]) test(`${name} uses selected evidence instead of the 28-day summary`, async ({ page }) => {
  const data = distinctFixture();
  Object.assign(data.dashboard.leadership.report.reports[0], changes);
  const panel = await load(page, data);
  await select(panel, 'en', 0);
  await expect(panel.locator('.leadership-identity-score strong')).toHaveText(expected);
  await expect(panel.locator('.leadership-identity-title')).not.toContainText('L6');
  await assertReport(panel, data.dashboard.leadership.report.reports[0], 'en');
});

test('absent report keeps period controls available', async ({ page }) => {
  const data = distinctFixture(); data.dashboard.leadership.report = null;
  const panel = await load(page, data);
  for (const index of [0, 1, 2]) {
    await select(panel, 'en', index);
    await expect(panel.getByRole('status')).toContainText(labels.en[index]);
    await expect(panel.locator('.leadership-panel-primary')).toHaveCount(0);
  }
});

test('already returned local reports render with their own period and score', async ({ page }, info) => {
  test.skip(!process.env.CODEXU_LEADERSHIP_REPORTS, 'Read-only local snapshot opt-in');
  const data = createVisualFixture();
  // Only a locally returned aggregate Leadership signal is used; no fresh collection or backend repair is implied.
  data.dashboard.leadership = JSON.parse(await readFile(process.env.CODEXU_LEADERSHIP_REPORTS, 'utf8'));
  const panel = await load(page, data, 'zh-Hans');
  const observations = [];
  const folder = path.join(info.outputDir, 'evidence');
  await mkdir(folder, { recursive: true });
  for (const index of [2, 0, 1]) {
    await select(panel, 'zh-Hans', index);
    const report = data.dashboard.leadership.report?.reports.find(report => report.period === periods[index]);
    if (report) {
      const known = report.score !== null && report.evidence_coverage > 0 && report.active_day_count > 0;
      await expect(panel.locator('.leadership-identity-score strong')).toHaveText(known ? `${Math.round(report.score)} / 100` : '--');
      await expect(panel.locator('.leadership-period-badge')).toHaveText(labels['zh-Hans'][index]);
    } else await expect(panel.getByRole('status')).toContainText(labels['zh-Hans'][index]);
    await panel.screenshot({ path: path.join(folder, `${periods[index]}.png`), animations: 'disabled' });
    observations.push({ period: periods[index], score: report?.score ?? null, agent_count: report?.agent_count ?? null, result: 'PASS' });
  }
  await writeFile(path.join(folder, 'observations.json'), JSON.stringify(observations, null, 2), 'utf8');
});
