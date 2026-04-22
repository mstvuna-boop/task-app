import { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';

interface Props {
  initial?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'נמוכה', color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'medium', label: 'בינונית', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { value: 'high', label: 'גבוהה', color: 'text-red-600 bg-red-50 border-red-200' },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'ממתינה' },
  { value: 'in_progress', label: 'בביצוע' },
  { value: 'completed', label: 'הושלמה' },
];

export default function TaskForm({ initial, onSubmit, onCancel, loading }: Props) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [status, setStatus] = useState<TaskStatus>(initial?.status || 'pending');
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority || 'medium');
  const [dueDate, setDueDate] = useState(
    initial?.due_date ? initial.due_date.slice(0, 16) : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title,
      description,
      status,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          כותרת המשימה <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="מה צריך לעשות?"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="פרטים נוספים..."
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">עדיפות</label>
          <div className="flex flex-col gap-1.5">
            {priorityOptions.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`border rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  priority === p.value
                    ? p.color + ' border-current'
                    : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
          <div className="flex flex-col gap-1.5">
            {statusOptions.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={`border rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  status === s.value
                    ? 'text-indigo-600 bg-indigo-50 border-indigo-300'
                    : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">תאריך יעד</label>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {loading ? 'שומר...' : initial?.id ? 'עדכן משימה' : 'הוסף משימה'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
