import type {
  AppointmentReport,
  AppointmentReportItem,
  AppointmentReportRequest,
} from "../shared/appointmentReport";
import type { AppointmentRecord } from "../shared/workModel";
import { getWorkSnapshot } from "./workRepository";

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const daysUntil = (startsAt: string, now: Date) => {
  const starts = new Date(startsAt);
  if (Number.isNaN(starts.getTime())) {
    return null;
  }

  return Math.floor((startOfLocalDay(starts).getTime() - startOfLocalDay(now).getTime()) / DAY_MS);
};

const minutesUntil = (startsAt: string, now: Date) => {
  const starts = new Date(startsAt);
  if (Number.isNaN(starts.getTime())) {
    return null;
  }
  return Math.round((starts.getTime() - now.getTime()) / (60 * 1000));
};

const formatLocalTime = (value: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const appointmentReason = (appointment: AppointmentRecord, now: Date) => {
  const days = daysUntil(appointment.startsAt, now);
  const minutes = minutesUntil(appointment.startsAt, now);
  const startTime = appointment.allDay ? "all day" : formatLocalTime(appointment.startsAt);
  const endTime = appointment.allDay ? null : formatLocalTime(appointment.endsAt);
  const timeWindow = endTime && startTime ? `${startTime}-${endTime}` : startTime;

  if (days === 0 && appointment.allDay) {
    return "Today, all day";
  }
  if (days === 0 && minutes !== null && minutes >= 0) {
    return `${timeWindow}; starts in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (days === 0) {
    return `${timeWindow}; today`;
  }
  if (days === 1) {
    return `${timeWindow}; tomorrow`;
  }
  return `${timeWindow ?? "scheduled"}; upcoming`;
};

const toReportItem = (appointment: AppointmentRecord, now: Date): AppointmentReportItem => ({
  id: appointment.id,
  title: appointment.title,
  startsAt: appointment.startsAt,
  endsAt: appointment.endsAt,
  allDay: appointment.allDay,
  sourceSystem: appointment.sourceSystem,
  notes: appointment.notes,
  reason: appointmentReason(appointment, now),
});

const rangeTitle: Record<Required<AppointmentReportRequest>["range"], string> = {
  today: "Today's Appointments",
  tomorrow: "Tomorrow's Appointments",
  upcoming: "Upcoming Appointments",
};

const filterForRange = (
  appointment: AppointmentRecord,
  range: Required<AppointmentReportRequest>["range"],
  now: Date
) => {
  const days = daysUntil(appointment.startsAt, now);
  if (days === null) {
    return false;
  }
  if (range === "today") {
    return days === 0;
  }
  if (range === "tomorrow") {
    return days === 1;
  }
  return days >= 0;
};

const upcomingAppointments = (appointments: AppointmentRecord[], now: Date) =>
  appointments
    .filter((appointment) => {
      const days = daysUntil(appointment.startsAt, now);
      return days !== null && days >= 0;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

const inferRange = (request: AppointmentReportRequest | undefined) => request?.range ?? "upcoming";

export const generateAppointmentReport = (
  request?: AppointmentReportRequest
): AppointmentReport => {
  const now = new Date();
  const range = inferRange(request);
  const snapshotAppointments = getWorkSnapshot().appointments;
  const appointments = snapshotAppointments
    .filter((appointment) => filterForRange(appointment, range, now))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const reportItems = appointments.slice(0, 8).map((appointment) => toReportItem(appointment, now));
  const first = reportItems[0];
  const upcoming = upcomingAppointments(snapshotAppointments, now);
  const nextUpcoming = upcoming[0] ? toReportItem(upcoming[0], now) : null;
  const spokenSummary = first
    ? `${rangeTitle[range]}: first up is ${first.title}, ${first.reason}. I found ${appointments.length} appointment${appointments.length === 1 ? "" : "s"}.`
    : nextUpcoming && range !== "upcoming"
      ? `${rangeTitle[range]}: I do not see any appointments in that window. I do see ${upcoming.length} upcoming appointment${upcoming.length === 1 ? "" : "s"}; next up is ${nextUpcoming.title}, ${nextUpcoming.reason}.`
    : `${rangeTitle[range]}: I do not see any appointments in that window.`;

  return {
    generatedAt: now.toISOString(),
    range,
    title: rangeTitle[range],
    spokenSummary,
    appointments: reportItems,
    thereIsMore: appointments.length > reportItems.length,
  };
};
