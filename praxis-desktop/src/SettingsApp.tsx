import { useCallback, useEffect, useState, type FormEvent } from "react";
import "./App.css";
import type { CalendarImportSource, NormalizedCalendarEvent } from "../shared/calendarImport";
import type { CalendarOAuthReadiness } from "../shared/calendarOAuth";
import type {
  CreateEmailConnectionInput,
  EmailProvider,
  EmailSnapshot,
  ImportEmailMessagesInput,
} from "../shared/emailModel";
import type { EmailOAuthReadiness } from "../shared/emailOAuth";
import { parseIcsCalendar } from "../shared/icsCalendar";
import {
  buildPersonContactSuggestions,
  type PersonContactSuggestionField,
  type PersonContactSuggestion,
} from "../shared/personContactSuggestion";
import type { SlackAdapterStatus } from "../shared/slackAdapter";
import type { StorageOverview } from "../shared/storage/hybridStorage";
import type {
  CalendarProvider,
  CreateCalendarConnectionInput,
  SettingsSnapshot,
  UpdateCalendarAutoSyncSettingsInput,
  UpdateGoogleOAuthSettingsInput,
  UpdateOutlookOAuthSettingsInput,
  UpdateSlackSettingsInput,
} from "../shared/settingsModel";
import type {
  AppointmentRecord,
  CreatePersonWorkLinkInput,
  DeadlineRecord,
  EditableWorkEntityKind,
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
  WorkStatus,
  WorkSnapshot,
} from "../shared/workModel";
import { CalendarSettingsPanel } from "./components/CalendarSettingsPanel";
import { AiSettingsPanel } from "./components/AiSettingsPanel";
import { ConnectedServiceSettingsPanel } from "./components/ConnectedServiceSettingsPanel";
import { PeopleProfilePanel } from "./components/PeopleProfilePanel";
import { SlackSettingsPanel } from "./components/SlackSettingsPanel";
import { WorkEditPanels } from "./components/WorkFormsPanel";

type SettingsTab =
  | "slack"
  | "google"
  | "outlook"
  | "ai"
  | "icsImport"
  | "people"
  | "storage";

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

const EMPTY_SETTINGS: SettingsSnapshot = {
  calendarConnections: [],
  emailConnections: [],
  calendarAutoSync: {
    enabled: true,
    intervalMinutes: 30,
  },
  secretStorage: {
    available: false,
    provider: "electron_safe_storage",
    reason: "Secret storage status has not loaded yet.",
  },
  googleOAuth: {
    clientId: null,
    clientSecretConfigured: false,
    redirectUri: null,
    effectiveRedirectUri: "http://127.0.0.1:47841/oauth/google/callback",
  },
  outlookOAuth: {
    clientId: null,
    clientSecretConfigured: false,
  },
  slack: {
    operatorChannelId: null,
    proactiveMirroringEnabled: false,
  },
};

const EMPTY_EMAIL_SNAPSHOT: EmailSnapshot = {
  connections: [],
  messages: [],
  suggestions: [],
  contactSuggestionDismissals: [],
};

const EMPTY_GOOGLE_OAUTH_READINESS: CalendarOAuthReadiness = {
  provider: "google",
  ready: false,
  missing: [],
  redirectUri: "http://127.0.0.1:47841/oauth/google/callback",
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  message: "Google OAuth readiness has not loaded yet.",
};

const EMPTY_OUTLOOK_OAUTH_READINESS: CalendarOAuthReadiness = {
  provider: "outlook",
  ready: false,
  missing: [],
  redirectUri: "http://127.0.0.1:47842/oauth/outlook/callback",
  scopes: ["offline_access", "https://graph.microsoft.com/Calendars.Read"],
  message: "Outlook OAuth readiness has not loaded yet.",
};

const EMPTY_SLACK_STATUS: SlackAdapterStatus = {
  enabled: false,
  reason: "Slack status has not loaded yet.",
};

const EMPTY_GMAIL_OAUTH_READINESS: EmailOAuthReadiness = {
  provider: "gmail",
  ready: false,
  missing: [],
  redirectUri: "http://127.0.0.1:47841/oauth/google/callback",
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  message: "Gmail OAuth readiness has not loaded yet.",
};

const EMPTY_OUTLOOK_EMAIL_OAUTH_READINESS: EmailOAuthReadiness = {
  provider: "outlook",
  ready: false,
  missing: [],
  redirectUri: "http://127.0.0.1:47843/oauth/outlook-email/callback",
  scopes: ["offline_access", "https://graph.microsoft.com/Mail.Read"],
  message: "Outlook email OAuth readiness has not loaded yet.",
};

const emptyCalendarForm = (): CreateCalendarConnectionInput => ({
  provider: "google",
  label: "",
  accountRef: "",
  enabled: true,
});

const emptySlackForm = (): UpdateSlackSettingsInput => ({
  operatorChannelId: "",
  proactiveMirroringEnabled: false,
});

const emptyEmailForm = (): CreateEmailConnectionInput => ({
  provider: "gmail",
  label: "",
  accountRef: "",
  enabled: true,
});

const emptyGoogleOAuthForm = (): UpdateGoogleOAuthSettingsInput => ({
  clientId: "",
  clientSecret: "",
  clearClientSecret: false,
  redirectUri: "",
});

