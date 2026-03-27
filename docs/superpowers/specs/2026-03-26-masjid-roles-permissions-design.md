# Masjid Creation, Teacher Join Requests & Permission Model

**Date**: 2026-03-26
**Status**: Approved

## Overview

Add three capabilities to the Tareeqah platform:
1. Any authenticated user can create a new masjid and become its admin
2. Teachers can browse masjids and request to join, with admin approval
3. Teachers have co-admin permissions except for teacher management and mosque settings

## Database Changes

### New table: `teacher_join_requests`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK, default gen_random_uuid()) | |
| mosque_id | uuid (FK → mosques) | |
| profile_id | uuid (FK → profiles) | |
| status | text | `pending` / `approved` / `rejected` |
| reviewed_by | uuid (FK → profiles, nullable) | Admin who reviewed |
| created_at | timestamptz (default now()) | |
| reviewed_at | timestamptz (nullable) | |

**Constraints:**
- Unique on `(mosque_id, profile_id)` to prevent duplicate requests. If a request is rejected and the user wants to re-request, the old row is deleted and a new one is inserted (handled in `requestToJoinAsTeacher`).
- RLS: requester can see their own requests; mosque_admin can see all requests for their mosque

**No changes to existing tables.** The `mosques` and `mosque_memberships` tables already support everything needed.

**Type update:** Add `teacher_join_requests` to `types/database.ts`.

## Masjid Creation

### Server action: `createMosque` in `app/actions/mosques.ts`

- Requires authenticated user
- Inputs: `name`, `slug` (auto-generated from name, editable)
- Validates slug uniqueness and format (lowercase, alphanumeric + hyphens)
- Creates the mosque row
- Creates a `mosque_admin` membership for the creator
- Redirects to `/m/{slug}/dashboard`

### UI

- **Create Masjid page** at `/create-masjid/page.tsx` — simple form with name and slug preview
- **Root landing page** (`/page.tsx`) — add a "Create a Masjid" button, visible to logged-in users
- Only logged-in users can access the creation page; unauthenticated users are prompted to sign up

### Global Auth Flow

Currently signup is mosque-scoped (`/m/{slug}/signup`). Masjid creation requires authentication before a mosque exists. Add:

- `/signup/page.tsx` — global signup, creates profile without mosque membership
- `/login/page.tsx` — global login

These complement the existing mosque-scoped auth pages, which remain unchanged.

## Teacher Join Requests

### Server actions in `app/actions/teacher-requests.ts`

- `requestToJoinAsTeacher(mosqueId)` — Creates a pending request. Fails if user already has a membership or pending request for this mosque.
- `approveTeacherRequest(requestId, mosqueId)` — Admin-only. Sets status to `approved`, creates `teacher` membership with `can_manage_programs: true`, sets `reviewed_by` and `reviewed_at`.
- `rejectTeacherRequest(requestId, mosqueId)` — Admin-only. Sets status to `rejected`, sets `reviewed_by` and `reviewed_at`.

### UI

- **Root landing page** (`/page.tsx`): Add "Join as Teacher" button on each mosque card. Visible to logged-in users without existing membership or pending request. Shows "Request Pending" (disabled) if a request exists.
- **Admin review page** at `/m/[slug]/admin/teacher-requests/page.tsx`: Lists pending requests with requester name/email, approve/reject buttons. Linked from admin dashboard.

## Permission Model

### Permission matrix

| Action | Student | Teacher | Masjid Admin |
|--------|---------|---------|-------------|
| Create/edit/delete programs | - | Yes | Yes |
| Change program prices | - | Yes | Yes |
| Remove student from program | - | Yes | Yes |
| View members list | - | Yes | Yes |
| Change student/parent roles | - | Yes | Yes |
| Post announcements | - | Yes | Yes |
| Review program applications | - | Yes | Yes |
| Approve/reject teacher requests | - | - | Yes |
| Add/remove teachers | - | - | Yes |
| Edit mosque settings (name, branding, Stripe) | - | - | Yes |

### Implementation

Introduce a helper `isAdminOrTeacher(role)` that returns `true` for `mosque_admin`, `teacher`, or `lead_teacher`.

**Files to update:**
- `app/actions/programs.ts` — program CRUD: allow admin or teacher
- `app/actions/enrollments.ts` — removing students: allow admin or teacher
- `app/actions/members.ts`:
  - `changeMemberRole`: teachers can set roles to `student` or `parent` only (not `teacher`, `lead_teacher`, `mosque_admin`)
  - `removeMemberFromMosque`: teachers cannot remove other teachers or admins
- `app/actions/announcements.ts` — verify already teacher-accessible
- `app/actions/applications.ts` — verify already teacher-accessible

### Guard rails for teachers

- `changeMemberRole`: Teachers can only assign `student` or `parent` roles
- `removeMemberFromMosque`: Teachers cannot remove members with `teacher`, `lead_teacher`, or `mosque_admin` roles
- Teacher request actions (`approveTeacherRequest`, `rejectTeacherRequest`): Admin-only

## User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-M1 | As a user, I can create a new masjid so that I become its admin | Mosque created, creator has `mosque_admin` membership, redirected to dashboard |
| US-M2 | As a user, I can sign up / log in without being tied to a specific masjid | Global `/signup` and `/login` pages work, profile created without membership |
| US-T1 | As a teacher, I can browse masjids and request to join as a teacher | Request created with `pending` status, duplicate requests prevented |
| US-T2 | As a masjid admin, I can see pending teacher requests and approve them | Approved request creates `teacher` membership, request status updated |
| US-T3 | As a masjid admin, I can reject a teacher request | Status set to `rejected`, no membership created |
| US-T4 | As a teacher, I can create, edit, and delete programs | Full program CRUD works for teacher role |
| US-T5 | As a teacher, I can remove a student from a program | Enrollment deleted, subscription canceled if paid |
| US-T6 | As a teacher, I can change student/parent roles | Role updated, but cannot escalate to teacher/admin |
| US-T7 | As a teacher, I cannot approve teacher requests or edit mosque settings | Actions return authorization errors |
| US-T8 | As a masjid admin, I can remove a teacher from the masjid | Teacher membership deleted |

## Test Plan (Playwright E2E)

All tests reference user story IDs in descriptions.

- `e2e/masjid-creation.spec.ts` — US-M1, US-M2: global signup, create masjid, verify dashboard as admin
- `e2e/teacher-join-flow.spec.ts` — US-T1, US-T2, US-T3: request to join, admin approves/rejects, verify membership
- `e2e/teacher-permissions.spec.ts` — US-T4, US-T5, US-T6, US-T7: teacher CRUD programs, kick student, role changes, permission boundaries
- `e2e/admin-teacher-management.spec.ts` — US-T8: admin removes teacher
