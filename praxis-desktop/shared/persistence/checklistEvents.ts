import type { MasterChecklistItem, MasterChecklistState } from "./masterChecklistTypes";

export type ChecklistEventType =
  | "ITEM_CREATED"
  | "ITEM_COMPLETED"
  | "ITEM_UPDATED"
  | "PIN_SET"
  | "PIN_CLEARED";

export type ChecklistEvent =
  | {
      id: string;
      ts: number;
      type: "ITEM_CREATED";
      payload: { item: MasterChecklistItem };
    }
  | {
      id: string;
      ts: number;
      type: "ITEM_COMPLETED";
      payload: { id: string; completed: boolean };
    }
  | {
      id: string;
      ts: number;
      type: "ITEM_UPDATED";
      payload: { id: string; updates: Partial<MasterChecklistItem> };
    }
  | {
      id: string;
      ts: number;
      type: "PIN_SET";
      payload: { id: string };
    }
  | {
      id: string;
      ts: number;
      type: "PIN_CLEARED";
      payload: Record<string, never>;
    };

type ChecklistEventPayloadMap = {
  ITEM_CREATED: { item: MasterChecklistItem };
  ITEM_COMPLETED: { id: string; completed: boolean };
  ITEM_UPDATED: { id: string; updates: Partial<MasterChecklistItem> };
  PIN_SET: { id: string };
  PIN_CLEARED: Record<string, never>;
};

type ChecklistEventOf<T extends ChecklistEventType> = Extract<ChecklistEvent, { type: T }>;

const createEventId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const createChecklistEvent = <T extends ChecklistEventType>(
  type: T,
  payload: ChecklistEventPayloadMap[T]
): ChecklistEventOf<T> => ({
  id: createEventId(),
  ts: Date.now(),
  type,
  payload,
}) as ChecklistEventOf<T>;

export const applyChecklistEvent = (
  state: MasterChecklistState,
  event: ChecklistEvent
): MasterChecklistState => {
  switch (event.type) {
    case "ITEM_CREATED":
      // Append the new item to the end of the list.
      return [...state, event.payload.item];
    case "ITEM_COMPLETED":
      // Update completed flag for the matching item.
      return state.map((item) =>
        item.id === event.payload.id ? { ...item, completed: event.payload.completed } : item
      );
    case "ITEM_UPDATED":
      // Shallow-merge updates into the matching item.
      return state.map((item) =>
        item.id === event.payload.id ? { ...item, ...event.payload.updates } : item
      );
    case "PIN_SET":
      // Pin state lives elsewhere for now; no list changes yet.
      return [...state];
    case "PIN_CLEARED":
      // Pin state lives elsewhere for now; no list changes yet.
      return [...state];
    default:
      return [...state];
  }
};

export const replayChecklistEvents = (
  initialState: MasterChecklistState,
  events: ChecklistEvent[]
): MasterChecklistState =>
  events.reduce(
    (currentState, event) => applyChecklistEvent(currentState, event),
    [...initialState]
  );
