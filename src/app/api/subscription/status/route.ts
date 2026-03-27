import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getSubscriptionStatus, checkAndNotifyExpiry } from '@/lib/subscription';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 });
  await checkAndNotifyExpiry(session.user.id);
  const status = await getSubscriptionStatus(session.user.id);
  return NextResponse.json({ success:true, data:status });
}
