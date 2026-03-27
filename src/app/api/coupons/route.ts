import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['OWNER','ADMIN'].includes(session.user.role))
    return NextResponse.json({ success:false, error:'Unauthorized' }, { status:403 });
  const coupons = await prisma.coupon.findMany({
    where: session.user.role==='ADMIN' ? {} : { turf:{ ownerId:session.user.id } },
    include:{ turf:{ select:{ name:true } } }, orderBy:{ createdAt:'desc' }
  });
  return NextResponse.json({ success:true, data:coupons });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['OWNER','ADMIN'].includes(session.user.role))
    return NextResponse.json({ success:false, error:'Unauthorized' }, { status:403 });
  const body = await req.json();
  const { turfId, code, discountType, discountValue, maxUses, minBookingHours, validUntil } = body;
  if (!turfId||!code||!discountValue||!validUntil)
    return NextResponse.json({ success:false, error:'Missing fields' }, { status:400 });
  const turf = await prisma.turf.findUnique({ where:{ id:turfId } });
  if (!turf || (session.user.role==='OWNER' && turf.ownerId!==session.user.id))
    return NextResponse.json({ success:false, error:'Unauthorized for this turf' }, { status:403 });
  const existing = await prisma.coupon.findUnique({ where:{ code:code.toUpperCase() } });
  if (existing) return NextResponse.json({ success:false, error:'Coupon code already exists' }, { status:409 });
  const coupon = await prisma.coupon.create({ data:{ turfId, code:code.toUpperCase(), discountType:discountType||'PERCENTAGE', discountValue:Number(discountValue), maxUses:Number(maxUses)||100, minBookingHours:Number(minBookingHours)||1, validUntil:new Date(validUntil) } });
  return NextResponse.json({ success:true, data:coupon }, { status:201 });
}
