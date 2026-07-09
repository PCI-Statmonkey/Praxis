export const HOME_NODE_NETWORKING_CLOSEOUT_PHASE = "RM12" as const;
export const HOME_NODE_NETWORKING_CLOSEOUT_SCHEMA_VERSION =
  "home-node-networking-closeout.v1" as const;

export const HOME_NODE_NETWORKING_CLOSEOUT_EXCLUDED_EVIDENCE = [
  "raw_approval_packets",
  "raw_runtime_snapshots",
  "raw_settings_display_rows",
  "unsafe_packet_content",
  "secrets",
  "endpoint_urls",
  "provider_payloads",
  "storage_paths",
  "direct_database_source_data",
] as const;

export const HOME_NODE_NETWORKING_DENIED_AUTHORITIES = [
  "public_relay",
  "self_hosted_relay_runtime",
  "lan_listener",
  "direct_private_mesh_listener",
  "public_listener",
  "lan_network_socket_binding",
  "automatic_discovery",
  "dropbox_sync_runtime",
  "file_watcher",
  "provider_credential_path",
  "transport_credential_store",
  "raw_payload_access",
  "health_probe_runtime",
  "selected_transport_persistence",
  "qr_transport_activation",
  "request_acceptance",
  "direct_remote_write_path",
  "provider_access",
] as const;

export type HomeNodeNetworkingExcludedEvidence =
  (typeof HOME_NODE_NETWORKING_CLOSEOUT_EXCLUDED_EVIDENCE)[number];

export type HomeNodeNetworkingDeniedAuthority =
  (typeof HOME_NODE_NETWORKING_DENIED_AUTHORITIES)[number];

export type HomeNodeNetworkingCloseoutSource =
  | "transportApprovalDiagnostics"
  | "homeNodeApi"
  | "listenerFreeRuntime"
  | "settings"
  | "pairedDevices";

export type HomeNodeNetworkingSafeCount =
  | "approvalPacketSummaries"
  | "runtimeSnapshotSummaries"
  | "settingsDisplayRows"
  | "pairedDeviceRecords"
  | "readinessChecks"
  | "deniedAuthorities";

export type HomeNodeNetworkingReadinessStatus = "ready_for_client_phase" | "blocked";
export type HomeNodeNetworkingConsistencyStatus = "consistent" | "blocked";
export type HomeNodeNetworkingNoneTransport = "none";
export type HomeNodeNetworkingRequestAcceptance = "blocked";
export type HomeNodeNetworkingSummaryValue = "none" | "blocked" | "redacted";

export type HomeNodeNetworkingRuntimeSummary = {
  selectedTransport: HomeNodeNetworkingNoneTransport;
  selectedProvider: HomeNodeNetworkingNoneTransport;
  qrTransport: HomeNodeNetworkingNoneTransport;
  listenerFreeWrapperArmed: boolean;
  requestAcceptance: HomeNodeNetworkingRequestAcceptance;
};

export type HomeNodeNetworkingSettingsSummary = {
  selectedTransport: HomeNodeNetworkingNoneTransport;
  runtimeProvider: HomeNodeNetworkingNoneTransport;
  qrTransport: HomeNodeNetworkingNoneTransport;
  pairedDeviceRecordCount: number;
};

export type HomeNodeNetworkingConsistencyCheck = {
  name:
    | "selected_transport"
    | "runtime_provider"
    | "qr_transport"
    | "paired_device_count"
    | "request_acceptance";
  status: HomeNodeNetworkingConsistencyStatus;
  settings: HomeNodeNetworkingSummaryValue | number;
  runtime: HomeNodeNetworkingSummaryValue | number;
};

export type HomeNodeNetworkingRequiredEvidence =
  | "sourceVersions"
  | "settingsSummary"
  | "runtimeSummary"
  | "readinessChecks";

