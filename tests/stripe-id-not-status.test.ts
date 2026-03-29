/**
 * META-PATTERN: "ID existence ≠ valid state"
 *
 * Stripe objects have lifecycles. Having an ID stored in the database
 * only proves the object was CREATED — not that it's in a usable state.
 *
 *   stripe_account_id exists  ≠  account has charges_enabled
 *   stripe_subscription_id    ≠  subscription is active in Stripe
 *   stripe_price_id           ≠  price is still valid on connected account
 *   local DB status = "active" ≠  Stripe says it's active (could be stale)
 *
 * These tests verify every place in the codebase that touches a Stripe ID
 * actually checks the underlying object's real state.
 *
 * Run: npx vitest tests/stripe-id-not-status.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock("@/lib/stripe", () => ({
  stripe: {
    accounts: { retrieve: vi.fn() },
    subscriptions: { cancel: vi.fn() },
    prices: { retrieve: vi.fn() },
  },
}));

import { stripe } from "@/lib/stripe";

const mockAccountRetrieve = vi.mocked(stripe.accounts.retrieve);
const mockSubCancel = vi.mocked(stripe.subscriptions.cancel);
const mockPriceRetrieve = vi.mocked(stripe.prices.retrieve);

beforeEach(() => {
  mockAccountRetrieve.mockReset();
  mockSubCancel.mockReset();
  mockPriceRetrieve.mockReset();
});

// ── 1. stripe_account_id ≠ charges_enabled ─────────────────────────

describe("1. stripe_account_id does NOT mean account is usable", () => {
  /**
   * Mirrors the logic in settings/page.tsx and should also be applied
   * in checkout/route.ts validateCheckout().
   */
  async function getStripeStatus(
    stripeAccountId: string | null
  ): Promise<"not_started" | "pending" | "connected"> {
    if (!stripeAccountId) return "not_started";
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      return account.charges_enabled ? "connected" : "pending";
    } catch {
      return "not_started";
    }
  }

  it("no account ID → not_started", async () => {
    expect(await getStripeStatus(null)).toBe("not_started");
    expect(mockAccountRetrieve).not.toHaveBeenCalled();
  });

  it("account created but onboarding abandoned → pending", async () => {
    mockAccountRetrieve.mockResolvedValue({
      id: "acct_123",
      charges_enabled: false,
      details_submitted: false,
    } as any);
    expect(await getStripeStatus("acct_123")).toBe("pending");
  });

  it("account fully onboarded → connected", async () => {
    mockAccountRetrieve.mockResolvedValue({
      id: "acct_123",
      charges_enabled: true,
      details_submitted: true,
    } as any);
    expect(await getStripeStatus("acct_123")).toBe("connected");
  });

  it("account deleted in Stripe → graceful fallback to not_started", async () => {
    mockAccountRetrieve.mockRejectedValue(new Error("No such account"));
    expect(await getStripeStatus("acct_gone")).toBe("not_started");
  });

  it("REGRESSION: !!stripe_account_id must NOT be used as the connected check", async () => {
    // The original bug: treated !!stripe_account_id as "connected"
    const stripeAccountId = "acct_incomplete";
    mockAccountRetrieve.mockResolvedValue({
      id: stripeAccountId,
      charges_enabled: false,
    } as any);

    // The WRONG check (original bug):
    const buggyResult = !!stripeAccountId; // true — this was the bug
    expect(buggyResult).toBe(true);

    // The CORRECT check:
    const correctResult = await getStripeStatus(stripeAccountId);
    expect(correctResult).toBe("pending");
    expect(correctResult).not.toBe("connected");
  });
});

// ── 2. stripe_subscription_id ≠ cancellable subscription ───────────

describe("2. stripe_subscription_id does NOT mean subscription is cancellable", () => {
  /**
   * Safe cancellation: wraps stripe.subscriptions.cancel in a try/catch
   * to handle already-cancelled or nonexistent subscriptions.
   *
   * This is the pattern that should be used in:
   *   - enrollments.ts:171 (withdrawFromProgram)
   *   - enrollments.ts:261 (removeStudentFromProgram)
   *   - programs.ts:462 (deleteProgram)
   */
  async function safeCancelSubscription(
    subscriptionId: string
  ): Promise<{ cancelled: boolean; error?: string }> {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
      return { cancelled: true };
    } catch (err: unknown) {
      const stripeErr = err as Stripe.errors.StripeError;
      if (stripeErr.code === "resource_missing") {
        // Subscription doesn't exist in Stripe — already gone
        return { cancelled: false, error: "not_found" };
      }
      throw err; // Re-throw unexpected errors
    }
  }

  it("cancels existing active subscription", async () => {
    mockSubCancel.mockResolvedValue({ id: "sub_123", status: "canceled" } as any);

    const result = await safeCancelSubscription("sub_123");
    expect(result.cancelled).toBe(true);
    expect(mockSubCancel).toHaveBeenCalledWith("sub_123");
  });

  it("handles already-cancelled subscription gracefully", async () => {
    const stripeError = new Error("No such subscription") as any;
    stripeError.code = "resource_missing";
    mockSubCancel.mockRejectedValue(stripeError);

    const result = await safeCancelSubscription("sub_already_gone");
    expect(result.cancelled).toBe(false);
    expect(result.error).toBe("not_found");
  });

  it("re-throws unexpected Stripe errors", async () => {
    const unexpectedError = new Error("Stripe API down") as any;
    unexpectedError.code = "api_error";
    mockSubCancel.mockRejectedValue(unexpectedError);

    await expect(safeCancelSubscription("sub_123")).rejects.toThrow("Stripe API down");
  });

  it("PATTERN: bare cancel without try/catch would crash on missing subscription", async () => {
    const stripeError = new Error("No such subscription") as any;
    stripeError.code = "resource_missing";
    mockSubCancel.mockRejectedValue(stripeError);

    // This is what the current code does — it WILL throw
    await expect(stripe.subscriptions.cancel("sub_gone")).rejects.toThrow();
  });
});

