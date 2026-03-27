import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sport    = searchParams.get('sport');
    const city     = searchParams.get('city');
    const maxPrice = searchParams.get('maxPrice');

    const where: Record<string, unknown> = { isActive: true };
    if (sport)    where.sport        = { has: sport };
    if (city)     where.city         = { contains: city, mode: 'insensitive' };
    if (maxPrice) where.pricePerHour = { lte: parseFloat(maxPrice) };

    const turfs = await prisma.turf.findMany({ where, include: { owner: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: turfs });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
