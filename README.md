# AI Badhai Box by upGrad · Samriddhi On. Sawaal Gone.

upGrad's Diwali 2026 microsite. Visitors build a personalised AI-learning gift ("AI Badhai Box") for themselves or someone they love, then pay ₹249.

- **Live site:** https://samriddhi-gift-draft.vercel.app
- **Leads dashboard:** https://samriddhi-gift-draft.vercel.app/admin (PIN-protected; ask the marketing team for the PIN)

> **For the product team: leads are already being captured.** Every visitor who fills the details pop-up is saved to the database and shows up live in `/admin`, with their stage in the funnel, the domain they picked and the campaign source (UTM). The dashboard can export everything as CSV. Details below.

---

## What's in here

Plain static site + two serverless functions. No framework, no build step, no npm dependencies.

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The site: hero, "How it works", what's inside, and the full-screen builder (scrolls 2–7 of the copy). |
| `data.js` | **All campaign copy**: domains, what's inside each edition, curation lines, carousel tiles. Edit copy here. |
| `device.js` | Desktop "📱 Mobile view" toggle for reviewers (phone-frame preview of the same page). |
| `bgfx/v2.js`, `bgfx/v6.js` | Reactive canvas backgrounds (floating embers, click-glow rangoli). |
| `admin.html` | Leads dashboard at `/admin`. |
| `api/lead.js` | `POST /api/lead`: saves and updates a lead. |
| `api/admin.js` | `GET /api/admin`: returns all leads (needs the admin PIN). |
| `api/_lib.js`, `api/_mem.js` | Redis helper (Upstash REST, plain `fetch`) and an in-memory store for local dev. |
| `dev/server.js` | Local server that runs the site and the API together. |
| `assets/` | Images (WebP): characters, course tiles, step icons, logos. |
| `vercel.json` | Region `bom1` (Mumbai, next to the database), security headers, `noindex` on `/admin` and `/api`. |

## How lead capture works

The builder writes **one lead per visit** and updates it as the visitor moves through:

| Stage | When it's saved | Shown in /admin as |
|---|---|---|
| `details` | After the details pop-up ("Me" → your name/mobile/email; "Someone I love" → their name/mobile/email + Diwali note, and yours) | Filled details |
| `curated` | A domain is picked and the curated box is shown | Saw their box |
| `pay` | The pay button is pressed (the visitor goes to Razorpay) | Pressed pay |

Each lead stores: `id`, `created`, `updated`, `stage`, `mode` (`self` / `other`), `domain`, `buyer {name, phone, email}`, `recipient {name, phone, email, note}` (gifts only), `device`, `source` (UTM / query string).

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
