-- Lets a director grant an individual instructor (per program) any combination of four
-- capabilities that were previously director/admin-only: viewing applications, deciding
-- (accept/decline) applications, editing class details, and managing finances. All default
-- off. Directors keep their existing full implicit access via is_program_director; nothing
-- here changes director or mosque-admin behavior.

-- can_review_applications was added by 20260816170000_direct_invitations.sql for a
-- "review" concept but was never wired into any real permission check (dead code) — renamed
-- here to its actual intended meaning, "can see the applications list at all." Values (all
-- false today, since nothing ever set it) are preserved by the rename.
alter table public.program_teachers
  rename column can_review_applications to can_view_applications;

alter table public.program_teachers
  add column if not exists can_decide_applications boolean not null default false,
  add column if not exists can_edit_class boolean not null default false;

create or replace function public.can_view_program_applications(
  check_program_id uuid,
  check_profile_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin(check_profile_id)
  or exists (
    select 1
    from public.programs p
    where p.id = check_program_id
      and public.has_mosque_role(p.mosque_id, array['admin'], check_profile_id)
  )
  or exists (
    select 1
    from public.program_teachers pt
    join public.programs p on p.id = pt.program_id
    where pt.program_id = check_program_id
      and pt.teacher_profile_id = check_profile_id
      and public.has_verified_teacher_membership(p.mosque_id, check_profile_id)
      and (
        pt.role = 'director'
        or (pt.role = 'instructor' and pt.can_view_applications = true)
      )
  );
$$;

create or replace function public.can_decide_program_applications(
  check_program_id uuid,
  check_profile_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin(check_profile_id)
  or exists (
    select 1
    from public.programs p
    where p.id = check_program_id
      and public.has_mosque_role(p.mosque_id, array['admin'], check_profile_id)
  )
  or exists (
    select 1
    from public.program_teachers pt
    join public.programs p on p.id = pt.program_id
    where pt.program_id = check_program_id
      and pt.teacher_profile_id = check_profile_id
      and public.has_verified_teacher_membership(p.mosque_id, check_profile_id)
      and (
        pt.role = 'director'
        or (pt.role = 'instructor' and pt.can_decide_applications = true)
      )
  );
$$;

create or replace function public.can_edit_program_details(
  check_program_id uuid,
  check_profile_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_platform_admin(check_profile_id)
  or exists (
    select 1
    from public.programs p
    where p.id = check_program_id
      and public.has_mosque_role(p.mosque_id, array['admin'], check_profile_id)
  )
  or exists (
    select 1
    from public.program_teachers pt
    join public.programs p on p.id = pt.program_id
    where pt.program_id = check_program_id
      and pt.teacher_profile_id = check_profile_id
      and public.has_verified_teacher_membership(p.mosque_id, check_profile_id)
      and (
        pt.role = 'director'
        or (pt.role = 'instructor' and pt.can_edit_class = true)
      )
  );
$$;

grant execute on function public.can_view_program_applications(uuid, uuid) to authenticated;
grant execute on function public.can_decide_program_applications(uuid, uuid) to authenticated;
grant execute on function public.can_edit_program_details(uuid, uuid) to authenticated;

drop function if exists public.can_review_program_applications(uuid, uuid);

-- can_manage_program_finances was director-only (both here and in the mosque-admin toggle UI's
-- .eq("role","director") update filter). Drop that restriction so an instructor row with
-- can_manage_finances = true also qualifies — the column already existed and defaulted off for
-- every row, so this only takes effect once a director explicitly grants it to an instructor.
create or replace function public.can_manage_program_finances(
  check_program_id uuid,
  check_profile_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.programs p
    where p.id = check_program_id
      and public.has_mosque_role(p.mosque_id, array['admin'], check_profile_id)
  )
  or exists (
    select 1
    from public.program_teachers pt
    where pt.program_id = check_program_id
      and pt.teacher_profile_id = check_profile_id
      and pt.can_manage_finances = true
  );
$$;

drop policy if exists "program finance audit visible to admins and finance directors" on public.program_finance_audit_events;
create policy "program finance audit visible to admins and finance staff"
on public.program_finance_audit_events for select
using (
  exists (
    select 1
    from public.programs p
    where p.id = program_finance_audit_events.program_id
      and public.has_mosque_role(p.mosque_id, array['admin'])
  )
  or exists (
    select 1
    from public.program_teachers pt
    where pt.program_id = program_finance_audit_events.program_id
      and pt.teacher_profile_id = auth.uid()
      and pt.can_manage_finances = true
  )
);

drop policy if exists "program finance audit insertable by admins and finance directors" on public.program_finance_audit_events;
create policy "program finance audit insertable by admins and finance staff"
on public.program_finance_audit_events for insert
with check (
  exists (
    select 1
    from public.programs p
    where p.id = program_finance_audit_events.program_id
      and public.has_mosque_role(p.mosque_id, array['admin'])
  )
  or exists (
    select 1
    from public.program_teachers pt
    where pt.program_id = program_finance_audit_events.program_id
      and pt.teacher_profile_id = auth.uid()
      and pt.can_manage_finances = true
  )
);

-- enrollment_requests: extend visibility and decision rights beyond director-only.
drop policy if exists "enrollment requests visible to owner and directors" on public.enrollment_requests;
create policy "enrollment requests visible to owner and authorized staff"
on public.enrollment_requests for select
using (
  student_profile_id = auth.uid()
  or parent_profile_id = auth.uid()
  or public.can_view_program_applications(program_id)
  or public.can_decide_program_applications(program_id)
);

drop policy if exists "directors and admins review enrollment requests" on public.enrollment_requests;
create policy "authorized staff review enrollment requests"
on public.enrollment_requests for update
using (
  public.can_decide_program_applications(program_id)
)
with check (
  public.can_decide_program_applications(program_id)
);

-- get_program_applications_snapshot: was gated entirely by can_manage_program (director/admin
-- only). Now gates on can_view_program_applications (so a view-only instructor sees the list)
-- and separately reports canDecide (so the frontend can hide action buttons for a view-only
-- instructor while still showing the data). canManage is kept, aliased to canView, so any
-- caller not yet updated to read canView keeps working during rollout.
create or replace function public.get_program_applications_snapshot(p_slug text, p_program_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_mosque_id uuid;
  v_program public.programs;
  v_can_view boolean := false;
  v_can_decide boolean := false;
  v_requests jsonb := '[]'::jsonb;
  v_tracks jsonb := '[]'::jsonb;
  v_subscriptions jsonb := '[]'::jsonb;
  v_audit_events jsonb := '[]'::jsonb;
  v_switch_requests jsonb := '[]'::jsonb;
  v_request_ids uuid[];
  v_request_track_links jsonb := '[]'::jsonb;
  v_profile_ids uuid[];
  v_profiles jsonb := '[]'::jsonb;
begin
  select id into v_mosque_id from public.mosques where slug = p_slug limit 1;
  if v_mosque_id is null then
    return jsonb_build_object('error', 'Masjid not found.', 'program', null, 'canManage', false, 'canView', false, 'canDecide', false);
  end if;

  select * into v_program from public.programs where id = p_program_id and mosque_id = v_mosque_id limit 1;
  if v_program.id is null then
    return jsonb_build_object('error', 'Class not found.', 'program', null, 'canManage', false, 'canView', false, 'canDecide', false);
  end if;

  select public.can_view_program_applications(p_program_id, auth.uid()) into v_can_view;
  if not v_can_view then
    return jsonb_build_object('error', null, 'program', to_jsonb(v_program), 'canManage', false, 'canView', false, 'canDecide', false, 'requests', '[]'::jsonb, 'tracks', '[]'::jsonb, 'subscriptions', '[]'::jsonb, 'auditEvents', '[]'::jsonb, 'switchRequests', '[]'::jsonb, 'profiles', '[]'::jsonb);
  end if;

  select public.can_decide_program_applications(p_program_id, auth.uid()) into v_can_decide;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.requested_at desc), '[]'::jsonb) into v_requests
    from public.enrollment_requests r where r.program_id = p_program_id;
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into v_tracks from public.program_tracks t where t.program_id = p_program_id;
  select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) into v_subscriptions from public.program_subscriptions s where s.program_id = p_program_id;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb) into v_audit_events
    from (select * from public.program_finance_audit_events where program_id = p_program_id order by created_at desc limit 20) a;
  select coalesce(jsonb_agg(to_jsonb(sw) order by sw.requested_at desc), '[]'::jsonb) into v_switch_requests
    from public.program_track_switch_requests sw where sw.program_id = p_program_id;

  select array_agg(id) into v_request_ids from public.enrollment_requests where program_id = p_program_id;
  if v_request_ids is not null then
    select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) into v_request_track_links
      from (select enrollment_request_id, program_track_id from public.enrollment_request_tracks where enrollment_request_id = any(v_request_ids)) l;
  end if;

  select array_agg(distinct id) into v_profile_ids
    from (
      select student_profile_id as id from public.enrollment_requests where program_id = p_program_id
      union
      select parent_profile_id from public.enrollment_requests where program_id = p_program_id and parent_profile_id is not null
      union
      select reviewed_by from public.enrollment_requests where program_id = p_program_id and reviewed_by is not null
      union
      select student_profile_id from public.program_track_switch_requests where program_id = p_program_id
      union
      select actor_profile_id from public.program_finance_audit_events where program_id = p_program_id and actor_profile_id is not null
        and id in (select id from public.program_finance_audit_events where program_id = p_program_id order by created_at desc limit 20)
    ) x;
  if v_profile_ids is not null then
    select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into v_profiles
      from (select id, full_name, email, phone_number, avatar_url, age, gender, date_of_birth, account_type from public.profiles where id = any(v_profile_ids)) p;
  end if;

  return jsonb_build_object(
    'error', null,
    'program', to_jsonb(v_program),
    'canManage', v_can_view,
    'canView', v_can_view,
    'canDecide', v_can_decide,
    'requests', v_requests,
    'tracks', v_tracks,
    'subscriptions', v_subscriptions,
    'auditEvents', v_audit_events,
    'switchRequests', v_switch_requests,
    'requestTrackLinks', v_request_track_links,
    'profiles', v_profiles
  );
