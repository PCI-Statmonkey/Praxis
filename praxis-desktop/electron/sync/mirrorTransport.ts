import type { MirrorAppendResult, MirrorReadResult } from "../../shared/sync/mirrorTypes";
import type { EventRecord } from "../../shared/persistence/eventLogContract";

export type MirrorTransport = {
  listDeviceLogs: () => Promise<string[]>;
  readFromOffset: (deviceId: string, offset: number) => Promise<MirrorReadResult>;
  append: (deviceId: string, records: EventRecord[]) => Promise<MirrorAppendResult>;
};
