import { prisma } from './prisma';

export const MONTHLY_LIMIT_DEFAULT = 10000;

/** Check if user needs a monthly reset (lazy reset on request) */
export async function checkAndResetTokens(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokensUsed: true, monthlyLimit: true, lastResetDate: true },
  });
  if (!user) return null;

  const now = new Date();
  const lastReset = new Date(user.lastResetDate);
  const monthDiff =
    (now.getFullYear() - lastReset.getFullYear()) * 12 +
    (now.getMonth() - lastReset.getMonth());

  if (monthDiff >= 1) {
    // Reset tokens for new month
    return prisma.user.update({
      where: { id: userId },
      data: { tokensUsed: 0, lastResetDate: now },
      select: { tokensUsed: true, monthlyLimit: true, lastResetDate: true },
    });
  }
  return user;
}

/** Check if user has enough tokens before AI call */
export async function hasTokenQuota(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const user = await checkAndResetTokens(userId);
  if (!user) return { allowed: false, remaining: 0, limit: 0 };

  const remaining = user.monthlyLimit - user.tokensUsed;
  return {
    allowed: remaining > 0,
    remaining,
    limit: user.monthlyLimit,
  };
}

/** Estimate token count (rough: 1 token ≈ 4 chars) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Deduct tokens after AI call */
export async function deductTokens(userId: string, inputText: string, outputText: string): Promise<number> {
  const used = estimateTokens(inputText) + estimateTokens(outputText);
  await prisma.user.update({
    where: { id: userId },
    data: { tokensUsed: { increment: used } },
  });
  return used;
}

/** Get user token status */
export async function getTokenStatus(userId: string) {
  const user = await checkAndResetTokens(userId);
  if (!user) return null;
  return {
    used: user.tokensUsed,
    limit: user.monthlyLimit,
    remaining: user.monthlyLimit - user.tokensUsed,
    percentage: Math.round((user.tokensUsed / user.monthlyLimit) * 100),
  };
}
