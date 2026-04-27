import { useState, type Dispatch, type FormEvent, type RefObject, type SetStateAction } from "react";
import type { DailyBrief, FocusReport } from "../../shared/dailyBrief";
import type { AppointmentReport } from "../../shared/appointmentReport";
import type { CaptureIntent, CaptureResult } from "../../shared/naturalLanguageCapture";
import type { ProactiveSuggestion } from "../../shared/proactiveSuggestion";
import type { WorkSnapshot } from "../../shared/workModel";
import { answerFocusReportFollowUp } from "../../shared/focusReportFollowUp";
import {
  createAssistantOperationalActions,
  storeProactiveSuggestionContext,
  storeReportContext,
} from "./assistantOperationalActions";
import { draftFromResult, type CaptureDraft } from "./assistantCaptureDraft";
import { handleAssistantRoute } from "./assistantRouteHandlers";

export { storeProactiveSuggestionContext, storeReportContext };

type PanelId = "projectStack" | "todayTimeline" | "morningPlan" | "masterChecklist" | "memory";

const EMPTY_APPOINTMENT_REPORT: AppointmentReport = {
  generatedAt: "",
  range: "upcoming",
  title: "Upcoming Appointments",
  spokenSummary: "Appointment report unavailable.",
  appointments: [],
  thereIsMore: false,
};

type UseAssistantCaptureOptions = {
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
  setStatus: Dispatch<SetStateAction<string>>;
  loadWorkModel: () => Promise<void>;
  todayTimelineRef: RefObject<HTMLElement | null>;
};

export function useAssistantCapture({
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
  setStatus,
  loadWorkModel,
  todayTimelineRef,
}: UseAssistantCaptureOptions) {
  const [appointmentReport, setAppointmentReport] = useState<AppointmentReport>(
    EMPTY_APPOINTMENT_REPORT
  );
  const [showAppointmentReport, setShowAppointmentReport] = useState(false);
  const [assistantReply, setAssistantReply] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [captureStatus, setCaptureStatus] = useState("Try: Doctor appointment tomorrow at 9.");
  const [pendingCapture, setPendingCapture] = useState<CaptureResult | null>(null);
  const [captureDraft, setCaptureDraft] = useState<CaptureDraft | null>(null);

  const { refreshOperationalViews, updateStatus, updateDueDate, clearWaitingOn, assignWaitingOn } =
    createAssistantOperationalActions({
      snapshot,
      setSnapshot,
      setDailyBrief,
      setProactiveSuggestion,
      setStatus,
      setCaptureStatus,
    });

  const captureNaturalLanguage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!captureText.trim()) {
      setCaptureStatus("Talk to Praxis first.");
      return;
    }

    const focusFollowUp = answerFocusReportFollowUp(captureText, focusReport);
    if (focusFollowUp.matched) {
      setAssistantReply(focusFollowUp.message);
      setCaptureStatus(focusFollowUp.message);
      setShowStatusReport(true);
      setShowFocusDetails(true);
      setPendingCapture(null);
      setCaptureDraft(null);
      setCaptureText("");
      return;
    }

    const route = await window.praxis.assistant.route({ text: captureText, surface: "desktop" });
    const handled = await handleAssistantRoute({
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
    });

    if (handled) {
      return;
    }

    const result = await window.praxis.capture.naturalLanguage({ text: captureText, mode: "preview" });
    setCaptureStatus(result.message);
    setPendingCapture(result.candidate.intent !== "unresolved" ? result : null);
    setCaptureDraft(draftFromResult(result));
  };

  const confirmCapture = async (forcedIntent: Exclude<CaptureIntent, "unresolved">) => {
    if (!pendingCapture) {
      return;
    }

    const result = await window.praxis.capture.naturalLanguage({
      text: pendingCapture.originalText,
      mode: "preview",
      forcedIntent,
    });
    setCaptureStatus(result.message);
    setPendingCapture(result.candidate.intent !== "unresolved" ? result : null);
    setCaptureDraft(draftFromResult(result));
  };

  const saveCaptureDraft = async () => {
    if (!captureDraft) {
      return;
    }

    const result = await window.praxis.capture.saveCandidate(captureDraft);
    setCaptureStatus(result.message);
    setPendingCapture(null);
    setCaptureDraft(null);
    setCaptureText("");
    await loadWorkModel();
  };

  const pendingConfirmationOptions =
    pendingCapture?.candidate.intent !== "unresolved"
      ? pendingCapture?.candidate.confirmationOptions ?? []
      : [];

  return {
    appointmentReport,
    showAppointmentReport,
    assistantReply,
    captureText,
    captureStatus,
    pendingCapture,
    captureDraft,
    pendingConfirmationOptions,
    setCaptureText,
    setCaptureStatus,
    setPendingCapture,
    setCaptureDraft,
    captureNaturalLanguage,
    confirmCapture,
    saveCaptureDraft,
    updateStatus,
    updateDueDate,
    clearWaitingOn,
    assignWaitingOn,
    refreshOperationalViews,
  };
}
