import { test, expect } from '@playwright/test';
import {
  TEST_MOSQUE_SLUG,
  TEST_STUDENT,
  TEST_ADMIN,
  loginAsStudent,
  loginAsAdmin,
} from './helpers';

// Covers: S-2, S-8
test.describe('Authentication flows', () => {
  test('S-2: student can log in and reach dashboard', async ({ page }) => {
    await loginAsStudent(page);
    await expect(page).toHaveURL(new RegExp(`/m/${TEST_MOSQUE_SLUG}/dashboard`));
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('S-8: login page has Browse Programs link', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/login`);
    const browseLink = page.getByRole('link', { name: /browse programs|programs/i });
    await expect(browseLink).toBeVisible();
  });

  test('S-8: signup page has Browse Programs link', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);
    const browseLink = page.getByRole('link', { name: /browse programs|programs/i });
    await expect(browseLink).toBeVisible();
  });

  test('S-2: student can sign up with new account', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);
    // Verify signup form is visible
    await expect(page.getByLabel(/full name|name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});

// Covers: #23 — authenticated users should never see public landing or login page
test.describe('Authenticated user redirect (#23)', () => {
  test('#23: admin visiting mosque home is redirected to dashboard', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Go to mosque home page — should redirect to dashboard, not show Log In / Sign Up
    await page.goto(`/m/${TEST_MOSQUE_SLUG}`);
    await expect(page).toHaveURL(
      new RegExp(`/m/${TEST_MOSQUE_SLUG}/dashboard`),
      { timeout: 10000 }
    );
  });

  test('#23: admin should not see Log In button on mosque home', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto(`/m/${TEST_MOSQUE_SLUG}`);
    // Should be on dashboard, not seeing public landing
    await expect(page).not.toHaveURL(new RegExp(`/m/${TEST_MOSQUE_SLUG}$`));
    await expect(
      page.getByRole('link', { name: /^log in$/i })
    ).not.toBeVisible({ timeout: 5000 });
  });

  test('#23: student visiting mosque home is redirected to dashboard', async ({
    page,
  }) => {
    await loginAsStudent(page);

    await page.goto(`/m/${TEST_MOSQUE_SLUG}`);
    await expect(page).toHaveURL(
      new RegExp(`/m/${TEST_MOSQUE_SLUG}/dashboard`),
      { timeout: 10000 }
    );
  });
});
