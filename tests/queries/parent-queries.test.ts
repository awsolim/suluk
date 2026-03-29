import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server client before importing queries
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getChildrenForParent,
  getChildEnrollments,
  getChildApplications,
} from "@/lib/supabase/queries";

// Helper to build a chainable query mock where the chain itself is awaitable.
// The `then` property enables `await supabase.from(...).select(...).eq(...)` patterns
// without needing a `.single()` terminator.
function mockSupabaseChain(resolvedData: any, resolvedError: any = null) {
  const queryChain: any = {};
  const queryMethods = ["select", "eq", "in", "order"];
  for (const m of queryMethods) {
    queryChain[m] = vi.fn().mockReturnValue(queryChain);
  }
  queryChain.single = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
  queryChain.maybeSingle = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
  Object.defineProperty(queryChain, "then", {
    value: (resolve: any, reject: any) =>
      Promise.resolve({ data: resolvedData, error: resolvedError }).then(resolve, reject),
    writable: true,
  });

  const client: any = {
    from: vi.fn().mockReturnValue(queryChain),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    _queryChain: queryChain,
  };
  return client;
}

// ---------------------------------------------------------------------------
// getChildrenForParent
// US-PARENT-1
// ---------------------------------------------------------------------------
describe("getChildrenForParent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("US-PARENT-1: returns children with profile data", async () => {
    const rawLinks = [
      {
        id: "link-1",
        child_profile_id: "child-1",
        created_at: "2024-01-01T00:00:00Z",
        profiles: {
          id: "child-1",
          full_name: "Ahmed Junior",
          date_of_birth: "2015-05-10",
          gender: "male",
          avatar_url: null,
        },
      },
      {
        id: "link-2",
        child_profile_id: "child-2",
        created_at: "2024-02-01T00:00:00Z",
        profiles: {
          id: "child-2",
          full_name: "Fatima Junior",
          date_of_birth: "2017-08-20",
          gender: "female",
          avatar_url: null,
        },
      },
    ];

    const supabase = mockSupabaseChain(rawLinks);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildrenForParent("parent-1", "mosque-1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("link-1");
    expect(result[0].child_profile_id).toBe("child-1");
    expect((result[0] as any).profiles.full_name).toBe("Ahmed Junior");
    expect(result[1].id).toBe("link-2");
    expect((result[1] as any).profiles.full_name).toBe("Fatima Junior");
    expect(supabase.from).toHaveBeenCalledWith("parent_child_links");
    expect(supabase._queryChain.eq).toHaveBeenCalledWith("parent_profile_id", "parent-1");
    expect(supabase._queryChain.eq).toHaveBeenCalledWith("mosque_id", "mosque-1");
  });

  it("US-PARENT-1: returns empty array when no children", async () => {
    const supabase = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildrenForParent("parent-1", "mosque-1");

    expect(result).toEqual([]);
  });

  it("US-PARENT-1: returns empty array when data is empty array", async () => {
    const supabase = mockSupabaseChain([]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildrenForParent("parent-1", "mosque-1");

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getChildEnrollments
// US-PARENT-2
// ---------------------------------------------------------------------------
describe("getChildEnrollments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("US-PARENT-2: filters enrollments by mosque_id in JS", async () => {
    // Raw enrollments include programs from two different mosques
    const rawEnrollments = [
      {
        id: "enroll-1",
        created_at: "2024-01-01T00:00:00Z",
        programs: {
          id: "prog-1",
          title: "Quran Basics",
          description: null,
          thumbnail_url: null,
          schedule: null,
          schedule_timezone: null,
          mosque_id: "mosque-1",
          teacher_profile_id: "teacher-1",
          profiles: { full_name: "Sheikh Ahmed", avatar_url: null },
        },
      },
      {
        id: "enroll-2",
        created_at: "2024-02-01T00:00:00Z",
        programs: {
          id: "prog-2",
          title: "Arabic 101",
          description: null,
          thumbnail_url: null,
          schedule: null,
          schedule_timezone: null,
          mosque_id: "mosque-other",
          teacher_profile_id: null,
          profiles: null,
        },
      },
    ];

    const supabase = mockSupabaseChain(rawEnrollments);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildEnrollments("child-1", "mosque-1");

    // Only enroll-1 belongs to mosque-1
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("enroll-1");
    expect((result[0] as any).programs.mosque_id).toBe("mosque-1");
    expect(supabase.from).toHaveBeenCalledWith("enrollments");
    expect(supabase._queryChain.eq).toHaveBeenCalledWith("student_profile_id", "child-1");
  });

  it("US-PARENT-2: returns empty array when child has no enrollments", async () => {
    const supabase = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildEnrollments("child-1", "mosque-1");

    expect(result).toEqual([]);
  });

  it("US-PARENT-2: returns empty array when all enrollments belong to other mosques", async () => {
    const rawEnrollments = [
      {
        id: "enroll-1",
        created_at: "2024-01-01T00:00:00Z",
        programs: { id: "prog-1", mosque_id: "mosque-other" },
      },
    ];

    const supabase = mockSupabaseChain(rawEnrollments);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildEnrollments("child-1", "mosque-1");

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getChildApplications
// US-PARENT-3
// ---------------------------------------------------------------------------
describe("getChildApplications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("US-PARENT-3: filters applications by mosque_id in JS", async () => {
    // Raw applications include programs from two different mosques
    const rawApplications = [
      {
        id: "app-1",
        status: "pending",
        created_at: "2024-03-01T00:00:00Z",
        programs: {
          id: "prog-1",
          title: "Quran Advanced",
          description: null,
          thumbnail_url: null,
          mosque_id: "mosque-1",
        },
      },
      {
        id: "app-2",
        status: "approved",
        created_at: "2024-02-01T00:00:00Z",
        programs: {
          id: "prog-2",
          title: "Tajweed",
          description: null,
          thumbnail_url: null,
          mosque_id: "mosque-other",
        },
      },
    ];

    const supabase = mockSupabaseChain(rawApplications);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildApplications("child-1", "mosque-1");

    // Only app-1 belongs to mosque-1
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("app-1");
    expect((result[0] as any).programs.mosque_id).toBe("mosque-1");
    expect(supabase.from).toHaveBeenCalledWith("program_applications");
    expect(supabase._queryChain.eq).toHaveBeenCalledWith("student_profile_id", "child-1");
    expect(supabase._queryChain.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("US-PARENT-3: returns empty array when child has no applications", async () => {
    const supabase = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildApplications("child-1", "mosque-1");

    expect(result).toEqual([]);
  });

  it("US-PARENT-3: returns empty array when all applications belong to other mosques", async () => {
    const rawApplications = [
      {
        id: "app-1",
        status: "pending",
        created_at: "2024-01-01T00:00:00Z",
        programs: { id: "prog-1", mosque_id: "mosque-other" },
      },
    ];

    const supabase = mockSupabaseChain(rawApplications);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getChildApplications("child-1", "mosque-1");

    expect(result).toEqual([]);
  });
});
