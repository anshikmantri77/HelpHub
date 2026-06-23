'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../lib/store';

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      router.replace('/tickets');
    } else {
      router.replace('/login');
    }
  }, [token, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
