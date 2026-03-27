// Email service - uses nodemailer with Gmail/SMTP
// Install: npm install nodemailer @types/nodemailer
// For production use Resend/SendGrid instead

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  type: string;
}

async function sendEmail(opts: EmailOptions): Promise<void> {
  // Log all emails (works without SMTP config)
  console.log('\n📧 EMAIL LOG ─────────────────────────────');
  console.log(`To:      ${opts.to}`);
  console.log(`Subject: ${opts.subject}`);
  console.log(`Type:    ${opts.type}`);
  console.log('──────────────────────────────────────────\n');

  // If nodemailer is configured, send real email
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"TurfBook" <${process.env.SMTP_USER}>`,
        to: opts.to, subject: opts.subject, html: opts.html,
      });
      console.log(`✅ Email sent to ${opts.to}`);
    } catch (err) {
      console.error('Email send error:', err);
    }
  }

  // Log to DB
  try {
    const { prisma } = await import('./prisma');
    await prisma.emailLog.create({ data: { to: opts.to, subject: opts.subject, type: opts.type } });
  } catch {}
}

const BASE_STYLE = `
  font-family: 'Inter', sans-serif; background: #050510; color: #f0f0ff;
  max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden;
`;
const HEADER_STYLE = `background: linear-gradient(135deg, #6c3bff, #00ff87); padding: 32px; text-align: center;`;
const BODY_STYLE   = `padding: 32px; background: #0d0d24;`;
const FOOTER_STYLE = `padding: 20px 32px; background: #050510; text-align: center; font-size: 12px; color: #8080aa;`;
const BTN_STYLE    = `display: inline-block; background: linear-gradient(135deg, #00ff87, #00cc6a); color: #050510; font-weight: 800; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 16px; margin-top: 20px;`;
const INFO_STYLE   = `background: #111128; border: 1px solid #1e1e45; border-radius: 10px; padding: 16px; margin: 12px 0;`;

// ── BOOKING CONFIRMATION TO USER ────────────────────────
export async function sendBookingConfirmation(params: {
  userEmail: string; userName: string; turfName: string; city: string;
  date: string; startTime: string; endTime: string; hours: number;
  totalPrice: number; bookingId: string; ownerPhone?: string; ownerEmail?: string;
}) {
  const html = `
  <div style="${BASE_STYLE}">
    <div style="${HEADER_STYLE}">
      <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #050510;">Booking Confirmed!</h1>
      <p style="margin: 8px 0 0; color: rgba(5,5,16,0.7);">Your slot is locked and ready</p>
    </div>
    <div style="${BODY_STYLE}">
      <p style="font-size: 16px; margin-bottom: 24px;">Hi ${params.userName}, your turf booking is confirmed! 🏟️</p>
      <div style="${INFO_STYLE}">
        <div style="font-size: 20px; font-weight: 800; color: #00ff87; margin-bottom: 12px;">${params.turfName}</div>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #8080aa;">📍 Location</td><td style="padding: 6px 0; font-weight: 600;">${params.city}</td></tr>
          <tr><td style="padding: 6px 0; color: #8080aa;">📅 Date</td><td style="padding: 6px 0; font-weight: 600;">${params.date}</td></tr>
          <tr><td style="padding: 6px 0; color: #8080aa;">🕐 Time</td><td style="padding: 6px 0; font-weight: 600;">${params.startTime} – ${params.endTime}</td></tr>
          <tr><td style="padding: 6px 0; color: #8080aa;">⏱️ Duration</td><td style="padding: 6px 0; font-weight: 600;">${params.hours} Hour${params.hours > 1 ? 's' : ''}</td></tr>
          <tr><td style="padding: 6px 0; color: #8080aa;">💰 Amount</td><td style="padding: 6px 0; font-weight: 800; color: #00ff87; font-size: 16px;">₹${params.totalPrice.toLocaleString('en-IN')}</td></tr>
          <tr><td style="padding: 6px 0; color: #8080aa;">🔑 Booking ID</td><td style="padding: 6px 0; font-family: monospace; font-size: 12px;">${params.bookingId}</td></tr>
        </table>
      </div>
      ${params.ownerPhone ? `
      <div style="${INFO_STYLE} border-color: rgba(0,255,135,0.2); background: rgba(0,255,135,0.04);">
        <div style="color: #00ff87; font-weight: 700; margin-bottom: 8px;">📞 Venue Contact</div>
        ${params.ownerPhone ? `<div style="font-size: 14px;">Phone: <strong>${params.ownerPhone}</strong></div>` : ''}
        ${params.ownerEmail ? `<div style="font-size: 14px;">Email: <strong>${params.ownerEmail}</strong></div>` : ''}
      </div>` : ''}
      <div style="${INFO_STYLE} border-color: rgba(108,59,255,0.2); background: rgba(108,59,255,0.04);">
        <div style="color: #a78bfa; font-weight: 700; margin-bottom: 8px;">📋 Rules</div>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #8080aa; line-height: 1.8;">
          <li>Arrive 10 minutes early</li><li>Sports shoes mandatory</li>
          <li>No alcohol or food on turf</li><li>Max 15 players per slot</li>
        </ul>
      </div>
      <a href="${process.env.NEXTAUTH_URL}/booking/confirmation?bookingId=${params.bookingId}" style="${BTN_STYLE}">View & Print Ticket →</a>
    </div>
    <div style="${FOOTER_STYLE}">TurfBook · support@turfbook.com · Cancellation free 24h before slot</div>
  </div>`;
  await sendEmail({ to: params.userEmail, subject: `✅ Booking Confirmed — ${params.turfName}`, html, type: 'BOOKING_CONFIRMATION' });
}

// ── NEW BOOKING ALERT TO OWNER ───────────────────────────
export async function sendOwnerBookingAlert(params: {
  ownerEmail: string; ownerName: string; turfName: string;
  customerName: string; customerEmail: string; customerPhone?: string;
  date: string; startTime: string; endTime: string; hours: number; totalPrice: number; bookingId: string;
}) {
  const html = `
  <div style="${BASE_STYLE}">
    <div style="${HEADER_STYLE}">
      <div style="font-size: 48px; margin-bottom: 8px;">🏟️</div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #050510;">New Booking!</h1>
    </div>
    <div style="${BODY_STYLE}">
      <p>Hi ${params.ownerName}, you have a new booking for <strong>${params.turfName}</strong>.</p>
      <div style="${INFO_STYLE}">
        <div style="font-size: 13px; color: #8080aa; margin-bottom: 4px;">CUSTOMER</div>
        <div style="font-weight: 700; font-size: 16px;">${params.customerName}</div>
        <div style="font-size: 13px; color: #8080aa;">${params.customerEmail}${params.customerPhone ? ` · ${params.customerPhone}` : ''}</div>
      </div>
      <div style="${INFO_STYLE}">
        <table style="width:100%; font-size:14px; border-collapse:collapse;">
          <tr><td style="padding:5px 0;color:#8080aa;">Date</td><td style="font-weight:600;">${params.date}</td></tr>
          <tr><td style="padding:5px 0;color:#8080aa;">Time</td><td style="font-weight:600;">${params.startTime} – ${params.endTime} (${params.hours}hr)</td></tr>
          <tr><td style="padding:5px 0;color:#8080aa;">Revenue</td><td style="font-weight:800;color:#00ff87;font-size:16px;">₹${params.totalPrice.toLocaleString('en-IN')}</td></tr>
        </table>
      </div>
    </div>
    <div style="${FOOTER_STYLE}">TurfBook Owner Dashboard · support@turfbook.com</div>
  </div>`;
  await sendEmail({ to: params.ownerEmail, subject: `🏟️ New Booking — ${params.turfName} on ${params.date}`, html, type: 'OWNER_BOOKING_ALERT' });
}

// ── TRIAL STARTED ────────────────────────────────────────
export async function sendTrialStarted(email: string, name: string, trialEndDate: string) {
  const html = `
  <div style="${BASE_STYLE}">
    <div style="${HEADER_STYLE}">
      <div style="font-size:48px;margin-bottom:8px;">🎉</div>
      <h1 style="margin:0;font-size:28px;font-weight:800;color:#050510;">Welcome to TurfBook!</h1>
      <p style="margin:8px 0 0;color:rgba(5,5,16,0.7);">Your free trial has started</p>
    </div>
    <div style="${BODY_STYLE}">
      <p>Hi ${name}, your 30-day free trial is now active!</p>
      <div style="${INFO_STYLE}">
        <div style="font-size:14px; line-height:1.8;">
          ✅ Your turfs are <strong>live</strong> on TurfBook<br/>
          ✅ Receive unlimited bookings<br/>
          ✅ Full access to owner dashboard<br/>
          ✅ Trial ends on <strong>${trialEndDate}</strong>
        </div>
      </div>
      <p style="color:#8080aa;font-size:14px;">After your trial, a monthly subscription of <strong style="color:#00ff87;">₹300/month</strong> keeps your turfs listed.</p>
      <a href="${process.env.NEXTAUTH_URL}/owner/subscription" style="${BTN_STYLE}">Manage Subscription →</a>
    </div>
    <div style="${FOOTER_STYLE}">TurfBook · support@turfbook.com</div>
  </div>`;
  await sendEmail({ to: email, subject: '🎉 Your 30-day free trial has started — TurfBook', html, type: 'TRIAL_STARTED' });
}

// ── TRIAL EXPIRING SOON ──────────────────────────────────
export async function sendTrialExpiringSoon(email: string, name: string, daysLeft: number, trialEndDate: string) {
  const html = `
  <div style="${BASE_STYLE}">
    <div style="background:linear-gradient(135deg,#ff6b35,#ff4444);padding:32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">⏰</div>
      <h1 style="margin:0;font-size:28px;font-weight:800;color:#fff;">Trial Ending Soon!</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);">${daysLeft} days remaining</p>
    </div>
    <div style="${BODY_STYLE}">
      <p>Hi ${name}, your free trial ends on <strong>${trialEndDate}</strong>.</p>
      <div style="${INFO_STYLE}">
        <p style="font-size:14px;color:#8080aa;">To keep your turfs listed and continue receiving bookings, subscribe for just <strong style="color:#00ff87;font-size:18px;">₹300/month</strong>.</p>
      </div>
      <a href="${process.env.NEXTAUTH_URL}/owner/subscription" style="${BTN_STYLE}">Subscribe Now — ₹300/month →</a>
    </div>
    <div style="${FOOTER_STYLE}">TurfBook · support@turfbook.com</div>
  </div>`;
  await sendEmail({ to: email, subject: `⏰ Trial ending in ${daysLeft} days — Subscribe to keep your turfs live`, html, type: 'TRIAL_EXPIRING' });
}

// ── SUBSCRIPTION CONFIRMED ───────────────────────────────
export async function sendSubscriptionConfirmed(email: string, name: string, periodEnd: string) {
  const html = `
  <div style="${BASE_STYLE}">
    <div style="${HEADER_STYLE}">
      <div style="font-size:48px;margin-bottom:8px;">💳</div>
      <h1 style="margin:0;font-size:28px;font-weight:800;color:#050510;">Payment Confirmed!</h1>
    </div>
    <div style="${BODY_STYLE}">
      <p>Hi ${name}, your TurfBook subscription is now <strong style="color:#00ff87;">ACTIVE</strong>.</p>
      <div style="${INFO_STYLE}">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:5px 0;color:#8080aa;">Plan</td><td style="font-weight:600;">Monthly — ₹300</td></tr>
          <tr><td style="padding:5px 0;color:#8080aa;">Valid Until</td><td style="font-weight:600;">${periodEnd}</td></tr>
          <tr><td style="padding:5px 0;color:#8080aa;">Status</td><td style="font-weight:700;color:#00ff87;">ACTIVE ✅</td></tr>
        </table>
      </div>
      <a href="${process.env.NEXTAUTH_URL}/owner/dashboard" style="${BTN_STYLE}">Go to Dashboard →</a>
    </div>
    <div style="${FOOTER_STYLE}">TurfBook · support@turfbook.com</div>
  </div>`;
  await sendEmail({ to: email, subject: '💳 Subscription confirmed — TurfBook ₹300/month', html, type: 'SUBSCRIPTION_CONFIRMED' });
}

// ── SUBSCRIPTION EXPIRED ─────────────────────────────────
export async function sendSubscriptionExpired(email: string, name: string) {
  const html = `
  <div style="${BASE_STYLE}">
    <div style="background:linear-gradient(135deg,#ff4444,#cc0000);padding:32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">🚫</div>
      <h1 style="margin:0;font-size:28px;font-weight:800;color:#fff;">Subscription Expired</h1>
    </div>
    <div style="${BODY_STYLE}">
      <p>Hi ${name}, your TurfBook subscription has expired. Your turfs have been <strong>hidden</strong> from the listing.</p>
      <div style="${INFO_STYLE}">
        <p style="font-size:14px;color:#8080aa;">Renew now for <strong style="color:#00ff87;">₹300/month</strong> to restore your listings immediately.</p>
      </div>
      <a href="${process.env.NEXTAUTH_URL}/owner/subscription" style="${BTN_STYLE}">Renew Subscription →</a>
    </div>
    <div style="${FOOTER_STYLE}">TurfBook · support@turfbook.com</div>
  </div>`;
  await sendEmail({ to: email, subject: '🚫 Your TurfBook subscription has expired', html, type: 'SUBSCRIPTION_EXPIRED' });
}
