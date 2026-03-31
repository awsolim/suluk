import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin, createTestSupabaseClient } from './helpers';

// Tests that actually execute admin member management actions
test.describe('Admin member actions (execute)', () => {
  const testMemberEmail = 'member-action-test@test.tareeqah.dev';
  let testUserId: string | null = null;

  test.beforeAll(async () => {
    const supabase = createTestSupabaseClient();
    const mosqueId = process.env.TEST_MOSQUE_ID;
    if (!mosqueId) return;

    // Clean up any existing test user first
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find((u) => u.email === testMemberEmail);
    if (existingUser) {
      await supabase.from('mosque_memberships').delete().eq('profile_id', existingUser.id);
      await supabase.from('profiles').delete().eq('id', existingUser.id);
      await supabase.auth.admin.deleteUser(existingUser.id);
    }

    // Create a fresh test user
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: testMemberEmail,
      password: 'test-password-123!',
      email_confirm: true,
    });

    if (authUser?.user) {
      testUserId = authUser.user.id;
      await supabase.from('profiles').upsert({
        id: authUser.user.id,
        full_name: 'Action Test Member',
        email: testMemberEmail,
      });
      await supabase.from('mosque_memberships').upsert(
        { mosque_id: mosqueId, profile_id: authUser.user.id, role: 'student' },
        { onConflict: 'mosque_id,profile_id' }
      );
    }
  });

  test.afterAll(async () => {
    const supabase = createTestSupabaseClient();
    if (testUserId) {
      await supabase.from('mosque_memberships').delete().eq('profile_id', testUserId);
      await supabase.from('profiles').delete().eq('id', testUserId);
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('admin can change a member role', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/members`);

    const memberRow = page.locator('tr', { hasText: 'Action Test Member' });
    await expect(memberRow).toBeVisible({ timeout: 5000 });
    await memberRow.getByRole('button', { name: /actions/i }).click();
    await page.getByText('Change Role').click();

    await expect(page.getByRole('dialog')).toBeVisible();

    // Open select and pick a different role
    const selectTrigger = page.getByRole('dialog').getByRole('combobox');
    await selectTrigger.click();
    await page.getByRole('option', { name: 'Teacher' }).click();

    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    // Badge should update
    await expect(memberRow.getByText('Teacher')).toBeVisible({ timeout: 5000 });
  });
});
