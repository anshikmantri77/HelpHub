'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../api-client';
import { useAuthStore } from '../store';
import type {
  TicketResponse,
  TicketListResponse,
  CreateTicketInput,
} from '@helphub/shared';

const TICKET_KEY = 'tickets';

export function useTickets(filters: {
  status?: string;
  priority?: string;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
  assigneeId?: string;
}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.order) params.set('order', filters.order);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  const qs = params.toString();

  return useQuery({
    queryKey: [TICKET_KEY, filters],
    queryFn: () =>
      apiFetch<TicketListResponse>(`/tickets${qs ? `?${qs}` : ''}`),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: [TICKET_KEY, id],
    queryFn: () => apiFetch<TicketResponse>(`/tickets/${id}`),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) =>
      apiFetch<TicketResponse>('/tickets', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TICKET_KEY] });
    },
  });
}

export function useClaimTicket() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (ticketId: string) =>
      apiFetch<TicketResponse>(`/tickets/${ticketId}/assign`, {
        method: 'PATCH',
      }),
    onMutate: async (ticketId) => {
      await queryClient.cancelQueries({ queryKey: [TICKET_KEY, ticketId] });
      const previous = queryClient.getQueryData<TicketResponse>([
        TICKET_KEY,
        ticketId,
      ]);
      queryClient.setQueryData<TicketResponse>(
        [TICKET_KEY, ticketId],
        (old) => {
          if (!old) return old;
          return { ...old, assigneeId: user?.id ?? null };
        },
      );
      return { previous };
    },
    onError: (err, ticketId, context) => {
      if (context?.previous) {
        queryClient.setQueryData([TICKET_KEY, ticketId], context.previous);
      }
    },
    onSettled: (_, __, ticketId) => {
      queryClient.invalidateQueries({ queryKey: [TICKET_KEY, ticketId] });
    },
  });
}

export function useTransitionTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      status,
    }: {
      ticketId: string;
      status: string;
    }) =>
      apiFetch<TicketResponse>(`/tickets/${ticketId}/transitions`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: [TICKET_KEY, ticketId] });
      queryClient.invalidateQueries({ queryKey: [TICKET_KEY] });
    },
  });
}

export type { ApiError };
