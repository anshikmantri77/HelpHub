const SLA_HOURS: Record<string, number> = {
  urgent: 2,
  high: 8,
  medium: 24,
  low: 72,
};

export function computeSlaDueAt(priority: string, createdAt: Date): Date {
  const hours = SLA_HOURS[priority] ?? 24;
  return new Date(createdAt.getTime() + hours * 3_600_000);
}
