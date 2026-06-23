'use client';
import { TRANSITIONS } from '@helphub/shared';
import type { TicketInfo, UserInfo, Status } from '@helphub/shared';
import { useTransitionTicket } from '../lib/queries/tickets';

interface Props {
  ticket: TicketInfo;
  user: UserInfo;
}

export function TransitionActions({ ticket, user }: Props) {
  const { mutate, isPending } = useTransitionTicket();

  const available = TRANSITIONS[ticket.status].filter((t) =>
    t.allowedRoles(ticket, user),
  );

  if (available.length === 0) return null;

  return (
    <div className="flex gap-2">
      {available.map((t) => (
        <button
          key={t.to}
          onClick={() => mutate({ ticketId: ticket.id, status: t.to })}
          disabled={isPending}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          {t.to.replace('_', ' ')}
        </button>
      ))}
    </div>
  );
}
