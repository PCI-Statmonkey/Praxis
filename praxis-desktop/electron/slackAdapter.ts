import { App as SlackApp, LogLevel } from "@slack/bolt";
import {
  assistantContextActionSurfaces,
  shouldStopAssistantContextTraversal,
  type AssistantContextAction,
} from "../shared/assistantContext";
import type { AppointmentReport } from "../shared/appointmentReport";
import { formatAssistantChoiceReply } from "../shared/assistantRouter";
import type { DailyBrief, DailyBriefItem, FocusReport } from "../shared/dailyBrief";
import type { CaptureIntent, CaptureResult, SaveCaptureCandidateRequest } from "../shared/naturalLanguageCapture";
import { buildBestProactiveSuggestion } from "../shared/proactiveSuggestion";
import type {
  SlackAdapterStatus,
  SlackConnectionTestResult,
  SlackRestartResult,
  SlackTestSuggestionResult,
} from "../shared/slackAdapter";
import type { WorkEntityKind } from "../shared/workModel";
import { buildWorkItemActions, buildWorkLookupActions } from "../shared/workLookupContext";
import { resolveAssistantContextReply, storeAssistantContext } from "./assistantContextRepository";
import { routeAssistantRequest } from "./assistantRouter";
import { generateAppointmentReport } from "./appointmentReport";
import { generateDailyBrief, generateFocusReport } from "./dailyBrief";
import { captureNaturalLanguage, saveCaptureCandidate } from "./naturalLanguageCapture";
import { lookupPerson } from "./personLookup";
import { getSlackSettings } from "./settingsRepository";
import { getWorkSnapshot, updateWorkRecord, updateWorkStatus } from "./workRepository";
import { lookupWork } from "./workLookup";

let slackApp: SlackApp | null = null;
let status: SlackAdapterStatus = {
  enabled: false,
  reason: "Slack adapter has not been initialized.",
};

type SlackPendingCapture =
  | {
      originalText: string;
      draft: SaveCaptureCandidateRequest;
      options?: undefined;
    }
  | {
      originalText: string;
      draft?: undefined;
      options: Array<Exclude<CaptureIntent, "unresolved">>;
    };

const pendingSlackCaptures = new Map<string, SlackPendingCapture>();

const isDirectMessage = (channelType: string | undefined) => channelType === "im";

const botToken = () => process.env["SLACK_BOT_TOKEN"]?.trim() ?? "";
const appToken = () => process.env["SLACK_APP_TOKEN"]?.trim() ?? "";
const configuredOperatorChannelId = () =>
  getSlackSettings().operatorChannelId?.trim() || process.env["SLACK_OPERATOR_CHANNEL_ID"]?.trim() || "";

const operatorChannelId = () => {
  const settings = getSlackSettings();
  if (!settings.proactiveMirroringEnabled) {
    return "";
  }
  return configuredOperatorChannelId();
};
const statusableKinds = new Set<WorkEntityKind>(["mission", "project", "todo", "deadline"]);
const isStatusableKind = (kind: DailyBriefItem["entityKind"]): kind is WorkEntityKind =>
  statusableKinds.has(kind as WorkEntityKind);

type SlackMessageShape = {
  channel?: string;
  channel_type?: string;
  text?: string;
};

const slackThreadId = (message: SlackMessageShape) => `slack:${message.channel ?? "dm"}`;

const actionsFromItems = (items: DailyBriefItem[]): AssistantContextAction[] =>
  buildWorkItemActions(
    items.flatMap((item) =>
      isStatusableKind(item.entityKind)
        ? [
            {
              entityKind: item.entityKind,
              entityId: item.id,
              title: item.title,
            },
          ]
        : []
    ),
    getWorkSnapshot()
  );

const formatItem = (item: DailyBriefItem, index: number) => {
  const waitingOn = item.waitingOnPersonName ? `, waiting on ${item.waitingOnPersonName}` : "";
  return `${index + 1}. ${item.title} (${item.reason.toLowerCase()}, ${item.priority}${waitingOn})`;
};

const formatDailyBrief = (brief: DailyBrief) => {
  const items =
    brief.priorityItems.length > 0
      ? brief.priorityItems.map(formatItem).join("\n")
      : "No active priority items are recorded yet.";
  const more = brief.thereIsMore ? "\nThere is more if you want to go over it." : "";
  return `${brief.spokenBrief}\n\nTop move: ${brief.recommendedMove.directive}\nWhy: ${brief.recommendedMove.rationale}\nTry: ${brief.recommendedMove.actionHint}\n\n${items}${more}`;
};

