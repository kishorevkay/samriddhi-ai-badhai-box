# AI Badhaai Box by upGrad · Samriddhi On. Sawaal Gone.

upGrad's Diwali 2026 microsite. Visitors build a personalised AI-learning gift ("AI Badhaai Box") for themselves or someone they love, then pay ₹249.

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
| `bgfx/tornado.js` + `vendor/three.module.min.js` + `assets/tornado/` | The curation screen ("Curating your AI Badhaai Box…"): course cards whirl up in a golden tornado and pour into the box, the lid shuts as "…is ready" appears, gold dust bursts out. three.js (r160, vendored), loaded in the background when the builder opens. Falls back to the CSS gift box without WebGL or with "reduce motion". |
| `bgfx/fireworks.js` | Soft background fireworks in the hero and the footer. Colours come from the page's colour tokens; pauses off-screen; off with "reduce motion". |
| `admin.html` | Leads dashboard at `/admin`. |
| `api/lead.js` | `POST /api/lead`: saves and updates a lead. |
| `api/admin.js` | `GET /api/admin`: returns all leads (needs the admin PIN). |
| `api/_lib.js`, `api/_mem.js` | Redis helper (Upstash REST, plain `fetch`) and an in-memory store for local dev. |
| `dev/server.js` | Local server that runs the site and the API together. |
| `dev/palette.html` | Local colour editor: the site in a frame with every colour mapped to 14 roles, 8 presets, desktop/phone views. Open http://localhost:5250/dev/palette.html. Not deployed. |
| `dev/test_consent.mjs` | Playwright tests for the consent tick and Pay in Chromium and WebKit (Safari): 9 scenarios, including closing the pop-up unticked, unticking at checkout, and switching Me ↔ Someone I love. Lead requests are stubbed in the browser and Razorpay is replaced by a stub page, so it is safe to point at the live URL. Setup and usage are at the top of the file. Not deployed. |
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

Each lead stores: `id`, `created`, `updated`, `stage`, `mode` (`self` / `other`), `domain`, `buyer {name, phone, email}`, `recipient {name, phone, email, note}` (gifts only), `consent` (always `true`) with `consentAt` (ISO time the box was ticked), `box` (the exact courses: `essential`, `mastery`, `short[]`, `ai[]`, `free[]`, `bigger[]`), `device`, `source` (UTM / query string), `site` (which copy of the site sent it, e.g. `www.upgrad.com` or `samriddhi-gift-draft.vercel.app`, shown under the device in `/admin` and as the last CSV column).

**Where leads came from ("Came from" in `/admin`):**
- What each lead stores:
  - `source`: the landing link's query string (UTM tags, Meta's `fbclid`, Google's `gclid`).
  - `ref`: the referring page (host + path).
- Both are taken from the page the visitor first landed on in that tab, and kept through reloads and Back.
- `/admin` turns them into a label: Instagram / Facebook / Meta / Google (with " ad" for paid clicks), WhatsApp, Email, the referring site, or "Direct / unknown". The label shows with the campaign · ad name, plus a "From ads" tile and a "From" filter.
- The CSV adds `came_from`, `campaign`, `ad` and `referrer`.
- To get campaign and ad names, tag the ad links:
  - In Meta Ads Manager → Ad → Tracking → URL parameters, add `utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`. `{{site_source_name}}` becomes `fb` or `ig`.
  - On emailers, add `?utm_source=clevertap&utm_medium=email&utm_campaign=<name>`.

**Hosting a copy elsewhere (e.g. upgrad.com/your-diwali-gift/):** the site is plain static files and works under any sub-path; every path is relative. A static host has no `/api` of its own, so leads always go to the Vercel API at `https://samriddhi-gift-draft.vercel.app/api/lead` (`LEAD_API` in `app.js`; same-origin `/api/lead` on Vercel and localhost). They are sent as a `text/plain` body so the cross-site POST needs no CORS preflight, and `api/lead.js` allows any origin. If you build your own lead API, point `LEAD_API` at it.

**Courses in `/admin` and the CSV:** the "Courses in the box" column and the CSV `courses` column list every course the visitor ended up with, comma-separated, in box order. Institutions are in brackets (e.g. "MBA (Golden Gate University)"), so no course name contains a comma and the list splits cleanly. Leads from before 2 Nov 2026 have no courses.

**Consent:** the details pop-up has a required, unticked-by-default checkbox with the sentence from the legal review, word for word: "By ticking this box, you agree to our Privacy Policy and Terms & Conditions." Privacy Policy links to https://www.upgrad.com/privacy/ and Terms & Conditions to https://www.upgrad.com/terms/. The visitor can't continue without the tick, and `api/lead.js` rejects any lead without `consent: true`. Pay checks again: if the details pop-up was closed with ✕ instead of saved (box unticked, details changed, or "Me" switched to "Someone I love"), Pay reopens the pop-up instead of going to Razorpay. Reopening the builder skips ahead to the courses only after details have been saved once. **Back from Razorpay** returns to the checkout, not the homepage. Browsers usually reload the page there, so just before the redirect the checkout is saved for that tab (sessionStorage: same tab only, cleared when it closes, 6-hour limit). It's reopened when the page loads from a Back/Forward navigation. Consent is stored in the lead JSON (and in the `/admin` JSON), but it isn't a column in the `/admin` table or CSV yet.

**Footer disclaimer:** verbatim from the legal review, with three different links:
- Terms of Use → the AI Badhaai Box Terms PDF on Google Drive: https://drive.google.com/file/d/1BpS9vXK8kdrQiZYXYwnjXjs0ZPyuqP_h/view?usp=sharing
- T&C → https://www.upgrad.com/terms/
- Privacy Policy → https://www.upgrad.com/privacy/

Validation happens in the browser and again on the server, with the same rules: a 10-digit Indian mobile, a valid email of up to 120 characters, no `<` or `>`, and a Diwali note of up to 400 characters. Only details the visitor saved in the pop-up are ever sent; anything edited and then closed with ✕ stays in the browser. Writes are rate-limited to 120 per IP in fixed 60-second windows, so a busy shared IP (an office, or mobile carrier NAT) recovers every minute. Taps within 0.4 s of a screen or the pop-up appearing are ignored, so a double tap can't tick the consent box or press Save by accident.

**Storage:** Upstash Redis (REST API), every key prefixed `badhai:`:

- `badhai:leads`: hash, `id → lead JSON`
- `badhai:leads:idx`: sorted set of ids by created time
- `badhai:rl:<ip>`: rate-limit counters (a fixed 60 s window, opened with `SET … EX 60 NX`)

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
