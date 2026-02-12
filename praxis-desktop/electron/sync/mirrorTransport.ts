export type MirrorTransport = {
  listDeviceLogs: () => Promise<string[]>;
  readFromOffset: (
    deviceLog: string,
    offset: number
  ) => Promise<{ lines: string[]; nextOffset: number }>;
  appendLines: (deviceLog: string, lines: string[]) => Promise<{ appended: number }>;
};
