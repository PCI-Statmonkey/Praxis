import crypto from "node:crypto";
import type {
  ResolveAssistantContextInput,
  ResolveAssistantContextResult,
  StoreAssistantContextInput,
} from "../shared/assistantContext";
import { resolveAssistantContextActions } from "../shared/assistantContextResolver";
import { getPraxisDatabase } from "./praxisDb";

type DbSuggestionContext = {
  id: string;
  actions_json: string;
};

const createId = () => `context_${crypto.randomUUID()}`;
const defaultThreadId = "desktop:current";

const markResolved = (contextId: string) => {
  getPraxisDatabase()
    .prepare("UPDATE suggestion_contexts SET status = 'resolved', resolved_at = ? WHERE id = ?")
    .run(new Date().toISOString(), contextId);
};

export const storeAssistantContext = (input: StoreAssistantContextInput) => {
  const db = getPraxisDatabase();
  const timestamp = new Date().toISOString();
  const threadId = input.threadId?.trim() || defaultThreadId;
  const expireSurfaces = input.expireSurfaces ?? [input.surface];
  db.transaction(() => {
    const expire = db.prepare(
      "UPDATE suggestion_contexts SET status = 'expired', resolved_at = ? WHERE surface = ? AND thread_id = ? AND status = 'active'"
    );
    for (const surface of expireSurfaces) {
      expire.run(timestamp, surface, threadId);
    }
    db.prepare(`
      INSERT INTO suggestion_contexts (
        id,
        surface,
        thread_id,
        prompt,
        actions_json,
        status,
        created_at,
        resolved_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, NULL)
    `).run(
      createId(),
      input.surface,
      threadId,
      input.title,
      JSON.stringify(input.actions),
      timestamp
    );
  })();
  return { ok: true as const };
};

export const resolveAssistantContextReply = (
  input: ResolveAssistantContextInput
): ResolveAssistantContextResult => {
  const threadId = input.threadId?.trim() || defaultThreadId;
  const row = getPraxisDatabase()
    .prepare(
      "SELECT id, actions_json FROM suggestion_contexts WHERE surface = ? AND thread_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    )
    .get(input.surface, threadId) as DbSuggestionContext | undefined;
  if (!row) {
    return {
      ok: false,
      reason: "There is no active report context to apply that to.",
    };
  }

  const result = resolveAssistantContextActions({
    surface: input.surface,
    text: input.text,
    actions: JSON.parse(row.actions_json),
  });

  if (result.ok || "declined" in result) {
    markResolved(row.id);
  }

  if ("declined" in result) {
    return {
      ok: false,
      reason: result.reason,
    };
  }

  return result;
};
