# 🏟️ TurfBook — AI-Powered Turf Booking Platform

Full-stack sports turf booking platform with AI chat, Google OAuth, Razorpay payments, and Cloudinary image hosting.

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 14** (App Router) | Frontend + Backend |
| **Neon PostgreSQL** + **Prisma** | Database |
| **Groq API** · llama-3.3-70b-versatile | AI Agent |
| **NextAuth v4** | Google OAuth + Email/Password |
| **Razorpay** | Payment Gateway |
| **Cloudinary** | Image Storage & CDN |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  ← Landing page (Server Component)
│   ├── layout.tsx                ← Root layout with fonts + Razorpay script
│   ├── globals.css               ← Design system (CSS variables, utilities)
│   ├── not-found.tsx
│   ├── login/page.tsx            ← Google OAuth + email login
│   ├── register/page.tsx         ← Sign up (USER or OWNER role)
│   ├── chat/page.tsx             ← AI Chat interface (ChatGPT-style)
│   ├── turfs/page.tsx            ← Browse & filter turfs
│   ├── dashboard/page.tsx        ← User booking history
│   ├── admin/dashboard/page.tsx  ← Admin: add/manage turfs (ADMIN only)
│   ├── owner/dashboard/page.tsx  ← Owner: analytics + bookings (OWNER only)
│   └── api/
│       ├── auth/[...nextauth]/   ← NextAuth (Google + Credentials)
│       ├── auth/register/        ← User registration
│       ├── chat/                 ← Groq AI agent endpoint
│       ├── turfs/                ← Public turf listing + by ID
│       ├── bookings/             ← User bookings + cancel/complete
│       ├── admin/turfs/          ← Admin CRUD (ADMIN only)
│       ├── admin/upload/         ← Cloudinary image upload (ADMIN only)
│       ├── owner/bookings/       ← Owner analytics (OWNER only)
│       └── payment/
│           ├── create-order/     ← Razorpay order creation
│           └── verify/           ← Razorpay signature verification
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Providers.tsx         ← NextAuth SessionProvider
│   └── booking/
│       └── PayNowButton.tsx      ← Razorpay checkout trigger
├── lib/
│   ├── prisma.ts                 ← Prisma singleton
│   ├── agent.ts                  ← Groq AI agent + 6 tools
│   ├── cloudinary.ts             ← Image upload utility
│   └── razorpay.ts               ← Order creation + signature verify
├── middleware.ts                  ← Route protection (admin/owner/dashboard)
└── types/
    ├── index.ts                  ← App-wide TypeScript types
    └── next-auth.d.ts            ← NextAuth type extensions
```

---

## Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

#### Get your keys:

**Neon PostgreSQL**
- Go to https://neon.tech → Create project
- Copy the connection string → `DATABASE_URL`

**Google OAuth**
- https://console.cloud.google.com → New project
- APIs & Services → Credentials → OAuth 2.0 Client ID
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
- Copy Client ID → `GOOGLE_CLIENT_ID`
- Copy Secret → `GOOGLE_CLIENT_SECRET`

**Groq**
- https://console.groq.com → Create API key → `GROQ_API_KEY`

**Cloudinary**
- https://cloudinary.com/console → Copy Cloud Name, API Key, Secret

**Razorpay**
- https://dashboard.razorpay.com → Settings → API Keys → Generate Test Keys
- Copy Key ID → `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- Copy Secret → `RAZORPAY_KEY_SECRET`

### 3. Setup database
```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to Neon
npm run db:seed       # Seed admin, owner, and 3 sample turfs
```

### 4. Run dev server
```bash
npm run dev
# Open http://localhost:3000
```

---

## Default Accounts (after seeding)

| Role  | Email | Password |
|---|---|---|
| Admin | admin@turfbook.com | admin123 |
| Owner | owner@turfbook.com | owner123 |

---

## Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/turfs` | Public | Browse all turfs |
| `/chat` | Public (login to book) | AI agent chat |
| `/login` | Public | Google + email login |
| `/register` | Public | Sign up |
| `/dashboard` | Logged in | My bookings |
| `/admin/dashboard` | ADMIN only | Manage turfs |
| `/owner/dashboard` | OWNER + ADMIN | Booking analytics |

---

## AI Agent Tools (Groq llama-3.3-70b-versatile)

| Tool | What it does |
|---|---|
| `search_turfs` | Filter by sport, city, max price |
| `get_turf_details` | Full info + time slot grid |
| `check_slot_availability` | Real-time slot check |
| `get_my_bookings` | User booking history |
| `initiate_booking` | Creates PENDING booking → triggers Pay Now |
| `get_faqs` | Rules, cancellation, pricing policies |

---

## Payment Flow

```
User chats → AI initiates_booking → PENDING booking created
     ↓
Pay Now button appears in chat
     ↓
/api/payment/create-order → Razorpay order
     ↓
Razorpay checkout opens (UPI / Card / Netbanking)
     ↓
/api/payment/verify → validates HMAC signature
     ↓
Booking: CONFIRMED  |  TimeSlot: isBooked = true
```

---

## Common Issues

**`Event handlers cannot be passed to Client Component`**
→ Any page using `onClick`, `useState`, `useSession` etc. must have `'use client'` as its very first line.

**Google login not working**
→ Make sure your Google OAuth redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`

**Prisma errors**
→ Run `npm run db:generate` after any schema change.