const formatFocusReport = (report: FocusReport) => {
  const people =
    report.people.length > 0
      ? `\nPeople: ${report.people
          .map((person) => `${person.relationship}: ${person.name}`)
          .join("; ")}`
      : "";
  const items =
    report.topItems.length > 0
      ? report.topItems.map(formatItem).join("\n")
      : "No active focus items are recorded for this yet.";
  return `${report.title}: ${report.summary}\nStatus: ${report.status}. Active todos: ${report.activeTodoCount}. Deadlines: ${report.upcomingDeadlineCount}.${people}\n\n${items}`;
};

const formatAppointmentReport = (report: AppointmentReport) => {
  const items =
    report.appointments.length > 0
      ? report.appointments
          .map((appointment, index) => {
            const end = appointment.endsAt ? ` to ${appointment.endsAt}` : "";
            return `${index + 1}. ${appointment.title} (${appointment.startsAt}${end}, ${appointment.sourceSystem})`;
          })
          .join("\n")
      : "No matching appointments are recorded yet.";
  const more = report.thereIsMore ? "\nThere is more if you want the upcoming list in the desktop app." : "";
  return `${report.spokenSummary}\n\n${items}${more}`;
};

const draftFromCapture = (preview: CaptureResult): SaveCaptureCandidateRequest | null => {
  if (preview.candidate.intent === "appointment") {
    return {
      intent: "appointment",
      originalText: preview.originalText,
      input: preview.candidate.input,
    };
  }

  if (preview.candidate.intent === "mission") {
    return {
      intent: "mission",
      originalText: preview.originalText,
      input: preview.candidate.input,
    };
  }

  if (preview.candidate.intent === "todo") {
    return {
      intent: "todo",
      originalText: preview.originalText,
      input: preview.candidate.input,
    };
  }

  return null;
};

const formatSlackCaptureDraft = (draft: SaveCaptureCandidateRequest) => {
  if (draft.intent === "appointment") {
    const end = draft.input.endsAt ? `\nEnd: ${draft.input.endsAt}` : "";
    return `Review capture: appointment\nTitle: ${draft.input.title}\nStart: ${draft.input.startsAt}${end}\nReply \`yes\` to save, or \`no\` to cancel.`;
  }

  if (draft.intent === "mission") {
    const due = draft.input.dueAt ? `\nDue: ${draft.input.dueAt}` : "";
    return `Review capture: mission\nTitle: ${draft.input.title}${due}\nReply \`yes\` to save, or \`no\` to cancel.`;
  }

  const due = draft.input.dueAt ? `\nDue: ${draft.input.dueAt}` : "";
  const priority = draft.input.priority ? `\nPriority: ${draft.input.priority}` : "";
  return `Review capture: todo\nTitle: ${draft.input.title}${due}${priority}\nReply \`yes\` to save, or \`no\` to cancel.`;
};

const isCaptureAffirmative = (text: string) =>
  /^(yes|y|yeah|yep|sure|ok|okay|save|save it|confirm|do it|go ahead)$/i.test(text.trim());

const isCaptureDecline = (text: string) =>
  /^(no|n|nope|not now|stop|cancel|never mind)$/i.test(text.trim());

const captureIntentReply = (text: string): Exclude<CaptureIntent, "unresolved"> | null => {
  const normalized = text.trim().toLowerCase();
  if (/^(mission|create mission|save as mission)$/.test(normalized)) {
    return "mission";
  }
  if (/^(todo|to do|task|create todo|save as todo)$/.test(normalized)) {
    return "todo";
  }
  if (/^(appointment|event|calendar|meeting|create appointment|save as appointment)$/.test(normalized)) {
    return "appointment";
  }
  return null;
};

const stageSlackCapture = (threadId: string, text: string) => {
  const preview = captureNaturalLanguage({ text, mode: "preview" });
  if (preview.candidate.intent === "unresolved") {
    return preview.message;
  }

  if (preview.candidate.requiresConfirmation && preview.candidate.confirmationOptions?.length) {
    pendingSlackCaptures.set(threadId, {
      originalText: preview.originalText,
      options: preview.candidate.confirmationOptions,
    });
    return `${preview.message}\n${formatAssistantChoiceReply(preview.candidate.confirmationOptions)}`;
  }

  const draft = draftFromCapture(preview);
  if (!draft) {
    return preview.message;
  }

  pendingSlackCaptures.set(threadId, {
    originalText: preview.originalText,
    draft,
  });
  return formatSlackCaptureDraft(draft);
};

