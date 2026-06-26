import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api-client';

export type Agent = {
  id: string;
  name: string;
  email: string;
};

export function useAgentSearch(query: string) {
  return useQuery({
    queryKey: ['agents', query],
    queryFn: async () => {
      const res = await apiFetch<{ data: Agent[] }>(`/users/agents?search=${encodeURIComponent(query)}`);
      return res;
    },
    enabled: query.length > 0,
    staleTime: 30_000,
  });
}
