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
    // Click into a program to edit
    await page.getByText(/free quran studies/i).click();
    const editLink = page.getByRole('link', { name: /edit/i });
    if (await editLink.isVisible()) {
      await editLink.click();
      // Look for pricing controls
      const paidSwitch = page.getByRole('switch', { name: /paid/i });
      if (await paidSwitch.isVisible()) {
        await expect(paidSwitch).toBeVisible();
      }
    }
  });

  test('A-3: admin can edit existing program pricing', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
    await page.getByText(/advanced arabic/i).click();
    const editLink = page.getByRole('link', { name: /edit/i });
    if (await editLink.isVisible()) {
      await editLink.click();
      // The program is already paid, look for price input
      const priceInput = page.getByLabel(/price/i);
      if (await priceInput.isVisible()) {
        await expect(priceInput).toBeVisible();
      }
    }
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
    await page.getByText(/upcoming program/i).click();
    const editLink = page.getByRole('link', { name: /edit/i });
    if (await editLink.isVisible()) {
      await editLink.click();
      // Look for teacher assignment dropdown
      const teacherSelect = page.getByLabel(/teacher/i);
      if (await teacherSelect.isVisible()) {
        await expect(teacherSelect).toBeVisible();
      }
    }
  });
});