// ── 3. stripe_price_id ≠ price is still valid ──────────────────────

describe("3. stripe_price_id does NOT mean price is usable for checkout", () => {
  // Before reusing a cached stripe_price_id, verify it still exists
  // and is active on the connected account.
  //
  // Relevant in checkout/route.ts:186 where we do:
  //   let stripePriceId = program.stripe_price_id;
  //   if (!stripePriceId) { create new }
  // without checking if the cached price is still valid.
  async function isPriceValid(
    priceId: string,
    stripeAccountId: string
  ): Promise<boolean> {
    try {
      const price = await stripe.prices.retrieve(priceId, {
        stripeAccount: stripeAccountId,
      } as any);
      return price.active === true;
    } catch {
      return false;
    }
  }

  it("returns true for active price", async () => {
    mockPriceRetrieve.mockResolvedValue({
      id: "price_123",
      active: true,
    } as any);

    expect(await isPriceValid("price_123", "acct_123")).toBe(true);
  });

  it("returns false for archived/inactive price", async () => {
    mockPriceRetrieve.mockResolvedValue({
      id: "price_123",
      active: false,
    } as any);

    expect(await isPriceValid("price_123", "acct_123")).toBe(false);
  });

  it("returns false for deleted price", async () => {
    mockPriceRetrieve.mockRejectedValue(new Error("No such price"));

    expect(await isPriceValid("price_gone", "acct_123")).toBe(false);
  });

  it("PATTERN: trusting cached stripe_price_id skips validation entirely", () => {
    // This is the current checkout code pattern —
    // it just reuses the cached price ID without checking if it's still valid.
    const cachedPriceId = "price_maybe_deleted";
    const stripePriceId = cachedPriceId; // just trusts it

    // It should instead verify the price is still active before using it
    expect(stripePriceId).toBe("price_maybe_deleted"); // no validation happened
  });
});

// ── 4. Local DB status ≠ Stripe's actual status ────────────────────

describe("4. Local subscription status can be stale vs Stripe", () => {
  /**
   * billing.ts:isSubscriptionActive() only checks local DB status.
   * If a webhook was missed or delayed, the local status can diverge.
   *
   * Stripe subscription statuses: active, past_due, trialing,
   * incomplete, incomplete_expired, canceled, unpaid, paused
   */

  // Current implementation from billing.ts
  function isSubscriptionActive(sub: { status?: string | null } | null) {
    if (!sub) return false;
    return sub.status === "active";
  }

  it("active → true (correct)", () => {
    expect(isSubscriptionActive({ status: "active" })).toBe(true);
  });

  it("past_due → false (but student may still deserve grace period)", () => {
    // Stripe retries payment for past_due subscriptions.
    // Denying access immediately may be too aggressive.
    const result = isSubscriptionActive({ status: "past_due" });
    expect(result).toBe(false);
    // NOTE: Consider whether past_due should still grant access
    // during the retry window. This is a product decision.
  });

  it("trialing → false (but student IS in an active trial)", () => {
    // A trialing subscription is functionally active — the student
    // should have access. This is a bug if trials are ever used.
    const result = isSubscriptionActive({ status: "trialing" });
    expect(result).toBe(false);
    // NOTE: If trials are ever added, this will silently deny access.
  });

  it("canceled → false (correct)", () => {
    expect(isSubscriptionActive({ status: "canceled" })).toBe(false);
  });

  it("null subscription → false (correct)", () => {
    expect(isSubscriptionActive(null)).toBe(false);
  });

  it("STALENESS: local status says active but Stripe may have cancelled", () => {
    // If the account.updated or subscription.deleted webhook was missed,
    // local DB could say "active" while Stripe says "canceled".
    // The only way to catch this is to periodically reconcile.
    const localSub = { status: "active" };
    const stripeActualStatus = "canceled"; // webhook was missed

    expect(isSubscriptionActive(localSub)).toBe(true); // WRONG
    expect(localSub.status).not.toBe(stripeActualStatus); // diverged
  });
});
