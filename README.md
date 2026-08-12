<div align="center">

# <span style="color:#D4A853">🦁 SEVEN LIONS STUDIO</span>

<span style="color:#666">A full-stack music studio management platform — bookings, services, admin, and beyond.</span>

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.112-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Tech Stack](#-tech-stack)
3. [Features](#-features)
4. [Screens & Routes](#-screens--routes)
5. [Project Structure](#-project-structure)
6. [Setup & Installation](#-setup--installation)
7. [Environment Variables](#-environment-variables)
8. [Running the App](#-running-the-app)
9. [Building for Production](#-building-for-production)
10. [API Endpoints](#-api-endpoints)
11. [Data Model & Storage](#-data-model--storage)
12. [Authentication Flow](#-authentication-flow)
13. [Core Data Flow — Rehearsal Booking Lifecycle](#-core-data-flow--rehearsal-booking-lifecycle)
14. [Email Notification System](#-email-notification-system)
15. [Google Calendar Integration](#-google-calendar-integration)
16. [Brand & Design Tokens](#-brand--design-tokens)
17. [License](#-license)

---

## 🎵 Overview

**Seven Lions Studio** is a full-featured web application for a music rehearsal and recording studio located at Jorjo Bldg, Tandang Sora, Quezon City. It serves two primary audiences:

- **Clients** — bands, artists, students, and content creators who browse services, book rehearsal sessions, request professional services (recording, video, lessons, repairs), and track their booking history.
- **Admin** — studio staff who review and approve bookings, manage service pricing, moderate reviews, run email notifications, sync to Google Calendar, and configure all public-facing content from a single dashboard.

**Key design decisions:**

- Monochrome black-and-white aesthetic with Big Shoulders Display + Archivo typography — reinforcing the studio's raw, industrial identity.
- All content (pricing, hero photos, services, social links, payment details) is managed from the admin panel — no code deploys needed for content updates.
- Bookings follow a deliberate approval flow (submit → admin approve → client pays → admin confirms) to prevent unverified slot conflicts.
- A loyalty program automatically rewards every 5th booking with 2 free studio hours.

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.3.0 |
| UI Library | React | 19.2.8 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS v4 | ^4 |
| Database + Auth + Storage | Supabase | ^2.112.1 |
| Authentication | NextAuth v5 (beta) | ^5.0.0-beta.32 |
| Calendar UI | FullCalendar | ^6.1.15 |
| Email | Nodemailer (Gmail SMTP) | ^8.0.11 |
| Google APIs | googleapis | ^174.0.1 |
| Icons | Lucide React | ^1.28.0 |
| Date Utilities | date-fns | ^4.4.0 |
| Class Utilities | clsx | ^2.1.1 |
| Form Handling | React Hook Form | ^7.84.0 |
| Testing | Playwright | ^1.62.1 |

---

## ✨ Features

### <span style="color:#2a9d8f">🎸 Booking & Reservations</span>

- **Rehearsal Booking** — 4-step wizard: pick a date on FullCalendar → fill in contact details → cost estimate review → confirm. Live conflict detection prevents double-booking the same slot.
- **Service Requests** — Single form handles recording sessions, jingle production, guitar/drum lessons, guitar/bass repair, and video shoots, with service-specific fields (skill level, lesson packages, video shoot packages, add-ons).
- **Recurring Lessons** — Clients can schedule lessons on recurring days of the week or provide specific manual dates.
- **Add-ons** — Drumsticks, equipment rentals, and video shoot extras are selectable at booking time with real-time price estimates.
- **Student Discount** — Toggle to request the student rate; optional school ID photo upload for pre-verification.
- **Payment Method Selection** — Cash, GCash (with QR display), or configured bank transfers shown inline at checkout.

### <span style="color:#2a9d8f">🏅 Loyalty Program</span>

- Every 5th confirmed booking earns the client **2 free studio hours**, automatically calculated in the cost estimate.
- Milestone detection is per authenticated user — requires sign-in to benefit.

### <span style="color:#2a9d8f">👤 User Profiles</span>

- View and edit name, phone, and avatar.
- Full booking history across rehearsal bookings and service requests, organized by tabs.
- Upload proof of payment directly from a booking detail view.

### <span style="color:#2a9d8f">🛡 Admin Dashboard</span>

- **Bookings** — Full management of rehearsal bookings and service requests. Set final rates, add admin notes, move through the approval flow (for_approval → approved_pending_payment → confirmed), and reject or cancel.
- **Calendar View** — Visual FullCalendar overlay on the admin bookings tab showing all sessions color-coded by status.
- **Users** — Browse all registered users; change roles (user / admin).
- **Gallery** — Upload, reorder, activate/deactivate gallery photos.
- **Reviews** — Moderate incoming reviews: approve, reject, or delete. Filter by pending / approved / rejected.
- **Settings** — Manage hero/about/studio photos, page text content, contact info, GCash and bank transfer payment details, social media links, email credentials, reschedule policy, and Google Calendar ID.
- **Bands / Artists** — Create and edit band profiles with photos and loyalty card counts. Auto-registers bands on booking confirmation.
- **Equipment** — Manage rental equipment with hourly pricing.
- **Studio Services** — Full CRUD for service catalog entries including pricing pairs, inclusions, and action links.
- **Video Add-ons** — Manage video shoot add-on items with sorting and active/inactive toggle.
- **Lesson Packages** — Guitar and drum lesson packages with sessions, hours, frequency, and pricing.

### <span style="color:#2a9d8f">📅 Google Calendar Integration</span>

- Sync individual or bulk-selected rehearsal bookings to a Google Calendar via service account.
- Import external Google Calendar events directly as rehearsal bookings or service requests.
- Test calendar connection from the admin settings panel.

### <span style="color:#2a9d8f">📧 Transactional Email</span>

- Six email templates (booking submitted, status update, approved + payment instructions, request submitted, request status, request approved + payment instructions).
- Email sender and app password configurable from admin settings, with `.env.local` fallback.
- HTML emails with inline styling, studio branding, and color-coded status badges.

### <span style="color:#2a9d8f">⭐ Reviews</span>

- Clients submit star ratings for overall experience, accommodation, equipment, and personnel.
- Optional review text and photo uploads.
- Approved reviews appear in the home-screen review slider.

### <span style="color:#2a9d8f">🎨 UI / UX</span>

- Animated band photo slider with Ken Burns pan effect, film burn transitions, and per-band name nav indicators.
- Animated review slider.
- Dark/light theme toggle stored in `data-theme` attribute, CSS-driven (no flash on load).
- Scroll-reveal animations and staggered page-load fade-ins.
- Grain overlay texture via animated SVG filter.
- Responsive layout across mobile, tablet, and desktop.

---

## 🗺 Screens & Routes

```
Route                          Description
──────────────────────────────────────────────────────────────────────────
/                              Home — hero, services grid, gallery, band slider, reviews, loyalty CTA
/services                      Full service catalog with pricing
/rehearsal-booking             4-step rehearsal booking wizard
/request-service               Service request form (type selected via ?type= query param)
/review                        Client review submission form
/profile                       Authenticated user profile + booking history
/auth/login                    Sign in (email/password or Google OAuth)
/auth/signup                   Create account
/auth/callback                 NextAuth OAuth callback handler
/admin                         Admin dashboard (role=admin required)

API Routes
──────────────────────────────────────────────────────────────────────────
POST /api/email                Send transactional email
POST /api/google-calendar      Google Calendar actions (admin only)
GET  /api/auth/[...nextauth]   NextAuth session/OAuth handler
POST /api/auth/[...nextauth]   NextAuth sign-in/sign-out handler
```

---

## 📁 Project Structure

```
seven-lions/
└── app/                          Next.js application root
    ├── .env.local                Environment variables (not committed)
    ├── package.json              Dependencies and npm scripts
    └── src/
        ├── auth.ts               NextAuth config — Google + Credentials providers, JWT callbacks
        ├── auth.config.ts        Edge-compatible NextAuth config (session shape, redirect page)
        ├── app/
        │   ├── layout.tsx        Root layout — Navbar, Footer, ThemeProvider, GrainOverlay
        │   ├── globals.css       Design tokens, keyframe animations, FullCalendar overrides
        │   ├── page.tsx          Home page (server component — fetches approved reviews)
        │   ├── services/
        │   │   └── page.tsx      Services catalog page
        │   ├── rehearsal-booking/
        │   │   └── page.tsx      4-step rehearsal booking wizard
        │   ├── request-service/
        │   │   └── page.tsx      Multi-service request form
        │   ├── review/
        │   │   └── page.tsx      Review submission page
        │   ├── profile/
        │   │   └── page.tsx      User profile + booking history + proof upload
        │   ├── admin/
        │   │   └── page.tsx      Admin dashboard (3457 lines — all admin features)
        │   └── api/
        │       ├── email/
        │       │   └── route.ts  POST — transactional email via Nodemailer
        │       ├── google-calendar/
        │       │   └── route.ts  POST — Google Calendar sync/import (admin-guarded)
        │       └── auth/
        │           └── [...nextauth]/
        │               └── route.ts  NextAuth GET/POST handlers
        ├── components/
        │   ├── Navbar.tsx        Top navigation with theme toggle and auth state
        │   ├── Footer.tsx        Site footer with social links from DB
        │   ├── BandSlider.tsx    Animated band photo slider with Ken Burns + film burn
        │   ├── ReviewSlider.tsx  Auto-advancing review carousel
        │   ├── HeroBackground.tsx Hero section animated background
        │   ├── RehearsalCalendar.tsx  FullCalendar for booking date selection
        │   ├── AdminBookingCalendar.tsx  FullCalendar for admin schedule view
        │   ├── LocationMap.tsx   Embedded Google Maps location
        │   ├── GrainOverlay.tsx  Fixed grain texture overlay
        │   ├── AnimationObserver.tsx  Intersection Observer for scroll-reveal
        │   ├── LogoThemed.tsx    Theme-aware SVG logo
        │   ├── ThemeToggle.tsx   Dark/light theme switcher
        │   ├── SocialIcons.tsx   Social platform icon map
        │   └── Providers.tsx     NextAuth SessionProvider wrapper
        ├── lib/
        │   ├── supabase/
        │   │   ├── client.ts     Browser Supabase client
        │   │   └── server.ts     Server Supabase client (with cookie handling)
        │   ├── mailer.ts         Nodemailer transporter + 6 HTML email templates
        │   └── google-calendar.ts  Google Calendar API — upsert, delete, test, list events
        └── types/
            └── database.ts       Full TypeScript types for all DB tables + enums
```

---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js 20+
- npm 10+
- A [Supabase](https://supabase.com) project with the `seven-lions-db` schema and all tables created
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) enabled (or use admin settings)
- Google OAuth credentials (for Google Sign-In)
- A Google Cloud service account with Calendar API access (for Google Calendar sync)

### Clone & Install

```bash
git clone https://github.com/erar404/seven-lions.git
cd seven-lions/app
npm install
```

---

## 🔑 Environment Variables

Create `app/.env.local` with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
AUTH_SECRET=a-long-random-secret-at-least-32-chars

# Google OAuth (for sign-in with Google)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Gmail SMTP fallback (can also be set from admin Settings > Email)
GMAIL_USER=your-studio@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Google Calendar — service account (for calendar sync)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
```

| Variable | File | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | ✅ | Supabase project REST URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | ✅ | Supabase anonymous key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | ✅ | Supabase service role key (server-only — bypasses RLS) |
| `AUTH_SECRET` | `.env.local` | ✅ | NextAuth signing secret |
| `GOOGLE_CLIENT_ID` | `.env.local` | ✅ | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | `.env.local` | ✅ | Google OAuth app client secret |
| `GMAIL_USER` | `.env.local` | ⚠️ | Fallback email sender — overridden by admin DB setting |
| `GMAIL_APP_PASSWORD` | `.env.local` | ⚠️ | Fallback Gmail app password — overridden by admin DB setting |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `.env.local` | Optional | Service account email for Calendar API |
| `GOOGLE_PRIVATE_KEY` | `.env.local` | Optional | RSA private key for Calendar API (use `\n` for newlines) |

> 📌 `GMAIL_USER` / `GMAIL_APP_PASSWORD` can alternatively be set per-studio from **Admin → Settings → Email**. The `.env.local` values are only used as a fallback.

---

## 🚀 Running the App

```bash
# From the app/ directory
npm run dev
```

The app starts at **http://localhost:3000**.

The dev server uses Next.js Turbopack for fast refresh.

---

## 🏗 Building for Production

```bash
cd app
npm run build
npm start
```

- **Build output**: `.next/` directory
- **Static assets**: served by Next.js from `public/`
- **Port**: 3000 (default); override with `PORT` env var

### Deploy Options

| Platform | Notes |
|---|---|
| **Vercel** | Zero-config — connect repo, add env vars, deploy |
| **Railway / Render** | Build command: `npm run build`; start: `npm start` |
| **Self-hosted** | Run `npm start` behind nginx or Caddy reverse proxy |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PRIVATE_KEY`, `AUTH_SECRET`, and `GMAIL_APP_PASSWORD` must **never** be exposed to the browser. They are server-only and should be set as environment secrets in your hosting platform.

---

## 📡 API Endpoints

### <span style="color:#555">POST /api/email</span>

Sends a transactional email via Nodemailer. Email credentials are loaded from the DB (`email_sender`, `email_app_password`), falling back to `GMAIL_USER` / `GMAIL_APP_PASSWORD`.

**Request body — booking submitted:**
```json
{
  "type": "booking_submitted",
  "to": "client@example.com",
  "data": {
    "bandName": "The Static Kings",
    "contactName": "Juan dela Cruz",
    "date": "Monday, August 18, 2025",
    "startTime": "10:00 AM",
    "endTime": "12:00 PM",
    "bookingId": "uuid-here"
  }
}
```

**Supported `type` values:**

| Type | Trigger | Description |
|---|---|---|
| `booking_submitted` | Client submits rehearsal booking | Confirmation to client |
| `booking_status` | Admin updates booking status | Status change notification |
| `booking_approved_payment` | Admin sets booking to approved_pending_payment | Approval + payment instructions |
| `request_submitted` | Client submits service request | Confirmation to client |
| `request_status` | Admin updates service request status | Status change notification |
| `request_approved_payment` | Admin approves service request with payment | Approval + payment instructions |

---

### <span style="color:#555">POST /api/google-calendar</span>

Admin-only (session role must be `admin`). Manages Google Calendar sync via a service account.

**Request body:**
```json
{
  "action": "test | sync_booking | sync_selected | sync_all | delete_booking | list_events",
  "bookingId": "uuid",
  "bookingIds": ["uuid1", "uuid2"],
  "calendarId": "override-for-test-action"
}
```

| Action | Description |
|---|---|
| `test` | Verify connection to a calendar ID; returns calendar name + timezone |
| `sync_booking` | Upsert a single rehearsal booking as a Google Calendar event |
| `sync_selected` | Upsert a list of bookings by ID |
| `sync_all` | Upsert all confirmed/pending bookings |
| `delete_booking` | Remove a booking's calendar event |
| `list_events` | List upcoming external (non-synced) events for import preview |

---

### <span style="color:#555">GET/POST /api/auth/[...nextauth]</span>

Handled by NextAuth v5. Routes all OAuth redirects, session reads, and sign-in/sign-out actions.

---

## 💾 Data Model & Storage

### Database Tables (Supabase schema: `seven-lions-db`)

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | `id`, `auth_id`, `email`, `name`, `phone`, `role`, `avatar_url` | User profiles linked to Supabase Auth |
| `seven_lions_rehearsal_bookings` | `band_name`, `booking_date`, `start_time`, `end_time`, `status`, `final_rate`, `payment_proof_url` | Rehearsal session bookings |
| `seven_lions_service_requests` | `service_type`, `status`, `skill_level`, `lesson_package_id`, `video_shoot_package`, `video_addon_ids` | All non-rehearsal service requests |
| `seven_lions_gallery` | `url`, `category`, `sort_order`, `active` | Studio gallery images |
| `seven_lions_settings` | `key`, `value` | Key-value store for all admin-configurable site content |
| `bands` | `band_name`, `loyalty_card_count`, `picture_urls`, `user_id` | Band/artist profiles |
| `studio_services` | `service_name`, `pricing` (JSON), `inclusions`, `request_hyperlink`, `active` | Service catalog |
| `studio_reviews` | `overall_rating`, `accommodation_rating`, `equipment_rating`, `personnel_rating`, `review_text`, `photo_urls`, `status` | Client reviews |
| `studio_equipment` | `equipment_name`, `equipment_price_hr`, `equipment_photo_url` | Rentable equipment |
| `video_shoot_addons` | `name`, `price`, `active`, `sort_order` | Video shoot extras |
| `lesson_packages` | `service_type`, `sessions`, `hours_per_session`, `times_per_week`, `price` | Lesson bundle packages |

### Booking Status Flow

```
for_approval  -->  approved_pending_payment  -->  confirmed
     |                                               |
     +--------->  rejected                           |
     +--------->  cancelled  <---------------------+
```

### Supabase Storage — Bucket: `seven-lions-photos`

| Path prefix | Contents |
|---|---|
| `/page/` | Hero, about, studio photos; bank transfer QR images |
| `/bands/` | Band/artist profile photos (up to 5 per band) |
| `/equipment/` | Equipment rental item photos |
| `/student-ids/` | Student ID photos uploaded at booking time for discount verification |
| `/{timestamp}.{ext}` (root) | Gallery images |

### Settings Keys (`seven_lions_settings`)

| Key | Description |
|---|---|
| `hero_image` | Hero section background photo URL |
| `about_image` | About section photo URL |
| `studio_photo` | Studio interior photo URL |
| `contact_phone` | Studio phone number |
| `contact_address` | Studio physical address |
| `gcash_number` | GCash payment number |
| `gcash_qr_url` | GCash QR code image URL |
| `bank_transfers` | JSON array of bank transfer options |
| `social_links` | JSON array of social media links |
| `email_sender` | Gmail SMTP sender address |
| `email_app_password` | Gmail App Password |
| `google_calendar_id` | Google Calendar ID for booking sync |
| `non_refundable` | `"true"` to show non-refundable policy at checkout |

---

## 🔐 Authentication Flow

1. **Client visits** `/auth/login` or `/auth/signup`.
2. **Credentials login**: Client submits email + password → NextAuth `Credentials` provider calls `supabase.auth.signInWithPassword()` → on success, fetches the user profile from the `users` table (matched by `auth_id`) → returns `{ id, email, name, image, role }` to NextAuth.
3. **Google login**: NextAuth redirects to Google OAuth → on callback, the `jwt` callback checks if the email exists in `users` table → if not, inserts a new row with `role = "user"` → stores `token.sub = users.id` and `token.role`.
4. **Session hydration**: The `session` callback copies `token.sub` → `session.user.id` and `token.role` → `session.user.role`.
5. **Admin guard**: Admin pages check `session.user.role === "admin"` — if not admin, redirect to `/`.
6. **Auth guard**: Profile and booking submission require a session — unauthenticated users are redirected to `/auth/login?next=<page>`.
7. **Sign out**: `signOut()` clears the NextAuth JWT session cookie.

```
Browser                NextAuth               Supabase Auth         Supabase DB (users)
   |                      |                       |                        |
   |-- POST /api/auth ---->|                       |                        |
   |  (credentials)        |-- signInWithPassword->|                        |
   |                       |<-- user.id, email ----|                        |
   |                       |-- SELECT WHERE auth_id = user.id ------------->|
   |                       |<-- { id, name, role, avatar_url } -------------|
   |<-- Set-Cookie JWT ----| (contains id, email, role)
   |                       |
   |-- GET /api/auth/session ->|
   |<-- { user: { id, email, role } }
```

---

## 🔄 Core Data Flow — Rehearsal Booking Lifecycle

```
1. CLIENT picks a date on RehearsalCalendar (FullCalendar)
       |
2. CLIENT fills in band info, session times, add-ons, payment method
       |
3. Cost estimate calculated client-side from studio_services pricing
   (+ student discount, + milestone free hours if applicable)
       |
4. CLIENT confirms → POST to supabase.seven_lions_rehearsal_bookings
   status = "for_approval"
       |
5. POST /api/email { type: "booking_submitted" }  --> CLIENT receives confirmation email
       |
6. ADMIN sees booking on dashboard (badge count on Bookings tab)
       |
7. ADMIN sets final_rate, adds note, clicks "Approve for Payment"
   status = "approved_pending_payment"
       |
8. POST /api/email { type: "booking_approved_payment" }  --> CLIENT receives payment instructions
       |
9. CLIENT uploads proof of payment from /profile page
       |
10. ADMIN verifies proof → "Confirm" button
    status = "confirmed"
        |
11. (if Google Calendar ID configured) POST /api/google-calendar { action: "sync_booking" }
    Booking appears as event in Google Calendar
        |
12. Band auto-registered in bands table (if not already present)
```

---

## 📬 Email Notification System

All emails are sent via Gmail SMTP using Nodemailer. Credentials are sourced from the `seven_lions_settings` table first, then fall back to `GMAIL_USER` / `GMAIL_APP_PASSWORD` env vars.

Email templates are built as inline-styled HTML for maximum email client compatibility. Each template includes:

- Studio branding header
- Color-coded status badge
- Booking/request detail table
- (Where applicable) Payment instructions + QR code image
- Link to upload proof of payment

```
Trigger Event           Template                      Recipient
──────────────────────────────────────────────────────────────────────────
Booking form submit     booking_submitted             Client
Admin status change     booking_status                Client
Admin approves payment  booking_approved_payment      Client (+ payment QR)
Service form submit     request_submitted             Client
Admin status change     request_status                Client
Admin approves payment  request_approved_payment      Client (+ payment QR)
```

---

## 📅 Google Calendar Integration

Calendar sync uses a **Google service account** (JWT auth, no user OAuth required) with the Calendar API scope `https://www.googleapis.com/auth/calendar`.

Bookings are matched to Google Calendar events via a **private extended property** (`sevenLionsId = bookingId`). This allows idempotent upserts — syncing the same booking twice updates the existing event rather than creating a duplicate.

When importing external events, events that already carry the `sevenLionsId` property are filtered out, preventing re-import of previously synced events.

Upcoming external events are fetched for the **next 90 days**. All-day events are excluded (only `dateTime` events are imported).

---

## 🎨 Brand & Design Tokens

### Dark Theme (default)

| Token | CSS Variable | Hex | Usage |
|---|---|---|---|
| Background | `--sl-bg` | `#0A0A0A` | Page background |
| Card | `--sl-card` | `#141414` | Card / panel backgrounds |
| Foreground | `--sl-fg` | `#F0F0F0` | Primary text |
| Accent | `--sl-accent` | `#FFFFFF` | Borders, buttons, highlights |
| Muted | `--sl-muted` | `#909090` | Secondary text |
| On Accent | `--sl-on-accent` | `#000000` | Text on white accent elements |

### Light Theme (`data-theme="light"`)

| Token | Hex |
|---|---|
| `--sl-bg` | `#FAFAFA` |
| `--sl-card` | `#EEEEEE` |
| `--sl-fg` | `#0F0F0F` |
| `--sl-accent` | `#000000` |
| `--sl-muted` | `#666666` |
| `--sl-on-accent` | `#FFFFFF` |

### Typography

| Role | Font Family | Weights |
|---|---|---|
| Display (headings, labels) | Big Shoulders Display | 700, 900 |
| Body (prose, inputs, UI text) | Archivo | 400, 500, 600, 700 |

### Status Badge Colors

| Status | Background | Text |
|---|---|---|
| For Approval | `rgba(202,138,4,0.15)` | `#fbbf24` |
| Pending Payment | `rgba(59,130,246,0.15)` | `#60a5fa` |
| Confirmed / Approved | `rgba(34,197,94,0.15)` | `#4ade80` |
| Rejected | `rgba(239,68,68,0.15)` | `#f87171` |
| Cancelled | `rgba(107,114,128,0.15)` | `#9ca3af` |

---

## 📜 License

This project is **private**. All rights reserved. Unauthorized copying, distribution, or use of this software is prohibited.

---

<div align="center">
<span style="color:#555">Built for Seven Lions Studio — Jorjo Bldg, Tandang Sora, Quezon City</span>
</div>
