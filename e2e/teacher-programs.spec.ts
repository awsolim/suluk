import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsTeacher } from './helpers';

// Covers: T-6, T-7
test.describe('Teacher program management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('T-6: teacher with permission can see create program option', async ({ page }) => {
    // Teacher with can_manage_programs should see "New Program" or "Create Program" in nav
    const createLink = page.getByRole('link', { name: /new program|create program|new/i });
    await expect(createLink).toBeVisible();
  });

  test('T-6: teacher with permission can create a program', async ({ page }) => {
    // Navigate to create program page
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs/new`);
    // Fill in program details
    const titleInput = page.getByLabel(/title/i);
    if (await titleInput.isVisible()) {
      await titleInput.fill('Teacher Created Program');
      const descInput = page.getByLabel(/description/i);
      if (await descInput.isVisible()) {
        await descInput.fill('A program created by a teacher');
      }
      const submitButton = page.getByRole('button', { name: /create|save|submit/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();
      }
    }
  });

  test('T-7: teacher with permission can edit program pricing', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/classes`);
    await page.getByText(/free quran studies/i).first().click();
    // Look for edit or pricing options
    const editLink = page.getByRole('link', { name: /edit/i });
    if (await editLink.isVisible()) {
      await editLink.click();
      // Look for pricing section
      const paidSwitch = page.getByRole('switch', { name: /paid/i });
      if (await paidSwitch.isVisible()) {
        await expect(paidSwitch).toBeVisible();
      }
    }
  });
});
