import { Router, Request, Response } from 'express';
import db from '../db';
import { Task } from '../types';

const router = Router();
const cast = <T>(v: unknown): T => v as T;

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── GET /api/tasks — my tasks + tasks assigned to me ──────────
router.get('/', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const tasks = cast<any[]>(db
    .prepare(
      `SELECT t.*,
        u_by.name  AS assigned_by_name,
        u_to.name  AS assigned_to_name,
        json_group_array(
          CASE WHEN r.id IS NOT NULL
          THEN json_object('id', r.id, 'remind_at', r.remind_at, 'sent', r.sent)
          ELSE NULL END
        ) as reminders_json
       FROM tasks t
       LEFT JOIN reminders r ON r.task_id = t.id
       LEFT JOIN users u_by ON u_by.id = t.assigned_by
       LEFT JOIN users u_to ON u_to.id = t.assigned_to
       WHERE t.user_id = ? OR t.assigned_to = ?
       GROUP BY t.id
       ORDER BY
         CASE t.status WHEN 'completed' THEN 1 ELSE 0 END,
         CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC`
    )
    .all(userId, userId));

  const result = tasks.map((t) => {
    const reminders = JSON.parse(t.reminders_json).filter(Boolean);
    const { reminders_json, ...task } = t;
    return { ...task, reminders };
  });

  res.json(result);
});

// ── POST /api/tasks ───────────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const { title, description, status, priority, due_date, assigned_to } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'כותרת המשימה נדרשת' });

  // Verify assignee exists and is approved
  if (assigned_to) {
    const assignee = db.prepare('SELECT id FROM users WHERE id = ? AND approved = 1').get(assigned_to);
    if (!assignee) return res.status(400).json({ error: 'המשתמש המוקצה לא נמצא' });
  }

  const result = db
    .prepare(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date, assigned_to, assigned_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      title.trim(),
      description || '',
      status || 'pending',
      priority || 'medium',
      due_date || null,
      assigned_to || null,
      assigned_to ? userId : null
    );

  const task = cast<any>(db.prepare(
    `SELECT t.*, u_by.name AS assigned_by_name, u_to.name AS assigned_to_name
     FROM tasks t
     LEFT JOIN users u_by ON u_by.id = t.assigned_by
     LEFT JOIN users u_to ON u_to.id = t.assigned_to
     WHERE t.id = ?`
  ).get(result.lastInsertRowid));
  res.status(201).json({ ...task, reminders: [] });
});

// ── PUT /api/tasks/:id ────────────────────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const { id } = req.params;
  const { title, description, status, priority, due_date, assigned_to } = req.body;

  // Owner or assignee can update
  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND (user_id = ? OR assigned_to = ?)'
  ).get(id, userId, userId) as any;
  if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });

  const isOwner = task.user_id === userId;

  const completedAt = status === 'completed' && task.status !== 'completed'
    ? new Date().toISOString()
    : status !== 'completed' ? null : (task.completed_at || null);

  // Only owner can reassign
  const newAssignedTo = isOwner ? (assigned_to ?? task.assigned_to) : task.assigned_to;
  const newAssignedBy = newAssignedTo ? (task.assigned_by || userId) : null;

  db.prepare(
    `UPDATE tasks
     SET title=?, description=?, status=?, priority=?, due_date=?,
         completed_at=?, assigned_to=?, assigned_by=?, updated_at=CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    isOwner ? title : task.title,
    isOwner ? (description || '') : task.description,
    status,
    isOwner ? priority : task.priority,
    due_date || null,          // both owner and assignee can move the task date
    completedAt,
    newAssignedTo || null,
    newAssignedBy || null,
    id
  );

  const updated = cast<any>(db.prepare(
    `SELECT t.*, u_by.name AS assigned_by_name, u_to.name AS assigned_to_name
     FROM tasks t
     LEFT JOIN users u_by ON u_by.id = t.assigned_by
     LEFT JOIN users u_to ON u_to.id = t.assigned_to
     WHERE t.id = ?`
  ).get(id));
  const reminders = cast<any[]>(db.prepare('SELECT * FROM reminders WHERE task_id = ?').all(id));
  res.json({ ...updated, reminders });
});

// ── DELETE /api/tasks/:id — owner only ───────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const { id } = req.params;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
  if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });

  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, userId);
  res.json({ success: true });
});

// ── Reminders ─────────────────────────────────────────────────
router.post('/:id/reminders', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const { id } = req.params;
  const { remind_at } = req.body;

  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND (user_id = ? OR assigned_to = ?)'
  ).get(id, userId, userId);
  if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
  if (!remind_at) return res.status(400).json({ error: 'זמן התזכורת נדרש' });

  const remindDate = new Date(remind_at);
  if (isNaN(remindDate.getTime()) || remindDate <= new Date()) {
    return res.status(400).json({ error: 'יש לבחור זמן עתידי' });
  }

  const result = db
    .prepare('INSERT INTO reminders (task_id, user_id, remind_at) VALUES (?, ?, ?)')
    .run(id, userId, remindDate.toISOString());

  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(reminder);
});

router.delete('/:id/reminders/:reminderId', requireAuth, (req, res) => {
  const userId = (req.user as any).id;
  const { id, reminderId } = req.params;
  db.prepare('DELETE FROM reminders WHERE id = ? AND task_id = ? AND user_id = ?').run(reminderId, id, userId);
  res.json({ success: true });
});

export default router;
