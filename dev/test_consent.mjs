// Flow + consent tests for the AI Badhaai Box builder (Playwright, Chromium + WebKit).
// Flow since 4 Nov: who → learning areas → curation → the box → "Get my AI Badhaai Box" or the ₹249 card → details pop-up
// (Me: yours; Someone I love: theirs + yours; consent tick required) → checkout → Pay → Razorpay. Back from Razorpay → homepage.
// Safe on the live URL: lead POSTs never leave the page (fetch is stubbed before the site's scripts run and recorded through a
// binding; page.route is a second fence) and Razorpay is replaced by a stub page.
// Setup once (outside the repo or with node_modules gitignored): npm i playwright && npx playwright install chromium webkit
// Usage: node dev/server.js, then BASE=http://localhost:5250/ ENGINES=chromium,webkit node dev/test_consent.mjs
// (ONLY=happy-me-price-card,back-from-razorpay-home runs a subset). Exit code 1 if any scenario fails. Run one engine at a time on
// a busy laptop (ENGINES=chromium, then ENGINES=webkit).
import { chromium, webkit } from "playwright";

const BASE = process.env.BASE || "http://localhost:5250/";
const ENGINES = (process.env.ENGINES || "chromium,webkit").split(",");
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const SETTLE = 450; // the site ignores taps for 400 ms after a screen or the pop-up appears (double-tap guard): wait like a person

async function fresh(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.phone ? { width: 390, height: 844 } : { width: 1280, height: 860 }, isMobile: !!opts.phone, hasTouch: !!opts.phone });
  const page = await ctx.newPage();
  const t = { ctx, page, leads: [], pays: [], apiReqs: [], errors: [] };
  await page.exposeBinding("__recordLead", (_s, body) => { try { t.leads.push(JSON.parse(body)); } catch { t.leads.push({ raw: body }); } });
  await page.addInitScript(() => {
    const real = window.fetch.bind(window);
    window.fetch = (u, o) => String(u).includes("/api/lead") ? (window.__recordLead((o && o.body) || ""), Promise.resolve(new Response('{"ok":true}', { status: 200 }))) : real(u, o);
  });
  await page.route("**/api/**", r => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.route("https://pages.razorpay.com/**", r => { t.pays.push(r.request().url()); return r.fulfill({ status: 200, contentType: "text/html", body: "<title>Razorpay stub</title>stub" }); });
  page.on("request", r => { if (r.url().includes("/api/")) t.apiReqs.push(r.url()); }); // must stay empty: nothing may reach a lead API
  page.on("pageerror", e => t.errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "load" }); await page.waitForTimeout(600);
  return t;
}
const W = (p, ms) => p.waitForTimeout(ms);
const screen = page => page.evaluate(() => { const s = [...document.querySelectorAll("#builder .screen")].find(x => !x.hidden); return s ? s.dataset.screen : null; });
const popOpen = page => page.evaluate(() => !document.querySelector("#dpop").hidden);
const hasBad = (page, sel) => page.evaluate(s => document.querySelector(s).classList.contains("bad"), sel);
const waitScreen = async (page, name, timeout) => { await page.waitForSelector(`#builder .screen[data-screen="${name}"]:not([hidden])`, timeout ? { timeout } : {}); await W(page, SETTLE); };
async function openBuilder(page) { await page.locator("[data-open-builder]").first().click(); await page.waitForSelector("#builder:not([hidden])"); await W(page, SETTLE); }
async function closeBuilder(page) { await page.click("#bClose"); await page.waitForSelector("#builder", { state: "hidden" }); }
async function pickWho(page, mode) { await page.locator(`.who[data-mode="${mode}"]`).click(); await waitScreen(page, "domain"); }
async function toBox(page) { await page.locator("#domainGrid .dom").first().click(); await waitScreen(page, "reveal", 40000); }
async function detailsFromBox(page, via = "#toCheckout") { await page.click(via); await page.waitForSelector("#dpop:not([hidden])"); await W(page, SETTLE); }
async function fillSelf(page, email) { await page.fill("#g-name", "QA Test"); await page.fill("#g-phone", "9876543210"); await page.fill("#g-email", email || "qa@example.com"); }
async function fillOther(page) { await page.fill("#r-name", "QA Friend"); await page.fill("#r-phone", "9876500000"); await page.fill("#r-email", "friend@example.com"); }
async function tick(page, on = true) { if ((await page.isChecked("#consent")) !== on) await page.click("#consent"); }
async function save(page) { await page.click("#dpopGo"); }
async function closePop(page) { await page.click("#dpop .dpop-x"); await page.waitForSelector("#dpop", { state: "hidden" }); }
async function pressPay(page) { await W(page, SETTLE); await page.click("#form [type=submit]"); await W(page, 1200); }
async function meToCheckout(t, via) { await openBuilder(t.page); await pickWho(t.page, "self"); await toBox(t.page); await detailsFromBox(t.page, via); await fillSelf(t.page); await tick(t.page); await save(t.page); await waitScreen(t.page, "checkout"); }

