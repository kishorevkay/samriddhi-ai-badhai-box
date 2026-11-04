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

**Flow (since 4 Nov):**
1. Who it's for.
2. The learning area.
3. Curation.
4. The box. Its "Get my AI Badhaai Box for ₹249" button and the gold ₹249 card both open the details pop-up: "Me" asks for your name, mobile and email; "Someone I love" asks for theirs, a Diwali note, and yours. The consent tick is required.
5. Checkout.
6. Razorpay.

Nobody is asked for details before they've seen their box, so a lead is written the first time the pop-up is saved, and it starts at `curated`.

The builder writes **one lead per visit** and updates it as the visitor moves through:

| Stage | When it's saved | Shown in /admin as |
|---|---|---|
| `details` | Details saved before any box was shown. Since 4 Nov the pop-up opens from the box, so new leads skip this stage | Filled details |
| `curated` | The details pop-up is saved from the box (and again when a course is swapped) | Saw their box |
| `pay` | The pay button is pressed (the visitor goes to Razorpay) | Pressed pay |

Each lead stores: `id`, `created`, `updated`, `stage`, `mode` (`self` / `other`), `domain`, `buyer {name, phone, email}`, `recipient {name, phone, email, note}` (gifts only), `consent` (always `true`) with `consentAt` (ISO time the box was ticked), `box` (the exact courses: `essential`, `mastery`, `short[]`, `ai[]`, `free[]`, `bigger[]`), `device`, `source` (UTM / query string), `site` (which copy of the site sent it, e.g. `www.upgrad.com` or `samriddhi-gift-draft.vercel.app`, shown under the device in `/admin` and as the last CSV column).

**Where leads came from ("Came from" in `/admin`):**
- What each lead stores:
  - `source`: the landing link's query string (UTM tags plus any ad click id: Meta's `fbclid`, Google's `gclid`, …).
  - `ref`: the referring page or app (host + path).
- Both are taken from the page the visitor first landed on in that tab, and kept through reloads and Back.
- How `/admin` picks the label, first match wins:
  1. A messaging `utm_medium` (email, sms, push, whatsapp).
  2. `utm_source`: Instagram, Facebook, Messenger, Meta, Google, YouTube, LinkedIn, X, WhatsApp, Telegram, SMS, Push, Email (CleverTap, Netcore, MoEngage, …), upGrad website, QR / offline, Bing, and so on. Partner placements: `Zepto_BRD` → **Zepto**, `Zomato_BRD` → **Zomato**, `GPay_BRD` → **GPay**. Any other `<Name>_BRD` shows as `<Name>`, and any other `utm_source` shows as written.
  3. An ad click id the platform adds by itself: `fbclid` → Meta (Instagram or Facebook going by the referrer), `gclid`/`gbraid`/`wbraid` → Google, `msclkid` → Bing, `li_fat_id` → LinkedIn, and more.
  4. The referring site or app: Instagram, Facebook, Gmail and other mail apps, Google, YouTube, WhatsApp, upgrad.com, …
  5. Otherwise "Direct / unknown".
- Paid clicks (a click id, or a paid / cpc / paid_social medium) get " ad", e.g. "Instagram ad". The line under the label is campaign · ad set or keyword (`utm_term`) · ad (`utm_content`) · `placement`.
- `/admin` also has a "From" filter and a "From ads" tile.
- The CSV adds `came_from`, `campaign`, `ad`, `referrer`, `medium`, `ad_set_or_keyword` and `placement`.

**Tracking links: copy, then replace the `<…>` parts (lowercase, underscores, no spaces).**
⚠️ **Always use the trailing slash: `https://www.upgrad.com/your-diwali-gift/?…`.** Without the `/` before the `?`, upgrad.com answers with a 302 redirect to `/your-diwali-gift/` that drops every UTM tag, and those leads show as "Direct / unknown". Checked on 4 Nov 2026.

