import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin } from './helpers';

// Covers: A-4, A-5, A-7, A-8, A-10, A-11
test.describe('Admin member management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
  });

  test('A-11: admin can view all mosque members', async ({ page }) => {
    // Use font-medium span inside the table cells for member names
    await expect(page.locator('table').getByText('Test Admin')).toBeVisible();
    await expect(page.locator('table').getByText('Test Teacher')).toBeVisible();
    await expect(page.locator('table').getByText('Test Student')).toBeVisible();
  });

  test('A-11: admin can see member roles', async ({ page }) => {
    await expect(page.getByText('Admin').first()).toBeVisible();
    await expect(page.getByText('Teacher').first()).toBeVisible();
    await expect(page.getByText('Student').first()).toBeVisible();
  });

  test('A-10: clicking Change Role opens the role dialog', async ({ page }) => {
    // Open actions dropdown for the student row
    const studentRow = page.locator('tr', { hasText: 'Test Student' });
    await studentRow.getByRole('button', { name: /actions/i }).click();

    // Click "Change Role" menu item
    await page.getByText('Change Role').click();

    // Dialog must open with title and role select
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/select a new role/i)).toBeVisible();
  });

  test('A-10: Change Role dialog shows role options and Save button', async ({ page }) => {
    const studentRow = page.locator('tr', { hasText: 'Test Student' });
    await studentRow.getByRole('button', { name: /actions/i }).click();
    await page.getByText('Change Role').click();

    // Should see the role select trigger
    const selectTrigger = page.getByRole('dialog').getByRole('combobox');
    await expect(selectTrigger).toBeVisible();

    // Open the select and verify options
    await selectTrigger.click();
    await expect(page.getByRole('option', { name: 'Student' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Teacher' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Admin' })).toBeVisible();

    // Save button should be visible
    await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
  });

  test('A-8: clicking Toggle Program Management opens the dialog for a teacher', async ({ page }) => {
    // Open actions dropdown for the teacher row
    const teacherRow = page.locator('tr', { hasText: 'Test Teacher' });
    await teacherRow.getByRole('button', { name: /actions/i }).click();

    // Click "Toggle Program Management" menu item
    await page.getByText('Toggle Program Management').click();

    // Dialog must open with the switch
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/can manage programs/i)).toBeVisible();
    await expect(page.getByRole('switch')).toBeVisible();
  });

  test('A-7: clicking Remove from Mosque opens the confirmation dialog', async ({ page }) => {
    const studentRow = page.locator('tr', { hasText: 'Test Student' });
    await studentRow.getByRole('button', { name: /actions/i }).click();

    // Click "Remove from Mosque" menu item
    await page.getByText('Remove from Mosque').click();

    // Confirmation dialog must open
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /remove/i })).toBeVisible();
  });

  test('A-7: cancel in remove dialog closes it without removing', async ({ page }) => {
    const studentRow = page.locator('tr', { hasText: 'Test Student' });
    await studentRow.getByRole('button', { name: /actions/i }).click();
    await page.getByText('Remove from Mosque').click();

    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close, student still in table
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
    await expect(page.locator('table').getByText('Test Student')).toBeVisible();
  });
});
