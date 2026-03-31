import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsStudent } from './helpers';

test.describe('Mosque home page', () => {
  test('unauthenticated user sees welcome page with mosque info', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}`);
    // Should see mosque name and call-to-action buttons
    await expect(page.getByRole('heading', { name: /welcome to test mosque/i })).toBeVisible();
    // Should see login/signup links
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible();
  });

  test('unauthenticated user sees view programs link', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}`);
    await expect(page.getByRole('link', { name: /program/i })).toBeVisible();
  });

  test('authenticated user is redirected to dashboard', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}`);
    await expect(page).toHaveURL(new RegExp(`/m/${TEST_MOSQUE_SLUG}/dashboard`), { timeout: 10000 });
  });
});
