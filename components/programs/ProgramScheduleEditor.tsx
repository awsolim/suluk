"use client";

import { useState, useEffect } from "react";

type Row = {
  day: string;
  start: string;
  end: string;
};

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function generateTimeOptions() {
  const times: { label: string; value: string }[] = [];

  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${m === 0 ? "00" : m} ${ampm}`;
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;

      times.push({ label, value });
    }
  }

  return times;
}

const TIME_OPTIONS = generateTimeOptions();

export default function ProgramScheduleEditor() {
  const [rows, setRows] = useState<Row[]>([
    { day: "", start: "", end: "" },
  ]);

  const [serialized, setSerialized] = useState("[]");

  useEffect(() => {
    const validRows = rows.filter(
      (r) => r.day && r.start && r.end
    );

    setSerialized(JSON.stringify(validRows));
  }, [rows]);

  function updateRow(index: number, field: keyof Row, value: string) {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  }

  function addRow() {
    setRows([...rows, { day: "", start: "", end: "" }]);
  }

  function removeRow(index: number) {
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated.length ? updated : [{ day: "", start: "", end: "" }]);
  }

  function usedDays() {
    return rows.map((r) => r.day).filter(Boolean);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="schedule" value={serialized} />

      <p className="text-sm font-medium">Weekly Schedule</p>

      {rows.map((row, i) => {
        const takenDays = usedDays().filter((d, idx) => idx !== i);

        return (
          <div
            key={i}
            className="grid grid-cols-3 gap-2 items-center"
          >
            {/* Day */}
            <select
              value={row.day}
              onChange={(e) => updateRow(i, "day", e.target.value)}
              className="rounded-xl border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">Day</option>
              {DAYS.map((d) => (
                <option
                  key={d}
                  value={d}
                  disabled={takenDays.includes(d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>

            {/* Start */}
            <select
              value={row.start}
              onChange={(e) => updateRow(i, "start", e.target.value)}
              className="rounded-xl border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">Start</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* End */}
            <select
              value={row.end}
              onChange={(e) => updateRow(i, "end", e.target.value)}
              className="rounded-xl border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">End</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Remove button */}
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="col-span-3 text-xs text-red-600"
              >
                Remove
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        className="text-sm underline"
      >
        + Add day
      </button>
    </div>
  );
}