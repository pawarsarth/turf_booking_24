import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createOrder } from '@/lib/razorpay';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['OWNER','ADMIN'].includes(session.user.role))
    return NextResponse.json({ success:false, error:'Unauthorized' }, { status:403 });
  const order = await createOrder(300, `sub_${session.user.id}_${Date.now()}`);
  await prisma.ownerSubscription.upsert({ where:{ userId:session.user.id }, update:{ razorpayOrderId:order.id }, create:{ userId:session.user.id, razorpayOrderId:order.id, status:'EXPIRED', trialEndDate:new Date() } });
  return NextResponse.json({ success:true, data:{ orderId:order.id, amount:300, currency:'INR' } });
}
