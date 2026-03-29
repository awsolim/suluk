import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server client before importing queries
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getAdminProgramCardsByMosqueId } from "@/lib/supabase/queries";

// Helper for single-chain functions: .from() returns one chain that resolves
// to the provided data (used when the query uses a single joined select).
function mockSupabaseSingleQuery(data: any, error: any = null) {
  const chain: any = {};
  const methods = ["select", "eq", "in", "order"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  Object.defineProperty(chain, "then", {
    value: (resolve: any, reject: any) =>
      Promise.resolve({ data, error }).then(resolve, reject),
    writable: true,
  });

  const client: any = {
    from: vi.fn().mockReturnValue(chain),
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
// getAdminProgramCardsByMosqueId
// US-ADMIN-PC1
// ---------------------------------------------------------------------------
describe("getAdminProgramCardsByMosqueId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("US-ADMIN-PC1: returns empty array when no programs exist", async () => {
    const supabase = mockSupabaseSingleQuery([]);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminProgramCardsByMosqueId("mosque-1");

    expect(result).toEqual([]);
    // Single joined query — from("programs") called once
    expect(supabase.from).toHaveBeenCalledWith("programs");
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("US-ADMIN-PC1: maps teacher names and enrollment counts onto programs correctly", async () => {
    // Programs now include embedded teacher and enrollments from the joined select
    const programs = [
      {
        id: "prog-1",
        mosque_id: "mosque-1",
        title: "Quran Basics",
        teacher_profile_id: "teacher-1",
        is_active: true,
        teacher: { id: "teacher-1", full_name: "Sheikh Ahmed" },
        // 2 enrollments in prog-1
        enrollments: [{ id: "e1" }, { id: "e2" }],
      },
      {
        id: "prog-2",
        mosque_id: "mosque-1",
        title: "Arabic Fundamentals",
        teacher_profile_id: null,
        is_active: true,
        teacher: null,
        // 1 enrollment in prog-2
        enrollments: [{ id: "e3" }],
      },
    ];

    const supabase = mockSupabaseSingleQuery(programs);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminProgramCardsByMosqueId("mosque-1");

    expect(result).toHaveLength(2);

    const prog1 = result.find((p: any) => p.id === "prog-1");
    expect(prog1).toBeDefined();
    expect(prog1!.teacher_name).toBe("Sheikh Ahmed");
    expect(prog1!.enrolled_student_count).toBe(2);
    // teacher and enrollments keys should be removed
    expect(prog1!.teacher).toBeUndefined();
    expect(prog1!.enrollments).toBeUndefined();

    const prog2 = result.find((p: any) => p.id === "prog-2");
    expect(prog2).toBeDefined();
    // No teacher → teacher_name should be null
    expect(prog2!.teacher_name).toBeNull();
    expect(prog2!.enrolled_student_count).toBe(1);
  });

  it("US-ADMIN-PC1: uses null teacher_name when teacher join returns null", async () => {
    const programs = [
      {
        id: "prog-1",
        mosque_id: "mosque-1",
        title: "Quran Advanced",
        teacher_profile_id: "teacher-999",
        is_active: true,
        teacher: null,
        enrollments: [],
      },
    ];

    const supabase = mockSupabaseSingleQuery(programs);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminProgramCardsByMosqueId("mosque-1");

    expect(result).toHaveLength(1);
    expect(result[0].teacher_name).toBeNull();
    expect(result[0].enrolled_student_count).toBe(0);
  });

  it("US-ADMIN-PC1: program with no enrollments gets enrolled_student_count of 0", async () => {
    const programs = [
      {
        id: "prog-1",
        mosque_id: "mosque-1",
        title: "Tajweed",
        teacher_profile_id: null,
        is_active: true,
        teacher: null,
        enrollments: [],
      },
    ];

    const supabase = mockSupabaseSingleQuery(programs);
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminProgramCardsByMosqueId("mosque-1");

    expect(result).toHaveLength(1);
    expect(result[0].enrolled_student_count).toBe(0);
  });
});
