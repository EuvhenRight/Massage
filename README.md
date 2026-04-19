# V2studio / Epilroom — Premium massage & waxing, Bratislava

**Brand-new** flagship site for the studio at **Križna 22, Bratislava**: therapeutic massage, professional depilation, and **best-in-class** online booking—the **first** digital touchpoint built to match an in-studio visit.

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

### WhatsApp (optional, Twilio)

Booking uses **Resend** for email. Optionally, **Twilio WhatsApp** sends:

- **Admin** — new bookings from the **public** flow only (same moment as the admin Resend email), and every **cancellation** (after emails succeed).
- **Customer** — friendly confirmation on **new** bookings and notice on **cancellations**, when the booking includes a phone in **E.164** form (e.g. `+4219xxxxxxx`) and Twilio core env is set.

Code: [`lib/whatsapp-admin-notify.ts`](lib/whatsapp-admin-notify.ts). API response: `whatsapp: { admin, customer }` where each value is `skipped` | `sent` | `failed`.

#### Setup checklist

1. [Twilio Console](https://www.twilio.com/console) → copy **Account SID** and **Auth Token** into `.env.local`.
2. **Messaging** → **Try it out** → **Send a WhatsApp message** (sandbox). Note the **sandbox keyword** (e.g. `join something-here`).
3. On the **admin** phone that should receive alerts, open **WhatsApp** and send `join <keyword>` to the **sandbox number** Twilio shows (e.g. `+1 415 523 8886`). Wait for the confirmation reply. **Customers** who should receive WhatsApp must also join the sandbox from **their** number (same `join` flow) until you use a production WhatsApp sender.
4. In the same Twilio screen, copy the **From** value for WhatsApp (format `whatsapp:+14155238886`) → `TWILIO_WHATSAPP_FROM`. Do **not** use your own mobile as `From`.
5. Set `ADMIN_WHATSAPP_PHONE` to that same phone’s **E.164** number (e.g. `+4219xxxxxxx`) — the one that joined the sandbox. It must **differ** from `TWILIO_WHATSAPP_FROM` (different roles: Twilio line vs your handset).
6. Put all four variables in **`.env.local`** (see [`.env.example`](.env.example)). For **Vercel/hosting**, add them under Project → Settings → Environment Variables.
7. Run `npm run test:whatsapp` — you should get two test messages. If not, check the terminal hint for **63007** (wrong `From`/account), **63016** (sandbox not joined), **63031** (`From` and `To` identical).

**Production:** replace the sandbox with a **WhatsApp-enabled** Twilio sender approved for your business; update `TWILIO_WHATSAPP_FROM` accordingly.

**Note:** If Resend fails first, WhatsApp is not called. Admin-created bookings skip **admin** WhatsApp; **customer** WhatsApp still runs when a valid `customerPhone` is sent.

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
