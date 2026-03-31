import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin } from './helpers';

test.describe('Program creation validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs/new`);
  });

  test('new program page shows all required form fields', async ({ page }) => {
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/assigned teacher/i)).toBeVisible();
    await expect(page.getByLabel(/tags/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create program/i })).toBeVisible();
  });

  test('new program page shows active checkbox defaulted to checked', async ({ page }) => {
    const activeCheckbox = page.locator('input[name="is_active"]');
    await expect(activeCheckbox).toBeChecked();
  });

  test('teacher select is visible', async ({ page }) => {
    const teacherSelect = page.getByLabel(/assigned teacher/i);
    await expect(teacherSelect).toBeVisible();
  });

  test('new program page has schedule editor', async ({ page }) => {
    // The ProgramScheduleEditor should be present
    await expect(page.getByText(/schedule/i).first()).toBeVisible();
  });

  test('new program page has pricing section', async ({ page }) => {
    // PricingEditor renders a Free/Paid switch
    await expect(page.getByRole('switch')).toBeVisible();
  });
});
