import { createClient } from "@/lib/supabase/server";

// Loads one mosque by its tenant slug
export async function getMosqueBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mosques")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    return null;
  }

  return data;
}

// Loads all programs for one mosque
// Loads all active programs for one mosque, including basic teacher details
export async function getProgramsByMosqueId(mosqueId: string) {
  const supabase = await createClient();

  // Load active programs for a single mosque and join the assigned teacher profile
  const { data, error } = await supabase
    .from("programs")
    .select(`
      id,
      mosque_id,
      teacher_profile_id,
      title,
      description,
      is_active,
      thumbnail_url,
      created_at,
      updated_at,
      teacher:profiles!programs_teacher_profile_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq("mosque_id", mosqueId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load programs: ${error.message}`);
  }

  return (data ?? []).map((program) => {
    // Added: Supabase may return the joined teacher relation as an array,
    // so normalize it to a single teacher object for easier page usage.
    const teacher = Array.isArray(program.teacher)
      ? program.teacher[0]
      : program.teacher;

    return {
      id: program.id,
      mosque_id: program.mosque_id,
      teacher_profile_id: program.teacher_profile_id,
      title: program.title,
      description: program.description,
      is_active: program.is_active,
      thumbnail_url: program.thumbnail_url,
      created_at: program.created_at,
      updated_at: program.updated_at,
      teacher_name: teacher?.full_name ?? null, // Added: expose teacher name directly for the UI
      teacher_avatar_url: teacher?.avatar_url ?? null, // Added: expose teacher avatar storage path directly for the UI
    };
  });
}

export async function getProgramByIdForMosque(
  programId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  // Load one active public program for this mosque along with the assigned teacher's basic contact info
  // and the recurring weekly schedule fields needed for the student class view.
  const { data, error } = await supabase
    .from("programs")
    .select(`
      id,
      mosque_id,
      teacher_profile_id,
      title,
      description,
      is_active,
      thumbnail_url,
      price_monthly_cents,
      schedule_days,
      schedule_start_time,
      schedule_end_time,
      schedule_timezone,
      schedule_notes,
      created_at,
      updated_at,
      teacher:profiles!programs_teacher_profile_id_fkey (
        id,
        full_name,
        avatar_url,
        phone_number
      )
    `)
    .eq("id", programId)
    .eq("mosque_id", mosqueId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load program: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // Normalize the joined teacher relation so the page can use flat fields.
  const teacher = Array.isArray(data.teacher) ? data.teacher[0] : data.teacher;

  return {
    id: data.id,
    mosque_id: data.mosque_id,
    teacher_profile_id: data.teacher_profile_id,
    title: data.title,
    description: data.description,
    is_active: data.is_active,
    thumbnail_url: data.thumbnail_url,
    price_monthly_cents: data.price_monthly_cents,
    schedule_days: data.schedule_days ?? [], // Added: weekly recurring class days for schedule display.
    schedule_start_time: data.schedule_start_time ?? null, // Added: class start time for schedule display.
    schedule_end_time: data.schedule_end_time ?? null, // Added: class end time for schedule display.
    schedule_timezone: data.schedule_timezone ?? "America/Edmonton", // Added: timezone for schedule calculations.
    schedule_notes: data.schedule_notes ?? null, // Added: optional schedule notes for the student view.
    created_at: data.created_at,
    updated_at: data.updated_at,
    teacher_name: teacher?.full_name ?? null,
    teacher_avatar_url: teacher?.avatar_url ?? null,
    teacher_phone_number: teacher?.phone_number ?? null,
  };
}



export async function getProfileForCurrentUser() {
  const supabase = await createClient();

  // Get the currently authenticated Supabase user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // Load the profile row linked to the authenticated user
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return data;
}

export async function getEnrollmentForStudent(
  programId: string,
  studentProfileId: string
) {
  const supabase = await createClient();

  // Check whether this student is already enrolled in this program
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("program_id", programId)
    .eq("student_profile_id", studentProfileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load enrollment: ${error.message}`);
  }

  return data;
}

export async function getEnrollmentsForStudentInMosque(
  studentProfileId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      program_id,
      programs (
        id,
        mosque_id,
        title,
        description,
        is_active,
        schedule_days,
        schedule_start_time,
        schedule_end_time,
        schedule_timezone
      )
    `)
    .eq("student_profile_id", studentProfileId)
    .eq("programs.mosque_id", mosqueId);

  if (error) {
    throw new Error(`Failed to load enrollments: ${error.message}`);
  }

  return (data ?? []).map((enrollment) => {
    const rawProgram = Array.isArray(enrollment.programs)
      ? enrollment.programs[0]
      : enrollment.programs;

    return {
      id: enrollment.id,
      program_id: enrollment.program_id,
      programs: rawProgram
        ? {
            id: rawProgram.id,
            mosque_id: rawProgram.mosque_id,
            title: rawProgram.title,
            description: rawProgram.description,
            is_active: rawProgram.is_active,
            schedule_days: rawProgram.schedule_days ?? [],
            schedule_start_time: rawProgram.schedule_start_time ?? null,
            schedule_end_time: rawProgram.schedule_end_time ?? null,
            schedule_timezone:
              rawProgram.schedule_timezone ?? "America/Edmonton",
          }
        : null,
    };
  });
}

export async function getMosqueMembershipForUser(
  profileId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  // Load the current user's internal membership for this mosque
  const { data, error } = await supabase
    .from("mosque_memberships")
    .select("*")
    .eq("profile_id", profileId)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load mosque membership: ${error.message}`);
  }

  return data;
}

export async function getProgramsByMosqueIdIncludingInactive(mosqueId: string) {
  const supabase = await createClient();

  // Load all programs for this mosque, including inactive ones, for admin management
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("mosque_id", mosqueId)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to load admin programs: ${error.message}`);
  }

  return data ?? [];
}

