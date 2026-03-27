import { test, expect } from '@playwright/test';

// Covers: US-M1, US-M2
test.describe('Masjid creation flow', () => {
  const uniqueSlug = `test-create-${Date.now()}`;

  test('US-M2: user can sign up via global signup page', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByLabel(/full name|name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('US-M2: user can log in via global login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in|login/i })).toBeVisible();
  });

  test('US-M1: logged-in user sees Create a Masjid button on directory', async ({ page }) => {
    // Log in via global login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin-e2e@test.suluk.dev');
    await page.getByLabel(/password/i).fill('test-password-123!');
    await page.getByRole('button', { name: /log in|login/i }).click();
    await page.waitForURL('**/', { timeout: 10000 });

    await page.goto('/');
    await expect(page.getByRole('link', { name: /create a masjid/i })).toBeVisible();
  });

  test('US-M1: unauthenticated user sees Sign Up instead of Create', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('US-M1: create masjid page requires authentication', async ({ page }) => {
    await page.goto('/create-masjid');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('US-M1: create masjid form has required fields', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin-e2e@test.suluk.dev');
    await page.getByLabel(/password/i).fill('test-password-123!');
    await page.getByRole('button', { name: /log in|login/i }).click();
    await page.waitForURL('**/', { timeout: 10000 });

    await page.goto('/create-masjid');
    await expect(page.getByLabel(/masjid name/i)).toBeVisible();
    await expect(page.getByLabel(/url slug/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create masjid/i })).toBeVisible();
  });
});
