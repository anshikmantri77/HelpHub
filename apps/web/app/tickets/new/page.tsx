'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateTicketInput } from '@helphub/shared';
import { useCreateTicket } from '../../../lib/queries/tickets';

export default function NewTicketPage() {
  const router = useRouter();
  const { mutate, isPending, error } = useCreateTicket();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

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
      onSuccess: () => {
        router.push('/tickets');
      },
      onError: (err) => {
        setServerError(
          err instanceof Error ? err.message : 'Failed to create ticket',
        );
      },
    });
  }

  return (
    <div className="mx-auto mt-16 max-w-lg px-4">
      <h1 className="mb-6 text-2xl font-bold">New ticket</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
          {fieldErrors.description && (
            <p className="mt-1 text-sm text-red-600">
              {fieldErrors.description}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Priority</label>
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as typeof priority)
            }
            className="w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        {serverError && (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </div>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Creating...' : 'Create ticket'}
        </button>
      </form>
    </div>
  );
}
