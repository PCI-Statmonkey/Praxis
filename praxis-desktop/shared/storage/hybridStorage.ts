export type StorageBackend = "sqlite" | "markdown" | "filesystem";

export type StorageAuthorityRule = {
  entity: string;
  authority: StorageBackend;
  mirrors: StorageBackend[];
  notes: string;
};

export type StorageOverview = {
  databasePath: string;
  memoryRoot: string;
  schemaVersion: number;
  indexedDocumentCount: number;
  tables: string[];
  authorityRules: StorageAuthorityRule[];
};

export type MemoryIndexRepairReport = {
  memoryRoot: string;
  scannedMarkdownCount: number;
  indexedDocumentCount: number;
  addedOrUpdatedCount: number;
  removedStaleIndexCount: number;
  staleIndexPaths: string[];
};

export type MemoryMirrorRepairReport = {
  missionDocumentsWritten: number;
  projectDocumentsWritten: number;
  personDocumentsWritten: number;
  summaryDocumentsWritten: number;
};

export type MemoryRepairReport = {
  ok: boolean;
  repairedAt: string;
  databasePath: string;
  index: MemoryIndexRepairReport;
  mirrors: MemoryMirrorRepairReport;
};

export type MemoryReindexReport = {
  ok: boolean;
  reindexedAt: string;
  databasePath: string;
  index: MemoryIndexRepairReport;
};

export type StorageIntegritySeverity = "error" | "warning";

export type StorageIntegrityIssue = {
  severity: StorageIntegritySeverity;
  code: string;
  message: string;
  table?: string;
  rowId?: string;
  details?: Record<string, string | number | boolean | null>;
};

export type StorageIntegrityReport = {
  ok: boolean;
  checkedAt: string;
  databasePath: string;
  issueCounts: Record<StorageIntegritySeverity, number>;
  issues: StorageIntegrityIssue[];
};

export const STORAGE_AUTHORITY_RULES: StorageAuthorityRule[] = [
  {
    entity: "missions",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Operational fields live in SQLite. The operator-facing mission document lives in markdown.",
  },
  {
    entity: "projects",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Structured project state and relationships belong in SQLite. Long-form project context is mirrored to markdown.",
  },
  {
    entity: "todos",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Todos change frequently and must rank quickly, so SQLite is primary. Markdown views may summarize them.",
  },
  {
    entity: "tasks",
    authority: "sqlite",
    mirrors: [],
    notes: "Tasks are highly operational and should remain database-first.",
  },
  {
    entity: "people",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "SQLite tracks relationships and follow-up state. Important recurring people may also have markdown profiles.",
  },
  {
    entity: "appointments",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Calendar-aware planning depends on fast time-based queries. Daily and calendar markdown are summaries.",
  },
  {
    entity: "finance_items",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Money-related items should be queryable and rankable. Markdown captures durable finance notes.",
  },
  {
    entity: "inbox_facts",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Extracted facts should be structured in SQLite and optionally reflected into markdown routing files.",
  },
  {
    entity: "daily_briefs",
    authority: "markdown",
    mirrors: ["sqlite"],
    notes: "The daily brief is a human-readable narrative record, with metadata indexed in SQLite.",
  },
  {
    entity: "memory_documents",
    authority: "markdown",
    mirrors: ["sqlite"],
    notes: "Markdown files remain the human-facing truth layer. SQLite keeps an index for routing and retrieval.",
  },
  {
    entity: "settings",
    authority: "sqlite",
    mirrors: [],
    notes: "Settings are operational application state and belong in SQLite.",
  },
  {
    entity: "suggestion_contexts",
    authority: "sqlite",
    mirrors: [],
    notes: "Resolver context and reply history are operational state and should stay database-first.",
  },
];
