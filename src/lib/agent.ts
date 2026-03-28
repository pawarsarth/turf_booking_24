// src/lib/agent.ts
import Groq from 'groq-sdk';
import { prisma } from './prisma';
import { to12h, hoursInRange } from './timeUtils';
import { BookingStatus } from '@prisma/client';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MAX_HISTORY = 10;

const tools: any[] = [
  { type:'function', function:{ name:'search_turfs', description:'Search available turfs by sport, city, max price per hour', parameters:{ type:'object', properties:{ sport:{type:'string',enum:['FOOTBALL','CRICKET','BASKETBALL']}, city:{type:'string',description:'City name'}, maxPrice:{type:'number',description:'Max price per hour in INR'} } } } },
  { type:'function', function:{ name:'get_turf_details', description:'Get full turf details and available time slots for a specific date', parameters:{ type:'object', properties:{ turfId:{type:'string'}, date:{type:'string',description:'YYYY-MM-DD'} }, required:['turfId'] } } },
  { type:'function', function:{ name:'check_slot_availability', description:'Check if consecutive hours are available starting from a time', parameters:{ type:'object', properties:{ turfId:{type:'string'}, date:{type:'string',description:'YYYY-MM-DD'}, startTime:{type:'string',description:'24h format HH:MM e.g. 13:00'}, hours:{type:'number',description:'Number of hours to book 1 2 or 3'} }, required:['turfId','date','startTime','hours'] } } },
  { type:'function', function:{ name:'get_my_bookings', description:"Get the logged-in user's booking history", parameters:{ type:'object', properties:{ userId:{type:'string'}, status:{type:'string',enum:['PENDING','CONFIRMED','CANCELLED','COMPLETED']} }, required:['userId'] } } },
  { type:'function', function:{ name:'initiate_booking', description:'Create a PENDING booking that requires Razorpay payment to confirm. Always call check_slot_availability first.', parameters:{ type:'object', properties:{ userId:{type:'string'}, turfId:{type:'string'}, date:{type:'string',description:'YYYY-MM-DD'}, startTime:{type:'string',description:'24h HH:MM'}, hours:{type:'number',description:'Duration in hours'} }, required:['userId','turfId','date','startTime','hours'] } } },
  { type:'function', function:{ name:'get_faqs', description:'Get platform FAQs about rules, cancellation, payment policies', parameters:{ type:'object', properties:{} } } },
];

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'search_turfs': {
        const where: Record<string, unknown> = { isActive: true };
        if (args.sport)    where.sport        = { has: args.sport };
        if (args.city)     where.city         = { contains: args.city as string, mode: 'insensitive' };
        if (args.maxPrice) where.pricePerHour = { lte: args.maxPrice };
        const turfs = await prisma.turf.findMany({ where: where as any, take: 6 });
        if (!turfs.length) return 'No turfs found matching those criteria.';
        return JSON.stringify(turfs.map(t => ({
          id: t.id, name: t.name, city: t.city, location: t.location,
          sport: t.sport, pricePerHour: t.pricePerHour,
          amenities: t.amenities.slice(0, 4), image: t.images[0] ?? null,
          openTime: to12h(t.openTime), closeTime: to12h(t.closeTime),
        })));
      }

      case 'get_turf_details': {
        const turf = await prisma.turf.findUnique({ where: { id: args.turfId as string } });
        if (!turf) return 'Turf not found.';
        let slots: unknown[] = [];
        if (args.date) {
          const date   = new Date(args.date as string);
          const booked = await prisma.timeSlot.findMany({ where: { turfId: turf.id, date, isBooked: true }, select: { startTime: true } });
          const bookedSet = new Set(booked.map(s => s.startTime));
          const [oh] = turf.openTime.split(':').map(Number);
          const [ch] = turf.closeTime.split(':').map(Number);
          for (let h = oh; h < ch; h++) {
            const st = `${String(h).padStart(2, '0')}:00`;
            slots.push({ time24: st, display: to12h(st), isBooked: bookedSet.has(st) });
          }
        }
        return JSON.stringify({
          id: turf.id, name: turf.name, description: turf.description,
          location: turf.location, city: turf.city, sport: turf.sport,
          pricePerHour: turf.pricePerHour, amenities: turf.amenities,
          openTime: to12h(turf.openTime), closeTime: to12h(turf.closeTime),
          availableSlots: slots,
        });
      }

      case 'check_slot_availability': {
        const date  = new Date(args.date as string);
        const hours = Number(args.hours) || 1;
        const turf  = await prisma.turf.findUnique({ where: { id: args.turfId as string }, select: { pricePerHour: true, name: true } });
        if (!turf) return 'Turf not found.';
        const subSlots = hoursInRange(args.startTime as string, hours);
        const booked   = await prisma.timeSlot.findMany({ where: { turfId: args.turfId as string, date, startTime: { in: subSlots }, isBooked: true } });
        const endH     = parseInt((args.startTime as string).split(':')[0]) + hours;
        const endTime  = `${String(endH).padStart(2, '0')}:00`;
        return JSON.stringify({
          available:    booked.length === 0,
          turfName:     turf.name,
          startDisplay: to12h(args.startTime as string),
          endDisplay:   to12h(endTime),
          hours,
          totalPrice:   turf.pricePerHour * hours,
          pricePerHour: turf.pricePerHour,
        });
      }

      case 'get_my_bookings': {
        // ✅ FIX: cast status to BookingStatus enum so Prisma is happy
        const statusValue = args.status
          ? (args.status as string) as BookingStatus
          : undefined;

        const bookings = await prisma.booking.findMany({
          where: {
            userId: args.userId as string,
            ...(statusValue && { status: statusValue }),
          },
          include: { turf: { select: { name: true, city: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        if (!bookings.length) return 'No bookings found.';
        return JSON.stringify(bookings.map(b => ({
          id:            b.id,
          turf:          b.turf.name,
          city:          b.turf.city,
          date:          b.date.toISOString().split('T')[0],
          startTime:     to12h(b.startTime),
          endTime:       to12h(b.endTime),
          totalPrice:    b.totalPrice,
          status:        b.status,
          paymentStatus: b.paymentStatus,
        })));
      }

      case 'initiate_booking': {
        const date  = new Date(args.date as string);
        const hours = Number(args.hours) || 1;
        const turf  = await prisma.turf.findUnique({ where: { id: args.turfId as string }, select: { pricePerHour: true, name: true, ownerId: true } });
        if (!turf) return 'Turf not found.';

        const subSlots  = hoursInRange(args.startTime as string, hours);
        const conflicts = await prisma.timeSlot.findMany({ where: { turfId: args.turfId as string, date, startTime: { in: subSlots }, isBooked: true } });
        if (conflicts.length) return JSON.stringify({ error: 'Some slots in this range are already booked. Please choose a different time.' });

        const endH       = parseInt((args.startTime as string).split(':')[0]) + hours;
        const endTime    = `${String(endH).padStart(2, '0')}:00`;
        const totalPrice = turf.pricePerHour * hours;

        const slotRecs = await Promise.all(
          subSlots.map(st => prisma.timeSlot.create({
            data: { turfId: args.turfId as string, date, startTime: st, endTime: `${String(parseInt(st.split(':')[0]) + 1).padStart(2, '0')}:00`, isBooked: false },
          }))
        );

        const booking = await prisma.booking.create({
          data: {
            userId:       args.userId as string,
            turfId:       args.turfId as string,
            slotId:       slotRecs[0].id,
            date,
            startTime:    args.startTime as string,
            endTime,
            hours,
            originalPrice: totalPrice,
            discountAmount: 0,
            totalPrice,
            status:       'PENDING',
            paymentStatus: 'UNPAID',
          },
        });

        console.log(`[BOOKING CREATED] ID:${booking.id} Turf:${turf.name} ${to12h(args.startTime as string)}-${to12h(endTime)} ${hours}hr ₹${totalPrice}`);

        return JSON.stringify({
          bookingId:    booking.id,
          turfName:     turf.name,
          date:         args.date,
          startDisplay: to12h(args.startTime as string),
          endDisplay:   to12h(endTime),
          hours,
          totalPrice,
          pricePerHour: turf.pricePerHour,
          paymentRequired: true,
        });
      }

      case 'get_faqs':
        return JSON.stringify({
          cancellation: 'Free cancellation 24h before slot. No refund within 24h.',
          payment:      'UPI, cards, netbanking via Razorpay. Full payment required to confirm booking.',
          rules:        'Sports shoes mandatory. No alcohol. Max 15 players per slot.',
          slots:        'Book 1, 2, or 3 hour blocks. Just tell me how many hours you want.',
          contact:      'support@turfbook.com',
        });

      default:
        return 'Unknown tool.';
    }
  } catch (err) {
    console.error('Tool error:', err);
    return `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string; }
export interface AgentResult  { reply: string; inputTokens: number; outputTokens: number; totalTokens: number; }

export async function runAgent(messages: ChatMessage[], userId?: string): Promise<AgentResult> {
  const trimmed = messages.slice(-MAX_HISTORY);

  const systemPrompt = `You are TurfBot 🏟️ — the AI assistant for TurfBook, a sports turf booking platform.

ONLY answer questions related to:
- Finding, browsing, and booking sports turfs
- Checking slot availability and pricing
- Cricket 🏏, Football ⚽, Basketball 🏀
- User's own bookings and booking status
- Platform FAQs (cancellation, payments, rules)

REFUSE all other topics politely. If asked anything unrelated (coding, general knowledge, politics, etc.) respond:
"I'm TurfBot — I can only help with turf bookings! Ask me about available turfs, slot times, or booking. 🏟️"

${userId ? `✅ Logged-in user ID: ${userId}` : '⚠️ User not logged in. Remind them to login before booking.'}
Today's date: ${new Date().toISOString().split('T')[0]}

RULES:
- Always show times in 12-hour format: "1 PM", "6 AM" — NEVER "13:00"
- Ask how many hours (1, 2 or 3) if not specified
- ALWAYS call check_slot_availability before initiate_booking
- After booking created: say "Click the **Pay Now** button below to confirm"
- Total price = pricePerHour × hours (e.g. 2hr @ ₹800 = ₹1600)
- Never reveal owner contact before payment
- Use markdown for formatting`;

  const msgs: any[] = [
    { role: 'system', content: systemPrompt },
    ...trimmed.map(m => ({ role: m.role, content: m.content })),
  ];

  let inputTokens = Math.ceil(msgs.map(m => typeof m.content === 'string' ? m.content : '').join(' ').length / 4);

  for (let i = 0; i < 8; i++) {
    const res = await groq.chat.completions.create({
      model:        'llama-3.3-70b-versatile',
      messages:     msgs,
      tools,
      tool_choice:  'auto' as any,
      max_tokens:   1400,
      temperature:  0.5,
    });

    const choice = res.choices[0];
    const msg    = choice.message;
    if (res.usage) inputTokens = res.usage.prompt_tokens;
    msgs.push(msg);

    if (choice.finish_reason === 'tool_calls' && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        const result = await executeTool(tc.function.name, JSON.parse(tc.function.arguments));
        msgs.push({ role: 'tool', tool_call_id: tc.id, content: result });
      }
    } else {
      const outputText   = msg.content || "Sorry, I couldn't process that. Please try again.";
      const outputTokens = res.usage?.completion_tokens ?? Math.ceil(outputText.length / 4);
      return { reply: outputText, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
    }
  }

  return { reply: 'Processing limit reached. Please rephrase your question.', inputTokens, outputTokens: 10, totalTokens: inputTokens + 10 };
}