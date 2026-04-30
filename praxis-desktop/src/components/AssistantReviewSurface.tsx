import { useMemo, useState } from "react";
import type { DeadlineRecord, TodoRecord, WorkPriority, WorkSnapshot } from "../../shared/workModel";
import type { AssistantReviewUiState } from "../hooks/assistantRouteHandlers";

type ReviewMode = "reset" | "wins" | "forgetting" | "risk" | "stale";

type AssistantReviewSurfaceProps = {
  snapshot: WorkSnapshot;
  setCaptureText: (value: string) => void;
  reviewState: AssistantReviewUiState;
  suppressLocalPreview?: boolean;
};

const priorityRank: Record<WorkPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const promptByMode: Record<ReviewMode, string> = {
  reset: "I'm overwhelmed, reset me",
  wins: "Give me a few wins",
  forgetting: "What am I forgetting?",
  risk: "What's about to bite me?",
  stale: "What projects are stale?",
};

const labelByMode: Record<ReviewMode, string> = {
  reset: "Reset",
  wins: "Wins",
  forgetting: "Forgetting",
  risk: "Risks",
  stale: "Stale",
};

const statusCopy: Record<AssistantReviewUiState["status"], string> = {
  idle: "Local preview",
  checking: "Checking packet",
  generating: "Generating review",
  fallback: "Fallback summary",
  model: "Model response",
};

const formatWhen = (value: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const isDueSoon = (value: string | null, days: number) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() <= Date.now() + days * 24 * 60 * 60 * 1000;
};

const staleDays = (updatedAt: string) => {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
};

const describeTodo = (todo: TodoRecord) => {
  const bits = [
    todo.priority !== "normal" ? todo.priority : "",
    todo.estimatedMinutes ? `${todo.estimatedMinutes} min` : "",
    todo.dueAt ? `due ${formatWhen(todo.dueAt)}` : "",
  ].filter(Boolean);
  return bits.length > 0 ? `${todo.title} (${bits.join(", ")})` : todo.title;
};

const describeDeadline = (deadline: DeadlineRecord) =>
  `${deadline.title} (${deadline.priority}, due ${formatWhen(deadline.dueAt)})`;

