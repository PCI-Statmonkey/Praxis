import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  assistantContextActionSurfaces,
  shouldStopAssistantContextTraversal,
} from "../../shared/assistantContext";
import type { AppointmentReport } from "../../shared/appointmentReport";
import type { DailyBrief, FocusReport } from "../../shared/dailyBrief";
import type { AssistantRouteResult } from "../../shared/assistantRouter";
import type { CaptureResult } from "../../shared/naturalLanguageCapture";
import {
  buildBestProactiveSuggestion,
  type ProactiveSuggestion,
} from "../../shared/proactiveSuggestion";
import { buildWorkLookupActions } from "../../shared/workLookupContext";
import type { WorkSnapshot, WorkStatus } from "../../shared/workModel";
import type { CaptureDraft } from "./assistantCaptureDraft";
import { storeProactiveSuggestionContext, storeReportContext } from "./assistantOperationalActions";

type PanelId = "projectStack" | "todayTimeline" | "morningPlan" | "masterChecklist" | "memory";

type AssistantRouteHandlerOptions = {
  route: AssistantRouteResult;
  captureText: string;
  snapshot: WorkSnapshot;
  focusReport: FocusReport | null;
  setSnapshot: Dispatch<SetStateAction<WorkSnapshot>>;
  setDailyBrief: Dispatch<SetStateAction<DailyBrief>>;
  setProactiveSuggestion: Dispatch<SetStateAction<ProactiveSuggestion | null>>;
  setFocusSelection: Dispatch<SetStateAction<string>>;
  setFocusReport: Dispatch<SetStateAction<FocusReport | null>>;
  setShowFocusDetails: Dispatch<SetStateAction<boolean>>;
  setShowBriefDetails: Dispatch<SetStateAction<boolean>>;
  setShowStatusReport: Dispatch<SetStateAction<boolean>>;
  setActivePanel: Dispatch<SetStateAction<PanelId>>;
  setAppointmentReport: Dispatch<SetStateAction<AppointmentReport>>;
  setShowAppointmentReport: Dispatch<SetStateAction<boolean>>;
  setAssistantReply: Dispatch<SetStateAction<string>>;
  setCaptureText: Dispatch<SetStateAction<string>>;
  setCaptureStatus: Dispatch<SetStateAction<string>>;
  setPendingCapture: Dispatch<SetStateAction<CaptureResult | null>>;
  setCaptureDraft: Dispatch<SetStateAction<CaptureDraft | null>>;
  updateStatus: (
    entityKind: "mission" | "project" | "todo" | "deadline",
    id: string,
    status: WorkStatus
  ) => Promise<void>;
  updateDueDate: (entityKind: "todo" | "deadline", id: string, dueAt: string) => Promise<void>;
  clearWaitingOn: (todoId: string, message: string) => Promise<void>;
  assignWaitingOn: (todoId: string, personId: string, message: string) => Promise<void>;
  todayTimelineRef: RefObject<HTMLElement | null>;
};

const clearPendingCapture = ({
  setPendingCapture,
  setCaptureDraft,
}: Pick<AssistantRouteHandlerOptions, "setPendingCapture" | "setCaptureDraft">) => {
  setPendingCapture(null);
  setCaptureDraft(null);
};

const clearPendingCaptureAndText = (
  options: Pick<
    AssistantRouteHandlerOptions,
    "setPendingCapture" | "setCaptureDraft" | "setCaptureText"
  >
) => {
  clearPendingCapture(options);
  options.setCaptureText("");
};

const resolveContextAction = async (captureText: string, focusReport: FocusReport | null) => {
  const surfaces = assistantContextActionSurfaces({ includeFocusReport: Boolean(focusReport) });
  let resolved = await window.praxis.assistant.resolveContext({
    surface: surfaces[0],
    text: captureText,
  });
  for (const surface of surfaces.slice(1)) {
    if (shouldStopAssistantContextTraversal(resolved)) {
      break;
    }
    resolved = await window.praxis.assistant.resolveContext({
      surface,
      text: captureText,
    });
  }
  return resolved;
};

