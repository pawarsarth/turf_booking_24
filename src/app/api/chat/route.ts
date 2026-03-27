import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { runAgent, ChatMessage } from '@/lib/agent';
import { prisma } from '@/lib/prisma';
import { hasTokenQuota, deductTokens } from '@/lib/tokens';
import { v4 as uuidv4 } from 'uuid';

const BOOK_KEYWORDS = ['book','play','slot','availability','available','reserve','schedule','timing','when','date','hour'];

function detectBookingIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return BOOK_KEYWORDS.some(kw => lower.includes(kw));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please login to use the AI assistant.', code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const userId = session.user.id;
    const { messages, sessionId = uuidv4() } = await req.json();

    const quota = await hasTokenQuota(userId);
    if (!quota.allowed) {
      return NextResponse.json({
        success: false,
        error: `Monthly AI limit reached. You have used all ${quota.limit.toLocaleString()} tokens. Resets on the 1st of next month.`,
        code: 'TOKEN_LIMIT_EXCEEDED',
        quota: { used: quota.limit, limit: quota.limit, remaining: 0 },
      }, { status: 429 });
    }

    const lastMsg = messages[messages.length - 1];
    await prisma.chatMessage.create({ data: { sessionId, userId, role: 'USER', content: lastMsg.content } });

    const result = await runAgent(messages as ChatMessage[], userId);
    const tokensUsed = await deductTokens(userId, lastMsg.content, result.reply);

    await prisma.chatMessage.create({ data: { sessionId, userId, role: 'ASSISTANT', content: result.reply, tokensUsed } });

    const showBookButton = detectBookingIntent(lastMsg.content) || detectBookingIntent(result.reply);

    // Extract booking info
    let bookingId: string | undefined;
    let bookingAmount: number | undefined;
    const idMatch  = result.reply.match(/"bookingId"\s*:\s*"([^"]+)"/);
    const amtMatch = result.reply.match(/"totalPrice"\s*:\s*(\d+(?:\.\d+)?)/);
    if (idMatch)  bookingId     = idMatch[1];
    if (amtMatch) bookingAmount = parseFloat(amtMatch[1]);

    const remaining = quota.remaining - result.totalTokens;

    return NextResponse.json({
      success: true,
      data: {
        reply: result.reply,
        sessionId,
        bookingId,
        bookingAmount,
        showBookButton,
        tokens: { used: result.totalTokens, remaining: Math.max(0, remaining), limit: quota.limit },
      },
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ success: false, error: 'AI error. Please try again.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '60');

  const messages = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { role: true, content: true, createdAt: true, sessionId: true },
  });

  // Group by session for sidebar
  const sessions: Record<string, { id: string; preview: string; date: string; messages: typeof messages }> = {};
  messages.forEach(m => {
    if (!sessions[m.sessionId]) {
      sessions[m.sessionId] = { id: m.sessionId, preview: m.content.slice(0,50), date: m.createdAt.toISOString(), messages: [] };
    }
    sessions[m.sessionId].messages.push(m);
  });

  return NextResponse.json({ success: true, data: { messages, sessions: Object.values(sessions).slice(-20) } });
}
