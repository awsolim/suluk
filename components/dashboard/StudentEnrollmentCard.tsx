"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildCalendarDaysForCurrentMonth,
  formatTimeRange,
  formatWeekdayList,
  getNextClassSessionLabel,
  getUpcomingClassDates,
  normalizeScheduleDays,
  toDateKey,
} from "@/lib/schedule";

type StudentEnrollmentCardProps = {
  slug: string;
  program: {
    id: string;
    title: string;
    description: string | null;
    schedule_days: string[];
    schedule_start_time: string | null;
    schedule_end_time: string | null;
    schedule_timezone: string | null;
  };
  latestAnnouncement: {
    id: string;
    message: string;
    created_at: string;
    author_name: string | null;
    author_avatar_src: string;
  } | null;
};

function formatAnnouncementDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

export default function StudentEnrollmentCard({
  slug,
  program,
  latestAnnouncement,
}: StudentEnrollmentCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const timeZone = program.schedule_timezone || "America/Edmonton";
  const scheduleDays = normalizeScheduleDays(program.schedule_days);

  const nextSessionLabel = getNextClassSessionLabel(
    scheduleDays,
    program.schedule_start_time,
    program.schedule_end_time,
    timeZone
  );

  const weeklyScheduleText =
    scheduleDays.length > 0
      ? `${formatWeekdayList(scheduleDays)} · ${formatTimeRange(
          program.schedule_start_time,
          program.schedule_end_time,
          timeZone
        )}`
      : "Schedule not set yet";

  const upcomingDates = useMemo(
    () => getUpcomingClassDates(scheduleDays, 3, timeZone),
    [scheduleDays, timeZone]
  );

  const highlightedDateKeys = useMemo(
    () => new Set(upcomingDates.slice(0, 2).map((date) => toDateKey(date))),
    [upcomingDates]
  );

  const todayKey = toDateKey(new Date());
  const { monthLabel, cells } = useMemo(
    () => buildCalendarDaysForCurrentMonth(timeZone),
    [timeZone]
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <Link
        href={`/m/${slug}/classes/${program.id}`}
        className="block rounded-t-2xl p-4 transition hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
      >
        <article className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold">{program.title}</h3>

            {program.description ? (
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {program.description}
              </p>
            ) : null}
          </div>

          <span className="text-gray-400">›</span>
        </article>
      </Link>

      <button
  type="button"
  onClick={() => setIsOpen((open) => !open)}
  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] font-medium text-gray-800"
  style={{ backgroundColor: "var(--secondary-color)" }}
>
        <span className="min-w-0 truncate px-2 pr-2 text-[15px]">
  {nextSessionLabel ? `Next: ${nextSessionLabel}` : "Class details"}
</span>

<span className="shrink-0 text-[10px] opacity-70">
  {isOpen ? "▲" : "▼"}
</span>
      </button>

      {isOpen ? (
        <div
          className="rounded-b-2xl border-t border-gray-200 px-4 py-3"
          style={{
            backgroundColor: "color-mix(in srgb, var(--primary-color) 4%, white 96%)",
          }}
        >
          <section>
            <h4 className="text-xs font-semibold text-gray-900">Schedule</h4>
            <p className="mt-1 text-xs text-gray-600">{weeklyScheduleText}</p>

            <div className="mt-3 rounded-xl border border-gray-200 bg-white p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h5 className="text-xs font-medium text-gray-900">{monthLabel}</h5>

                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-400" />
                    <span>Today</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Upcoming</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-500">
                {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
                  <div key={`${label}-${index}`} className="py-0.5">
                    {label}
                  </div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {cells.map((cell, index) => {
                  if (cell.type === "empty") {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="aspect-square rounded-lg"
                      />
                    );
                  }

                  const cellDateKey = toDateKey(cell.date);
                  const isToday = cellDateKey === todayKey;
                  const isUpcomingClass = highlightedDateKeys.has(cellDateKey);
                  const isTodayAndUpcoming = isToday && isUpcomingClass;

                  let cellClassName =
                    "flex aspect-square items-center justify-center rounded-lg text-[11px] font-medium";

                  let cellStyle: React.CSSProperties | undefined;

                  if (isTodayAndUpcoming) {
                    cellClassName += " text-white";
                    cellStyle = {
                      background:
                        "linear-gradient(135deg, #facc15 0%, #facc15 50%, #22c55e 50%, #22c55e 100%)",
                    };
                  } else if (isUpcomingClass) {
                    cellClassName += " bg-green-500 text-white";
                  } else if (isToday) {
                    cellClassName += " text-gray-900";
                    cellStyle = {
                      backgroundColor: "#facc15",
                    };
                  } else {
                    cellClassName += " text-gray-700";
                  }

                  return (
                    <div key={cellDateKey} className={cellClassName} style={cellStyle}>
                      {cell.date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mt-3">
            <h4 className="text-xs font-semibold text-gray-900">
              Latest Announcement
            </h4>

            {latestAnnouncement ? (
              <article className="mt-2 rounded-xl border border-gray-200 bg-white p-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                    <img
                      src={latestAnnouncement.author_avatar_src}
                      alt={latestAnnouncement.author_name || "Teacher"}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-xs font-medium text-gray-900">
                        {latestAnnouncement.author_name || "Teacher"}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {formatAnnouncementDate(latestAnnouncement.created_at)}
                      </p>
                    </div>

                    <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-gray-700">
                      {latestAnnouncement.message}
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              <p className="mt-2 text-xs text-gray-600">
                No announcements have been posted for this class yet.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}