const resolveSlackCaptureConfirmation = (threadId: string, text: string) => {
  const pending = pendingSlackCaptures.get(threadId);
  if (!pending) {
    return null;
  }

  if (isCaptureDecline(text)) {
    pendingSlackCaptures.delete(threadId);
    return "Capture canceled.";
  }

  if (pending.options) {
    const forcedIntent = captureIntentReply(text);
    if (!forcedIntent || !pending.options.includes(forcedIntent)) {
      return formatAssistantChoiceReply(pending.options);
    }

    const preview = captureNaturalLanguage({
      text: pending.originalText,
      mode: "preview",
      forcedIntent,
    });
    const draft = draftFromCapture(preview);
    if (!draft) {
      pendingSlackCaptures.delete(threadId);
      return preview.message;
    }

    pendingSlackCaptures.set(threadId, {
      originalText: pending.originalText,
      draft,
    });
    return formatSlackCaptureDraft(draft);
  }

  if (!isCaptureAffirmative(text)) {
    return null;
  }

  pendingSlackCaptures.delete(threadId);
  return saveCaptureCandidate(pending.draft).message;
};

const storeSlackReportContext = (
  surface: "daily_report" | "focus_report",
  threadId: string,
  title: string,
  items: DailyBriefItem[]
) => {
  const actions = actionsFromItems(items);
  if (actions.length === 0) {
    return;
  }

  storeAssistantContext({
    surface,
    threadId,
    expireSurfaces: ["daily_report", "focus_report", "proactive_suggestion"],
    title,
    actions,
  });
};

const storeSlackProactiveSuggestion = (threadId: string, brief: DailyBrief) => {
  const suggestion = buildBestProactiveSuggestion(getWorkSnapshot(), brief.priorityItems);
  if (!suggestion) {
    return null;
  }

  storeAssistantContext({
    surface: suggestion.surface,
    threadId,
    expireSurfaces: ["daily_report", "focus_report", "proactive_suggestion"],
    title: suggestion.title,
    actions: suggestion.actions,
  });
  return suggestion;
};

const storeSlackWriteConfirmation = (
  threadId: string,
  title: string,
  action: AssistantContextAction,
  message: string
) => {
  storeAssistantContext({
    surface: "work_update_confirmation",
    threadId,
    expireSurfaces: ["work_update_confirmation"],
    title,
    actions: [action],
  });
  return `${message}\nReply \`yes\` to confirm, or \`no\` to leave it alone.`;
};

const resolveSlackContextAction = (text: string, threadId: string) => {
  let lastResult: ReturnType<typeof resolveAssistantContextReply> | null = null;
  for (const surface of assistantContextActionSurfaces()) {
    const result = resolveAssistantContextReply({
      surface,
      threadId,
      text,
    });
    if (shouldStopAssistantContextTraversal(result)) {
      return result;
    }
    lastResult = result;
  }

  return lastResult ?? {
    ok: false,
    reason: "There is no active report context to apply that to.",
  };
};

const slackFailureReason = (error: unknown) => {
  const errorShape = error as {
    data?: {
      error?: string;
    };
    message?: string;
  };
  const code = errorShape.data?.error;
  if (code === "channel_not_found") {
    return "Slack could not find that channel. Check the channel ID, and make sure the bot is invited if this is a private channel.";
  }
  if (code === "not_in_channel") {
    return "Slack found the channel, but the bot is not a member. Invite the Praxis bot to that channel and try again.";
  }
  if (code === "missing_scope") {
    return "Slack rejected the message because the app is missing a permission scope. The bot needs chat:write.";
  }
  if (code === "invalid_auth" || code === "not_authed") {
    return "Slack authentication failed. Check SLACK_BOT_TOKEN and restart Praxis.";
  }
  if (code) {
    return `Slack API error: ${code}.`;
  }
  return errorShape.message ? `Slack error: ${errorShape.message}` : "Slack could not send the message.";
};

