import { prisma } from './prisma';
import { sendTrialExpiringSoon, sendSubscriptionExpired } from './email';

export const SUBSCRIPTION_PRICE = 300; // ₹300/month
export const TRIAL_DAYS = 30;

export async function createTrialSubscription(userId: string) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  return prisma.ownerSubscription.create({
    data: { userId, status: 'TRIAL', trialStartDate: new Date(), trialEndDate: trialEnd },
  });
}

export async function getSubscriptionStatus(userId: string) {
  const sub = await prisma.ownerSubscription.findUnique({ where: { userId } });
  if (!sub) return { status: 'NONE', canListTurfs: false, daysLeft: 0 };

  const now = new Date();

  if (sub.status === 'TRIAL') {
    const daysLeft = Math.ceil((sub.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
      await prisma.ownerSubscription.update({ where: { userId }, data: { status: 'EXPIRED' } });
      return { status: 'EXPIRED', canListTurfs: false, daysLeft: 0, sub };
    }
    return { status: 'TRIAL', canListTurfs: true, daysLeft, trialEndDate: sub.trialEndDate, sub };
  }

  if (sub.status === 'ACTIVE' && sub.currentPeriodEnd) {
    const daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
      await prisma.ownerSubscription.update({ where: { userId }, data: { status: 'EXPIRED' } });
      return { status: 'EXPIRED', canListTurfs: false, daysLeft: 0, sub };
    }
    return { status: 'ACTIVE', canListTurfs: true, daysLeft, periodEnd: sub.currentPeriodEnd, sub };
  }

  return { status: sub.status, canListTurfs: false, daysLeft: 0, sub };
}

// Check and send expiry warnings (call from cron or on each owner login)
export async function checkAndNotifyExpiry(userId: string) {
  const sub = await prisma.ownerSubscription.findUnique({ where: { userId }, include: { user: true } });
  if (!sub || !sub.user.email) return;

  const now = new Date();
  const endDate = sub.status === 'TRIAL' ? sub.trialEndDate : sub.currentPeriodEnd;
  if (!endDate) return;

  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if ((daysLeft === 7 || daysLeft === 3 || daysLeft === 1) && sub.status !== 'EXPIRED') {
    await sendTrialExpiringSoon(
      sub.user.email, sub.user.name || 'Owner',
      daysLeft, endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    );
  }

  if (daysLeft <= 0 && sub.status !== 'EXPIRED') {
    await prisma.ownerSubscription.update({ where: { userId }, data: { status: 'EXPIRED' } });
    await prisma.turf.updateMany({ where: { ownerId: userId }, data: { isActive: false } });
    await sendSubscriptionExpired(sub.user.email, sub.user.name || 'Owner');
  }
}
