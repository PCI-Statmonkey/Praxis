import {
  resolvePresenceSettings,
  type PresenceSettings,
  type PresenceMode,
} from "./settingsModel";

export type PresenceDisplayState = PresenceMode | "attention";

export type PresenceDisplayStatus = {
  state: PresenceDisplayState;
  label: string;
  detail: string;
};

export type BuildPresenceDisplayStatusInput = {
  presence: PresenceSettings;
  serviceAttentionCount?: number;
  now?: Date | string | number;
  quietUntilLabel?: string | null;
};

const serviceAttentionDetail = (serviceAttentionCount: number) =>
  `${serviceAttentionCount} service${serviceAttentionCount === 1 ? "" : "s"} need attention; local work remains available.`;

export const buildPresenceDisplayStatus = ({
  presence,
  serviceAttentionCount = 0,
  now = new Date(),
  quietUntilLabel = null,
}: BuildPresenceDisplayStatusInput): PresenceDisplayStatus => {
  const effectivePresence = resolvePresenceSettings(presence, now);
  if (effectivePresence.mode === "paused") {
    return {
      state: "paused",
      label: "PRAXIS paused",
      detail: "Nudges paused; sync can stay active.",
    };
  }

  if (effectivePresence.mode === "quiet_until" && effectivePresence.quietUntil) {
    return {
      state: "quiet_until",
      label: "PRAXIS quiet",
      detail: `Quiet until ${quietUntilLabel || effectivePresence.quietUntil}.`,
    };
  }

  if (serviceAttentionCount > 0) {
    return {
      state: "attention",
      label: "PRAXIS needs attention",
      detail: serviceAttentionDetail(serviceAttentionCount),
    };
  }

  return {
    state: "active",
    label: "PRAXIS active",
    detail: "Plan, review, and context are available.",
  };
};