const requireRunningSlack = () => {
  if (!slackApp || !status.enabled) {
    return "Slack is not running. Set SLACK_BOT_TOKEN and SLACK_APP_TOKEN, then restart Praxis.";
  }
  return null;
};

export const sendSlackConnectionTest = async (): Promise<SlackConnectionTestResult> => {
  const runningError = requireRunningSlack();
  if (runningError) {
    return {
      ok: false,
      reason: runningError,
    };
  }

  const channel = configuredOperatorChannelId();
  if (!channel) {
    return {
      ok: false,
      reason: "No Slack operator channel is saved in settings.",
    };
  }

  try {
    await slackApp?.client.chat.postMessage({
      channel,
      text: "Praxis Slack test: connection is working.",
    });
  } catch (error) {
    return {
      ok: false,
      reason: slackFailureReason(error),
    };
  }

  return {
    ok: true,
    message: `Slack connection test sent to channel ${channel}.`,
  };
};

export const sendSlackTestSuggestion = async (): Promise<SlackTestSuggestionResult> => {
  const runningError = requireRunningSlack();
  if (runningError) {
    return {
      ok: false,
      reason: runningError,
    };
  }

  const channel = operatorChannelId();
  if (!channel) {
    return {
      ok: false,
      reason: "Slack proactive mirroring is off or no operator channel is saved in settings.",
    };
  }

  const brief = generateDailyBrief();
  const suggestion = storeSlackProactiveSuggestion(`slack:${channel}`, brief);
  if (!suggestion) {
    return {
      ok: false,
      reason: "No safe proactive suggestion is available right now.",
    };
  }

  try {
    await slackApp?.client.chat.postMessage({
      channel,
      text: `${suggestion.prompt}\nReply yes/no here, or use the item number if I gave you one.`,
    });
  } catch (error) {
    return {
      ok: false,
      reason: slackFailureReason(error),
    };
  }

  return {
    ok: true,
    message: `Sent a test proactive suggestion to Slack channel ${channel}.`,
  };
};

export const getSlackAdapterStatus = () => {
  if (!status.enabled) {
    return status;
  }

  return {
    ...status,
    reason: operatorChannelId()
      ? "Slack Socket Mode adapter is running with proactive suggestion mirroring."
      : "Slack Socket Mode adapter is running. Enable proactive mirroring and set an operator channel in settings to mirror suggestions.",
  };
};

