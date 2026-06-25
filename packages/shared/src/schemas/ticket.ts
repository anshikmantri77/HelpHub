import { z } from 'zod';

export const CreateTicketInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
});

export const TransitionInput = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'reopened', 'closed']),
});

export const TicketResponse = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['open', 'in_progress', 'resolved', 'reopened', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  requesterId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable(),
  slaDueAt: z.string().nullable(),
  slaBreached: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaginatedMeta = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const TicketListResponse = z.object({
  data: z.array(TicketResponse),
  meta: PaginatedMeta,
});

export const Comment = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string(),
  isInternal: z.boolean(),
  createdAt: z.string(),
});

export const ListTicketsQuery = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'reopened', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'priority']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const CreateCommentInput = z.object({
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
});

export type CreateTicketInput = z.infer<typeof CreateTicketInput>;
export type TransitionInput = z.infer<typeof TransitionInput>;
export type TicketResponse = z.infer<typeof TicketResponse>;
export type TicketListResponse = z.infer<typeof TicketListResponse>;
export type PaginatedMeta = z.infer<typeof PaginatedMeta>;
export type Comment = z.infer<typeof Comment>;
export type ListTicketsQuery = z.infer<typeof ListTicketsQuery>;
export type CreateCommentInput = z.infer<typeof CreateCommentInput>;

