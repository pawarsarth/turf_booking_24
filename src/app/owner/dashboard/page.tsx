"use client";
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import toast from 'react-hot-toast';

// ── tiny helpers ───────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: '#00ff87', PENDING: '#ffd700', CANCELLED: '#ff4444', COMPLETED: '#a78bfa',
};
const PAY_BADGE: Record<string, string> = {
  PAID: 'badge-green', UNPAID: 'badge-yellow', FAILED: 'badge-red', REFUNDED: 'badge-purple',
};

function to12h(t: string) {
  if (!t) return t;
  const [h] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12} ${ampm}`;
}

// ── Bar chart component (no extra library needed) ──────────────────────────────
function BarChart({ data, label }: { data: { name: string; value: number; color?: string }[]; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text2)' }}>{label}</div>
      <div className="flex items-end gap-2 h-40">
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1 gap-1">
            {/* Value label */}
            <span className="text-xs font-bold" style={{ color: d.value > 0 ? (d.color || 'var(--accent)') : 'var(--text2)' }}>
              {d.value > 0 ? d.value : ''}
            </span>
            {/* Bar */}
            <div className="w-full rounded-t-lg transition-all duration-500 relative overflow-hidden"
              style={{
                height: `${Math.max((d.value / max) * 100, d.value > 0 ? 8 : 2)}%`,
                background: d.value > 0
                  ? `linear-gradient(to top, ${d.color || 'var(--accent2)'}, ${d.color || 'var(--accent)'})`
                  : 'var(--border)',
                minHeight: 4,
              }}
            />
            {/* X label */}
            <span className="text-xs truncate w-full text-center" style={{ color: 'var(--text2)', fontSize: 10 }}>{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Donut chart component ──────────────────────────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center h-32" style={{ color: 'var(--text2)', fontSize: 13 }}>No data yet</div>
  );

  let cumAngle = -90;
  const r = 40, cx = 60, cy = 60, strokeW = 18;

  const arcs = segments.filter(s => s.value > 0).map(s => {
    const pct   = s.value / total;
    const angle = pct * 360;
    const start = cumAngle;
    cumAngle   += angle;
    const s1    = start * Math.PI / 180;
    const e1    = cumAngle * Math.PI / 180;
    const x1    = cx + r * Math.cos(s1);
    const y1    = cy + r * Math.sin(s1);
    const x2    = cx + r * Math.cos(e1);
    const y2    = cy + r * Math.sin(e1);
    const large = angle > 180 ? 1 : 0;
    return { ...s, d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, pct };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={strokeW} strokeLinecap="butt" />
        ))}
        <text x="60" y="55" textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 14, fontWeight: 800 }}>{total}</text>
        <text x="60" y="70" textAnchor="middle" style={{ fill: 'var(--text2)', fontSize: 9 }}>bookings</text>
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span style={{ color: 'var(--text2)' }}>{s.label}</span>
            <span className="font-bold ml-auto pl-3" style={{ color: 'var(--text)' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData]         = useState<{ bookings: any[]; stats: any } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('ALL');
  const [subStatus, setSubStatus] = useState<any>(null);
  const [coupons, setCoupons]   = useState<any[]>([]);
  const [turfs, setTurfs]       = useState<any[]>([]);
  const [tab, setTab]           = useState<'overview' | 'bookings' | 'coupons'>('overview');
  const [couponForm, setCouponForm] = useState({
    code: '', turfId: '', discountType: 'PERCENTAGE', discountValue: '',
    maxUses: '100', minBookingHours: '1', validUntil: ''
  });
  const [addingCoupon, setAddingCoupon]   = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && !['OWNER', 'ADMIN'].includes(session.user.role)) router.push('/');
  }, [status, session, router]);

  const fetchAll = useCallback(() => {
    if (!session) return;
    Promise.all([
      fetch('/api/owner/bookings').then(r => r.json()),
      fetch('/api/subscription/status').then(r => r.json()),
      fetch('/api/coupons').then(r => r.json()),
      fetch('/api/admin/turfs').then(r => r.json()),
    ]).then(([b, s, c, t]) => {
      if (b.success) setData(b.data);
      if (s.success) setSubStatus(s.data);
      if (c.success) setCoupons(c.data);
      if (t.success) setTurfs(t.data.filter((x: any) => x.ownerId === session.user.id || session.user.role === 'ADMIN'));
      setLoading(false);
    });
  }, [session]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derive chart data ──────────────────────────────────────────────────────
  const bookings = data?.bookings ?? [];

  // Last 7 days bookings bar chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const ds    = d.toISOString().split('T')[0];
    const count = bookings.filter((b: any) => b.date?.startsWith(ds)).length;
    return { name: label, value: count };
  });

  // Last 6 months revenue bar chart
  const last6m = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    const m     = d.getMonth();
    const y     = d.getFullYear();
    const rev   = bookings.filter((b: any) => {
      const bd = new Date(b.date);
      return bd.getMonth() === m && bd.getFullYear() === y && b.paymentStatus === 'PAID';
    }).reduce((s: number, b: any) => s + b.totalPrice, 0);
    return { name: label, value: rev, color: '#6c3bff' };
  });

  // Status donut
  const statusSegments = [
    { label: 'Confirmed',  value: bookings.filter((b: any) => b.status === 'CONFIRMED').length,  color: '#00ff87' },
    { label: 'Pending',    value: bookings.filter((b: any) => b.status === 'PENDING').length,    color: '#ffd700' },
    { label: 'Cancelled',  value: bookings.filter((b: any) => b.status === 'CANCELLED').length,  color: '#ff4444' },
    { label: 'Completed',  value: bookings.filter((b: any) => b.status === 'COMPLETED').length,  color: '#a78bfa' },
  ];

  // Per-turf bookings
  const perTurf = turfs.map(t => ({
    name: t.name.length > 12 ? t.name.slice(0, 12) + '…' : t.name,
    value: bookings.filter((b: any) => b.turfId === t.id).length,
    color: 'var(--accent3)',
  }));

  // ── Coupon handlers ────────────────────────────────────────────────────────
  const addCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCoupon(true);
    const res  = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(couponForm) });
    const resp = await res.json();
    if (resp.success) {
      toast.success('🎟️ Coupon created!');
      setCoupons(c => [resp.data, ...c]);
      setShowCouponForm(false);
      setCouponForm({ code: '', turfId: '', discountType: 'PERCENTAGE', discountValue: '', maxUses: '100', minBookingHours: '1', validUntil: '' });
    } else {
      toast.error(resp.error || 'Failed to create coupon');
    }
    setAddingCoupon(false);
  };

  const deactivateCoupon = async (code: string) => {
    await fetch(`/api/coupons/${code}`, { method: 'DELETE' });
    setCoupons(c => c.map(x => x.code === code ? { ...x, isActive: false } : x));
    toast.success('Coupon deactivated');
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || status === 'loading') return (
    <>
      <Navbar />
      <div className="min-h-[80vh] flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin-slow" style={{ borderTopColor: 'var(--accent)' }} />
      </div>
    </>
  );

  const filtered = bookings.filter((b: any) => filter === 'ALL' || b.status === filter);

  const subBadge = subStatus ? (
    subStatus.status === 'TRIAL'   ? { c: '#a78bfa', label: `Trial · ${subStatus.daysLeft}d left` } :
    subStatus.status === 'ACTIVE'  ? { c: '#00ff87', label: `Active · ${subStatus.daysLeft}d left` } :
    subStatus.status === 'EXPIRED' ? { c: '#ff4444', label: 'Expired' } :
    { c: '#8080aa', label: 'No Plan' }
  ) : null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black mb-1" style={{ fontFamily: 'Syne,sans-serif' }}>🏟️ Owner Dashboard</h1>
              <p style={{ color: 'var(--text2)' }}>Analytics, bookings, coupons and subscription</p>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              {subBadge && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: subBadge.c }} />
                  <span style={{ color: subBadge.c }}>{subBadge.label}</span>
                </div>
              )}
              <Link href="/owner/subscription" className="btn-secondary text-sm px-4 py-2">Manage Plan</Link>
            </div>
          </div>

          {/* ── Subscription warning ────────────────────────────── */}
          {subStatus?.status === 'EXPIRED' && (
            <div className="rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3" style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)' }}>
              <div>
                <div className="font-bold" style={{ color: '#ff4444' }}>⚠️ Subscription Expired</div>
                <div className="text-sm mt-1" style={{ color: 'var(--text2)' }}>Your turfs are hidden. Subscribe to restore listings.</div>
              </div>
              <Link href="/owner/subscription" className="btn-primary text-sm px-5 py-2">Subscribe ₹300/mo →</Link>
            </div>
          )}

          {/* ── Stats Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Bookings', value: data?.stats.total    ?? 0,    icon: '📋', color: 'var(--accent2)' },
              { label: 'Confirmed',      value: data?.stats.confirmed ?? 0,   icon: '✅', color: 'var(--accent)'  },
              { label: 'Pending',        value: data?.stats.pending   ?? 0,   icon: '⏳', color: 'var(--gold)'    },
              { label: 'Revenue',        value: `₹${((data?.stats.revenue ?? 0) as number).toLocaleString('en-IN')}`, icon: '💰', color: '#34d399' },
            ].map(s => (
              <div key={s.label} className="card flex items-center gap-3 p-4" style={{ border: '1px solid var(--border2)' }}>
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="text-xl font-black" style={{ color: s.color, fontFamily: 'Syne,sans-serif' }}>{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tabs ────────────────────────────────────────────── */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['overview', 'bookings', 'coupons'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn-primary text-sm capitalize' : 'btn-secondary text-sm capitalize'}>
                {t === 'overview' ? '📊 Overview' : t === 'bookings' ? '📋 Bookings' : '🎟️ Coupons'}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Bookings last 7 days */}
              <div className="card" style={{ border: '1px solid var(--border2)' }}>
                <BarChart data={last7} label="📅 Bookings — Last 7 Days" />
              </div>

              {/* Revenue last 6 months */}
              <div className="card" style={{ border: '1px solid var(--border2)' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text2)' }}>💰 Revenue — Last 6 Months (₹)</div>
                <div className="text-xs mb-3" style={{ color: 'var(--text2)' }}>
                  Total: <strong style={{ color: 'var(--accent)' }}>₹{last6m.reduce((s, d) => s + d.value, 0).toLocaleString('en-IN')}</strong>
                </div>
                <BarChart data={last6m.map(d => ({ ...d, name: d.name, value: d.value }))} label="" />
              </div>

              {/* Booking status donut */}
              <div className="card" style={{ border: '1px solid var(--border2)' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text2)' }}>🔄 Booking Status Distribution</div>
                <DonutChart segments={statusSegments} />
              </div>

              {/* Per turf bookings */}
              {perTurf.length > 0 && (
                <div className="card" style={{ border: '1px solid var(--border2)' }}>
                  <BarChart data={perTurf} label="🏟️ Bookings per Turf" />
                </div>
              )}

              {/* Quick summary */}
              <div className="card md:col-span-2" style={{ border: '1px solid var(--border2)' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text2)' }}>📈 Quick Insights</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  {[
                    { label: 'Avg per booking', value: `₹${bookings.length > 0 ? Math.round(bookings.reduce((s: number, b: any) => s + b.totalPrice, 0) / bookings.length) : 0}` },
                    { label: 'Paid bookings',   value: bookings.filter((b: any) => b.paymentStatus === 'PAID').length },
                    { label: 'Active coupons',  value: coupons.filter(c => c.isActive).length },
                    { label: 'Your turfs',      value: turfs.length },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg3)' }}>
                      <div className="text-xl font-black" style={{ color: 'var(--accent)', fontFamily: 'Syne,sans-serif' }}>{s.value}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text2)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BOOKINGS TAB ────────────────────────────────────── */}
          {tab === 'bookings' && (
            <>
              {/* Filter */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].map(s => (
                  <button key={s} onClick={() => setFilter(s)} className={`btn text-xs px-3 py-2 ${filter === s ? 'btn-primary' : 'btn-secondary'}`}>{s}</button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--text2)' }}>
                  <div className="text-5xl mb-3">📭</div>
                  <p>No bookings for this filter</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border2)' }}>
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg3)' }}>
                        {['Customer', 'Turf', 'Date', 'Time', 'Hrs', 'Amount', 'Discount', 'Status', 'Payment'].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((b: any, i: number) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{b.user?.name}</div>
                            <div className="text-xs" style={{ color: 'var(--text2)' }}>{b.user?.email}</div>
                            {b.user?.phone && <div className="text-xs" style={{ color: 'var(--text2)' }}>📱 {b.user.phone}</div>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{b.turf?.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{to12h(b.startTime)}–{to12h(b.endTime)}</td>
                          <td className="px-4 py-3 text-center">{b.hours || '—'}</td>
                          <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: 'var(--accent)' }}>₹{b.totalPrice}</td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: b.discountAmount > 0 ? 'var(--accent)' : 'var(--text2)' }}>
                            {b.discountAmount > 0 ? `-₹${b.discountAmount}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: `${STATUS_COLOR[b.status]}20`, color: STATUS_COLOR[b.status] }}>{b.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${PAY_BADGE[b.paymentStatus]}`}>{b.paymentStatus}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── COUPONS TAB ─────────────────────────────────────── */}
          {tab === 'coupons' && (
            <>
              <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                <h2 className="text-lg font-bold">Discount Coupons</h2>
                <button onClick={() => setShowCouponForm(s => !s)} className="btn-primary text-sm px-4 py-2">
                  {showCouponForm ? '✕ Close Form' : '+ Create Coupon'}
                </button>
              </div>

              {/* Coupon create form */}
              {showCouponForm && (
                <div className="card mb-6" style={{ border: '1px solid rgba(0,255,135,0.2)' }}>
                  <h3 className="text-base font-bold mb-4">Create New Coupon</h3>
                  <form onSubmit={addCoupon} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Coupon Code *</label>
                      <input value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>For Turf *</label>
                      <select value={couponForm.turfId} onChange={e => setCouponForm(f => ({ ...f, turfId: e.target.value }))} required>
                        <option value="">Select turf...</option>
                        {turfs.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Discount Type</label>
                      <select value={couponForm.discountType} onChange={e => setCouponForm(f => ({ ...f, discountType: e.target.value }))}>
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED">Fixed Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Discount Value *</label>
                      <input type="number" value={couponForm.discountValue} onChange={e => setCouponForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={couponForm.discountType === 'PERCENTAGE' ? '20 for 20%' : '100 for ₹100 off'} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Max Uses</label>
                      <input type="number" value={couponForm.maxUses} onChange={e => setCouponForm(f => ({ ...f, maxUses: e.target.value }))} min={1} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Min Booking Hours</label>
                      <input type="number" value={couponForm.minBookingHours} onChange={e => setCouponForm(f => ({ ...f, minBookingHours: e.target.value }))} min={1} max={3} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Valid Until *</label>
                      <input type="date" value={couponForm.validUntil} onChange={e => setCouponForm(f => ({ ...f, validUntil: e.target.value }))} required min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="sm:col-span-2 flex gap-3">
                      <button type="submit" disabled={addingCoupon} className="btn-primary flex-1 py-3">
                        {addingCoupon ? 'Creating...' : '🎟️ Create Coupon'}
                      </button>
                      <button type="button" onClick={() => setShowCouponForm(false)} className="btn-secondary px-6">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Coupons list */}
              {coupons.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--text2)' }}>
                  <div className="text-5xl mb-3">🎟️</div>
                  <p>No coupons yet. Create one to offer discounts to players!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {coupons.map((c: any) => (
                    <div key={c.id} className="card flex flex-wrap items-center gap-4 p-4" style={{ border: '1px solid var(--border2)', opacity: c.isActive ? 1 : 0.5 }}>
                      <div className="font-black text-xl" style={{ fontFamily: 'monospace', color: c.isActive ? 'var(--accent)' : 'var(--text2)', letterSpacing: 2 }}>
                        {c.code}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{c.turf?.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                          {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                          {' · '}{c.usedCount}/{c.maxUses} used
                          {' · '} Min {c.minBookingHours}hr
                          {' · '} Until {new Date(c.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                      {c.isActive && (
                        <button onClick={() => deactivateCoupon(c.code)} className="btn-secondary text-xs px-3 py-1.5">
                          Deactivate
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}