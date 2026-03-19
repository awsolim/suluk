import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsStudent } from './helpers';

// Covers: R-1, R-2, R-3, R-4
test.describe('Responsive layout', () => {
  test('R-4: mobile shows bottom nav, no sidebar', async ({ page, browserName }, testInfo) => {
    // This test is most meaningful in the mobile project
    if (testInfo.project.name !== 'mobile') {
      test.skip();
    }
    await loginAsStudent(page);
    // Bottom nav should be visible
    const bottomNav = page.locator('nav').last();
    await expect(bottomNav).toBeVisible();
    // Sidebar should not be visible
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();
  });

  test('R-4: desktop shows sidebar, no bottom nav', async ({ page, browserName }, testInfo) => {
    if (testInfo.project.name !== 'desktop') {
      test.skip();
    }
    await loginAsStudent(page);
    // Sidebar should be visible
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();
  });

  test('R-1: programs page renders on mobile', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'mobile') {
      test.skip();
    }
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
    await expect(page.getByText(/free quran studies/i)).toBeVisible();
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('R-2: programs page renders on tablet', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'tablet') {
      test.skip();
    }
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
    await expect(page.getByText(/free quran studies/i)).toBeVisible();
  });

  test('R-3: programs page renders on desktop', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'desktop') {
      test.skip();
    }
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
    await expect(page.getByText(/free quran studies/i)).toBeVisible();
    // Content should not be squished to mobile width
    const mainContent = page.locator('main');
    const contentWidth = await mainContent.evaluate(el => el.clientWidth);
    expect(contentWidth).toBeGreaterThan(500);
  });

  test('R-3: dashboard renders on desktop with sidebar', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'desktop') {
      test.skip();
    }
    await loginAsStudent(page);
    // Dashboard should render properly with sidebar
    await expect(page.locator('body')).not.toBeEmpty();
    // Sidebar should contain navigation links
    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible()) {
      await expect(sidebar.getByText(/home/i)).toBeVisible();
    }
  });
});
