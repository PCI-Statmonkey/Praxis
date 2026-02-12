export type PraxisApi = {
  ping: () => Promise<unknown>;
  getStatus: () => Promise<unknown>;
  persistenceGetDbStatus: () => Promise<unknown>;
  syncGetStatus: () => Promise<unknown>;
};

const getPraxis = (): PraxisApi => {
  const api = (window as unknown as { praxis?: PraxisApi }).praxis;
  if (!api) {
    throw new Error("praxis API unavailable");
  }
  return api;
};

export const callPing = () => getPraxis().ping();
export const callGetStatus = () => getPraxis().getStatus();
export const callPersistenceGetDbStatus = () => getPraxis().persistenceGetDbStatus();
export const callSyncGetStatus = () => getPraxis().syncGetStatus();
