import type { AppointmentReport } from "./appointmentReport";
import type { AssistantRouteResult } from "./assistantRouter";
import type { DailyBrief, FocusReport } from "./dailyBrief";
import type { CaptureResult } from "./naturalLanguageCapture";
import type { PersonLookupResult } from "./personLookup";
import type { WorkLookupResult } from "./workLookup";
import type { CompanionSnapshot } from "./companionSnapshot";

export type CompanionCommandRequest = {
  text: string;
  confirmed?: boolean;
  forcedIntent?: "todo" | "appointment" | "mission";
  selectedActionId?: string;
  requestId?: string;
};

export type CompanionCommandConfirmation = {
  required: true;
  reason: string;
  confirmText: string;
};

export type CompanionCommandResult =
  | {
      ok: true;
      status: "answered";
      mode: "read";
      intent: AssistantRouteResult["intent"];
      message: string;
      route: AssistantRouteResult;
      data?:
        | DailyBrief
        | AppointmentReport
        | FocusReport
        | PersonLookupResult
        | WorkLookupResult
        | CaptureResult;
    }
  | {
      ok: true;
      status: "executed";
      mode: "write";
      intent: AssistantRouteResult["intent"] | "capture";
      message: string;
      route?: AssistantRouteResult;
      snapshot: CompanionSnapshot;
    }
  | {
      ok: false;
      status: "requires_confirmation";
      mode: "write";
      intent: AssistantRouteResult["intent"] | "capture";
      message: string;
      route?: AssistantRouteResult;
      confirmation: CompanionCommandConfirmation;
      preview?: CaptureResult;
    }
  | {
      ok: false;
      status: "unsupported" | "unresolved" | "rejected";
      mode: "read" | "write";
      intent?: AssistantRouteResult["intent"] | "capture";
      message: string;
      route?: AssistantRouteResult;
      preview?: CaptureResult;
    };
