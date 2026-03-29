import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server client before importing queries
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getAdminProgramCardsByMosqueId } from "@/lib/supabase/queries";

// Helper for multi-query functions: each .from(tableName) call returns a
// dedicated chain that resolves to the data registered for that table.
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
// getAdminProgramCardsByMosqueId
// US-ADMIN-PC1
// ---------------------------------------------------------------------------
describe("getAdminProgramCardsByMosqueId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("US-ADMIN-PC1: returns empty array when no programs exist", async () => {
    const supabase = mockSupabaseMultiQuery({
      programs: { data: [] },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminProgramCardsByMosqueId("mosque-1");

    expect(result).toEqual([]);
    // Only the programs query should have been called — early return path
    expect(supabase.from).toHaveBeenCalledWith("programs");
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("US-ADMIN-PC1: maps teacher names and enrollment counts onto programs correctly", async () => {
    const programs = [
      {
        id: "prog-1",
        mosque_id: "mosque-1",
        title: "Quran Basics",
        teacher_profile_id: "teacher-1",
        is_active: true,
      },
      {
        id: "prog-2",
        mosque_id: "mosque-1",
        title: "Arabic Fundamentals",
        teacher_profile_id: null,
        is_active: true,
      },
    ];

    const teacherProfiles = [
      { id: "teacher-1", full_name: "Sheikh Ahmed" },
    ];

    // 3 enrollments: 2 in prog-1, 1 in prog-2
    const enrollments = [
      { id: "e1", program_id: "prog-1" },
      { id: "e2", program_id: "prog-1" },
      { id: "e3", program_id: "prog-2" },
    ];

    const supabase = mockSupabaseMultiQuery({
      programs: { data: programs },
      profiles: { data: teacherProfiles },
      enrollments: { data: enrollments },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminProgramCardsByMosqueId("mosque-1");

    expect(result).toHaveLength(2);

    const prog1 = result.find((p: any) => p.id === "prog-1");
    expect(prog1).toBeDefined();
    expect(prog1!.teacher_name).toBe("Sheikh Ahmed");
    expect(prog1!.enrolled_student_count).toBe(2);

    const prog2 = result.find((p: any) => p.id === "prog-2");
    expect(prog2).toBeDefined();
    // No teacher_profile_id → teacher_name should be null
    expect(prog2!.teacher_name).toBeNull();
    expect(prog2!.enrolled_student_count).toBe(1);
  });

  it("US-ADMIN-PC1: uses null teacher_name when teacher profile is missing from profiles query", async () => {
    const programs = [
      {
        id: "prog-1",
        mosque_id: "mosque-1",
        title: "Quran Advanced",
        teacher_profile_id: "teacher-999",
        is_active: true,
      },
    ];

    // profiles returns empty — teacher not found
    const supabase = mockSupabaseMultiQuery({
      programs: { data: programs },
      profiles: { data: [] },
      enrollments: { data: [] },
    });
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
      },
    ];

    const supabase = mockSupabaseMultiQuery({
      programs: { data: programs },
      enrollments: { data: [] },
    });
    vi.mocked(createClient).mockResolvedValue(supabase);

    const result = await getAdminProgramCardsByMosqueId("mosque-1");

    expect(result).toHaveLength(1);
    expect(result[0].enrolled_student_count).toBe(0);
  });
});
