/** Thin "or" separator between the OAuth button and the email form. */
export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
