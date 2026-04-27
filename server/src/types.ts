export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  approved: number;
  created_at?: string;
}

export interface Task {
  id: number;
  user_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  completed_at?: string;
  assigned_to?: string;
  assigned_by?: string;
  created_at: string;
  updated_at: string;
  reminders?: Reminder[];
}

export interface Reminder {
  id: number;
  task_id: number;
  user_id: string;
  remind_at: string;
  sent: number;
  created_at: string;
}

declare module 'express-session' {
  interface SessionData {
    passport: { user: string };
  }
}
