export function AccessDenied() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h2 className="mb-2 text-xl font-semibold text-gray-700">
        Access denied
      </h2>
      <p className="text-gray-500">
        You don't have permission to view this.
      </p>
    </div>
  );
}
