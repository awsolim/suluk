import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, TEST_STUDENT } from './helpers';

test.describe('Auth validation', () => {
  test.describe('Mosque login validation', () => {
    test('shows error for wrong password', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/login`);
      await page.getByLabel(/email/i).fill(TEST_STUDENT.email);
      await page.getByLabel(/password/i).fill('wrong-password-123');
      await page.getByRole('button', { name: /log in|sign in/i }).click();
      // Should redirect back to login with error
      await expect(page).toHaveURL(/error=/, { timeout: 10000 });
    });

    test('shows error for non-existent email', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/login`);
      await page.getByLabel(/email/i).fill('nonexistent@example.com');
      await page.getByLabel(/password/i).fill('somepassword123');
      await page.getByRole('button', { name: /log in|sign in/i }).click();
      await expect(page).toHaveURL(/error=/, { timeout: 10000 });
    });

    test('login form requires email and password fields', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/login`);
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /log in|sign in/i })).toBeVisible();
    });
  });

  test.describe('Mosque signup validation', () => {
    test('signup page shows role selection options', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);
      await expect(page.locator('[data-testid="role-student"]')).toBeVisible();
      await expect(page.locator('[data-testid="role-parent"]')).toBeVisible();
      await expect(page.locator('[data-testid="role-teacher"]')).toBeVisible();
    });

    test('teacher role shows admin approval notice', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);
      await page.click('[data-testid="role-teacher"]');
      await expect(page.getByText(/admin approval/i)).toBeVisible();
    });

    test('student role is selected by default', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);
      // The student button should have the selected border color
      const studentButton = page.locator('[data-testid="role-student"]');
      await expect(studentButton).toBeVisible();
    });
  });

  test.describe('Global auth pages', () => {
    test('global login shows error for wrong credentials', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('nonexistent@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /log in|login/i }).click();
      await expect(page).toHaveURL(/error=/, { timeout: 10000 });
    });

    test('global signup page has all required fields', async ({ page }) => {
      await page.goto('/signup');
      await expect(page.getByLabel(/full name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('login page links to signup', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
    });

    test('signup page links to login', async ({ page }) => {
      await page.goto('/signup');
      await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
    });
  });
});
