const DAY_ORDER = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const DAY_LABELS_SHORT: Record<string, string> = {
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

export function normalizeScheduleDays(days: unknown) {
  if (!Array.isArray(days)) {
    return [];
  }

  return days
    .map((day) => String(day).toLowerCase().trim())
    .filter((day): day is (typeof DAY_ORDER)[number] => DAY_ORDER.includes(day as (typeof DAY_ORDER)[number]));
}

export function formatWeekdayList(days: string[]) {
  const normalizedDays = DAY_ORDER.filter((day) => days.includes(day));
  return normalizedDays.map((day) => DAY_LABELS_SHORT[day]).join("/");
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

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getUpcomingClassDates(
  scheduleDays: string[],
  count: number,
  timeZone: string
) {
  const validDayIndexes = new Set(
    scheduleDays
      .map((day) => DAY_ORDER.indexOf(day as (typeof DAY_ORDER)[number]))
      .filter((index) => index >= 0)
  );

  if (validDayIndexes.size === 0) {
    return [];
  }

  const zonedNow = getZonedNowParts(timeZone);
  const baseDate = new Date(zonedNow.year, zonedNow.month - 1, zonedNow.day);
  const upcomingDates: Date[] = [];

  for (let offset = 0; offset < 60 && upcomingDates.length < count; offset += 1) {
    const candidate = new Date(baseDate);
    candidate.setDate(baseDate.getDate() + offset);

    const candidateWeekday =
      offset === 0 ? zonedNow.weekdayIndex : candidate.getDay();

    if (validDayIndexes.has(candidateWeekday)) {
      upcomingDates.push(candidate);
    }
  }

  return upcomingDates;
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
    cells.push({ type: "day", date: new Date(zonedNow.year, zonedNow.month - 1, day) });
  }

  return {
    monthLabel: new Intl.DateTimeFormat("en-CA", {
      month: "long",
      year: "numeric",
    }).format(firstOfMonth),
    cells,
  };
}

export function formatUpcomingClassLine(
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

export function getNextClassSessionLabel(
  scheduleDays: string[],
  startTime: string | null,
  endTime: string | null,
  timeZone: string
) {
  if (!startTime) {
    return null;
  }

  const validDayIndexes = new Set(
    scheduleDays
      .map((day) => DAY_ORDER.indexOf(day as (typeof DAY_ORDER)[number]))
      .filter((index) => index >= 0)
  );

  if (validDayIndexes.size === 0) {
    return null;
  }

  const zonedNow = getZonedNowParts(timeZone);
  const endMinutes = parseTimeToMinutes(endTime);
  const baseDate = new Date(zonedNow.year, zonedNow.month - 1, zonedNow.day);

  for (let offset = 0; offset < 14; offset += 1) {
    const weekdayIndex = (zonedNow.weekdayIndex + offset) % 7;

    if (!validDayIndexes.has(weekdayIndex)) {
      continue;
    }

    if (
      offset === 0 &&
      endMinutes !== null &&
      zonedNow.minutesOfDay >= endMinutes
    ) {
      continue;
    }

    const sessionDate = new Date(baseDate);
    sessionDate.setDate(baseDate.getDate() + offset);

    const sessionTimeLabel = formatSingleTime(startTime, timeZone);

    if (offset === 0) {
      return `Today @ ${sessionTimeLabel}`;
    }

    if (offset === 1) {
      return `Tomorrow @ ${sessionTimeLabel}`;
    }

    const dateLabel = new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "numeric",
    }).format(sessionDate);

    return `${dateLabel} @ ${sessionTimeLabel}`;
  }

  return null;
}