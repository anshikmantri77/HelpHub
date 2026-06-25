import Link from 'next/link';

interface Props {
  reason?: string;
}

export function AccessDenied({ reason }: Props) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h2 className="mb-2 text-xl font-semibold text-gray-700">
        Access denied
      </h2>
      <p className="text-gray-500">
        {reason ?? "You don't have permission to view this."}
      </p>
      <Link
        href="/tickets"
        className="mt-4 inline-block text-sm text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        ← Back to tickets
      </Link>
    </div>
  );
}