export async function getProgramByIdIncludingInactiveForMosque(
  programId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  // Load a single program for this mosque, including inactive ones, for admin editing.
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load admin program: ${error.message}`);
  }

  return data;
}

export async function getProgramsForTeacherInMosque(
  teacherProfileId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  // Load all programs in this mosque that are assigned to the current teacher.
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("mosque_id", mosqueId)
    .eq("teacher_profile_id", teacherProfileId)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to load teacher programs: ${error.message}`);
  }

  return data ?? [];
}

export async function getTeachersForMosque(mosqueId: string) {
  const supabase = await createClient();

  // First load the teacher membership rows for this mosque.
  const { data: memberships, error: membershipsError } = await supabase
    .from("mosque_memberships")
    .select("id, mosque_id, profile_id, role")
    .eq("mosque_id", mosqueId)
    .eq("role", "teacher");

  console.log("getTeachersForMosque mosqueId:", mosqueId); // Debug: confirm the mosque id being queried.
  console.log("getTeachersForMosque memberships:", memberships); // Debug: confirm teacher memberships are found.
  console.log("getTeachersForMosque membershipsError:", membershipsError); // Debug: surface membership query issues.

  if (membershipsError) {
    throw new Error(`Failed to load teacher memberships: ${membershipsError.message}`);
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const profileIds = memberships.map((membership) => membership.profile_id); // Collect all teacher profile ids for the profile lookup.

  console.log("getTeachersForMosque profileIds:", profileIds); // Debug: confirm which profile ids we are loading.

  // Then load the matching profile rows.
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  console.log("getTeachersForMosque profiles:", profiles); // Debug: inspect the returned profile rows.
  console.log("getTeachersForMosque profilesError:", profilesError); // Debug: surface profile query issues.

  if (profilesError) {
    throw new Error(`Failed to load teacher profiles: ${profilesError.message}`);
  }

  const teachers = profileIds.map((profileId) => {
    const profile = profiles?.find((item) => item.id === profileId);

    return {
      profile_id: profileId,
      full_name: profile?.full_name ?? null, // Carry the readable teacher name if the profile row was returned.
    };
  });

  console.log("getTeachersForMosque teachers:", teachers); // Debug: confirm the final teacher objects going to the page.

  return teachers;
}

export async function getEnrollmentsForTeacherProgramsInMosque(
  teacherProfileId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  // Load enrollments for all programs in this mosque that are assigned to the current teacher,
  // and include the enrolled student's basic profile plus the program title for display.
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      created_at,
      student_profile_id,
      profiles!enrollments_student_profile_id_fkey (
        id,
        full_name
      ),
      programs!inner (
        id,
        mosque_id,
        title,
        teacher_profile_id
      )
    `)
    .eq("programs.mosque_id", mosqueId)
    .eq("programs.teacher_profile_id", teacherProfileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load teacher enrollments: ${error.message}`);
  }

  return data ?? [];
}