export const startSlackAdapter = async () => {
  if (slackApp) {
    return status;
  }

  const token = botToken();
  const socketModeToken = appToken();
  if (!token || !socketModeToken) {
    status = {
      enabled: false,
      reason: "Set SLACK_BOT_TOKEN and SLACK_APP_TOKEN to enable Slack Socket Mode.",
    };
    return status;
  }

  slackApp = new SlackApp({
    token,
    appToken: socketModeToken,
    socketMode: true,
    logLevel: LogLevel.WARN,
  });

  slackApp.message(async ({ message, say }) => {
    if (!("text" in message) || !message.text?.trim()) {
      return;
    }

    if (!isDirectMessage(message.channel_type)) {
      return;
    }

    const threadId = slackThreadId(message);
    const captureConfirmation = resolveSlackCaptureConfirmation(threadId, message.text);
    if (captureConfirmation) {
      await say(captureConfirmation);
      return;
    }

    const route = routeAssistantRequest({ text: message.text, surface: "slack" });
    if (route.intent === "daily_report") {
      const brief = generateDailyBrief();
      storeSlackReportContext("daily_report", threadId, "Daily Brief", brief.priorityItems);
      await say(formatDailyBrief(brief));
      return;
    }

    if (route.intent === "appointment_report") {
      const report = generateAppointmentReport({ range: route.range });
      await say(formatAppointmentReport(report));
      return;
    }

    if (route.intent === "conversation_review") {
      await say(route.message);
      return;
    }

    if (route.intent === "focus_report") {
      const report = generateFocusReport(route.entityKind, route.entityId);
      if (!report) {
        await say("I found the matching work item, but I could not generate a focus report for it.");
        return;
      }
      storeSlackReportContext("focus_report", threadId, report.title, report.topItems);
      await say(formatFocusReport(report));
      return;
    }

    if (route.intent === "context_action") {
      const result = resolveSlackContextAction(message.text, threadId);
      if (!result.ok) {
        await say(result.reason);
        return;
      }

      if (result.action.command === "complete" && statusableKinds.has(result.action.entityKind)) {
        updateWorkStatus({
          entityKind: result.action.entityKind,
          id: result.action.entityId,
          status: "completed",
        });
        await say(result.message);
        return;
      }

      if (result.action.command === "pause" && statusableKinds.has(result.action.entityKind)) {
        updateWorkStatus({
          entityKind: result.action.entityKind,
          id: result.action.entityId,
          status: "paused",
        });
        await say(result.message);
        return;
      }

      if (result.action.command === "reactivate" && statusableKinds.has(result.action.entityKind)) {
        updateWorkStatus({
          entityKind: result.action.entityKind,
          id: result.action.entityId,
          status: "active",
        });
        await say(result.message);
        return;
      }

      if (result.action.command === "update_due_date" && result.action.dueAt) {
        const snapshot = getWorkSnapshot();
        const todo =
          result.action.entityKind === "todo"
            ? snapshot.todos.find((candidate) => candidate.id === result.action.entityId)
            : null;
        const deadline =
          result.action.entityKind === "deadline"
            ? snapshot.deadlines.find((candidate) => candidate.id === result.action.entityId)
            : null;

        if (result.action.entityKind === "todo" && todo) {
          updateWorkRecord({
            entityKind: "todo",
            id: todo.id,
            title: todo.title,
            projectId: todo.projectId ?? "",
            priority: todo.priority,
            dueAt: result.action.dueAt,
            moneyRelated: todo.moneyRelated,
            quickAction: todo.quickAction,
            estimatedMinutes: todo.estimatedMinutes ?? undefined,
            waitingOnPersonId: todo.waitingOnPersonId ?? "",
            notes: todo.notes ?? "",
          });
          await say(result.message);
          return;
        }

        if (result.action.entityKind === "deadline" && deadline) {
          updateWorkRecord({
            entityKind: "deadline",
            id: deadline.id,
            title: deadline.title,
            dueAt: result.action.dueAt,
            priority: deadline.priority,
          });
          await say(result.message);
          return;
        }
      }

      if (result.action.command === "clear_waiting_on" && result.action.entityKind === "todo") {
        const snapshot = getWorkSnapshot();
        const todo = snapshot.todos.find((candidate) => candidate.id === result.action.entityId);
        if (todo) {
          updateWorkRecord({
            entityKind: "todo",
            id: todo.id,
            title: todo.title,
            projectId: todo.projectId ?? "",
            priority: todo.priority,
            dueAt: todo.dueAt ?? "",
            moneyRelated: todo.moneyRelated,
            quickAction: todo.quickAction,
            estimatedMinutes: todo.estimatedMinutes ?? undefined,
            waitingOnPersonId: "",
            notes: todo.notes ?? "",
          });
          await say(result.message);
          return;
        }
      }

      if (
        result.action.command === "assign_waiting_on" &&
        result.action.entityKind === "todo" &&
        result.action.personId
      ) {
        const snapshot = getWorkSnapshot();
        const todo = snapshot.todos.find((candidate) => candidate.id === result.action.entityId);
        if (todo) {
          updateWorkRecord({
            entityKind: "todo",
            id: todo.id,
            title: todo.title,
            projectId: todo.projectId ?? "",
            priority: todo.priority,
            dueAt: todo.dueAt ?? "",
            moneyRelated: todo.moneyRelated,
            quickAction: todo.quickAction,
            estimatedMinutes: todo.estimatedMinutes ?? undefined,
            waitingOnPersonId: result.action.personId,
            notes: todo.notes ?? "",
          });
          await say(result.message);
          return;
        }
      }

      if (
        result.action.command === "open_focus_report" &&
        (result.action.entityKind === "mission" || result.action.entityKind === "project")
      ) {
        const report = generateFocusReport(result.action.entityKind, result.action.entityId);
        if (!report) {
          await say("I matched the focus report, but that work item was no longer available.");
          return;
        }
        storeSlackReportContext("focus_report", threadId, report.title, report.topItems);
        await say(formatFocusReport(report));
        return;
      }

      await say("That report item cannot be completed from Slack yet.");
      return;
    }

    if (route.intent === "work_update_status") {
      await say(
        storeSlackWriteConfirmation(
          threadId,
          `Confirm ${route.title}`,
          {
            actionId: `${route.entityKind}:${route.entityId}:complete:1`,
            ordinal: 1,
            title: route.title,
            entityKind: route.entityKind,
            entityId: route.entityId,
            command: "complete",
          },
          route.message
        )
      );
      return;
    }

    if (route.intent === "work_update_due_date") {
      await say(
        storeSlackWriteConfirmation(
          threadId,
          `Confirm move for ${route.title}`,
          {
            actionId: `${route.entityKind}:${route.entityId}:update_due_date:1`,
            ordinal: 1,
            title: route.title,
            entityKind: route.entityKind,
            entityId: route.entityId,
            command: "update_due_date",
            dueAt: route.dueAt,
          },
          route.message
        )
      );
      return;
    }

    if (route.intent === "work_clear_waiting_on") {
      await say(
        storeSlackWriteConfirmation(
          threadId,
          `Confirm clear waiting-on for ${route.todoTitle}`,
          {
            actionId: `todo:${route.todoId}:clear_waiting_on:1`,
            ordinal: 1,
            title: route.todoTitle,
            entityKind: "todo",
            entityId: route.todoId,
            command: "clear_waiting_on",
            personId: route.personId,
          },
          route.message
        )
      );
      return;
    }

    if (route.intent === "work_assign_waiting_on") {
      await say(
        storeSlackWriteConfirmation(
          threadId,
          `Confirm waiting-on assignment for ${route.todoTitle}`,
          {
            actionId: `todo:${route.todoId}:assign_waiting_on:1`,
            ordinal: 1,
            title: route.todoTitle,
            entityKind: "todo",
            entityId: route.todoId,
            command: "assign_waiting_on",
            personId: route.personId,
          },
          route.message
        )
      );
      return;
    }

    if (route.intent === "work_update_confirmation") {
      storeAssistantContext({
        surface: "work_update_confirmation",
        threadId,
        expireSurfaces: ["work_update_confirmation"],
        title: route.title,
        actions: route.actions,
      });
      await say(route.message);
      return;
    }

    if (route.intent === "person_lookup") {
      const result = lookupPerson({ text: message.text });
      await say(result.ok ? result.message : result.reason);
      return;
    }

    if (route.intent === "work_lookup") {
      const result = lookupWork({ text: message.text });
      if (result.ok) {
        const actions = buildWorkLookupActions(result, getWorkSnapshot());
        if (actions.length > 0) {
          storeAssistantContext({
            surface: "work_lookup",
            threadId,
            expireSurfaces: ["work_lookup"],
            title: `Work Lookup: ${result.kind}`,
            actions,
          });
        }
      }
      await say(result.ok ? result.message : result.reason);
      return;
    }

    if (route.intent === "capture") {
      await say(stageSlackCapture(threadId, message.text));
      return;
    }

    await say(
      "I can answer saved contact lookups, capture missions/todos/appointments with confirmation, work-graph questions, appointment reports, daily reports, focus reports, and confirmed work follow-ups from Slack. Try: `create a mission for BDNC operations`, `remind me to call Max tomorrow`, `status report`, `what is on my calendar today?`, `where am I on Origins?`, `what am I waiting on from Scott?`, or `what's Max's email?`"
    );
  });

  await slackApp.start();
  try {
    await sendSlackTestSuggestion();
  } catch (error) {
    console.warn("Slack proactive suggestion mirror failed.", error);
  }
  status = {
    enabled: true,
    reason: operatorChannelId()
      ? "Slack Socket Mode adapter is running with proactive suggestion mirroring."
      : "Slack Socket Mode adapter is running. Enable proactive mirroring and set an operator channel in settings to mirror suggestions.",
  };
  return status;
};

export const stopSlackAdapter = async () => {
  if (!slackApp) {
    return;
  }

  await slackApp.stop();
  slackApp = null;
  status = {
    enabled: false,
    reason: "Slack Socket Mode adapter stopped.",
  };
};

export const restartSlackAdapter = async (): Promise<SlackRestartResult> => {
  try {
    await stopSlackAdapter();
    const nextStatus = await startSlackAdapter();
    return nextStatus.enabled
      ? {
          ok: true,
          message: nextStatus.reason,
        }
      : {
          ok: false,
          reason: nextStatus.reason,
        };
  } catch (error) {
    status = {
      enabled: false,
      reason: slackFailureReason(error),
    };
    return {
      ok: false,
      reason: status.reason,
    };
  }
};
