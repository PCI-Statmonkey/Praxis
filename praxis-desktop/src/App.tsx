import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import "./App.css";
import type {
  ChatImportSnapshot,
  ChatImportSourceSystem,
  ImportChatConversationInput,
} from "../shared/chatImport";
import type { DailyBrief, FocusReport } from "../shared/dailyBrief";
import type { EmailSnapshot } from "../shared/emailModel";
import {
  DEFAULT_UI_SETTINGS,
  formatPraxisTime,
  uiFontScaleCssValue,
  type UiTimeFormat,
} from "../shared/settingsModel";
import type {
  ProjectTemplateProposalActionInput,
  ProjectTemplateProposalSaveInput,
  ProjectTemplateProposalSnapshot,
} from "../shared/projectTemplateProposals";
import type {
  TimeBlockPublishConfirmRequest,
  TimeBlockPublishPreviewRequest,
} from "../shared/calendarWriteback";
import {
  buildPlanningDayView,
  buildScheduleReview,
  type CreateTimeBlockInput,
  type GenerateDraftPlanRequest,
  type TimeBlockRecord,
  type UpdateTimeBlockInput,
} from "../shared/timeBlocking";
import {
  buildBestProactiveSuggestion,
  type ProactiveSuggestion,
} from "../shared/proactiveSuggestion";
import {
  EMPTY_SERVICE_SNAPSHOT,
  selectDashboardReadiness,
  selectReviewInboxItems,
  selectServiceHealthItems,
  selectUpcomingAppointments,
  selectUpcomingDeadlines,
  type DashboardServiceSnapshot,
} from "./dashboardSelectors";
import { ActionMenu } from "./components/ActionMenu";
import { MasterChecklistPanel } from "./components/MasterChecklistPanel";
import { MemoryWriterPanel } from "./components/MemoryWriterPanel";
import { PlanSurfacePanel } from "./components/PlanSurfacePanel";
import { ProjectStackPanel } from "./components/ProjectStackPanel";
import { TodayTimelinePanel } from "./components/TodayTimelinePanel";
import {
  storeProactiveSuggestionContext,
  storeReportContext,
  useAssistantCapture,
} from "./hooks/useAssistantCapture";
import type {
  CreateAppointmentInput,
  CreateDeadlineInput,
  CreateMissionInput,
  CreatePersonInput,
  CreateProjectInput,
  CreateTodoInput,
  AppointmentRecord,
  DeadlineRecord,
  EditableWorkEntityKind,
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
  WorkStatus,
  WorkSnapshot,
} from "../shared/workModel";

type FocusPanelId = "projectStack" | "todayTimeline" | "morningPlan" | "masterChecklist";
type PanelId = "command" | "plan" | FocusPanelId;

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

type ManualChatImportForm = {
  sourceSystem: ChatImportSourceSystem;
  conversationTitle: string;
  participants: string;
  snippet: string;
};

const EMPTY_SNAPSHOT: WorkSnapshot = {
  missions: [],
  projects: [],
  todos: [],
  deadlines: [],
  appointments: [],
  people: [],
  personWorkLinks: [],
  memoryDocuments: [],
};

const EMPTY_BRIEF: DailyBrief = {
  generatedAt: "",
  localDate: "",
  greeting: "Good day",
  spokenBrief: "Daily brief unavailable.",
  recommendedMove: {
    item: null,
    directive: "Capture one mission, project, todo, or deadline.",
    rationale: "Praxis does not have active work recorded yet.",
    actionHint: "Add a work item in Talk to Praxis.",
  },
  closeout: {
    changedTodayCount: 0,
    completedTodayCount: 0,
    waitingOnCount: 0,
    overdueCount: 0,
    dueTodayCount: 0,
    moveTomorrowCandidates: [],
    summary: "No closeout summary available.",
  },
  priorityItems: [],
  appointments: [],
  deadlines: [],
  todos: [],
  moneyItems: [],
  emailFollowUpCount: 0,
  followUpTopics: [],
  thereIsMore: false,
  markdownPath: "",
};

const EMPTY_EMAIL_SNAPSHOT: EmailSnapshot = {
  connections: [],
  messages: [],
  suggestions: [],
  contactSuggestionDismissals: [],
};

const EMPTY_CHAT_SNAPSHOT: ChatImportSnapshot = {
  imports: [],
  recentMessages: [],
  suggestions: [],
};

const EMPTY_PROJECT_TEMPLATE_PROPOSAL_SNAPSHOT: ProjectTemplateProposalSnapshot = {
  proposals: [],
};

const emptyManualChatImportForm = (): ManualChatImportForm => ({
  sourceSystem: "whatsapp",
  conversationTitle: "",
  participants: "",
  snippet: "",
});

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const formatPlanDateLabel = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const addDaysToLocalDate = (value: string, days: number) => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) {
    return value;
  }

  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]) + days);
  return formatLocalDate(date);
};

const planningDateRange = (targetDate: string) => ({
  startsAt: `${targetDate}T00:00:00`,
  endsAt: `${addDaysToLocalDate(targetDate, 1)}T00:00:00`,
});

