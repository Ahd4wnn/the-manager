import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="rise"
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div>
        <h1 className="h-title">{title}</h1>
        {subtitle && (
          <p className="muted" style={{ marginTop: 3 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