export type HomeNodeNetworkingCloseoutEvidence = {
  sourceVersions?: Partial<Record<HomeNodeNetworkingCloseoutSource, string | null | undefined>>;
  counts?: Partial<Record<HomeNodeNetworkingSafeCount, number | null | undefined>>;
  settingsSummary?: Partial<HomeNodeNetworkingSettingsSummary>;
  runtimeSummary?: Partial<HomeNodeNetworkingRuntimeSummary>;
};

export type HomeNodeNetworkingPhaseCloseout = {
  phase: typeof HOME_NODE_NETWORKING_CLOSEOUT_PHASE;
  schemaVersion: typeof HOME_NODE_NETWORKING_CLOSEOUT_SCHEMA_VERSION;
  sourceVersions: Record<HomeNodeNetworkingCloseoutSource, string>;
  counts: Record<HomeNodeNetworkingSafeCount, number>;
  readinessStatus: HomeNodeNetworkingReadinessStatus;
  settingsRuntimeConsistency: {
    consistent: boolean;
    checks: HomeNodeNetworkingConsistencyCheck[];
  };
  evidenceCompleteness: {
    complete: boolean;
    missing: HomeNodeNetworkingRequiredEvidence[];
  };
  settingsSummary: HomeNodeNetworkingSettingsSummary;
  runtimeSummary: HomeNodeNetworkingRuntimeSummary;
  deniedAuthorityFlags: Record<HomeNodeNetworkingDeniedAuthority, true>;
  excludedEvidence: readonly HomeNodeNetworkingExcludedEvidence[];
};

const VERSION_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const sanitizeVersionLabel = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return "unavailable";
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "unavailable";
  }

  return VERSION_LABEL_PATTERN.test(trimmed) ? trimmed : "redacted";
};

const normalizeCount = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
};

const normalizeNone = (value: unknown): HomeNodeNetworkingNoneTransport =>
  value === "none" ? "none" : "none";

const summarizeNone = (value: unknown): HomeNodeNetworkingSummaryValue =>
  value === "none" ? "none" : "redacted";

const summarizeRequestAcceptance = (value: unknown): HomeNodeNetworkingSummaryValue =>
  value === "blocked" ? "blocked" : "redacted";

const hasOwn = (object: object | undefined, key: PropertyKey) =>
  object ? Object.prototype.hasOwnProperty.call(object, key) : false;

const buildDeniedAuthorityFlags = (): Record<HomeNodeNetworkingDeniedAuthority, true> =>
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES.reduce(
    (flags, authority) => ({
      ...flags,
      [authority]: true,
    }),
    {} as Record<HomeNodeNetworkingDeniedAuthority, true>
  );

const buildSourceVersions = (
  versions: HomeNodeNetworkingCloseoutEvidence["sourceVersions"] = {}
): Record<HomeNodeNetworkingCloseoutSource, string> => ({
  transportApprovalDiagnostics: sanitizeVersionLabel(versions.transportApprovalDiagnostics),
  homeNodeApi: sanitizeVersionLabel(versions.homeNodeApi),
  listenerFreeRuntime: sanitizeVersionLabel(versions.listenerFreeRuntime),
  settings: sanitizeVersionLabel(versions.settings),
  pairedDevices: sanitizeVersionLabel(versions.pairedDevices),
});

const buildRuntimeSummary = (
  runtimeSummary: HomeNodeNetworkingCloseoutEvidence["runtimeSummary"] = {}
): HomeNodeNetworkingRuntimeSummary => ({
  selectedTransport: normalizeNone(runtimeSummary.selectedTransport),
  selectedProvider: normalizeNone(runtimeSummary.selectedProvider),
  qrTransport: normalizeNone(runtimeSummary.qrTransport),
  listenerFreeWrapperArmed: runtimeSummary.listenerFreeWrapperArmed === true,
  requestAcceptance: runtimeSummary.requestAcceptance === "blocked" ? "blocked" : "blocked",
});

const buildSettingsSummary = (
  settingsSummary: HomeNodeNetworkingCloseoutEvidence["settingsSummary"] = {}
): HomeNodeNetworkingSettingsSummary => ({
  selectedTransport: normalizeNone(settingsSummary.selectedTransport),
  runtimeProvider: normalizeNone(settingsSummary.runtimeProvider),
  qrTransport: normalizeNone(settingsSummary.qrTransport),
  pairedDeviceRecordCount: normalizeCount(settingsSummary.pairedDeviceRecordCount),
});

