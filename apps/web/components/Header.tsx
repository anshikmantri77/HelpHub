'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../lib/store';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  agent: 'bg-blue-100 text-blue-800',
  customer: 'bg-gray-100 text-gray-700',
};

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6">
          <Link
            href="/tickets"
            className="text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            HelpHub
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/tickets"
              className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Tickets
            </Link>
          </nav>
        </div>

        {/* Right: user info + logout */}
        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-gray-500 sm:block">{user.email}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {user.role}
            </span>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="rounded border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
