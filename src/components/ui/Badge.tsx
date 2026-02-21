const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  beta: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  development: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  prototype: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  archived: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.archived;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${color}`}>
      {status}
    </span>
  );
}

export function TechBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
      {name}
    </span>
  );
}