export async function getTeacherProgramByIdInMosque(
  programId: string,
  teacherProfileId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  // Load a single program only if it belongs to this mosque
  // and is assigned to the current teacher.
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .eq("mosque_id", mosqueId)
    .eq("teacher_profile_id", teacherProfileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load teacher program: ${error.message}`);
  }

  return data;
}

export async function getEnrollmentsForProgramInTeacherView(
  programId: string,
  teacherProfileId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  // Load enrolled students for one teacher-owned program by joining the student profile
  // and confirming the program belongs to this mosque and teacher.
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      created_at,
      student_profile_id,
      profiles!enrollments_student_profile_id_fkey (
        id,
        full_name
      ),
      programs!inner (
        id,
        mosque_id,
        teacher_profile_id,
        title
      )
    `)
    .eq("program_id", programId)
    .eq("programs.id", programId)
    .eq("programs.mosque_id", mosqueId)
    .eq("programs.teacher_profile_id", teacherProfileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load teacher roster: ${error.message}`);
  }

  return data ?? [];
}

export async function getProfileById(profileId: string) {
  const supabase = await createClient();

  // Load one profile row by id so admin/teacher pages can show a readable name.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return data;
}

export async function getEnrollmentsForProgramInAdminView(
  programId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  // Load all enrollments for one mosque program and include each enrolled student's profile.
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      created_at,
      student_profile_id,
      profiles!enrollments_student_profile_id_fkey (
        id,
        full_name
      ),
      programs!inner (
        id,
        mosque_id,
        title
      )
    `)
    .eq("program_id", programId)
    .eq("programs.id", programId)
    .eq("programs.mosque_id", mosqueId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load admin enrollments: ${error.message}`);
  }

  return data ?? [];
}

export async function getAdminProgramCardsByMosqueId(mosqueId: string) {
  const supabase = await createClient();

  // Load all programs for this mosque so admin cards can show every program, including inactive ones.
  const { data: programs, error: programsError } = await supabase
    .from("programs")
    .select("*")
    .eq("mosque_id", mosqueId)
    .order("title", { ascending: true });

  if (programsError) {
    throw new Error(`Failed to load admin program cards: ${programsError.message}`);
  }

  const safePrograms = programs ?? []; // Normalize to an empty array so later mapping logic stays simple.

  if (safePrograms.length === 0) {
    return []; // Return early if this mosque has no programs yet.
  }

  const teacherProfileIds = Array.from(
    new Set(
      safePrograms
        .map((program) => program.teacher_profile_id) // Collect all assigned teacher ids from the mosque's programs.
        .filter((profileId): profileId is string => Boolean(profileId)) // Remove null teacher assignments before querying profiles.
    )
  );

  const programIds = safePrograms.map((program) => program.id); // Collect all program ids so we can count enrollments for each one.

  const { data: teacherProfiles, error: teacherProfilesError } =
    teacherProfileIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", teacherProfileIds);

  if (teacherProfilesError) {
    throw new Error(
      `Failed to load teacher profiles for admin cards: ${teacherProfilesError.message}`
    );
  }

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select("id, program_id")
    .in("program_id", programIds);

  if (enrollmentsError) {
    throw new Error(
      `Failed to load enrollment counts for admin cards: ${enrollmentsError.message}`
    );
  }

  const teacherNameById = new Map(
    (teacherProfiles ?? []).map((profile) => [
      profile.id,
      profile.full_name?.trim() || null, // Keep a readable teacher name when available.
    ])
  );

  const enrollmentCountByProgramId = new Map<string, number>(); // Track how many students are enrolled in each program.

  for (const enrollment of enrollments ?? []) {
    const currentCount = enrollmentCountByProgramId.get(enrollment.program_id) ?? 0; // Read the current count for this program, defaulting to zero.
    enrollmentCountByProgramId.set(enrollment.program_id, currentCount + 1); // Increment the program's enrolled student count.
  }

  return safePrograms.map((program) => ({
    ...program,
    teacher_name: program.teacher_profile_id
      ? teacherNameById.get(program.teacher_profile_id) ?? null // Attach the teacher's readable name when the program is assigned.
      : null,
    enrolled_student_count: enrollmentCountByProgramId.get(program.id) ?? 0, // Attach the total enrolled student count for the card.
  }));
}

export async function getTeacherDashboardStats(
  teacherProfileId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  // Load all programs assigned to this teacher in the current mosque so we can count classes.
  const { data: programs, error: programsError } = await supabase
    .from("programs")
    .select("id")
    .eq("mosque_id", mosqueId)
    .eq("teacher_profile_id", teacherProfileId);

  if (programsError) {
    throw new Error(`Failed to load teacher dashboard programs: ${programsError.message}`);
  }

  const safePrograms = programs ?? []; // Normalize to an empty array so counting logic stays simple.
  const classCount = safePrograms.length; // Count how many classes are assigned to this teacher.

  if (classCount === 0) {
    return {
      class_count: 0,
      student_count: 0,
    };
  }

  const programIds = safePrograms.map((program) => program.id); // Collect program ids so we can count students across them.

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select("id")
    .in("program_id", programIds);

  if (enrollmentsError) {
    throw new Error(`Failed to load teacher dashboard enrollments: ${enrollmentsError.message}`);
  }

  return {
    class_count: classCount,
    student_count: (enrollments ?? []).length, // Count all student enrollments across this teacher's assigned programs.
  };
}

export async function getAdminDashboardStats(mosqueId: string) {
  const supabase = await createClient();

  // Load all programs for this mosque so we can compute basic program counts.
  const { data: programs, error: programsError } = await supabase
    .from("programs")
    .select("id, is_active")
    .eq("mosque_id", mosqueId);

  if (programsError) {
    throw new Error(`Failed to load admin dashboard programs: ${programsError.message}`);
  }

  const safePrograms = programs ?? []; // Normalize to an empty array for safe counting.
  const totalPrograms = safePrograms.length; // Count every program in this mosque.
  const activePrograms = safePrograms.filter((program) => program.is_active).length; // Count active programs only.

  // Load teacher memberships for this mosque so the dashboard can show staffing count.
  const { data: teacherMemberships, error: teacherMembershipsError } = await supabase
    .from("mosque_memberships")
    .select("id")
    .eq("mosque_id", mosqueId)
    .eq("role", "teacher");

  if (teacherMembershipsError) {
    throw new Error(`Failed to load admin dashboard teachers: ${teacherMembershipsError.message}`);
  }

  const programIds = safePrograms.map((program) => program.id); // Collect all mosque program ids so we can count enrollments.

  const { data: enrollments, error: enrollmentsError } =
    programIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("enrollments")
          .select("id")
          .in("program_id", programIds);

  if (enrollmentsError) {
    throw new Error(`Failed to load admin dashboard enrollments: ${enrollmentsError.message}`);
  }

  return {
    total_program_count: totalPrograms,
    active_program_count: activePrograms,
    teacher_count: (teacherMemberships ?? []).length, // Count teachers assigned to this mosque through memberships.
    student_count: (enrollments ?? []).length, // Count total enrollments across all mosque programs.
  };
}

export async function getAnnouncementsForProgram(programId: string) {
  const supabase = await createClient();

  // Load all announcements for one program along with the posting teacher's basic profile info.
  const { data, error } = await supabase
    .from("program_announcements")
    .select(`
      id,
      program_id,
      author_profile_id,
      message,
      created_at,
      profiles!program_announcements_author_profile_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq("program_id", programId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load announcements: ${error.message}`);
  }

  return data ?? [];
}

export async function getTeacherAnnouncementAuthorProfile(profileId: string) {
  const supabase = await createClient();

  // Load the current teacher's basic profile info for the announcement composer preview.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load announcement author profile: ${error.message}`);
  }

  return data;
}

export async function getAllMosques() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mosques")
    .select("id, name, slug, logo_url")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading mosques:", error);
    return [];
  }

  return data ?? [];
}

export async function getLatestAnnouncementsForPrograms(programIds: string[]) {
  const supabase = await createClient();

  if (programIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("program_announcements")
    .select(`
      id,
      program_id,
      author_profile_id,
      message,
      created_at,
      profiles!program_announcements_author_profile_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .in("program_id", programIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load latest announcements: ${error.message}`);
  }

  const latestByProgramId = new Map<string, (typeof data)[number]>();

  for (const announcement of data ?? []) {
    if (!latestByProgramId.has(announcement.program_id)) {
      latestByProgramId.set(announcement.program_id, announcement);
    }
  }

  return Array.from(latestByProgramId.values());
}