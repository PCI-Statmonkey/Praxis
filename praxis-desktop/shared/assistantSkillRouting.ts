import type {
  AssistantRouteResult,
  AssistantRouteSkillReference,
} from "./assistantRouter";
import type { PraxisSkillRegistrySnapshot, PraxisSkillSurface } from "./skillRegistry";

type AssistantRouteIntent = AssistantRouteResult["intent"];

const SKILLS_BY_INTENT: Record<AssistantRouteIntent, string[]> = {
  focus_report: ["work-graph"],
  daily_report: ["daily-brief", "work-graph", "inbox-triage"],
  appointment_report: ["daily-brief"],
  capture: [],
  conversation_review: ["chat-triage"],
  tell_more: ["daily-brief", "work-graph"],
  context_action: ["work-graph", "daily-brief"],
  work_update_status: ["work-graph"],
  work_update_due_date: ["work-graph"],
  work_clear_waiting_on: ["work-graph", "contact-lookup"],
  work_assign_waiting_on: ["work-graph", "contact-lookup"],
  work_update_confirmation: ["work-graph"],
  person_lookup: ["contact-lookup"],
  work_lookup: ["work-graph"],
  unresolved: [],
};

export const SKILL_ALLOWLIST_BY_SURFACE: Record<PraxisSkillSurface, string[]> = {
  desktop: [
    "daily-brief",
    "work-graph",
    "contact-lookup",
    "inbox-triage",
    "email-noise-filter",
    "chat-triage",
  ],
  slack: ["daily-brief", "work-graph", "contact-lookup", "inbox-triage", "chat-triage"],
  voice: ["daily-brief", "work-graph", "contact-lookup"],
  companion: ["daily-brief", "work-graph", "contact-lookup", "inbox-triage", "chat-triage"],
};

const toReference = (skill: PraxisSkillRegistrySnapshot["skills"][number]): AssistantRouteSkillReference => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
  surfaces: skill.surfaces,
  relativePath: skill.relativePath,
});

export const skillIdsForAssistantIntent = (intent: AssistantRouteIntent) =>
  SKILLS_BY_INTENT[intent] ?? [];

export const skillReferencesForAssistantIntent = (
  intent: AssistantRouteIntent,
  registry: PraxisSkillRegistrySnapshot,
  surface: PraxisSkillSurface = "desktop"
) => {
  const wanted = new Set(skillIdsForAssistantIntent(intent));
  const allowed = new Set(SKILL_ALLOWLIST_BY_SURFACE[surface] ?? []);
  return registry.skills
    .filter(
      (skill) =>
        wanted.has(skill.id) &&
        allowed.has(skill.id) &&
        skill.surfaces.includes(surface)
    )
    .map(toReference);
};
