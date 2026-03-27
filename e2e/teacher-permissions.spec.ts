import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsTeacher } from './helpers';

// Covers: US-T4, US-T5, US-T6, US-T7
test.describe('Teacher permissions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('US-T4: teacher can access program management', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
    // Teacher should be able to see the programs page (not 404)
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('US-T4: teacher can access create new program page', async ({
    page,
  }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs/new`);
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('US-T6: teacher can access members page', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    // Teacher should be able to see the members list
    await expect(
      page.getByRole('heading', { name: /members/i })
    ).toBeVisible();
  });

  test('US-T7: teacher cannot access teacher requests page', async ({
    page,
  }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/teacher-requests`);
    // Should get 404 since only admins can access
    await expect(page.locator('body')).toContainText('404');
  });
});
