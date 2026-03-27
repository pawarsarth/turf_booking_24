import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { verifySignature } from '@/lib/razorpay';
import { to12h } from '@/lib/timeUtils';
import { sendBookingConfirmation, sendOwnerBookingAlert } from '@/lib/email';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 });

  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature))
    return NextResponse.json({ success:false, error:'Invalid payment signature' }, { status:400 });

  const booking = await prisma.booking.findUnique({
    where: { id:bookingId },
    include: {
      turf: true,
      user: { select:{ name:true, email:true, phone:true } },
    }
  });
  if (!booking) return NextResponse.json({ success:false, error:'Booking not found' }, { status:404 });

  // Verify the booking belongs to the user
  if (booking.userId !== session.user.id)
    return NextResponse.json({ success:false, error:'Forbidden' }, { status:403 });

  // Update booking and slot atomically
  const [updated] = await prisma.$transaction([
    prisma.booking.update({ where:{ id:bookingId }, data:{ paymentId:razorpay_payment_id, paymentStatus:'PAID', status:'CONFIRMED', ownerRevealed:true } }),
    prisma.timeSlot.update({ where:{ id:booking.slotId }, data:{ isBooked:true } }),
  ]);

  // Update coupon usage if applied
  if (booking.couponId) {
    await prisma.coupon.update({ where:{ id:booking.couponId }, data:{ usedCount:{ increment:1 } } });
  }

  const dateStr  = new Date(booking.date).toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const start12  = to12h(booking.startTime);
  const end12    = to12h(booking.endTime);
  const hours    = parseInt(booking.endTime)-parseInt(booking.startTime);

  // Send confirmation email to USER
  if (booking.user.email) {
    await sendBookingConfirmation({
      userEmail:   booking.user.email,
      userName:    booking.user.name||'User',
      turfName:    booking.turf.name,
      city:        booking.turf.city,
      date:        dateStr,
      startTime:   start12,
      endTime:     end12,
      hours,
      totalPrice:  booking.totalPrice,
      bookingId,
      ownerPhone:  booking.turf.ownerPhone||undefined,
      ownerEmail:  booking.turf.ownerEmail||undefined,
    });
  }

  // Send alert to OWNER
  if (booking.turf.ownerEmail) {
    const owner = await prisma.user.findUnique({ where:{ id:booking.turf.ownerId }, select:{ name:true } });
    await sendOwnerBookingAlert({
      ownerEmail:    booking.turf.ownerEmail,
      ownerName:     owner?.name||'Owner',
      turfName:      booking.turf.name,
      customerName:  booking.user.name||'Customer',
      customerEmail: booking.user.email||'',
      customerPhone: booking.user.phone||undefined,
      date: dateStr, startTime:start12, endTime:end12, hours, totalPrice:booking.totalPrice, bookingId,
    });
  }

  return NextResponse.json({ success:true, data:{ ...updated, turf:booking.turf, user:booking.user } });
}
