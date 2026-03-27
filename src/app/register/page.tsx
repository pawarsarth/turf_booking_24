'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm]       = useState({ name: '', email: '', password: '', phone: '', role: 'USER' });
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
        if (result?.ok) { toast.success('Account created! 🎉'); window.location.href = '/chat'; }
      } else {
        toast.error(data.error || 'Registration failed');
      }
    } finally { setLoading(false); }
  };

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  const Spinner = ({ dark }: { dark?: boolean }) => (
    <span style={{ width: 18, height: 18, border: `2px solid ${dark ? 'rgba(0,0,0,0.2)' : 'var(--border)'}`, borderTopColor: dark ? '#0d0d1a' : 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,229,160,0.12) 0%, var(--bg) 70%)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }} className="fade-in">

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>🏟️</Link>
          <h1 style={{ fontSize: 28 }}>Create Account</h1>
          <p style={{ color: 'var(--text2)', marginTop: 8 }}>Join TurfBook today</p>
        </div>

        <div className="card">
          <button onClick={() => { setGLoading(true); signIn('google', { callbackUrl: '/chat' }); }} disabled={gLoading}
            className="btn btn-secondary" style={{ width: '100%', marginBottom: 20, padding: '12px', fontSize: 15, justifyContent: 'center' }}>
            {gLoading ? <Spinner /> : <><GoogleIcon /> Continue with Google</>}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>or register with email</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Full Name', key: 'name', type: 'text',  ph: 'Rahul Sharma', required: true },
              { label: 'Email',     key: 'email', type: 'email', ph: 'you@example.com', required: true },
              { label: 'Phone (optional)', key: 'phone', type: 'tel', ph: '9876543210', required: false },
              { label: 'Password (min 6)', key: 'password', type: 'password', ph: '••••••••', required: true },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} value={(form as Record<string,string>)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.ph} required={f.required} minLength={f.key === 'password' ? 6 : undefined} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>Account Type</label>
              <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}>
                <option value="USER">Player — I want to book turfs</option>
                <option value="OWNER">Owner — I manage turfs</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 4 }}>
              {loading ? <Spinner dark /> : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text2)', fontSize: 14 }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
