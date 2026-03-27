import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['OWNER', 'ADMIN'].includes(session.user.role))
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });

  const bookings = await prisma.booking.findMany({
    where: { turf: { ownerId: session.user.id } },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      turf: { select: { name: true, city: true } },
      slot: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    pending:   bookings.filter(b => b.status === 'PENDING').length,
    revenue:   bookings.filter(b => b.paymentStatus === 'PAID').reduce((s, b) => s + b.totalPrice, 0),
  };

  return NextResponse.json({ success: true, data: { bookings, stats } });
}
