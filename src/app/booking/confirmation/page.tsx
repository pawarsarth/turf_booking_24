'use client';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';

function ConfirmationContent() {
  const params      = useSearchParams();
  const bookingId   = params.get('bookingId');
  const [booking, setBooking]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    fetch(`/api/bookings/${bookingId}`)
      .then(r=>r.json())
      .then(d=>{ if(d.success) setBooking(d.data); })
      .finally(()=>setLoading(false));
  }, [bookingId]);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(()=>{ window.print(); setPrinting(false); }, 200);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--bg)' }}>
      <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin-slow" style={{ borderTopColor:'var(--accent)' }} />
    </div>
  );

  if (!booking) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6" style={{ background:'var(--bg)' }}>
      <div className="text-6xl mb-4">❌</div>
      <h2 className="text-2xl font-bold mb-4">Booking not found</h2>
      <Link href="/dashboard" className="btn-primary px-8 py-3">Go to Dashboard</Link>
    </div>
  );

  const turf = booking.turf;
  const user = booking.user;

  function to12h(t: string) {
    if(!t) return t;
    const [h,m] = t.split(':').map(Number);
    const ampm = h>=12?'PM':'AM';
    const h12  = h>12?h-12:h===0?12:h;
    return m===0?`${h12} ${ampm}`:`${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  const bookingDate = new Date(booking.date).toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long', year:'numeric' });

  return (
    <>
      <div className="no-print">
        <Navbar />
      </div>

      <div className="min-h-screen py-10 px-4" style={{ background:'var(--bg)' }}>
        <div className="max-w-2xl mx-auto">

          {/* Success header */}
          <div className="text-center mb-8 no-print animate-fade-in">
            <div className="text-7xl mb-4" style={{ filter:'drop-shadow(0 0 30px rgba(0,255,135,0.5))' }}>🎉</div>
            <h1 className="text-4xl font-black mb-2" style={{ fontFamily:'Syne, sans-serif' }}>
              Booking <span style={{ color:'var(--accent)' }}>Confirmed!</span>
            </h1>
            <p style={{ color:'var(--text2)' }}>Your slot is locked. See you on the field!</p>
          </div>

          {/* Ticket */}
          <div id="ticket" className="rounded-2xl overflow-hidden" style={{ background:'var(--card)', border:'1px solid var(--border2)', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>

            {/* Ticket header */}
            <div className="p-6" style={{ background:'linear-gradient(135deg, var(--accent2), var(--accent))', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-20, right:-20, fontSize:100, opacity:0.07 }}>🏟️</div>
              <div className="flex items-center gap-3">
                <div className="text-3xl">🏟️</div>
                <div>
                  <div className="text-xl font-black text-white" style={{ fontFamily:'Syne, sans-serif' }}>TurfBook</div>
                  <div className="text-sm text-white opacity-75">Official Booking Ticket</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs text-white opacity-75">Booking ID</div>
                  <div className="text-sm font-bold text-white font-mono">{booking.id.slice(-8).toUpperCase()}</div>
                </div>
              </div>
            </div>

            {/* Dashed divider */}
            <div className="flex items-center px-6 py-1" style={{ borderTop:'2px dashed var(--border2)' }}>
              <div className="w-6 h-6 rounded-full -ml-9" style={{ background:'var(--bg)' }} />
              <div className="flex-1" />
              <div className="w-6 h-6 rounded-full -mr-9" style={{ background:'var(--bg)' }} />
            </div>

            <div className="p-6 grid gap-6">
              {/* Turf info */}
              <div className="flex gap-4">
                {turf?.images?.[0] && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <Image src={turf.images[0]} alt={turf.name} fill style={{ objectFit:'cover' }} sizes="80px" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-black" style={{ fontFamily:'Syne, sans-serif' }}>{turf?.name}</h2>
                  <p className="text-sm" style={{ color:'var(--text2)' }}>📍 {turf?.location}, {turf?.city}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {turf?.sport?.map((s:string)=>(
                      <span key={s} className="badge badge-green text-xs">{s==='FOOTBALL'?'⚽':s==='CRICKET'?'🏏':'🏀'} {s}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Booking details grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon:'📅', label:'Date',       value: bookingDate },
                  { icon:'🕐', label:'Time',       value: `${to12h(booking.startTime)} – ${to12h(booking.endTime)}` },
                  { icon:'⏱️', label:'Duration',   value: (() => { const sh=parseInt(booking.startTime); const eh=parseInt(booking.endTime); const hrs=eh-sh; return `${hrs} Hour${hrs>1?'s':''}`; })() },
                  { icon:'💰', label:'Amount Paid', value: `₹${booking.totalPrice}` },
                  { icon:'✅', label:'Status',     value: booking.status },
                  { icon:'💳', label:'Payment',    value: booking.paymentStatus },
                ].map(item=>(
                  <div key={item.label} className="rounded-xl p-3" style={{ background:'var(--bg3)', border:'1px solid var(--border)' }}>
                    <div className="text-xs mb-1" style={{ color:'var(--text2)' }}>{item.icon} {item.label}</div>
                    <div className="font-bold text-sm" style={{ color: item.label==='Amount Paid'?'var(--accent)':item.label==='Status'&&item.value==='CONFIRMED'?'var(--accent)':'var(--text)' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer info */}
              {user && (
                <div className="rounded-xl p-4" style={{ background:'var(--bg3)', border:'1px solid var(--border)' }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'var(--text2)' }}>👤 Customer Details</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span style={{ color:'var(--text2)' }}>Name: </span><strong>{user.name}</strong></div>
                    <div><span style={{ color:'var(--text2)' }}>Email: </span><strong>{user.email}</strong></div>
                    {user.phone && <div><span style={{ color:'var(--text2)' }}>Phone: </span><strong>{user.phone}</strong></div>}
                  </div>
                </div>
              )}

              {/* Owner contact (revealed after payment) */}
              {booking.ownerRevealed && turf?.ownerPhone && (
                <div className="rounded-xl p-4" style={{ background:'rgba(0,255,135,0.06)', border:'1px solid rgba(0,255,135,0.2)' }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'var(--accent)' }}>📞 Venue Contact</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {turf.ownerPhone && <div><span style={{ color:'var(--text2)' }}>Phone: </span><strong>{turf.ownerPhone}</strong></div>}
                    {turf.ownerEmail && <div><span style={{ color:'var(--text2)' }}>Email: </span><strong>{turf.ownerEmail}</strong></div>}
                  </div>
                </div>
              )}

              {/* Rules */}
              <div className="rounded-xl p-4 text-sm" style={{ background:'rgba(108,59,255,0.06)', border:'1px solid rgba(108,59,255,0.2)', color:'var(--text2)' }}>
                <div className="font-bold mb-2" style={{ color:'#a78bfa' }}>📋 Important Rules</div>
                <ul className="space-y-1">
                  <li>✓ Carry this booking confirmation</li>
                  <li>✓ Arrive 10 minutes before your slot</li>
                  <li>✓ Sports shoes are mandatory</li>
                  <li>✓ No alcohol or food on the turf</li>
                  <li>✓ Max 15 players per slot</li>
                </ul>
              </div>
            </div>

            {/* Ticket footer */}
            <div className="px-6 py-4 text-center text-xs" style={{ borderTop:'1px dashed var(--border2)', color:'var(--text2)' }}>
              TurfBook · support@turfbook.com · {new Date().getFullYear()}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center mt-8 no-print">
            <button onClick={handlePrint} disabled={printing} className="btn-primary px-8 py-3 text-base">
              {printing ? '⏳ Preparing...' : '🖨️ Print Ticket'}
            </button>
            <Link href="/dashboard" className="btn-secondary px-8 py-3 text-base">📋 My Bookings</Link>
            <Link href="/turfs"     className="btn-ghost px-6 py-3">Book Another</Link>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          #ticket { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
      `}</style>
    </>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background:'var(--bg)' }}><div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin-slow" style={{ borderTopColor:'var(--accent)' }} /></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
