export function StatusBadge({ status }: { status: string }) {
  const cls = `badge-${status}`;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${cls}`}>
      {status}
    </span>
  );
}

export function TechBadge({ name }: { name: string }) {
  return (
    <span className="skill-chip">
      {name}
    </span>
  );
}
