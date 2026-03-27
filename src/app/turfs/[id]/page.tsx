'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { PayNowButton } from '@/components/booking/PayNowButton';
import { to12h } from '@/lib/timeUtils';
import toast from 'react-hot-toast';

interface Slot { startTime:string; endTime:string; isBooked:boolean; }

export default function TurfDetailPage() {
  const { id } = useParams<{ id:string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [turf, setTurf]           = useState<any>(null);
  const [slots, setSlots]         = useState<Slot[]>([]);
  const [date, setDate]           = useState(()=>new Date().toISOString().split('T')[0]);
  const [selectedStart, setStart] = useState<string|null>(null);
  const [hours, setHours]         = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking]     = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    fetch(`/api/turfs/${id}`).then(r=>r.json()).then(d=>{ if(d.success) setTurf(d.data); }).finally(()=>setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id||!date) return;
    setSlotsLoading(true);
    fetch(`/api/turfs/${id}/slots?date=${date}`).then(r=>r.json()).then(d=>{ if(d.success) setSlots(d.data); }).finally(()=>setSlotsLoading(false));
  }, [id, date]);

  const isBlockAvailable = (startTime:string, hrs:number) => {
    const [sh] = startTime.split(':').map(Number);
    for(let i=0; i<hrs; i++) {
      const t = `${String(sh+i).padStart(2,'0')}:00`;
      const slot = slots.find(s=>s.startTime===t);
      if(!slot||slot.isBooked) return false;
    }
    return true;
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    const res  = await fetch(`/api/coupons/${couponCode}?turfId=${id}&hours=${hours}`);
    const data = await res.json();
    if (data.success) { setCouponData(data.data); toast.success(`🎟️ Coupon applied! Save ₹${data.data.discount}`); }
    else { setCouponData(null); toast.error(data.error); }
    setCouponLoading(false);
  };

  const confirmBooking = async () => {
    if (!session) { toast.error('Please login to book'); router.push('/login'); return; }
    if (!selectedStart) { toast.error('Select a start time'); return; }
    if (!isBlockAvailable(selectedStart, hours)) { toast.error('Some slots in this range are booked'); return; }
    setConfirming(true);
    try {
      const [sh] = selectedStart.split(':').map(Number);
      const endTime = `${String(sh+hours).padStart(2,'0')}:00`;
      const res = await fetch('/api/bookings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ turfId:id, date, startTime:selectedStart, endTime, couponCode:couponData?couponCode:undefined }) });
      const data = await res.json();
      if (data.success) { setBooking(data.data); toast.success('Slot reserved! Pay to confirm.'); }
      else toast.error(data.error||'Booking failed');
    } finally { setConfirming(false); }
  };

  const SPORT_COLORS: Record<string,string> = { FOOTBALL:'sport-FOOTBALL', CRICKET:'sport-CRICKET', BASKETBALL:'sport-BASKETBALL' };

  if (loading) return (
    <>
      <Navbar />
      <div className="min-h-[80vh] flex items-center justify-center" style={{ background:'var(--bg)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin-slow" style={{ borderTopColor:'var(--accent)' }} />
      </div>
    </>
  );
  if (!turf) return <><Navbar /><div className="text-center p-20"><h2>Turf not found</h2><Link href="/turfs" className="btn-primary mt-4 inline-block">Back</Link></div></>;

  const [sh] = (selectedStart||'00:00').split(':').map(Number);
  const endTime24 = `${String(sh+hours).padStart(2,'0')}:00`;
  const originalPrice = turf.pricePerHour * hours;
  const discount  = couponData ? couponData.discount : 0;
  const totalPrice = couponData ? couponData.finalPrice : originalPrice;

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm mb-6 flex items-center gap-2" style={{ color:'var(--text2)' }}>
          <Link href="/turfs" style={{ color:'var(--accent)' }}>Turfs</Link>
          <span>›</span><span>{turf.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* LEFT — 3/5 */}
          <div className="lg:col-span-3">
            {/* Main image */}
            <div className="relative rounded-2xl overflow-hidden mb-3" style={{ height:280 }}>
              {turf.images[activeImg] && <Image src={turf.images[activeImg]} alt={turf.name} fill sizes="700px" style={{ objectFit:'cover' }} />}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(5,5,16,0.7) 0%,transparent 50%)' }} />
              <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                {turf.sport.map((s:string)=>(
                  <span key={s} className={`badge ${SPORT_COLORS[s]||'badge-green'}`} style={{ fontSize:11 }}>
                    {s==='FOOTBALL'?'⚽':s==='CRICKET'?'🏏':'🏀'} {s}
                  </span>
                ))}
              </div>
            </div>
            {/* Thumbnails */}
            {turf.images.length>1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {turf.images.slice(0,6).map((img:string,i:number)=>(
                  <button key={i} onClick={()=>setActiveImg(i)} className="flex-shrink-0 rounded-xl overflow-hidden transition-all" style={{ width:72, height:52, border:`2px solid ${activeImg===i?'var(--accent)':'transparent'}` }}>
                    <Image src={img} alt="" width={72} height={52} style={{ objectFit:'cover', width:'100%', height:'100%' }} />
                  </button>
                ))}
              </div>
            )}

            <h1 className="text-2xl font-black mb-2" style={{ fontFamily:'Syne,sans-serif' }}>{turf.name}</h1>
            <p className="text-sm mb-2" style={{ color:'var(--text2)' }}>📍 {turf.address}, {turf.city}</p>
            <p className="text-sm leading-relaxed mb-5" style={{ color:'var(--text2)' }}>{turf.description}</p>

            <div className="flex flex-wrap gap-2 mb-5">
              {turf.amenities.map((a:string)=>(
                <div key={a} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm" style={{ background:'var(--bg3)', border:'1px solid var(--border2)' }}>
                  <span style={{ color:'var(--accent)' }}>✓</span>{a}
                </div>
              ))}
            </div>

            <div className="card flex gap-6 flex-wrap" style={{ background:'var(--bg3)', border:'1px solid var(--border2)', padding:16 }}>
              <div>
                <div className="text-xs mb-1" style={{ color:'var(--text2)' }}>PRICE</div>
                <div className="text-2xl font-black" style={{ color:'var(--accent)', fontFamily:'Syne,sans-serif' }}>₹{turf.pricePerHour}<span className="text-sm font-normal" style={{ color:'var(--text2)' }}>/hr</span></div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color:'var(--text2)' }}>OPEN HOURS</div>
                <div className="font-semibold">{to12h(turf.openTime)} – {to12h(turf.closeTime)}</div>
              </div>
            </div>
          </div>

          {/* RIGHT — 2/5 */}
          <div className="lg:col-span-2">
            <div className="card sticky top-24" style={{ border:'1px solid var(--border2)' }}>
              <h3 className="text-lg font-black mb-5" style={{ fontFamily:'Syne,sans-serif' }}>📅 Book This Turf</h3>

              {/* Date */}
              <div className="mb-4">
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color:'var(--text2)' }}>Date</label>
                <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={e=>{ setDate(e.target.value); setStart(null); setBooking(null); setCouponData(null); }} />
              </div>

              {/* Duration */}
              <div className="mb-4">
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color:'var(--text2)' }}>Duration</label>
                <div className="flex gap-2">
                  {[1,2,3].map(h=>(
                    <button key={h} onClick={()=>{ setHours(h); setStart(null); setBooking(null); setCouponData(null); }} className={hours===h?'btn-primary flex-1 py-2':'btn-secondary flex-1 py-2'} style={{ fontSize:13 }}>
                      {h}hr — ₹{turf.pricePerHour*h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slots */}
              <div className="mb-4">
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color:'var(--text2)' }}>
                  Time {selectedStart && <span style={{ color:'var(--accent)' }}>· {to12h(selectedStart)} – {to12h(endTime24)}</span>}
                </label>
                {slotsLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(9)].map((_,i)=><div key={i} className="skeleton h-9 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map(slot=>{
                      const avail = isBlockAvailable(slot.startTime, hours);
                      const sel   = selectedStart===slot.startTime;
                      return (
                        <button key={slot.startTime} disabled={!avail} onClick={()=>{ setStart(slot.startTime); setBooking(null); }}
                          className="rounded-xl border text-xs font-semibold py-2 transition-all"
                          style={{ background:!avail?'var(--bg3)':sel?'var(--accent)':'rgba(0,255,135,0.06)', borderColor:!avail?'var(--border)':sel?'var(--accent)':'rgba(0,255,135,0.2)', color:!avail?'var(--text2)':sel?'#050510':'var(--accent)', opacity:!avail?0.4:1, cursor:!avail?'not-allowed':'pointer' }}>
                          {to12h(slot.startTime)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Coupon */}
              {selectedStart && (
                <div className="mb-4">
                  <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color:'var(--text2)' }}>Coupon Code</label>
                  <div className="flex gap-2">
                    <input value={couponCode} onChange={e=>{ setCouponCode(e.target.value.toUpperCase()); setCouponData(null); }} placeholder="Enter code..." className="flex-1 text-sm" style={{ borderRadius:10 }} />
                    <button onClick={applyCoupon} disabled={couponLoading||!couponCode} className="btn-secondary text-xs px-3 whitespace-nowrap">
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponData && (
                    <div className="mt-2 text-xs px-3 py-2 rounded-xl" style={{ background:'rgba(0,255,135,0.08)', border:'1px solid rgba(0,255,135,0.2)', color:'var(--accent)' }}>
                      ✓ Saving ₹{couponData.discount} · Final: ₹{couponData.finalPrice}
                    </div>
                  )}
                </div>
              )}

              {/* Price summary */}
              {selectedStart && (
                <div className="mb-4 rounded-xl p-3 text-sm" style={{ background:'rgba(0,255,135,0.06)', border:'1px solid rgba(0,255,135,0.15)' }}>
                  <div className="flex justify-between mb-1"><span style={{ color:'var(--text2)' }}>₹{turf.pricePerHour} × {hours}hr</span><span>₹{originalPrice}</span></div>
                  {discount>0 && <div className="flex justify-between mb-1" style={{ color:'var(--accent)' }}><span>Discount ({couponCode})</span><span>-₹{discount}</span></div>}
                  <div className="flex justify-between font-black text-base border-t pt-2 mt-1" style={{ borderColor:'rgba(0,255,135,0.15)' }}>
                    <span>Total</span><span style={{ color:'var(--accent)' }}>₹{totalPrice}</span>
                  </div>
                </div>
              )}

              {!booking ? (
                <button onClick={confirmBooking} disabled={!selectedStart||confirming} className="btn-primary w-full py-3 text-base">
                  {confirming ? '⏳ Reserving...' : session ? '🏟️ Reserve Slot' : '🔒 Login to Book'}
                </button>
              ) : (
                <div className="rounded-xl p-4" style={{ background:'rgba(0,255,135,0.05)', border:'1px solid rgba(0,255,135,0.2)' }}>
                  <p className="text-sm mb-3" style={{ color:'var(--text2)' }}>✅ Slot reserved! Pay to confirm booking.</p>
                  <PayNowButton bookingId={booking.bookingId} amount={booking.totalPrice} redirectToConfirmation={true} onSuccess={()=>{ setBooking(null); setStart(null); }} />
                </div>
              )}

              {/* Owner contact locked */}
              <div className="mt-4 rounded-xl p-3 flex items-center gap-3" style={{ background:'var(--bg3)', border:'1px solid var(--border)', opacity:0.7 }}>
                <span className="text-xl">🔒</span>
                <div>
                  <div className="text-xs font-bold">Owner Contact</div>
                  <div className="text-xs mt-0.5" style={{ color:'var(--text2)' }}>Revealed after payment</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
