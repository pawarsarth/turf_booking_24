import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { verifySignature } from '@/lib/razorpay';
import { prisma } from '@/lib/prisma';
import { sendSubscriptionConfirmed } from '@/lib/email';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature))
    return NextResponse.json({ success:false, error:'Invalid signature' }, { status:400 });
  const now = new Date(); const end = new Date(now); end.setMonth(end.getMonth()+1);
  const sub = await prisma.ownerSubscription.update({ where:{ userId:session.user.id }, data:{ status:'ACTIVE', razorpayPaymentId:razorpay_payment_id, currentPeriodStart:now, currentPeriodEnd:end } });
  await prisma.subscriptionPayment.create({ data:{ subscriptionId:sub.id, razorpayOrderId:razorpay_order_id, razorpayPaymentId:razorpay_payment_id, amount:300, status:'PAID', periodStart:now, periodEnd:end } });
  await prisma.turf.updateMany({ where:{ ownerId:session.user.id }, data:{ isActive:true } });
  const user = await prisma.user.findUnique({ where:{ id:session.user.id } });
  if (user?.email) await sendSubscriptionConfirmed(user.email, user.name||'Owner', end.toLocaleDateString('en-IN',{ day:'numeric',month:'long',year:'numeric' }));
  return NextResponse.json({ success:true, data:sub });
}
