'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreateTicketInput } from '@helphub/shared';
import { useCreateTicket } from '../../../lib/queries/tickets';
import { ApiError } from '../../../lib/api-client';

export default function NewTicketPage() {
  const router = useRouter();
  const { mutate, isPending } = useCreateTicket();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);
    setIsRateLimited(false);

    const parsed = CreateTicketInput.safeParse({ title, description, priority });
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fields[issue.path.join('.')] = issue.message;
      }
      setFieldErrors(fields);
      return;
    }

    mutate(parsed.data, {
      onSuccess: (ticket) => {
        // Redirect to the new ticket's detail page with a ?created=1 param
        // so the detail page can show a success flash if desired.
        router.push(`/tickets/${ticket.id}?created=1`);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 429) {
          setIsRateLimited(true);
          setServerError(
            'Too many requests. You can create up to 5 tickets per minute. Please wait before trying again.',
          );
        } else {
          setServerError(
            err instanceof Error ? err.message : 'Failed to create ticket',
          );
        }
      },
    });
  }

  return (
    <div className="mx-auto mt-8 max-w-lg px-4">
      <Link
        href="/tickets"
        className="mb-4 inline-block text-sm text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        ← Back to tickets
      </Link>

      <h1 className="mb-6 text-2xl font-bold">New ticket</h1>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="ticket-title" className="mb-1 block text-sm font-medium">
            Title
          </label>
          <input
            id="ticket-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
            aria-describedby={fieldErrors.title ? 'title-error' : undefined}
            className="w-full rounded border border-gray-300 px-3 py-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.title && (
            <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.title}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="ticket-description" className="mb-1 block text-sm font-medium">
            Description
          </label>
          <textarea
            id="ticket-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            disabled={isPending}
            aria-describedby={fieldErrors.description ? 'description-error' : undefined}
            className="w-full rounded border border-gray-300 px-3 py-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.description && (
            <p id="description-error" className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.description}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="ticket-priority" className="mb-1 block text-sm font-medium">
            Priority
          </label>
          <select
            id="ticket-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            disabled={isPending}
            className="w-full rounded border border-gray-300 px-3 py-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {serverError && (
          <div
            className={`rounded border px-3 py-2 text-sm ${
              isRateLimited
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-red-300 bg-red-50 text-red-700'
            }`}
            role="alert"
          >
            {isRateLimited && (
              <p className="mb-0.5 font-medium">Rate limit reached</p>
            )}
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isPending ? 'Creating…' : 'Create ticket'}
        </button>
      </form>
    </div>
  );
}
