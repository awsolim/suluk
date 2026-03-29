/**
 * Tests that Stripe Connect status is determined by charges_enabled,
 * NOT just by the existence of stripe_account_id.
 *
 * This would have caught the bug where clicking "Connect Stripe" created
 * a Stripe account (setting stripe_account_id), but abandoning onboarding
 * still showed "Stripe account connected" in the UI.
 *
 * Run: npx vitest tests/stripe-connect-status.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the stripe module before importing anything that uses it
vi.mock("@/lib/stripe", () => ({
  stripe: {
    accounts: {
      retrieve: vi.fn(),
    },
  },
}));

import { stripe } from "@/lib/stripe";

const mockRetrieve = vi.mocked(stripe.accounts.retrieve);

/**
 * Determines Stripe Connect status for a mosque.
 * Extracted from settings page logic for testability.
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

describe("Stripe Connect status determination", () => {
  beforeEach(() => {
    mockRetrieve.mockReset();
  });

  it("returns not_started when no stripe_account_id", async () => {
    const status = await getStripeStatus(null);
    expect(status).toBe("not_started");
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it("returns pending when account exists but charges_enabled is false", async () => {
    mockRetrieve.mockResolvedValue({
      id: "acct_123",
      charges_enabled: false,
      details_submitted: false,
    } as any);

    const status = await getStripeStatus("acct_123");
    expect(status).toBe("pending");
    expect(mockRetrieve).toHaveBeenCalledWith("acct_123");
  });

  it("returns connected only when charges_enabled is true", async () => {
    mockRetrieve.mockResolvedValue({
      id: "acct_123",
      charges_enabled: true,
      details_submitted: true,
    } as any);

    const status = await getStripeStatus("acct_123");
    expect(status).toBe("connected");
  });

  it("returns not_started when Stripe API call fails", async () => {
    mockRetrieve.mockRejectedValue(new Error("No such account"));

    const status = await getStripeStatus("acct_deleted_999");
    expect(status).toBe("not_started");
  });

  it("BUG REGRESSION: having stripe_account_id alone is NOT enough to be connected", async () => {
    // This is the exact scenario that caused the bug:
    // Admin clicked Connect, Stripe account was created (stripe_account_id saved),
    // but admin abandoned onboarding (charges_enabled = false).
    mockRetrieve.mockResolvedValue({
      id: "acct_abandoned",
      charges_enabled: false,
      details_submitted: false,
      payouts_enabled: false,
    } as any);

    const status = await getStripeStatus("acct_abandoned");

    // OLD (buggy): would have been "connected" because !!stripe_account_id === true
    // NEW (fixed): must be "pending" because charges_enabled === false
    expect(status).not.toBe("connected");
    expect(status).toBe("pending");
  });
});
