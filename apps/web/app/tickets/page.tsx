'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTickets } from '../../lib/queries/tickets';
import { useAuthStore } from '../../lib/store';
import { ApiError } from '../../lib/api-client';
import { AccessDenied } from '../../components/AccessDenied';

export default function TicketsPage() {
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [sort, setSort] = useState<string>('createdAt');
  const [order, setOrder] = useState<string>('desc');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, isError, error, refetch } = useTickets({
    status: status || undefined,
    priority: priority || undefined,
    sort: sort || undefined,
    order: order || undefined,
    limit,
    offset: page * limit,
  });

  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 403) {
      return <AccessDenied />;
    }
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded border border-red-300 bg-red-50 px-4 py-6 text-center">
          <p className="text-red-700">
            {error instanceof Error ? error.message : 'Failed to load tickets'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <div className="flex gap-3">
          {user && (
            <Link
              href="/tickets/new"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              New ticket
            </Link>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="reopened">Reopened</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(0);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(0);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="createdAt">Created</option>
          <option value="updatedAt">Updated</option>
          <option value="priority">Priority</option>
        </select>
        <button
          onClick={() => {
            setOrder(order === 'asc' ? 'desc' : 'asc');
            setPage(0);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
        >
          {order === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {!data || data.data.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 px-4 py-12 text-center">
          <p className="text-gray-500">No tickets yet.</p>
          {user && (
            <Link
              href="/tickets/new"
              className="mt-2 inline-block text-blue-600 underline"
            >
              Create your first ticket
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Priority</th>
                  <th className="px-4 py-2 font-medium">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((ticket) => (
                  <tr key={ticket.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="text-blue-600 underline"
                      >
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {ticket.status.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 capitalize">{ticket.priority}</td>
                    <td className="px-4 py-3">
                      {ticket.assigneeId ? 'Assigned' : 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              {page * limit + 1}–{Math.min((page + 1) * limit, data.meta.total)}{' '}
              of {data.meta.total}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * limit >= data.meta.total}
              className="disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
