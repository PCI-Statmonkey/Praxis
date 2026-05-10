/// <reference types="vite-plugin-electron/electron-env" />

import type { ChecklistEvent } from "../shared/persistence/checklistEvents";
import type { MasterChecklistState } from "../shared/persistence/masterChecklistTypes";
import type { MemoryReindexReport, StorageOverview } from "../shared/storage/hybridStorage";
import type { PraxisSkillRegistrySnapshot } from "../shared/skillRegistry";
import type { CompanionSnapshot } from "../shared/companionSnapshot";
import type {
  CompanionCommandRequest,
  CompanionCommandResult,
} from "../shared/companionCommand";
import type { CalendarImportResult, ImportCalendarEventsInput } from "../shared/calendarImport";
import type {
  CalendarOAuthReadiness,
  GoogleOAuthUpdate,
  OutlookOAuthUpdate,
  StartCalendarOAuthInput,
  StartCalendarOAuthResult,
} from "../shared/calendarOAuth";
import type {
  CalendarAutoSyncRequest,
  CalendarAutoSyncUpdate,
} from "../shared/calendarAutoSync";
import type {
  AppointmentReport,
  AppointmentReportRequest,
} from "../shared/appointmentReport";
import type {
  SyncGoogleCalendarInput,
  SyncGoogleCalendarResult,
} from "../shared/googleCalendarSync";
import type {
  SyncOutlookCalendarInput,
  SyncOutlookCalendarResult,
} from "../shared/outlookCalendarSync";
import type {
  SlackAdapterStatus,
  SlackConnectionTestResult,
  SlackRestartResult,
  SlackTestSuggestionResult,
} from "../shared/slackAdapter";
import type { FocusReport } from "../shared/dailyBrief";
import type {
  DismissPersonContactSuggestionInput,
  DismissPersonContactSuggestionResult,
  RestorePersonContactSuggestionInput,
  RestorePersonContactSuggestionResult,
} from "../shared/personContactSuggestion";
import type {
  AcceptEmailSuggestionInput,
  AcceptEmailSuggestionResult,
  ArchiveEmailSuggestionInput,
  ArchiveEmailSuggestionResult,
  DeleteEmailConnectionInput,
  DismissEmailSuggestionInput,
  DismissEmailSuggestionResult,
  EmailConnectionRecord,
  EmailSnapshot,
  ImportEmailMessagesInput,
  ImportEmailMessagesResult,
} from "../shared/emailModel";
import type {
  EmailAutoSyncUpdate,
} from "../shared/emailAutoSync";
import type {
  EmailOAuthReadiness,
  GmailOAuthUpdate,
  OutlookEmailOAuthUpdate,
  StartEmailOAuthInput,
  StartEmailOAuthResult,
} from "../shared/emailOAuth";
import type {
  SyncGmailEmailInput,
  SyncGmailEmailResult,
} from "../shared/gmailEmailSync";
import type {
  SyncOutlookEmailInput,
  SyncOutlookEmailResult,
} from "../shared/outlookEmailSync";
import type {
  AcceptChatSuggestionInput,
  AcceptChatSuggestionResult,
  ArchiveChatSuggestionInput,
  ArchiveChatSuggestionResult,
  ChatImportSnapshot,
  DismissChatSuggestionInput,
  DismissChatSuggestionResult,
  ImportChatConversationInput,
  ImportChatConversationResult,
} from "../shared/chatImport";
import type {
  ClearProjectTemplateProposalStateInput,
  ClearProjectTemplateProposalStateResult,
  ProjectTemplateApplyConfirmInput,
  ProjectTemplateApplyConfirmResult,
  ProjectTemplateApplyPreview,
  ProjectTemplateManagementSnapshot,
  ProjectTemplateProposalActionInput,
  ProjectTemplateProposalActionResult,
  ProjectTemplateProposalSaveInput,
  ProjectTemplateProposalSaveResult,
  ProjectTemplateProposalShownInput,
  ProjectTemplateProposalShownResult,
  ProjectTemplateProposalSnapshot,
} from "../shared/projectTemplateProposals";
import type {
  CalendarConnectionRecord,
  CheckOllamaModelAvailabilityInput,
  CreateCalendarConnectionInput,
  DeleteCalendarConnectionInput,
  CreateEmailConnectionInput,
  OllamaModelAvailabilityResult,
  SettingsSnapshot,
  UpdateAiSettingsInput,
  UpdateUiSettingsInput,
  UpdateCalendarAutoSyncSettingsInput,
  UpdateCalendarConnectionInput,
  UpdateEmailConnectionInput,
  UpdateGoogleOAuthSettingsInput,
  UpdateOutlookOAuthSettingsInput,
  UpdateSlackSettingsInput,
  UiSettings,
} from "../shared/settingsModel";
import type {
  AssistantAIReviewGenerateRequest,
  AssistantAIReviewGenerateResult,
  AssistantRouteRequest,
  AssistantRouteResult,
} from "../shared/assistantRouter";
import type {
  ResolveAssistantContextInput,
  ResolveAssistantContextResult,
  StoreAssistantContextInput,
} from "../shared/assistantContext";
import type { PersonLookupRequest, PersonLookupResult } from "../shared/personLookup";
import type { WorkLookupRequest, WorkLookupResult } from "../shared/workLookup";
import type { DailyBrief } from "../shared/dailyBrief";
import type {
  CaptureRequest,
  CaptureResult,
  SaveCaptureCandidateRequest,
} from "../shared/naturalLanguageCapture";
import type {
  AppointmentRecord,
  CreateAppointmentInput,
  CreateDeadlineInput,
  CreatePersonWorkLinkInput,
  DeletePersonWorkLinkInput,
  DeleteWorkRecordInput,
  CreateMissionInput,
  CreatePersonInput,
  CreateProjectInput,
  CreateTodoInput,
  DeadlineRecord,
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
  UpdateWorkRecordInput,
  UpdateWorkStatusInput,
  WorkSnapshot,
} from "../shared/workModel";
import type {
  CreateTimeBlockInput,
  DeleteTimeBlockInput,
  GenerateDraftPlanRequest,
  GenerateDraftPlanResult,
  ListTimeBlocksInput,
  TimeBlockSnapshot,
  UpdateTimeBlockInput,
} from "../shared/timeBlocking";

