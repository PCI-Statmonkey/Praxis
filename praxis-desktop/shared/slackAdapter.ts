export type SlackAdapterStatus = {
  enabled: boolean;
  reason: string;
};

export type SlackActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      reason: string;
    };

export type SlackTestSuggestionResult = SlackActionResult;
export type SlackConnectionTestResult = SlackActionResult;
export type SlackRestartResult = SlackActionResult;
