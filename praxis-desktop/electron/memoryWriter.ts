import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  AppointmentRecord,
  DeadlineRecord,
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
} from "../shared/workModel";
import type {
  EmailMessageRecord,
  EmailSuggestionRecord,
  EmailSuggestionStatus,
} from "../shared/emailModel";
import { resolveMemoryRoot } from "./praxisDb";

const ensureDirectory = (target: string) => {
  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true });
  }
};

const writeMemoryFile = (relativePath: string, content: string) => {
  const memoryRoot = resolveMemoryRoot();
  const targetPath = path.join(memoryRoot, relativePath);
  ensureDirectory(path.dirname(targetPath));
  writeFileSync(targetPath, content, "utf8");
  return relativePath.replace(/\\/g, "/");
};

const formatNullable = (value: string | null) => value ?? "";

const formatBullet = (value: string | null) => (value ? value : "none");

export const missionMarkdownPath = (slug: string) => `missions/${slug}.md`;

export const projectMarkdownPath = (slug: string) => `projects/${slug}.md`;

export const personMarkdownPath = (slug: string) => `people/${slug}.md`;

export const writeMissionMarkdown = (mission: MissionRecord) =>
  writeMemoryFile(
    missionMarkdownPath(mission.slug),
    `# Mission: ${mission.title}

## Summary

${formatNullable(mission.summary)}

## Status

- state: ${mission.status}
- created: ${mission.createdAt}
- last_updated: ${mission.updatedAt}

## Deadline

- due: ${formatBullet(mission.dueAt)}

## Child Projects

- none recorded yet

## People

- none recorded yet

## Risks And Blockers

- none recorded yet

## Next Recommended Actions

- define the next concrete project or task

## Recent Updates

- ${mission.createdAt}: Mission record created by Praxis.
`
  );

export const writeProjectMarkdown = (project: ProjectRecord, missionTitle: string | null) =>
  writeMemoryFile(
    projectMarkdownPath(project.slug),
    `# Project: ${project.title}

## Summary

${formatNullable(project.summary)}

## Parent Mission

- ${missionTitle ?? "none"}

## Status

- state: ${project.status}
- created: ${project.createdAt}
- last_updated: ${project.updatedAt}

## Deadline

- due: ${formatBullet(project.dueAt)}

## Tasks

- none recorded yet

## Blockers

- none recorded yet

## People

- none recorded yet

## Source Links

- none recorded yet

## Next Recommended Actions

- define the next concrete task

## Recent Updates

- ${project.createdAt}: Project record created by Praxis.
`
  );

export const writePersonMarkdown = (person: PersonRecord) =>
  writeMemoryFile(
    personMarkdownPath(person.slug),
    `# Person: ${person.name}

## Role / Context

${formatNullable(person.roleSummary)}

## Aliases

${person.aliases.length > 0 ? person.aliases.map((alias) => `- ${alias}`).join("\n") : "- none"}

## Contact

- Email: ${formatBullet(person.email)}
- Phone: ${formatBullet(person.phone)}
- Billing address: ${formatBullet(person.billingAddress)}

## Notes

${formatNullable(person.notes)}

## Status

- Created: ${person.createdAt}
- Updated: ${person.updatedAt}

## Rules

- SQLite is authoritative for person state
- Use this file for stable relationship/context notes only
- Do not store private message bodies here
`
  );

export const writeTodosSummaryMarkdown = (todos: TodoRecord[]) => {
  const activeTodos = todos.filter((todo) => todo.status !== "completed");
  const body =
    activeTodos.length > 0
      ? activeTodos
          .map(
            (todo) => `- ${todo.title}
  - status: ${todo.status}
  - priority: ${todo.priority}
  - due: ${formatBullet(todo.dueAt)}
  - money_related: ${todo.moneyRelated ? "yes" : "no"}
  - quick_action: ${todo.quickAction ? "yes" : "no"}
  - estimated_minutes: ${todo.estimatedMinutes ?? "none"}
  - waiting_on_person_id: ${todo.waitingOnPersonId ?? "none"}
  - notes: ${formatBullet(todo.notes)}`
          )
          .join("\n")
      : "No active todos recorded yet.";

  return writeMemoryFile(
    "todos/active.md",
    `# Active Todos

## Purpose

This file mirrors active one-shot obligations from SQLite for human-readable review.

## Active

${body}

## Rules

- SQLite is authoritative for todo state
- This file is a generated summary view
- Promote repeated or expanding work into a project if needed
`
  );
};

