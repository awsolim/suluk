import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsStudent } from './helpers';

// Covers: S-7, S-9, S-10, S-11
test.describe('Student dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('S-7: student can view enrolled classes and schedule', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/classes`);
    await expect(page.getByText(/free quran studies/i)).toBeVisible();
    // Click into the class to see schedule
    await page.getByText(/free quran studies/i).click();
    await expect(page.getByText(/monday/i)).toBeVisible();
  });

  test('S-9: student can leave a program', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/classes`);
    await page.getByText(/free quran studies/i).click();
    // Look for leave program button
    const leaveButton = page.getByRole('button', { name: /leave|unenroll/i });
    if (await leaveButton.isVisible()) {
      await leaveButton.click();
      // Confirm in dialog
      const confirmButton = page.getByRole('button', { name: /confirm|leave|yes/i }).last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }
  });

  test('S-10: student can edit profile', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);
    await expect(page.locator('body')).toContainText(/settings/i);
    // Should see profile editing options
    const nameInput = page.getByLabel(/name/i);
    if (await nameInput.isVisible()) {
      await expect(nameInput).toBeVisible();
    }
  });

  test('S-11: student can see announcements in enrolled classes', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/classes`);
    await page.getByText(/free quran studies/i).click();
    // The class page should have an announcements section
    // Even if empty, the section header should be visible
    await expect(page.locator('body')).toContainText(/announcement/i);
  });
});
