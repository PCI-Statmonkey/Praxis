import type {
  AppointmentRecord,
  CreateAppointmentInput,
  CreateMissionInput,
  CreateTodoInput,
  MissionRecord,
  TodoRecord,
  WorkSnapshot,
} from "./workModel";

export type CaptureIntent = "appointment" | "todo" | "mission" | "unresolved";

export type CaptureMode = "auto" | "preview" | "confirm";

export type CaptureCandidate =
  | {
      intent: "appointment";
      input: CreateAppointmentInput;
      confidence: number;
      reason: string;
      requiresConfirmation?: boolean;
      confirmationOptions?: Exclude<CaptureIntent, "unresolved">[];
    }
  | {
      intent: "todo";
      input: CreateTodoInput;
      confidence: number;
      reason: string;
      requiresConfirmation?: boolean;
      confirmationOptions?: Exclude<CaptureIntent, "unresolved">[];
      matchedProjectId?: string;
      matchedProjectTitle?: string;
      matchedMissionId?: string;
      matchedMissionTitle?: string;
      matchedPersonId?: string;
      matchedPersonName?: string;
    }
  | {
      intent: "mission";
      input: CreateMissionInput;
      confidence: number;
      reason: string;
      requiresConfirmation?: boolean;
      confirmationOptions?: Exclude<CaptureIntent, "unresolved">[];
    }
  | {
      intent: "unresolved";
      confidence: number;
      reason: string;
    };

export type CaptureRequest = {
  text: string;
  mode?: CaptureMode;
  forcedIntent?: Exclude<CaptureIntent, "unresolved">;
};

export type SaveCaptureCandidateRequest =
  | {
      intent: "appointment";
      input: CreateAppointmentInput;
      originalText?: string;
    }
  | {
      intent: "todo";
      input: CreateTodoInput;
      originalText?: string;
    }
  | {
      intent: "mission";
      input: CreateMissionInput;
      originalText?: string;
    };

export type CaptureResult = {
  ok: boolean;
  originalText: string;
  candidate: CaptureCandidate;
  createdRecord?: AppointmentRecord | TodoRecord | MissionRecord;
  snapshot?: WorkSnapshot;
  message: string;
};
