import type { MemoryReindexReport } from "../shared/storage/hybridStorage";
import { getStorageOverview, repairMemoryDocumentIndex } from "./praxisDb";

export const reindexMemoryDocuments = (): MemoryReindexReport => {
  const index = repairMemoryDocumentIndex();
  const overview = getStorageOverview();
  return {
    ok: true,
    reindexedAt: new Date().toISOString(),
    databasePath: overview.databasePath,
    index,
  };
};
