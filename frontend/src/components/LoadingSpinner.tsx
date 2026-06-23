interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      {label}
    </div>
  );
}
