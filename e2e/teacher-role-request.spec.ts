import { test, expect } from '@playwright/test';
import {
  TEST_MOSQUE_SLUG,
  TEST_STUDENT,
  TEST_ADMIN,
  TEST_TEACHER,
  createTestSupabaseClient,
  loginAsStudent,
  loginAsAdmin,
  loginAsTeacher,
} from './helpers';

// Covers: Teacher role request from within mosque settings
// Serial: tests share DB state (student's teacher request) so order matters
test.describe.serial('Teacher role request from settings page', () => {
  // Clean up any teacher requests from the student before tests
  test.beforeAll(async () => {
    const supabase = createTestSupabaseClient();
    const { data: mosque } = await supabase
      .from('mosques')
      .select('id')
      .eq('slug', TEST_MOSQUE_SLUG)
      .maybeSingle();
    const { data: users } = await supabase.auth.admin.listUsers();
    const student = users?.users.find((u) => u.email === TEST_STUDENT.email);
    if (mosque && student) {
      await supabase
        .from('teacher_join_requests')
        .delete()
        .eq('profile_id', student.id)
        .eq('mosque_id', mosque.id);
    }
  });

  test('student sees "Request Teacher Role" button on settings page', async ({
    page,
  }) => {
    await loginAsStudent(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);
    await expect(
      page.getByRole('button', { name: /request teacher role/i })
    ).toBeVisible();
  });

  test('student can submit teacher request and sees pending status', async ({
    page,
  }) => {
    await loginAsStudent(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);

    await page.getByRole('button', { name: /request teacher role/i }).click();

    await expect(page.getByText(/pending approval/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('pending status persists on settings page reload', async ({ page }) => {
    // Seed a pending request so this test is self-contained
    const supabase = createTestSupabaseClient();
    const { data: mosque } = await supabase
      .from('mosques')
      .select('id')
      .eq('slug', TEST_MOSQUE_SLUG)
      .maybeSingle();
    const { data: users } = await supabase.auth.admin.listUsers();
    const student = users?.users.find((u) => u.email === TEST_STUDENT.email);
    if (mosque && student) {
      await supabase.from('teacher_join_requests').upsert(
        {
          mosque_id: mosque.id,
          profile_id: student.id,
          status: 'pending',
        },
        { onConflict: 'mosque_id,profile_id' }
      );
    }

    await loginAsStudent(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);

    await expect(page.getByText(/pending approval/i)).toBeVisible({
      timeout: 10000,
    });
    // Button should NOT be visible
    await expect(
      page.getByRole('button', { name: /request teacher role/i })
    ).not.toBeVisible();
  });

  test('admin does NOT see teacher request section on settings', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);

    await expect(page.getByText(/teacher access/i)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('teacher does NOT see teacher request section on settings', async ({
    page,
  }) => {
    await loginAsTeacher(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);

    await expect(page.getByText(/teacher access/i)).not.toBeVisible({
      timeout: 5000,
    });
  });

  // Clean up after all tests
  test.afterAll(async () => {
    const supabase = createTestSupabaseClient();
    const { data: mosque } = await supabase
      .from('mosques')
      .select('id')
      .eq('slug', TEST_MOSQUE_SLUG)
      .maybeSingle();
    const { data: users } = await supabase.auth.admin.listUsers();
    const student = users?.users.find((u) => u.email === TEST_STUDENT.email);
    if (mosque && student) {
      await supabase
        .from('teacher_join_requests')
        .delete()
        .eq('profile_id', student.id)
        .eq('mosque_id', mosque.id);
    }
  });
});
