import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG } from './helpers';

// Covers: US-G1, US-G2, US-G3, US-G4
test.describe('Google OAuth buttons present on all auth pages', () => {
  test('US-G1: global signup page has Continue with Google button', async ({ page }) => {
    await page.goto('/signup');
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
  });

  test('US-G2: global login page has Continue with Google button', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
  });

  test('US-G3: mosque signup page has Continue with Google button', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
  });

  test('US-G4: mosque login page has Continue with Google button', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/login`);
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
  });

  test('US-G1: global signup page has "or" divider between Google and email form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText('or')).toBeVisible();
    // Google button should appear before the email form
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('US-G2: global login page has "or" divider between Google and email form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('or')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});

test.describe('Auth callback route', () => {
  test('callback without code redirects to fallback', async ({ page }) => {
    await page.goto('/auth/callback');
    // Should redirect to / (the fallback) since no code param
    await expect(page).toHaveURL('/');
  });

  test('callback with invalid code redirects to login with error', async ({ page }) => {
    await page.goto('/auth/callback?code=invalid-code');
    // Should redirect to /login with an error param
    await page.waitForURL('**/login**', { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
