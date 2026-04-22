export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #070d1a 0%, #0d1f3c 50%, #071a2e 100%)' }}>
      <div className="rounded-2xl p-10 max-w-md w-full mx-4 text-center" style={{ background: 'rgba(10, 20, 40, 0.9)', border: '1px solid rgba(0,229,255,0.25)', boxShadow: '0 0 40px rgba(0,229,255,0.1), 0 20px 60px rgba(0,0,0,0.5)' }}>

        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="תבונה" className="h-32 object-contain" />
        </div>

        <p className="mb-8 text-sm" style={{ color: '#7fb3c8' }}>
          ארגן את המשימות שלך, קבל תזכורות במייל, ועקוב אחרי ההתקדמות שלך
        </p>

        <div className="flex flex-col gap-3 text-right text-sm rounded-xl p-4 mb-8" style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)' }}>
          <div className="flex items-center gap-2" style={{ color: '#a0d8e8' }}>
            <span className="text-lg">📋</span>
            <span>ניהול משימות עם עדיפויות וסטטוסים</span>
          </div>
          <div className="flex items-center gap-2" style={{ color: '#a0d8e8' }}>
            <span className="text-lg">⏰</span>
            <span>תזכורות אישיות לפי תאריך ושעה</span>
          </div>
          <div className="flex items-center gap-2" style={{ color: '#a0d8e8' }}>
            <span className="text-lg">📧</span>
            <span>שליחת תזכורת למייל שלך</span>
          </div>
        </div>

        <a
          href="/auth/google"
          className="flex items-center justify-center gap-3 w-full font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff', boxShadow: '0 0 15px rgba(0,229,255,0.1)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.2)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 25px rgba(0,229,255,0.3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.1)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(0,229,255,0.1)';
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          כניסה עם Google
        </a>
      </div>
    </div>
  );
}
