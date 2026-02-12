export type MirrorLogEntry = {
  offset: number;
  record: Record<string, unknown>;
};

export type MirrorReadResult = {
  entries: MirrorLogEntry[];
  nextOffset: number;
};

export type MirrorAppendResult = {
  appended: number;
  nextOffset: number;
};