| Where the link runs | Add after `https://www.upgrad.com/your-diwali-gift/?` | Shows in /admin as |
|---|---|---|
| Meta ads (Ads Manager → Ad → Tracking → URL parameters; Meta fills the `{{…}}`) | `utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}&placement={{placement}}` | Instagram ad / Facebook ad / Messenger ad · campaign · ad set · ad · placement |
| Partner placements (campaign team's format) | `utm_source=Zepto_BRD&utm_medium=Brand&utm_campaign=ind_brd_leadgen_All_Diwali_2026` (or `Zomato_BRD`, `GPay_BRD`, `<Partner>_BRD`) | Zepto / Zomato / GPay / <Partner> · campaign |
| Instagram bio / story / post | `utm_source=instagram&utm_medium=organic_social&utm_campaign=diwali_badhaai&utm_content=<bio\|story\|post_name>` | Instagram |
| Facebook post | `utm_source=facebook&utm_medium=organic_social&utm_campaign=diwali_badhaai&utm_content=<post_name>` | Facebook |
| Emailer (CleverTap) | `utm_source=clevertap&utm_medium=email&utm_campaign=diwali_badhaai&utm_content=<email_name>` | Email |
| Push notification (CleverTap) | `utm_source=clevertap&utm_medium=push&utm_campaign=diwali_badhaai&utm_content=<push_name>` | Push notification |
| SMS | `utm_source=sms&utm_medium=sms&utm_campaign=diwali_badhaai` | SMS |
| WhatsApp broadcast | `utm_source=whatsapp&utm_medium=whatsapp&utm_campaign=diwali_badhaai&utm_content=<message_name>` | WhatsApp |
| Google Ads (auto-tagging adds `gclid`; Final URL suffix) | `utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&utm_content={creative}` | Google ad |
| YouTube ads | `utm_source=youtube&utm_medium=paid_video&utm_campaign=<name>&utm_content=<video_name>` | YouTube ad |
| LinkedIn ads | `utm_source=linkedin&utm_medium=paid_social&utm_campaign=<name>&utm_content=<ad_name>` | LinkedIn ad |
| upGrad website banner | `utm_source=upgrad&utm_medium=website&utm_campaign=diwali_badhaai&utm_content=<banner_name>` | upGrad website |
| QR code / poster | `utm_source=qr&utm_medium=offline&utm_campaign=diwali_badhaai&utm_content=<where_it_is>` | QR / offline |
| Creator / influencer | `utm_source=<creator_name>&utm_medium=influencer&utm_campaign=diwali_badhaai` | <creator_name> |

**Hosting a copy elsewhere (e.g. upgrad.com/your-diwali-gift/):** the site is plain static files and works under any sub-path; every path is relative. A static host has no `/api` of its own, so leads always go to the Vercel API at `https://samriddhi-gift-draft.vercel.app/api/lead` (`LEAD_API` in `app.js`; same-origin `/api/lead` on Vercel and localhost). They are sent as a `text/plain` body so the cross-site POST needs no CORS preflight, and `api/lead.js` allows any origin. If you build your own lead API, point `LEAD_API` at it.

**Courses in `/admin` and the CSV:** the "Courses in the box" column and the CSV `courses` column list every course the visitor ended up with, comma-separated, in box order. Institutions are in brackets (e.g. "MBA (Golden Gate University)"), so no course name contains a comma and the list splits cleanly. Leads from before 2 Nov 2026 have no courses.

**Consent:** the details pop-up has a required, unticked-by-default checkbox with the sentence from the legal review, word for word: "By ticking this box, you agree to our Privacy Policy and Terms & Conditions." Privacy Policy links to https://www.upgrad.com/privacy/ and Terms & Conditions to https://www.upgrad.com/terms/. The visitor can't continue without the tick, and `api/lead.js` rejects any lead without `consent: true`. Pay checks again: if the details pop-up was closed with ✕ instead of saved (box unticked, details changed, or "Me" switched to "Someone I love"), Pay reopens the pop-up instead of going to Razorpay. Reopening the builder skips ahead to the courses only after details have been saved once. **Back from Razorpay** lands on the homepage, not on the payment screen: the builder closes, the flow starts fresh and the page goes to the top. This works whether the browser restores the page from its back/forward cache (`pageshow` with `persisted` after a Pay click) or reloads it (scroll restoration off on back/forward loads). Consent is stored in the lead JSON (and in the `/admin` JSON), but it isn't a column in the `/admin` table or CSV yet.

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