const emptyOutlookOAuthForm = (): UpdateOutlookOAuthSettingsInput => ({
  clientId: "",
  clientSecret: "",
  clearClientSecret: false,
});

const emptyPersonLinkForm = (): CreatePersonWorkLinkInput => ({
  personId: "",
  entityKind: "project",
  entityId: "",
  relationship: "related",
});

const sampleCalendarImport = JSON.stringify(
  [
    {
      externalId: "sample-event-1",
      title: "Sample imported appointment",
      startsAt: "2026-04-22T09:00",
      endsAt: "2026-04-22T10:00",
      notes: "Manual JSON import sample",
    },
  ],
  null,
  2
);

const sampleEmailImport = JSON.stringify(
  [
    {
      externalId: "sample-email-1",
      subject: "Can you send Max the revised proposal by Friday?",
      senderName: "Scott",
      senderEmail: "scott@example.com",
      receivedAt: "2026-04-23T09:15:00",
      summary:
        "Scott asked for the revised proposal to go to Max by Friday and wants a quick confirmation once it is sent.",
    },
  ] satisfies ImportEmailMessagesInput["messages"],
  null,
  2
);

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

export default function SettingsApp() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("google");
  const [snapshot, setSnapshot] = useState<WorkSnapshot>(EMPTY_SNAPSHOT);
  const [settingsSnapshot, setSettingsSnapshot] = useState<SettingsSnapshot>(EMPTY_SETTINGS);
  const [emailSnapshot, setEmailSnapshot] = useState<EmailSnapshot>(EMPTY_EMAIL_SNAPSHOT);
  const [googleOAuthReadiness, setGoogleOAuthReadiness] = useState<CalendarOAuthReadiness>(
    EMPTY_GOOGLE_OAUTH_READINESS
  );
  const [gmailOAuthReadiness, setGmailOAuthReadiness] =
    useState<EmailOAuthReadiness>(EMPTY_GMAIL_OAUTH_READINESS);
  const [outlookEmailOAuthReadiness, setOutlookEmailOAuthReadiness] =
    useState<EmailOAuthReadiness>(EMPTY_OUTLOOK_EMAIL_OAUTH_READINESS);
  const [outlookOAuthReadiness, setOutlookOAuthReadiness] = useState<CalendarOAuthReadiness>(
    EMPTY_OUTLOOK_OAUTH_READINESS
  );
  const [slackStatus, setSlackStatus] = useState<SlackAdapterStatus>(EMPTY_SLACK_STATUS);
  const [storageOverview, setStorageOverview] = useState<StorageOverview | null>(null);
  const [memoryReindexing, setMemoryReindexing] = useState(false);
  const [status, setStatus] = useState("Loading settings...");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [personLinkForm, setPersonLinkForm] = useState<CreatePersonWorkLinkInput>(() =>
    emptyPersonLinkForm()
  );
  const [calendarForm, setCalendarForm] = useState<CreateCalendarConnectionInput>(() =>
    emptyCalendarForm()
  );
  const [calendarAutoSyncForm, setCalendarAutoSyncForm] =
    useState<UpdateCalendarAutoSyncSettingsInput>(() => ({
      enabled: true,
      intervalMinutes: 30,
    }));
  const [calendarImportSource, setCalendarImportSource] =
    useState<CalendarImportSource>("manual_json");
  const [calendarImportText, setCalendarImportText] = useState(sampleCalendarImport);
  const [emailForm, setEmailForm] = useState<CreateEmailConnectionInput>(() => emptyEmailForm());
  const [emailImportText, setEmailImportText] = useState(sampleEmailImport);
  const [slackForm, setSlackForm] = useState<UpdateSlackSettingsInput>(() => emptySlackForm());
  const [googleOAuthForm, setGoogleOAuthForm] = useState<UpdateGoogleOAuthSettingsInput>(() =>
    emptyGoogleOAuthForm()
  );
  const [outlookOAuthForm, setOutlookOAuthForm] = useState<UpdateOutlookOAuthSettingsInput>(() =>
    emptyOutlookOAuthForm()
  );
  const [editingMission, setEditingMission] = useState<MissionRecord | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<DeadlineRecord | null>(null);
  const [editingTodo, setEditingTodo] = useState<TodoRecord | null>(null);
  const [editingPerson, setEditingPerson] = useState<PersonRecord | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRecord | null>(null);

  const loadSettingsModel = useCallback(async () => {
    const [
      nextSnapshot,
      nextOverview,
      nextSettings,
      nextEmailSnapshot,
      nextSlackStatus,
      nextGoogleOAuthReadiness,
      nextGmailOAuthReadiness,
      nextOutlookEmailOAuthReadiness,
      nextOutlookOAuthReadiness,
    ] = await Promise.all([
      window.praxis.work.getSnapshot(),
      window.praxis.storage.getOverview(),
      window.praxis.settings.getSnapshot(),
      window.praxis.email.getSnapshot(),
      window.praxis.slack.getStatus(),
      window.praxis.calendar.getGoogleOAuthReadiness(),
      window.praxis.email.getGoogleOAuthReadiness(),
      window.praxis.email.getOutlookOAuthReadiness(),
      window.praxis.calendar.getOutlookOAuthReadiness(),
    ]);

    setSnapshot(nextSnapshot);
    setStorageOverview(nextOverview);
    setSettingsSnapshot(nextSettings);
    setEmailSnapshot(nextEmailSnapshot);
    setSlackStatus(nextSlackStatus);
    setGoogleOAuthReadiness(nextGoogleOAuthReadiness);
    setGmailOAuthReadiness(nextGmailOAuthReadiness);
    setOutlookEmailOAuthReadiness(nextOutlookEmailOAuthReadiness);
    setOutlookOAuthReadiness(nextOutlookOAuthReadiness);
    setSlackForm({
      operatorChannelId: nextSettings.slack.operatorChannelId ?? "",
      proactiveMirroringEnabled: nextSettings.slack.proactiveMirroringEnabled,
    });
    setCalendarAutoSyncForm(nextSettings.calendarAutoSync);
    setGoogleOAuthForm({
      clientId: nextSettings.googleOAuth.clientId ?? "",
      clientSecret: "",
      clearClientSecret: false,
      redirectUri: nextSettings.googleOAuth.redirectUri ?? "",
    });
    setOutlookOAuthForm({
      clientId: nextSettings.outlookOAuth.clientId ?? "",
      clientSecret: "",
      clearClientSecret: false,
    });
    setStatus("Settings loaded.");
  }, []);

  useEffect(() => {
    void loadSettingsModel().catch(() => {
      setStatus("Praxis could not load settings.");
    });
  }, [loadSettingsModel]);

  useEffect(() => {
    const unsubscribe = window.praxis.calendar.onGoogleOAuthUpdated((update) => {
      void Promise.all([
        window.praxis.settings.getSnapshot(),
        window.praxis.calendar.getGoogleOAuthReadiness(),
      ])
        .then(([nextSettings, nextReadiness]) => {
          setSettingsSnapshot(nextSettings);
          setGoogleOAuthReadiness(nextReadiness);
          setStatus(update.message);
        })
        .catch(() => setStatus("Google OAuth finished, but Praxis could not refresh settings."));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = window.praxis.calendar.onOutlookOAuthUpdated((update) => {
      void Promise.all([
        window.praxis.settings.getSnapshot(),
        window.praxis.calendar.getOutlookOAuthReadiness(),
      ])
        .then(([nextSettings, nextReadiness]) => {
          setSettingsSnapshot(nextSettings);
          setOutlookOAuthReadiness(nextReadiness);
          setStatus(update.message);
        })
        .catch(() => setStatus("Outlook OAuth finished, but Praxis could not refresh settings."));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = window.praxis.calendar.onAutoSyncUpdated((update) => {
      void loadSettingsModel()
        .then(() => setStatus(update.message))
        .catch(() => {
          setStatus("Calendar auto-sync finished, but Praxis could not refresh settings.");
        });
    });

    return unsubscribe;
  }, [loadSettingsModel]);

  useEffect(() => {
    const unsubscribe = window.praxis.email.onGoogleOAuthUpdated((update) => {
      void Promise.all([
        window.praxis.settings.getSnapshot(),
        window.praxis.email.getGoogleOAuthReadiness(),
        window.praxis.email.getSnapshot(),
      ])
        .then(([nextSettings, nextReadiness, nextEmailSnapshot]) => {
          setSettingsSnapshot(nextSettings);
          setGmailOAuthReadiness(nextReadiness);
          setEmailSnapshot(nextEmailSnapshot);
          setStatus(update.message);
        })
        .catch(() => setStatus("Gmail OAuth finished, but Praxis could not refresh settings."));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = window.praxis.email.onOutlookOAuthUpdated((update) => {
      void Promise.all([
        window.praxis.settings.getSnapshot(),
        window.praxis.email.getOutlookOAuthReadiness(),
        window.praxis.email.getSnapshot(),
      ])
        .then(([nextSettings, nextReadiness, nextEmailSnapshot]) => {
          setSettingsSnapshot(nextSettings);
          setOutlookEmailOAuthReadiness(nextReadiness);
          setEmailSnapshot(nextEmailSnapshot);
          setStatus(update.message);
        })
        .catch(() => setStatus("Outlook email OAuth finished, but Praxis could not refresh settings."));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = window.praxis.email.onAutoSyncUpdated((update) => {
      void loadSettingsModel()
        .then(() => setStatus(update.message))
        .catch(() => {
          setStatus("Email auto-sync finished, but Praxis could not refresh settings.");
        });
    });

    return unsubscribe;
  }, [loadSettingsModel]);

  const createPersonLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedPerson =
      snapshot.people.find((person) => person.id === selectedPersonId) ?? snapshot.people[0] ?? null;
    const personId = personLinkForm.personId || selectedPerson?.id || "";
    if (!personId || !personLinkForm.entityId || !personLinkForm.relationship.trim()) {
      setStatus("Person, relationship, and mission/project are required.");
      return;
    }

    const nextSnapshot = await window.praxis.work.createPersonWorkLink({
      ...personLinkForm,
      personId,
    });
    setSnapshot(nextSnapshot);
    setPersonLinkForm({ ...emptyPersonLinkForm(), personId });
    setSelectedPersonId(personId);
    setStatus("Person relationship saved.");
  };

  const deletePersonLink = async (id: string) => {
    const nextSnapshot = await window.praxis.work.deletePersonWorkLink({ id });
    setSnapshot(nextSnapshot);
    setStatus("Person relationship removed.");
  };

  const deleteRecord = async (entityKind: EditableWorkEntityKind, id: string) => {
    const nextSnapshot = await window.praxis.work.deleteRecord({ entityKind, id });
    setSnapshot(nextSnapshot);
    if (entityKind === "person" && selectedPersonId === id) {
      setSelectedPersonId("");
    }
    setStorageOverview(await window.praxis.storage.getOverview());
    setStatus(`${entityKind} deleted.`);
  };

  const updateStatus = async (
    entityKind: "mission" | "project" | "todo" | "deadline",
    id: string,
    nextStatus: WorkStatus
  ) => {
    const nextSnapshot = await window.praxis.work.updateStatus({ entityKind, id, status: nextStatus });
    setSnapshot(nextSnapshot);
    setStorageOverview(await window.praxis.storage.getOverview());
    setStatus(`${entityKind} marked ${nextStatus}.`);
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
    await loadSettingsModel();
    setStatus("Person saved.");
  };

  const unavailableEdit = async () => {
    setStatus("This editor is available from the main dashboard.");
  };

  const createCalendarConnection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!calendarForm.label.trim()) {
      setStatus("Calendar label is required.");
      return;
    }

    await window.praxis.settings.createCalendarConnection(calendarForm);
    setCalendarForm(emptyCalendarForm());
    setSettingsSnapshot(await window.praxis.settings.getSnapshot());
    setStatus("Calendar connection saved in settings.");
  };

  const deleteCalendarConnection = async (id: string) => {
    if (
      !window.confirm(
        "Remove this calendar source and its stored credentials? You can add it again later."
      )
    ) {
      return;
    }

    const nextSettings = await window.praxis.settings.deleteCalendarConnection({ id });
    setSettingsSnapshot(nextSettings);
    setStatus("Calendar connection removed.");
  };

  const createServiceCalendarConnection = async (
    provider: Extract<CalendarProvider, "google" | "outlook">,
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!calendarForm.label.trim()) {
      setStatus("Calendar label is required.");
      return;
    }

    await window.praxis.settings.createCalendarConnection({
      ...calendarForm,
      provider,
      enabled: true,
    });
    setCalendarForm(emptyCalendarForm());
    setSettingsSnapshot(await window.praxis.settings.getSnapshot());
    setStatus(`${provider === "google" ? "Google" : "Outlook"} calendar source saved.`);
  };

  const createServiceEmailConnection = async (
    provider: Extract<EmailProvider, "gmail" | "outlook">,
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!emailForm.label.trim()) {
      setStatus("Email source label is required.");
      return;
    }

    await window.praxis.settings.createEmailConnection({
      ...emailForm,
      provider,
      enabled: true,
    });
    setEmailForm(emptyEmailForm());
    await loadSettingsModel();
    setStatus(`${provider === "gmail" ? "Gmail" : "Outlook"} mail source saved.`);
  };

  const deleteEmailConnection = async (id: string) => {
    if (
      !window.confirm(
        "Remove this mail source and its stored credentials? You can add it again later."
      )
    ) {
      return;
    }

    await window.praxis.settings.deleteEmailConnection({ id });
    await loadSettingsModel();
    setStatus("Email source removed.");
  };

  const updateEmailConnection = async (id: string, label: string, accountRef: string) => {
    if (!label.trim()) {
      setStatus("Email source label is required.");
      return;
    }

    await window.praxis.settings.updateEmailConnection({ id, label, accountRef });
    await loadSettingsModel();
    setStatus("Email source saved.");
  };

  const updateCalendarConnection = async (id: string, label: string, accountRef: string) => {
    if (!label.trim()) {
      setStatus("Calendar source label is required.");
      return;
    }

    await window.praxis.settings.updateCalendarConnection({ id, label, accountRef });
    await loadSettingsModel();
    setStatus("Calendar source saved.");
  };

  const prepareGmailOAuth = async (connectionId: string) => {
    const result = await window.praxis.email.prepareGoogleOAuth({ connectionId });
    setGmailOAuthReadiness(await window.praxis.email.getGoogleOAuthReadiness());
    setStatus(result.message);
  };

  const syncGoogleInbox = async (connectionId: string) => {
    const result = await window.praxis.email.syncGoogle({ connectionId });
    await loadSettingsModel();
    setStatus(result.message);
  };

  const prepareOutlookEmailOAuth = async (connectionId: string) => {
    const result = await window.praxis.email.prepareOutlookOAuth({ connectionId });
    setOutlookEmailOAuthReadiness(await window.praxis.email.getOutlookOAuthReadiness());
    setStatus(result.message);
  };

  const syncOutlookInbox = async (connectionId: string) => {
    const result = await window.praxis.email.syncOutlook({ connectionId });
    await loadSettingsModel();
    setStatus(result.message);
  };

  const prepareGoogleOAuth = async (connectionId: string) => {
    const result = await window.praxis.calendar.prepareGoogleOAuth({ connectionId });
    setGoogleOAuthReadiness(await window.praxis.calendar.getGoogleOAuthReadiness());
    setStatus(result.message);
  };

  const prepareOutlookOAuth = async (connectionId: string) => {
    const result = await window.praxis.calendar.prepareOutlookOAuth({ connectionId });
    setOutlookOAuthReadiness(await window.praxis.calendar.getOutlookOAuthReadiness());
    setStatus(result.message);
  };

  const syncGoogleCalendar = async (connectionId: string) => {
    const result = await window.praxis.calendar.syncGoogle({ connectionId });
    await loadSettingsModel();
    setStatus(result.message);
  };

  const syncOutlookCalendar = async (connectionId: string) => {
    const result = await window.praxis.calendar.syncOutlook({ connectionId });
    await loadSettingsModel();
    setStatus(result.message);
  };

  const importCalendarJson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let parsed: unknown;
    try {
      parsed = JSON.parse(calendarImportText);
    } catch {
      setStatus("Calendar import JSON is not valid.");
      return;
    }

    const events = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { events?: unknown }).events)
        ? (parsed as { events: unknown[] }).events
        : null;
    if (!events) {
      setStatus("Calendar import JSON must be an array or an object with an events array.");
      return;
    }

    const result = await window.praxis.calendar.importEvents({
      sourceSystem: calendarImportSource,
      events: events as NormalizedCalendarEvent[],
    });
    await loadSettingsModel();
    setStatus(result.message);
  };

  const importIcsCalendar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("icsFile");
    if (!(file instanceof File) || file.size === 0) {
      setStatus("Choose an .ics calendar file before importing.");
      return;
    }

    const parsed = parseIcsCalendar(await file.text());
    if (parsed.events.length === 0) {
      setStatus(
        parsed.issues.length > 0
          ? `ICS import found no usable events. ${parsed.issues.length} event(s) were skipped.`
          : "ICS import found no events."
      );
      return;
    }

    const result = await window.praxis.calendar.importEvents({
      sourceSystem: "ics",
      events: parsed.events,
    });
    await loadSettingsModel();
    const parseWarning =
      parsed.issues.length > 0 ? ` ${parsed.issues.length} ICS event(s) skipped before import.` : "";
    setStatus(`${result.message}${parseWarning}`);
  };

  const importEmailJson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let parsed: unknown;
    try {
      parsed = JSON.parse(emailImportText);
    } catch {
      setStatus("Email import JSON is not valid.");
      return;
    }

    const messages = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" &&
          parsed !== null &&
          Array.isArray((parsed as { messages?: unknown }).messages)
        ? (parsed as { messages: unknown[] }).messages
        : null;
    if (!messages) {
      setStatus("Email import JSON must be an array or an object with a messages array.");
      return;
    }

    const manualConnection =
      settingsSnapshot.emailConnections.find((connection) => connection.provider === "manual") ?? null;
    const result = await window.praxis.email.importMessages({
      sourceSystem: "manual_json",
      connectionId: manualConnection?.id,
      messages: messages as ImportEmailMessagesInput["messages"],
    });
    await loadSettingsModel();
    setStatus(result.message);
  };

  const acceptEmailSuggestion = async (suggestionId: string, mode: "todo" | "project") => {
    const result = await window.praxis.email.acceptSuggestion({ suggestionId, mode });
    await loadSettingsModel();
    setStatus(result.message);
  };

  const dismissEmailSuggestion = async (suggestionId: string) => {
    const result = await window.praxis.email.dismissSuggestion({ suggestionId });
    await loadSettingsModel();
    setStatus(result.message);
  };

  const updateSlackSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSettings = await window.praxis.settings.updateSlack(slackForm);
    const nextSlackStatus = await window.praxis.slack.getStatus();
    setSettingsSnapshot(nextSettings);
    setSlackStatus(nextSlackStatus);
    setSlackForm({
      operatorChannelId: nextSettings.slack.operatorChannelId ?? "",
      proactiveMirroringEnabled: nextSettings.slack.proactiveMirroringEnabled,
    });
    setStatus("Slack settings saved.");
  };

  const updateCalendarAutoSync = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSettings = await window.praxis.settings.updateCalendarAutoSync(calendarAutoSyncForm);
    setSettingsSnapshot(nextSettings);
    setCalendarAutoSyncForm(nextSettings.calendarAutoSync);
    setStatus(
      nextSettings.calendarAutoSync.enabled
        ? `Calendar auto-sync saved: every ${nextSettings.calendarAutoSync.intervalMinutes} minutes.`
        : "Calendar auto-sync paused. Manual calendar sync still works."
    );
  };

  const updateGoogleOAuthSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSettings = await window.praxis.settings.updateGoogleOAuth(googleOAuthForm);
    const nextGoogleOAuthReadiness = await window.praxis.calendar.getGoogleOAuthReadiness();
    setSettingsSnapshot(nextSettings);
    setGoogleOAuthReadiness(nextGoogleOAuthReadiness);
    setGoogleOAuthForm({
      clientId: nextSettings.googleOAuth.clientId ?? "",
      clientSecret: "",
      clearClientSecret: false,
      redirectUri: nextSettings.googleOAuth.redirectUri ?? "",
    });
    setStatus(
      nextGoogleOAuthReadiness.ready
        ? "Google OAuth settings saved. You can connect Google now."
        : nextGoogleOAuthReadiness.message
    );
  };

  const updateOutlookOAuthSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSettings = await window.praxis.settings.updateOutlookOAuth(outlookOAuthForm);
    const [nextOutlookCalendarReadiness, nextOutlookEmailReadiness] = await Promise.all([
      window.praxis.calendar.getOutlookOAuthReadiness(),
      window.praxis.email.getOutlookOAuthReadiness(),
    ]);
    setSettingsSnapshot(nextSettings);
    setOutlookOAuthReadiness(nextOutlookCalendarReadiness);
    setOutlookEmailOAuthReadiness(nextOutlookEmailReadiness);
    setOutlookOAuthForm({
      clientId: nextSettings.outlookOAuth.clientId ?? "",
      clientSecret: "",
      clearClientSecret: false,
    });
    setStatus(
      nextOutlookCalendarReadiness.ready && nextOutlookEmailReadiness.ready
        ? "Outlook app settings saved. You can connect Outlook now."
        : [nextOutlookCalendarReadiness.message, nextOutlookEmailReadiness.message]
            .filter((value, index, values) => values.indexOf(value) === index)
            .join(" ")
    );
  };

  const sendSlackTestSuggestion = async () => {
    const result = await window.praxis.slack.sendTestSuggestion();
    setSlackStatus(await window.praxis.slack.getStatus());
    setStatus(result.ok ? result.message : result.reason);
  };

  const sendSlackConnectionTest = async () => {
    const result = await window.praxis.slack.sendConnectionTest();
    setSlackStatus(await window.praxis.slack.getStatus());
    setStatus(result.ok ? result.message : result.reason);
  };

  const restartSlackAdapter = async () => {
    const result = await window.praxis.slack.restart();
    setSlackStatus(await window.praxis.slack.getStatus());
    setStatus(result.ok ? result.message : result.reason);
  };

  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));
  const missionById = new Map(snapshot.missions.map((mission) => [mission.id, mission]));
  const renderTodoContextBadges = (projectId: string | null) => {
    if (!projectId) {
      return <span className="badge">quick</span>;
    }

    const project = projectById.get(projectId);
    const mission = project?.missionId ? missionById.get(project.missionId) : null;
    return (
      <>
        {project ? <span className="badge">project: {project.title}</span> : null}
        {mission ? <span className="badge">mission: {mission.title}</span> : null}
      </>
    );
  };

  const renderStatusActions = (
    entityKind: "mission" | "project" | "todo" | "deadline",
    id: string,
    currentStatus: WorkStatus
  ) => (
    <span className="inline-actions">
      {currentStatus !== "completed" ? (
        <button type="button" onClick={() => void updateStatus(entityKind, id, "completed")}>
          Complete
        </button>
      ) : (
        <button type="button" onClick={() => void updateStatus(entityKind, id, "active")}>
          Reactivate
        </button>
      )}
      {currentStatus !== "paused" && currentStatus !== "completed" ? (
        <button type="button" onClick={() => void updateStatus(entityKind, id, "paused")}>
          Pause
        </button>
      ) : null}
    </span>
  );

  const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "google", label: "Google" },
    { id: "outlook", label: "Outlook" },
    { id: "ai", label: "AI" },
    { id: "slack", label: "Slack" },
    { id: "icsImport", label: "Import With ICS" },
    { id: "people", label: "People" },
    { id: "storage", label: "Storage" },
  ];
  const allPersonContactSuggestions = buildPersonContactSuggestions(snapshot.people, emailSnapshot.messages);
  const activePersonContactSuggestions: PersonContactSuggestion[] = [];
  const dismissedPersonContactSuggestions: Array<
    PersonContactSuggestion & { dismissedAt: string }
  > = [];

  for (const suggestion of allPersonContactSuggestions) {
    const dismissal = emailSnapshot.contactSuggestionDismissals.find(
      (candidate) =>
        candidate.personId === suggestion.personId &&
        candidate.field === suggestion.field &&
        candidate.inferredValue.toLowerCase() === suggestion.inferredValue.toLowerCase()
    );

    if (dismissal) {
      dismissedPersonContactSuggestions.push({
        ...suggestion,
        dismissedAt: dismissal.dismissedAt,
      });
      continue;
    }

    activePersonContactSuggestions.push(suggestion);
  }

  const acceptSuggestedContact = async (
    personId: string,
    field: PersonContactSuggestionField,
    inferredValue: string
  ) => {
    const person = snapshot.people.find((candidate) => candidate.id === personId);
    if (!person) {
      setStatus("That person could not be found.");
      return;
    }

    await window.praxis.work.updateRecord({
      entityKind: "person",
      id: person.id,
      name: person.name,
      aliases: person.aliases,
      roleSummary: person.roleSummary ?? "",
      email: field === "email" ? inferredValue : person.email ?? "",
      phone: field === "phone" ? inferredValue : person.phone ?? "",
      billingAddress:
        field === "billingAddress" ? inferredValue : person.billingAddress ?? "",
      notes: person.notes ?? "",
    });
    await loadSettingsModel();
    const fieldLabel =
      field === "billingAddress"
        ? "billing address"
        : field === "phone"
          ? "phone"
          : "email";
    setStatus(`Saved ${fieldLabel} to ${person.name}.`);
  };

  const dismissContactSuggestion = async (
    personId: string,
    field: PersonContactSuggestionField,
    inferredValue: string
  ) => {
    const result = await window.praxis.email.dismissContactSuggestion({
      personId,
      field,
      inferredValue,
    });
    await loadSettingsModel();
    setStatus(result.message);
  };

  const restoreContactSuggestion = async (
    personId: string,
    field: PersonContactSuggestionField,
    inferredValue: string
  ) => {
    const result = await window.praxis.email.restoreContactSuggestion({
      personId,
      field,
      inferredValue,
    });
    await loadSettingsModel();
    setStatus(result.message);
  };

  const reindexMemory = async () => {
    setMemoryReindexing(true);
    try {
      const report = await window.praxis.storage.reindexMemory();
      setStorageOverview(await window.praxis.storage.getOverview());
      setStatus(
        `Markdown memory index refreshed: scanned ${report.index.scannedMarkdownCount}, indexed ${report.index.indexedDocumentCount}, removed ${report.index.removedStaleIndexCount} stale rows.`
      );
    } catch {
      setStatus("Praxis could not refresh the markdown memory index.");
    } finally {
      setMemoryReindexing(false);
    }
  };

  return (
    <main className="settings-window">
      <section className="panel settings-panel is-active-panel">
        <h2>Praxis Settings</h2>
        <p className="brief-path">
          Configure calendars, Slack mirroring, people records, and local storage health here.
        </p>
        <div className="filter-actions">
          <button type="button" onClick={() => void loadSettingsModel()}>
            Refresh Settings
          </button>
        </div>
        <nav className="settings-tab-nav" aria-label="Settings sections">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "is-nav-active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <p className="capture-status">{status}</p>

        {activeTab === "slack" ? (
          <SlackSettingsPanel
            settingsSnapshot={settingsSnapshot}
            slackStatus={slackStatus}
            slackForm={slackForm}
            setSlackForm={setSlackForm}
            updateSlackSettings={updateSlackSettings}
            restartSlackAdapter={restartSlackAdapter}
            sendSlackConnectionTest={sendSlackConnectionTest}
            sendSlackTestSuggestion={sendSlackTestSuggestion}
          />
        ) : null}

        {activeTab === "ai" ? <AiSettingsPanel /> : null}

        {activeTab === "google" ? (
          <ConnectedServiceSettingsPanel
            service="google"
            settingsSnapshot={settingsSnapshot}
            emailSnapshot={emailSnapshot}
            calendarOAuthReadiness={googleOAuthReadiness}
            emailOAuthReadiness={gmailOAuthReadiness}
            googleOAuthForm={googleOAuthForm}
            outlookOAuthForm={outlookOAuthForm}
            emailForm={emailForm}
            emailImportText={emailImportText}
            calendarForm={calendarForm}
            calendarAutoSyncForm={calendarAutoSyncForm}
            formatDateTime={formatDateTime}
            setEmailForm={setEmailForm}
            setEmailImportText={setEmailImportText}
            setCalendarForm={setCalendarForm}
            setCalendarAutoSyncForm={setCalendarAutoSyncForm}
            setGoogleOAuthForm={setGoogleOAuthForm}
            setOutlookOAuthForm={setOutlookOAuthForm}
            createServiceEmailConnection={createServiceEmailConnection}
            createServiceCalendarConnection={createServiceCalendarConnection}
            deleteEmailConnection={deleteEmailConnection}
            updateEmailConnection={updateEmailConnection}
            deleteCalendarConnection={deleteCalendarConnection}
            updateCalendarConnection={updateCalendarConnection}
            updateCalendarAutoSync={updateCalendarAutoSync}
            updateGoogleOAuthSettings={updateGoogleOAuthSettings}
            updateOutlookOAuthSettings={updateOutlookOAuthSettings}
            prepareEmailOAuth={prepareGmailOAuth}
            prepareCalendarOAuth={prepareGoogleOAuth}
            syncEmail={syncGoogleInbox}
            syncCalendar={syncGoogleCalendar}
            importEmailJson={importEmailJson}
            acceptSuggestion={acceptEmailSuggestion}
            dismissSuggestion={dismissEmailSuggestion}
          />
        ) : null}

        {activeTab === "outlook" ? (
          <ConnectedServiceSettingsPanel
            service="outlook"
            settingsSnapshot={settingsSnapshot}
            emailSnapshot={emailSnapshot}
            calendarOAuthReadiness={outlookOAuthReadiness}
            emailOAuthReadiness={outlookEmailOAuthReadiness}
            googleOAuthForm={googleOAuthForm}
            outlookOAuthForm={outlookOAuthForm}
            emailForm={emailForm}
            emailImportText={emailImportText}
            calendarForm={calendarForm}
            calendarAutoSyncForm={calendarAutoSyncForm}
            formatDateTime={formatDateTime}
            setEmailForm={setEmailForm}
            setEmailImportText={setEmailImportText}
            setCalendarForm={setCalendarForm}
            setCalendarAutoSyncForm={setCalendarAutoSyncForm}
            setGoogleOAuthForm={setGoogleOAuthForm}
            setOutlookOAuthForm={setOutlookOAuthForm}
            createServiceEmailConnection={createServiceEmailConnection}
            createServiceCalendarConnection={createServiceCalendarConnection}
            deleteEmailConnection={deleteEmailConnection}
            updateEmailConnection={updateEmailConnection}
            deleteCalendarConnection={deleteCalendarConnection}
            updateCalendarConnection={updateCalendarConnection}
            updateCalendarAutoSync={updateCalendarAutoSync}
            updateGoogleOAuthSettings={updateGoogleOAuthSettings}
            updateOutlookOAuthSettings={updateOutlookOAuthSettings}
            prepareEmailOAuth={prepareOutlookEmailOAuth}
            prepareCalendarOAuth={prepareOutlookOAuth}
            syncEmail={syncOutlookInbox}
            syncCalendar={syncOutlookCalendar}
            importEmailJson={importEmailJson}
            acceptSuggestion={acceptEmailSuggestion}
            dismissSuggestion={dismissEmailSuggestion}
          />
        ) : null}

        {activeTab === "icsImport" ? (
          <CalendarSettingsPanel
            section="ics"
            settingsSnapshot={settingsSnapshot}
            googleOAuthReadiness={googleOAuthReadiness}
            outlookOAuthReadiness={outlookOAuthReadiness}
            calendarForm={calendarForm}
            calendarAutoSyncForm={calendarAutoSyncForm}
            googleOAuthForm={googleOAuthForm}
            calendarImportSource={calendarImportSource}
            calendarImportText={calendarImportText}
            formatDateTime={formatDateTime}
            setCalendarForm={setCalendarForm}
            setCalendarAutoSyncForm={setCalendarAutoSyncForm}
            setGoogleOAuthForm={setGoogleOAuthForm}
            setCalendarImportSource={setCalendarImportSource}
            setCalendarImportText={setCalendarImportText}
            createCalendarConnection={createCalendarConnection}
            updateCalendarAutoSync={updateCalendarAutoSync}
            updateGoogleOAuthSettings={updateGoogleOAuthSettings}
            deleteCalendarConnection={deleteCalendarConnection}
            prepareGoogleOAuth={prepareGoogleOAuth}
            prepareOutlookOAuth={prepareOutlookOAuth}
            syncGoogleCalendar={syncGoogleCalendar}
            syncOutlookCalendar={syncOutlookCalendar}
            importIcsCalendar={importIcsCalendar}
            importCalendarJson={importCalendarJson}
          />
        ) : null}

        {activeTab === "people" ? (
          <>
            <PeopleProfilePanel
              snapshot={snapshot}
              contactSuggestions={activePersonContactSuggestions}
              dismissedContactSuggestions={dismissedPersonContactSuggestions}
              selectedPersonId={selectedPersonId}
              personLinkForm={personLinkForm}
              formatDateTime={formatDateTime}
              setSelectedPersonId={setSelectedPersonId}
              setEditingPerson={setEditingPerson}
              setPersonLinkForm={setPersonLinkForm}
              createPersonLink={createPersonLink}
              acceptSuggestedContact={acceptSuggestedContact}
              dismissContactSuggestion={dismissContactSuggestion}
              restoreContactSuggestion={restoreContactSuggestion}
              deletePersonLink={deletePersonLink}
              deleteRecord={deleteRecord}
              renderTodoContextBadges={renderTodoContextBadges}
              renderStatusActions={renderStatusActions}
            />

            <WorkEditPanels
              snapshot={snapshot}
              editingMission={editingMission}
              editingProject={editingProject}
              editingDeadline={editingDeadline}
              editingTodo={editingTodo}
              editingPerson={editingPerson}
              editingAppointment={editingAppointment}
              setEditingMission={setEditingMission}
              setEditingProject={setEditingProject}
              setEditingDeadline={setEditingDeadline}
              setEditingTodo={setEditingTodo}
              setEditingPerson={setEditingPerson}
              setEditingAppointment={setEditingAppointment}
              saveMissionEdit={unavailableEdit}
              saveProjectEdit={unavailableEdit}
              saveDeadlineEdit={unavailableEdit}
              saveTodoEdit={unavailableEdit}
              savePersonEdit={savePersonEdit}
              saveAppointmentEdit={unavailableEdit}
            />
          </>
        ) : null}

        {activeTab === "storage" ? (
          <>
            <h3>Storage Health</h3>
            {storageOverview ? (
              <>
                <p>
                  Schema v{storageOverview.schemaVersion}; indexed markdown documents:{" "}
                  {storageOverview.indexedDocumentCount}.
                </p>
                <p className="brief-path">Memory root: {storageOverview.memoryRoot}</p>
                <div className="filter-actions">
                  <button type="button" onClick={() => void reindexMemory()} disabled={memoryReindexing}>
                    {memoryReindexing ? "Reindexing..." : "Reindex Markdown Memory"}
                  </button>
                </div>
              </>
            ) : (
              <p>Storage overview unavailable.</p>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