const SCENARIOS = {
  // Me / Someone I love go straight to the learning areas: no pop-up before the box
  "who-goes-to-learning-areas": async t => {
    await openBuilder(t.page); await pickWho(t.page, "self");
    const a = { screen: await screen(t.page), pop: await popOpen(t.page), title: (await t.page.textContent("#domTitle")).trim() };
    await t.page.click("#bBack"); await waitScreen(t.page, "who"); await pickWho(t.page, "other");
    const b = { screen: await screen(t.page), pop: await popOpen(t.page), title: (await t.page.textContent("#domTitle")).trim() };
    return { pass: a.screen === "domain" && !a.pop && b.screen === "domain" && !b.pop && /you like/.test(a.title) && /they like/.test(b.title) && !t.leads.length,
      detail: `Me -> "${a.screen}" ("${a.title}", pop-up=${a.pop}); Someone I love -> "${b.screen}" ("${b.title}", pop-up=${b.pop}); leads=${t.leads.length}` };
  },
  // the ₹249 card is a button that opens "A little about you", then checkout, then Razorpay
  "happy-me-price-card": async t => {
    await openBuilder(t.page); await pickWho(t.page, "self"); await toBox(t.page); await detailsFromBox(t.page, "#rvPrice");
    const title = (await t.page.textContent("#dpopTitle")).trim(), giftHidden = await t.page.evaluate(() => document.querySelector("#giftFields").hidden);
    await fillSelf(t.page); await tick(t.page); await save(t.page); await waitScreen(t.page, "checkout");
    const people = (await t.page.textContent("#sumPeople")).replace(/\s+/g, " ");
    await pressPay(t.page); const last = t.leads.at(-1) || {};
    return { pass: /little about you/i.test(title) && giftHidden && /QA Test/.test(people) && t.pays.length === 1 && last.stage === "pay" && last.consent === true && last.mode === "self" && !!last.box,
      detail: `pop-up "${title}" (their fields hidden=${giftHidden}); checkout shows "${people.slice(0, 50)}"; pays=${t.pays.length}; stages=${t.leads.map(l => l.stage).join(">")}` };
  },
  // "Get my AI Badhaai Box" for Someone I love opens "Tell us who it's for" (theirs + yours)
  "happy-someone-cta": async t => {
    await openBuilder(t.page); await pickWho(t.page, "other"); await toBox(t.page); await detailsFromBox(t.page, "#toCheckout");
    const title = (await t.page.textContent("#dpopTitle")).trim(), giftShown = await t.page.evaluate(() => !document.querySelector("#giftFields").hidden);
    await fillOther(t.page); await fillSelf(t.page); await tick(t.page); await save(t.page); await waitScreen(t.page, "checkout");
    await pressPay(t.page); const last = t.leads.at(-1) || {};
    return { pass: /who it/i.test(title) && giftShown && t.pays.length === 1 && last.mode === "other" && last.recipient && last.recipient.name === "QA Friend" && last.consent === true,
      detail: `pop-up "${title}" (their fields shown=${giftShown}); pays=${t.pays.length}; mode=${last.mode}; recipient=${last.recipient && last.recipient.name}` };
  },
  // without the tick nothing moves on: the pop-up stays; closing it and tapping the card opens it again, never checkout
  "no-tick-no-checkout": async t => {
    await openBuilder(t.page); await pickWho(t.page, "self"); await toBox(t.page); await detailsFromBox(t.page);
    await fillSelf(t.page); await save(t.page); await W(t.page, 300);
    const hint = (await t.page.textContent("#dpopHint")).trim(), stillOpen = await popOpen(t.page);
    await closePop(t.page); await W(t.page, SETTLE); await detailsFromBox(t.page, "#rvPrice");
    const again = await popOpen(t.page), sc = await screen(t.page);
    return { pass: /tick the box/i.test(hint) && stillOpen && again && sc === "reveal" && !t.leads.length && !t.pays.length,
      detail: `hint "${hint}", pop-up stayed=${stillOpen}; after ✕ the card opens the pop-up again=${again} on "${sc}"; leads=${t.leads.length}` };
  },
  // once details are saved, going back to the box and tapping the card goes straight to checkout
  "card-after-saved-goes-to-checkout": async t => {
    await meToCheckout(t, "#toCheckout");
    await t.page.click("#bBack"); await waitScreen(t.page, "reveal");
    await t.page.click("#rvPrice"); await W(t.page, 600);
    const sc = await screen(t.page), pop = await popOpen(t.page);
    return { pass: sc === "checkout" && !pop, detail: `card after saving -> "${sc}", pop-up=${pop}` };
  },
  "untick-at-checkout-blocks-pay": async t => {
    await meToCheckout(t);
    await t.page.click("#editDetails"); await t.page.waitForSelector("#dpop:not([hidden])"); await W(t.page, SETTLE); await tick(t.page, false); await closePop(t.page);
    await pressPay(t.page);
    const blocked = !t.pays.length && await popOpen(t.page), hint = (await t.page.textContent("#dpopHint")).trim();
    await W(t.page, SETTLE); await tick(t.page); await save(t.page); await t.page.waitForSelector("#dpop", { state: "hidden" });
    await pressPay(t.page);
    return { pass: blocked && /tick the box/i.test(hint) && t.pays.length === 1 && (t.leads.at(-1) || {}).consent === true, detail: `blocked=${blocked}, hint="${hint}"; after tick + save pays=${t.pays.length}` };
  },
  // a triple-click on Pay after abandoning an email edit: later clicks must not press Save (storing the abandoned email) or pay
  "triple-click-pay-saves-nothing": async t => {
    await meToCheckout(t);
    await t.page.click("#editDetails"); await t.page.waitForSelector("#dpop:not([hidden])"); await W(t.page, SETTLE); await t.page.fill("#g-email", "typo@exmaple.com"); await closePop(t.page);
    const before = t.leads.length; await W(t.page, SETTLE);
    await t.page.click("#form [type=submit]", { clickCount: 3, delay: 120 }); await W(t.page, 1000);
    const leaked = t.leads.slice(before).some(l => l.buyer && l.buyer.email === "typo@exmaple.com");
    return { pass: !t.pays.length && !leaked && await popOpen(t.page), detail: `pays=${t.pays.length}, abandoned email sent=${leaked}` };
  },
  // a recipient typed for "Someone I love" and closed with ✕ is never uploaded by the automatic saves
  "abandoned-recipient-not-uploaded": async t => {
    await meToCheckout(t);
    for (const s of ["reveal", "domain", "who"]) { await t.page.click("#bBack"); await waitScreen(t.page, s); }
    await pickWho(t.page, "other"); await toBox(t.page); await detailsFromBox(t.page);
    await t.page.fill("#r-name", "Abandoned Friend"); await t.page.fill("#r-phone", "9876511111"); await t.page.fill("#r-email", "abandoned@example.com"); await closePop(t.page);
    await W(t.page, 1800); // a swap or the box's own save would have gone out by now
    const leaked = t.leads.some(l => JSON.stringify(l).includes("Abandoned"));
    return { pass: !leaked, detail: `abandoned recipient uploaded=${leaked}; saves=${t.leads.map(l => l.stage + ":" + l.mode).join(">")}` };
  },
  // a double-tap on a who card must not also pick a learning area on the next screen
  "double-tap-who-no-ghost-pick": async t => {
    await openBuilder(t.page); await t.page.dblclick('.who[data-mode="self"]'); await W(t.page, 900);
    const sc = await screen(t.page);
    return { pass: sc === "domain", detail: `after a double-tap on "Me": "${sc}" (must stay on the learning areas)` };
  },
  "server-refused-input-caught": async t => {
    await openBuilder(t.page); await pickWho(t.page, "self"); await toBox(t.page); await detailsFromBox(t.page);
    await fillSelf(t.page); await t.page.fill("#g-name", "<>"); await tick(t.page); await save(t.page); await W(t.page, 300);
    const n1 = await hasBad(t.page, "#g-name");
    await t.page.fill("#g-name", "QA Test"); await t.page.fill("#g-email", "a".repeat(115) + "@example.com"); await save(t.page); await W(t.page, 300);
    const n2 = await hasBad(t.page, "#g-email");
    return { pass: n1 && n2 && !t.leads.length && await popOpen(t.page), detail: `name "<>" refused=${n1}, 127-character email refused=${n2}, leads=${t.leads.length}` };
  },
  // Back from Razorpay lands on the homepage: builder closed, top of the page, a fresh flow
  "back-from-razorpay-home": async t => {
    await meToCheckout(t); await pressPay(t.page);
    const onRazorpay = t.pays.length === 1;
    await t.page.goBack({ waitUntil: "load" }); await W(t.page, 1200);
    const s = await t.page.evaluate(() => ({ open: !document.querySelector("#builder").hidden, y: Math.round(scrollY) }));
    await openBuilder(t.page); const sc = await screen(t.page);
    return { pass: onRazorpay && !s.open && s.y <= 5 && sc === "who", detail: `went to Razorpay=${onRazorpay}; after Back builder open=${s.open}, scroll=${s.y}px; Build again -> "${sc}"` };
  },
  "happy-someone-phone": async t => {
    await openBuilder(t.page); await pickWho(t.page, "other"); await toBox(t.page); await detailsFromBox(t.page, "#rvPrice");
    const fits = await t.page.evaluate(() => { const c = document.querySelector(".dpop-card"); return c.scrollHeight <= c.clientHeight + 1; });
    await fillOther(t.page); await fillSelf(t.page); await tick(t.page); await save(t.page); await waitScreen(t.page, "checkout"); await pressPay(t.page);
    return { pass: t.pays.length === 1 && (t.leads.at(-1) || {}).consent === true, detail: `390px phone: sheet fits without scrolling=${fits}; pays=${t.pays.length}; stages=${t.leads.map(l => l.stage).join(">")}` };
  },
};

const out = [];
for (const name of ENGINES) {
  const browser = await (name === "webkit" ? webkit : chromium).launch();
  for (const [key, fn] of Object.entries(SCENARIOS)) {
    if (ONLY && !ONLY.includes(key)) continue;
    const t = await fresh(browser, { phone: key.endsWith("-phone") });
    let r;
    try { r = await Promise.race([fn(t), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out after 90 s")), 90000))]); }
    catch (e) { r = { pass: false, detail: "ERROR " + String(e).split("\n")[0] }; }
    if (t.apiReqs.length) { r.pass = false; r.detail += ` | ${t.apiReqs.length} API request(s) left the page`; }
    if (t.errors.length) { r.pass = false; r.detail += ` | page errors: ${t.errors.join(" ; ").slice(0, 200)}`; }
    out.push({ engine: name, scenario: key, ...r });
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${name.padEnd(8)} ${key.padEnd(36)} ${r.detail}`);
    await t.ctx.close();
  }
  await browser.close();
}
const failed = out.filter(r => !r.pass).length;
console.log(`\n${out.length - failed}/${out.length} passed on ${BASE}`);
process.exit(failed ? 1 : 0);