const buildCounts = (
  counts: HomeNodeNetworkingCloseoutEvidence["counts"] = {},
  settingsSummary: HomeNodeNetworkingSettingsSummary
): Record<HomeNodeNetworkingSafeCount, number> => ({
  approvalPacketSummaries: normalizeCount(counts.approvalPacketSummaries),
  runtimeSnapshotSummaries: normalizeCount(counts.runtimeSnapshotSummaries),
  settingsDisplayRows: normalizeCount(counts.settingsDisplayRows),
  pairedDeviceRecords: normalizeCount(
    counts.pairedDeviceRecords ?? settingsSummary.pairedDeviceRecordCount
  ),
  readinessChecks: normalizeCount(counts.readinessChecks),
  deniedAuthorities: HOME_NODE_NETWORKING_DENIED_AUTHORITIES.length,
});

const isCompleteSourceVersionEvidence = (
  sourceVersions: Record<HomeNodeNetworkingCloseoutSource, string>
) =>
  Object.values(sourceVersions).every((version) => version !== "unavailable" && version !== "redacted");

const isCompleteSettingsSummaryEvidence = (
  evidenceSettingsSummary: HomeNodeNetworkingCloseoutEvidence["settingsSummary"] = {}
) =>
  hasOwn(evidenceSettingsSummary, "selectedTransport") &&
  hasOwn(evidenceSettingsSummary, "runtimeProvider") &&
  hasOwn(evidenceSettingsSummary, "qrTransport") &&
  hasOwn(evidenceSettingsSummary, "pairedDeviceRecordCount");

const isCompleteRuntimeSummaryEvidence = (
  evidenceRuntimeSummary: HomeNodeNetworkingCloseoutEvidence["runtimeSummary"] = {}
) =>
  hasOwn(evidenceRuntimeSummary, "selectedTransport") &&
  hasOwn(evidenceRuntimeSummary, "selectedProvider") &&
  hasOwn(evidenceRuntimeSummary, "qrTransport") &&
  hasOwn(evidenceRuntimeSummary, "listenerFreeWrapperArmed") &&
  hasOwn(evidenceRuntimeSummary, "requestAcceptance");

const buildEvidenceCompleteness = (
  evidence: HomeNodeNetworkingCloseoutEvidence,
  sourceVersions: Record<HomeNodeNetworkingCloseoutSource, string>,
  counts: Record<HomeNodeNetworkingSafeCount, number>
) => {
  const missing: HomeNodeNetworkingRequiredEvidence[] = [];

  if (!isCompleteSourceVersionEvidence(sourceVersions)) {
    missing.push("sourceVersions");
  }
  if (!isCompleteSettingsSummaryEvidence(evidence.settingsSummary)) {
    missing.push("settingsSummary");
  }
  if (!isCompleteRuntimeSummaryEvidence(evidence.runtimeSummary)) {
    missing.push("runtimeSummary");
  }
  if (counts.readinessChecks <= 0) {
    missing.push("readinessChecks");
  }

  return {
    complete: missing.length === 0,
    missing,
  };
};

