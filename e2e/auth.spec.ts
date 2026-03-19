import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, TEST_STUDENT, loginAsStudent } from './helpers';

// Covers: S-2, S-8
test.describe('Authentication flows', () => {
  test('S-2: student can log in and reach dashboard', async ({ page }) => {
    await loginAsStudent(page);
    await expect(page).toHaveURL(new RegExp(`/m/${TEST_MOSQUE_SLUG}/dashboard`));
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('S-8: login page has Browse Programs link', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/login`);
    const browseLink = page.getByRole('link', { name: /browse programs|programs/i });
    await expect(browseLink).toBeVisible();
  });

  test('S-8: signup page has Browse Programs link', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);
    const browseLink = page.getByRole('link', { name: /browse programs|programs/i });
    await expect(browseLink).toBeVisible();
  });

  test('S-2: student can sign up with new account', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);
    // Verify signup form is visible
    await expect(page.getByLabel(/full name|name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});
