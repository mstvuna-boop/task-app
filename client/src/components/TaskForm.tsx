import { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, AppUser } from '../types';
import { api } from '../api';

interface Props {
  initial?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  currentUserId?: string;
}

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low',    label: 'נמוכה'   },
  { value: 'medium', label: 'בינונית' },
  { value: 'high',   label: 'גבוהה'   },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'pending',     label: 'ממתינה'  },
  { value: 'in_progress', label: 'בביצוע'  },
  { value: 'completed',   label: 'הושלמה' },
];

export default function TaskForm({ initial, onSubmit, onCancel, loading, currentUserId }: Props) {
  const [title,       setTitle]       = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [status,      setStatus]      = useState<TaskStatus>(initial?.status || 'pending');
  const [priority,    setPriority]    = useState<TaskPriority>(initial?.priority || 'medium');
  const [dueDate,     setDueDate]     = useState(initial?.due_date ? initial.due_date.slice(0, 16) : '');
  const [assignedTo,  setAssignedTo]  = useState(initial?.assigned_to || '');
  const [users,       setUsers]       = useState<AppUser[]>([]);

  const isOwner = !initial?.id || initial?.user_id === currentUserId;

  useEffect(() => {
    if (isOwner) {
      api.getUsers().then(setUsers).catch(() => {});
    }
  }, [isOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title,
      description,
      status,
      priority,
      due_date:    dueDate ? new Date(dueDate).toISOString() : undefined,
      assigned_to: assignedTo || undefined,
    });
  };

  const inputStyle = {
    background: 'var(--bg-card-alt)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  const labelStyle = { color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block mb-1" style={labelStyle}>כותרת המשימה <span style={{ color: '#f87171' }}>*</span></label>
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          required placeholder="מה צריך לעשות?"
          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          style={inputStyle}
          disabled={!isOwner}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block mb-1" style={labelStyle}>תיאור</label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          rows={3} placeholder="פרטים נוספים..."
          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none"
          style={inputStyle}
          disabled={!isOwner}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Priority */}
        <div>
          <label className="block mb-1" style={labelStyle}>עדיפות</label>
          <div className="flex flex-col gap-1.5">
            {priorityOptions.map(p => (
              <button key={p.value} type="button" onClick={() => isOwner && setPriority(p.value)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all text-right"
                style={priority === p.value
                  ? { background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.4)' }
                  : { ...inputStyle, opacity: isOwner ? 1 : 0.5 }
                }
              >{p.label}</button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block mb-1" style={labelStyle}>סטטוס</label>
          <div className="flex flex-col gap-1.5">
            {statusOptions.map(s => (
              <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all text-right"
                style={status === s.value
                  ? { background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.4)' }
                  : inputStyle
                }
              >{s.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Due date */}
      <div>
        <label className="block mb-1" style={labelStyle}>תאריך יעד</label>
        <input
          type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          style={inputStyle}
          disabled={!isOwner}
        />
      </div>

      {/* Assign to user — only for owner, only when creating or editing own task */}
      {isOwner && users.length > 0 && (
        <div>
          <label className="block mb-1" style={labelStyle}>הקצה למשתמש</label>
          <select
            value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            style={inputStyle}
          >
            <option value="">— לעצמי בלבד —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="flex-1 font-semibold py-2.5 rounded-xl transition-all"
          style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.4)', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'שומר...' : initial?.id ? 'עדכן משימה' : 'הוסף משימה'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-xl font-medium transition-all"
          style={inputStyle}
        >ביטול</button>
      </div>
    </form>
  );
}
