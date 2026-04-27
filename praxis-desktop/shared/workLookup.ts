import type { WorkEntityKind } from "./workModel";

export type WorkLookupRequest = {
  text: string;
};

export type WorkLookupKind =
  | "waiting_on"
  | "slipping"
  | "quick_wins"
  | "money"
  | "blocked";

export type WorkLookupItem = {
  entityKind: WorkEntityKind;
  entityId: string;
  title: string;
  detail: string;
};

export type WorkLookupResult =
  | {
      ok: true;
      kind: WorkLookupKind;
      message: string;
      itemCount: number;
      items: WorkLookupItem[];
    }
  | {
      ok: false;
      reason: string;
    };
