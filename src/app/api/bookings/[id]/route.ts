import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 });
  const booking = await prisma.booking.findUnique({
    where: { id:params.id },
    include: {
      turf: { select:{ name:true, city:true, location:true, address:true, images:true, sport:true, ownerPhone:true, ownerEmail:true } },
      user: { select:{ name:true, email:true, phone:true } },
      slot: true,
    }
  });
  if (!booking || booking.userId !== session.user.id)
    return NextResponse.json({ success:false, error:'Not found' }, { status:404 });
  return NextResponse.json({ success:true, data:booking });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 });
  const booking = await prisma.booking.findUnique({ where:{ id:params.id } });
  if (!booking) return NextResponse.json({ success:false, error:'Not found' }, { status:404 });
  if (booking.userId !== session.user.id && session.user.role !== 'ADMIN')
    return NextResponse.json({ success:false, error:'Forbidden' }, { status:403 });
  const { action } = await req.json();
  const status = action==='cancel'?'CANCELLED':'COMPLETED';
  const updated = await prisma.booking.update({ where:{ id:params.id }, data:{ status } });
  if (status==='CANCELLED')
    await prisma.timeSlot.update({ where:{ id:booking.slotId }, data:{ isBooked:false } });
  return NextResponse.json({ success:true, data:updated });
}
