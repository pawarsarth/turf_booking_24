'use client';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen]       = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const role = session?.user?.role;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav style={{
      background: scrolled ? 'rgba(5,5,16,0.97)' : 'rgba(5,5,16,0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${scrolled ? 'var(--border2)' : 'rgba(255,255,255,0.05)'}`,
      position: 'sticky', top: 0, zIndex: 100,
      transition: 'all 0.3s ease',
      boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.5)' : 'none',
    }}>
      <div className="container mx-auto px-4 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background:'linear-gradient(135deg,var(--accent2),var(--accent))' }}>🏟️</div>
          <span className="font-black text-xl gradient-text" style={{ fontFamily:'Syne,sans-serif' }}>TurfBook</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/turfs" className="btn-ghost text-sm">Browse Turfs</Link>
          <Link href="/chat"  className="btn-ghost text-sm">🤖 AI Agent</Link>
          {!session ? (
            <>
              <Link href="/login"    className="btn-secondary text-sm ml-2">Login</Link>
              <Link href="/register" className="btn-primary text-sm">Sign Up</Link>
            </>
          ) : (
            <div className="relative ml-2">
              <button onClick={()=>setOpen(o=>!o)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors" style={{ background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text)', cursor:'pointer' }}>
                {session.user.image
                  ? <Image src={session.user.image} alt="" width={26} height={26} className="rounded-full" />
                  : <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background:'linear-gradient(135deg,var(--accent2),var(--accent))', color:'#050510' }}>{session.user.name?.[0]?.toUpperCase()}</div>
                }
                <span className="text-sm max-w-24 truncate">{session.user.name}</span>
                <span className="text-xs transition-transform duration-200" style={{ color:'var(--text2)', transform:open?'rotate(180deg)':'none', display:'inline-block' }}>▼</span>
              </button>

              {open && (
                <>
                  <div onClick={()=>setOpen(false)} className="fixed inset-0" style={{ zIndex:99 }} />
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl p-2 animate-scale-in" style={{ background:'var(--card)', border:'1px solid var(--border2)', zIndex:200, boxShadow:'0 16px 48px rgba(0,0,0,0.7)', top:'100%' }}>
                    <div className="px-3 py-2 mb-1" style={{ borderBottom:'1px solid var(--border)' }}>
                      <div className="text-sm font-bold truncate">{session.user.name}</div>
                      <div className="text-xs truncate" style={{ color:'var(--text2)' }}>{session.user.email}</div>
                      <span className={`badge mt-1 ${role==='ADMIN'?'badge-red':role==='OWNER'?'badge-purple':'badge-green'}`} style={{ fontSize:10 }}>{role}</span>
                    </div>
                    {role==='ADMIN'  && <Link href="/admin/dashboard"  onClick={()=>setOpen(false)} className="dropdown-item" style={{ color:'var(--gold)' }}>⚙️ Admin Panel</Link>}
                    {(role==='OWNER'||role==='ADMIN') && <Link href="/owner/dashboard" onClick={()=>setOpen(false)} className="dropdown-item" style={{ color:'#a78bfa' }}>🏟️ Owner Dashboard</Link>}
                    <Link href="/dashboard" onClick={()=>setOpen(false)} className="dropdown-item">📋 My Bookings</Link>
                    <Link href="/chat"      onClick={()=>setOpen(false)} className="dropdown-item">🤖 AI Chat</Link>
                    <hr className="my-1" style={{ border:'none', borderTop:'1px solid var(--border)' }} />
                    <button onClick={()=>{ signOut({callbackUrl:'/'}); setOpen(false); }} className="dropdown-item w-full text-left" style={{ background:'transparent', border:'none', color:'var(--danger)', fontSize:14, cursor:'pointer' }}>🚪 Sign Out</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={()=>setMobileMenu(o=>!o)} className="md:hidden p-2 rounded-xl" style={{ background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)', cursor:'pointer' }}>
          {mobileMenu ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-2" style={{ borderTop:'1px solid var(--border)', background:'var(--bg2)' }}>
          <Link href="/turfs" onClick={()=>setMobileMenu(false)} className="btn-ghost text-sm justify-start">Browse Turfs</Link>
          <Link href="/chat"  onClick={()=>setMobileMenu(false)} className="btn-ghost text-sm justify-start">🤖 AI Agent</Link>
          {!session ? (
            <div className="flex gap-2 mt-1">
              <Link href="/login"    onClick={()=>setMobileMenu(false)} className="btn-secondary flex-1 text-sm justify-center">Login</Link>
              <Link href="/register" onClick={()=>setMobileMenu(false)} className="btn-primary  flex-1 text-sm justify-center">Sign Up</Link>
            </div>
          ) : (
            <>
              <hr style={{ border:'none', borderTop:'1px solid var(--border)' }} />
              {role==='ADMIN'  && <Link href="/admin/dashboard"  onClick={()=>setMobileMenu(false)} className="btn-ghost text-sm justify-start" style={{ color:'var(--gold)' }}>⚙️ Admin Panel</Link>}
              {(role==='OWNER'||role==='ADMIN') && <Link href="/owner/dashboard" onClick={()=>setMobileMenu(false)} className="btn-ghost text-sm justify-start" style={{ color:'#a78bfa' }}>🏟️ Owner Dashboard</Link>}
              <Link href="/dashboard" onClick={()=>setMobileMenu(false)} className="btn-ghost text-sm justify-start">📋 My Bookings</Link>
              <button onClick={()=>{ signOut({callbackUrl:'/'}); setMobileMenu(false); }} className="btn-ghost text-sm text-left" style={{ color:'var(--danger)', background:'transparent', border:'none', cursor:'pointer' }}>🚪 Sign Out</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