const emptyMissionForm = (): CreateMissionInput => ({
  title: "",
  summary: "",
  dueAt: "",
});

const emptyProjectForm = (): CreateProjectInput => ({
  title: "",
  summary: "",
  missionId: "",
  dueAt: "",
  taskTemplateId: "none",
});

const emptyTodoForm = (): CreateTodoInput => ({
  title: "",
  projectId: "",
  priority: "normal",
  dueAt: "",
  moneyRelated: false,
  quickAction: false,
  estimatedMinutes: undefined,
  waitingOnPersonId: "",
  notes: "",
});

const emptyDeadlineForm = (): CreateDeadlineInput => ({
  title: "",
  dueAt: "",
  entityKind: "standalone",
  entityId: "",
  priority: "normal",
});

const emptyAppointmentForm = (): CreateAppointmentInput => ({
  title: "",
  startsAt: "",
  endsAt: "",
  allDay: false,
  notes: "",
  sourceSystem: "manual",
});

const emptyPersonForm = (): CreatePersonInput => ({
  name: "",
  aliases: [],
  roleSummary: "",
  email: "",
  phone: "",
  billingAddress: "",
  notes: "",
});

export default function App() {
  const todayTimelineRef = useRef<HTMLElement | null>(null);
  const [activePanel, setActivePanel] = useState<PanelId>("command");
  const setFocusedPanel: Dispatch<SetStateAction<FocusPanelId>> = useCallback((nextPanel) => {
    setActivePanel((currentPanel) => {
      const currentFocusedPanel: FocusPanelId =
        currentPanel === "command" || currentPanel === "plan" ? "todayTimeline" : currentPanel;
      return typeof nextPanel === "function" ? nextPanel(currentFocusedPanel) : nextPanel;
    });
  }, []);
  const [snapshot, setSnapshot] = useState<WorkSnapshot>(EMPTY_SNAPSHOT);
  const [dailyBrief, setDailyBrief] = useState<DailyBrief>(EMPTY_BRIEF);
  const [emailSnapshot, setEmailSnapshot] = useState<EmailSnapshot>(EMPTY_EMAIL_SNAPSHOT);
  const [chatSnapshot, setChatSnapshot] = useState<ChatImportSnapshot>(EMPTY_CHAT_SNAPSHOT);
  const [projectTemplateProposalSnapshot, setProjectTemplateProposalSnapshot] =
    useState<ProjectTemplateProposalSnapshot>(EMPTY_PROJECT_TEMPLATE_PROPOSAL_SNAPSHOT);
  const recordedProjectTemplateProposalShows = useRef(new Set<string>());
  const [manualChatImportForm, setManualChatImportForm] = useState<ManualChatImportForm>(() =>
    emptyManualChatImportForm()
  );
  const [chatImportStatus, setChatImportStatus] = useState("");
  const [serviceSnapshot, setServiceSnapshot] =
    useState<DashboardServiceSnapshot>(EMPTY_SERVICE_SNAPSHOT);
  const [uiTimeFormat, setUiTimeFormat] = useState<UiTimeFormat>(
    DEFAULT_UI_SETTINGS.timeFormat
  );
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [proactiveSuggestion, setProactiveSuggestion] = useState<ProactiveSuggestion | null>(null);
  const [focusSelection, setFocusSelection] = useState("");
  const [focusReport, setFocusReport] = useState<FocusReport | null>(null);
  const [showFocusDetails, setShowFocusDetails] = useState(false);
  const [showBriefDetails, setShowBriefDetails] = useState(false);
  const [status, setStatus] = useState("Loading Praxis work model...");
  const [todoFilter, setTodoFilter] = useState<"all" | "quick">("all");
  const [showStatusReport, setShowStatusReport] = useState(true);
  const [editingMission, setEditingMission] = useState<MissionRecord | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<DeadlineRecord | null>(null);
  const [editingTodo, setEditingTodo] = useState<TodoRecord | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRecord | null>(null);
  const [editingPerson, setEditingPerson] = useState<PersonRecord | null>(null);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockRecord[]>([]);
  const [planningDateOverride, setPlanningDateOverride] = useState<string | null>(null);
  const [missionForm, setMissionForm] = useState<CreateMissionInput>(() => emptyMissionForm());
  const [projectForm, setProjectForm] = useState<CreateProjectInput>(() => emptyProjectForm());
  const [todoForm, setTodoForm] = useState<CreateTodoInput>(() => emptyTodoForm());
  const [personForm, setPersonForm] = useState<CreatePersonInput>(() => emptyPersonForm());
  const [deadlineForm, setDeadlineForm] = useState<CreateDeadlineInput>(() => emptyDeadlineForm());
  const [appointmentForm, setAppointmentForm] = useState<CreateAppointmentInput>(() =>
    emptyAppointmentForm()
  );

  const loadWorkModel = useCallback(async () => {
    const [
      nextSnapshot,
      nextBrief,
      nextEmailSnapshot,
      nextChatSnapshot,
      nextProjectTemplateProposalSnapshot,
      nextSettings,
      nextStorage,
      nextSlack,
      nextCompanion,
    ] = await Promise.all([
      window.praxis.work.getSnapshot(),
      window.praxis.brief.getDaily(),
      window.praxis.email.getSnapshot(),
      window.praxis.chat.getSnapshot(),
      window.praxis.projectTemplates.getProposalSnapshot(),
      window.praxis.settings.getSnapshot(),
      window.praxis.storage.getOverview(),
      window.praxis.slack.getStatus(),
      window.praxis.companion.getSnapshot(),
    ]);
    setSnapshot(nextSnapshot);
    setDailyBrief(nextBrief);
    setEmailSnapshot(nextEmailSnapshot);
    setChatSnapshot(nextChatSnapshot);
    setProjectTemplateProposalSnapshot(nextProjectTemplateProposalSnapshot);
    setServiceSnapshot({
      settings: nextSettings,
      storage: nextStorage,
      slack: nextSlack,
      companion: nextCompanion,
    });
    setUiTimeFormat(nextSettings.ui.timeFormat);
    await storeReportContext("daily_report", nextSnapshot, "Daily Brief", nextBrief.priorityItems);
    const nextSuggestion = buildBestProactiveSuggestion(nextSnapshot, nextBrief.priorityItems);
    setProactiveSuggestion(nextSuggestion);
    await storeProactiveSuggestionContext(nextSuggestion);
    setStatus(
      `Loaded ${nextSnapshot.missions.length} missions, ${nextSnapshot.projects.length} projects, ${nextSnapshot.todos.length} todos, ${nextSnapshot.deadlines.length} deadlines, ${nextSnapshot.appointments.length} appointments, and ${nextSnapshot.people.length} people.`
    );
  }, []);

  const loadTimeBlocksForDate = useCallback(async (targetDate: string) => {
    const nextSnapshot = await window.praxis.timeBlocks.list(planningDateRange(targetDate));
    setTimeBlocks(nextSnapshot.timeBlocks);
  }, []);

  const {
    appointmentReport,
    showAppointmentReport,
    assistantReply,
    assistantReplyIsAiReview,
    captureText,
    captureStatus,
    pendingConfirmationOptions,
    captureDraft,
    setCaptureText,
    setCaptureStatus,
    setPendingCapture,
    setCaptureDraft,
    captureNaturalLanguage,
    confirmCapture,
    saveCaptureDraft,
    updateStatus,
    clearWaitingOn,
  } = useAssistantCapture({
    snapshot,
    focusReport,
    setSnapshot,
    setDailyBrief,
    setProactiveSuggestion,
    setFocusSelection,
    setFocusReport,
    setShowFocusDetails,
    setShowBriefDetails,
    setShowStatusReport,
    setActivePanel: setFocusedPanel,
    setStatus,
    loadWorkModel,
    todayTimelineRef,
  });

  useEffect(() => {
    void loadWorkModel().catch(() => {
      setStatus("Praxis could not load the storage-backed work model.");
    });
  }, [loadWorkModel]);

  useEffect(() => {
    const targetDate = planningDateOverride ?? (dailyBrief.localDate || formatLocalDate(new Date()));
    void loadTimeBlocksForDate(targetDate).catch(() => {
      setStatus("Praxis could not load local time blocks.");
    });
  }, [dailyBrief.localDate, loadTimeBlocksForDate, planningDateOverride]);

  useEffect(() => {
    const proposalsToRecord = projectTemplateProposalSnapshot.proposals.filter((proposal) => {
      const shownKey = `${proposal.proposalType}:${proposal.proposalFingerprint}:${proposal.materialChangeHash}`;
      if (recordedProjectTemplateProposalShows.current.has(shownKey)) {
        return false;
      }
      recordedProjectTemplateProposalShows.current.add(shownKey);
      return true;
    });

    if (proposalsToRecord.length === 0) {
      return;
    }

    void window.praxis.projectTemplates
      .recordShown({
        proposals: proposalsToRecord.map((proposal) => ({
          fingerprint: proposal.proposalFingerprint,
          proposalType: proposal.proposalType,
          clusterId: proposal.clusterId,
          materialChangeHash: proposal.materialChangeHash,
        })),
      })
      .catch(() => {
        setStatus("Praxis could not update project template proposal shown state.");
      });
  }, [projectTemplateProposalSnapshot.proposals]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--app-font-scale",
      uiFontScaleCssValue(serviceSnapshot.settings?.ui ?? {})
    );
    setUiTimeFormat(serviceSnapshot.settings?.ui.timeFormat ?? DEFAULT_UI_SETTINGS.timeFormat);
  }, [serviceSnapshot.settings?.ui]);

  useEffect(() => {
    const unsubscribe = window.praxis.settings.onUIUpdated((settings) => {
      document.documentElement.style.setProperty("--app-font-scale", uiFontScaleCssValue(settings));
      setUiTimeFormat(settings.timeFormat);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const refreshCurrentTime = () => setCurrentTime(new Date());
    refreshCurrentTime();
    const intervalId = window.setInterval(refreshCurrentTime, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const unsubscribe = window.praxis.calendar.onAutoSyncUpdated((update) => {
      void loadWorkModel()
        .then(() => {
          setStatus(update.message);
        })
        .catch(() => {
          setStatus("Calendar auto-sync finished, but Praxis could not refresh the dashboard.");
        });
    });

    return unsubscribe;
  }, [loadWorkModel]);

  useEffect(() => {
    const unsubscribe = window.praxis.email.onAutoSyncUpdated((update) => {
      void loadWorkModel()
        .then(() => {
          setStatus(update.message);
        })
        .catch(() => {
          setStatus("Email auto-sync finished, but Praxis could not refresh the dashboard.");
        });
    });

    return unsubscribe;
  }, [loadWorkModel]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        setActivePanel("projectStack");
      }
      if (event.key === "2") {
        event.preventDefault();
        setActivePanel("todayTimeline");
      }
      if (event.key === "3") {
        event.preventDefault();
        setActivePanel("morningPlan");
      }
      if (event.key === "4") {
        event.preventDefault();
        setActivePanel("masterChecklist");
      }
      if (event.key === "5") {
        event.preventDefault();
        setActivePanel("plan");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setShowBriefDetails]);

  const createMission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!missionForm.title.trim()) {
      setStatus("Mission title is required.");
      return;
    }

    await window.praxis.work.createMission(missionForm);
    setMissionForm(emptyMissionForm());
    await loadWorkModel();
  };

  const loadFocusReport = async () => {
    if (!focusSelection) {
      setFocusReport(null);
      return;
    }

    const [entityKind, entityId] = focusSelection.split(":") as ["mission" | "project", string];
    const report = await window.praxis.brief.getFocusReport({ entityKind, entityId });
    setFocusReport(report);
    setShowFocusDetails(false);
    if (report) {
      await storeReportContext("focus_report", snapshot, report.title, report.topItems);
    }
  };

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectForm.title.trim()) {
      setStatus("Project title is required.");
      return;
    }

    await window.praxis.work.createProject(projectForm);
    setProjectForm(emptyProjectForm());
    await loadWorkModel();
  };

  const createPerson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!personForm.name.trim()) {
      setStatus("Person name is required.");
      return;
    }

    await window.praxis.work.createPerson(personForm);
    setPersonForm(emptyPersonForm());
    await loadWorkModel();
  };

  const saveMissionEdit = async () => {
    if (!editingMission) {
      return;
    }

    await window.praxis.work.updateRecord({
      entityKind: "mission",
      id: editingMission.id,
      title: editingMission.title,
      summary: editingMission.summary ?? "",
      dueAt: editingMission.dueAt ?? "",
    });
    setEditingMission(null);
    await loadWorkModel();
  };

  const saveProjectEdit = async () => {
    if (!editingProject) {
      return;
    }

    await window.praxis.work.updateRecord({
      entityKind: "project",
      id: editingProject.id,
      title: editingProject.title,
      summary: editingProject.summary ?? "",
      missionId: editingProject.missionId ?? "",
      dueAt: editingProject.dueAt ?? "",
    });
    setEditingProject(null);
    await loadWorkModel();
  };

  const createTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!todoForm.title.trim()) {
      setStatus("Todo title is required.");
      return;
    }

    await window.praxis.work.createTodo(todoForm);
    setTodoForm(emptyTodoForm());
    await loadWorkModel();
  };

  const saveTodoEdit = async () => {
    if (!editingTodo) {
      return;
    }

    await window.praxis.work.updateRecord({
      entityKind: "todo",
      id: editingTodo.id,
      title: editingTodo.title,
      projectId: editingTodo.projectId ?? "",
      priority: editingTodo.priority,
      dueAt: editingTodo.dueAt ?? "",
      moneyRelated: editingTodo.moneyRelated,
      quickAction: editingTodo.quickAction,
      estimatedMinutes: editingTodo.estimatedMinutes ?? undefined,
      waitingOnPersonId: editingTodo.waitingOnPersonId ?? "",
      notes: editingTodo.notes ?? "",
    });
    setEditingTodo(null);
    await loadWorkModel();
  };

  const savePersonEdit = async () => {
    if (!editingPerson) {
      return;
    }

    await window.praxis.work.updateRecord({
      entityKind: "person",
      id: editingPerson.id,
      name: editingPerson.name,
      aliases: editingPerson.aliases,
      roleSummary: editingPerson.roleSummary ?? "",
      email: editingPerson.email ?? "",
      phone: editingPerson.phone ?? "",
      billingAddress: editingPerson.billingAddress ?? "",
      notes: editingPerson.notes ?? "",
    });
    setEditingPerson(null);
    await loadWorkModel();
  };

  const saveAppointmentEdit = async () => {
    if (!editingAppointment) {
      return;
    }

    await window.praxis.work.updateRecord({
      entityKind: "appointment",
      id: editingAppointment.id,
      title: editingAppointment.title,
      startsAt: editingAppointment.startsAt,
      endsAt: editingAppointment.endsAt ?? "",
      allDay: editingAppointment.allDay,
      notes: editingAppointment.notes ?? "",
    });
    setEditingAppointment(null);
    await loadWorkModel();
  };

  const deleteRecord = async (entityKind: EditableWorkEntityKind, id: string) => {
    const nextSnapshot = await window.praxis.work.deleteRecord({ entityKind, id });
    setSnapshot(nextSnapshot);
    setDailyBrief(await window.praxis.brief.getDaily());
    setStatus(`${entityKind} deleted.`);
  };

  const createDeadline = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!deadlineForm.title.trim() || !deadlineForm.dueAt.trim()) {
      setStatus("Standalone deadline title and due date are required.");
      return;
    }

    await window.praxis.work.createDeadline(deadlineForm);
    setDeadlineForm(emptyDeadlineForm());
    await loadWorkModel();
  };

  const saveDeadlineEdit = async () => {
    if (!editingDeadline) {
      return;
    }

    await window.praxis.work.updateRecord({
      entityKind: "deadline",
      id: editingDeadline.id,
      title: editingDeadline.title,
      dueAt: editingDeadline.dueAt,
      priority: editingDeadline.priority,
    });
    setEditingDeadline(null);
    await loadWorkModel();
  };

  const createAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!appointmentForm.title.trim() || !appointmentForm.startsAt.trim()) {
      setStatus("Appointment title and start time are required.");
      return;
    }

    await window.praxis.work.createAppointment(appointmentForm);
    setAppointmentForm(emptyAppointmentForm());
    await loadWorkModel();
  };

  const renderStatusActions = (
    entityKind: "mission" | "project" | "todo" | "deadline",
    id: string,
    status: WorkStatus
  ) => (
    <ActionMenu>
      {status !== "completed" ? (
        <button type="button" onClick={() => void updateStatus(entityKind, id, "completed")}>
          Complete
        </button>
      ) : (
        <button type="button" onClick={() => void updateStatus(entityKind, id, "active")}>
          Reactivate
        </button>
      )}
      {status !== "paused" && status !== "completed" ? (
        <button type="button" onClick={() => void updateStatus(entityKind, id, "paused")}>
          Pause
        </button>
      ) : null}
    </ActionMenu>
  );

  const startProjectTask = (projectId: string) => {
    const project = snapshot.projects.find((candidate) => candidate.id === projectId);
    setTodoForm({ ...emptyTodoForm(), projectId });
    setActivePanel("morningPlan");
    setStatus(
      project
        ? `Todo form is ready for ${project.title}. Open manual create records to enter the task title.`
        : "Todo form is ready for that project. Open manual create records to enter the task title."
    );
  };

  const createTimeBlock = async (input: CreateTimeBlockInput) => {
    const nextSnapshot = await window.praxis.timeBlocks.create(input);
    setTimeBlocks(nextSnapshot.timeBlocks);
    setStatus("Created a local Praxis time block. Google and Outlook were not updated.");
  };

  const updateTimeBlock = async (input: UpdateTimeBlockInput) => {
    const nextSnapshot = await window.praxis.timeBlocks.update(input);
    setTimeBlocks(nextSnapshot.timeBlocks);
    setStatus("Updated local Praxis time block. Google and Outlook were not updated.");
  };

  const deleteTimeBlock = async (id: string) => {
    const nextSnapshot = await window.praxis.timeBlocks.delete({ id });
    setTimeBlocks(nextSnapshot.timeBlocks);
    setStatus("Deleted local Praxis time block. Google and Outlook were not updated.");
  };

  const generateDraftPlan = async (input: GenerateDraftPlanRequest) => {
    const result = await window.praxis.plan.generateDraft(input);
    setStatus(
      result.summarySource === "ollama"
        ? "Built a staged AI draft plan. No local blocks or provider calendars were changed."
        : "Built a deterministic fallback draft plan. No local blocks or provider calendars were changed."
    );
    return result;
  };

  const previewTimeBlockPublish = async (input: TimeBlockPublishPreviewRequest) => {
    const preview = await window.praxis.calendar.previewTimeBlockPublish(input);
    setStatus(
      `Built calendar publish preview: ${preview.readyCount} ready, ${preview.blockedCount} blocked. No provider calendar was changed.`
    );
    return preview;
  };

  const confirmTimeBlockPublish = async (input: TimeBlockPublishConfirmRequest) => {
    const result = await window.praxis.calendar.confirmTimeBlockPublish(input);
    setStatus(
      `Calendar publish finished: ${result.publishedCount} created, ${result.skippedCount} skipped, ${result.failedCount} failed.`
    );
    return result;
  };

  const upcomingDeadlines = selectUpcomingDeadlines(snapshot.deadlines);
  const upcomingAppointments = selectUpcomingAppointments(snapshot.appointments);
  const reviewInboxItems = selectReviewInboxItems(
    emailSnapshot,
    chatSnapshot,
    projectTemplateProposalSnapshot
  );
  const serviceHealthItems = selectServiceHealthItems(serviceSnapshot, formatDateTime);
  const dashboardReadiness = selectDashboardReadiness(serviceHealthItems);
  const basePlanningDate = dailyBrief.localDate || formatLocalDate(new Date());
  const planningTargetDate = planningDateOverride ?? basePlanningDate;
  const planningDay = buildPlanningDayView({
    targetDate: planningTargetDate,
    appointments: snapshot.appointments,
    deadlines: snapshot.deadlines,
    todos: snapshot.todos,
    projects: snapshot.projects,
    missions: snapshot.missions,
    timeBlocks,
  });
  const scheduleReview = buildScheduleReview({
    targetDate: planningTargetDate,
    appointments: snapshot.appointments,
    deadlines: snapshot.deadlines,
    todos: snapshot.todos,
    projects: snapshot.projects,
    missions: snapshot.missions,
    timeBlocks,
  });
  const planningDateLabel = formatPlanDateLabel(planningDay.targetDate);
  const activePlanningProjects = snapshot.projects.filter(
    (project) => project.status !== "completed"
  );
  const activePlanningMissions = snapshot.missions.filter(
    (mission) => mission.status !== "completed"
  );
  const settingsTabForService = (serviceLabel: string): SettingsWindowTab | undefined => {
    switch (serviceLabel) {
      case "Google":
        return "google";
      case "Outlook":
        return "outlook";
      case "Slack":
        return "slack";
      case "Memory":
        return "storage";
      case "Companion":
        return undefined;
      default:
        return undefined;
    }
  };
  const openSettingsFromService = async (serviceLabel: string) => {
    const tab = settingsTabForService(serviceLabel);
    try {
      await window.praxis.settings.openWindow(tab ? { tab } : undefined);
      setStatus(tab ? `Opened Settings for ${serviceLabel}.` : "Opened Settings.");
    } catch {
      setStatus("Praxis could not open Settings.");
    }
  };

  const acceptEmailSuggestion = async (suggestionId: string, mode: "todo" | "project") => {
    const result = await window.praxis.email.acceptSuggestion({ suggestionId, mode });
    await loadWorkModel();
    setStatus(result.message);
  };

  const dismissEmailSuggestion = async (suggestionId: string) => {
    const result = await window.praxis.email.dismissSuggestion({ suggestionId });
    await loadWorkModel();
    setStatus(result.message);
  };

  const archiveEmailSuggestion = async (suggestionId: string) => {
    const result = await window.praxis.email.archiveSuggestion({ suggestionId });
    await loadWorkModel();
    setStatus(result.message);
  };

  const acceptChatSuggestion = async (suggestionId: string, mode: "todo" | "project") => {
    const result = await window.praxis.chat.acceptSuggestion({ suggestionId, mode });
    await loadWorkModel();
    setStatus(result.message);
  };

  const dismissChatSuggestion = async (suggestionId: string) => {
    const result = await window.praxis.chat.dismissSuggestion({ suggestionId });
    await loadWorkModel();
    setStatus(result.message);
  };

  const archiveChatSuggestion = async (suggestionId: string) => {
    const result = await window.praxis.chat.archiveSuggestion({ suggestionId });
    await loadWorkModel();
    setStatus(result.message);
  };

  const dismissProjectTemplateProposal = async (input: ProjectTemplateProposalActionInput) => {
    const result = await window.praxis.projectTemplates.dismissProposal(input);
    setProjectTemplateProposalSnapshot(result.snapshot);
    setStatus(result.message);
  };

  const snoozeProjectTemplateProposal = async (input: ProjectTemplateProposalActionInput) => {
    const result = await window.praxis.projectTemplates.snoozeProposal(input);
    setProjectTemplateProposalSnapshot(result.snapshot);
    setStatus(result.message);
  };

  const rejectProjectTemplateProposal = async (input: ProjectTemplateProposalActionInput) => {
    const result = await window.praxis.projectTemplates.rejectProposal(input);
    setProjectTemplateProposalSnapshot(result.snapshot);
    setStatus(result.message);
  };

  const neverSuggestProjectTemplateProposal = async (
    input: ProjectTemplateProposalActionInput
  ) => {
    const result = await window.praxis.projectTemplates.neverSuggestProposal(input);
    setProjectTemplateProposalSnapshot(result.snapshot);
    setStatus(result.message);
  };

  const saveProjectTemplateProposal = async (input: ProjectTemplateProposalSaveInput) => {
    const result = await window.praxis.projectTemplates.saveProposal(input);
    setProjectTemplateProposalSnapshot(result.snapshot);
    setStatus(`${result.message} Markdown path: ${result.template.path}.`);
  };

  const importManualChatSnippet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const conversationTitle = manualChatImportForm.conversationTitle.trim();
    const snippet = manualChatImportForm.snippet.trim();
    if (!conversationTitle || !snippet) {
      setChatImportStatus("Conversation title and pasted snippet are required.");
      return;
    }

    const participants = manualChatImportForm.participants
      .split(",")
      .map((participant) => participant.trim())
      .filter(Boolean);
    const timestamp = new Date().toISOString();
    const input: ImportChatConversationInput = {
      sourceSystem: manualChatImportForm.sourceSystem,
      conversationTitle,
      importedAt: timestamp,
      summary: snippet,
      participants: participants.map((displayName) => ({ displayName })),
      messages: [
        {
          senderName: participants[0] ?? "Imported chat",
          sentAt: timestamp,
          summary: snippet,
          snippet,
        },
      ],
    };
    const result = await window.praxis.chat.importConversation(input);
    await loadWorkModel();
    setChatImportStatus(result.message);
    setStatus(result.message);
    if (result.ok) {
      setManualChatImportForm(emptyManualChatImportForm());
      setActivePanel("todayTimeline");
    }
  };

  return (
    <div className={`app-shell is-surface-${activePanel}`}>
      <nav className="top-nav" aria-label="Praxis navigation">
        <div className="top-nav-brand">
          <span className="top-nav-kicker">Praxis Desk</span>
          <strong>Operator Dashboard</strong>
        </div>
        <div className="top-nav-buttons">
          <button
            type="button"
            className={activePanel === "command" ? "is-nav-active" : ""}
            aria-pressed={activePanel === "command"}
            onClick={() => setActivePanel("command")}
          >
            Command
          </button>
          <button
            type="button"
            className={activePanel === "plan" ? "is-nav-active" : ""}
            aria-pressed={activePanel === "plan"}
            onClick={() => setActivePanel("plan")}
          >
            Plan
          </button>
          <button
            type="button"
            className={activePanel === "projectStack" ? "is-nav-active" : ""}
            aria-pressed={activePanel === "projectStack"}
            onClick={() => setActivePanel("projectStack")}
          >
            Projects
          </button>
          <button
            type="button"
            className={activePanel === "todayTimeline" ? "is-nav-active" : ""}
            aria-pressed={activePanel === "todayTimeline"}
            onClick={() => setActivePanel("todayTimeline")}
          >
            Today
          </button>
          <button
            type="button"
            className={activePanel === "morningPlan" ? "is-nav-active" : ""}
            aria-pressed={activePanel === "morningPlan"}
            onClick={() => setActivePanel("morningPlan")}
          >
            Talk
          </button>
          <button
            type="button"
            className={activePanel === "masterChecklist" ? "is-nav-active" : ""}
            aria-pressed={activePanel === "masterChecklist"}
            onClick={() => setActivePanel("masterChecklist")}
          >
            Checklist
          </button>
        </div>
        <div className="top-nav-node">
          <span className="node-dot" aria-hidden="true" />
          <span>
            <strong>Home Node</strong>
            <small>{dashboardReadiness.title.toLowerCase()}</small>
          </span>
        </div>
      </nav>
      <section className="service-health-strip" aria-label="Service health">
        {serviceHealthItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`service-status-pill ${
              item.state === "online" ? "is-online" : "is-attention"
            }`}
            title={`${item.label}: ${item.detail}. ${item.action}`}
            onClick={() => void openSettingsFromService(item.label)}
          >
            <span className="service-status-dot" aria-hidden="true" />
            <span className="service-status-name">{item.label}</span>
          </button>
        ))}
      </section>
      <PlanSurfacePanel
        isActive={activePanel === "command" || activePanel === "plan"}
        planningDay={planningDay}
        scheduleReview={scheduleReview}
        selectedDateLabel={planningDateLabel}
        currentTimeLabel={formatPraxisTime(currentTime, uiTimeFormat)}
        timeFormat={uiTimeFormat}
        basePlanningDate={basePlanningDate}
        formatDateTime={formatDateTime}
        activeProjects={activePlanningProjects}
        activeMissions={activePlanningMissions}
        createTimeBlock={createTimeBlock}
        updateTimeBlock={updateTimeBlock}
        deleteTimeBlock={deleteTimeBlock}
        generateDraftPlan={generateDraftPlan}
        calendarConnections={serviceSnapshot.settings?.calendarConnections ?? []}
        previewTimeBlockPublish={previewTimeBlockPublish}
        confirmTimeBlockPublish={confirmTimeBlockPublish}
        onPlanningDateChange={setPlanningDateOverride}
        onResetPlanningDate={() => setPlanningDateOverride(null)}
        variant={activePanel === "command" ? "compact" : "full"}
      />
      <ProjectStackPanel
        isActive={activePanel === "command" || activePanel === "projectStack"}
        missions={snapshot.missions}
        projects={snapshot.projects}
        todos={snapshot.todos}
        people={snapshot.people}
        openCapture={() => setActivePanel("morningPlan")}
        formatDateTime={formatDateTime}
        renderStatusActions={renderStatusActions}
        setEditingMission={setEditingMission}
        setEditingProject={setEditingProject}
        setEditingTodo={setEditingTodo}
        startProjectTask={startProjectTask}
        deleteMission={(id) => deleteRecord("mission", id)}
        deleteProject={(id) => deleteRecord("project", id)}
        deleteTodo={(id) => deleteRecord("todo", id)}
      />

      <TodayTimelinePanel
        ref={todayTimelineRef}
        isActive={activePanel === "command" || activePanel === "todayTimeline"}
        status={status}
        dailyBrief={dailyBrief}
        focusSelection={focusSelection}
        missions={snapshot.missions}
        projects={snapshot.projects}
        proactiveSuggestion={proactiveSuggestion}
        focusReport={focusReport}
        dashboardReadiness={dashboardReadiness}
        serviceHealthItems={serviceHealthItems}
        openCapture={() => setActivePanel("morningPlan")}
        showFocusDetails={showFocusDetails}
        showStatusReport={showStatusReport}
        showAppointmentReport={showAppointmentReport}
        appointmentReport={appointmentReport}
        showBriefDetails={showBriefDetails}
        reviewInboxItems={reviewInboxItems}
        upcomingAppointments={upcomingAppointments}
        upcomingDeadlines={upcomingDeadlines}
        memoryDocuments={snapshot.memoryDocuments}
        formatDateTime={formatDateTime}
        renderStatusActions={renderStatusActions}
        setFocusSelection={setFocusSelection}
        setShowFocusDetails={setShowFocusDetails}
        setShowStatusReport={setShowStatusReport}
        setShowBriefDetails={setShowBriefDetails}
        setProactiveSuggestion={setProactiveSuggestion}
        setEditingAppointment={setEditingAppointment}
        setEditingDeadline={setEditingDeadline}
        loadFocusReport={loadFocusReport}
        clearWaitingOn={clearWaitingOn}
        updateStatus={updateStatus}
        acceptEmailSuggestion={acceptEmailSuggestion}
        archiveEmailSuggestion={archiveEmailSuggestion}
        dismissEmailSuggestion={dismissEmailSuggestion}
        acceptChatSuggestion={acceptChatSuggestion}
        archiveChatSuggestion={archiveChatSuggestion}
        dismissChatSuggestion={dismissChatSuggestion}
        dismissProjectTemplateProposal={dismissProjectTemplateProposal}
        snoozeProjectTemplateProposal={snoozeProjectTemplateProposal}
        rejectProjectTemplateProposal={rejectProjectTemplateProposal}
        neverSuggestProjectTemplateProposal={neverSuggestProjectTemplateProposal}
        saveProjectTemplateProposal={saveProjectTemplateProposal}
        deleteAppointment={(id) => deleteRecord("appointment", id)}
        deleteDeadline={(id) => deleteRecord("deadline", id)}
      />
      <MemoryWriterPanel
        isActive={activePanel === "command" || activePanel === "morningPlan"}
        snapshot={snapshot}
        captureText={captureText}
        captureStatus={captureStatus}
        assistantReply={assistantReply}
        assistantReplyIsAiReview={assistantReplyIsAiReview}
        pendingConfirmationOptions={pendingConfirmationOptions}
        captureDraft={captureDraft}
        missionForm={missionForm}
        projectForm={projectForm}
        personForm={personForm}
        todoForm={todoForm}
        deadlineForm={deadlineForm}
        appointmentForm={appointmentForm}
        manualChatImportForm={manualChatImportForm}
        chatImportStatus={chatImportStatus}
        editingMission={editingMission}
        editingProject={editingProject}
        editingDeadline={editingDeadline}
        editingTodo={editingTodo}
        editingPerson={editingPerson}
        editingAppointment={editingAppointment}
        setCaptureText={setCaptureText}
        setCaptureStatus={setCaptureStatus}
        setCaptureDraft={setCaptureDraft}
        setPendingCapture={setPendingCapture}
        setMissionForm={setMissionForm}
        setProjectForm={setProjectForm}
        setPersonForm={setPersonForm}
        setTodoForm={setTodoForm}
        setDeadlineForm={setDeadlineForm}
        setAppointmentForm={setAppointmentForm}
        setManualChatImportForm={setManualChatImportForm}
        setEditingMission={setEditingMission}
        setEditingProject={setEditingProject}
        setEditingDeadline={setEditingDeadline}
        setEditingTodo={setEditingTodo}
        setEditingPerson={setEditingPerson}
        setEditingAppointment={setEditingAppointment}
        captureNaturalLanguage={captureNaturalLanguage}
        confirmCapture={confirmCapture}
        saveCaptureDraft={saveCaptureDraft}
        saveMissionEdit={saveMissionEdit}
        saveProjectEdit={saveProjectEdit}
        saveDeadlineEdit={saveDeadlineEdit}
        saveTodoEdit={saveTodoEdit}
        savePersonEdit={savePersonEdit}
        saveAppointmentEdit={saveAppointmentEdit}
        createMission={createMission}
        createProject={createProject}
        createPerson={createPerson}
        createTodo={createTodo}
        createDeadline={createDeadline}
        createAppointment={createAppointment}
        importManualChatSnippet={importManualChatSnippet}
      />

      <MasterChecklistPanel
        isActive={activePanel === "command" || activePanel === "masterChecklist"}
        todos={snapshot.todos}
        projects={snapshot.projects}
        missions={snapshot.missions}
        people={snapshot.people}
        openCapture={() => setActivePanel("morningPlan")}
        todoFilter={todoFilter}
        setTodoFilter={setTodoFilter}
        formatDateTime={formatDateTime}
        renderStatusActions={renderStatusActions}
        setEditingTodo={setEditingTodo}
        deleteTodo={(id) => deleteRecord("todo", id)}
      />
    </div>
  );
}