export const writeDeadlinesSummaryMarkdown = (deadlines: DeadlineRecord[]) => {
  const activeDeadlines = deadlines.filter((deadline) => deadline.status !== "completed");
  const body =
    activeDeadlines.length > 0
      ? activeDeadlines
          .map(
            (deadline) => `- ${deadline.title}
  - due: ${deadline.dueAt}
  - status: ${deadline.status}
  - priority: ${deadline.priority}
  - entity: ${deadline.entityKind}${deadline.entityId ? `/${deadline.entityId}` : ""}`
          )
          .join("\n")
      : "No active deadlines recorded yet.";

  return writeMemoryFile(
    "deadlines/active.md",
    `# Active Deadlines

## Purpose

This file mirrors active deadline records from SQLite for human-readable review.

## Active

${body}

## Rules

- SQLite is authoritative for deadline state
- This file is a generated summary view
- Do not treat this file as the only source of truth
`
  );
};

export const writeAppointmentsSummaryMarkdown = (appointments: AppointmentRecord[]) => {
  const upcomingAppointments = appointments.filter((appointment) => {
    const startsAt = new Date(appointment.startsAt);
    return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() >= Date.now() - 60 * 60 * 1000;
  });
  const body =
    upcomingAppointments.length > 0
      ? upcomingAppointments
          .map(
            (appointment) => `- ${appointment.title}
  - starts: ${appointment.startsAt}
  - ends: ${formatBullet(appointment.endsAt)}
  - all_day: ${appointment.allDay ? "yes" : "no"}
  - source: ${appointment.sourceSystem}
  - notes: ${formatBullet(appointment.notes)}`
          )
          .join("\n")
      : "No upcoming appointments recorded yet.";

  return writeMemoryFile(
    "calendar/appointments.md",
    `# Appointments

## Purpose

This file mirrors upcoming appointment records from SQLite for human-readable review.

## Upcoming

${body}

## Rules

- SQLite is authoritative for appointment time and source metadata
- This file is a generated summary view
- Imported calendar events should store facts, not raw email or calendar body dumps
`
  );
};

const formatSuggestionStatus = (status: EmailSuggestionStatus) => {
  if (status === "created_todo") {
    return "created todo";
  }
  if (status === "created_project") {
    return "created project";
  }
  return status;
};

export const writeEmailFollowUpsMarkdown = (
  suggestions: EmailSuggestionRecord[],
  recentMessages: EmailMessageRecord[]
) => {
  const suggestionBody =
    suggestions.length > 0
      ? suggestions
          .map(
            (suggestion) => `- ${suggestion.title}
  - suggested_kind: ${suggestion.suggestedEntityKind}
  - reason: ${suggestion.reason}
  - confidence: ${suggestion.confidence.toFixed(2)}
  - due: ${formatBullet(suggestion.dueAt)}
  - sender: ${formatBullet(suggestion.senderName ?? suggestion.senderEmail)}
  - matched_person: ${formatBullet(suggestion.matchedPersonName)}
  - subject: ${suggestion.subject}
  - routed_to: ${formatBullet(suggestion.routedTo)}
  - status: ${formatSuggestionStatus(suggestion.status)}`
          )
          .join("\n")
      : "No active email follow-ups flagged yet.";

  const messageBody =
    recentMessages.length > 0
      ? recentMessages
          .map(
            (message) => `- ${message.subject}
  - received: ${message.receivedAt}
  - sender: ${formatBullet(message.senderName ?? message.senderEmail)}
  - matched_person: ${formatBullet(message.matchedPersonName)}
  - source: ${message.sourceSystem}
  - summary: ${formatBullet(message.summary)}`
          )
          .join("\n")
      : "No recent email summaries stored yet.";

  return writeMemoryFile(
    "inbox/email-follow-ups.md",
    `# Email Follow-Ups

## Purpose

This file mirrors privacy-safe email follow-up candidates and recent message summaries from SQLite.

## Pending Suggestions

${suggestionBody}

## Recent Messages

${messageBody}

## Rules

- SQLite is authoritative for connection, message, and suggestion state
- Do not store raw email bodies here
- This file is a generated summary view for the markdown brain
`
  );
};
