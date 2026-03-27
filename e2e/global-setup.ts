import { createTestSupabaseClient, TEST_MOSQUE_SLUG, TEST_MOSQUE_NAME, TEST_ADMIN, TEST_TEACHER, TEST_STUDENT, TEST_PARENT, TEST_TEACHER_REQUESTER } from './helpers';

/**
 * Global setup for Playwright tests.
 * Seeds the test mosque, users, programs, and sample data.
 */
export default async function globalSetup() {
  const supabase = createTestSupabaseClient();

  // Clean up any previous test data
  const { data: existingMosque } = await supabase
    .from('mosques')
    .select('id')
    .eq('slug', TEST_MOSQUE_SLUG)
    .maybeSingle();

  if (existingMosque) {
    // Delete in dependency order
    await supabase.from('program_announcements').delete().eq('program_id', existingMosque.id);
    await supabase.from('program_subscriptions').delete().in(
      'program_id',
      (await supabase.from('programs').select('id').eq('mosque_id', existingMosque.id)).data?.map(p => p.id) ?? []
    );
    await supabase.from('program_applications').delete().in(
      'program_id',
      (await supabase.from('programs').select('id').eq('mosque_id', existingMosque.id)).data?.map(p => p.id) ?? []
    );
    await supabase.from('enrollments').delete().in(
      'program_id',
      (await supabase.from('programs').select('id').eq('mosque_id', existingMosque.id)).data?.map(p => p.id) ?? []
    );
    await supabase.from('parent_child_links').delete().eq('mosque_id', existingMosque.id);
    await supabase.from('teacher_join_requests').delete().eq('mosque_id', existingMosque.id);
    await supabase.from('programs').delete().eq('mosque_id', existingMosque.id);
    await supabase.from('mosque_memberships').delete().eq('mosque_id', existingMosque.id);
    await supabase.from('mosques').delete().eq('id', existingMosque.id);
  }

  // Create test mosque
  const { data: mosque, error: mosqueError } = await supabase
    .from('mosques')
    .insert({
      name: TEST_MOSQUE_NAME,
      slug: TEST_MOSQUE_SLUG,
      primary_color: '#1e40af',
      secondary_color: '#3b82f6',
      welcome_title: 'Welcome to Test Mosque',
      welcome_description: 'This is a test mosque for E2E testing.',
      features: ['Quran Studies', 'Islamic History', 'Arabic'],
    })
    .select()
    .single();

  if (mosqueError) throw new Error(`Failed to create test mosque: ${mosqueError.message}`);

  // Create test users via Supabase Auth admin API
  const createUser = async (email: string, password: string, fullName: string) => {
    // Delete existing user if any
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users.find(u => u.email === email);
    if (existing) {
      await supabase.from('profiles').delete().eq('id', existing.id);
      await supabase.auth.admin.deleteUser(existing.id);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create user ${email}: ${error.message}`);

    // Create profile
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      email,
    });

    return data.user;
  };

  const adminUser = await createUser(TEST_ADMIN.email, TEST_ADMIN.password, TEST_ADMIN.fullName);
  const teacherUser = await createUser(TEST_TEACHER.email, TEST_TEACHER.password, TEST_TEACHER.fullName);
  const studentUser = await createUser(TEST_STUDENT.email, TEST_STUDENT.password, TEST_STUDENT.fullName);
  const parentUser = await createUser(TEST_PARENT.email, TEST_PARENT.password, TEST_PARENT.fullName);
  const teacherRequesterUser = await createUser(
    TEST_TEACHER_REQUESTER.email,
    TEST_TEACHER_REQUESTER.password,
    TEST_TEACHER_REQUESTER.fullName
  );

  // Create a child profile (no auth user — child profiles are auth-less per migration)
  const { data: childProfile } = await supabase
    .from('profiles')
    .insert({
      id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Test Child',
      email: null,
      date_of_birth: '2017-03-10',
    })
    .select()
    .single();

  // Create mosque memberships
  await supabase.from('mosque_memberships').insert([
    { mosque_id: mosque.id, profile_id: adminUser.id, role: 'mosque_admin', can_manage_programs: true },
    { mosque_id: mosque.id, profile_id: teacherUser.id, role: 'teacher', can_manage_programs: true },
    { mosque_id: mosque.id, profile_id: studentUser.id, role: 'student', can_manage_programs: false },
    { mosque_id: mosque.id, profile_id: parentUser.id, role: 'parent', can_manage_programs: false },
  ]);

  // Create test programs
  const { data: freeProgram } = await supabase
    .from('programs')
    .insert({
      mosque_id: mosque.id,
      teacher_profile_id: teacherUser.id,
      title: 'Free Quran Studies',
      description: 'A free program for Quran memorization and recitation.',
      is_active: true,
      is_paid: false,
      schedule: [{ day: 'Monday', start_time: '09:00', end_time: '10:30' }],
      schedule_timezone: 'America/Edmonton',
    })
    .select()
    .single();

  const { data: paidProgram } = await supabase
    .from('programs')
    .insert({
      mosque_id: mosque.id,
      teacher_profile_id: teacherUser.id,
      title: 'Advanced Arabic',
      description: 'A paid program for advanced Arabic language learning.',
      is_active: true,
      is_paid: true,
      price_monthly_cents: 2500,
      schedule: [{ day: 'Wednesday', start_time: '14:00', end_time: '15:30' }],
      schedule_timezone: 'America/Edmonton',
    })
    .select()
    .single();

  // Incomplete program — no teacher, no schedule (for crash test)
  await supabase.from('programs').insert({
    mosque_id: mosque.id,
    teacher_profile_id: null,
    title: 'Upcoming Program',
    description: null,
    is_active: true,
    is_paid: false,
  });

  // Pre-existing enrollment: student in free program
  if (freeProgram) {
    await supabase.from('enrollments').insert({
      program_id: freeProgram.id,
      student_profile_id: studentUser.id,
    });
  }

  // Pre-existing application: student applied to paid program (pending)
  if (paidProgram) {
    await supabase.from('program_applications').insert({
      program_id: paidProgram.id,
      student_profile_id: studentUser.id,
      status: 'pending',
    });
  }

  // Parent-child link
  if (childProfile) {
    await supabase.from('parent_child_links').insert({
      parent_profile_id: parentUser.id,
      child_profile_id: childProfile.id,
      mosque_id: mosque.id,
    });

    // Child enrolled in free program
    if (freeProgram) {
      await supabase.from('enrollments').insert({
        program_id: freeProgram.id,
        student_profile_id: childProfile.id,
      });
    }

    // Child has an accepted application on paid program (for checkout test)
    if (paidProgram) {
      await supabase.from('program_applications').insert({
        program_id: paidProgram.id,
        student_profile_id: childProfile.id,
        status: 'accepted',
      });
    }
  }

  // Store IDs for tests to reference
  process.env.TEST_MOSQUE_ID = mosque.id;
  process.env.TEST_ADMIN_ID = adminUser.id;
  process.env.TEST_TEACHER_ID = teacherUser.id;
  process.env.TEST_STUDENT_ID = studentUser.id;
  process.env.TEST_PARENT_ID = parentUser.id;
  process.env.TEST_TEACHER_REQUESTER_ID = teacherRequesterUser.id;
  process.env.TEST_CHILD_ID = childProfile?.id ?? '';
  process.env.TEST_FREE_PROGRAM_ID = freeProgram?.id ?? '';
  process.env.TEST_PAID_PROGRAM_ID = paidProgram?.id ?? '';

  console.log('E2E test data seeded successfully');
}
