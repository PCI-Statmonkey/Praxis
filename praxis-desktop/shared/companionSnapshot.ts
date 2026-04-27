import type { EmailAuthStatus, EmailProvider, EmailSyncStatus } from "./emailModel";
import type {
  CalendarAuthStatus,
  CalendarProvider,
  CalendarSyncStatus,
} from "./settingsModel";
import type { WorkPriority, WorkStatus } from "./workModel";

export type CompanionSnapshotVersion = 1;

export type CompanionSnapshotCapability = {
  readOnly: true;
  commandsAccepted: boolean;
  explicitCommandOnly: true;
  directStorageAccess: false;
  notes: string;
};

export type CompanionSnapshotWorkSummary = {
  activeMissionCount: number;
  activeProjectCount: number;
  activeTodoCount: number;
  activeDeadlineCount: number;
  waitingOnCount: number;
  blockedCount: number;
  pausedCount: number;
  moneyRelatedCount: number;
  quickActionCount: number;
};

export type CompanionSnapshotWorkItem = {
  id: string;
  entityKind: "mission" | "project" | "todo" | "deadline";
  title: string;
  status: WorkStatus;
  priority: WorkPriority;
  dueAt: string | null;
  reason: string;
  rank: number;
  projectId?: string | null;
  missionId?: string | null;
  waitingOnPersonName?: string | null;
  moneyRelated?: boolean;
  quickAction?: boolean;
};

export type CompanionSnapshotAppointment = {
  id: string;
  entityKind: "appointment";
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  sourceSystem: string;
};

export type CompanionSnapshotFocusTarget = {
  id: string;
  entityKind: "mission" | "project";
  title: string;
  status: WorkStatus;
  dueAt: string | null;
  activeChildCount: number;
  markdownPath: string | null;
};

export type CompanionSnapshotPerson = {
  id: string;
  name: string;
  roleSummary: string | null;
  emailAvailable: boolean;
  phoneAvailable: boolean;
  billingAddressAvailable: boolean;
  activeRelationshipCount: number;
};

export type CompanionSnapshotEmailFollowUp = {
  id: string;
  title: string;
  suggestedEntityKind: "todo" | "project";
  reason: string;
  dueAt: string | null;
  receivedAt: string;
  sourceSystem: string;
  matchedPersonName: string | null;
};

export type CompanionSnapshotIntegrationStatus =
  | {
      kind: "calendar";
      id: string;
      provider: CalendarProvider;
      label: string;
      enabled: boolean;
      authStatus: CalendarAuthStatus;
      syncStatus: CalendarSyncStatus;
      lastSyncedAt: string | null;
    }
  | {
      kind: "email";
      id: string;
      provider: EmailProvider;
      label: string;
      enabled: boolean;
      authStatus: EmailAuthStatus;
      syncStatus: EmailSyncStatus;
      lastSyncedAt: string | null;
    };

export type CompanionSnapshot = {
  schemaVersion: "companion.snapshot.v1";
  version: CompanionSnapshotVersion;
  generatedAt: string;
  localDate: string;
  source: "praxis-home-node";
  capability: CompanionSnapshotCapability;
  summary: CompanionSnapshotWorkSummary;
  topMove: CompanionSnapshotWorkItem | CompanionSnapshotAppointment | null;
  today: {
    appointments: CompanionSnapshotAppointment[];
    workItems: CompanionSnapshotWorkItem[];
  };
  focusTargets: CompanionSnapshotFocusTarget[];
  people: {
    totalCount: number;
    highlighted: CompanionSnapshotPerson[];
  };
  inbox: {
    pendingEmailFollowUpCount: number;
    latestEmailFollowUps: CompanionSnapshotEmailFollowUp[];
  };
  integrations: CompanionSnapshotIntegrationStatus[];
};
