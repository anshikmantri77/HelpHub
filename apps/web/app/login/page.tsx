'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LoginInput, AuthResponse } from '@helphub/shared';
import { useAuthStore } from '../../lib/store';
import { apiFetch, ApiError } from '../../lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('expired') === '1';

  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = LoginInput.safeParse({ email, password });
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fields[issue.path.join('.')] = issue.message;
      }
      setFieldErrors(fields);
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch<AuthResponse>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(parsed.data) },
      );
      setAuth(result);
      router.push('/tickets');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      {/* Session-expired banner — shown when api-client redirects with ?expired=1 */}
      {sessionExpired && (
        <div
          className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          Your session has expired. Please log in again.
        </div>
      )}

      <h1 className="mb-6 text-2xl font-bold">Log in</h1>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            autoComplete="email"
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className="w-full rounded border border-gray-300 px-3 py-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            autoComplete="current-password"
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            className="w-full rounded border border-gray-300 px-3 py-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {fieldErrors.password && (
            <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {error && (
          <div
            className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        No account?{' '}
        <Link
          href="/register"
          className="text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
