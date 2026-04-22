import { useState } from 'react';
import { Task } from '../types';
import TaskForm from './TaskForm';
import ReminderPanel from './ReminderPanel';
import { api } from '../api';
import toast from 'react-hot-toast';

interface Props {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: number) => void;
}

const priorityConfig = {
  low: { label: 'נמוכה', bg: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  medium: { label: 'בינונית', bg: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  high: { label: 'גבוהה', bg: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const statusConfig = {
  pending: { label: 'ממתינה', bg: 'bg-slate-100 text-slate-600', icon: '○' },
  in_progress: { label: 'בביצוע', bg: 'bg-blue-100 text-blue-700', icon: '◑' },
  completed: { label: 'הושלמה', bg: 'bg-green-100 text-green-700', icon: '●' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TaskCard({ task, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleUpdate = async (data: Partial<Task>) => {
    setSaving(true);
    try {
      const updated = await api.updateTask(task.id, data);
      onUpdate(updated);
      setEditing(false);
      toast.success('משימה עודכנה');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteTask(task.id);
      onDelete(task.id);
      toast.success('משימה נמחקה');
    } catch {
      toast.error('שגיאה במחיקה');
    }
  };

  const toggleComplete = async () => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await api.updateTask(task.id, { ...task, status: newStatus });
      onUpdate(updated);
    } catch {
      toast.error('שגיאה בעדכון');
    }
  };

  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const isOverdue =
    task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date();
  const pendingReminders = task.reminders.filter((r) => !r.sent).length;

  return (
    <div
      className={`task-card bg-white rounded-2xl shadow-sm border transition-all ${
        task.status === 'completed'
          ? 'border-green-100 opacity-75'
          : isOverdue
          ? 'border-red-200'
          : 'border-gray-100'
      }`}
    >
      <div className="p-4">
        {editing ? (
          <TaskForm
            initial={task}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            loading={saving}
          />
        ) : (
          <>
            <div className="flex items-start gap-3">
              <button
                onClick={toggleComplete}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  task.status === 'completed'
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                {task.status === 'completed' && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h3
                  className={`font-semibold text-gray-800 leading-tight ${
                    task.status === 'completed' ? 'line-through text-gray-400' : ''
                  }`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${priority.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></span>
                    {priority.label}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.bg}`}>
                    {status.icon} {status.label}
                  </span>
                  {task.due_date && (
                    <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                      📅 {formatDate(task.due_date)}
                      {isOverdue && ' (באיחור!)'}
                    </span>
                  )}
                  {pendingReminders > 0 && (
                    <span className="text-xs text-indigo-500 flex items-center gap-1">
                      🔔 {pendingReminders} תזכורת{pendingReminders > 1 ? 'ות' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="תזכורות"
                >
                  🔔
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="עריכה"
                >
                  ✏️
                </button>
                {confirmDelete ? (
                  <div className="flex gap-1">
                    <button
                      onClick={handleDelete}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                    >
                      מחק
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-300"
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="מחיקה"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>

            {expanded && (
              <ReminderPanel task={task} onUpdate={onUpdate} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
