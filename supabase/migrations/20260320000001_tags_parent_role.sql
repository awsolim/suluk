-- 1. Add tags column to programs
ALTER TABLE programs ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Add date_of_birth column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 3. Drop FK constraint on profiles.id -> auth.users.id (if it exists)
-- This allows child profiles without auth users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- 4. Add 'parent' to mosque_memberships role check constraint
-- First drop existing constraint, then recreate with parent
ALTER TABLE mosque_memberships DROP CONSTRAINT IF EXISTS mosque_memberships_role_check;
ALTER TABLE mosque_memberships ADD CONSTRAINT mosque_memberships_role_check
  CHECK (role IN ('mosque_admin', 'lead_teacher', 'teacher', 'student', 'parent'));

-- 5. Create parent_child_links table
CREATE TABLE IF NOT EXISTS parent_child_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mosque_id uuid NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_profile_id, child_profile_id, mosque_id)
);

-- 6. RLS for parent_child_links
ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;

-- Parents can see their own links
CREATE POLICY "parents_select_own_links" ON parent_child_links
  FOR SELECT USING (parent_profile_id = auth.uid());

-- Parents can insert their own links
CREATE POLICY "parents_insert_own_links" ON parent_child_links
  FOR INSERT WITH CHECK (parent_profile_id = auth.uid());

-- Parents can delete their own links
CREATE POLICY "parents_delete_own_links" ON parent_child_links
  FOR DELETE USING (parent_profile_id = auth.uid());

-- Admins can see all links for their mosque
CREATE POLICY "admins_select_mosque_links" ON parent_child_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mosque_memberships
      WHERE mosque_memberships.profile_id = auth.uid()
      AND mosque_memberships.mosque_id = parent_child_links.mosque_id
      AND mosque_memberships.role = 'mosque_admin'
    )
  );

-- 7. RLS additions for enrollments — parents can see children's enrollments
CREATE POLICY "parents_select_child_enrollments" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_links
      WHERE parent_child_links.parent_profile_id = auth.uid()
      AND parent_child_links.child_profile_id = enrollments.student_profile_id
    )
  );

-- Parents can insert enrollments for their children
CREATE POLICY "parents_insert_child_enrollments" ON enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM parent_child_links
      WHERE parent_child_links.parent_profile_id = auth.uid()
      AND parent_child_links.child_profile_id = enrollments.student_profile_id
    )
  );

-- 8. RLS additions for program_applications — parents can see/create children's applications
CREATE POLICY "parents_select_child_applications" ON program_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_links
      WHERE parent_child_links.parent_profile_id = auth.uid()
      AND parent_child_links.child_profile_id = program_applications.student_profile_id
    )
  );

CREATE POLICY "parents_insert_child_applications" ON program_applications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM parent_child_links
      WHERE parent_child_links.parent_profile_id = auth.uid()
      AND parent_child_links.child_profile_id = program_applications.student_profile_id
    )
  );

-- 9. RLS for profiles — parents can see their children's profiles
CREATE POLICY "parents_select_child_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_links
      WHERE parent_child_links.parent_profile_id = auth.uid()
      AND parent_child_links.child_profile_id = profiles.id
    )
  );