const buildConsistencyChecks = (
  evidenceSettingsSummary: HomeNodeNetworkingCloseoutEvidence["settingsSummary"] = {},
  evidenceRuntimeSummary: HomeNodeNetworkingCloseoutEvidence["runtimeSummary"] = {},
  settingsSummary: HomeNodeNetworkingSettingsSummary,
  runtimeSummary: HomeNodeNetworkingRuntimeSummary
): HomeNodeNetworkingConsistencyCheck[] => {
  const selectedTransportSettings = hasOwn(evidenceSettingsSummary, "selectedTransport")
    ? summarizeNone(evidenceSettingsSummary.selectedTransport)
    : settingsSummary.selectedTransport;
  const selectedTransportRuntime = hasOwn(evidenceRuntimeSummary, "selectedTransport")
    ? summarizeNone(evidenceRuntimeSummary.selectedTransport)
    : runtimeSummary.selectedTransport;
  const runtimeProviderSettings = hasOwn(evidenceSettingsSummary, "runtimeProvider")
    ? summarizeNone(evidenceSettingsSummary.runtimeProvider)
    : settingsSummary.runtimeProvider;
  const runtimeProviderRuntime = hasOwn(evidenceRuntimeSummary, "selectedProvider")
    ? summarizeNone(evidenceRuntimeSummary.selectedProvider)
    : runtimeSummary.selectedProvider;
  const qrTransportSettings = hasOwn(evidenceSettingsSummary, "qrTransport")
    ? summarizeNone(evidenceSettingsSummary.qrTransport)
    : settingsSummary.qrTransport;
  const qrTransportRuntime = hasOwn(evidenceRuntimeSummary, "qrTransport")
    ? summarizeNone(evidenceRuntimeSummary.qrTransport)
    : runtimeSummary.qrTransport;
  const requestAcceptanceRuntime = hasOwn(evidenceRuntimeSummary, "requestAcceptance")
    ? summarizeRequestAcceptance(evidenceRuntimeSummary.requestAcceptance)
    : runtimeSummary.requestAcceptance;

  return [
    {
      name: "selected_transport",
      status:
        selectedTransportSettings === "none" && selectedTransportRuntime === "none"
          ? "consistent"
          : "blocked",
      settings: selectedTransportSettings,
      runtime: selectedTransportRuntime,
    },
    {
      name: "runtime_provider",
      status:
        runtimeProviderSettings === "none" && runtimeProviderRuntime === "none"
          ? "consistent"
          : "blocked",
      settings: runtimeProviderSettings,
      runtime: runtimeProviderRuntime,
    },
    {
      name: "qr_transport",
      status:
        qrTransportSettings === "none" && qrTransportRuntime === "none"
          ? "consistent"
          : "blocked",
      settings: qrTransportSettings,
      runtime: qrTransportRuntime,
    },
    {
      name: "paired_device_count",
      status: "consistent",
      settings: settingsSummary.pairedDeviceRecordCount,
      runtime: settingsSummary.pairedDeviceRecordCount,
    },
    {
      name: "request_acceptance",
      status: requestAcceptanceRuntime === "blocked" ? "consistent" : "blocked",
      settings: "blocked",
      runtime: requestAcceptanceRuntime,
    },
  ];
};

export const buildHomeNodeNetworkingPhaseCloseout = (
  evidence: HomeNodeNetworkingCloseoutEvidence = {}
): HomeNodeNetworkingPhaseCloseout => {
  const sourceVersions = buildSourceVersions(evidence.sourceVersions);
  const settingsSummary = buildSettingsSummary(evidence.settingsSummary);
  const runtimeSummary = buildRuntimeSummary(evidence.runtimeSummary);
  const counts = buildCounts(evidence.counts, settingsSummary);
  const evidenceCompleteness = buildEvidenceCompleteness(evidence, sourceVersions, counts);
  const checks = buildConsistencyChecks(
    evidence.settingsSummary,
    evidence.runtimeSummary,
    settingsSummary,
    runtimeSummary
  );
  const consistent = checks.every((check) => check.status === "consistent");

  return {
    phase: HOME_NODE_NETWORKING_CLOSEOUT_PHASE,
    schemaVersion: HOME_NODE_NETWORKING_CLOSEOUT_SCHEMA_VERSION,
    sourceVersions,
    counts,
    readinessStatus:
      evidenceCompleteness.complete && consistent ? "ready_for_client_phase" : "blocked",
    settingsRuntimeConsistency: {
      consistent,
      checks,
    },
    evidenceCompleteness,
    settingsSummary,
    runtimeSummary,
    deniedAuthorityFlags: buildDeniedAuthorityFlags(),
    excludedEvidence: HOME_NODE_NETWORKING_CLOSEOUT_EXCLUDED_EVIDENCE,
  };
};
