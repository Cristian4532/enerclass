export const LIMA_TZ = "America/Lima";

type Granularity = "minute" | "hour" | "day";

export function limaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LIMA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday")
  };
}

export function limaKey(date: Date, granularity: Granularity = "hour") {
  const { year, month, day, hour, minute } = limaDateParts(date);
  const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (granularity === "day") return ymd;
  if (granularity === "hour") return `${ymd} ${String(hour).padStart(2, "0")}`;
  return `${ymd} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function limaLabel(date: Date, granularity: Granularity = "hour") {
  if (granularity === "day") {
    return new Intl.DateTimeFormat("es-PE", {
      timeZone: LIMA_TZ,
      day: "2-digit",
      month: "short"
    }).format(date);
  }
  if (granularity === "hour") {
    return `${String(limaDateParts(date).hour).padStart(2, "0")}:00`;
  }
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function isSchoolSchedule(date: Date) {
  const { weekday, hour, minute } = limaDateParts(date);
  if (weekday === "Sat" || weekday === "Sun") return false;
  const decimal = hour + minute / 60;
  return decimal >= 7.5 && decimal < 18;
}

export function isNightSchedule(date: Date) {
  return !isSchoolSchedule(date);
}

export function schoolScheduleLabel(date: Date) {
  return isSchoolSchedule(date) ? "Horario lectivo" : "Fuera de horario";
}

export function startOfLimaDay(date: Date) {
  const { year, month, day } = limaDateParts(date);
  // Lima is UTC-5 all year (no DST)
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
}
