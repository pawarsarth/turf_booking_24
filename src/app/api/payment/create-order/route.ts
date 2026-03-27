import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { createOrder } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { bookingId } = await req.json();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { turf: { select: { name: true } } } });
  if (!booking)            return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
  if (booking.userId !== session.user.id) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  if (booking.paymentStatus === 'PAID')   return NextResponse.json({ success: false, error: 'Already paid' }, { status: 400 });

  const order = await createOrder(booking.totalPrice, `booking_${bookingId}`);
  await prisma.booking.update({ where: { id: bookingId }, data: { paymentOrderId: order.id } });

  return NextResponse.json({ success: true, data: { orderId: order.id, amount: booking.totalPrice, currency: 'INR', bookingId, turfName: booking.turf.name } });
}
