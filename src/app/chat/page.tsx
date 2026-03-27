'use client';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { PayNowButton } from '@/components/booking/PayNowButton';
import { Navbar } from '@/components/layout/Navbar';
import { v4 as uuidv4 } from 'uuid';
import { ChatMsg } from '@/types';

const SUGGESTIONS = [
  '⚽ Football turfs in Bhopal',
  '🏏 Book cricket turf tomorrow 2 hours',
  '🏀 Basketball courts available today?',
  '📋 Show my bookings',
  '💰 Cancellation policy?',
];

interface SessionItem { id:string; preview:string; date:string; msgs:ChatMsg[]; }

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages]   = useState<ChatMsg[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sessionId, setSessionId] = useState(()=>uuidv4());
  const [sessions, setSessions]   = useState<SessionItem[]>([]);
  const [sideOpen, setSideOpen]   = useState(true);
  const [quota, setQuota]         = useState<{used:number;limit:number;remaining:number}|null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);

  useEffect(()=>{
    if (session && !historyLoaded) {
      fetch('/api/chat?limit=80').then(r=>r.json()).then(d=>{
        if (d.success) {
          if (d.data.sessions) {
            const s = Object.values(d.data.sessions) as any[];
            setSessions(s.map((x:any)=>({ id:x.id, preview:x.preview, date:x.date, msgs:x.messages?.map((m:any)=>({ role:m.role==='USER'?'user':'assistant', content:m.content })) ?? [] })));
          }
          if (d.data.messages?.length) {
            const restored: ChatMsg[] = d.data.messages.map((m:any)=>({ role:m.role==='USER'?'user':'assistant', content:m.content }));
            setMessages(restored);
            setSessionId(d.data.messages[d.data.messages.length-1].sessionId);
          }
        }
        setHistoryLoaded(true);
      });
      fetch('/api/tokens').then(r=>r.json()).then(d=>{ if(d.success) setQuota(d.data); });
    }
  }, [session, historyLoaded]);

  const loadSession = (s: SessionItem) => { setMessages(s.msgs); setSessionId(s.id); };
  const newChat = () => { setMessages([]); setSessionId(uuidv4()); };

  const send = async (text: string) => {
    if (!text.trim()||loading||!session) return;
    setInput('');
    const userMsg: ChatMsg = { role:'user', content:text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const res  = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ messages:newMsgs.map(m=>({role:m.role,content:m.content})), sessionId }) });
      const data = await res.json();
      if (!data.success) {
        setMessages(prev=>[...prev,{ role:'assistant', content:data.code==='TOKEN_LIMIT_EXCEEDED'?`⚠️ **${data.error}**`:`❌ ${data.error}` }]);
        return;
      }
      // Parse bookingId from reply
      let bookingId: string|undefined;
      let bookingAmount: number|undefined;
      const idM  = data.data.reply.match(/"bookingId"\s*:\s*"([^"]+)"/);
      const amtM = data.data.reply.match(/"totalPrice"\s*:\s*(\d+(?:\.\d+)?)/);
      if (idM)  bookingId     = idM[1];
      if (amtM) bookingAmount = parseFloat(amtM[1]);
      // Also check from server-side extraction
      if (!bookingId && data.data.bookingId) bookingId = data.data.bookingId;
      if (!bookingAmount && data.data.bookingAmount) bookingAmount = data.data.bookingAmount;

      setMessages(prev=>[...prev,{
        role:'assistant',
        content:data.data.reply,
        bookingId,
        bookingAmount,
        showBookButton: data.data.showBookButton && !bookingId,
      }]);
      if (data.data.tokens) setQuota(data.data.tokens);
      setSessions(prev=>{ const ex=prev.find(s=>s.id===sessionId); if(ex) return prev; return [{ id:sessionId, preview:text.slice(0,48), date:new Date().toISOString(), msgs:[] }, ...prev].slice(0,20); });
    } catch {
      setMessages(prev=>[...prev,{ role:'assistant', content:'❌ Network error. Please try again.' }]);
    } finally { setLoading(false); setTimeout(()=>inputRef.current?.focus(),100); }
  };

  if (status==='loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--bg)' }}>
      <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin-slow" style={{ borderTopColor:'var(--accent)' }} />
    </div>
  );

  if (!session) return (
    <>
      <Navbar />
      <div className="min-h-[90vh] flex items-center justify-center text-center p-6">
        <div className="animate-fade-in max-w-md">
          <div className="text-7xl mb-6" style={{ filter:'drop-shadow(0 0 30px rgba(0,255,135,0.4))' }}>🔒</div>
          <h2 className="text-3xl font-black mb-3" style={{ fontFamily:'Syne,sans-serif' }}>Login Required</h2>
          <p className="mb-8 text-lg leading-relaxed" style={{ color:'var(--text2)' }}>
            Sign in to chat with TurfBot. You can{' '}
            <Link href="/turfs" style={{ color:'var(--accent)' }}>browse turfs</Link>{' '}
            without an account.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/login"    className="btn-primary px-8 py-3 text-base">Login</Link>
            <Link href="/register" className="btn-secondary px-8 py-3 text-base">Register</Link>
          </div>
        </div>
      </div>
    </>
  );

  const qPct   = quota ? Math.round((quota.used/quota.limit)*100) : 0;
  const qColor = qPct>90?'#ff4444':qPct>70?'#ffd700':'#00ff87';

  return (
    <>
      <Navbar />
      {/* Chat layout — full height minus navbar */}
      <div className="flex" style={{ height:'calc(100vh - 68px)', overflow:'hidden' }}>

        {/* SIDEBAR */}
        <aside className={`flex flex-col transition-all duration-300 ease-in-out ${sideOpen?'w-72':'w-0'} overflow-hidden flex-shrink-0`}
          style={{ background:'var(--bg2)', borderRight:'1px solid var(--border)' }}>
          <div className="p-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
            <span className="font-black text-base" style={{ fontFamily:'Syne,sans-serif', color:'var(--accent)' }}>TurfBot</span>
            <button onClick={newChat} className="btn-primary text-xs px-3 py-1.5" style={{ borderRadius:8 }}>+ New</button>
          </div>

          {/* Token bar */}
          {quota && (
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
              <div className="flex justify-between text-xs mb-1.5" style={{ color:'var(--text2)' }}>
                <span>AI Tokens</span>
                <span style={{ color:qColor }}>{quota.remaining.toLocaleString()} left</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--bg3)' }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width:`${Math.min(100,qPct)}%`, background:qColor }} />
              </div>
            </div>
          )}

          {/* Sessions */}
          <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth:'thin' }}>
            <div className="text-xs px-2 py-2 font-bold uppercase tracking-wider" style={{ color:'var(--text2)' }}>Recent Chats</div>
            {sessions.length===0
              ? <div className="text-xs text-center py-6" style={{ color:'var(--text2)' }}>No previous chats</div>
              : sessions.map(s=>(
                <button key={s.id} onClick={()=>loadSession(s)}
                  className="w-full text-left rounded-xl px-3 py-2.5 mb-1 transition-colors duration-150 border-0"
                  style={{ background:s.id===sessionId?'var(--bg3)':'transparent', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--bg3)')}
                  onMouseLeave={e=>(e.currentTarget.style.background=s.id===sessionId?'var(--bg3)':'transparent')}
                >
                  <div className="text-sm font-medium truncate" style={{ color:'var(--text)' }}>💬 {s.preview||'Chat'}</div>
                  <div className="text-xs mt-0.5" style={{ color:'var(--text2)' }}>{new Date(s.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                </button>
              ))
            }
          </div>
        </aside>

        {/* MAIN CHAT */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background:'var(--bg)', borderBottom:'1px solid var(--border)' }}>
            <button onClick={()=>setSideOpen(o=>!o)} className="btn-ghost p-2 text-lg" style={{ borderRadius:8 }}>
              {sideOpen?'◀':'▶'}
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background:'linear-gradient(135deg,var(--accent2),var(--accent))' }}>🤖</div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm" style={{ fontFamily:'Syne,sans-serif' }}>TurfBot</div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background:'var(--accent)', animation:'pulseGlow 2s infinite', boxShadow:'0 0 5px var(--accent)' }} />
                <span className="text-xs" style={{ color:'var(--text2)' }}>Groq · llama-3.3-70b · online</span>
              </div>
            </div>
            <Link href="/turfs" className="btn-secondary text-xs px-3 py-2 hidden sm:flex">🏟️ Browse</Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5" style={{ scrollbarWidth:'thin' }}>
            {messages.length===0 ? (
              <div className="text-center pt-8 animate-fade-in">
                <div className="text-6xl mb-4 animate-float" style={{ filter:'drop-shadow(0 0 25px rgba(0,255,135,0.3))' }}>🏟️</div>
                <h3 className="text-2xl font-black mb-2" style={{ fontFamily:'Syne,sans-serif' }}>Hey, {session.user.name?.split(' ')[0]}! 👋</h3>
                <p className="text-base mb-8" style={{ color:'var(--text2)' }}>Ask me about turfs, check slots, or say how many hours you want to play!</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
                  {SUGGESTIONS.map(s=>(
                    <button key={s} onClick={()=>send(s)} className="btn-secondary text-sm">{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg,i)=>(
                  <div key={i}
                    className={`flex gap-3 items-end ${msg.role==='user'?'flex-row-reverse':'flex-row'} animate-slide-in`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${msg.role==='user'?'order-last':''}`}
                      style={{ background:msg.role==='user'?'linear-gradient(135deg,var(--accent2),#9b59ff)':'linear-gradient(135deg,var(--accent2),var(--accent))' }}>
                      {msg.role==='user' ? session.user.name?.[0]?.toUpperCase() : '🤖'}
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[75%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${msg.role==='user'?'rounded-br-sm':'rounded-bl-sm'}`}
                      style={{
                        background:msg.role==='user'?'linear-gradient(135deg,var(--accent2),#5b2de0)':'var(--card)',
                        border:msg.role==='assistant'?'1px solid var(--border2)':'none',
                        boxShadow:msg.role==='assistant'?'0 4px 16px rgba(0,0,0,0.3)':'none',
                      }}>
                      {msg.role==='assistant' ? (
                        <>
                          <div className="md"><ReactMarkdown>{msg.content}</ReactMarkdown></div>

                          {/* PAY NOW BUTTON — fixed: always show when bookingId exists */}
                          {msg.bookingId && msg.bookingAmount && (
                            <div className="mt-3 pt-3" style={{ borderTop:'1px solid var(--border2)' }}>
                              <div className="text-xs mb-2" style={{ color:'var(--text2)' }}>Complete your booking:</div>
                              <PayNowButton
                                bookingId={msg.bookingId}
                                amount={msg.bookingAmount}
                                redirectToConfirmation={true}
                                onSuccess={()=>setMessages(prev=>prev.map((m,j)=>j===i?{...m,bookingId:undefined,bookingAmount:undefined}:m))}
                              />
                            </div>
                          )}

                          {/* Browse button on booking intent */}
                          {msg.showBookButton && !msg.bookingId && (
                            <div className="mt-3 pt-3 flex flex-wrap gap-2" style={{ borderTop:'1px solid var(--border2)' }}>
                              <Link href="/turfs" className="btn-secondary text-xs px-3 py-2">🏟️ Browse Turfs</Link>
                              <button onClick={()=>send('Show me available turfs and time slots')} className="btn-primary text-xs px-3 py-2">🔍 Find Slots</button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm leading-relaxed" style={{ color:'#fff' }}>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex gap-3 items-end">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background:'linear-gradient(135deg,var(--accent2),var(--accent))' }}>🤖</div>
                    <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center" style={{ background:'var(--card)', border:'1px solid var(--border2)' }}>
                      {[0,1,2].map(i=><span key={i} className="w-2 h-2 rounded-full" style={{ background:'var(--accent)', display:'inline-block', animation:`pulseGlow 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-4 pb-5 pt-3 flex-shrink-0" style={{ borderTop:'1px solid var(--border)', background:'var(--bg)' }}>
            <form onSubmit={e=>{e.preventDefault();send(input);}} className="flex gap-2 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                placeholder="Ask about turfs, slots, or 'book cricket 2 hours tomorrow'..."
                className="flex-1 text-sm"
                style={{ borderRadius:24, padding:'12px 18px', background:'var(--bg3)' }}
                disabled={loading}
              />
              <button type="submit" disabled={loading||!input.trim()}
                className="btn-primary flex-shrink-0 rounded-full flex items-center justify-center"
                style={{ width:44, height:44, padding:0, fontSize:18 }}>
                {loading
                  ? <span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin-slow" style={{ borderTopColor:'#050510', display:'inline-block' }} />
                  : '➤'}
              </button>
            </form>
            <p className="text-center text-xs mt-2" style={{ color:'var(--text2)' }}>
              TurfBot only answers turf-related questions · Powered by Groq
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
