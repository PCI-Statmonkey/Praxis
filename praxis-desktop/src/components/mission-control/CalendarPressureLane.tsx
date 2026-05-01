import type { AppointmentRecord, DeadlineRecord } from "../../../shared/workModel";
import { EmptyState } from "../EmptyState";

type CalendarPressureLaneProps = {
  upcomingAppointments: AppointmentRecord[];
  upcomingDeadlines: DeadlineRecord[];
  openCapture: () => void;
};

type CalendarPressureItem = {
  id: string;
  title: string;
  at: string;
  meta: string;
  kind: "appointment" | "deadline";
};

const shortTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export function CalendarPressureLane({
  upcomingAppointments,
  upcomingDeadlines,
  openCapture,
}: CalendarPressureLaneProps) {
  const timelineItems: CalendarPressureItem[] = [
    ...upcomingAppointments.slice(0, 4).map((appointment) => ({
      id: `appointment-${appointment.id}`,
      title: appointment.title,
      at: appointment.startsAt,
      meta: appointment.allDay ? "all day" : "appointment",
      kind: "appointment" as const,
    })),
    ...upcomingDeadlines.slice(0, 3).map((deadline) => ({
      id: `deadline-${deadline.id}`,
      title: deadline.title,
      at: deadline.dueAt,
      meta: deadline.priority,
      kind: "deadline" as const,
    })),
  ]
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, 5);

  return (
    <article className="brief-card timeline-card mission-control-lane">
      <h3>Calendar Pressure</h3>
      {timelineItems.length > 0 ? (
        <ol className="timeline-list">
          {timelineItems.map((item) => (
            <li key={item.id} className={`timeline-item is-${item.kind}`}>
              <div>
                <strong>{shortTime(item.at)}</strong>
                <p>{item.title}</p>
              </div>
              <span className={item.kind === "deadline" ? "badge urgent-badge" : "badge"}>
                {item.meta}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title="Timeline clear"
          detail="Upcoming appointments and active deadlines will appear here once they are recorded or synced."
        >
          <button type="button" onClick={openCapture}>
            Capture Appointment
          </button>
        </EmptyState>
      )}
    </article>
  );
}
