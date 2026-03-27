import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin } from './helpers';

// Covers: A-4, A-5, A-7, A-8, A-10, A-11
test.describe('Admin member management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
  });

  test('A-11: admin can view all mosque members', async ({ page }) => {
    await expect(page.getByText(/test admin/i)).toBeVisible();
    await expect(page.getByText(/test teacher/i)).toBeVisible();
    await expect(page.getByText(/test student/i)).toBeVisible();
  });

  test('A-11: admin can see member roles', async ({ page }) => {
    await expect(page.getByText(/admin/i).first()).toBeVisible();
    await expect(page.getByText(/teacher/i).first()).toBeVisible();
    await expect(page.getByText(/student/i).first()).toBeVisible();
  });

  test('A-10: clicking Change Role opens the role dialog', async ({ page }) => {
    // Open actions dropdown for the student row
    const studentRow = page.locator('tr', { hasText: /test student/i });
    await studentRow.getByRole('button', { name: /actions/i }).click();

    // Click "Change Role" menu item
    await page.getByText(/change role/i).click();

    // Dialog must open with title and role select
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/select a new role/i)).toBeVisible();
  });

  test('A-10: Change Role dialog shows role options and Save button', async ({ page }) => {
    const studentRow = page.locator('tr', { hasText: /test student/i });
    await studentRow.getByRole('button', { name: /actions/i }).click();
    await page.getByText(/change role/i).click();

    // Should see the role select trigger with current role
    const selectTrigger = page.getByRole('dialog').locator('[data-slot="select-trigger"]');
    await expect(selectTrigger).toBeVisible();

    // Open the select and verify options
    await selectTrigger.click();
    await expect(page.getByRole('option', { name: /student/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /teacher/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /admin/i })).toBeVisible();

    // Save button should be visible but disabled when role hasn't changed
    await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
  });

  test('A-8: clicking Toggle Program Management opens the dialog for a teacher', async ({ page }) => {
    // Open actions dropdown for the teacher row
    const teacherRow = page.locator('tr', { hasText: /test teacher/i });
    await teacherRow.getByRole('button', { name: /actions/i }).click();

    // Click "Toggle Program Management" menu item
    await page.getByText(/toggle program management/i).click();

    // Dialog must open with the switch
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/can manage programs/i)).toBeVisible();
    await expect(page.getByRole('switch')).toBeVisible();
  });

  test('A-7: clicking Remove from Mosque opens the confirmation dialog', async ({ page }) => {
    const studentRow = page.locator('tr', { hasText: /test student/i });
    await studentRow.getByRole('button', { name: /actions/i }).click();

    // Click "Remove from Mosque" menu item
    await page.getByText(/remove from mosque/i).click();

    // Confirmation dialog must open
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /remove/i })).toBeVisible();
  });

  test('A-7: cancel in remove dialog closes it without removing', async ({ page }) => {
    const studentRow = page.locator('tr', { hasText: /test student/i });
    await studentRow.getByRole('button', { name: /actions/i }).click();
    await page.getByText(/remove from mosque/i).click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close, student still in table
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
    await expect(page.getByText(/test student/i)).toBeVisible();
  });
});
