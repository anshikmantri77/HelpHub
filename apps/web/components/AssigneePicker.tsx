import { useState, useEffect } from 'react';
import { useAgentSearch, Agent } from '../lib/queries/users';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function AssigneePicker({ value, onChange }: { value: Agent | null; onChange: (a: Agent | null) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const { data, isLoading } = useAgentSearch(debouncedQuery);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded border border-gray-300 bg-white px-3 py-2">
        <span>{value.name} <span className="text-gray-500">({value.email})</span></span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-sm text-blue-600 hover:underline focus:outline-none"
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search agent by name..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.length > 0) setOpen(true);
        }}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && debouncedQuery.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {isLoading && <div className="px-3 py-2 text-sm text-gray-500" aria-busy="true">Searching...</div>}
          {!isLoading && data?.data.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No agents found.</div>}
          {!isLoading && data?.data.map((agent: Agent) => (
            <button
              type="button"
              key={agent.id}
              onClick={() => {
                onChange(agent);
                setOpen(false);
                setQuery('');
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            >
              <span className="font-medium text-gray-900">{agent.name}</span>{' '}
              <span className="text-gray-500">({agent.email})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
