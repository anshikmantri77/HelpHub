'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTickets } from '../../lib/queries/tickets';
import { useAuthStore } from '../../lib/store';
import { ApiError } from '../../lib/api-client';
import { AccessDenied } from '../../components/AccessDenied';
import {
  priorityMeta,
  statusLabel,
  statusClassName,
  formatSlaDue,
} from '../../lib/utils';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TicketListSkeleton() {
  return (
    <div className="overflow-hidden rounded border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 font-medium">Title</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Priority</th>
            <th className="px-4 py-2 font-medium">SLA</th>
            <th className="px-4 py-2 font-medium">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-3">
                <div className="h-4 w-48 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-20 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-14 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-20 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────

function ErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const code =
    error instanceof ApiError ? error.code : 'ERROR';
  const message =
    error instanceof ApiError ? error.message : 'Failed to load tickets.';

  return (
    <div className="rounded border border-red-300 bg-red-50 px-6 py-10 text-center">
      <p className="mb-1 text-xs font-mono font-medium uppercase tracking-wider text-red-500">
        {code}
      </p>
      <p className="mb-4 text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Retry
      </button>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  hasFilters,
  onClearFilters,
  canCreate,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
  canCreate: boolean;
}) {
  return (
    <div className="rounded border border-dashed border-gray-300 px-4 py-16 text-center">
      {hasFilters ? (
        <>
          <p className="mb-2 text-gray-500">No tickets match your filters.</p>
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear filters
          </button>
        </>
      ) : (
        <>
          <p className="mb-2 text-gray-500">No tickets in your queue.</p>
          {canCreate && (
            <Link
              href="/tickets/new"
              className="text-sm text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create a ticket
            </Link>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial filter state from URL
  const status = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const sort = searchParams.get('sort') ?? 'createdAt';
  const order = searchParams.get('order') ?? 'desc';
  const page = Number(searchParams.get('page') ?? '0');
  const assigneeMe = searchParams.get('assigneeMe') === '1';
  const breachedOnly = searchParams.get('breachedOnly') === '1';

  const limit = 20;
  const user = useAuthStore((s) => s.user);
  const isAgent = user?.role === 'agent' || user?.role === 'admin';

  /** Push filter changes back into URL so state persists on refresh / can be shared. */
  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value === '' || value === '0') {
      p.delete(key);
    } else {
      p.set(key, value);
    }
    p.delete('page'); // reset page when any filter changes
    router.replace(`/tickets?${p.toString()}`);
  }

  function clearFilters() {
    router.replace('/tickets');
  }

  const effectiveAssigneeId =
    assigneeMe && user ? user.id : undefined;

  const { data, isLoading, isError, error, refetch } = useTickets({
    status: status || undefined,
    priority: priority || undefined,
    sort: sort || undefined,
    order: order || undefined,
    limit,
    offset: page * limit,
    assigneeId: effectiveAssigneeId,
  });

  // Client-side breached-only filter (API doesn't expose this param yet)
  const tickets =
    breachedOnly
      ? (data?.data ?? []).filter((t) => t.slaBreached)
      : (data?.data ?? []);

  const hasFilters =
    !!status || !!priority || assigneeMe || breachedOnly;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
        <TicketListSkeleton />
      </div>
    );
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 403) {
      return <AccessDenied />;
    }
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <ErrorState error={error as Error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tickets</h1>
        {user && (
          <Link
            href="/tickets/new"
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            New ticket
          </Link>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          id="filter-status"
          value={status}
          onChange={(e) => setParam('status', e.target.value)}
          aria-label="Filter by status"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="reopened">Reopened</option>
          <option value="closed">Closed</option>
        </select>

        <select
          id="filter-priority"
          value={priority}
          onChange={(e) => setParam('priority', e.target.value)}
          aria-label="Filter by priority"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          id="filter-sort"
          value={sort}
          onChange={(e) => setParam('sort', e.target.value)}
          aria-label="Sort by"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="createdAt">Sort: Created</option>
          <option value="updatedAt">Sort: Updated</option>
          <option value="priority">Sort: Priority</option>
        </select>

        <button
          onClick={() => setParam('order', order === 'asc' ? 'desc' : 'asc')}
          aria-label={order === 'asc' ? 'Sort descending' : 'Sort ascending'}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {order === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>

        {/* Agent-only toggles */}
        {isAgent && (
          <>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={assigneeMe}
                onChange={(e) =>
                  setParam('assigneeMe', e.target.checked ? '1' : '0')
                }
                className="focus:ring-2 focus:ring-blue-500"
              />
              Assigned to me
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={breachedOnly}
                onChange={(e) =>
                  setParam('breachedOnly', e.target.checked ? '1' : '0')
                }
                className="focus:ring-2 focus:ring-blue-500"
              />
              Breached only
            </label>
          </>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto text-sm text-gray-500 underline hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Content */}
      {tickets.length === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          canCreate={!!user}
        />
      ) : (
        <>
          {/* Mobile-scrollable table wrapper */}
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Priority</th>
                  <th className="px-4 py-2 font-medium">SLA</th>
                  <th className="px-4 py-2 font-medium">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const pMeta = priorityMeta(ticket.priority);
                  const slaMeta = formatSlaDue(ticket.slaDueAt);
                  const slaColor =
                    slaMeta?.color === 'red'
                      ? 'text-red-600'
                      : slaMeta?.color === 'amber'
                        ? 'text-amber-600'
                        : 'text-green-700';

                  return (
                    <tr key={ticket.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/tickets/${ticket.id}`}
                            className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {ticket.title}
                          </Link>
                          {ticket.slaBreached && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-red-700">
                              BREACH
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${statusClassName(ticket.status)}`}
                        >
                          {statusLabel(ticket.status)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 capitalize ${pMeta.className}`}>
                        {pMeta.label}
                      </td>
                      <td className="px-4 py-3">
                        {slaMeta ? (
                          <span className={`text-xs ${slaColor}`}>
                            {slaMeta.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {ticket.assigneeId ? 'Assigned' : 'Unassigned'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <button
              onClick={() =>
                setParam('page', String(Math.max(0, page - 1)))
              }
              disabled={page === 0}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              ← Previous
            </button>
            <span>
              {data && data.meta.total > 0
                ? `${page * limit + 1}–${Math.min(
                    (page + 1) * limit,
                    data.meta.total,
                  )} of ${data.meta.total}`
                : '0 results'}
            </span>
            <button
              onClick={() => setParam('page', String(page + 1))}
              disabled={!data || (page + 1) * limit >= data.meta.total}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
