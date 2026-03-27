-- Create teacher_join_requests table
CREATE TABLE IF NOT EXISTS public.teacher_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id uuid NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(mosque_id, profile_id)
);

-- RLS policies
ALTER TABLE public.teacher_join_requests ENABLE ROW LEVEL SECURITY;

-- Requester can see their own requests
CREATE POLICY "Users can view their own teacher requests"
  ON public.teacher_join_requests
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Requester can insert their own requests
CREATE POLICY "Users can create their own teacher requests"
  ON public.teacher_join_requests
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Requester can delete their own rejected requests (for re-requesting)
CREATE POLICY "Users can delete their own rejected requests"
  ON public.teacher_join_requests
  FOR DELETE
  USING (auth.uid() = profile_id AND status = 'rejected');

-- Mosque admins can view all requests for their mosque
CREATE POLICY "Mosque admins can view teacher requests"
  ON public.teacher_join_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mosque_memberships
      WHERE mosque_memberships.mosque_id = teacher_join_requests.mosque_id
        AND mosque_memberships.profile_id = auth.uid()
        AND mosque_memberships.role = 'mosque_admin'
    )
  );

-- Mosque admins can update requests for their mosque
CREATE POLICY "Mosque admins can update teacher requests"
  ON public.teacher_join_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.mosque_memberships
      WHERE mosque_memberships.mosque_id = teacher_join_requests.mosque_id
        AND mosque_memberships.profile_id = auth.uid()
        AND mosque_memberships.role = 'mosque_admin'
    )
  );
