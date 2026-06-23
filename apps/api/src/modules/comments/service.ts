import { NotFoundError, ForbiddenError } from '../../errors/AppError';
import * as repo from './repository';
import * as ticketRepo from '../tickets/repository';
import type { Role } from '@helphub/shared';

type Caller = { id: string; role: Role };

export async function create(
  ticketId: string,
  content: string,
  isInternal: boolean,
  user: Caller,
) {
  const ticket = await ticketRepo.findByIdForCaller(ticketId, user);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  const comment = await repo.create({
    ticketId,
    authorId: user.id,
    content,
    isInternal,
  });

  if (!comment) {
    throw new Error('Failed to create comment');
  }

  return {
    id: comment.id,
    ticketId: comment.ticketId,
    authorId: comment.authorId,
    content: comment.content,
    isInternal: comment.isInternal,
    createdAt: comment.createdAt.toISOString(),
  };
}

export async function list(ticketId: string, user: Caller) {
  const ticket = await ticketRepo.findByIdForCaller(ticketId, user);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  const rows = await repo.findByTicketId(ticketId, user);

  return rows.map(c => ({
    id: c.id,
    ticketId: c.ticketId,
    authorId: c.authorId,
    content: c.content,
    isInternal: c.isInternal,
    createdAt: c.createdAt.toISOString(),
  }));
}
