import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getTeacherProgramByIdInMosque,
  getEnrollmentsForProgramInTeacherView,
  getAnnouncementsForProgram,
  getTeacherAnnouncementAuthorProfile,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { createProgramAnnouncement } from "@/app/actions/announcements";
import SubmitButton from "@/components/ui/SubmitButton";

type TeacherProgramDetailPageProps = {
  params: Promise<{
    slug: string;
    programId: string;
  }>;
  searchParams: Promise<{
    posted?: string;
  }>;
};

const DAY_ORDER = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_LABELS_SHORT: Record<string, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="100" fill="#e5e7eb" />
      <circle cx="100" cy="78" r="34" fill="#9ca3af" />
      <path d="M45 165c10-30 36-46 55-46s45 16 55 46" fill="#9ca3af" />
    </svg>
  `);

function formatWeekdayList(days: string[]) {
  const normalizedDays = DAY_ORDER.filter((day) => days.includes(day));
  return normalizedDays.map((day) => DAY_LABELS_SHORT[day]).join("/");
}

function formatTimeRange(
  startTime: string | null,
  endTime: string | null,
  timeZone: string
) {
  if (!startTime || !endTime) {
    return "Time not set";
  }

  const formatOneTime = (timeValue: string) => {
    const [hours, minutes] = timeValue.split(":").map(Number);
    const date = new Date(Date.UTC(2000, 0, 1, hours, minutes));
    return new Intl.DateTimeFormat("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(date);
  };

  return `${formatOneTime(startTime)} – ${formatOneTime(endTime)}`;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getUpcomingClassDates(scheduleDays: string[], count: number) {
  const validDayIndexes = new Set(
    scheduleDays
      .map((day) => DAY_ORDER.indexOf(day))
      .filter((index) => index >= 0)
  );

  if (validDayIndexes.size === 0) {
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingDates: Date[] = [];

  for (
    let offset = 0;
    offset < 60 && upcomingDates.length < count;
    offset += 1
  ) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);

    if (validDayIndexes.has(candidate.getDay())) {
      upcomingDates.push(candidate);
    }
  }

  return upcomingDates;
}

function buildCalendarDaysForCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();

  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);

  const leadingEmptyCells = firstOfMonth.getDay();
  const totalDays = lastOfMonth.getDate();

  const cells: Array<{ type: "empty" } | { type: "day"; date: Date }> = [];

  for (let i = 0; i < leadingEmptyCells; i += 1) {
    cells.push({ type: "empty" });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ type: "day", date: new Date(year, monthIndex, day) });
  }

  return {
    monthLabel: new Intl.DateTimeFormat("en-CA", {
      month: "long",
      year: "numeric",
    }).format(firstOfMonth),
    cells,
  };
}

function formatUpcomingClassLine(
  date: Date,
  startTime: string | null,
  endTime: string | null,
  timeZone: string
) {
  const dateLabel = new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);

  return `${dateLabel} · ${formatTimeRange(startTime, endTime, timeZone)}`;
}

function formatAnnouncementDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

export default async function TeacherProgramDetailPage({
  params,
  searchParams,
}: TeacherProgramDetailPageProps) {
  const { slug, programId } = await params;
  const { posted } = await searchParams;
  const supabase = await createClient();

  const mosque = await getMosqueBySlug(slug);
  const primaryColor = mosque.primary_color || "#111827";
  const secondaryColor = mosque.secondary_color || "#111827";


  if (!mosque) {
    notFound();
  }

  const profile = await getProfileForCurrentUser();

  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/teacher/programs/${programId}`)}`
    );
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id);

  if (!membership || membership.role !== "teacher") {
    notFound();
  }

  const program = await getTeacherProgramByIdInMosque(
    programId,
    profile.id,
    mosque.id
  );

  if (!program) {
    notFound();
  }

  const enrollments = await getEnrollmentsForProgramInTeacherView(
    program.id,
    profile.id,
    mosque.id
  );

  const announcements = await getAnnouncementsForProgram(program.id);
  const announcementAuthor = await getTeacherAnnouncementAuthorProfile(profile.id);

  const enrolledStudentCount = enrollments.length;

  const scheduleDays = Array.isArray(program.schedule_days)
    ? program.schedule_days
        .map((day: string) => String(day).toLowerCase().trim())
        .filter((day: string) => DAY_ORDER.includes(day))
    : [];

  const timeZone = program.schedule_timezone || "America/Edmonton";
  const weeklyScheduleText =
    scheduleDays.length > 0
      ? `${formatWeekdayList(scheduleDays)} · ${formatTimeRange(
          program.schedule_start_time,
          program.schedule_end_time,
          timeZone
        )}`
      : "Schedule not set yet";

  const upcomingDates = getUpcomingClassDates(scheduleDays, 3);
  const highlightedDateKeys = new Set(
    upcomingDates.slice(0, 2).map((date) => toDateKey(date))
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  const { monthLabel, cells } = buildCalendarDaysForCurrentMonth();

  return (
    <section className="space-y-5">
      <Link
        href={`/m/${slug}/classes`}
        className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium text-white"
        style={{backgroundColor:primaryColor}}
      >
        ← Back to Classes
      </Link>

      <div className="space-y-1">
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{program.title}</h1>
        <p className="text-sm text-gray-600">Teacher view for this class.</p>
      </div>

      <Link
        href={`/m/${slug}/teacher/programs/${program.id}/edit`}
        className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
      >
        <article className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Program Details</h2>

            {program.description ? (
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {program.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No description yet.</p>
            )}

            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p>
                Students:{" "}
                <span className="font-medium text-black">
                  {enrolledStudentCount}
                </span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                program.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {program.is_active ? "Active" : "Inactive"}
            </span>

            <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
              <span>✎</span>
              <span>Edit</span>
            </div>
          </div>
        </article>
      </Link>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold">Schedule</h2>
      
              <p className="mt-3 truncate text-sm text-gray-600">
                Weekly: {weeklyScheduleText}
              </p>
      
              {program.schedule_notes ? (
                <p className="mt-2 text-sm text-gray-600">{program.schedule_notes}</p>
              ) : null}
      
              <div className="mt-4 rounded-2xl border border-gray-200 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">{monthLabel}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                      <span>Today</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                      <span>Upcoming class</span>
                    </div>
                  </div>
                </div>
      
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
                  {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
                    <div key={`${label}-${index}`} className="py-1">
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
                          className="aspect-square rounded-xl"
                        />
                      );
                    }
      
                    const cellDateKey = toDateKey(cell.date);
                    const isToday = cellDateKey === todayKey;
                    const isUpcomingClass = highlightedDateKeys.has(cellDateKey);
                    const isTodayAndUpcoming = isToday && isUpcomingClass;
      
                    let cellClassName =
                      "flex aspect-square items-center justify-center rounded-xl text-sm font-medium";
      
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
      
              {upcomingDates.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    Upcoming Classes
                  </h3>
      
                  <div className="space-y-2">
                    {upcomingDates.map((date) => (
                      <div
                        key={toDateKey(date)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        {formatUpcomingClassLine(
                          date,
                          program.schedule_start_time,
                          program.schedule_end_time,
                          timeZone
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  Schedule information has not been fully set yet.
                </p>
              )}
            </section>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Announcements</h2>
          <p className="mt-1 text-sm text-gray-600">
            Post updates for everyone enrolled in this class.
          </p>
        </div>

        {posted === "1" ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 shadow-sm">
            Announcement posted successfully.
          </div>
        ) : null}

        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-base font-semibold">Previous Announcements</h3>
          </div>

          {announcements.length === 0 ? (
            <p className="text-sm text-gray-600">
              No announcements have been posted for this class yet.
            </p>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {announcements.map((announcement) => {
                const author = Array.isArray(announcement.profiles)
                  ? announcement.profiles[0]
                  : announcement.profiles;

                const authorAvatarSrc = author?.avatar_url
                  ? supabase.storage
                      .from("media")
                      .getPublicUrl(author.avatar_url).data.publicUrl
                  : DEFAULT_AVATAR;

                return (
                  <article
                    key={announcement.id}
                    className="rounded-2xl border border-gray-200 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                        <img
                          src={authorAvatarSrc}
                          alt={author?.full_name || "Teacher"}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-sm font-medium text-gray-900">
                            {author?.full_name || "Teacher"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatAnnouncementDate(announcement.created_at)}
                          </p>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                          {announcement.message}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <form action={createProgramAnnouncement} className="space-y-3">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="programId" value={program.id} />

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                <img
                  src={
                    announcementAuthor?.avatar_url
                      ? supabase.storage
                          .from("media")
                          .getPublicUrl(announcementAuthor.avatar_url).data
                          .publicUrl
                      : DEFAULT_AVATAR
                  }
                  alt={announcementAuthor?.full_name || "Teacher"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {announcementAuthor?.full_name || "Teacher"}
                </p>
                <p className="text-xs text-gray-500">New class announcement</p>
              </div>
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-medium"
              >
                New Announcement
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-black"
                placeholder="Type your class update here..."
              />
            </div>

            <SubmitButton pendingText="Posting...">Post Announcement</SubmitButton>
          </form>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Enrolled Students</h2>
          <p className="mt-1 text-sm text-gray-600">
            Students currently registered in this class.
          </p>
        </div>

        {enrollments.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-600">
              No students are enrolled in this class yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {enrollments.map((enrollment) => {
              const student = Array.isArray(enrollment.profiles)
                ? enrollment.profiles[0]
                : enrollment.profiles;

              const studentName =
                student?.full_name?.trim() ||
                `Student ${enrollment.student_profile_id.slice(0, 8)}`;

              return (
                <article
                  key={enrollment.id}
                  className="flex flex-col items-center text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                    👤
                  </div>

                  <h3 className="mt-2 text-sm font-medium leading-tight text-gray-900">
                    {studentName}
                  </h3>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}