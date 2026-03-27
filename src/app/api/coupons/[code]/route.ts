import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { searchParams } = new URL(req.url);
  const turfId = searchParams.get('turfId');
  const hours  = parseInt(searchParams.get('hours')||'1');
  const coupon = await prisma.coupon.findUnique({ where:{ code:params.code.toUpperCase() }, include:{ turf:{ select:{ name:true, pricePerHour:true } } } });
  if (!coupon||!coupon.isActive) return NextResponse.json({ success:false, error:'Invalid coupon code' }, { status:404 });
  if (turfId && coupon.turfId!==turfId) return NextResponse.json({ success:false, error:'Coupon not valid for this turf' }, { status:400 });
  if (coupon.usedCount>=coupon.maxUses) return NextResponse.json({ success:false, error:'Coupon limit reached' }, { status:400 });
  if (new Date()>coupon.validUntil) return NextResponse.json({ success:false, error:'Coupon expired' }, { status:400 });
  if (hours<coupon.minBookingHours) return NextResponse.json({ success:false, error:`Minimum ${coupon.minBookingHours} hour(s) required for this coupon` }, { status:400 });
  const originalPrice = (coupon.turf?.pricePerHour||0) * hours;
  const discount = coupon.discountType==='PERCENTAGE' ? (originalPrice*coupon.discountValue/100) : coupon.discountValue;
  const finalPrice = Math.max(0, originalPrice-discount);
  return NextResponse.json({ success:true, data:{ coupon, discount:Math.round(discount), finalPrice:Math.round(finalPrice), originalPrice } });
}

export async function DELETE(req: NextRequest, { params }: { params: { code: string } }) {
  const session = await getServerSession(authOptions);
  if (!session||!['OWNER','ADMIN'].includes(session.user.role))
    return NextResponse.json({ success:false, error:'Unauthorized' }, { status:403 });
  const coupon = await prisma.coupon.findUnique({ where:{ code:params.code.toUpperCase() } });
  if (!coupon) return NextResponse.json({ success:false, error:'Not found' }, { status:404 });
  await prisma.coupon.update({ where:{ id:coupon.id }, data:{ isActive:false } });
  return NextResponse.json({ success:true });
}
