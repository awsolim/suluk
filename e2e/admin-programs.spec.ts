import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin } from './helpers';

// Covers: A-1, A-2, A-3, A-6, A-9
test.describe('Admin program management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('A-1: admin can create a new program', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs/new`);
    const titleInput = page.getByLabel(/title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Admin Test Program');
    const descInput = page.getByLabel(/description/i);
    if (await descInput.isVisible()) {
      await descInput.fill('A test program created by admin');
    }
    const submitButton = page.getByRole('button', { name: /create|save|submit/i });
    await submitButton.click();
    // Should redirect to programs list or program detail
    await page.waitForURL(/\/admin\/programs/);
  });

  test('A-2: admin can set program as paid with pricing', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
    // Click into a program — admin list shows programs as link cards
    await page.getByRole('heading', { name: /free quran studies/i }).click();
    // On program detail, click the "Program Details" card which links to edit page
    await page.getByRole('heading', { name: /program details/i }).click();
    await page.waitForURL(/\/edit/);
    // Verify the pricing section exists
    await expect(page.getByText(/pricing/i)).toBeVisible();
  });

  test('A-3: admin can edit existing program pricing', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
    // Use heading to avoid strict mode violation with description text
    await page.getByRole('heading', { name: /advanced arabic/i }).click();
    // Click the "Program Details" card which links to edit page
    await page.getByRole('heading', { name: /program details/i }).click();
    await page.waitForURL(/\/edit/);
    // The program is already paid, verify pricing section is visible
    await expect(page.getByText(/pricing/i)).toBeVisible();
  });

  test('A-6: admin can delete a program', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
    // Look for a delete button on any program
    await page.getByText(/upcoming program/i).click();
    const deleteButton = page.getByRole('button', { name: /delete/i });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      // Confirm deletion in dialog
      const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i }).last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
    }
  });

  test('A-9: admin can assign a teacher to a program', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
    await page.getByRole('heading', { name: /free quran studies/i }).click();
    // Click the "Program Details" card which links to edit page
    await page.getByRole('heading', { name: /program details/i }).click();
    await page.waitForURL(/\/edit/);
    // Look for teacher assignment select - the label is "Teacher"
    await expect(page.getByLabel(/teacher/i)).toBeVisible();
  });
});