end;
$$;

grant execute on function public.get_program_applications_snapshot(text, uuid) to authenticated;

-- get_teacher_roster_snapshot: add canDecideApplications so the Students page's waitlist
-- Accept/Reject buttons can be hidden for a view-only instructor without a second round trip.
create or replace function public.get_teacher_roster_snapshot(p_slug text, p_program_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_mosque public.mosques;
  v_program public.programs;
  v_can_decide boolean := false;
  v_enrollments jsonb := '[]'::jsonb;
  v_waitlist jsonb := '[]'::jsonb;
  v_tracks jsonb := '[]'::jsonb;
  v_track_ids uuid[];
  v_sessions jsonb := '[]'::jsonb;
  v_track_sessions jsonb := '[]'::jsonb;
  v_enrollment_ids uuid[];
  v_student_ids uuid[];
  v_enrollment_tracks jsonb := '[]'::jsonb;
  v_subscriptions jsonb := '[]'::jsonb;
  v_completed_requests jsonb := '[]'::jsonb;
  v_completed_request_ids uuid[];
  v_completed_request_tracks jsonb := '[]'::jsonb;
  v_profiles jsonb := '[]'::jsonb;
  v_links jsonb := '[]'::jsonb;
  v_parent_ids uuid[];
  v_parents jsonb := '[]'::jsonb;
  v_empty jsonb;
begin
  v_empty := jsonb_build_object(
    'error', 'Masjid not found.', 'mosque', null, 'program', null, 'enrollments', '[]'::jsonb,
    'waitlist', '[]'::jsonb, 'tracks', '[]'::jsonb, 'sessions', '[]'::jsonb, 'trackSessions', '[]'::jsonb,
    'enrollmentTracks', '[]'::jsonb, 'subscriptions', '[]'::jsonb, 'completedRequests', '[]'::jsonb,
    'completedRequestTracks', '[]'::jsonb, 'profiles', '[]'::jsonb, 'links', '[]'::jsonb, 'parents', '[]'::jsonb,
    'canDecideApplications', false
  );

  select * into v_mosque from public.mosques where slug = p_slug limit 1;
  if v_mosque.id is null then
    return v_empty;
  end if;

  select * into v_program from public.programs where id = p_program_id and mosque_id = v_mosque.id limit 1;
  if v_program.id is null then
    return v_empty || jsonb_build_object('error', 'Class not found.', 'mosque', to_jsonb(v_mosque));
  end if;

  select public.can_decide_program_applications(p_program_id, auth.uid()) into v_can_decide;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at asc), '[]'::jsonb) into v_enrollments
    from public.enrollments e where e.program_id = v_program.id;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.reviewed_at asc), '[]'::jsonb) into v_waitlist
    from public.enrollment_requests r where r.program_id = v_program.id and r.status = 'waitlisted' and r.student_dismissed_at is null;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.sort_order), '[]'::jsonb) into v_tracks
    from public.program_tracks t where t.program_id = v_program.id and t.is_active = true;
  select array_agg(id) into v_track_ids from public.program_tracks where program_id = v_program.id and is_active = true;

  select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) into v_sessions
    from public.program_sessions s where s.program_id = v_program.id;
  if v_track_ids is not null then
    select coalesce(jsonb_agg(to_jsonb(ts)), '[]'::jsonb) into v_track_sessions
      from public.program_track_sessions ts where ts.program_track_id = any(v_track_ids);
  end if;

  select array_agg(id) into v_enrollment_ids from public.enrollments where program_id = v_program.id;
  select array_agg(distinct id) into v_student_ids
    from (
      select student_profile_id as id from public.enrollments where program_id = v_program.id
      union
      select student_profile_id from public.enrollment_requests where program_id = v_program.id and status = 'waitlisted' and student_dismissed_at is null
    ) x;

  if v_enrollment_ids is not null then
    select coalesce(jsonb_agg(to_jsonb(et)), '[]'::jsonb) into v_enrollment_tracks
      from (select enrollment_id, program_track_id from public.enrollment_tracks where enrollment_id = any(v_enrollment_ids)) et;
  end if;

  if v_student_ids is not null then
    select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) into v_subscriptions
      from public.program_subscriptions s where s.program_id = v_program.id and s.student_profile_id = any(v_student_ids);

    select coalesce(jsonb_agg(to_jsonb(r) order by r.reviewed_at desc), '[]'::jsonb) into v_completed_requests
      from (
        select id, student_profile_id, program_track_id, reviewed_at, requested_at
        from public.enrollment_requests
        where program_id = v_program.id and status = 'approved' and student_profile_id = any(v_student_ids)
      ) r;

    select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into v_profiles
      from (select id, full_name, email, phone_number, avatar_url, age, gender, date_of_birth, account_type from public.profiles where id = any(v_student_ids)) p;

    select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) into v_links
      from (select child_profile_id, parent_profile_id from public.parent_child_links where mosque_id = v_mosque.id and child_profile_id = any(v_student_ids)) l;
  end if;

  select array_agg(id) into v_completed_request_ids from public.enrollment_requests
    where program_id = v_program.id and status = 'approved' and student_profile_id = any(coalesce(v_student_ids, array[]::uuid[]));
  if v_completed_request_ids is not null then
    select coalesce(jsonb_agg(to_jsonb(rt)), '[]'::jsonb) into v_completed_request_tracks
      from (select enrollment_request_id, program_track_id from public.enrollment_request_tracks where enrollment_request_id = any(v_completed_request_ids)) rt;
  end if;

  select array_agg(distinct parent_profile_id) into v_parent_ids
    from public.parent_child_links where mosque_id = v_mosque.id and child_profile_id = any(coalesce(v_student_ids, array[]::uuid[]));
  if v_parent_ids is not null then
    select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into v_parents
      from (select id, full_name, email, phone_number, avatar_url from public.profiles where id = any(v_parent_ids)) p;
  end if;

  return jsonb_build_object(
    'error', null,
    'mosque', to_jsonb(v_mosque),
    'program', to_jsonb(v_program),
    'enrollments', v_enrollments,
    'waitlist', v_waitlist,
    'tracks', v_tracks,
    'sessions', v_sessions,
    'trackSessions', v_track_sessions,
    'enrollmentTracks', v_enrollment_tracks,
    'subscriptions', v_subscriptions,
    'completedRequests', v_completed_requests,
    'completedRequestTracks', v_completed_request_tracks,
    'profiles', v_profiles,
    'links', v_links,
    'parents', v_parents,
    'canDecideApplications', v_can_decide
  );
