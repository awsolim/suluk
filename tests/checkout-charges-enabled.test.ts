/**
 * Tests that checkout validation rejects mosques with incomplete Stripe
 * onboarding (stripe_account_id exists but charges_enabled is false).
 *
 * Run: npx vitest tests/checkout-charges-enabled.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock stripe before importing the route
vi.mock("@/lib/stripe", () => ({
  stripe: {
    accounts: { retrieve: vi.fn() },
  },
}));

// Mock supabase server (not used in validateCheckout but imported by the module)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { stripe } from "@/lib/stripe";
import { validateCheckout } from "@/app/api/stripe/checkout/route";

const mockAccountRetrieve = vi.mocked(stripe.accounts.retrieve);

beforeEach(() => {
  mockAccountRetrieve.mockReset();
});

/**
 * Creates a mock Supabase client that returns predefined data
 * for the queries validateCheckout makes.
 */
function mockSupabase(overrides: {
  mosque?: Record<string, unknown> | null;
  program?: Record<string, unknown> | null;
  parentChildLink?: Record<string, unknown> | null;
  application?: Record<string, unknown> | null;
  enrollment?: Record<string, unknown> | null;
}) {
  const defaults = {
    mosque: null,
    program: null,
    parentChildLink: null,
    application: null,
    enrollment: null,
    ...overrides,
  };

  return {
    from: (table: string) => ({
      select: () => ({
        eq: function () {
          return this;
        },
        is: function () {
          return this;
        },
        maybeSingle: () => {
          switch (table) {
            case "mosques":
              return { data: defaults.mosque };
            case "programs":
              return { data: defaults.program };
            case "parent_child_links":
              return { data: defaults.parentChildLink };
            case "program_applications":
              return { data: defaults.application };
            case "enrollments":
              return { data: defaults.enrollment };
            default:
              return { data: null };
          }
        },
      }),
    }),
  };
}

const VALID_UUID = "a0000000-0000-0000-0000-000000000001";
const MOSQUE_SLUG = "test-mosque";

describe("checkout validates charges_enabled, not just stripe_account_id", () => {
  it("rejects mosque with no stripe_account_id", async () => {
    const supabase = mockSupabase({
      mosque: { id: VALID_UUID, slug: MOSQUE_SLUG, stripe_account_id: null },
    });

    const result = await validateCheckout(supabase, {
      userId: VALID_UUID,
      programId: VALID_UUID,
      slug: MOSQUE_SLUG,
      childProfileId: null,
    });

    expect(result).toEqual({
      error: "This mosque has not connected their Stripe account yet.",
      status: 400,
    });
    expect(mockAccountRetrieve).not.toHaveBeenCalled();
  });

  it("rejects mosque with stripe_account_id but charges_enabled=false", async () => {
    const supabase = mockSupabase({
      mosque: {
        id: VALID_UUID,
        slug: MOSQUE_SLUG,
        stripe_account_id: "acct_incomplete",
      },
    });

    mockAccountRetrieve.mockResolvedValue({
      id: "acct_incomplete",
      charges_enabled: false,
      details_submitted: false,
    } as any);

    const result = await validateCheckout(supabase, {
      userId: VALID_UUID,
      programId: VALID_UUID,
      slug: MOSQUE_SLUG,
      childProfileId: null,
    });

    expect(result).toHaveProperty("error");
    expect((result as any).error).toMatch(/incomplete/i);
    expect((result as any).status).toBe(400);
  });

  it("proceeds when charges_enabled=true", async () => {
    const supabase = mockSupabase({
      mosque: {
        id: VALID_UUID,
        slug: MOSQUE_SLUG,
        stripe_account_id: "acct_ready",
      },
      program: {
        id: VALID_UUID,
        mosque_id: VALID_UUID,
        title: "Test Program",
        is_paid: true,
        price_monthly_cents: 3000,
        stripe_price_id: null,
      },
      application: { id: "app1", status: "accepted" },
      enrollment: null,
    });

    mockAccountRetrieve.mockResolvedValue({
      id: "acct_ready",
      charges_enabled: true,
      details_submitted: true,
    } as any);

    const result = await validateCheckout(supabase, {
      userId: VALID_UUID,
      programId: VALID_UUID,
      slug: MOSQUE_SLUG,
      childProfileId: null,
    });

    // Should pass validation (no error property)
    expect(result).not.toHaveProperty("error");
    expect(result).toHaveProperty("mosque");
    expect(result).toHaveProperty("program");
  });

  it("returns 500 when Stripe API fails to retrieve account", async () => {
    const supabase = mockSupabase({
      mosque: {
        id: VALID_UUID,
        slug: MOSQUE_SLUG,
        stripe_account_id: "acct_broken",
      },
    });

    mockAccountRetrieve.mockRejectedValue(new Error("Stripe API down"));

    const result = await validateCheckout(supabase, {
      userId: VALID_UUID,
      programId: VALID_UUID,
      slug: MOSQUE_SLUG,
      childProfileId: null,
    });

    expect(result).toEqual({
      error: "Unable to verify Stripe account status.",
      status: 500,
    });
  });
});
