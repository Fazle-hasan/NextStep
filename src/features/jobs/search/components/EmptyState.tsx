type Props = { title: string; body?: string; children?: React.ReactNode };

// Friendly placeholder for lists with nothing in them.
export function EmptyState({ title, body, children }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {children}
    </div>
  );
}
