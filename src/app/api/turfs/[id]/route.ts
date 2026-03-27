import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const turf = await prisma.turf.findUnique({ where: { id: params.id }, include: { owner: { select: { name: true, phone: true } } } });
  if (!turf) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: turf });
}
