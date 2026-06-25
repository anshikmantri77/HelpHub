'use client';
import { TRANSITIONS } from '@helphub/shared';
import type { TicketInfo, UserInfo, Status } from '@helphub/shared';
import { useTransitionTicket } from '../lib/queries/tickets';
import { statusLabel } from '../lib/utils';

interface Props {
  ticket: TicketInfo;
  user: UserInfo;
}

export function TransitionActions({ ticket, user }: Props) {
  const { mutate, isPending, variables } = useTransitionTicket();

  const available = TRANSITIONS[ticket.status].filter((t) =>
    t.allowedRoles(ticket, user),
  );

  if (available.length === 0) return null;

  // The currently-pending status (if any), so each button shows its own spinner.
  const pendingStatus = isPending ? variables?.status : undefined;

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((t) => {
        const isThisPending = pendingStatus === t.to;
        return (
          <button
            key={t.to}
            onClick={() => mutate({ ticketId: ticket.id, status: t.to })}
            disabled={isPending}
            aria-busy={isThisPending}
            aria-label={`Transition ticket to ${statusLabel(t.to)}`}
            className="rounded border border-gray-300 px-3 py-1 text-sm capitalize hover:bg-gray-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isThisPending ? (
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {statusLabel(t.to)}
              </span>
            ) : (
              statusLabel(t.to)
            )}
          </button>
        );
      })}
    </div>
  );
}
