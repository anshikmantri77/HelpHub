/** Returns a human-readable relative time string for any ISO timestamp.
 *  Positive offsets = in the future ("in 2 hours"), negative = past ("3 hours ago"). */
export function formatRelativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const absSec = Math.abs(diffMs) / 1000;
  const future = diffMs > 0;

  if (absSec < 60) return future ? 'just now' : 'just now';
  if (absSec < 3600) {
    const m = Math.round(absSec / 60);
    return future ? `in ${m}m` : `${m}m ago`;
  }
  if (absSec < 86400) {
    const h = Math.round(absSec / 3600);
    return future ? `in ${h}h` : `${h}h ago`;
  }
  const d = Math.round(absSec / 86400);
  return future ? `in ${d}d` : `${d}d ago`;
}

/** SLA urgency metadata for a due-at ISO string. Returns null if no SLA set. */
export function formatSlaDue(slaDueAt: string | null): {
  label: string;
  color: 'green' | 'amber' | 'red';
} | null {
  if (!slaDueAt) return null;
  const diffMs = new Date(slaDueAt).getTime() - Date.now();
  const label = formatRelativeTime(slaDueAt);
  if (diffMs < 0) return { label: `Overdue (${label})`, color: 'red' };
  if (diffMs < 24 * 3600 * 1000) return { label: `Due ${label}`, color: 'amber' };
  return { label: `Due ${label}`, color: 'green' };
}

/** Visual metadata for ticket priority values. */
export function priorityMeta(priority: string): {
  label: string;
  className: string;
} {
  switch (priority) {
    case 'urgent':
      return { label: 'Urgent', className: 'text-red-700 font-semibold' };
    case 'high':
      return { label: 'High', className: 'text-amber-700 font-medium' };
    case 'medium':
      return { label: 'Medium', className: 'text-gray-700' };
    case 'low':
      return { label: 'Low', className: 'text-gray-400' };
    default:
      return { label: priority, className: 'text-gray-600' };
  }
}

/** Convert snake_case status to readable label. */
export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

/** Badge colour classes for status strings. */
export function statusClassName(status: string): string {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
    case 'reopened':
      return 'bg-orange-100 text-orange-800';
    case 'closed':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}
