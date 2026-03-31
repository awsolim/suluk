import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsStudent, loginAsParent, loginAsTeacher } from './helpers';

test.describe('Authorization - route protection', () => {
  test.describe('Student cannot access admin routes', () => {
    test('student cannot access admin programs page', async ({ page }) => {
      await loginAsStudent(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
      // Should get 404 or redirect
      await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 5000 }).catch(async () => {
        // Or redirected away from admin
        expect(page.url()).not.toContain('/admin/programs');
      });
    });

    test('student cannot access admin members page', async ({ page }) => {
      await loginAsStudent(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);
      await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 5000 }).catch(async () => {
        expect(page.url()).not.toContain('/admin/members');
      });
    });

    test('student cannot access teacher requests page', async ({ page }) => {
      await loginAsStudent(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/teacher-requests`);
      await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 5000 }).catch(async () => {
        expect(page.url()).not.toContain('/admin/teacher-requests');
      });
    });
  });

  test.describe('Parent cannot access admin routes', () => {
    test('parent cannot access admin programs page', async ({ page }) => {
      await loginAsParent(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
      await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 5000 }).catch(async () => {
        expect(page.url()).not.toContain('/admin/programs');
      });
    });
  });

  test.describe('Unauthenticated access', () => {
    test('dashboard requires authentication', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/dashboard`);
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('classes page requires authentication', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/classes`);
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('settings page requires authentication', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('programs page is public (no auth required)', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      // Should NOT redirect to login
      await expect(page).toHaveURL(new RegExp(`/m/${TEST_MOSQUE_SLUG}/programs`));
      await expect(page.getByText(/programs/i).first()).toBeVisible();
    });
  });

  test.describe('Role-specific program restrictions', () => {
    test('teacher sees disabled message on program detail page', async ({ page }) => {
      await loginAsTeacher(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      await page.getByRole('heading', { name: 'Free Quran Studies' }).first().click();
      await expect(page.getByText(/teachers cannot apply/i)).toBeVisible();
    });
  });
});
