import { TRANSITIONS, ListTicketsQuery } from '@helphub/shared';
import type {
  CreateTicketInput,
  TransitionInput,
  TicketResponse,
  TicketListResponse,
  Status,
} from '@helphub/shared';
import { ForbiddenError, NotFoundError, UnprocessableEntityError, ConflictError } from '../../errors/AppError';
import * as repo from './repository';
import { computeSlaDueAt } from '../sla/service';

type Role = 'customer' | 'agent' | 'admin';

function toResponse(ticket: {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  requesterId: string;
  assigneeId: string | null;
  slaDueAt: Date | null;
  slaBreached: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TicketResponse {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status as TicketResponse['status'],
    priority: ticket.priority as TicketResponse['priority'],
    requesterId: ticket.requesterId,
    assigneeId: ticket.assigneeId,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export async function create(
  input: CreateTicketInput,
  user: { id: string; role: Role },
) {
  const now = new Date();
  const slaDueAt = computeSlaDueAt(input.priority, now);
  const ticket = await repo.create({
    title: input.title,
    description: input.description,
    priority: input.priority,
    requesterId: user.id,
    createdAt: now,
    slaDueAt,
  });
  if (!ticket) {
    throw new Error('Failed to create ticket');
  }
  return toResponse(ticket);
}

export async function list(
  filters: {
    status?: Status;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assigneeId?: string;
    sort?: 'createdAt' | 'updatedAt' | 'priority';
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  },
  user: { id: string; role: Role },
): Promise<TicketListResponse> {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const { data, total } = await repo.listForCaller(
    { status: filters.status, priority: filters.priority, assigneeId: filters.assigneeId, sort: filters.sort, order: filters.order, limit, offset },
    user,
  );

  return {
    data: data.map(toResponse),
    meta: { total, limit, offset },
  };
}

export async function getById(
  id: string,
  user: { id: string; role: Role },
) {
  const ticket = await repo.findByIdForCaller(id, user);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }
  return toResponse(ticket);
}

export async function transition(
  ticketId: string,
  input: TransitionInput,
  user: { id: string; role: Role },
) {
  const ticket = await repo.findByIdForCaller(ticketId, user);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  const status = ticket.status as Status;
  const allowed = TRANSITIONS[status].find(t => t.to === input.status);
  if (!allowed) {
    throw new UnprocessableEntityError('INVALID_TRANSITION', { from: status, to: input.status });
  }

  const ticketInfo = { id: ticket.id, status, requesterId: ticket.requesterId, assigneeId: ticket.assigneeId };
  if (!allowed.allowedRoles(ticketInfo, user)) {
    throw new ForbiddenError('Insufficient permissions');
  }

  if (
    input.status === 'in_progress' &&
    !ticket.assigneeId &&
    (user.role === 'agent' || user.role === 'admin')
  ) {
    await repo.assign(ticketId, user.id);
  }

  const updated = await repo.updateStatus(ticketId, input.status);
  if (!updated) {
    throw new NotFoundError('Ticket not found');
  }

  return toResponse(updated);
}

export async function claim(
  ticketId: string,
  user: { id: string; role: Role },
) {
  if (user.role !== 'agent' && user.role !== 'admin') {
    throw new ForbiddenError('Only agents and admins can claim tickets');
  }

  try {
    const updated = await repo.claim(ticketId, user.id);
    return toResponse(updated);
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'Ticket not found') {
      throw new NotFoundError('Ticket not found');
    }
    throw new ConflictError('Ticket already assigned');
  }
}