end;
$$;

grant execute on function public.get_teacher_roster_snapshot(text, uuid) to authenticated;

-- get_program_finances_snapshot inlined its own director-only finance check instead of calling
-- can_manage_program_finances(); reuse that function directly so this stays in sync with the
-- now-instructor-inclusive definition above, instead of duplicating (and drifting from) it.
create or replace function public.get_program_finances_snapshot(p_slug text, p_program_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_mosque_id uuid;
  v_program public.programs;
  v_has_access boolean := false;
  v_enrollments jsonb := '[]'::jsonb;
  v_requests jsonb := '[]'::jsonb;
  v_subscriptions jsonb := '[]'::jsonb;
  v_payment_terms jsonb := '[]'::jsonb;
  v_audit_events jsonb := '[]'::jsonb;
  v_student_ids uuid[];
  v_links jsonb := '[]'::jsonb;
  v_profile_ids uuid[];
  v_profiles jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Log in required.', 'program', null, 'hasAccess', false);
  end if;

  select id into v_mosque_id from public.mosques where slug = p_slug limit 1;
  if v_mosque_id is null then
    return jsonb_build_object('error', 'Masjid not found.', 'program', null, 'hasAccess', false);
  end if;

  select * into v_program from public.programs where id = p_program_id and mosque_id = v_mosque_id limit 1;
  if v_program.id is null then
    return jsonb_build_object('error', 'Class not found.', 'program', null, 'hasAccess', false);
  end if;

  select public.can_manage_program_finances(p_program_id, v_user_id) into v_has_access;

  if not coalesce(v_has_access, false) then
    return jsonb_build_object('error', null, 'program', to_jsonb(v_program), 'hasAccess', false, 'enrollments', '[]'::jsonb, 'requests', '[]'::jsonb, 'subscriptions', '[]'::jsonb, 'paymentTerms', '[]'::jsonb, 'auditEvents', '[]'::jsonb, 'links', '[]'::jsonb, 'profiles', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at asc), '[]'::jsonb) into v_enrollments
    from public.enrollments e where e.program_id = p_program_id;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.requested_at desc), '[]'::jsonb) into v_requests
    from public.enrollment_requests r where r.program_id = p_program_id;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.updated_at desc), '[]'::jsonb) into v_subscriptions
    from public.program_subscriptions s where s.program_id = p_program_id;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb) into v_payment_terms
    from public.program_payment_terms t where t.program_id = p_program_id;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb) into v_audit_events
    from (select * from public.program_finance_audit_events where program_id = p_program_id order by created_at desc limit 20) a;

  select array_agg(distinct student_profile_id) into v_student_ids from public.enrollments where program_id = p_program_id;
  if v_student_ids is not null then
    select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) into v_links
      from (select child_profile_id, parent_profile_id from public.parent_child_links where mosque_id = v_mosque_id and child_profile_id = any(v_student_ids)) l;
  end if;

  select array_agg(distinct id) into v_profile_ids
    from (
      select unnest(coalesce(v_student_ids, array[]::uuid[])) as id
      union
      select parent_profile_id from public.parent_child_links where mosque_id = v_mosque_id and child_profile_id = any(coalesce(v_student_ids, array[]::uuid[])) and parent_profile_id is not null
      union
      select reviewed_by from public.enrollment_requests where program_id = p_program_id and reviewed_by is not null
      union
      select parent_profile_id from public.enrollment_requests where program_id = p_program_id and parent_profile_id is not null
      union
      select parent_profile_id from public.program_subscriptions where program_id = p_program_id and parent_profile_id is not null
      union
      select parent_profile_id from public.program_payment_terms where program_id = p_program_id and parent_profile_id is not null
      union
      select actor_profile_id from public.program_finance_audit_events where program_id = p_program_id and actor_profile_id is not null
        and id in (select id from public.program_finance_audit_events where program_id = p_program_id order by created_at desc limit 20)
    ) x;
  if v_profile_ids is not null then
    select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into v_profiles
      from (select id, full_name, email, phone_number, avatar_url, age, gender, date_of_birth, account_type from public.profiles where id = any(v_profile_ids)) p;
  end if;

  return jsonb_build_object(
    'error', null,
    'program', to_jsonb(v_program),
    'hasAccess', true,
    'enrollments', v_enrollments,
    'requests', v_requests,
    'subscriptions', v_subscriptions,
    'paymentTerms', v_payment_terms,
    'auditEvents', v_audit_events,
    'links', v_links,
    'profiles', v_profiles
  );
end;
$$;

grant execute on function public.get_program_finances_snapshot(text, uuid) to authenticated;
