import type { DailyBriefItem, FocusReport, FocusReportPerson } from "./dailyBrief";

export type FocusReportFollowUpKind = "blocked_waiting_on" | "people";

export type FocusReportFollowUpResult =
  | {
      matched: true;
      kind: FocusReportFollowUpKind;
      message: string;
      items?: DailyBriefItem[];
      people?: FocusReportPerson[];
    }
  | {
      matched: false;
    };

const blockedWaitingOnPattern =
  /\b(blocked|waiting[-\s]?on|waiting on|stuck|paused|hold|held up)\b/i;
const peoplePattern =
  /\b(who(?:'s| is|s)? involved|who(?:'s| is|s)? on|people involved|involved people|stakeholders|participants)\b/i;

const uniqueFocusItems = (items: DailyBriefItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.entityKind}:${item.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const blockedWaitingOnItems = (report: FocusReport) =>
  uniqueFocusItems([...report.detailItems, ...report.topItems]).filter(
    (item) => item.waitingOnPersonName || item.status === "blocked" || item.status === "paused"
  );

const describeItem = (item: DailyBriefItem) => {
  const labels: string[] = [item.entityKind, item.status, item.priority];
  if (item.waitingOnPersonName) {
    labels.push(`waiting on ${item.waitingOnPersonName}`);
  }
  return `${item.title} (${labels.join(", ")})`;
};

const answerBlockedWaitingOn = (report: FocusReport): FocusReportFollowUpResult => {
  const items = blockedWaitingOnItems(report);
  if (items.length === 0) {
    return {
      matched: true,
      kind: "blocked_waiting_on",
      message: `No blocked, paused, or waiting-on items are in the current ${report.title} focus report.`,
      items,
    };
  }

  const lines = items.map((item, index) => `${index + 1}. ${describeItem(item)}`);
  return {
    matched: true,
    kind: "blocked_waiting_on",
    message: `${report.title} blocked, paused, or waiting-on items:\n${lines.join("\n")}`,
    items,
  };
};

const answerPeople = (report: FocusReport): FocusReportFollowUpResult => {
  if (report.people.length === 0) {
    return {
      matched: true,
      kind: "people",
      message: `No people are linked to the current ${report.title} focus report.`,
      people: [],
    };
  }

  const lines = report.people.map(
    (person, index) => `${index + 1}. ${person.name} (${person.relationship})`
  );
  return {
    matched: true,
    kind: "people",
    message: `${report.title} involved people:\n${lines.join("\n")}`,
    people: report.people,
  };
};

export const answerFocusReportFollowUp = (
  text: string,
  report: FocusReport | null
): FocusReportFollowUpResult => {
  if (!report) {
    return { matched: false };
  }

  const normalized = text.trim();
  if (!normalized) {
    return { matched: false };
  }

  if (blockedWaitingOnPattern.test(normalized)) {
    return answerBlockedWaitingOn(report);
  }

  if (peoplePattern.test(normalized)) {
    return answerPeople(report);
  }

  return { matched: false };
};
