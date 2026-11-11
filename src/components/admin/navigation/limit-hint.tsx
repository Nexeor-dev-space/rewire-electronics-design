/** "2 of 4", the limit-reached note, and a list level error, shown beside an Add button. */
export function LimitHint({ count, max, error }: { count: number; max: number; error?: string }) {
  return (
    <>
      <span className="text-xs text-ink-muted">
        {count} of {max}
        {count >= max && " (limit reached)"}
      </span>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </>
  );
}
