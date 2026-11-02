# AI Badhai Box by upGrad · Samriddhi On. Sawaal Gone.

upGrad's Diwali 2026 microsite. Visitors build a personalised AI-learning gift ("AI Badhai Box") for themselves or someone they love, then pay ₹249.

- **Live site:** https://samriddhi-gift-draft.vercel.app
- **Leads dashboard:** https://samriddhi-gift-draft.vercel.app/admin (PIN-protected; ask the marketing team for the PIN)

> **For the product team: leads are already being captured.** Every visitor who fills the details pop-up is saved to the database and shows up live in `/admin`, with their stage in the funnel, the domain they picked, **the exact courses in their box** and the campaign source (UTM). The dashboard can export everything as CSV; the `courses` column is a comma-separated list you can use to send each buyer their course links. Details below.

---

## What's in here

Plain static site + two serverless functions. No framework, no build step, no npm dependencies.

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The site: hero, "How it works", what's inside, and the full-screen builder (scrolls 2–7 of the copy). |
| `data.js` | **All campaign copy and the course catalogue**: `BOX` (common courses, how many are drawn per section, offer badges, hours / eligibility / mode) and `DOMAINS` (each domain's mastery track and its short, free and flagship pools), plus curation lines and carousel tiles. Edit courses here. |
| `device.js` | Desktop "📱 Mobile view" toggle for reviewers (phone-frame preview of the same page). |
| `bgfx/v2.js`, `bgfx/v6.js` | Reactive canvas backgrounds (floating embers, click-glow rangoli). |
| `bgfx/fireworks.js` | Soft background fireworks in the hero and the footer. Colours come from the page's colour tokens; pauses off-screen; off with "reduce motion". |
| `admin.html` | Leads dashboard at `/admin`. |
| `api/lead.js` | `POST /api/lead`: saves and updates a lead. |
| `api/admin.js` | `GET /api/admin`: returns all leads (needs the admin PIN). |
| `api/_lib.js`, `api/_mem.js` | Redis helper (Upstash REST, plain `fetch`) and an in-memory store for local dev. |
| `dev/server.js` | Local server that runs the site and the API together. |
| `dev/palette.html` | Local colour editor: the site in a frame with every colour mapped to 14 roles, 8 presets, desktop/phone views. Open http://localhost:5250/dev/palette.html. Not deployed. |
| `assets/` | Images (WebP): characters, course tiles, step icons, detail icons (`assets/icons/`), logos. |
| `vercel.json` | Region `bom1` (Mumbai, next to the database), security headers, `noindex` on `/admin` and `/api`. |

## How the box is built

From the "Diwali Campaign Courses" sheet. Every box has six sections:

| Section | What the visitor gets | Offer badge | Swap |
|---|---|---|---|
| The essential | Microsoft Generative AI Essentials (everyone) | Completely Free - 100% Off | – |
| The mastery track | The chosen domain's Microsoft mastery track | Flat 75% Off | – |
| Short courses | 2 of the domain's 4, drawn at random | 100% Off | ✓ |
| AI learning | 1 of the 2 agentic AI courses (everyone) | 100% Off | ✓ |
| Free courses | 3 of the domain's 6, drawn at random | FREE | ✓ |
| For the bigger move | 1 of the domain's flagship programmes (Marketing always gets MICA) + Executive PG in Applied AI and Agentic AI (everyone) | Scholarships Available | ✓ (not Marketing) |

**Swap** opens a pop-up listing the other courses in that section; the visitor picks one. Each section also shows learning hours, eligibility and mode of delivery once, with icons. Under the box: "Program-specific details might differ and will be shared over email." The final box (after any swaps) is saved with the lead.

## How lead capture works

The builder writes **one lead per visit** and updates it as the visitor moves through:

| Stage | When it's saved | Shown in /admin as |
|---|---|---|
| `details` | After the details pop-up ("Me" → your name/mobile/email; "Someone I love" → their name/mobile/email + Diwali note, and yours) | Filled details |
| `curated` | A domain is picked and the curated box is shown | Saw their box |
| `pay` | The pay button is pressed (the visitor goes to Razorpay) | Pressed pay |

Each lead stores: `id`, `created`, `updated`, `stage`, `mode` (`self` / `other`), `domain`, `buyer {name, phone, email}`, `recipient {name, phone, email, note}` (gifts only), `consent` (always `true`) with `consentAt` (ISO time the box was ticked), `box` (the exact courses: `essential`, `mastery`, `short[]`, `ai[]`, `free[]`, `bigger[]`), `device`, `source` (UTM / query string).

**Courses in `/admin` and the CSV:** the "Courses in the box" column and the CSV `courses` column list every course the visitor ended up with, comma-separated, in box order. Institutions are in brackets (e.g. "MBA (Golden Gate University)"), so no course name contains a comma and the list splits cleanly. Leads from before 2 Nov 2026 have no courses.

**Consent:** the details pop-up has a required, unticked-by-default checkbox (agree to upGrad's Privacy Policy and Terms of Use, and consent to be contacted by phone, email, SMS and WhatsApp). The visitor can't continue without it, and `api/lead.js` rejects any lead without `consent: true`. Consent is stored in the lead JSON (and in the `/admin` JSON), but it isn't a column in the `/admin` table or CSV yet. The footer carries the legal disclaimer. The Privacy Policy link goes to https://www.upgrad.com/privacy/, and Terms of Use and T&C go to https://www.upgrad.com/terms/.

Validation happens in the browser and again on the server (10-digit Indian mobile, valid email, length limits). Writes are rate-limited to 30 a minute per IP.

**Storage:** Upstash Redis (REST API), every key prefixed `badhai:`:

- `badhai:leads`: hash, `id → lead JSON`
- `badhai:leads:idx`: sorted set of ids by created time
- `badhai:rl:<ip>`: rate-limit counters (expire after 60 s)

⚠️ The Redis database is **shared with other upGrad projects**. Only touch keys under `badhai:` and never run `FLUSHDB` / `FLUSHALL`. When moving to upGrad's own infrastructure, point the env vars at a dedicated database and copy the two `badhai:leads*` keys across.

## Payment

The pay button currently sends the visitor to a Razorpay payment page (`PAY_URL` in `app.js`). The lead is marked `pay` when they press it. **Razorpay does not report back yet**, so "Pressed pay" means *started* payment, not *completed*. To track completed payments, add a Razorpay webhook (or a redirect back to the site after payment) that marks the lead paid.

## Environment variables (set in Vercel, never in this repo)

| Name | Purpose |
|---|---|
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis REST token |
| `ADMIN_PIN` | PIN for `/admin` |

## Run locally

```bash
node dev/server.js
```

Then open http://localhost:5250 (site) and http://localhost:5250/admin (PIN `9999` locally). Locally, leads are kept in memory, so nothing touches the real database.

## Deploy

Hosted on Vercel (project `samriddhi-gift-draft`). Push to `main`, or run `npx vercel deploy --prod`.

## Before launch: open items from the copy doc

From "AI Badhaai Box · Webpage Copy" (implementation checks):

1. Clearly distinguish courses included for ₹249, discount coupons, and programmes that need separate payment, in every edition. Confirm the exact mastery-track entitlement for Data & AI, Tech & AI and Management & AI before adding benefit labels.
2. Confirm that projects, assignments and capstones are included in the ₹249-accessible learning before showing them as box inclusions (the "There's a lot packed inside" carousel).
3. Wire the Razorpay payment result back to the lead (see Payment).
