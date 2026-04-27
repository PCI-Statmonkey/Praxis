import type { AssistantContextAction } from "./assistantContext";
import type { PersonRecord, TodoRecord, WorkSnapshot } from "./workModel";

export type WaitingOnAssignmentResult =
  | {
      ok: true;
      todo: TodoRecord;
      person: PersonRecord;
      confidence: number;
    }
  | {
      ok: false;
      reason: string;
      confirmation?: {
        title: string;
        prompt: string;
        actions: AssistantContextAction[];
      };
    };

export const isWaitingOnAssignmentRequest = (text: string) =>
  /\b(?:waiting on|waiting for|wait on)\b/i.test(text) &&
  !/\b(what|which|show|tell|do i have|am i|are we|give me|check)\b/i.test(text) &&
  !text.trim().endsWith("?") &&
  !/\b(sent|handled|answered|replied|responded|got it|received|came through|done|complete|completed|clear|remove|not waiting|no longer waiting)\b/i.test(
    text
  );

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (value: string) => normalize(value).split(" ").filter((word) => word.length >= 3);

const scorePersonMatch = (text: string, person: PersonRecord) => {
  const normalizedText = normalize(text);
  const candidates = [person.name, ...person.aliases];
  if (candidates.some((candidate) => normalizedText.includes(normalize(candidate)))) {
    return 100;
  }

  const personWords = candidates.flatMap(words);
  if (personWords.length === 0) {
    return 0;
  }

  const matchedWords = personWords.filter((word) => normalizedText.includes(word));
  return matchedWords.length > 0 ? Math.min(90, matchedWords.length * 45) : 0;
};

const scoreTitleMatch = (text: string, title: string) => {
  const normalizedText = normalize(text);
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) {
    return 0;
  }
  if (normalizedText.includes(normalizedTitle)) {
    return 100;
  }

  const titleWords = words(title);
  if (titleWords.length === 0) {
    return 0;
  }

  const textWords = words(text);
  const matchedWords = titleWords.filter((word) => textWords.includes(word));
  if (matchedWords.length === 0) {
    return 0;
  }

  if (textWords.length <= 2 && matchedWords.length === textWords.length) {
    return 65;
  }

  return Math.max(40, Math.round((matchedWords.length / titleWords.length) * 80));
};

const assignmentTargetText = (text: string) => {
  const match = text.match(/\b(?:waiting on|waiting for|wait on)\b.+?\bfor\s+(.+)$/i);
  return match?.[1]?.trim() ?? text;
};

export const analyzeWaitingOnAssignment = (
  text: string,
  snapshot: WorkSnapshot
): WaitingOnAssignmentResult => {
  if (!isWaitingOnAssignmentRequest(text)) {
    return {
      ok: false,
      reason: "This does not look like a waiting-on assignment request.",
    };
  }

  const scoredPeople = snapshot.people
    .map((person) => ({ person, score: scorePersonMatch(text, person) }))
    .filter((candidate) => candidate.score >= 50)
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name));
  const [bestPerson, secondPerson] = scoredPeople;

  if (!bestPerson) {
    return {
      ok: false,
      reason: "I understand this as a waiting-on assignment, but I could not safely match a person.",
    };
  }

  if (secondPerson && bestPerson.score - secondPerson.score < 12) {
    return {
      ok: false,
      reason: "I found more than one possible person. Name the person more specifically.",
    };
  }

  const targetText = assignmentTargetText(text);
  const scoredTodos = snapshot.todos
    .filter((todo) => todo.status !== "completed")
    .map((todo) => ({
      todo,
      score: Math.max(scoreTitleMatch(text, todo.title), scoreTitleMatch(targetText, todo.title)),
    }))
    .filter((candidate) => candidate.score >= 50)
    .sort((a, b) => b.score - a.score || a.todo.title.localeCompare(b.todo.title));
  const [bestTodo, secondTodo] = scoredTodos;

  if (!bestTodo) {
    return {
      ok: false,
      reason:
        "I understand this as a waiting-on assignment, but I could not safely match one active todo.",
    };
  }

  if (secondTodo && bestTodo.score - secondTodo.score < 12) {
    const actions = scoredTodos.slice(0, 5).map(
      (candidate, index): AssistantContextAction => ({
        actionId: `todo:${candidate.todo.id}:assign_waiting_on:${bestPerson.person.id}:${index + 1}`,
        ordinal: index + 1,
        title: candidate.todo.title,
        entityKind: "todo",
        entityId: candidate.todo.id,
        command: "assign_waiting_on",
        personId: bestPerson.person.id,
      })
    );

    return {
      ok: false,
      reason: "I found multiple possible todos for that waiting-on assignment.",
      confirmation: {
        title: "Assign Waiting-On To Which Todo?",
        prompt: `I found multiple active todos that could be waiting on ${bestPerson.person.name}. Which one?`,
        actions,
      },
    };
  }

  return {
    ok: true,
    todo: bestTodo.todo,
    person: bestPerson.person,
    confidence: Math.min(Math.min(bestTodo.score, bestPerson.score) / 100, 0.95),
  };
};
