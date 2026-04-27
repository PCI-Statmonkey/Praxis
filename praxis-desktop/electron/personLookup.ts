import type { PersonLookupRequest } from "../shared/personLookup";
import { lookupPersonInSnapshot } from "../shared/personLookupEngine";
import { getEmailSnapshot } from "./emailRepository";
import { getWorkSnapshot } from "./workRepository";

export const lookupPerson = (request: PersonLookupRequest) => {
  const snapshot = getWorkSnapshot();
  const emailSnapshot = getEmailSnapshot();
  return lookupPersonInSnapshot(request, snapshot, {
    messages: emailSnapshot.messages,
    contactSuggestionDismissals: emailSnapshot.contactSuggestionDismissals,
  });
};
