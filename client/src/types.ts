export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  is_admin?: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export interface Reminder {
  id: number;
  task_id: number;
  remind_at: string;
  sent: number;
}

export interface Task {
  id: number;
  user_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
  reminders: Reminder[];
  assigned_to?: string;
  assigned_by?: string;
  assigned_to_name?: string;
  assigned_by_name?: string;
}

export type TaskStatus = Task['status'];
export type TaskPriority = Task['priority'];
