"use client"

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TurfForm {
  name: string; description: string; location: string; address: string; city: string;
  sport: string[]; pricePerHour: number; amenities: string;
  openTime: string; closeTime: string;
  ownerId: string; ownerPhone: string; ownerEmail: string;
  isFeatured: boolean;
  // For new turf: base64 images to upload
  newImages: string[];
  // For edit: existing URLs to keep
  keepImages: string[];
}

const EMPTY_FORM: TurfForm = {
  name:'', description:'', location:'', address:'', city:'',
  sport:[], pricePerHour:500, amenities:'',
  openTime:'06:00', closeTime:'23:00',
  ownerId:'', ownerPhone:'', ownerEmail:'',
  isFeatured:false, newImages:[], keepImages:[],
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [turfs, setTurfs]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]         = useState<TurfForm>({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; hard: boolean } | null>(null);
  const [searchQ, setSearchQ]   = useState('');

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && session.user.role !== 'ADMIN') router.push('/');
  }, [status, session, router]);

  // ── Fetch turfs ────────────────────────────────────────────────────────────
  const fetchTurfs = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/turfs');
      const data = await res.json();
      if (data.success) setTurfs(data.data);
      else toast.error('Failed to load turfs: ' + data.error);
    } catch (e) {
      toast.error('Network error loading turfs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (session?.user.role === 'ADMIN') fetchTurfs(); }, [session, fetchTurfs]);

  // ── Open new form ──────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, ownerId: session?.user.id || '' });
    setShowForm(true);
  };

  // ── Open edit form ─────────────────────────────────────────────────────────
  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      name:         t.name,
      description:  t.description,
      location:     t.location,
      address:      t.address,
      city:         t.city,
      sport:        t.sport,
      pricePerHour: t.pricePerHour,
      amenities:    t.amenities.join(', '),
      openTime:     t.openTime,
      closeTime:    t.closeTime,
      ownerId:      t.ownerId,
      ownerPhone:   t.ownerPhone || '',
      ownerEmail:   t.ownerEmail || '',
      isFeatured:   t.isFeatured,
      newImages:    [],         // new uploads
      keepImages:   [...t.images], // existing URLs to keep
    });
    setShowForm(true);
  };

  // ── Image handlers ─────────────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const total = form.keepImages.length + form.newImages.length + files.length;
    if (total > 6) { toast.error('Maximum 6 images allowed'); return; }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, newImages: [...f.newImages, reader.result as string] }));
      reader.readAsDataURL(file);
    });
  };

  const removeKeepImage = (idx: number) => setForm(f => ({ ...f, keepImages: f.keepImages.filter((_, i) => i !== idx) }));
  const removeNewImage  = (idx: number) => setForm(f => ({ ...f, newImages:  f.newImages.filter((_, i)  => i !== idx) }));
  const toggleSport = (s: string) => setForm(f => ({ ...f, sport: f.sport.includes(s) ? f.sport.filter(x => x !== s) : [...f.sport, s] }));

  // ── Submit (create or update) ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.sport.length) { toast.error('Select at least one sport'); return; }
    if (!form.ownerId.trim()) { toast.error('Owner User ID is required'); return; }
    if (form.keepImages.length + form.newImages.length === 0 && !editingId)
      { toast.error('Add at least one image'); return; }

    setSaving(true);
    try {
      const amenitiesArray = form.amenities.split(',').map((a: string) => a.trim()).filter(Boolean);

      const payload: any = {
        name:         form.name,
        description:  form.description,
        location:     form.location,
        address:      form.address,
        city:         form.city,
        sport:        form.sport,
        pricePerHour: Number(form.pricePerHour),
        amenities:    amenitiesArray,
        openTime:     form.openTime,
        closeTime:    form.closeTime,
        ownerId:      form.ownerId,
        ownerPhone:   form.ownerPhone || null,
        ownerEmail:   form.ownerEmail || null,
        isFeatured:   form.isFeatured,
        newImages:    form.newImages,
        keepImages:   form.keepImages,
      };

      if (editingId) {
        // UPDATE
        payload.id = editingId;
        const res  = await fetch('/api/admin/turfs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) {
          toast.success('✅ Turf updated successfully!');
          setShowForm(false);
          setEditingId(null);
          fetchTurfs();
        } else {
          toast.error('Update failed: ' + data.error);
        }
      } else {
        // CREATE — rename newImages → images for POST endpoint
        payload.images = form.newImages;
        delete payload.newImages;
        delete payload.keepImages;
        const res  = await fetch('/api/admin/turfs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) {
          toast.success('🏟️ Turf created successfully!');
          setShowForm(false);
          fetchTurfs();
        } else {
          toast.error('Create failed: ' + data.error);
        }
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, hard: boolean) => {
    setDeletingId(id);
    try {
      const res  = await fetch(`/api/admin/turfs?id=${id}&hard=${hard}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(hard ? '🗑️ Turf permanently deleted' : '⏸️ Turf deactivated');
        setConfirmDelete(null);
        fetchTurfs();
      } else {
        toast.error(data.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (status === 'loading' || loading) return (
    <>
      <Navbar />
      <div className="min-h-[80vh] flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin-slow" style={{ borderTopColor: 'var(--accent)' }} />
      </div>
    </>
  );

  const stats = {
    total:    turfs.length,
    active:   turfs.filter(t => t.isActive).length,
    inactive: turfs.filter(t => !t.isActive).length,
    bookings: turfs.reduce((s: number, t: any) => s + (t._count?.bookings ?? 0), 0),
  };

  const filtered = turfs.filter(t =>
    !searchQ ||
    t.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    t.city.toLowerCase().includes(searchQ.toLowerCase())
  );

  const totalImages = form.keepImages.length + form.newImages.length;

  return (
    <>
      <Navbar />
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black mb-1" style={{ fontFamily: 'Syne,sans-serif' }}>⚙️ Admin Panel</h1>
              <p style={{ color: 'var(--text2)' }}>Manage all turfs on the platform</p>
            </div>
            <button onClick={openNew} className="btn-primary px-6 py-2.5 text-sm">
              + Add New Turf
            </button>
          </div>

          {/* ── Stats ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Turfs',   value: stats.total,    color: 'var(--accent2)' },
              { label: 'Active',        value: stats.active,   color: 'var(--accent)'  },
              { label: 'Inactive',      value: stats.inactive, color: 'var(--danger)'  },
              { label: 'Total Bookings', value: stats.bookings, color: 'var(--accent3)' },
            ].map(s => (
              <div key={s.label} className="card text-center p-4" style={{ border: '1px solid var(--border2)' }}>
                <div className="text-3xl font-black" style={{ color: s.color, fontFamily: 'Syne,sans-serif' }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text2)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Search ─────────────────────────────────────────── */}
          <div className="mb-4">
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="🔍 Search turfs by name or city..."
              style={{ maxWidth: 400 }}
            />
          </div>

          {/* ── Turf List ───────────────────────────────────────── */}
          <h2 className="text-lg font-bold mb-3">All Turfs ({filtered.length})</h2>
          <div className="flex flex-col gap-3">
            {filtered.length === 0 && (
              <div className="text-center py-12" style={{ color: 'var(--text2)' }}>
                {searchQ ? 'No turfs match your search.' : 'No turfs yet. Click "+ Add New Turf" to create one.'}
              </div>
            )}
            {filtered.map(t => (
              <div key={t.id} className="card flex flex-wrap gap-4 items-center p-4" style={{ border: '1px solid var(--border2)' }}>
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--bg3)' }}>
                  {t.images[0] && <img src={t.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold">{t.name}</h3>
                    {t.isFeatured && <span className="badge badge-yellow" style={{ fontSize: 9 }}>⭐ FEATURED</span>}
                    <span className={`badge ${t.isActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 9 }}>
                      {t.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                    📍 {t.city} · {t.sport.join(', ')} · Owner: {t.owner?.name || 'N/A'} · {t.images.length} photos
                  </p>
                </div>

                {/* Price + bookings */}
                <div className="text-right flex-shrink-0">
                  <div className="font-bold" style={{ color: 'var(--accent)' }}>₹{t.pricePerHour}/hr</div>
                  <div className="text-xs" style={{ color: 'var(--text2)' }}>{t._count?.bookings ?? 0} bookings</div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {/* Edit */}
                  <button
                    onClick={() => openEdit(t)}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    ✏️ Edit
                  </button>

                  {/* Toggle active/inactive */}
                  <button
                    onClick={() => setConfirmDelete({ id: t.id, name: t.name, hard: false })}
                    className="btn-secondary text-xs px-3 py-1.5"
                    style={{ color: t.isActive ? 'var(--accent3)' : 'var(--accent)' }}
                  >
                    {t.isActive ? '⏸ Deactivate' : '▶ Activate'}
                  </button>

                  {/* Permanent delete */}
                  <button
                    onClick={() => setConfirmDelete({ id: t.id, name: t.name, hard: true })}
                    className="btn-secondary text-xs px-3 py-1.5"
                    style={{ color: 'var(--danger)', borderColor: 'rgba(255,68,68,0.3)' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Delete Confirm Modal ────────────────────────────── */}
          {confirmDelete && (
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="card w-full max-w-sm text-center" style={{ border: '1px solid var(--danger)', borderRadius: 16 }}>
                <div className="text-5xl mb-4">{confirmDelete.hard ? '🗑️' : '⏸️'}</div>
                <h3 className="text-xl font-black mb-2" style={{ fontFamily: 'Syne,sans-serif' }}>
                  {confirmDelete.hard ? 'Permanently Delete?' : 'Deactivate Turf?'}
                </h3>
                <p className="text-sm mb-2" style={{ color: 'var(--text2)' }}>
                  <strong style={{ color: 'var(--text)' }}>{confirmDelete.name}</strong>
                </p>
                {confirmDelete.hard ? (
                  <p className="text-xs mb-6" style={{ color: 'var(--danger)' }}>
                    ⚠️ This will permanently delete the turf and cancel all its bookings. This cannot be undone.
                  </p>
                ) : (
                  <p className="text-xs mb-6" style={{ color: 'var(--text2)' }}>
                    The turf will be hidden from listings. You can reactivate it later.
                  </p>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                  <button
                    onClick={() => handleDelete(confirmDelete.id, confirmDelete.hard)}
                    disabled={deletingId === confirmDelete.id}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                    style={{ background: confirmDelete.hard ? 'var(--danger)' : 'var(--accent3)', color: '#fff', border: 'none', cursor: 'pointer', opacity: deletingId === confirmDelete.id ? 0.6 : 1 }}
                  >
                    {deletingId === confirmDelete.id ? '⏳ Processing...' : confirmDelete.hard ? '🗑️ Delete Forever' : '⏸ Deactivate'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Add / Edit Form Modal ───────────────────────────── */}
          {showForm && (
            <div className="fixed inset-0 flex items-start justify-center p-4 z-50 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="card w-full max-w-2xl my-6" style={{ border: '1px solid var(--border2)', borderRadius: 16 }}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black" style={{ fontFamily: 'Syne,sans-serif' }}>
                    {editingId ? '✏️ Edit Turf' : '🏟️ Add New Turf'}
                  </h2>
                  <button onClick={() => { setShowForm(false); setEditingId(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 22, cursor: 'pointer' }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                  {/* Row 1 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Turf Name *</label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Green Field Arena" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>City *</label>
                      <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Bhopal" required />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Description *</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the turf..." style={{ minHeight: 72, resize: 'vertical' }} required />
                  </div>

                  {/* Row 2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Area / Locality *</label>
                      <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="MP Nagar" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Full Address *</label>
                      <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Zone 2, Near Bus Stand" required />
                    </div>
                  </div>

                  {/* Sports */}
                  <div>
                    <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Sports *</label>
                    <div className="flex gap-5">
                      {[['CRICKET','🏏'],['FOOTBALL','⚽'],['BASKETBALL','🏀']].map(([v, ic]) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer text-sm select-none">
                          <input type="checkbox" checked={form.sport.includes(v)} onChange={() => toggleSport(v)} style={{ width: 16, height: 16 }} />
                          {ic} {v}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Price/hr (₹) *</label>
                      <input type="number" value={form.pricePerHour} onChange={e => setForm(f => ({ ...f, pricePerHour: Number(e.target.value) }))} min={1} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Open Time</label>
                      <input type="time" value={form.openTime} onChange={e => setForm(f => ({ ...f, openTime: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Close Time</label>
                      <input type="time" value={form.closeTime} onChange={e => setForm(f => ({ ...f, closeTime: e.target.value }))} />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Amenities (comma-separated)</label>
                    <input value={form.amenities} onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))} placeholder="Floodlights, Parking, Changing Room, AC" />
                  </div>

                  {/* Owner fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Owner Phone</label>
                      <input value={form.ownerPhone} onChange={e => setForm(f => ({ ...f, ownerPhone: e.target.value }))} placeholder="9876543210" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Owner Email</label>
                      <input type="email" value={form.ownerEmail} onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value }))} placeholder="owner@example.com" />
                    </div>
                  </div>

                  {/* Owner ID */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>
                      Owner User ID *{' '}
                      <span style={{ color: 'var(--text2)', fontWeight: 400, textTransform: 'none' }}>
                        (find in Prisma Studio → User table)
                      </span>
                    </label>
                    <input
                      value={form.ownerId}
                      onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}
                      placeholder={session?.user.id || 'paste-user-id-here'}
                      required
                    />
                    <button type="button" onClick={() => setForm(f => ({ ...f, ownerId: session?.user.id || '' }))}
                      className="mt-1.5 text-xs" style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      ← Use my ID ({session?.user.id?.slice(-8)})
                    </button>
                  </div>

                  {/* Featured */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" id="featured" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} style={{ width: 18, height: 18 }} />
                    <span className="text-sm">⭐ Mark as Featured (shown prominently on homepage)</span>
                  </label>

                  {/* Images */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>
                      Images ({totalImages}/6 max)
                    </label>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ cursor: 'pointer', fontSize: 13 }} />

                    {/* Existing images (edit mode) */}
                    {form.keepImages.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs mb-2" style={{ color: 'var(--text2)' }}>Current images (click ✕ to remove):</p>
                        <div className="flex gap-2 flex-wrap">
                          {form.keepImages.map((img, i) => (
                            <div key={i} className="relative rounded-xl overflow-hidden" style={{ width: 72, height: 54, border: '2px solid var(--accent2)' }}>
                              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button type="button" onClick={() => removeKeepImage(i)}
                                style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'var(--danger)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New image previews */}
                    {form.newImages.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs mb-2" style={{ color: 'var(--text2)' }}>New uploads:</p>
                        <div className="flex gap-2 flex-wrap">
                          {form.newImages.map((img, i) => (
                            <div key={i} className="relative rounded-xl overflow-hidden" style={{ width: 72, height: 54, border: '2px solid var(--accent)' }}>
                              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button type="button" onClick={() => removeNewImage(i)}
                                style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'var(--danger)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit */}
                  <div className="flex gap-3 mt-2">
                    <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 text-base">
                      {saving
                        ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin-slow" style={{ borderTopColor: '#050510', display: 'inline-block' }} /> Saving...</span>
                        : editingId ? '✅ Update Turf' : '🏟️ Create Turf'}
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-secondary px-6">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}