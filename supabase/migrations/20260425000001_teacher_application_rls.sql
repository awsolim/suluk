-- Fix #35: Teachers/admins cannot approve student applications
-- Fix #33: Admins cannot read profiles of teacher requesters
-- Missing RLS policies:
-- 1. No UPDATE policy on program_applications for teachers/admins
-- 2. No SELECT policy on profiles for applicants who aren't mosque members yet
-- 3. No SELECT policy on profiles for teacher requesters who aren't mosque members

-- 1. Allow teachers to update applications for their programs,
--    and mosque admins to update any application in their mosque.
CREATE POLICY "teachers_update_applications" ON program_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM programs
    JOIN mosque_memberships ON programs.mosque_id = mosque_memberships.mosque_id
    WHERE programs.id = program_applications.program_id
      AND mosque_memberships.profile_id = auth.uid()
      AND (
        programs.teacher_profile_id = auth.uid()
        OR mosque_memberships.role = 'mosque_admin'
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM programs
    JOIN mosque_memberships ON programs.mosque_id = mosque_memberships.mosque_id
    WHERE programs.id = program_applications.program_id
      AND mosque_memberships.profile_id = auth.uid()
      AND (
        programs.teacher_profile_id = auth.uid()
        OR mosque_memberships.role = 'mosque_admin'
      )
  )
);

-- 2. Allow teachers/admins to SELECT applications for programs in their mosque.
--    Base policies may exist from the dashboard, but this ensures coverage.
CREATE POLICY "teachers_select_applications" ON program_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM programs
    JOIN mosque_memberships ON programs.mosque_id = mosque_memberships.mosque_id
    WHERE programs.id = program_applications.program_id
      AND mosque_memberships.profile_id = auth.uid()
      AND mosque_memberships.role IN ('mosque_admin', 'teacher', 'lead_teacher')
  )
);

-- 3. Allow teachers/admins to read profiles of students who applied to
--    programs in their mosque (applicants may not be in mosque_memberships).
CREATE POLICY "teachers_select_applicant_profiles" ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM program_applications
    JOIN programs ON program_applications.program_id = programs.id
    JOIN mosque_memberships ON programs.mosque_id = mosque_memberships.mosque_id
    WHERE program_applications.student_profile_id = profiles.id
      AND mosque_memberships.profile_id = auth.uid()
      AND mosque_memberships.role IN ('mosque_admin', 'teacher', 'lead_teacher')
  )
);

-- 4. Allow admins to read profiles of users who submitted teacher join requests
--    (requesters might not be mosque members if they applied from the homepage).
CREATE POLICY "admins_select_teacher_requester_profiles" ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM teacher_join_requests
    JOIN mosque_memberships ON teacher_join_requests.mosque_id = mosque_memberships.mosque_id
    WHERE teacher_join_requests.profile_id = profiles.id
      AND mosque_memberships.profile_id = auth.uid()
      AND mosque_memberships.role = 'mosque_admin'
  )
);
