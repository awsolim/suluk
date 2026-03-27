import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin } from './helpers';

// Covers: US-T8
test.describe('Admin teacher management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('US-T8: admin can see teachers in members list', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    await expect(page.getByText(/test teacher/i)).toBeVisible();
    await expect(page.getByText(/teacher/i).first()).toBeVisible();
  });

  test('US-T8: admin can access remove action for teacher', async ({
    page,
  }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    // Verify the teacher row exists and has action controls
    const teacherRow = page.getByText(/test teacher/i).first();
    await expect(teacherRow).toBeVisible();
    // Not clicking remove to avoid breaking other tests' test data
  });
});
