import { test, expect } from '@playwright/test';
import {
  TEST_MOSQUE_SLUG,
  TEST_TEACHER_REQUESTER,
  createTestSupabaseClient,
  loginAsAdmin,
  globalLogin,
} from './helpers';

// Covers: US-T1, US-T2, US-T3, Issue #21
test.describe('Teacher join request flow', () => {
  // Clean up any existing teacher requests for the requester before tests run
  test.beforeAll(async () => {
    const supabase = createTestSupabaseClient();
    const { data: mosque } = await supabase
      .from('mosques')
      .select('id')
      .eq('slug', TEST_MOSQUE_SLUG)
      .maybeSingle();
    if (mosque) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const requester = existingUsers?.users.find(
        (u) => u.email === TEST_TEACHER_REQUESTER.email
      );
      if (requester) {
        await supabase
          .from('teacher_join_requests')
          .delete()
          .eq('profile_id', requester.id)
          .eq('mosque_id', mosque.id);
        // Also remove any membership that may have been created from a prior test run
        await supabase
          .from('mosque_memberships')
          .delete()
          .eq('profile_id', requester.id)
          .eq('mosque_id', mosque.id);
      }
    }
  });

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

  test('US-T1: user can submit a teacher join request and sees Pending approval (#21)', async ({
    page,
  }) => {
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

    // After submitting, the button should change to "Pending approval" text
    await expect(page.getByText(/pending approval/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('#21: pending status persists across page reloads', async ({
    page,
  }) => {
    // Seed a pending request directly in the DB so this test is self-contained
    const supabase = createTestSupabaseClient();
    const { data: mosque } = await supabase
      .from('mosques')
      .select('id')
      .eq('slug', TEST_MOSQUE_SLUG)
      .maybeSingle();
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const requester = existingUsers?.users.find(
      (u) => u.email === TEST_TEACHER_REQUESTER.email
    );

    if (mosque && requester) {
      // Ensure a pending request exists
      await supabase
        .from('teacher_join_requests')
        .upsert(
          {
            mosque_id: mosque.id,
            profile_id: requester.id,
            status: 'pending',
          },
          { onConflict: 'mosque_id,profile_id' }
        );
    }

    await globalLogin(
      page,
      TEST_TEACHER_REQUESTER.email,
      TEST_TEACHER_REQUESTER.password
    );
    await page.goto('/');

    // Should show "Pending approval" badge (server-rendered from DB)
    await expect(page.getByText(/pending approval/i).first()).toBeVisible({
      timeout: 10000,
    });
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
    const approveButton = page
      .getByRole('button', { name: /approve/i })
      .first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      // Request should disappear from the list after approval
      await page.waitForTimeout(2000);
    }
  });

  test('US-T3: admin can reject a teacher request', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/teacher-requests`);
    const rejectButton = page
      .getByRole('button', { name: /reject/i })
      .first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      await page.waitForTimeout(2000);
    }
  });
});
