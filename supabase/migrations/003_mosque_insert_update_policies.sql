-- Allow any authenticated user to create a mosque
CREATE POLICY "authenticated_users_can_create_mosques"
  ON public.mosques
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow mosque admins to update their mosque
CREATE POLICY "mosque_admins_can_update_mosque"
  ON public.mosques
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.mosque_memberships
      WHERE mosque_memberships.mosque_id = mosques.id
        AND mosque_memberships.profile_id = auth.uid()
        AND mosque_memberships.role = 'mosque_admin'
    )
  );
