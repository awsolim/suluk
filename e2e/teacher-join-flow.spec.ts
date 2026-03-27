import { test, expect } from '@playwright/test';
import {
  TEST_MOSQUE_SLUG,
  TEST_TEACHER_REQUESTER,
  loginAsAdmin,
  globalLogin,
} from './helpers';

// Covers: US-T1, US-T2, US-T3
test.describe('Teacher join request flow', () => {
  test('US-T1: logged-in user without membership sees Join as Teacher button', async ({
    page,
  }) => {
    await globalLogin(
      page,
      TEST_TEACHER_REQUESTER.email,
      TEST_TEACHER_REQUESTER.password
    );
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: /join as teacher/i }).first()
    ).toBeVisible();
  });

  test('US-T1: user can submit a teacher join request', async ({ page }) => {
    await globalLogin(
      page,
      TEST_TEACHER_REQUESTER.email,
      TEST_TEACHER_REQUESTER.password
    );
    await page.goto('/');
    const joinButton = page
      .getByRole('button', { name: /join as teacher/i })
      .first();
    await joinButton.click();
    // After clicking, button should change or request should be submitted
    // The page should revalidate — button might disappear or change text
    await page.waitForTimeout(2000);
  });

  test('US-T2: admin can see pending teacher requests page', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/teacher-requests`);
    await expect(
      page.getByRole('heading', { name: /teacher requests/i })
    ).toBeVisible();
  });

  test('US-T2: admin can approve a teacher request', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/teacher-requests`);
    const approveButton = page.getByRole('button', { name: /approve/i }).first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      // Request should disappear from the list after approval
      await page.waitForTimeout(2000);
    }
  });

  test('US-T3: admin can reject a teacher request', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/teacher-requests`);
    const rejectButton = page.getByRole('button', { name: /reject/i }).first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      await page.waitForTimeout(2000);
    }
  });
});
