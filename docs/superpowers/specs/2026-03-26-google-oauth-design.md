# Google OAuth Login

**Date**: 2026-03-26
**Status**: Approved

## Overview

Add Google OAuth sign-in alongside existing email/password auth on all 4 auth pages. Uses Supabase's built-in OAuth support.

## Prerequisites (Manual)

1. Enable Google provider in Supabase Dashboard (Authentication > Providers > Google)
2. Create OAuth 2.0 Client ID in Google Cloud Console
3. Set authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Add Client ID + Secret to Supabase dashboard

## Implementation

### Auth Callback Route: `app/auth/callback/route.ts`

- Reads `code` query param from Supabase OAuth redirect
- Exchanges code for session via `supabase.auth.exchangeCodeForSession(code)`
- If `slug` query param present: upserts profile, auto-assigns `student` membership (or `parent` if `role=parent`) if no existing membership
- Redirects to `next` query param or falls back to `/`

### Client Component: `components/auth/GoogleSignInButton.tsx`

- `"use client"` component
- Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })` on click
- Accepts `redirectTo` and optional `label` props
- Renders "Continue with Google" button with Google logo SVG

### Pages Modified

All 4 auth pages get the Google button + an "or" divider:

- `app/signup/page.tsx` — redirectTo: `/auth/callback?next=/`
- `app/login/page.tsx` — redirectTo: `/auth/callback?next=/`
- `app/m/[slug]/signup/page.tsx` — redirectTo: `/auth/callback?next=/m/{slug}/dashboard&slug={slug}&role={role}`
- `app/m/[slug]/login/page.tsx` — redirectTo: `/auth/callback?next=/m/{slug}/dashboard&slug={slug}`

### Supabase Client for Callback

The callback route uses the server-side Supabase client (`@/lib/supabase/server`) to exchange the code.

## User Stories

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-G1 | As a user, I can sign up with Google from the global signup page | OAuth flow completes, profile created, redirected to `/` |
| US-G2 | As a user, I can log in with Google from the global login page | OAuth flow completes, redirected to `/` |
| US-G3 | As a user, I can sign up with Google from a mosque signup page | OAuth flow completes, profile + student membership created, redirected to dashboard |
| US-G4 | As a user, I can log in with Google from a mosque login page | OAuth flow completes, redirected to dashboard |

## Test Plan

- E2E: Verify Google button visible on all 4 auth pages
- Integration: Test callback route handles profile upsert and membership creation
