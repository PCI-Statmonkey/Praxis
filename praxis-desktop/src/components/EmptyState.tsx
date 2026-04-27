import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  detail: string;
  children?: ReactNode;
};

export function EmptyState({ title, detail, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-rule" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        {children ? <div className="empty-state-actions">{children}</div> : null}
      </div>
    </div>
  );
}
