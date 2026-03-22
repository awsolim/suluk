import { createTestSupabaseClient, TEST_MOSQUE_SLUG, TEST_ADMIN, TEST_TEACHER, TEST_STUDENT, TEST_PARENT } from './helpers';

/**
 * Global teardown for Playwright tests.
 * Removes all test data created during setup.
 */
export default async function globalTeardown() {
  const supabase = createTestSupabaseClient();

  // Find test mosque
  const { data: mosque } = await supabase
    .from('mosques')
    .select('id')
    .eq('slug', TEST_MOSQUE_SLUG)
    .maybeSingle();

  if (mosque) {
    // Get program IDs for cascade
    const { data: programs } = await supabase
      .from('programs')
      .select('id')
      .eq('mosque_id', mosque.id);

    const programIds = programs?.map(p => p.id) ?? [];

    if (programIds.length > 0) {
      await supabase.from('program_announcements').delete().in('program_id', programIds);
      await supabase.from('program_subscriptions').delete().in('program_id', programIds);
      await supabase.from('program_applications').delete().in('program_id', programIds);
      await supabase.from('enrollments').delete().in('program_id', programIds);
      await supabase.from('programs').delete().eq('mosque_id', mosque.id);
    }

    await supabase.from('parent_child_links').delete().eq('mosque_id', mosque.id);
    await supabase.from('mosque_memberships').delete().eq('mosque_id', mosque.id);
    await supabase.from('mosques').delete().eq('id', mosque.id);
  }

  // Clean up child profile (auth-less, fixed ID)
  await supabase.from('profiles').delete().eq('id', '00000000-0000-0000-0000-000000000001');

  // Clean up test users
  const testEmails = [TEST_ADMIN.email, TEST_TEACHER.email, TEST_STUDENT.email, TEST_PARENT.email];
  const { data: users } = await supabase.auth.admin.listUsers();

  for (const user of users?.users ?? []) {
    if (testEmails.includes(user.email ?? '')) {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.admin.deleteUser(user.id);
    }
  }

  console.log('E2E test data cleaned up');
}
