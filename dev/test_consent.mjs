// Consent-gate tests for the AI Badhai Box builder (Playwright, Chromium + WebKit).
// Safe on the live URL: lead POSTs never leave the page (fetch is stubbed before the site's scripts run and
// recorded through a binding; page.route is a second fence) and the Razorpay page is replaced by a stub.
// Setup once (outside the repo or with node_modules gitignored): npm i playwright && npx playwright install chromium webkit
// Usage: node dev/server.js, then BASE=http://localhost:5250/ ENGINES=chromium,webkit node dev/test_consent.mjs
// (ONLY=skip-path-closed,happy-me runs a subset). Exit code 1 if any scenario fails.
import { chromium, webkit } from "playwright";

const BASE = process.env.BASE || "http://localhost:5251/";
const ENGINES = (process.env.ENGINES || "chromium,webkit").split(",");
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const SETTLE = 450; // the site ignores taps for 400 ms after a screen or the pop-up appears (double-tap guard), so wait like a person would

async function fresh(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.mobile ? { width: 390, height: 844 } : { width: 1280, height: 860 },
    isMobile: !!opts.mobile && browser.browserType().name() !== "firefox", hasTouch: !!opts.mobile,
  });
  const page = await ctx.newPage();
  const t = { ctx, page, leads: [], pays: [], routeHits: 0, errors: [] };
  await page.exposeBinding("__recordLead", (_src, body) => { try { t.leads.push(JSON.parse(body)); } catch { t.leads.push({ raw: body }); } });
  await page.addInitScript(() => {
    const real = window.fetch.bind(window);
    window.fetch = (u, o) => {
      if (String(u).includes("/api/lead")) { window.__recordLead(o && o.body || ""); return Promise.resolve(new Response('{"ok":true}', { status: 200, headers: { "Content-Type": "application/json" } })); }
      return real(u, o);
    };
  });
  await page.route("**/api/**", async r => { t.routeHits++; await r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }); });
  await page.route("https://pages.razorpay.com/**", async r => { t.pays.push(r.request().url()); await r.fulfill({ status: 200, contentType: "text/html", body: "<title>PAY-STUB</title>stub" }); });
  page.on("pageerror", e => t.errors.push(String(e)));
  t.apiReqs = []; page.on("request", req => { if (req.url().includes("/api/")) t.apiReqs.push(req.url()); }); // must stay empty: nothing may reach a lead API
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  return t;
}

const screen = page => page.evaluate(() => { const s = [...document.querySelectorAll("#builder .screen")].find(x => !x.hidden); return s ? s.dataset.screen : null; });
const popOpen = page => page.evaluate(() => !document.querySelector("#dpop").hidden);
const hasBad = (page, sel) => page.evaluate(s => document.querySelector(s).classList.contains("bad"), sel);
async function openBuilder(page) { await page.locator("[data-open-builder]").first().click(); await page.waitForSelector("#builder:not([hidden])"); await page.waitForTimeout(SETTLE); }
async function closeBuilder(page) { await page.click("#bClose"); await page.waitForSelector("#builder", { state: "hidden" }); }
async function pickWho(page, mode) { await page.locator(`.who[data-mode="${mode}"]`).click(); await page.waitForSelector("#dpop:not([hidden])"); await page.waitForTimeout(SETTLE); }
async function fillSelf(page, email) { await page.fill("#g-name", "QA Test"); await page.fill("#g-phone", "9876543210"); await page.fill("#g-email", email || "qa@example.com"); }
async function fillOther(page) { await page.fill("#r-name", "QA Friend"); await page.fill("#r-phone", "9876500000"); await page.fill("#r-email", "friend@example.com"); }
async function tick(page, on = true) { if ((await page.isChecked("#consent")) !== on) await page.click("#consent"); }
async function save(page) { await page.click("#dpopGo"); }
async function closePop(page) { await page.click("#dpop .dpop-x"); await page.waitForSelector("#dpop", { state: "hidden" }); }
async function domainToCheckout(page) {
  await page.waitForSelector('#builder .screen[data-screen="domain"]:not([hidden])'); await page.waitForTimeout(SETTLE);
  await page.locator("#domainGrid .dom").first().click();
  await page.waitForSelector('#builder .screen[data-screen="reveal"]:not([hidden])', { timeout: 40000 });
  await page.waitForTimeout(SETTLE);
  await page.click("#toCheckout");
  await page.waitForSelector('#builder .screen[data-screen="checkout"]:not([hidden])'); await page.waitForTimeout(SETTLE);
}
async function pressPay(page) { await page.waitForTimeout(SETTLE); await page.click("#form [type=submit]"); await page.waitForTimeout(1200); }
async function savedSelfToCheckout(t) { await openBuilder(t.page); await pickWho(t.page, "self"); await fillSelf(t.page); await tick(t.page); await save(t.page); await domainToCheckout(t.page); }

