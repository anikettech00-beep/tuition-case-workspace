interface StatusBadgeProps {
  status: string;
}

const colors: Record<string, string> = {
  OPEN: 'bg-emerald-100 text-emerald-800',
  MATCHED: 'bg-amber-100 text-amber-800',
  CLOSED: 'bg-zinc-100 text-zinc-600',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    // <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-zinc-100'}`}>
    //   {status}
    // </span>
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colors[status] ?? 'bg-zinc-100'
      }`}
    >
      {status}
    </span>
  );
}
