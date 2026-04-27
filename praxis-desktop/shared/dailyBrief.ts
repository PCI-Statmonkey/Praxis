import type { WorkEntityKind, WorkPriority, WorkStatus } from "./workModel";

export type DailyBriefEntityKind = WorkEntityKind | "appointment";

export type DailyBriefItem = {
  id: string;
  entityKind: DailyBriefEntityKind;
  title: string;
  reason: string;
  dueAt: string | null;
  priority: WorkPriority;
  status: WorkStatus;
  rank: number;
  waitingOnPersonName?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  allDay?: boolean;
  sourceSystem?: string | null;
  notes?: string | null;
};

export type DailyBriefRecommendedMove = {
  item: DailyBriefItem | null;
  directive: string;
  rationale: string;
  actionHint: string;
};

export type DailyBriefCloseoutSummary = {
  changedTodayCount: number;
  completedTodayCount: number;
  waitingOnCount: number;
  overdueCount: number;
  dueTodayCount: number;
  moveTomorrowCandidates: string[];
  summary: string;
};

export type DailyBrief = {
  generatedAt: string;
  localDate: string;
  greeting: string;
  spokenBrief: string;
  recommendedMove: DailyBriefRecommendedMove;
  closeout: DailyBriefCloseoutSummary;
  priorityItems: DailyBriefItem[];
  appointments: DailyBriefItem[];
  deadlines: DailyBriefItem[];
  todos: DailyBriefItem[];
  moneyItems: DailyBriefItem[];
  emailFollowUpCount: number;
  followUpTopics: string[];
  thereIsMore: boolean;
  markdownPath: string;
};

export type FocusReportKind = "mission" | "project";

export type FocusReportPerson = {
  personId: string;
  name: string;
  relationship: string;
};

export type FocusReport = {
  entityKind: FocusReportKind;
  entityId: string;
  title: string;
  summary: string;
  status: string;
  dueAt: string | null;
  activeProjectCount: number;
  activeTodoCount: number;
  upcomingDeadlineCount: number;
  people: FocusReportPerson[];
  topItems: DailyBriefItem[];
  detailItems: DailyBriefItem[];
  markdownPath: string | null;
};
