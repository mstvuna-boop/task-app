# הגדרת אפליקציית המשימות

## דרישות מוקדמות
- Node.js 18+
- חשבון Google (לאינטגרציה עם OAuth)
- חשבון Gmail (לשליחת תזכורות)

---

## שלב 1 — התקנת חבילות

```bash
npm run install:all
```

---

## שלב 2 — הגדרת Google OAuth

1. כנס ל: https://console.cloud.google.com/apis/credentials
2. צור פרויקט חדש (או השתמש בקיים)
3. לחץ **"Create Credentials"** → **"OAuth 2.0 Client ID"**
4. סוג: **Web application**
5. הוסף Authorized redirect URI:
   ```
   http://localhost:3001/auth/google/callback
   ```
6. שמור את ה-**Client ID** וה-**Client Secret**

---

## שלב 3 — הגדרת Gmail לשליחת מיילים

1. כנס לחשבון Google שלך → **Security** → **2-Step Verification** (הפעל אם לא פעיל)
2. חפש **"App passwords"**
3. צור App Password עבור **Mail**
4. שמור את הסיסמה בת 16 התווים

---

## שלב 4 — קובץ הגדרות

```bash
cp server/.env.example server/.env
```

ערוך את `server/.env` והכנס את הפרטים:

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
SESSION_SECRET=any-long-random-string
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # App Password
```

---

## שלב 5 — הפעלה

```bash
npm run dev
```

- פרונטאנד: http://localhost:5173
- שרת: http://localhost:3001

---

## תכונות האפליקציה

| תכונה | פרטים |
|--------|--------|
| 🔐 התחברות | Google OAuth — מאובטח |
| 📋 משימות | יצירה, עריכה, מחיקה, סטטוס, עדיפות |
| 📅 תאריך יעד | תאריך + שעה לכל משימה |
| 🔔 תזכורות | תזכורות מרובות לכל משימה |
| 📧 מייל | שליחת תזכורת אוטומטית למייל |
| 🔍 חיפוש | חיפוש + פילטר לפי סטטוס/עדיפות |
