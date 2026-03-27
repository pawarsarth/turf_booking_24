import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ success: false, error: 'date required' }, { status: 400 });

  const turf = await prisma.turf.findUnique({ where: { id: params.id } });
  if (!turf) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const d = new Date(date);
  const booked = await prisma.timeSlot.findMany({ where: { turfId: params.id, date: d, isBooked: true }, select: { startTime: true } });
  const bookedSet = new Set(booked.map(s => s.startTime));

  const [oh] = turf.openTime.split(':').map(Number);
  const [ch] = turf.closeTime.split(':').map(Number);
  const slots = [];
  for (let h = oh; h < ch; h++) {
    const st = `${String(h).padStart(2,'0')}:00`;
    const et = `${String(h+1).padStart(2,'0')}:00`;
    slots.push({ startTime: st, endTime: et, isBooked: bookedSet.has(st) });
  }
  return NextResponse.json({ success: true, data: slots });
}