const SCENARIOS = {
  // the reported hole: name typed, pop-up closed unticked, builder closed and reopened
  "skip-path-closed": async t => {
    await openBuilder(t.page); await pickWho(t.page, "self"); await t.page.fill("#g-name", "Skip Test"); await closePop(t.page);
    await closeBuilder(t.page); await openBuilder(t.page);
    const sc = await screen(t.page);
    return { pass: sc === "who" && t.leads.length === 0 && t.pays.length === 0, detail: `reopened on "${sc}" (was "domain" before the fix), leads=${t.leads.length}, pays=${t.pays.length}` };
  },
  "popup-needs-tick": async t => {
    await openBuilder(t.page); await pickWho(t.page, "self"); await fillSelf(t.page); await save(t.page); await t.page.waitForTimeout(300);
    const open = await popOpen(t.page), hint = (await t.page.textContent("#dpopHint")).trim(), sc = await screen(t.page);
    return { pass: open && /tick the box/i.test(hint) && sc === "who" && t.leads.length === 0, detail: `pop-up still open=${open}, hint="${hint}", screen=${sc}, leads=${t.leads.length}` };
  },
  "happy-me": async t => {
    await savedSelfToCheckout(t); await pressPay(t.page);
    const last = t.leads.at(-1) || {};
    return { pass: t.pays.length === 1 && last.stage === "pay" && last.consent === true && !!last.consentAt && last.mode === "self", detail: `pays=${t.pays.length}, stages=${t.leads.map(l => l.stage).join(">")}, consent=${last.consent}, mode=${last.mode}` };
  },
  "happy-someone": async t => {
    await openBuilder(t.page); await pickWho(t.page, "other"); await fillOther(t.page); await fillSelf(t.page); await tick(t.page); await save(t.page);
    await domainToCheckout(t.page); await pressPay(t.page);
    const last = t.leads.at(-1) || {};
    return { pass: t.pays.length === 1 && last.stage === "pay" && last.consent === true && last.mode === "other" && last.recipient && last.recipient.name === "QA Friend", detail: `pays=${t.pays.length}, stages=${t.leads.map(l => l.stage).join(">")}, mode=${last.mode}, recipient=${last.recipient && last.recipient.name}` };
  },
  "untick-at-checkout-blocks-pay": async t => {
    await savedSelfToCheckout(t);
    await t.page.click("#editDetails"); await t.page.waitForSelector("#dpop:not([hidden])"); await t.page.waitForTimeout(SETTLE); await tick(t.page, false); await closePop(t.page);
    await pressPay(t.page);
    const blocked = t.pays.length === 0 && await popOpen(t.page), hint = (await t.page.textContent("#dpopHint")).trim(), bad = await hasBad(t.page, ".consent");
    await t.page.waitForTimeout(SETTLE); await tick(t.page); await save(t.page); await t.page.waitForSelector("#dpop", { state: "hidden" });
    const sc = await screen(t.page); await pressPay(t.page);
    const last = t.leads.at(-1) || {};
    return { pass: blocked && /tick the box/i.test(hint) && bad && sc === "checkout" && t.pays.length === 1 && last.consent === true, detail: `blocked=${blocked}, hint="${hint}", box flagged=${bad}; after tick+save on "${sc}", pays=${t.pays.length}, consent=${last.consent}` };
  },
  "bad-email-at-checkout-blocks-pay": async t => {
    await savedSelfToCheckout(t);
    await t.page.click("#editDetails"); await t.page.waitForSelector("#dpop:not([hidden])"); await t.page.waitForTimeout(SETTLE); await t.page.fill("#g-email", "abc"); await closePop(t.page);
    await pressPay(t.page);
    const blocked = t.pays.length === 0 && await popOpen(t.page), hint = (await t.page.textContent("#dpopHint")).trim(), bad = await hasBad(t.page, "#g-email");
    await t.page.waitForTimeout(SETTLE); await t.page.fill("#g-email", "new@example.com"); await save(t.page); await t.page.waitForSelector("#dpop", { state: "hidden" });
    await pressPay(t.page);
    const last = t.leads.at(-1) || {};
    return { pass: blocked && /highlighted/i.test(hint) && bad && t.pays.length === 1 && last.buyer && last.buyer.email === "new@example.com", detail: `blocked=${blocked}, hint="${hint}", email flagged=${bad}; after fix pays=${t.pays.length}, paid with email=${last.buyer && last.buyer.email}` };
  },
  "switch-to-someone-then-close-blocks-pay": async t => {
    await openBuilder(t.page); await pickWho(t.page, "self"); await fillSelf(t.page); await tick(t.page); await save(t.page);
    await t.page.waitForSelector('#builder .screen[data-screen="domain"]:not([hidden])'); await t.page.waitForTimeout(SETTLE); await t.page.click("#bBack");
    await t.page.waitForSelector('#builder .screen[data-screen="who"]:not([hidden])'); await t.page.waitForTimeout(SETTLE);
    await pickWho(t.page, "other"); await closePop(t.page); await closeBuilder(t.page); await openBuilder(t.page);
    const reopened = await screen(t.page);
    await domainToCheckout(t.page); await pressPay(t.page);
    const blocked = t.pays.length === 0 && await popOpen(t.page), hint = (await t.page.textContent("#dpopHint")).trim(), bad = await hasBad(t.page, "#r-name");
    await t.page.waitForTimeout(SETTLE); await fillOther(t.page); await save(t.page); await t.page.waitForSelector("#dpop", { state: "hidden" }); await pressPay(t.page);
    const last = t.leads.at(-1) || {};
    return { pass: reopened === "domain" && blocked && /highlighted/i.test(hint) && bad && t.pays.length === 1 && last.mode === "other" && last.recipient && last.recipient.name === "QA Friend", detail: `reopened on "${reopened}", blocked=${blocked}, hint="${hint}", their name flagged=${bad}; after filling pays=${t.pays.length}, mode=${last.mode}` };
  },
  "edit-without-changes-still-pays": async t => {
    await savedSelfToCheckout(t);
    await t.page.click("#editDetails"); await t.page.waitForSelector("#dpop:not([hidden])"); await t.page.waitForTimeout(SETTLE); await t.page.keyboard.press("Escape"); await t.page.waitForSelector("#dpop", { state: "hidden" });
    await pressPay(t.page);
    return { pass: t.pays.length === 1, detail: `pays=${t.pays.length} (looking at details and closing them must not block Pay)` };
  },
  // a double-click on Pay after unticking: the 2nd click lands on the reopened pop-up (the consent box sat under Pay) and must not tick it
  "double-click-pay-does-not-tick": async t => {
    await savedSelfToCheckout(t);
    await t.page.click("#editDetails"); await t.page.waitForSelector("#dpop:not([hidden])"); await t.page.waitForTimeout(SETTLE); await tick(t.page, false); await closePop(t.page);
    await t.page.dblclick("#form [type=submit]"); await t.page.waitForTimeout(800);
    const ticked = await t.page.isChecked("#consent"), open = await popOpen(t.page);
    return { pass: !ticked && open && t.pays.length === 0, detail: `consent ticked by the 2nd click=${ticked}, pop-up open=${open}, pays=${t.pays.length}` };
  },
  // triple-click on Pay after abandoning an email edit: later clicks must not hit Save (which would store the abandoned email) or pay
  "triple-click-pay-saves-nothing": async t => {
    await savedSelfToCheckout(t);
    await t.page.click("#editDetails"); await t.page.waitForSelector("#dpop:not([hidden])"); await t.page.waitForTimeout(SETTLE); await t.page.fill("#g-email", "typo@exmaple.com"); await closePop(t.page);
    const before = t.leads.length;
    await t.page.click("#form [type=submit]", { clickCount: 3, delay: 120 }); await t.page.waitForTimeout(1000);
    const leaked = t.leads.slice(before).some(l => l.buyer && l.buyer.email === "typo@exmaple.com");
    return { pass: t.pays.length === 0 && !leaked && await popOpen(t.page), detail: `pays=${t.pays.length}, abandoned email sent=${leaked}, pop-up open=${await popOpen(t.page)}` };
  },
  // details typed for "Someone I love" and closed with ✕ must never be uploaded by the later automatic saves
  "abandoned-recipient-not-uploaded": async t => {
    await openBuilder(t.page); await pickWho(t.page, "self"); await fillSelf(t.page); await tick(t.page); await save(t.page);
    await t.page.waitForSelector('#builder .screen[data-screen="domain"]:not([hidden])'); await t.page.waitForTimeout(SETTLE); await t.page.click("#bBack");
    await t.page.waitForSelector('#builder .screen[data-screen="who"]:not([hidden])'); await t.page.waitForTimeout(SETTLE);
    await pickWho(t.page, "other"); await t.page.fill("#r-name", "Abandoned Friend"); await t.page.fill("#r-phone", "9876511111"); await t.page.fill("#r-email", "abandoned@example.com"); await closePop(t.page);
    await closeBuilder(t.page); await openBuilder(t.page); await domainToCheckout(t.page);
    const leaked = t.leads.some(l => JSON.stringify(l).includes("Abandoned")), modes = [...new Set(t.leads.map(l => l.mode))].join(",");
    return { pass: !leaked && modes === "self", detail: `abandoned recipient uploaded=${leaked}, modes sent=${modes}, saves=${t.leads.map(l => l.stage).join(">")}` };
  },
  // inputs the server would refuse are refused in the pop-up, so no consented visitor goes on without a stored lead
  "server-refused-input-caught": async t => {
    await openBuilder(t.page); await pickWho(t.page, "self"); await fillSelf(t.page); await t.page.fill("#g-name", "<>"); await tick(t.page); await save(t.page); await t.page.waitForTimeout(300);
    const n1 = await hasBad(t.page, "#g-name");
    await t.page.fill("#g-name", "QA Test"); await t.page.fill("#g-email", "qa<1>@example.com"); await save(t.page); await t.page.waitForTimeout(300);
    const n2 = await hasBad(t.page, "#g-email");
    await t.page.fill("#g-email", "a".repeat(115) + "@example.com"); await save(t.page); await t.page.waitForTimeout(300);
    const n3 = await hasBad(t.page, "#g-email"), max = await t.page.getAttribute("#note", "maxlength");
    return { pass: n1 && n2 && n3 && t.leads.length === 0 && max === "400" && await popOpen(t.page), detail: `name "<>" refused=${n1}, email with <> refused=${n2}, 127-char email refused=${n3}, note maxlength=${max}, leads=${t.leads.length}` };
  },
  // a double-tap on Continue must not also pick a learning area on the next screen
  "double-tap-continue-no-ghost-pick": async t => {
    await openBuilder(t.page); await pickWho(t.page, "self"); await fillSelf(t.page); await tick(t.page);
    await t.page.dblclick("#dpopGo"); await t.page.waitForTimeout(900);
    const sc = await screen(t.page);
    return { pass: sc === "domain", detail: `screen after a double-tap on Continue: "${sc}" (should stay on the learning-area choice)` };
  },
  // Pay reopened for valid-but-unsaved details says why
  "unsaved-details-hint": async t => {
    await savedSelfToCheckout(t);
    await t.page.click("#editDetails"); await t.page.waitForSelector("#dpop:not([hidden])"); await t.page.waitForTimeout(SETTLE); await t.page.fill("#g-name", "QA Test2"); await closePop(t.page);
    await pressPay(t.page);
    const hint = (await t.page.textContent("#dpopHint")).trim();
    return { pass: t.pays.length === 0 && /save your details/i.test(hint), detail: `pays=${t.pays.length}, hint="${hint}"` };
  },
  "happy-me-phone": async t => {
    await savedSelfToCheckout(t); await pressPay(t.page);
    const last = t.leads.at(-1) || {};
    return { pass: t.pays.length === 1 && last.stage === "pay" && last.consent === true, detail: `390px phone: pays=${t.pays.length}, stages=${t.leads.map(l => l.stage).join(">")}` };
  },
};

const out = [];
for (const name of ENGINES) {
  const browser = await (name === "webkit" ? webkit : chromium).launch();
  for (const [key, fn] of Object.entries(SCENARIOS)) {
    if (ONLY && !ONLY.includes(key)) continue;
    const t = await fresh(browser, { mobile: key.endsWith("-phone") });
    let r;
    try { r = await Promise.race([fn(t), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out after 90 s")), 90000))]); }
    catch (e) { r = { pass: false, detail: "ERROR " + String(e).split("\n")[0] }; }
    if (t.routeHits || t.apiReqs.length) { r.pass = false; r.detail += ` | ${t.apiReqs.length} API request(s) left the page, ${t.routeHits} caught by page.route (fetch stub bypassed)`; }
    if (t.errors.length) r.detail += ` | page errors: ${t.errors.join(" ; ").slice(0, 200)}`;
    out.push({ engine: name, scenario: key, ...r });
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${name.padEnd(8)} ${key.padEnd(40)} ${r.detail}`);
    await t.ctx.close();
  }
  await browser.close();
}
const failed = out.filter(r => !r.pass).length;
console.log(`\n${out.length - failed}/${out.length} passed on ${BASE}`);
process.exit(failed ? 1 : 0);
