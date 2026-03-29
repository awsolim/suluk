# Stripe Connect Admin UI — Design Spec

**Date:** 2026-03-28
**Status:** Approved

## Problem

The backend for Stripe Connect is fully built (account creation, onboarding links, checkout sessions, webhooks), but the admin UI to trigger the connection flow is missing. The `StripeConnectButton` component exists but is not rendered anywhere.

## Solution

Add a "Payments" card to the mosque admin's settings page that surfaces the Stripe Connect onboarding flow.

## UI Changes

### Settings Page (`app/m/[slug]/settings/page.tsx`)

Add a **Payments** card inside the existing `role === "mosque_admin"` block, above "Manage Programs".

**Not connected state:**
- Card title: "Payments"
- Description: "Connect a Stripe account to accept payments for paid programs."
- Renders `StripeConnectButton` with `isConnected={false}`
- Button text: "Connect Stripe Account" (already built)

**Connected state:**
- Card title: "Payments"
- Green badge: "Stripe account connected" (already built into `StripeConnectButton`)
- Link to Stripe Express dashboard for the admin to manage their account

### Data Flow

1. Settings page already fetches the mosque record via `getMosqueBySlug(slug)` — this includes `stripe_account_id`
2. Pass `mosqueId`, `slug`, `isConnected`, and `primaryColor` to `StripeConnectButton`
3. Button click → POST `/api/stripe/connect` → creates Express account (if needed) → returns Stripe onboarding URL → redirect
4. Stripe onboarding completes → redirects back to `/m/{slug}/settings?stripe=connected`
5. Page re-renders server-side, sees `stripe_account_id` is now set, shows connected state

### No New Files

- No new pages or routes
- No new API endpoints
- No database migrations
- Only modify: `app/m/[slug]/settings/page.tsx` (add Payments card)

### Existing Components Used

- `StripeConnectButton` (`components/StripeConnectButton.tsx`) — handles both states
- `/api/stripe/connect` route — creates account + generates onboarding link
- `/api/stripe/webhook` route — already handles all payment events

## Testing

### E2E Test (Playwright)

**User story ID:** US-SC1 (Stripe Connect)

**Test: Admin sees Stripe Connect button in settings**
- Login as mosque admin
- Navigate to `/m/{slug}/settings`
- Verify "Payments" card is visible
- Verify "Connect Stripe Account" button is rendered
- Verify non-admin users do NOT see the Payments card

Cannot test the actual Stripe redirect (external site), but the button visibility and role gating are testable.

## Out of Scope

- Stripe Express dashboard link (can add later)
- Disconnect Stripe flow
- Payout history or earnings dashboard
- `account.updated` webhook handling (connection status is derived from `stripe_account_id` presence)
