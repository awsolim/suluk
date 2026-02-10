// components/admin/AdminProgramForm.tsx
"use client";

import { useMemo, useState } from "react";

type TeacherOption = { id: string; full_name: string; email: string | null };
type MosqueOption = { id: string; name: string; address: string | null; picture_path: string | null };

type Props = {
  teachers: TeacherOption[];
  mosques: MosqueOption[];
  createProgramAction: (formData: FormData) => Promise<void>;
};

export default function AdminProgramForm({ teachers, mosques, createProgramAction }: Props) {
  const [mode, setMode] = useState<"pick" | "new">("pick"); // NEW: choose existing mosque or create new

  const defaultTeacherId = useMemo(() => teachers[0]?.id ?? "", [teachers]);
  const defaultMosqueId = useMemo(() => mosques[0]?.id ?? "", [mosques]);

  return (
    <form action={createProgramAction} className="mt-6 space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Program details</h2>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-zinc-800">Title</span>
            <input
              name="title"
              required
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
              placeholder="e.g., Hifz Foundations (Juz Amma)"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-zinc-800">Description</span>
            <textarea
              name="description"
              className="min-h-[96px] rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
              placeholder="Short description for students"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-zinc-800">Lead teacher</span>
            <select
              name="lead_teacher_id"
              defaultValue={defaultTeacherId}
              required
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || "Unnamed"}{t.email ? ` — ${t.email}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-zinc-800">Monthly price</span>
            <input
              name="price_monthly"
              type="number"
              step="0.01"
              defaultValue="100.00"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-zinc-900">Mosque</h2>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("pick")} // NEW: switch to pick existing
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                mode === "pick"
                  ? "border-zinc-300 bg-zinc-50 text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Choose existing
            </button>

            <button
              type="button"
              onClick={() => setMode("new")} // NEW: switch to add new
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                mode === "new"
                  ? "border-zinc-300 bg-zinc-50 text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Add new
            </button>
          </div>
        </div>

        {mode === "pick" ? (
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-zinc-800">Select mosque</span>
              <select
                name="mosque_id"
                defaultValue={defaultMosqueId}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
              >
                <option value="">— None —</option>
                {mosques.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {/* NEW: fields to create a mosque. Only name required. */}
            <input type="hidden" name="create_new_mosque" value="1" />

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-zinc-800">Mosque name *</span>
              <input
                name="mosque_name"
                required
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
                placeholder="e.g., Rahma Mosque (MAC)"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-zinc-800">Address</span>
              <input
                name="mosque_address"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
                placeholder="6104 172 St NW, Edmonton, AB T6M 1E3"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-zinc-800">Picture path (optional)</span>
              <input
                name="mosque_picture_path"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
                placeholder="mosques/rahma.jpeg"
              />
            </label>

            <p className="text-xs text-zinc-500">
              Picture path should be inside bucket <span className="font-semibold">public-media</span>.
              If empty, no picture will show.
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-[#c5162f] via-[#e11d48] to-[#c5162f] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
      >
        Create program
      </button>
    </form>
  );
}
