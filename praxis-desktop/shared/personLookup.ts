export type PersonLookupField =
  | "email"
  | "phone"
  | "billingAddress"
  | "contact"
  | "relationships"
  | "profile";

export type PersonLookupRequest = {
  text: string;
};

export type PersonLookupResult =
  | {
      ok: true;
      personId: string;
      personName: string;
      field: PersonLookupField;
      value: string;
      message: string;
    }
  | {
      ok: false;
      reason: string;
    };
