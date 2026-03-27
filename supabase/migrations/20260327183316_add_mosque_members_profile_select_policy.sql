-- Allow mosque admins and teachers to read profiles of members in their mosque.
-- Without this, the members page shows "Unnamed" for everyone except the
-- current user because profiles_select_own only allows reading your own row.
CREATE POLICY "mosque_members_select_profiles"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM mosque_memberships my_membership
    JOIN mosque_memberships their_membership
      ON my_membership.mosque_id = their_membership.mosque_id
    WHERE my_membership.profile_id = auth.uid()
      AND my_membership.role IN ('mosque_admin', 'teacher', 'lead_teacher')
      AND their_membership.profile_id = profiles.id
  )
);
