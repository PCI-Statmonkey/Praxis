const DEFAULT_RETRY_DELAYS_MS = [400, 1200];
const TRANSIENT_HTTP_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export class TransientSyncError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
  }
}

export const isTransientHttpStatus = (status: number) => TRANSIENT_HTTP_STATUSES.has(status);

export const isTransientSyncError = (error: unknown) =>
  error instanceof TransientSyncError ||
  error instanceof TypeError ||
  (error instanceof Error &&
    /\b(network|timeout|timed out|fetch failed|socket|econnreset|etimedout)\b/i.test(error.message));

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const parseJsonSafely = async <T>(response: Response): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
};

export const fetchJsonWithRetry = async <T>(
  url: string | URL,
  init: RequestInit,
  description: string,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS
) => {
  let lastTransientError: unknown = null;

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      const response = await fetch(url, init);
      const payload = await parseJsonSafely<T>(response);
      if (!response.ok && isTransientHttpStatus(response.status)) {
        const transientError = new TransientSyncError(
          `${description} hit temporary HTTP ${response.status}.`,
          response.status
        );
        if (attempt >= retryDelaysMs.length) {
          throw transientError;
        }
        lastTransientError = transientError;
        await delay(retryDelaysMs[attempt]);
        continue;
      }

      return { response, payload };
    } catch (error) {
      if (!isTransientSyncError(error) || attempt >= retryDelaysMs.length) {
        throw error;
      }
      lastTransientError = error;
      await delay(retryDelaysMs[attempt]);
    }
  }

  if (lastTransientError instanceof Error) {
    throw lastTransientError;
  }
  throw new TransientSyncError(`${description} failed after retrying.`);
};

export const recoverableSyncMessage = (providerLabel: string, error: unknown) => {
  if (error instanceof TransientSyncError && error.status) {
    return `${providerLabel} sync hit a temporary provider error (${error.status}). Praxis will retry automatically.`;
  }
  if (isTransientSyncError(error)) {
    return `${providerLabel} sync hit a temporary network problem. Praxis will retry automatically.`;
  }
  return null;
};

export const recoverableSyncState = (providerLabel: string, error: unknown) => {
  const message = recoverableSyncMessage(providerLabel, error);
  return message
    ? {
        message,
        authStatus: "ready" as const,
        syncStatus: "error" as const,
      }
    : null;
};
