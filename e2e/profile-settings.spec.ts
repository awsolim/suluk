import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsStudent, loginAsAdmin, loginAsTeacher } from './helpers';

test.describe('Profile settings', () => {
  test.describe('Student profile', () => {
    test('settings page loads with user info', async ({ page }) => {
      await loginAsStudent(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);
      await expect(page.locator('body')).toContainText(/settings/i);
    });

    test('settings page shows name field', async ({ page }) => {
      await loginAsStudent(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);
      const nameField = page.getByLabel(/name/i).first();
      await expect(nameField).toBeVisible();
    });
  });

  test.describe('Admin settings', () => {
    test('admin sees Stripe payments section', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);
      // Admin should see payments/Stripe section
      await expect(page.getByText(/payment|stripe/i).first()).toBeVisible();
    });

    test('admin does not see teacher request section', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);
      await expect(page.getByText(/request teacher role/i)).not.toBeVisible();
    });
  });

  test.describe('Teacher settings', () => {
    test('teacher does not see teacher request section', async ({ page }) => {
      await loginAsTeacher(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);
      await expect(page.getByText(/request teacher role/i)).not.toBeVisible();
    });
  });
});
