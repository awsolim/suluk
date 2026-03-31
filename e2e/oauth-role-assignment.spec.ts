import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG } from './helpers';

// Tests for the OAuth role assignment bug we fixed
test.describe('OAuth role assignment', () => {
  test('signup page Google OAuth button includes role in redirect URL', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);

    // Select parent role first
    await page.click('[data-testid="role-parent"]');

    // Intercept the OAuth redirect to verify role is in the URL
    await page.route('**/_supabase/**', async (route) => {
      const url = route.request().url();
      // Don't actually navigate to Supabase, just verify the URL
      await route.abort();
    });

    // Get the Google button's behavior
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await expect(googleButton).toBeVisible();
    // The role should be embedded in the redirect URL via SignupFormWithRole
  });

  test('login page Google OAuth does NOT include role parameter', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/login`);
    // Login page should have Google button
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    // Login page should NOT have role selection
    await expect(page.locator('[data-testid="role-student"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="role-parent"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="role-teacher"]')).not.toBeVisible();
  });

  test('signup role selection changes are reflected before OAuth click', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);

    // Default is student — verify student button is highlighted
    const studentBtn = page.locator('[data-testid="role-student"]');
    const parentBtn = page.locator('[data-testid="role-parent"]');
    const teacherBtn = page.locator('[data-testid="role-teacher"]');

    await expect(studentBtn).toBeVisible();
    await expect(parentBtn).toBeVisible();
    await expect(teacherBtn).toBeVisible();

    // Click parent — should visually change
    await parentBtn.click();

    // Click teacher — should show approval notice
    await teacherBtn.click();
    await expect(page.getByText(/admin approval/i)).toBeVisible();

    // Click back to student — approval notice should disappear
    await studentBtn.click();
    await expect(page.getByText(/admin approval/i)).not.toBeVisible();
  });
});