const handleContextActionRoute = async (options: AssistantRouteHandlerOptions) => {
  const {
    captureText,
    focusReport,
    snapshot,
    setFocusSelection,
    setFocusReport,
    setShowFocusDetails,
    setShowStatusReport,
    setCaptureText,
    setCaptureStatus,
    setProactiveSuggestion,
    updateStatus,
    updateDueDate,
    clearWaitingOn,
    assignWaitingOn,
  } = options;

  const resolved = await resolveContextAction(captureText, focusReport);
  if (!resolved.ok) {
    setCaptureStatus(resolved.reason);
    return true;
  }

  if (
    resolved.action.command === "complete" &&
    (resolved.action.entityKind === "mission" ||
      resolved.action.entityKind === "project" ||
      resolved.action.entityKind === "todo" ||
      resolved.action.entityKind === "deadline")
  ) {
    await updateStatus(resolved.action.entityKind, resolved.action.entityId, "completed");
    setProactiveSuggestion(null);
    setCaptureStatus(resolved.message);
    setCaptureText("");
    return true;
  }

  if (
    resolved.action.command === "pause" &&
    (resolved.action.entityKind === "mission" ||
      resolved.action.entityKind === "project" ||
      resolved.action.entityKind === "todo" ||
      resolved.action.entityKind === "deadline")
  ) {
    await updateStatus(resolved.action.entityKind, resolved.action.entityId, "paused");
    setCaptureStatus(resolved.message);
    setCaptureText("");
    return true;
  }

  if (
    resolved.action.command === "reactivate" &&
    (resolved.action.entityKind === "mission" ||
      resolved.action.entityKind === "project" ||
      resolved.action.entityKind === "todo" ||
      resolved.action.entityKind === "deadline")
  ) {
    await updateStatus(resolved.action.entityKind, resolved.action.entityId, "active");
    setCaptureStatus(resolved.message);
    setCaptureText("");
    return true;
  }

  if (resolved.action.command === "update_due_date" && resolved.action.dueAt) {
    if (resolved.action.entityKind === "todo" || resolved.action.entityKind === "deadline") {
      await updateDueDate(
        resolved.action.entityKind,
        resolved.action.entityId,
        resolved.action.dueAt
      );
      setCaptureStatus(resolved.message);
      setCaptureText("");
      return true;
    }
  }

  if (resolved.action.command === "clear_waiting_on" && resolved.action.entityKind === "todo") {
    await clearWaitingOn(resolved.action.entityId, resolved.message);
    setCaptureStatus(resolved.message);
    setCaptureText("");
    return true;
  }

  if (
    resolved.action.command === "assign_waiting_on" &&
    resolved.action.entityKind === "todo" &&
    resolved.action.personId
  ) {
    await assignWaitingOn(resolved.action.entityId, resolved.action.personId, resolved.message);
    setCaptureStatus(resolved.message);
    setCaptureText("");
    return true;
  }

  if (
    resolved.action.command === "open_focus_report" &&
    (resolved.action.entityKind === "mission" || resolved.action.entityKind === "project")
  ) {
    const report = await window.praxis.brief.getFocusReport({
      entityKind: resolved.action.entityKind,
      entityId: resolved.action.entityId,
    });
    if (!report) {
      setCaptureStatus("I matched the focus report, but that work item was no longer available.");
      return true;
    }
    setFocusSelection(`${resolved.action.entityKind}:${resolved.action.entityId}`);
    setFocusReport(report);
    setShowFocusDetails(false);
    setShowStatusReport(true);
    await storeReportContext("focus_report", snapshot, report.title, report.topItems);
    setCaptureStatus(resolved.message);
    setCaptureText("");
    return true;
  }

  setCaptureStatus("That report item cannot be completed from here yet.");
  return true;
};

