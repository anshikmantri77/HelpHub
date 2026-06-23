import { create } from 'zustand';
import type { AuthResponse } from '@helphub/shared';

interface AuthState {
  user: AuthResponse['user'] | null;
  token: string | null;
  role: string | null;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  role: null,
  setAuth: (auth) => set({ user: auth.user, token: auth.token, role: auth.user.role }),
  clearAuth: () => set({ user: null, token: null, role: null }),
}));
