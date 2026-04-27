export type CommandName =
  | "log_idea"
  | "create_mission"
  | "summarize_signals"
  | "focus_today"
  | "remind"
  | "toggle_focus_mode";

export type CommandInvocation = {
  name: CommandName;
  args: Record<string, unknown>;
  source: {
    surface: string;
    suggestionId?: string;
    actionId?: string;
  };
};
