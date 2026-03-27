import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { createTrialSubscription } from '@/lib/subscription';
import { sendTrialStarted } from '@/lib/email';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['OWNER','ADMIN'].includes(session.user.role))
    return NextResponse.json({ success:false, error:'Unauthorized' }, { status:403 });
  const existing = await prisma.ownerSubscription.findUnique({ where:{ userId:session.user.id } });
  if (existing) return NextResponse.json({ success:false, error:'Already have a subscription' }, { status:400 });
  const sub = await createTrialSubscription(session.user.id);
  const user = await prisma.user.findUnique({ where:{ id:session.user.id } });
  if (user?.email) await sendTrialStarted(user.email, user.name||'Owner', sub.trialEndDate.toLocaleDateString('en-IN',{ day:'numeric',month:'long',year:'numeric' }));
  return NextResponse.json({ success:true, data:sub });
}
