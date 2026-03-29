import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server client before importing queries
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";

// Helper to build a chainable Supabase mock
function mockSupabaseQuery(resolvedData: any, resolvedError: any = null) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  };
  return chain;
}

describe("getMosqueBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mosque data for valid slug", async () => {
    const mockMosque = {
      id: "mosque-1",
      name: "Test Mosque",
      slug: "test-mosque",
      primary_color: "#111827",
      secondary_color: "#111827",
      logo_url: null,
      stripe_account_id: null,
    };
    const supabase = mockSupabaseQuery(mockMosque);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getMosqueBySlug("test-mosque");

    expect(result).toEqual(mockMosque);
    expect(supabase.from).toHaveBeenCalledWith("mosques");
    expect(supabase.eq).toHaveBeenCalledWith("slug", "test-mosque");
    expect(supabase.single).toHaveBeenCalled();
  });

  it("returns null when mosque not found", async () => {
    const supabase = mockSupabaseQuery(null, { message: "not found" });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getMosqueBySlug("nonexistent");

    expect(result).toBeNull();
  });
});

describe("getProfileForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when user is not authenticated", async () => {
    const supabase = mockSupabaseQuery(null);
    supabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "not authenticated" },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getProfileForCurrentUser();

    expect(result).toBeNull();
  });

  it("returns profile for authenticated user", async () => {
    const mockProfile = {
      id: "user-1",
      full_name: "Test User",
      email: "test@example.com",
      phone_number: null,
      avatar_url: null,
      gender: null,
      age: null,
    };
    const supabase = mockSupabaseQuery(mockProfile);
    supabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getProfileForCurrentUser();

    expect(result).toEqual(mockProfile);
    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(supabase.eq).toHaveBeenCalledWith("id", "user-1");
  });
});

describe("getMosqueMembershipForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns membership when user is a member", async () => {
    const mockMembership = {
      id: "mem-1",
      profile_id: "user-1",
      mosque_id: "mosque-1",
      role: "student",
      can_manage_programs: false,
    };
    const supabase = mockSupabaseQuery(mockMembership);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getMosqueMembershipForUser("user-1", "mosque-1");

    expect(result).toEqual(mockMembership);
    expect(supabase.from).toHaveBeenCalledWith("mosque_memberships");
    expect(supabase.eq).toHaveBeenCalledWith("profile_id", "user-1");
    expect(supabase.eq).toHaveBeenCalledWith("mosque_id", "mosque-1");
  });

  it("returns null when user is not a member", async () => {
    const supabase = mockSupabaseQuery(null);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getMosqueMembershipForUser("user-1", "mosque-1");

    expect(result).toBeNull();
  });
});
