import { Task, User, AppUser } from './types';

const BASE = '';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, { credentials: 'include', ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'שגיאה בשרת' }));
    throw new Error(err.error || 'שגיאה בשרת');
  }
  return res.json();
}

export const api = {
  getMe: () => request<User>('/auth/me'),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  getTasks: () => request<Task[]>('/api/tasks'),

  createTask: (data: Partial<Task>) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateTask: (id: number, data: Partial<Task>) =>
    request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  deleteTask: (id: number) =>
    request<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  addReminder: (taskId: number, remind_at: string) =>
    request(`/api/tasks/${taskId}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remind_at }),
    }),

  deleteReminder: (taskId: number, reminderId: number) =>
    request(`/api/tasks/${taskId}/reminders/${reminderId}`, { method: 'DELETE' }),

  // Users
  getUsers: () => request<AppUser[]>('/api/users'),

  // Admin
  getAdminUsers: () => request<(AppUser & { approved: number; created_at: string })[]>('/api/admin/users'),
  approveUser: (userId: string) =>
    request<{ success: boolean }>(`/api/admin/approve/${userId}`, { method: 'POST' }),
  revokeUser: (userId: string) =>
    request<{ success: boolean }>(`/api/admin/revoke/${userId}`, { method: 'POST' }),
};
