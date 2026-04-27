import type { ReactNode } from "react";

type ActionMenuProps = {
  label?: string;
  children: ReactNode;
};

export function ActionMenu({ label = "Actions", children }: ActionMenuProps) {
  return (
    <details className="action-menu">
      <summary>{label}</summary>
      <div className="action-menu-content">{children}</div>
    </details>
  );
}
