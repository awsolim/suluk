export type ProgramScheduleDay =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type ProgramScheduleSlot = {
  day: ProgramScheduleDay;
  start: string;
  end: string;
};

export type UpcomingScheduleSession = {
  date: Date;
  slot: ProgramScheduleSlot;
};

const DAY_ORDER: ProgramScheduleDay[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_LABELS_SHORT: Record<ProgramScheduleDay, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

const WEEKDAY_INDEX_BY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parseTimeParts(timeValue: string) {
  const [hours, minutes] = timeValue.split(":").map(Number);

  return {
    hours,
    minutes,
  };
}

function parseTimeToMinutes(timeValue: string | null) {
  if (!timeValue) {
    return null;
  }

  const { hours, minutes } = parseTimeParts(timeValue);
  return hours * 60 + minutes;
}

function getZonedNowParts(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = Number(getPart("year"));
  const month = Number(getPart("month"));
  const day = Number(getPart("day"));
  const weekdayShort = getPart("weekday");
  const hour = Number(getPart("hour"));
  const minute = Number(getPart("minute"));

  return {
    year,
    month,
    day,
    weekdayIndex: WEEKDAY_INDEX_BY_SHORT[weekdayShort] ?? 0,
    minutesOfDay: hour * 60 + minute,
  };
}

function isValidDay(day: string): day is ProgramScheduleDay {
  return DAY_ORDER.includes(day as ProgramScheduleDay);
}

function isValidTimeValue(timeValue: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(timeValue);
}

export function normalizeProgramSchedule(value: unknown): ProgramScheduleSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const safeSlots: ProgramScheduleSlot[] = [];

  for (const item of value) {
    const day = String((item as { day?: unknown })?.day ?? "")
      .trim()
      .toLowerCase();
    const start = String((item as { start?: unknown })?.start ?? "").trim();
    const end = String((item as { end?: unknown })?.end ?? "").trim();

    if (!isValidDay(day) || !isValidTimeValue(start) || !isValidTimeValue(end)) {
      continue;
    }

    safeSlots.push({ day, start, end });
  }

  return safeSlots.sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );
}

export function formatWeekdayLabel(day: ProgramScheduleDay) {
  return DAY_LABELS_SHORT[day];
}
export function formatTimeRange(
  startTime: string | null,
  endTime: string | null,
  timeZone: string
) {
  if (!startTime || !endTime) {
    return "Time not set";
  }

  const formatOneTime = (timeValue: string) => {
    const { hours, minutes } = parseTimeParts(timeValue);
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

export function formatSingleTime(timeValue: string | null, timeZone: string) {
  if (!timeValue) {
    return "Time not set";
  }

  const { hours, minutes } = parseTimeParts(timeValue);
  const date = new Date(Date.UTC(2000, 0, 1, hours, minutes));

  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(date);
}

export function formatProgramScheduleSummary(
  schedule: ProgramScheduleSlot[],
  timeZone: string
) {
  if (schedule.length === 0) {
    return "Schedule not set yet";
  }

  return schedule
    .map(
      (slot) =>
        `${formatWeekdayLabel(slot.day)} ${formatTimeRange(
          slot.start,
          slot.end,
          timeZone
        )}`
    )
    .join(" · ");
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getUpcomingScheduleSessions(
  schedule: ProgramScheduleSlot[],
  count: number,
  timeZone: string
): UpcomingScheduleSession[] {
  if (schedule.length === 0) {
    return [];
  }

  const zonedNow = getZonedNowParts(timeZone);
  const baseDate = new Date(zonedNow.year, zonedNow.month - 1, zonedNow.day);
  const upcomingSessions: UpcomingScheduleSession[] = [];

  for (let offset = 0; offset < 60 && upcomingSessions.length < count; offset += 1) {
    const candidateDate = new Date(baseDate);
    candidateDate.setDate(baseDate.getDate() + offset);

    const weekdayIndex = offset === 0 ? zonedNow.weekdayIndex : candidateDate.getDay();

    const matchingSlots = schedule.filter(
      (slot) =>
        DAY_ORDER.indexOf(slot.day as (typeof DAY_ORDER)[number]) === weekdayIndex
    );

    for (const slot of matchingSlots) {
      const slotEndMinutes = parseTimeToMinutes(slot.end);

      if (
        offset === 0 &&
        slotEndMinutes !== null &&
        zonedNow.minutesOfDay >= slotEndMinutes
      ) {
        continue;
      }

      upcomingSessions.push({
        date: candidateDate,
        slot,
      });

      if (upcomingSessions.length >= count) {
        break;
      }
    }
  }

  return upcomingSessions;
}

export function buildCalendarDaysForCurrentMonth(timeZone: string) {
  const zonedNow = getZonedNowParts(timeZone);
  const firstOfMonth = new Date(zonedNow.year, zonedNow.month - 1, 1);
  const lastOfMonth = new Date(zonedNow.year, zonedNow.month, 0);

  const leadingEmptyCells = firstOfMonth.getDay();
  const totalDays = lastOfMonth.getDate();

  const cells: Array<{ type: "empty" } | { type: "day"; date: Date }> = [];

  for (let i = 0; i < leadingEmptyCells; i += 1) {
    cells.push({ type: "empty" });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({
      type: "day",
      date: new Date(zonedNow.year, zonedNow.month - 1, day),
    });
  }

  return {
    monthLabel: new Intl.DateTimeFormat("en-CA", {
      month: "long",
      year: "numeric",
    }).format(firstOfMonth),
    cells,
  };
}

export function formatUpcomingScheduleLine(
  session: UpcomingScheduleSession,
  timeZone: string
) {
  const dateLabel = new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(session.date);

  return `${dateLabel} · ${formatTimeRange(
    session.slot.start,
    session.slot.end,
    timeZone
  )}`;
}

export function getNextScheduleSessionLabel(
  schedule: ProgramScheduleSlot[],
  timeZone: string
) {
  const nextSession = getUpcomingScheduleSessions(schedule, 1, timeZone)[0];

  if (!nextSession) {
    return null;
  }

  const zonedNow = getZonedNowParts(timeZone);
  const today = new Date(zonedNow.year, zonedNow.month - 1, zonedNow.day);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const sessionDateKey = toDateKey(nextSession.date);
  const todayKey = toDateKey(today);
  const tomorrowKey = toDateKey(tomorrow);
  const sessionTimeLabel = formatSingleTime(nextSession.slot.start, timeZone);

  if (sessionDateKey === todayKey) {
    return `Today @ ${sessionTimeLabel}`;
  }

  if (sessionDateKey === tomorrowKey) {
    return `Tomorrow @ ${sessionTimeLabel}`;
  }

  const dateLabel = new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
  }).format(nextSession.date);

  return `${dateLabel} @ ${sessionTimeLabel}`;
}