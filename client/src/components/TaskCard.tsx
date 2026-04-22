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
  low:    { label: 'נמוכה',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  medium: { label: 'בינונית', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  high:   { label: 'גבוהה',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const statusConfig = {
  pending:     { label: 'ממתינה', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: '○' },
  in_progress: { label: 'בביצוע', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  icon: '◑' },
  completed:   { label: 'הושלמה', color: '#4ade80', bg: 'rgba(74,222,128,0.12)', icon: '●' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
      onUpdate(await api.updateTask(task.id, { ...task, status: newStatus }));
    } catch {
      toast.error('שגיאה בעדכון');
    }
  };

  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const isOverdue = task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date();
  const pendingReminders = task.reminders.filter((r) => !r.sent).length;

  return (
    <div className="task-card rounded-2xl transition-all" style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.4)' : 'var(--border)'}`,
      opacity: task.status === 'completed' ? 0.75 : 1,
    }}>
      <div className="p-4">
        {editing ? (
          <TaskForm initial={task} onSubmit={handleUpdate} onCancel={() => setEditing(false)} loading={saving} />
        ) : (
          <>
            <div className="flex items-start gap-3">
              <button onClick={toggleComplete}
                className="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                style={task.status === 'completed'
                  ? { background: '#4ade80', borderColor: '#4ade80', color: '#fff' }
                  : { borderColor: 'var(--border)' }
                }
              >
                {task.status === 'completed' && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold leading-tight" style={{
                  color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                }}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{task.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: priority.color, background: priority.bg }}>{priority.label}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: status.color, background: status.bg }}>{status.icon} {status.label}</span>
                  {task.due_date && (
                    <span className="text-xs" style={{ color: isOverdue ? '#f87171' : 'var(--text-muted)', fontWeight: isOverdue ? 600 : 400 }}>
                      📅 {formatDate(task.due_date)}{isOverdue && ' (באיחור!)'}
                    </span>
                  )}
                  {pendingReminders > 0 && (
                    <span className="text-xs" style={{ color: 'var(--accent)' }}>🔔 {pendingReminders} תזכורת{pendingReminders > 1 ? 'ות' : ''}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>🔔</button>
                <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>✏️</button>
                {confirmDelete ? (
                  <div className="flex gap-1">
                    <button onClick={handleDelete} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>מחק</button>
                    <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--bg-card-alt)', color: 'var(--text-muted)' }}>ביטול</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>🗑️</button>
                )}
              </div>
            </div>
            {expanded && <ReminderPanel task={task} onUpdate={onUpdate} />}
          </>
        )}
      </div>
    </div>
  );
}
