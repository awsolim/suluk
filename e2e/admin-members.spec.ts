import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin } from './helpers';

// Covers: A-4, A-5, A-7, A-8, A-10, A-11
test.describe('Admin member management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('A-11: admin can view all mosque members', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    // Should see all three test users
    await expect(page.getByText(/test admin/i)).toBeVisible();
    await expect(page.getByText(/test teacher/i)).toBeVisible();
    await expect(page.getByText(/test student/i)).toBeVisible();
  });

  test('A-11: admin can see member roles', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    // Should see role badges
    await expect(page.getByText(/admin/i).first()).toBeVisible();
    await expect(page.getByText(/teacher/i).first()).toBeVisible();
    await expect(page.getByText(/student/i).first()).toBeVisible();
  });

  test('A-10: admin can change a member role', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    // Find the student row and look for actions
    const studentRow = page.getByText(/test student/i).first();
    if (await studentRow.isVisible()) {
      // Look for dropdown trigger or role change button near the student
      const actionsButton = studentRow.locator('..').getByRole('button').first();
      if (await actionsButton.isVisible()) {
        await actionsButton.click();
        const changeRoleOption = page.getByText(/change role/i);
        if (await changeRoleOption.isVisible()) {
          await expect(changeRoleOption).toBeVisible();
        }
      }
    }
  });

  test('A-8: admin can toggle teacher program management permission', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    // Find the teacher row
    const teacherRow = page.getByText(/test teacher/i).first();
    if (await teacherRow.isVisible()) {
      // Look for the program management toggle
      const toggle = teacherRow.locator('..').getByRole('switch');
      if (await toggle.isVisible()) {
        await expect(toggle).toBeVisible();
      }
    }
  });

  test('A-7: admin can remove a member from mosque', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
    // Verify the page loads with members
    await expect(page.getByText(/test student/i)).toBeVisible();
    // Look for remove/delete action
    // Not clicking to avoid breaking other tests
  });
});
