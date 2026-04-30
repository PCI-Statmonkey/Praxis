import type {
  CheckOllamaModelAvailabilityInput,
  OllamaModelAvailabilityResult,
} from "../shared/settingsModel";

const DEFAULT_OLLAMA_TAGS_URL = "http://127.0.0.1:11434/api/tags";
const DEFAULT_OLLAMA_PROBE_TIMEOUT_MS = 2500;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeModelName = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
};

export const parseOllamaModelTags = (payload: unknown) => {
  if (!isRecord(payload) || !Array.isArray(payload.models)) {
    return [];
  }

  const seen = new Set<string>();
  const modelTags: string[] = [];

  for (const model of payload.models) {
    if (!isRecord(model)) {
      continue;
    }

    const rawName = typeof model.name === "string" ? model.name : model.model;
    const modelName = normalizeModelName(typeof rawName === "string" ? rawName : null);
    if (!modelName || seen.has(modelName)) {
      continue;
    }

    seen.add(modelName);
    modelTags.push(modelName);
  }

  return modelTags;
};

export const isOllamaModelInstalled = (modelName: string, installedModels: string[]) => {
  const normalizedModelName = modelName.trim().toLowerCase();
  const acceptedNames = new Set([normalizedModelName]);

  if (!normalizedModelName.includes(":")) {
    acceptedNames.add(`${normalizedModelName}:latest`);
  }

  return installedModels.some((installedModel) =>
    acceptedNames.has(installedModel.trim().toLowerCase())
  );
};

type ProbeOptions = {
  fetchFn?: typeof fetch;
  tagsUrl?: string;
  timeoutMs?: number;
};

export const checkOllamaModelAvailability = async (
  input: CheckOllamaModelAvailabilityInput = {},
  options: ProbeOptions = {}
): Promise<OllamaModelAvailabilityResult> => {
  const modelName = normalizeModelName(input.modelName);

  if (!modelName) {
    return {
      localRuntime: "ollama",
      status: "no_model_selected",
      modelName: null,
      installedModels: [],
      message: "No saved Ollama model is selected.",
    };
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_OLLAMA_PROBE_TIMEOUT_MS;
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await (options.fetchFn ?? fetch)(options.tagsUrl ?? DEFAULT_OLLAMA_TAGS_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        localRuntime: "ollama",
        status: "unavailable",
        modelName,
        installedModels: [],
        message: `Ollama is unavailable at 127.0.0.1:11434 (HTTP ${response.status}).`,
      };
    }

    const installedModels = parseOllamaModelTags(await response.json());
    const status = isOllamaModelInstalled(modelName, installedModels) ? "available" : "missing";

    return {
      localRuntime: "ollama",
      status,
      modelName,
      installedModels,
      message:
        status === "available"
          ? `Saved Ollama model found: ${modelName}.`
          : `Saved Ollama model not found: ${modelName}.`,
    };
  } catch {
    return {
      localRuntime: "ollama",
      status: "unavailable",
      modelName,
      installedModels: [],
      message: timedOut
        ? "Ollama did not respond before the availability check timed out."
        : "Ollama is unavailable at 127.0.0.1:11434.",
    };
  } finally {
    clearTimeout(timeout);
  }
};
