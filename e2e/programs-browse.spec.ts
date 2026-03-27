import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG } from './helpers';

// Covers: S-1, S-8, R-5
test.describe('Programs browsing', () => {
  test('S-1: can browse programs without logging in', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
    await expect(page.locator('body')).toContainText(/program/i);
    // Should see at least one program card
    await expect(page.getByText('Free Quran Studies')).toBeVisible();
  });

  test('S-8: programs page shows login/signup links for unauthenticated users', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
    await expect(page.getByRole('link', { name: /log in|login/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up|signup/i })).toBeVisible();
  });

  test('R-5: programs page does not crash with incomplete program data', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
    // The "Upcoming Program" has no teacher, no schedule, no description
    // Page should not crash - it should render with fallbacks
    await expect(page.getByText('Upcoming Program')).toBeVisible();
    // Page should not show an error
    await expect(page.locator('[data-nextjs-dialog]')).not.toBeVisible();
  });

  test('S-1: can view program details without logging in', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
    await page.getByText('Free Quran Studies').click();
    await expect(page.locator('body')).toContainText(/quran/i);
  });
});
