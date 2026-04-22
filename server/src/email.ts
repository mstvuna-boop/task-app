import nodemailer from 'nodemailer';
import { Task } from './types';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendDailySummary(
  toEmail: string,
  toName: string,
  newTasks: Task[],
  completedTasks: Task[],
  pendingTasks: Task[]
): Promise<void> {
  const priorityLabel: Record<string, string> = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' };

  const taskRow = (t: Task) => `
    <tr>
      <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; font-size:14px; color:#374151;">${t.title}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; font-size:12px; text-align:center;">
        <span style="padding:2px 8px; border-radius:20px; background:${t.priority==='high'?'#fee2e2':t.priority==='medium'?'#fef3c7':'#d1fae5'}; color:${t.priority==='high'?'#dc2626':t.priority==='medium'?'#d97706':'#059669'}; font-weight:600;">
          ${priorityLabel[t.priority]}
        </span>
      </td>
      ${t.due_date ? `<td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; font-size:12px; color:#6b7280;">${new Date(t.due_date).toLocaleString('he-IL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>` : '<td></td>'}
    </tr>`;

  const section = (title: string, icon: string, color: string, items: Task[], emptyMsg: string) => `
    <div style="margin-bottom:24px;">
      <div style="background:${color}; border-radius:10px 10px 0 0; padding:12px 16px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">${icon}</span>
        <span style="font-weight:700; color:#1f2937; font-size:15px;">${title}</span>
        <span style="margin-right:auto; background:white; color:#374151; border-radius:20px; padding:1px 10px; font-size:12px; font-weight:600;">${items.length}</span>
      </div>
      ${items.length === 0
        ? `<div style="background:#f9fafb; border-radius:0 0 10px 10px; padding:16px; text-align:center; color:#9ca3af; font-size:13px;">${emptyMsg}</div>`
        : `<table style="width:100%; border-collapse:collapse; background:white; border-radius:0 0 10px 10px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
             <thead><tr style="background:#f8fafc;">
               <th style="padding:8px 12px; text-align:right; font-size:12px; color:#6b7280; font-weight:600;">משימה</th>
               <th style="padding:8px 12px; text-align:center; font-size:12px; color:#6b7280; font-weight:600;">עדיפות</th>
               <th style="padding:8px 12px; text-align:right; font-size:12px; color:#6b7280; font-weight:600;">תאריך יעד</th>
             </tr></thead>
             <tbody>${items.map(taskRow).join('')}</tbody>
           </table>`}
    </div>`;

  const todayStr = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif; direction:rtl; background:#f1f5f9; margin:0; padding:20px;">
      <div style="max-width:600px; margin:0 auto;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6); border-radius:16px; padding:24px; color:white; margin-bottom:20px; text-align:center;">
          <div style="font-size:36px; margin-bottom:8px;">📊</div>
          <h1 style="margin:0; font-size:22px;">סיכום יומי</h1>
          <p style="margin:6px 0 0; opacity:0.9; font-size:14px;">${todayStr}</p>
          <p style="margin:4px 0 0; opacity:0.8; font-size:13px;">שלום ${toName}</p>
        </div>

        ${section('משימות חדשות שנוספו היום', '🆕', '#e0f2fe', newTasks, 'לא נוספו משימות חדשות היום')}
        ${section('משימות שהושלמו היום', '✅', '#d1fae5', completedTasks, 'לא הושלמו משימות היום — מחר יהיה טוב יותר!')}
        ${section('משימות שטרם בוצעו', '⏳', '#fef3c7', pendingTasks, 'כל המשימות הושלמו — כל הכבוד!')}

        <div style="text-align:center; padding:16px; color:#9ca3af; font-size:12px;">
          סיכום יומי אוטומטי • אפליקציית המשימות שלך
        </div>
      </div>
    </body>
    </html>`;

  const totalSummary = `${newTasks.length} חדשות, ${completedTasks.length} הושלמו, ${pendingTasks.length} ממתינות`;

  await transporter.sendMail({
    from: `"אפליקציית משימות" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `📊 סיכום יומי – ${todayStr} | ${totalSummary}`,
    html,
  });
}

export async function sendReminderEmail(
  toEmail: string,
  toName: string,
  task: Task
): Promise<void> {
  const priorityLabel: Record<string, string> = {
    low: 'נמוכה',
    medium: 'בינונית',
    high: 'גבוהה',
  };

  const statusLabel: Record<string, string> = {
    pending: 'ממתינה',
    in_progress: 'בביצוע',
    completed: 'הושלמה',
  };

  const dueText = task.due_date
    ? `<p><strong>תאריך יעד:</strong> ${new Date(task.due_date).toLocaleString('he-IL')}</p>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; background: #f5f5f5; margin: 0; padding: 20px; }
        .card { background: white; border-radius: 12px; padding: 24px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 8px; padding: 16px; color: white; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .label { color: #6b7280; font-size: 13px; margin-bottom: 2px; }
        .value { font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 12px; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .high { background: #fee2e2; color: #dc2626; }
        .medium { background: #fef3c7; color: #d97706; }
        .low { background: #d1fae5; color: #059669; }
        .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🔔 תזכורת משימה</h1>
          <p style="margin:4px 0 0 0; opacity:0.9">שלום ${toName}</p>
        </div>
        <div class="label">שם המשימה</div>
        <div class="value">${task.title}</div>
        ${task.description ? `<div class="label">תיאור</div><div class="value">${task.description}</div>` : ''}
        <div class="label">עדיפות</div>
        <div class="value"><span class="badge ${task.priority}">${priorityLabel[task.priority]}</span></div>
        <div class="label">סטטוס</div>
        <div class="value">${statusLabel[task.status]}</div>
        ${dueText}
        <div class="footer">נשלח מאפליקציית המשימות שלך</div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"אפליקציית משימות" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `🔔 תזכורת: ${task.title}`,
    html,
  });
}
