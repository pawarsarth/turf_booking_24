import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';

const features = [
  { icon: '🤖', title: 'AI Booking Agent',    desc: 'Chat naturally — TurfBot finds turfs, checks slots, and books for you in seconds.' },
  { icon: '⚡', title: 'Instant Slots',       desc: 'See real-time availability. Pick your hour slot and lock it instantly.' },
  { icon: '📍', title: 'Multiple Locations',  desc: 'Cricket, football, basketball grounds across your city.' },
  { icon: '🔒', title: 'Razorpay Secure',     desc: 'UPI, cards, netbanking — your payment is secured end-to-end.' },
  { icon: '📊', title: 'Owner Analytics',     desc: 'Track revenue, bookings, and customer details from one dashboard.' },
  { icon: '🌐', title: 'Google Login',        desc: 'One-click sign-in with your Google account.' },
];

const sports = [
  { icon: '🏏', label: 'Cricket',    color: 'var(--gold)',    desc: 'Full-pitch & nets' },
  { icon: '⚽', label: 'Football',   color: 'var(--accent)',  desc: '5-a-side & 11-a-side' },
  { icon: '🏀', label: 'Basketball', color: 'var(--accent3)', desc: 'Indoor & outdoor' },
];

const steps = [
  { n: '01', title: 'Chat with TurfBot',  desc: 'Tell our AI your sport, city and preferred time.' },
  { n: '02', title: 'Pick Your Slot',     desc: 'Browse available slots and select your hour(s).' },
  { n: '03', title: 'Pay & Play',         desc: 'Pay via Razorpay and get instant confirmation.' },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main style={{ overflow: 'hidden' }}>

        {/* ── HERO ────────────────────────────────────────── */}
        <section style={{ position:'relative', minHeight:'92vh', display:'flex', alignItems:'center', overflow:'hidden' }}>
          {/* Animated gradient bg */}
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 100% 80% at 20% 50%, rgba(108,59,255,0.18) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 80% 20%, rgba(0,255,135,0.12) 0%, transparent 60%)', pointerEvents:'none' }} />
          {/* Grid */}
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(30,30,69,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(30,30,69,0.4) 1px,transparent 1px)', backgroundSize:'64px 64px', pointerEvents:'none' }} />
          {/* Glow orbs */}
          <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'rgba(108,59,255,0.06)', filter:'blur(80px)', top:'-10%', right:'-5%', pointerEvents:'none' }} />
          <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'rgba(0,255,135,0.05)', filter:'blur(80px)', bottom:'-5%', left:'5%', pointerEvents:'none' }} />

          <div className="container" style={{ position:'relative', zIndex:1, paddingTop:60, paddingBottom:60 }}>
            <div style={{ maxWidth:760 }}>
              {/* Live badge */}
              <div className="fade-in" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,255,135,0.08)', border:'1px solid rgba(0,255,135,0.25)', borderRadius:24, padding:'7px 18px', marginBottom:32 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', display:'inline-block', animation:'pulse 2s infinite', boxShadow:'0 0 8px var(--accent)' }} />
                <span style={{ fontSize:13, color:'var(--accent)', fontWeight:700, letterSpacing:0.5 }}>AI-Powered Sports Turf Booking</span>
              </div>

              <h1 className="fade-in" style={{ fontSize:'clamp(44px,6vw,84px)', marginBottom:24, letterSpacing:'-2px', lineHeight:1.05, animationDelay:'0.1s' }}>
                Book Your Turf.<br />
                <span style={{ background:'linear-gradient(135deg,var(--accent),#00cc6a,var(--accent2))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Play Today.</span>
              </h1>

              <p className="fade-in" style={{ fontSize:18, color:'var(--text2)', maxWidth:520, lineHeight:1.8, marginBottom:40, animationDelay:'0.2s' }}>
                Find, book and pay for cricket, football & basketball turfs near you. Powered by Groq AI — just chat and we handle the rest.
              </p>

              <div className="fade-in" style={{ display:'flex', gap:14, flexWrap:'wrap', animationDelay:'0.3s' }}>
                <Link href="/chat"  className="btn btn-primary"   style={{ fontSize:16, padding:'14px 36px' }}>🤖 Chat to Book</Link>
                <Link href="/turfs" className="btn btn-secondary" style={{ fontSize:16, padding:'14px 36px' }}>Browse All Turfs →</Link>
              </div>

              {/* Social proof */}
              <div className="fade-in" style={{ display:'flex', gap:32, marginTop:48, flexWrap:'wrap', animationDelay:'0.4s' }}>
                {[['500+','Turfs Listed'],['10K+','Bookings Done'],['4.9★','User Rating']].map(([v,l])=>(
                  <div key={l}>
                    <div style={{ fontSize:24, fontWeight:800, color:'var(--accent)', fontFamily:'var(--font-display)' }}>{v}</div>
                    <div style={{ fontSize:12, color:'var(--text2)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating sport cards */}
            <div style={{ position:'absolute', right:-20, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:16, opacity:0.85 }}>
              {sports.map((s,i)=>(
                <div key={s.label} className="glass" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:12, animation:`float ${3+i*0.5}s ease-in-out infinite`, animationDelay:`${i*0.4}s`, minWidth:160 }}>
                  <span style={{ fontSize:28 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{s.label}</div>
                    <div style={{ fontSize:11, color:'var(--text2)' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SPORTS SECTION ──────────────────────────────── */}
        <section style={{ padding:'100px 0', background:'var(--bg2)', position:'relative' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,var(--accent2),var(--accent),transparent)' }} />
          <div className="container">
            <div style={{ textAlign:'center', marginBottom:64 }}>
              <h2 style={{ fontSize:40, marginBottom:12 }}>Sports We Support</h2>
              <p style={{ color:'var(--text2)', fontSize:16 }}>World-class facilities for every sport</p>
            </div>
            <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:24 }}>
              {sports.map(s=>(
                <div key={s.label} className="card fade-in-up" style={{ textAlign:'center', padding:40, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-30, right:-30, fontSize:120, opacity:0.04, fontFamily:'sans-serif' }}>{s.icon}</div>
                  <div style={{ fontSize:56, marginBottom:20, display:'block', filter:'drop-shadow(0 0 20px rgba(0,255,135,0.3))', animation:'float 3s ease-in-out infinite' }}>{s.icon}</div>
                  <h3 style={{ fontSize:24, marginBottom:8, color:s.color }}>{s.label}</h3>
                  <p style={{ color:'var(--text2)', fontSize:14 }}>{s.desc}</p>
                  <Link href={`/turfs?sport=${s.label.toUpperCase()}`} className="btn btn-secondary" style={{ marginTop:20, fontSize:13 }}>View {s.label} Turfs →</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────── */}
        <section style={{ padding:'100px 0' }}>
          <div className="container">
            <div style={{ textAlign:'center', marginBottom:64 }}>
              <h2 style={{ fontSize:40, marginBottom:12 }}>How It Works</h2>
              <p style={{ color:'var(--text2)', fontSize:16 }}>Book in 3 simple steps</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:32, position:'relative' }}>
              {steps.map((s,i)=>(
                <div key={s.n} className="fade-in-up" style={{ textAlign:'center', animationDelay:`${i*0.15}s` }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', background:`linear-gradient(135deg,var(--accent2),var(--accent))`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'#050510', boxShadow:'0 8px 32px rgba(0,255,135,0.3)', animation:'glow 3s ease-in-out infinite', animationDelay:`${i*0.5}s` }}>{s.n}</div>
                  <h3 style={{ fontSize:20, marginBottom:10 }}>{s.title}</h3>
                  <p style={{ color:'var(--text2)', fontSize:14, lineHeight:1.7 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ───────────────────────────────── */}
        <section style={{ padding:'100px 0', background:'var(--bg2)', position:'relative' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,var(--accent),var(--accent2),transparent)' }} />
          <div className="container">
            <div style={{ textAlign:'center', marginBottom:64 }}>
              <h2 style={{ fontSize:40, marginBottom:12 }}>Why TurfBook?</h2>
              <p style={{ color:'var(--text2)', fontSize:16 }}>Built for players, by players</p>
            </div>
            <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
              {features.map(f=>(
                <div key={f.title} className="card card-hover fade-in-up">
                  <div style={{ width:48, height:48, borderRadius:14, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:16, border:'1px solid var(--border2)' }}>{f.icon}</div>
                  <h3 style={{ fontSize:17, marginBottom:8 }}>{f.title}</h3>
                  <p style={{ color:'var(--text2)', fontSize:13, lineHeight:1.7 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section style={{ padding:'100px 0', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(108,59,255,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
          <div className="container" style={{ textAlign:'center', position:'relative' }}>
            <h2 style={{ fontSize:48, marginBottom:16, letterSpacing:'-1px' }}>Ready to Play?</h2>
            <p style={{ color:'var(--text2)', marginBottom:40, fontSize:18 }}>Book your turf in under 2 minutes</p>
            <Link href="/chat" className="btn btn-primary" style={{ fontSize:18, padding:'16px 52px', borderRadius:16 }}>Start Booking Now 🚀</Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop:'1px solid var(--border)', padding:'32px 0', color:'var(--text2)', fontSize:13 }}>
          <div className="container" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:20 }}>🏟️</span>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:800, background:'linear-gradient(135deg,var(--accent),#00cc6a)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>TurfBook</span>
            </div>
            <p>© 2025 TurfBook · Next.js · Groq · Razorpay · Cloudinary</p>
            <div style={{ display:'flex', gap:16 }}>
              <Link href="/turfs" style={{ color:'var(--text2)' }}>Turfs</Link>
              <Link href="/chat"  style={{ color:'var(--text2)' }}>AI Chat</Link>
              <Link href="/login" style={{ color:'var(--text2)' }}>Login</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
