'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import toast from 'react-hot-toast';

declare global { interface Window { Razorpay: new(o:any)=>{ open():void } } }

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subStatus, setSubStatus] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [paying, setPaying]       = useState(false);
  const [starting, setStarting]   = useState(false);

  useEffect(() => {
    if (status==='unauthenticated') router.push('/login');
    if (status==='authenticated' && !['OWNER','ADMIN'].includes(session.user.role)) router.push('/');
  }, [status, session, router]);

  useEffect(() => {
    if (session) {
      fetch('/api/subscription/status').then(r=>r.json()).then(d=>{ if(d.success) setSubStatus(d.data); }).finally(()=>setLoading(false));
    }
  }, [session]);

  const startTrial = async () => {
    setStarting(true);
    const res  = await fetch('/api/subscription/create-trial', { method:'POST' });
    const data = await res.json();
    if (data.success) { toast.success('🎉 Free trial started! Email sent.'); setSubStatus({ status:'TRIAL', canListTurfs:true, daysLeft:30 }); }
    else toast.error(data.error||'Failed');
    setStarting(false);
  };

  const subscribe = async () => {
    setPaying(true);
    try {
      const res  = await fetch('/api/subscription/create-order', { method:'POST' });
      const data = await res.json();
      if (!data.success) { toast.error(data.error); setPaying(false); return; }
      const opts = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: 300*100, currency:'INR',
        name:'TurfBook', description:'Monthly Subscription — ₹300',
        order_id: data.data.orderId,
        handler: async (resp: any) => {
          const vRes  = await fetch('/api/subscription/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(resp) });
          const vData = await vRes.json();
          if (vData.success) { toast.success('✅ Subscription activated!'); setSubStatus({ status:'ACTIVE', canListTurfs:true, daysLeft:30 }); }
          else toast.error('Verification failed');
          setPaying(false);
        },
        modal: { ondismiss: ()=>setPaying(false) },
        prefill: { name:session?.user.name||'', email:session?.user.email||'' },
        theme: { color:'#00ff87' },
      };
      new window.Razorpay(opts).open();
    } catch { toast.error('Payment failed'); setPaying(false); }
  };

  if (loading||status==='loading') return (
    <>
      <Navbar />
      <div className="min-h-[80vh] flex items-center justify-center" style={{ background:'var(--bg)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin-slow" style={{ borderTopColor:'var(--accent)' }} />
      </div>
    </>
  );

  const STATUS_STYLES: Record<string,{bg:string;color:string;label:string}> = {
    TRIAL:     { bg:'rgba(108,59,255,0.12)', color:'#a78bfa', label:'Free Trial' },
    ACTIVE:    { bg:'rgba(0,255,135,0.12)', color:'#00ff87', label:'Active' },
    EXPIRED:   { bg:'rgba(255,68,68,0.12)', color:'#ff4444', label:'Expired' },
    CANCELLED: { bg:'rgba(128,128,170,0.12)', color:'#8080aa', label:'Cancelled' },
    NONE:      { bg:'rgba(128,128,170,0.12)', color:'#8080aa', label:'No Subscription' },
  };
  const st = STATUS_STYLES[subStatus?.status||'NONE'];

  return (
    <>
      <Navbar />
      <div className="min-h-screen" style={{ background:'var(--bg)' }}>
        <div className="max-w-2xl mx-auto px-4 py-12">

          <div className="text-center mb-10">
            <h1 className="text-4xl font-black mb-3" style={{ fontFamily:'Syne,sans-serif' }}>Owner Subscription</h1>
            <p style={{ color:'var(--text2)' }}>Keep your turfs listed and receive bookings</p>
          </div>

          {/* Current status card */}
          {subStatus && subStatus.status !== 'NONE' && (
            <div className="card mb-8" style={{ border:'1px solid var(--border2)' }}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-xl font-bold">Current Plan</h2>
                <span className="badge" style={{ background:st.bg, color:st.color }}>{st.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl p-4" style={{ background:'var(--bg3)' }}>
                  <div style={{ color:'var(--text2)' }}>Status</div>
                  <div className="font-bold mt-1" style={{ color:st.color }}>{st.label}</div>
                </div>
                <div className="rounded-xl p-4" style={{ background:'var(--bg3)' }}>
                  <div style={{ color:'var(--text2)' }}>Days Remaining</div>
                  <div className="font-bold text-xl mt-1" style={{ color:subStatus.daysLeft>7?'var(--accent)':subStatus.daysLeft>3?'var(--gold)':'var(--danger)' }}>
                    {subStatus.daysLeft} days
                  </div>
                </div>
              </div>
              {subStatus.daysLeft <= 7 && subStatus.status !== 'EXPIRED' && (
                <div className="mt-4 p-3 rounded-xl text-sm" style={{ background:'rgba(255,107,53,0.08)', border:'1px solid rgba(255,107,53,0.2)', color:'var(--accent3)' }}>
                  ⚠️ {subStatus.status==='TRIAL' ? 'Trial' : 'Subscription'} expiring soon! Subscribe to keep your turfs live.
                </div>
              )}
            </div>
          )}

          {/* Pricing card */}
          <div className="card mb-6" style={{ border:'1px solid rgba(0,255,135,0.2)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,var(--accent2),var(--accent))' }} />
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🏟️</div>
              <div className="text-4xl font-black mb-1" style={{ fontFamily:'Syne,sans-serif', color:'var(--accent)' }}>₹300<span className="text-lg font-normal" style={{ color:'var(--text2)' }}>/month</span></div>
              <p className="text-sm mb-6" style={{ color:'var(--text2)' }}>Keep your turfs live and receive unlimited bookings</p>
              <div className="grid grid-cols-1 gap-2 text-sm text-left max-w-xs mx-auto mb-8">
                {['Turfs listed on homepage','Unlimited bookings','Owner dashboard access','Email notifications','Customer support','Coupon & discount tools'].map(f=>(
                  <div key={f} className="flex items-center gap-2"><span style={{ color:'var(--accent)' }}>✓</span>{f}</div>
                ))}
              </div>

              {/* Action button */}
              {!subStatus || subStatus.status==='NONE' ? (
                <div className="flex flex-col gap-3">
                  <button onClick={startTrial} disabled={starting} className="btn-primary w-full py-4 text-lg">
                    {starting ? '⏳ Starting...' : '🎁 Start 30-Day Free Trial'}
                  </button>
                  <p className="text-xs" style={{ color:'var(--text2)' }}>No payment required. Card not needed.</p>
                </div>
              ) : subStatus.status==='EXPIRED' || subStatus.status==='CANCELLED' ? (
                <button onClick={subscribe} disabled={paying} className="btn-primary w-full py-4 text-lg">
                  {paying ? '⏳ Processing...' : '💳 Subscribe — ₹300/month'}
                </button>
              ) : subStatus.status==='TRIAL' ? (
                <button onClick={subscribe} disabled={paying} className="btn-secondary w-full py-4 text-base">
                  {paying ? '⏳ Processing...' : '💳 Subscribe Early — ₹300/month'}
                </button>
              ) : (
                <div className="py-3 rounded-xl font-bold" style={{ background:'rgba(0,255,135,0.1)', color:'var(--accent)' }}>
                  ✅ Subscription Active
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <Link href="/owner/dashboard" className="btn-ghost text-sm">← Back to Dashboard</Link>
          </div>
        </div>
      </div>
    </>
  );
}
