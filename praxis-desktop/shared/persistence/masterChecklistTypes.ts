export type MasterChecklistSource = { kind: "url"; value: string } | { kind: string; value?: string };

export type MasterChecklistItem = {
  id: string;
  label?: string;
  title?: string;
  details?: string;
  completed: boolean;
  source?: MasterChecklistSource;
};

export type MasterChecklistState = MasterChecklistItem[];
