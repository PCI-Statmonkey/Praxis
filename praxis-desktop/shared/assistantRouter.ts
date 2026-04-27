export type AssistantRouteRequest = {
  text: string;
  surface?: import("./skillRegistry").PraxisSkillSurface;
};

export type AssistantRouteSkillReference = {
  id: string;
  name: string;
  description: string;
  surfaces: import("./skillRegistry").PraxisSkillSurface[];
  relativePath: string;
};

export const formatAssistantChoiceReply = (choices: string[]) =>
  `Reply with ${choices.map((choice) => `\`${choice}\``).join(", ")}, or \`no\` to cancel.`;

type AssistantRouteSkillContext = {
  skillReferences?: AssistantRouteSkillReference[];
};

export type AssistantRouteResult = AssistantRouteSkillContext & (
  | {
      intent: "focus_report";
      entityKind: "mission" | "project";
      entityId: string;
      title: string;
      confidence: number;
      message: string;
    }
  | {
      intent: "daily_report";
      confidence: number;
      message: string;
    }
  | {
      intent: "appointment_report";
      range: "today" | "tomorrow" | "upcoming";
      confidence: number;
      message: string;
    }
  | {
      intent: "capture";
      confidence: number;
      message: string;
    }
  | {
      intent: "conversation_review";
      sourceSystem: "slack" | "whatsapp" | "sms" | "manual" | "unknown";
      confidence: number;
      message: string;
    }
  | {
      intent: "tell_more";
      confidence: number;
      message: string;
    }
  | {
      intent: "context_action";
      confidence: number;
      message: string;
    }
  | {
      intent: "work_update_status";
      entityKind: "todo" | "deadline";
      entityId: string;
      title: string;
      status: "completed";
      confidence: number;
      message: string;
    }
  | {
      intent: "work_update_due_date";
      entityKind: "todo" | "deadline";
      entityId: string;
      title: string;
      dueAt: string;
      confidence: number;
      message: string;
    }
  | {
      intent: "work_clear_waiting_on";
      todoId: string;
      todoTitle: string;
      personId: string;
      personName: string;
      confidence: number;
      message: string;
    }
  | {
      intent: "work_assign_waiting_on";
      todoId: string;
      todoTitle: string;
      personId: string;
      personName: string;
      confidence: number;
      message: string;
    }
  | {
      intent: "work_update_confirmation";
      title: string;
      prompt: string;
      actions: import("./assistantContext").AssistantContextAction[];
      confidence: number;
      message: string;
    }
  | {
      intent: "person_lookup";
      confidence: number;
      message: string;
    }
  | {
      intent: "work_lookup";
      confidence: number;
      message: string;
    }
  | {
      intent: "unresolved";
      confidence: number;
      message: string;
    }
);
