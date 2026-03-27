'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { PayNowButton } from '@/components/booking/PayNowButton';

const STATUS_BADGE: Record<string,string> = { CONFIRMED:'badge-green', PENDING:'badge-yellow', CANCELLED:'badge-red', COMPLETED:'badge-purple' };
const PAY_BADGE:    Record<string,string> = { PAID:'badge-green', UNPAID:'badge-yellow', FAILED:'badge-red', REFUNDED:'badge-purple' };

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tokenStatus, setTokenStatus] = useState<any>(null);

  useEffect(() => { if (status==='unauthenticated') router.push('/login'); }, [status, router]);

  const fetchBookings = useCallback(() => {
    setLoading(true);
    fetch('/api/bookings').then(r=>r.json()).then(d=>{ if(d.success) setBookings(d.data); }).finally(()=>setLoading(false));
  }, []);

  useEffect(() => {
    if (session) {
      fetchBookings();
      fetch('/api/tokens').then(r=>r.json()).then(d=>{ if(d.success) setTokenStatus(d.data); });
    }
  }, [session, fetchBookings]);

  const Spinner = () => (
    <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40, height:40, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  );

  if (status==='loading' || loading) return <><Navbar /><Spinner /></>;

  return (
    <>
      <Navbar />
      <div className="container" style={{ padding:'48px 24px' }}>
        <div style={{ marginBottom:32 }}>
          <h1 style={{ fontSize:36, marginBottom:8 }}>My Dashboard</h1>
          <p style={{ color:'var(--text2)' }}>Welcome back, {session?.user?.name}</p>
        </div>

        {/* Token usage card */}
        {tokenStatus && (
          <div className="card" style={{ marginBottom:32, display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
            <div>
              <h3 style={{ fontSize:15, marginBottom:4 }}>🤖 AI Token Usage</h3>
              <p style={{ color:'var(--text2)', fontSize:13 }}>Monthly quota resets on the 1st</p>
            </div>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text2)', marginBottom:6 }}>
                <span>{tokenStatus.used.toLocaleString()} used</span>
                <span>{tokenStatus.remaining.toLocaleString()} remaining</span>
              </div>
              <div style={{ height:8, background:'var(--bg3)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(100, tokenStatus.percentage)}%`, background: tokenStatus.percentage>90?'var(--danger)':tokenStatus.percentage>70?'var(--accent3)':'var(--accent)', borderRadius:4, transition:'width 0.3s' }} />
              </div>
              <div style={{ fontSize:11, color:'var(--text2)', marginTop:4 }}>{tokenStatus.percentage}% of {tokenStatus.limit.toLocaleString()} tokens used</div>
            </div>
          </div>
        )}

        {/* Bookings */}
        <h2 style={{ fontSize:22, marginBottom:20 }}>My Bookings</h2>
        {bookings.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>📋</div>
            <h3 style={{ marginBottom:8 }}>No bookings yet</h3>
            <p style={{ color:'var(--text2)', marginBottom:24 }}>Book a turf via AI chat or browse manually</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <Link href="/chat"  className="btn btn-primary">🤖 AI Chat</Link>
              <Link href="/turfs" className="btn btn-secondary">🏟️ Browse Turfs</Link>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {bookings.map(b => (
              <div key={b.id} className="card" style={{ display:'flex', gap:20, flexWrap:'wrap', alignItems:'flex-start' }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <h3 style={{ fontSize:17, marginBottom:4 }}>{b.turf?.name}</h3>
                  <p style={{ color:'var(--text2)', fontSize:13 }}>📍 {b.turf?.city} · {b.turf?.location}</p>
                  <p style={{ color:'var(--text2)', fontSize:13 }}>📅 {new Date(b.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} · 🕐 {b.startTime}–{b.endTime}</p>
                </div>
                <div>
                  <p style={{ fontSize:20, fontWeight:700, color:'var(--accent)' }}>₹{b.totalPrice}</p>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  <span className={`badge ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                  <span className={`badge ${PAY_BADGE[b.paymentStatus]}`}>{b.paymentStatus}</span>
                </div>

                {/* Owner contact — revealed after payment */}
                {b.ownerContact && (b.status==='CONFIRMED' || b.paymentStatus==='PAID') && (
                  <div style={{ width:'100%', marginTop:8, padding:'10px 14px', background:'rgba(0,229,160,0.06)', border:'1px solid rgba(0,229,160,0.2)', borderRadius:8, fontSize:13 }}>
                    <p style={{ fontWeight:600, marginBottom:4, color:'var(--accent)' }}>📞 Owner Contact (Revealed)</p>
                    {b.ownerContact.ownerPhone && <p>Phone: <strong>{b.ownerContact.ownerPhone}</strong></p>}
                    {b.ownerContact.ownerEmail && <p>Email: <strong>{b.ownerContact.ownerEmail}</strong></p>}
                  </div>
                )}

                {b.paymentStatus==='UNPAID' && b.status==='PENDING' && (
                  <PayNowButton bookingId={b.id} amount={b.totalPrice} onSuccess={fetchBookings} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
