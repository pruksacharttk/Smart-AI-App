interface StatusBadgeProps {
  text: string;
  tone?: "ok" | "warn" | "error";
}

export function StatusBadge({ text, tone = "ok" }: StatusBadgeProps) {
  return (
    <div className={`status ${tone}`} role="status" aria-live="polite">
      {text}
    </div>
  );
}
