# V2studio — Luxury Massage & Depilation Salon

A production-ready, ultra-luxury salon website with a **dark, cinematic, and cozy** aesthetic. Built with Next.js and Framer Motion.

![V2studio](https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200)

## Features

- **Entry Portal**: Split-screen choice between Massage and Depilation experiences
- **Massage Landing**: Deep-scroll experience with glass-morphism navbar
- **Services Grid**: 6 themed cards with tilt-and-glow hover effects
- **Membership Tiers**: Silver, Black, Obsidian with unique styling
- **Booking Engine**: Custom calendar (month/week/list views) with dark theme (glass-morphism, neon accents)
- **Responsive**: Optimized for mobile (floating "Get Directions" CTA) and 4K desktop

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS (dark mode default)
- **Animations**: Framer Motion
- **Calendar**: Custom-built (no external calendar lib)
- **Utilities**: clsx, tailwind-merge

## Installation

```bash
# Clone or navigate to the project
cd luxe-salon

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Admin WhatsApp (optional)

Booking confirmations use Resend. You can also notify the salon admin on **WhatsApp** via **Twilio** for the same cases as the admin email: **new bookings** from the public flow (not admin-created) and **cancellations**.

Set these in `.env.local` (see [`.env.example`](.env.example)):

- `ADMIN_WHATSAPP_PHONE` — E.164 number that receives alerts (e.g. `+31687630005`)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` — from the [Twilio Console](https://www.twilio.com/console)
- `TWILIO_WHATSAPP_FROM` — **Twilio’s** WhatsApp sender (sandbox: `whatsapp:+14155238886` from the Twilio console — not your own mobile number). `ADMIN_WHATSAPP_PHONE` is **your** phone that receives alerts (must join the sandbox first).

If any of these are missing, WhatsApp is skipped and emails behave as before. The `POST /api/send-confirmation` response includes `whatsapp`: `skipped` | `sent` | `failed` for debugging.

**Quick test (Twilio only, no email):** from the project root run `npm run test:whatsapp` — it sends two sample messages (new booking + cancelled) to `ADMIN_WHATSAPP_PHONE` if all Twilio variables are set.

**End-to-end:** use a real **public** booking on the site (not admin-created) or cancel an appointment in the admin calendar; both paths call `/api/send-confirmation` after Resend succeeds. If the customer email step fails, WhatsApp is not attempted.

**Twilio error 63007** (“could not find a Channel with the specified From address”): `TWILIO_WHATSAPP_FROM` does not match any WhatsApp sender on **this** Twilio account. Copy the sandbox **From** exactly from Console → **Messaging** → **Try WhatsApp** (e.g. `whatsapp:+14155238886`). No spaces; `TWILIO_ACCOUNT_SID` / token must be from the same account (not another subaccount). Production needs a Twilio number that is **WhatsApp-enabled** for that account.

> **Note**: If you see `EPERM` or npm cache errors, fix permissions with:
> `sudo chown -R $(whoami) ~/.npm`

## Project Structure

```
luxe-salon/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Entry portal (Massage | Depilation)
│   ├── massage/
│   │   └── page.tsx         # Massage landing
│   └── depilation/
│       └── page.tsx         # Depilation landing (coming soon)
├── components/
│   ├── Navbar.tsx           # Glass-morphism fixed navbar
│   ├── ServiceCard.tsx      # Tilt-and-glow service cards
│   ├── MembershipCard.tsx   # Tiered membership display
│   ├── BookingCalendar.tsx  # Custom calendar modal (month/week/list)
│   └── FloatingCTA.tsx      # Mobile "Get Directions" button
└── lib/
    └── utils.ts             # cn() for class merging
```

## Design System

- **Background**: Near-black `#0a0a0a`
- **Text**: Icy white `#f8fafc`
- **Accents**: Aurora gradient (White ↔ Yellow ↔ Magenta), soft gold `#d4af37`
- **Effects**: Glass-morphism, neon borders, glow rings on CTAs

## Image Attributions

All placeholder images are sourced from [Unsplash](https://unsplash.com) under the Unsplash License (free to use):

| Image | Source |
|-------|--------|
| Massage / Spa | [Unsplash - Spa](https://images.unsplash.com/photo-1544161515-4ab6ce6db874) |
| Depilation / Wellness | [Unsplash - Wellness](https://images.unsplash.com/photo-1519824145371-296894a0daa9) |
| Hot Stone | [Unsplash - Stones](https://images.unsplash.com/photo-1540555700478-4be289fbecef) |
| Aromatherapy | [Unsplash - Oils](https://images.unsplash.com/photo-1600334129128-685c5582fd35) |
| Sports Recovery | [Unsplash - Sports](https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b) |
| Couples | [Unsplash - Couples](https://images.unsplash.com/photo-1515377905703-c4788e51af15) |

Replace these with your own high-quality imagery for production.

## Accessibility

- Semantic HTML (`<main>`, `<section>`, `<nav>`, `<article>`)
- ARIA labels on interactive elements
- Focus states on buttons and links
- Sufficient color contrast for WCAG AA

## License

MIT
