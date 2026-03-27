'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Turf, Sport } from '@/types';

const SPORT_ICONS: Record<Sport,string> = { FOOTBALL:'⚽', CRICKET:'🏏', BASKETBALL:'🏀' };

export default function TurfsPage() {
  const [turfs, setTurfs]       = useState<Turf[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sport, setSport]       = useState('');
  const [city, setCity]         = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (sport)    p.set('sport', sport);
    if (city)     p.set('city', city);
    if (maxPrice) p.set('maxPrice', maxPrice);
    fetch(`/api/turfs?${p}`).then(r=>r.json()).then(d=>{ if(d.success) setTurfs(d.data); }).finally(()=>setLoading(false));
  }, [sport, city, maxPrice]);

  return (
    <>
      <Navbar />
      <div className="container" style={{ padding:'48px 24px' }}>
        <div style={{ marginBottom:40 }}>
          <h1 style={{ fontSize:36, marginBottom:8 }}>Browse Turfs</h1>
          <p style={{ color:'var(--text2)' }}>Find and book your perfect sports ground</p>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:12, marginBottom:40, flexWrap:'wrap' }}>
          <select value={sport} onChange={e=>setSport(e.target.value)} style={{ width:'auto', minWidth:160 }}>
            <option value="">All Sports</option>
            <option value="CRICKET">🏏 Cricket</option>
            <option value="FOOTBALL">⚽ Football</option>
            <option value="BASKETBALL">🏀 Basketball</option>
          </select>
          <input value={city} onChange={e=>setCity(e.target.value)} placeholder="🏙️ City..." style={{ width:180 }} />
          <input type="number" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Max ₹/hr" style={{ width:140 }} />
          <button onClick={()=>{ setSport(''); setCity(''); setMaxPrice(''); }} className="btn btn-secondary">Reset</button>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'var(--text2)' }}>
            <div style={{ width:40, height:40, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
            Loading turfs...
          </div>
        ) : turfs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
            <p style={{ color:'var(--text2)' }}>No turfs found. Try adjusting filters.</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:24 }}>
            {turfs.map(turf => (
              <div key={turf.id} className="card card-hover" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ position:'relative', height:200, background:'var(--bg3)' }}>
                  {turf.images[0] && <Image src={turf.images[0]} alt={turf.name} fill sizes="400px" style={{ objectFit:'cover' }} />}
                  <div style={{ position:'absolute', top:12, left:12, display:'flex', gap:6, flexWrap:'wrap' }}>
                    {turf.sport.map(s => <span key={s} className="badge badge-green" style={{ fontSize:11 }}>{SPORT_ICONS[s]} {s}</span>)}
                  </div>
                </div>
                <div style={{ padding:20 }}>
                  <h3 style={{ fontSize:18, marginBottom:4 }}>{turf.name}</h3>
                  <p style={{ color:'var(--text2)', fontSize:13, marginBottom:8 }}>📍 {turf.location}, {turf.city}</p>
                  <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{turf.description}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
                    {turf.amenities.slice(0,3).map(a=><span key={a} style={{ fontSize:11, color:'var(--text2)', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:6, padding:'2px 8px' }}>{a}</span>)}
                    {turf.amenities.length>3 && <span style={{ fontSize:11, color:'var(--text2)' }}>+{turf.amenities.length-3}</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <span style={{ fontSize:22, fontWeight:700, color:'var(--accent)', fontFamily:'var(--font-display)' }}>₹{turf.pricePerHour}</span>
                      <span style={{ fontSize:12, color:'var(--text2)' }}>/hr</span>
                    </div>
                    <Link href={`/turfs/${turf.id}`} className="btn btn-primary" style={{ fontSize:13, padding:'8px 18px' }}>View & Book</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
