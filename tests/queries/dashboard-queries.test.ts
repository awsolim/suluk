import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server client before importing queries
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getEnrollmentsForStudentInMosque,
  getTeacherDashboardStats,
  getAdminDashboardStats,
  getLatestAnnouncementsForPrograms,
} from "@/lib/supabase/queries";

// Helper to build a chainable query mock where the chain itself is awaitable.
// The `then` property is only on the inner query chain (not the top-level client)
// so that `await createClient()` resolves to the client object, not into the chain.
function mockSupabaseChain(resolvedData: any, resolvedError: any = null) {
  // Inner query chain (returned by .from())
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

  // Top-level client — no `then` so await createClient() resolves to this object
  const client: any = {
    from: vi.fn().mockReturnValue(queryChain),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    // Expose the inner query chain for assertions
    _queryChain: queryChain,
  };
  return client;
}

// Helper for multi-query functions: each .from(tableName) call returns a
// dedicated chain that resolves to the data registered for that table.
// Tables not listed resolve to [].
function mockSupabaseMultiQuery(tableDataMap: Record<string, { data: any; error?: any }>) {
  const makeChain = (resolvedData: any, resolvedError: any = null) => {
    const chain: any = {};
    const methods = ["select", "eq", "in", "order"];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
    Object.defineProperty(chain, "then", {
      value: (resolve: any, reject: any) =>
        Promise.resolve({ data: resolvedData, error: resolvedError }).then(resolve, reject),
      writable: true,
    });
    return chain;
  };

  const client: any = {
    from: vi.fn((table: string) => {
      const entry = tableDataMap[table];
      if (entry) {
        return makeChain(entry.data, entry.error ?? null);
      }
      return makeChain([], null);
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
  };
  return client;
}

// ---------------------------------------------------------------------------
// getEnrollmentsForStudentInMosque
// US-DASH-1
// ---------------------------------------------------------------------------
describe("getEnrollmentsForStudentInMosque", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("US-DASH-1: returns mapped enrollments with program data", async () => {
    const rawEnrollment = {
      id: "enroll-1",
      program_id: "prog-1",
      programs: {
        id: "prog-1",
        mosque_id: "mosque-1",
        title: "Quran Basics",
        description: "Learn basics",
        is_active: true,
        schedule: [{ day: "Monday" }],
        schedule_timezone: "America/Edmonton",
      },
    };
    const supabase = mockSupabaseChain([rawEnrollment]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getEnrollmentsForStudentInMosque("student-1", "mosque-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("enroll-1");
    expect(result[0].program_id).toBe("prog-1");
    expect(result[0].programs).not.toBeNull();
    expect(result[0].programs!.title).toBe("Quran Basics");
    expect(result[0].programs!.schedule).toEqual([{ day: "Monday" }]);
    expect(supabase.from).toHaveBeenCalledWith("enrollments");
    expect(supabase._queryChain.eq).toHaveBeenCalledWith("student_profile_id", "student-1");
    expect(supabase._queryChain.eq).toHaveBeenCalledWith("programs.mosque_id", "mosque-1");
  });

  it("US-DASH-1: returns empty array when student has no enrollments", async () => {
    const supabase = mockSupabaseChain([]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getEnrollmentsForStudentInMosque("student-1", "mosque-1");

    expect(result).toEqual([]);
  });

  it("US-DASH-1: handles programs returned as array (supabase join format)", async () => {
    const rawEnrollment = {
      id: "enroll-2",
      program_id: "prog-2",
      programs: [
        {
          id: "prog-2",
          mosque_id: "mosque-1",
          title: "Arabic Fundamentals",
          description: null,
          is_active: false,
          schedule: null,
          schedule_timezone: null,
        },
      ],
    };
    const supabase = mockSupabaseChain([rawEnrollment]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getEnrollmentsForStudentInMosque("student-1", "mosque-1");

    expect(result).toHaveLength(1);
    expect(result[0].programs!.title).toBe("Arabic Fundamentals");
    // null schedule becomes []
    expect(result[0].programs!.schedule).toEqual([]);
    // null schedule_timezone falls back to default
    expect(result[0].programs!.schedule_timezone).toBe("America/Edmonton");
  });

  it("US-DASH-1: programs is null when join returns null", async () => {
    const rawEnrollment = {
      id: "enroll-3",
      program_id: "prog-3",
      programs: null,
    };
    const supabase = mockSupabaseChain([rawEnrollment]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getEnrollmentsForStudentInMosque("student-1", "mosque-1");

    expect(result).toHaveLength(1);
    expect(result[0].programs).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getTeacherDashboardStats
// US-DASH-2
// ---------------------------------------------------------------------------
describe("getTeacherDashboardStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("US-DASH-2: returns zero counts when teacher has no programs", async () => {
    // programs query returns [] → early return path, enrollments query never runs
    const supabase = mockSupabaseMultiQuery({
      programs: { data: [] },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getTeacherDashboardStats("teacher-1", "mosque-1");

    expect(result).toEqual({ class_count: 0, student_count: 0 });
  });

  it("US-DASH-2: returns correct counts when teacher has programs with students", async () => {
    const supabase = mockSupabaseMultiQuery({
      programs: { data: [{ id: "prog-1" }, { id: "prog-2" }] },
      enrollments: { data: [{ id: "e1" }, { id: "e2" }, { id: "e3" }] },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getTeacherDashboardStats("teacher-1", "mosque-1");

    expect(result).toEqual({ class_count: 2, student_count: 3 });
  });

  it("US-DASH-2: returns zero student count when programs exist but have no enrollments", async () => {
    const supabase = mockSupabaseMultiQuery({
      programs: { data: [{ id: "prog-1" }] },
      enrollments: { data: [] },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getTeacherDashboardStats("teacher-1", "mosque-1");

    expect(result).toEqual({ class_count: 1, student_count: 0 });
  });
});

// ---------------------------------------------------------------------------
// getAdminDashboardStats
// US-DASH-3
// ---------------------------------------------------------------------------
describe("getAdminDashboardStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("US-DASH-3: return shape has correct properties", async () => {
    const supabase = mockSupabaseMultiQuery({
      programs: { data: [] },
      mosque_memberships: { data: [] },
      enrollments: { data: [] },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminDashboardStats("mosque-1");

    expect(result).toHaveProperty("total_program_count");
    expect(result).toHaveProperty("active_program_count");
    expect(result).toHaveProperty("teacher_count");
    expect(result).toHaveProperty("student_count");
  });

  it("US-DASH-3: returns all zeros when mosque has no data", async () => {
    const supabase = mockSupabaseMultiQuery({
      programs: { data: [] },
      mosque_memberships: { data: [] },
      enrollments: { data: [] },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminDashboardStats("mosque-1");

    expect(result).toEqual({
      total_program_count: 0,
      active_program_count: 0,
      teacher_count: 0,
      student_count: 0,
    });
  });

  it("US-DASH-3: correctly counts active vs inactive programs", async () => {
    const supabase = mockSupabaseMultiQuery({
      programs: {
        data: [
          { id: "prog-1", is_active: true },
          { id: "prog-2", is_active: true },
          { id: "prog-3", is_active: false },
        ],
      },
      mosque_memberships: { data: [{ id: "mem-1" }, { id: "mem-2" }] },
      enrollments: { data: [{ id: "e1" }, { id: "e2" }, { id: "e3" }, { id: "e4" }] },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminDashboardStats("mosque-1");

    expect(result.total_program_count).toBe(3);
    expect(result.active_program_count).toBe(2);
    expect(result.teacher_count).toBe(2);
    expect(result.student_count).toBe(4);
  });

  it("US-DASH-3: skips enrollments query when there are no programs", async () => {
    // When programs is [], programIds is [] so enrollments query is short-circuited
    const supabase = mockSupabaseMultiQuery({
      programs: { data: [] },
      mosque_memberships: { data: [{ id: "mem-1" }] },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminDashboardStats("mosque-1");

    expect(result.total_program_count).toBe(0);
    expect(result.student_count).toBe(0);
    expect(result.teacher_count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getLatestAnnouncementsForPrograms
// US-DASH-4
// ---------------------------------------------------------------------------
describe("getLatestAnnouncementsForPrograms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("US-DASH-4: returns empty array for empty program IDs without querying", async () => {
    const supabase = mockSupabaseChain([]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getLatestAnnouncementsForPrograms([]);

    expect(result).toEqual([]);
    // Should not have called .from() at all — early return
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("US-DASH-4: returns one announcement per program (deduplicates to latest)", async () => {
    // Ordered descending by created_at — first occurrence per program wins
    const announcements = [
      { id: "a3", program_id: "prog-1", message: "Latest for p1", created_at: "2024-03-03", author_profile_id: "u1", profiles: null },
      { id: "a2", program_id: "prog-2", message: "Latest for p2", created_at: "2024-03-02", author_profile_id: "u1", profiles: null },
      { id: "a1", program_id: "prog-1", message: "Older for p1",  created_at: "2024-03-01", author_profile_id: "u1", profiles: null },
    ];
    const supabase = mockSupabaseChain(announcements);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getLatestAnnouncementsForPrograms(["prog-1", "prog-2"]);

    // Two distinct programs → two results
    expect(result).toHaveLength(2);
    // prog-1 should map to the latest announcement (a3)
    const prog1Result = result.find((a: any) => a.program_id === "prog-1");
    expect(prog1Result!.id).toBe("a3");
    expect(prog1Result!.message).toBe("Latest for p1");
    // prog-2 maps to a2
    const prog2Result = result.find((a: any) => a.program_id === "prog-2");
    expect(prog2Result!.id).toBe("a2");
  });

  it("US-DASH-4: returns empty array when query returns no announcements", async () => {
    const supabase = mockSupabaseChain([]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getLatestAnnouncementsForPrograms(["prog-1", "prog-2"]);

    expect(result).toEqual([]);
    expect(supabase.from).toHaveBeenCalledWith("program_announcements");
  });

  it("US-DASH-4: returns single announcement when only one exists", async () => {
    const announcements = [
      { id: "a1", program_id: "prog-1", message: "Only announcement", created_at: "2024-01-01", author_profile_id: "u1", profiles: null },
    ];
    const supabase = mockSupabaseChain(announcements);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getLatestAnnouncementsForPrograms(["prog-1"]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a1");
  });
});
