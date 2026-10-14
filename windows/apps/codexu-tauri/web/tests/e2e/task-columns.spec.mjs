import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createVisualFixture } from './support/fixture-data.mjs';

const titles = {
  en: ['Recent activity', 'To continue', 'Scheduled', 'Archived today'],
  'zh-Hans': ['最近活跃', '待继续', '定时', '今日归档'],
};

for (const language of ['en', 'zh-Hans']) {
  for (const theme of ['light', 'dark']) {
    for (const empty of [false, true]) {
      test(`task columns follow interface language: ${language} ${theme} empty=${empty}`, async ({ page }, info) => {
        const data = createVisualFixture();
        data.settings.config.language = language;
        data.settings.config.theme = theme;
        const columns = data.dashboard.codex.snapshot.task_board.columns;
        for (const column of columns) {
          column.title = `Backend-only ${column.id}`;
          if (empty) { column.items = []; column.count = 0; }
        }
        await page.addInitScript(data => { window.__CODEXU_VISUAL_DATA__ = data; }, data);
        await page.goto('/visual-test.html?surface=tasks');
        await page.getByRole('tab', { name: language === 'en' ? 'Tasks' : '任务', exact: true }).click();
        const panel = page.locator('#dashboard-home-panel-tasks');
        await expect(panel.locator('h4')).toHaveText(titles[language]);
        await expect(panel).not.toContainText('Backend-only');
        await expect(panel.locator('.task-card-title')).toHaveCount(empty ? 0 : 4);
        if (!empty) await expect(panel.locator('.task-card-title')).toHaveText(columns.map(column => column.items[0].title));
        if (language === 'zh-Hans') await expect(panel).not.toContainText(/Recent activity|To continue|Scheduled|Archived today/);
        await mkdir(info.outputDir, { recursive: true });
        await panel.screenshot({ path: path.join(info.outputDir, 'task-columns.png') });
      });
    }
  }
}