type SettingsWindowTab =
  | "google"
  | "outlook"
  | "appearance"
  | "ai"
  | "slack"
  | "icsImport"
  | "people"
  | "templates"
  | "storage";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APP_ROOT: string;
      VITE_PUBLIC: string;
    }
  }

  interface Window {
    ipcRenderer: import("electron").IpcRenderer;
    praxis: {
      checklist: {
        loadState: () => Promise<{
          state: MasterChecklistState;
          lastEventIndex: number;
          eventCount: number;
        }>;
        appendEvent: (event: ChecklistEvent) => Promise<{ ok: true }>;
        writeSnapshot: (
          state: MasterChecklistState,
          lastEventIndex: number
        ) => Promise<{ ok: true }>;
      };
      storage: {
        getOverview: () => Promise<StorageOverview>;
        reindexMemory: () => Promise<MemoryReindexReport>;
      };
      skills: {
        getRegistry: () => Promise<PraxisSkillRegistrySnapshot>;
      };
      companion: {
        getSnapshot: () => Promise<CompanionSnapshot>;
        executeCommand: (input: CompanionCommandRequest) => Promise<CompanionCommandResult>;
      };
      slack: {
        getStatus: () => Promise<SlackAdapterStatus>;
        restart: () => Promise<SlackRestartResult>;
        sendConnectionTest: () => Promise<SlackConnectionTestResult>;
        sendTestSuggestion: () => Promise<SlackTestSuggestionResult>;
      };
      settings: {
        getSnapshot: () => Promise<SettingsSnapshot>;
        openWindow: (input?: { tab?: SettingsWindowTab }) => Promise<{ ok: true }>;
        onOpenTab: (callback: (tab: SettingsWindowTab) => void) => () => void;
        onUIUpdated: (callback: (settings: UiSettings) => void) => () => void;
        createCalendarConnection: (
          input: CreateCalendarConnectionInput
        ) => Promise<CalendarConnectionRecord>;
        deleteCalendarConnection: (
          input: DeleteCalendarConnectionInput
        ) => Promise<SettingsSnapshot>;
        updateCalendarConnection: (
          input: UpdateCalendarConnectionInput
        ) => Promise<SettingsSnapshot>;
        createEmailConnection: (
          input: CreateEmailConnectionInput
        ) => Promise<EmailConnectionRecord>;
        deleteEmailConnection: (
          input: DeleteEmailConnectionInput
        ) => Promise<SettingsSnapshot>;
        updateEmailConnection: (
          input: UpdateEmailConnectionInput
        ) => Promise<SettingsSnapshot>;
        updateSlack: (input: UpdateSlackSettingsInput) => Promise<SettingsSnapshot>;
        updateCalendarAutoSync: (
          input: UpdateCalendarAutoSyncSettingsInput
        ) => Promise<SettingsSnapshot>;
        updateAISettings: (input: UpdateAiSettingsInput) => Promise<SettingsSnapshot>;
        updateUISettings: (input: UpdateUiSettingsInput) => Promise<SettingsSnapshot>;
        checkOllamaModelAvailability: (
          input: CheckOllamaModelAvailabilityInput
        ) => Promise<OllamaModelAvailabilityResult>;
        updateGoogleOAuth: (
          input: UpdateGoogleOAuthSettingsInput
        ) => Promise<SettingsSnapshot>;
        updateOutlookOAuth: (
          input: UpdateOutlookOAuthSettingsInput
        ) => Promise<SettingsSnapshot>;
      };
      email: {
        getSnapshot: () => Promise<EmailSnapshot>;
        getGoogleOAuthReadiness: () => Promise<EmailOAuthReadiness>;
        getOutlookOAuthReadiness: () => Promise<EmailOAuthReadiness>;
        prepareGoogleOAuth: (
          input: StartEmailOAuthInput
        ) => Promise<StartEmailOAuthResult>;
        prepareOutlookOAuth: (
          input: StartEmailOAuthInput
        ) => Promise<StartEmailOAuthResult>;
        syncGoogle: (input: SyncGmailEmailInput) => Promise<SyncGmailEmailResult>;
        syncOutlook: (input: SyncOutlookEmailInput) => Promise<SyncOutlookEmailResult>;
        importMessages: (input: ImportEmailMessagesInput) => Promise<ImportEmailMessagesResult>;
        acceptSuggestion: (
          input: AcceptEmailSuggestionInput
        ) => Promise<AcceptEmailSuggestionResult>;
        archiveSuggestion: (
          input: ArchiveEmailSuggestionInput
        ) => Promise<ArchiveEmailSuggestionResult>;
        dismissSuggestion: (
          input: DismissEmailSuggestionInput
        ) => Promise<DismissEmailSuggestionResult>;
        dismissContactSuggestion: (
          input: DismissPersonContactSuggestionInput
        ) => Promise<DismissPersonContactSuggestionResult>;
        restoreContactSuggestion: (
          input: RestorePersonContactSuggestionInput
        ) => Promise<RestorePersonContactSuggestionResult>;
        onGoogleOAuthUpdated: (callback: (update: GmailOAuthUpdate) => void) => () => void;
        onOutlookOAuthUpdated: (
          callback: (update: OutlookEmailOAuthUpdate) => void
        ) => () => void;
        onAutoSyncUpdated: (callback: (update: EmailAutoSyncUpdate) => void) => () => void;
      };
      chat: {
        getSnapshot: () => Promise<ChatImportSnapshot>;
        importConversation: (
          input: ImportChatConversationInput
        ) => Promise<ImportChatConversationResult>;
        acceptSuggestion: (
          input: AcceptChatSuggestionInput
        ) => Promise<AcceptChatSuggestionResult>;
        archiveSuggestion: (
          input: ArchiveChatSuggestionInput
        ) => Promise<ArchiveChatSuggestionResult>;
        dismissSuggestion: (
          input: DismissChatSuggestionInput
        ) => Promise<DismissChatSuggestionResult>;
      };
      projectTemplates: {
        getProposalSnapshot: () => Promise<ProjectTemplateProposalSnapshot>;
        getManagementSnapshot: () => Promise<ProjectTemplateManagementSnapshot>;
        clearProposalState: (
          input: ClearProjectTemplateProposalStateInput
        ) => Promise<ClearProjectTemplateProposalStateResult>;
        recordShown: (
          input: ProjectTemplateProposalShownInput
        ) => Promise<ProjectTemplateProposalShownResult>;
        dismissProposal: (
          input: ProjectTemplateProposalActionInput
        ) => Promise<ProjectTemplateProposalActionResult>;
        snoozeProposal: (
          input: ProjectTemplateProposalActionInput
        ) => Promise<ProjectTemplateProposalActionResult>;
        rejectProposal: (
          input: ProjectTemplateProposalActionInput
        ) => Promise<ProjectTemplateProposalActionResult>;
        neverSuggestProposal: (
          input: ProjectTemplateProposalActionInput
        ) => Promise<ProjectTemplateProposalActionResult>;
        saveProposal: (
          input: ProjectTemplateProposalSaveInput
        ) => Promise<ProjectTemplateProposalSaveResult>;
        previewApply: (input: {
          templateSlug: string;
          projectIds: string[];
        }) => Promise<ProjectTemplateApplyPreview>;
        confirmApply: (
          input: ProjectTemplateApplyConfirmInput
        ) => Promise<ProjectTemplateApplyConfirmResult>;
      };
      calendar: {
        importEvents: (input: ImportCalendarEventsInput) => Promise<CalendarImportResult>;
        getGoogleOAuthReadiness: () => Promise<CalendarOAuthReadiness>;
        getOutlookOAuthReadiness: () => Promise<CalendarOAuthReadiness>;
        prepareGoogleOAuth: (
          input: StartCalendarOAuthInput
        ) => Promise<StartCalendarOAuthResult>;
        prepareOutlookOAuth: (
          input: StartCalendarOAuthInput
        ) => Promise<StartCalendarOAuthResult>;
        syncGoogle: (input: SyncGoogleCalendarInput) => Promise<SyncGoogleCalendarResult>;
        syncOutlook: (input: SyncOutlookCalendarInput) => Promise<SyncOutlookCalendarResult>;
        autoSyncNow: (input?: CalendarAutoSyncRequest) => Promise<CalendarAutoSyncUpdate[]>;
        onGoogleOAuthUpdated: (callback: (update: GoogleOAuthUpdate) => void) => () => void;
        onOutlookOAuthUpdated: (callback: (update: OutlookOAuthUpdate) => void) => () => void;
        onAutoSyncUpdated: (callback: (update: CalendarAutoSyncUpdate) => void) => () => void;
      };
      brief: {
        getDaily: () => Promise<DailyBrief>;
        getAppointmentReport: (input?: AppointmentReportRequest) => Promise<AppointmentReport>;
        getFocusReport: (input: {
          entityKind: "mission" | "project";
          entityId: string;
        }) => Promise<FocusReport | null>;
      };
      assistant: {
        route: (input: AssistantRouteRequest) => Promise<AssistantRouteResult>;
        generateAIReview: (
          input: AssistantAIReviewGenerateRequest
        ) => Promise<AssistantAIReviewGenerateResult>;
        storeContext: (input: StoreAssistantContextInput) => Promise<{ ok: true }>;
        resolveContext: (
          input: ResolveAssistantContextInput
        ) => Promise<ResolveAssistantContextResult>;
        lookupPerson: (input: PersonLookupRequest) => Promise<PersonLookupResult>;
        lookupWork: (input: WorkLookupRequest) => Promise<WorkLookupResult>;
      };
      capture: {
        naturalLanguage: (input: CaptureRequest) => Promise<CaptureResult>;
        saveCandidate: (input: SaveCaptureCandidateRequest) => Promise<CaptureResult>;
      };
      work: {
        getSnapshot: () => Promise<WorkSnapshot>;
        createMission: (input: CreateMissionInput) => Promise<MissionRecord>;
        createPerson: (input: CreatePersonInput) => Promise<PersonRecord>;
        createPersonWorkLink: (input: CreatePersonWorkLinkInput) => Promise<WorkSnapshot>;
        createProject: (input: CreateProjectInput) => Promise<ProjectRecord>;
        createTodo: (input: CreateTodoInput) => Promise<TodoRecord>;
        createAppointment: (input: CreateAppointmentInput) => Promise<AppointmentRecord>;
        createDeadline: (input: CreateDeadlineInput) => Promise<DeadlineRecord>;
        updateStatus: (input: UpdateWorkStatusInput) => Promise<WorkSnapshot>;
        updateRecord: (input: UpdateWorkRecordInput) => Promise<WorkSnapshot>;
        deleteRecord: (input: DeleteWorkRecordInput) => Promise<WorkSnapshot>;
        deletePersonWorkLink: (input: DeletePersonWorkLinkInput) => Promise<WorkSnapshot>;
      };
      timeBlocks: {
        list: (input?: ListTimeBlocksInput) => Promise<TimeBlockSnapshot>;
        create: (input: CreateTimeBlockInput) => Promise<TimeBlockSnapshot>;
        update: (input: UpdateTimeBlockInput) => Promise<TimeBlockSnapshot>;
        delete: (input: DeleteTimeBlockInput) => Promise<TimeBlockSnapshot>;
      };
      plan: {
        generateDraft: (input: GenerateDraftPlanRequest) => Promise<GenerateDraftPlanResult>;
      };
    };
  }
}

export {};
