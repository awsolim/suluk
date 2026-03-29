# Stripe Connect Admin UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the existing Stripe Connect onboarding flow in the masjid admin settings page so admins can connect their Stripe accounts.

**Architecture:** Add a "Payments" card to the admin tools section of the existing settings page. The `StripeConnectButton` component already handles both connected and not-connected states. The `/api/stripe/connect` route already creates Express accounts and returns onboarding links. No new files, routes, or migrations needed — just wire the existing pieces together, then write an E2E test.

**Tech Stack:** Next.js 16, React 19, TypeScript, Playwright, Supabase

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `app/m/[slug]/settings/page.tsx` | Add Payments card with `StripeConnectButton` in admin section |
| Create | `e2e/stripe-connect.spec.ts` | E2E test: admin sees button, student does not |

---

### Task 1: Add Payments card to settings page

**Files:**
- Modify: `app/m/[slug]/settings/page.tsx:1-109`

- [ ] **Step 1: Add the StripeConnectButton import**

At the top of `app/m/[slug]/settings/page.tsx`, add this import after the existing imports:

```typescript
import StripeConnectButton from "@/components/StripeConnectButton";
```

- [ ] **Step 2: Add the Payments card inside the admin block**

In `app/m/[slug]/settings/page.tsx`, replace the entire `{/* Admin Tools */}` block (lines 68-87) with this:

```tsx
          {/* Admin — Payments & Tools */}
          {role === "mosque_admin" && (
            <>
              {/* Payments */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-1 text-lg font-semibold">Payments</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Connect a Stripe account to accept payments for paid programs.
                </p>
                <StripeConnectButton
                  mosqueId={mosque.id}
                  slug={slug}
                  isConnected={!!mosque.stripe_account_id}
                  primaryColor={primaryColor}
                />
              </div>

              {/* Admin Tools */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold">Admin Tools</h2>
                <div className="space-y-3">
                  <Link
                    href={`/m/${slug}/admin/programs`}
                    className="block rounded-lg border border-border p-3 text-sm hover:bg-muted"
                  >
                    Manage Programs
                  </Link>
                  <Link
                    href={`/m/${slug}/admin/members`}
                    className="block rounded-lg border border-border p-3 text-sm hover:bg-muted"
                  >
                    Manage Members
                  </Link>
                </div>
              </div>
            </>
          )}
```

- [ ] **Step 3: Verify the dev server renders correctly**

Run: `npm run dev` (if not already running)

Open `http://localhost:3000/m/test-mosque-e2e/settings` logged in as admin. Visually confirm:
- "Payments" card appears above "Admin Tools"
- "Connect Stripe Account" button is visible (since test mosque has no `stripe_account_id`)

- [ ] **Step 4: Commit**

```bash
git add app/m/\[slug\]/settings/page.tsx
git commit -m "feat: add Stripe Connect payments card to admin settings"
```

---

### Task 2: Write E2E test for Stripe Connect button visibility

**Files:**
- Create: `e2e/stripe-connect.spec.ts`

- [ ] **Step 1: Write the test file**

Create `e2e/stripe-connect.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin, loginAsStudent } from './helpers';

// Covers: US-SC1 (Stripe Connect admin UI)
test.describe('Stripe Connect admin settings', () => {
  test('US-SC1: admin sees Payments card with Connect Stripe button', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);

    // Payments card is visible
    await expect(page.getByRole('heading', { name: /payments/i })).toBeVisible();
    await expect(
      page.getByText(/connect a stripe account to accept payments/i)
    ).toBeVisible();

    // Connect button is rendered
    await expect(
      page.getByRole('button', { name: /connect stripe account/i })
    ).toBeVisible();
  });

  test('US-SC1: non-admin does not see Payments card', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);

    // Payments heading should not exist
    await expect(page.getByRole('heading', { name: /payments/i })).not.toBeVisible();

    // Connect button should not exist
    await expect(
      page.getByRole('button', { name: /connect stripe account/i })
    ).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npx playwright test e2e/stripe-connect.spec.ts --project=desktop`

Expected: Both tests PASS — admin sees the button, student does not.

- [ ] **Step 3: Commit**

```bash
git add e2e/stripe-connect.spec.ts
git commit -m "test: add E2E tests for Stripe Connect button visibility (US-SC1)"
```

- [ ] **Step 4: Clean up test artifacts**

```bash
rm -rf playwright-report/ test-results/
```