export const handleAssistantRoute = async (options: AssistantRouteHandlerOptions) => {
  const {
    route,
    captureText,
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
    setActivePanel,
    setAppointmentReport,
    setShowAppointmentReport,
    setAssistantReply,
    setCaptureText,
    setCaptureStatus,
    setPendingCapture,
    setCaptureDraft,
    updateStatus,
    updateDueDate,
    clearWaitingOn,
    assignWaitingOn,
    todayTimelineRef,
  } = options;

  if (route.intent === "focus_report") {
    const report = await window.praxis.brief.getFocusReport({
      entityKind: route.entityKind,
      entityId: route.entityId,
    });
    setFocusSelection(`${route.entityKind}:${route.entityId}`);
    setFocusReport(report);
    setShowFocusDetails(false);
    setShowStatusReport(true);
    if (report) {
      await storeReportContext("focus_report", snapshot, report.title, report.topItems);
    }
    setCaptureStatus(route.message);
    clearPendingCaptureAndText({ setPendingCapture, setCaptureDraft, setCaptureText });
    return true;
  }

  if (route.intent === "tell_more") {
    if (focusReport) {
      setShowFocusDetails(true);
      setShowStatusReport(true);
      setCaptureStatus(`Expanded the ${focusReport.title} focus report.`);
    } else {
      setShowBriefDetails(true);
      setShowStatusReport(true);
      setCaptureStatus("Expanded the daily status report.");
    }
    clearPendingCaptureAndText({ setPendingCapture, setCaptureDraft, setCaptureText });
    return true;
  }

  if (route.intent === "daily_report") {
    await window.praxis.calendar.autoSyncNow({
      triggeredBy: "user_request",
      force: true,
    });
    const nextBrief = await window.praxis.brief.getDaily();
    const nextSuggestion = buildBestProactiveSuggestion(snapshot, nextBrief.priorityItems);
    setDailyBrief(nextBrief);
    await storeReportContext("daily_report", snapshot, "Daily Brief", nextBrief.priorityItems);
    setProactiveSuggestion(nextSuggestion);
    await storeProactiveSuggestionContext(nextSuggestion);
    setShowStatusReport(true);
    setShowBriefDetails(false);
    setShowAppointmentReport(false);
    setFocusReport(null);
    setCaptureStatus(route.message);
    clearPendingCaptureAndText({ setPendingCapture, setCaptureDraft, setCaptureText });
    return true;
  }

  if (route.intent === "appointment_report") {
    const report = await window.praxis.brief.getAppointmentReport({ range: route.range });
    const nextSnapshot = await window.praxis.work.getSnapshot();
    setSnapshot(nextSnapshot);
    setAppointmentReport(report);
    setShowAppointmentReport(report.appointments.length > 0);
    setShowStatusReport(report.appointments.length > 0);
    setShowBriefDetails(false);
    setFocusReport(null);
    if (report.appointments.length > 0) {
      setActivePanel("todayTimeline");
      window.setTimeout(() => {
        todayTimelineRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
    }
    setAssistantReply(report.spokenSummary);
    setCaptureStatus(
      `${route.message} Found ${report.appointments.length} ${report.range} appointment${report.appointments.length === 1 ? "" : "s"}.`
    );
    clearPendingCaptureAndText({ setPendingCapture, setCaptureDraft, setCaptureText });
    return true;
  }

  if (route.intent === "conversation_review") {
    setActivePanel("morningPlan");
    setAssistantReply(route.message);
    setCaptureStatus(route.message);
    clearPendingCapture({ setPendingCapture, setCaptureDraft });
    return true;
  }

  if (route.intent === "unresolved") {
    setCaptureStatus(route.message);
    clearPendingCapture({ setPendingCapture, setCaptureDraft });
    return true;
  }

  if (route.intent === "context_action") {
    return handleContextActionRoute(options);
  }

  if (route.intent === "person_lookup") {
    const lookup = await window.praxis.assistant.lookupPerson({ text: captureText });
    setAssistantReply(lookup.ok ? lookup.message : "");
    setCaptureStatus(lookup.ok ? lookup.message : lookup.reason);
    clearPendingCapture({ setPendingCapture, setCaptureDraft });
    if (lookup.ok) {
      setCaptureText("");
    }
    return true;
  }

  if (route.intent === "work_lookup") {
    const lookup = await window.praxis.assistant.lookupWork({ text: captureText });
    setAssistantReply(lookup.ok ? lookup.message : "");
    setCaptureStatus(lookup.ok ? lookup.message : lookup.reason);
    clearPendingCapture({ setPendingCapture, setCaptureDraft });
    if (lookup.ok) {
      const actions = buildWorkLookupActions(lookup, snapshot);
      if (actions.length > 0) {
        await window.praxis.assistant.storeContext({
          surface: "work_lookup",
          title: `Work Lookup: ${lookup.kind}`,
          actions,
        });
      }
      setCaptureText("");
    }
    return true;
  }

  if (route.intent === "work_update_status") {
    await updateStatus(route.entityKind, route.entityId, route.status);
    setCaptureStatus(route.message);
    clearPendingCaptureAndText({ setPendingCapture, setCaptureDraft, setCaptureText });
    return true;
  }

  if (route.intent === "work_update_due_date") {
    await updateDueDate(route.entityKind, route.entityId, route.dueAt);
    setCaptureStatus(route.message);
    clearPendingCaptureAndText({ setPendingCapture, setCaptureDraft, setCaptureText });
    return true;
  }

  if (route.intent === "work_clear_waiting_on") {
    await clearWaitingOn(route.todoId, route.message);
    setCaptureStatus(route.message);
    clearPendingCaptureAndText({ setPendingCapture, setCaptureDraft, setCaptureText });
    return true;
  }

  if (route.intent === "work_assign_waiting_on") {
    await assignWaitingOn(route.todoId, route.personId, route.message);
    setCaptureStatus(route.message);
    clearPendingCaptureAndText({ setPendingCapture, setCaptureDraft, setCaptureText });
    return true;
  }

  if (route.intent === "work_update_confirmation") {
    await window.praxis.assistant.storeContext({
      surface: "work_update_confirmation",
      title: route.title,
      actions: route.actions,
    });
    setCaptureStatus(route.message);
    clearPendingCaptureAndText({ setPendingCapture, setCaptureDraft, setCaptureText });
    return true;
  }

  return false;
};
