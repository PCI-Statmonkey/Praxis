import type { WorkEntityKind } from "./workModel";

export type AssistantContextActionCommand =
  | "complete"
  | "pause"
  | "reactivate"
  | "update_due_date"
  | "assign_waiting_on"
  | "clear_waiting_on"
  | "open_focus_report";

export type AssistantContextAction = {
  actionId: string;
  ordinal: number;
  title: string;
  entityKind: WorkEntityKind;
  entityId: string;
  command: AssistantContextActionCommand;
  dueAt?: string;
  personId?: string;
};

export type StoreAssistantContextInput = {
  surface: string;
  threadId?: string;
  expireSurfaces?: string[];
  title: string;
  actions: AssistantContextAction[];
};

export type ResolveAssistantContextInput = {
  surface: string;
  threadId?: string;
  text: string;
};

export type ResolveAssistantContextResult =
  | {
      ok: true;
      action: AssistantContextAction;
      message: string;
    }
  | {
      ok: false;
      reason: string;
    };

export const ASSISTANT_CONTEXT_DECLINE_REASON = "Okay. I will leave it alone.";

export const shouldStopAssistantContextTraversal = (
  result: ResolveAssistantContextResult
) => result.ok || result.reason === ASSISTANT_CONTEXT_DECLINE_REASON;

export type AssistantContextActionSurface =
  | "work_update_confirmation"
  | "work_lookup"
  | "focus_report"
  | "daily_report"
  | "proactive_suggestion";

export const assistantContextActionSurfaces = (
  options: { includeFocusReport?: boolean } = {}
): AssistantContextActionSurface[] => {
  const includeFocusReport = options.includeFocusReport ?? true;
  const surfaces: AssistantContextActionSurface[] = [
    "work_update_confirmation",
    "work_lookup",
  ];

  if (includeFocusReport) {
    surfaces.push("focus_report");
  }

  surfaces.push("daily_report", "proactive_suggestion");
  return surfaces;
};
