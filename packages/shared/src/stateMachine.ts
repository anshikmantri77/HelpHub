export type Status = 'open' | 'in_progress' | 'resolved' | 'reopened' | 'closed';
export type Role = 'customer' | 'agent' | 'admin';

export interface TicketInfo {
  id: string;
  status: Status;
  requesterId: string;
  assigneeId: string | null;
}

export interface UserInfo {
  id: string;
  role: Role;
}

export interface TransitionDef {
  to: Status;
  allowedRoles: (ticket: TicketInfo, user: UserInfo) => boolean;
}

export const TRANSITIONS: Record<Status, TransitionDef[]> = {
  open: [
    { to: 'in_progress', allowedRoles: (t, u) => u.role === 'agent' || u.role === 'admin' },
  ],
  in_progress: [
    { to: 'resolved', allowedRoles: (t, u) => (u.role === 'agent' && t.assigneeId === u.id) || u.role === 'admin' },
  ],
  resolved: [
    { to: 'closed', allowedRoles: (t, u) => t.requesterId === u.id || t.assigneeId === u.id || u.role === 'admin' },
    { to: 'reopened', allowedRoles: (t, u) => t.requesterId === u.id || t.assigneeId === u.id || u.role === 'admin' },
  ],
  reopened: [
    { to: 'in_progress', allowedRoles: (t, u) => (u.role === 'agent' && t.assigneeId === u.id) || u.role === 'admin' },
  ],
  closed: [],
};

export const STATUSES: Status[] = ['open', 'in_progress', 'resolved', 'reopened', 'closed'];

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