export function AssistantReviewSurface({
  snapshot,
  setCaptureText,
  reviewState,
  suppressLocalPreview = false,
}: AssistantReviewSurfaceProps) {
  const [mode, setMode] = useState<ReviewMode>("reset");
  const showInFlightStatus =
    !suppressLocalPreview &&
    reviewState.active &&
    (reviewState.status === "checking" || reviewState.status === "generating");

  const review = useMemo(() => {
    const activeTodos = snapshot.todos.filter((todo) => todo.status !== "completed");
    const quickWins = activeTodos
      .filter(
        (todo) =>
          todo.status === "active" &&
          (todo.quickAction || todo.estimatedMinutes === null || todo.estimatedMinutes <= 20)
      )
      .sort(
        (a, b) =>
          priorityRank[a.priority] - priorityRank[b.priority] ||
          (a.estimatedMinutes ?? 20) - (b.estimatedMinutes ?? 20) ||
          a.title.localeCompare(b.title)
      )
      .slice(0, 3);
    const dueSoonTodos = activeTodos
      .filter((todo) => isDueSoon(todo.dueAt, 2) || todo.priority === "critical")
      .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
      .slice(0, 3);
    const dueSoonDeadlines = snapshot.deadlines
      .filter((deadline) => deadline.status !== "completed" && isDueSoon(deadline.dueAt, 3))
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      .slice(0, 3);
    const blockedTodos = activeTodos.filter((todo) => todo.status === "blocked").slice(0, 3);
    const waitingTodos = activeTodos.filter((todo) => todo.waitingOnPersonId).slice(0, 3);
    const staleProjects = snapshot.projects
      .filter((project) => project.status !== "completed" && staleDays(project.updatedAt) >= 14)
      .sort((a, b) => staleDays(b.updatedAt) - staleDays(a.updatedAt))
      .slice(0, 3);

    return {
      activeTodos,
      quickWins,
      dueSoonTodos,
      dueSoonDeadlines,
      blockedTodos,
      waitingTodos,
      staleProjects,
    };
  }, [snapshot]);

  const linesByMode: Record<ReviewMode, string[]> = {
    reset: [
      review.quickWins[0]
        ? `First win: ${describeTodo(review.quickWins[0])}.`
        : "First win: capture one 10-minute todo and clear it.",
      review.dueSoonDeadlines[0] || review.dueSoonTodos[0]
        ? `Next risk: ${
            review.dueSoonDeadlines[0]
              ? describeDeadline(review.dueSoonDeadlines[0])
              : describeTodo(review.dueSoonTodos[0])
          }.`
        : "Next risk: no critical due-soon work is visible.",
      review.waitingTodos[0] || review.blockedTodos[0]
        ? `Do not chase: ${describeTodo(review.waitingTodos[0] ?? review.blockedTodos[0])}.`
        : "No blocked or waiting-on todo is visible.",
    ],
    wins:
      review.quickWins.length > 0
        ? review.quickWins.map((todo) => describeTodo(todo))
        : ["No quick wins are tagged yet. Ask Praxis to capture one small next action."],
    forgetting: [
      ...(review.waitingTodos.length > 0
        ? review.waitingTodos.map((todo) => `Waiting on someone: ${describeTodo(todo)}`)
        : ["No people-linked waiting item is visible."]),
      ...(review.blockedTodos.length > 0
        ? review.blockedTodos.map((todo) => `Blocked: ${describeTodo(todo)}`)
        : []),
    ].slice(0, 4),
    risk: [
      ...review.dueSoonDeadlines.map((deadline) => describeDeadline(deadline)),
      ...review.dueSoonTodos.map((todo) => describeTodo(todo)),
    ].slice(0, 4),
    stale:
      review.staleProjects.length > 0
        ? review.staleProjects.map((project) => `${project.title} (${staleDays(project.updatedAt)} days quiet)`)
        : ["No active project is stale by the 14-day dashboard rule."],
  };

  const activeLines = linesByMode[mode].length > 0 ? linesByMode[mode] : ["No matching work is visible."];

  return (
    <section className="assistant-review-surface" aria-label="AI task review">
      <div className="assistant-review-header">
        <span className="recommended-label">AI Task Review</span>
        <strong>Reset without changing anything</strong>
      </div>
      <div className="assistant-review-prompts" aria-label="Review prompts">
        {(Object.keys(promptByMode) as ReviewMode[]).map((nextMode) => (
          <button
            key={nextMode}
            type="button"
            className={mode === nextMode ? "is-review-active" : ""}
            onClick={() => {
              setMode(nextMode);
              setCaptureText(promptByMode[nextMode]);
            }}
          >
            {labelByMode[nextMode]}
          </button>
        ))}
      </div>
      {showInFlightStatus ? (
        <div className="assistant-review-preview-note">
          <p>{statusCopy[reviewState.status]}. No work has been changed.</p>
          <div className="assistant-review-meta" aria-label="AI review state">
            {reviewState.sourceLabel ? <span>{reviewState.sourceLabel}</span> : null}
          </div>
        </div>
      ) : null}
      {suppressLocalPreview ? (
        <div className="assistant-review-preview-note">
          <p>Packet-backed review is shown in Talk above. No work has been changed.</p>
          <div className="assistant-review-meta" aria-label="AI review state">
            <span>{statusCopy[reviewState.status]}</span>
            {reviewState.sourceLabel ? <span>{reviewState.sourceLabel}</span> : null}
            {reviewState.fallbackReason ? <small>{reviewState.fallbackReason}</small> : null}
          </div>
        </div>
      ) : (
        <article className="praxis-reply assistant-review-reply">
          <h4>Praxis</h4>
          <p>{promptByMode[mode]}</p>
          <ol>
            {activeLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="assistant-review-guardrail">
            No writes made. Creating or changing work still requires explicit confirmation or Review Inbox.
          </p>
        </article>
      )}
    </section>
  );
}
