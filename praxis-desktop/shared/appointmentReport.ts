export type AppointmentReportRequest = {
  range?: "today" | "tomorrow" | "upcoming";
};

export type AppointmentReportItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  sourceSystem: string;
  notes: string | null;
  reason: string;
};

export type AppointmentReport = {
  generatedAt: string;
  range: "today" | "tomorrow" | "upcoming";
  title: string;
  spokenSummary: string;
  appointments: AppointmentReportItem[];
  thereIsMore: boolean;
};
