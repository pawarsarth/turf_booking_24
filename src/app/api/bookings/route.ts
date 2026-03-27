import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 });
  const bookings = await prisma.booking.findMany({
    where:{ userId:session.user.id },
    include:{ turf:{ select:{ name:true, city:true, location:true, images:true, ownerPhone:true, ownerEmail:true } }, slot:true },
    orderBy:{ createdAt:'desc' },
  });
  const enriched = bookings.map(b=>({ ...b, ownerContact:(b.ownerRevealed||b.paymentStatus==='PAID'||b.status==='CONFIRMED')?{ ownerPhone:(b.turf as any).ownerPhone, ownerEmail:(b.turf as any).ownerEmail }:null }));
  return NextResponse.json({ success:true, data:enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 });

  const { turfId, date, startTime, endTime, couponCode } = await req.json();
  if (!turfId||!date||!startTime||!endTime)
    return NextResponse.json({ success:false, error:'Missing required fields' }, { status:400 });

  const turf = await prisma.turf.findUnique({ where:{ id:turfId } });
  if (!turf) return NextResponse.json({ success:false, error:'Turf not found' }, { status:404 });

  const d      = new Date(date);
  const startH = parseInt(startTime.split(':')[0]);
  const endH   = parseInt(endTime.split(':')[0]);
  const hours  = endH - startH;
  if (hours < 1 || hours > 6) return NextResponse.json({ success:false, error:'Invalid time range' }, { status:400 });

  const subTimes: string[] = [];
  for(let h=startH; h<endH; h++) subTimes.push(`${String(h).padStart(2,'0')}:00`);

  // Validate coupon if provided
  let couponId: string|undefined;
  let discountAmount = 0;
  const originalPrice = turf.pricePerHour * hours;
  let totalPrice = originalPrice;

  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where:{ code:couponCode.toUpperCase() } });
    if (coupon && coupon.isActive && coupon.turfId===turfId && coupon.usedCount<coupon.maxUses && new Date()<coupon.validUntil && hours>=coupon.minBookingHours) {
      discountAmount = coupon.discountType==='PERCENTAGE' ? Math.round(originalPrice*coupon.discountValue/100) : coupon.discountValue;
      totalPrice = Math.max(0, originalPrice-discountAmount);
      couponId = coupon.id;
    }
  }

  try {
    // Use transaction to prevent double-booking race condition
    const result = await prisma.$transaction(async (tx) => {
      // Lock-check: find any conflicting booked slots
      const conflicts = await tx.timeSlot.findMany({
        where:{ turfId, date:d, startTime:{ in:subTimes }, isBooked:true }
      });
      if (conflicts.length > 0) throw new Error('SLOT_TAKEN');

      // Create slot records
      const slots = await Promise.all(
        subTimes.map((st, i) => tx.timeSlot.create({
          data:{ turfId, date:d, startTime:st, endTime:`${String(parseInt(st)+1).padStart(2,'0')}:00`, isBooked:false }
        }))
      );

      const booking = await tx.booking.create({
        data:{
          userId:session.user.id, turfId, slotId:slots[0].id,
          date:d, startTime, endTime, hours,
          originalPrice, discountAmount, totalPrice,
          status:'PENDING', paymentStatus:'UNPAID',
          couponId: couponId||null,
        }
      });
      return { booking, totalPrice, turfName:turf.name };
    });

    return NextResponse.json({ success:true, data:{ bookingId:result.booking.id, totalPrice:result.totalPrice, turfName:result.turfName, discountAmount } }, { status:201 });
  } catch(err: any) {
    if (err.message==='SLOT_TAKEN') return NextResponse.json({ success:false, error:'This slot was just booked by someone else. Please choose another time.' }, { status:409 });
    console.error('Booking error:', err);
    return NextResponse.json({ success:false, error:'Booking failed. Please try again.' }, { status:500 });
  }
}
