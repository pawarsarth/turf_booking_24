import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🏟️</div>
      <h1 style={{ fontSize: 48, marginBottom: 8, color: 'var(--accent)' }}>404</h1>
      <p style={{ fontSize: 20, marginBottom: 8 }}>Page not found</p>
      <p style={{ color: 'var(--text2)', marginBottom: 32 }}>This turf doesn&apos;t exist.</p>
      <Link href="/" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: 16 }}>Go Home</Link>
    </div>
  );
}
