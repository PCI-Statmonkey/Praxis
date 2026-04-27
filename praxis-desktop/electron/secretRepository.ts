import { safeStorage } from "electron";
import type {
  SecretKind,
  SecretOwnerKind,
  StoreSecretInput,
  StoredSecretMetadata,
} from "../shared/secretStorage";
import type { SecretStorageStatus } from "../shared/settingsModel";
import { getPraxisDatabase } from "./praxisDb";

type DbSecret = {
  owner_kind: SecretOwnerKind;
  owner_id: string;
  secret_kind: SecretKind;
  encrypted_value_base64: string;
  created_at: string;
  updated_at: string;
};

const ENCRYPTION_PROVIDER = "electron_safe_storage";
const nowIso = () => new Date().toISOString();

export const getSecretStorageStatus = (): SecretStorageStatus => {
  const available = safeStorage.isEncryptionAvailable();
  return {
    available,
    provider: ENCRYPTION_PROVIDER,
    reason: available
      ? "OS-backed encryption is available for local secrets."
      : "OS-backed encryption is unavailable in this desktop session.",
  };
};

export const storeSecret = (input: StoreSecretInput): StoredSecretMetadata => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS-backed secret encryption is unavailable.");
  }

  const timestamp = nowIso();
  const encryptedValue = safeStorage.encryptString(input.value).toString("base64");

  getPraxisDatabase()
    .prepare(
      `INSERT INTO secure_secrets (
        owner_kind,
        owner_id,
        secret_kind,
        encrypted_value_base64,
        encryption_provider,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_kind, owner_id, secret_kind) DO UPDATE SET
        encrypted_value_base64 = excluded.encrypted_value_base64,
        encryption_provider = excluded.encryption_provider,
        updated_at = excluded.updated_at`
    )
    .run(
      input.ownerKind,
      input.ownerId,
      input.secretKind,
      encryptedValue,
      ENCRYPTION_PROVIDER,
      timestamp,
      timestamp
    );

  return {
    ownerKind: input.ownerKind,
    ownerId: input.ownerId,
    secretKind: input.secretKind,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const readSecret = (
  ownerKind: SecretOwnerKind,
  ownerId: string,
  secretKind: SecretKind
): string | null => {
  if (!safeStorage.isEncryptionAvailable()) {
    return null;
  }

  const row = getPraxisDatabase()
    .prepare(
      `SELECT *
       FROM secure_secrets
       WHERE owner_kind = ? AND owner_id = ? AND secret_kind = ?`
    )
    .get(ownerKind, ownerId, secretKind) as DbSecret | undefined;

  if (!row) {
    return null;
  }

  return safeStorage.decryptString(Buffer.from(row.encrypted_value_base64, "base64"));
};

export const deleteSecretsForOwner = (ownerKind: SecretOwnerKind, ownerId: string) => {
  getPraxisDatabase()
    .prepare("DELETE FROM secure_secrets WHERE owner_kind = ? AND owner_id = ?")
    .run(ownerKind, ownerId);
};

export const hasSecret = (
  ownerKind: SecretOwnerKind,
  ownerId: string,
  secretKind: SecretKind
) => {
  const row = getPraxisDatabase()
    .prepare(
      `SELECT 1
       FROM secure_secrets
       WHERE owner_kind = ? AND owner_id = ? AND secret_kind = ?
       LIMIT 1`
    )
    .get(ownerKind, ownerId, secretKind);
  return Boolean(row);
};

export const deleteSecret = (
  ownerKind: SecretOwnerKind,
  ownerId: string,
  secretKind: SecretKind
) => {
  getPraxisDatabase()
    .prepare(
      `DELETE FROM secure_secrets
       WHERE owner_kind = ? AND owner_id = ? AND secret_kind = ?`
    )
    .run(ownerKind, ownerId, secretKind);
};
