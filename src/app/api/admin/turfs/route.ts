// src/app/api/admin/turfs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });

  const turfs = await prisma.turf.findMany({
    include: { owner: { select: { name: true, email: true } }, _count: { select: { bookings: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ success: true, data: turfs });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });

  const body = await req.json();
  const { images, ...data } = body;

  if (!data.name || !data.city || !data.description || !data.location || !data.address || !data.ownerId)
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });

  const uploadedImages: string[] = [];
  if (images?.length) {
    for (const img of (images as string[]).slice(0, 6)) {
      try {
        uploadedImages.push(img.startsWith('http') ? img : await uploadImage(img));
      } catch (e) { console.error('Upload error:', e); }
    }
  }

  const turf = await prisma.turf.create({ data: { ...data, images: uploadedImages } });
  return NextResponse.json({ success: true, data: turf }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });

  const body = await req.json();
  const { id, newImages, keepImages, ...updates } = body;

  if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

  const finalImages: string[] = [...(keepImages || [])];
  if (newImages?.length) {
    for (const img of (newImages as string[]).slice(0, 6 - finalImages.length)) {
      try { finalImages.push(await uploadImage(img)); } catch (e) { console.error(e); }
    }
  }
  if (finalImages.length > 0) updates.images = finalImages;

  const turf = await prisma.turf.update({ where: { id }, data: updates });
  return NextResponse.json({ success: true, data: turf });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id   = searchParams.get('id');
  const hard = searchParams.get('hard') === 'true';

  if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

  if (hard) {
    await prisma.booking.updateMany({ where: { turfId: id }, data: { status: 'CANCELLED' } });
    await prisma.turf.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Turf permanently deleted' });
  }

  await prisma.turf.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true, message: 'Turf deactivated' });
}