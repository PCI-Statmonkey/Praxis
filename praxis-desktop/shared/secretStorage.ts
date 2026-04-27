export type SecretOwnerKind = "calendar_connection" | "email_connection" | "integration_config";

export type SecretKind = "oauth_token" | "oauth_client_secret";

export type StoreSecretInput = {
  ownerKind: SecretOwnerKind;
  ownerId: string;
  secretKind: SecretKind;
  value: string;
};

export type StoredSecretMetadata = {
  ownerKind: SecretOwnerKind;
  ownerId: string;
  secretKind: SecretKind;
  createdAt: string;
  updatedAt: string;
};
