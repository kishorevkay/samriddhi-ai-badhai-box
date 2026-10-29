(function(){
  if (window.__DEVICE_WRAP) return; // the phone-frame view only hosts the site in an iframe
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function(s){ return document.querySelector(s); };
  // course cards in the box: paper-cut icon (assets/cards/<key>.webp, sliced from gift_box/card_icons/card_icons_grid.png) + a short vertical name
  var CARDS = { ai: "AI", data: "DATA", sql: "SQL", stats: "STATS", code: "CODE", cloud: "CLOUD", ml: "ML", security: "CYBER",
    seo: "SEO", social: "SOCIAL", email: "EMAIL", lead: "LEAD", strategy: "PLAN", design: "DESIGN", bigmove: "CAREER" };
  // what drops into the box during curation, per domain (each curation line's drop key → card; "short" drops two)
  var DOMAIN_CARDS = {
    data: { ai: ["ai"], mastery: ["data"], short: ["sql", "stats"], bigger: ["bigmove"], free: ["ml"] },
    tech: { ai: ["ai"], mastery: ["code"], short: ["ml", "cloud"], bigger: ["bigmove"], free: ["security"] },
    mkt:  { ai: ["ai"], mastery: ["social"], short: ["seo", "email"], bigger: ["bigmove"], free: ["design"] },
    mgmt: { ai: ["ai"], mastery: ["lead"], short: ["strategy", "stats"], bigger: ["bigmove"], free: ["design"] }
  };
  var SHORT_NAME = { data: "Data", tech: "Tech", mkt: "Marketing", mgmt: "Management" };
  var ICONS = {
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7zM19 15c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5z"/></svg>'
  };

  /* ---------- gift box: Shriya's ivory + gold box as layers (assets/box/*.webp share one 1260 x 1100 frame) ----------
     Course cards sit between the box's inside and its body, so the front wall hides their lower half; positions are in that frame.
     wallY(x) = top edge of the front + right walls, measured on the art. */
  function wallY(x){ return x <= 893 ? 521 + 0.174 * (x - 38) : 670 - 0.928 * (x - 893); }
  // fill order (index) → position; back row is painted first
  var SLOTS = [{x:540,r:-3,row:"f"},{x:660,r:3,row:"b"},{x:780,r:6,row:"f"},{x:398,r:-6,row:"b"},{x:290,r:-9,row:"f"},{x:900,r:7,row:"b"},{x:1010,r:10,row:"f"}];
  function boxSVG(el){
    var cards = SLOTS.map(function(s, i){ return { s:s, i:i }; }).sort(function(a, b){ return a.s.row === b.s.row ? 0 : (a.s.row === "b" ? -1 : 1); }).map(function(o){ var s = o.s;
      var top = wallY(s.x) - (s.row === "b" ? 320 : 272); // enough peeks out to show the icon and the whole name
      return '<div class="gb-slot" data-i="' + o.i + '" style="left:' + ((s.x - 72) / 12.6).toFixed(2) + '%;top:' + (top / 11).toFixed(2) + '%"><div class="gb-card" style="--r:' + s.r + 'deg"><img class="gb-ic" alt="" draggable="false"><span class="gb-lbl"></span></div></div>'; }).join("");
    el.innerHTML = '<div class="gb-shadow"></div><div class="gb-tilt"><div class="gb-pop"><div class="gb-float">' +
      '<img class="gb-layer" src="assets/box/inside.webp" alt="" draggable="false"><div class="gb-light"></div><div class="gb-cards">' + cards + '</div>' +
      '<img class="gb-layer" src="assets/box/body.webp" alt="" draggable="false">' +
      '<div class="gb-layer gb-lid"><div class="gb-lidbob"><img class="gb-layer" src="assets/box/lid.webp" alt="" draggable="false"></div></div></div></div></div>';
  }
  function fill(el, keys){ el.querySelectorAll(".gb-slot").forEach(function(g){ var i = +g.dataset.i, on = i < keys.length; g.classList.toggle("on", on);
    if (on && g.dataset.k !== keys[i]){ g.dataset.k = keys[i]; g.querySelector(".gb-ic").src = "assets/cards/" + keys[i] + ".webp"; g.querySelector(".gb-lbl").textContent = CARDS[keys[i]]; } }); }
  function domainCards(id){ var m = DOMAIN_CARDS[id]; return [].concat(m.ai, m.mastery, m.short, m.bigger, m.free); }
  function bump(el){ el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  function jiggle(el){ el.classList.remove("jiggle"); void el.offsetWidth; el.classList.add("jiggle"); setTimeout(function(){ el.classList.remove("jiggle"); }, 500); }
  // the box's mouth on screen, for sparkle bursts that come out of it
  function mouth(el){ var r = el.getBoundingClientRect(); return { left: r.left + r.width * .5, top: r.top + r.height * .38, width: 0, height: 0 }; }
  var curBox = $("#curBox"), doneBox = $("#doneBox");
  boxSVG(curBox); boxSVG(doneBox);

  /* ---------- hero: aunty and uncle take turns asking the visitor a career question ----------
     Each character is a stack of same-size images: base, plus optional talk (mouth open) and blink frames.
     Speaking = bubble slides in from their side, mouth flaps, a small nod and hand move; everything else idles. */
  (function(){
    var LINES = [["aunty", "Job lagi?"], ["uncle", "Abhi bhi rent pe?"], ["aunty", "Promotion mila?"], ["uncle", "Salary badhi?"], ["aunty", "Ab aage kya?"]];
    var chars = {}; document.querySelectorAll(".char").forEach(function(c){ chars[c.dataset.who] = c; });
    var hero = $(".v3-hero"), onScreen = true, i = 0, loopT = 0, narrow = matchMedia("(max-width: 640px)");
    if (!chars.aunty || !chars.uncle) return;
    if (reduce){ chars.aunty.classList.add("said"); chars.uncle.classList.add("said"); return; }
    // the hero stays pinned while the page slides over it, so "on screen" = not yet fully covered by the next section
    var next = hero.nextElementSibling;
    function check(){ onScreen = !next || next.getBoundingClientRect().top > 40; }
    addEventListener("scroll", check, { passive: true }); check();
    function busy(){ return !onScreen || document.hidden || document.body.classList.contains("lock"); }
    function flap(c, ms){ // mouth: swaps to the talk frame at speech rhythm (only when that frame exists)
      if (!c.querySelector(".fig-talk")) return;
      var end = performance.now() + ms;
      (function tick(){ if (performance.now() > end){ c.classList.remove("mouth"); return; }
        c.classList.toggle("mouth"); setTimeout(tick, 90 + Math.random() * 90); })();
    }
    function say(who, text){
      var c = chars[who], b = c.querySelector(".c-bubble");
      // phones: one bubble at a time (two side by side don't fit)
      if (narrow.matches) Object.keys(chars).forEach(function(k){ if (k !== who) chars[k].classList.remove("said"); });
      b.textContent = text; c.classList.remove("said"); void b.offsetWidth; c.classList.add("said", "speaking");
      flap(c, 1100);
      setTimeout(function(){ c.classList.remove("speaking"); }, 1400);
      setTimeout(function(){ if (b.textContent === text) c.classList.remove("said"); }, 3300);
    }
    function loop(){
      if (busy()){ loopT = setTimeout(loop, 600); return; }
      var L = LINES[i % LINES.length]; i++; say(L[0], L[1]);
      loopT = setTimeout(loop, 2200);
    }
    // blinks, each on its own random clock
    Object.keys(chars).forEach(function(k){ var c = chars[k];
      (function blink(){ setTimeout(function(){ if (c.querySelector(".fig-blink") && !busy()){ c.classList.add("blink"); setTimeout(function(){ c.classList.remove("blink"); }, 140); } blink(); }, 2600 + Math.random() * 2800); })(); });
    setTimeout(loop, 700);
  })();

  /* ---------- pinned hero: the page slides up over it like a card; the hero shrinks and dims a little as it gets covered ----------
     sticky top = viewport height − hero height (≤ 0), so a hero taller than the screen is still seen in full before it pins */
  (function(){
    var hero = $(".v3-hero"), next = hero && hero.nextElementSibling, dim = hero && hero.querySelector(".v3-dim"), stage = hero && hero.querySelector(".v3-stage"), ticking = false;
    if (!hero || !next) return;
    // short screens: the stage (designed 700px tall) scales down to fit under the hanging logos, so bubbles never hit them
    var fit = 1;
    function pinTop(){
      var wide = innerWidth > 640, room = innerHeight - (wide ? 130 : 0);
      fit = wide ? Math.max(.62, Math.min(1.2, room / 700, (innerWidth - 60) / 1180)) : 1; // big screens grow a little, up to 1.2×
      hero.style.setProperty("--stage-h", Math.round(700 * fit) + "px");
      hero.style.top = Math.min(0, innerHeight - hero.offsetHeight) + "px";
    }
    function update(){ ticking = false;
      var p = Math.max(0, Math.min(1, 1 - next.getBoundingClientRect().top / innerHeight)); // 0 = not covered yet, 1 = covered
      stage.style.transform = (innerWidth > 640 ? "translateX(-50%) " : "") + "scale(" + (fit * (reduce ? 1 : 1 - p * .06)).toFixed(4) + ") translateY(" + (reduce ? 0 : p * -30).toFixed(1) + "px)";
      dim.style.opacity = (p * .55).toFixed(3);
    }
    addEventListener("scroll", function(){ if (!ticking){ ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("resize", function(){ pinTop(); update(); });
    pinTop(); update();
    // smooth, weighted scrolling on desktop (Lenis); phones keep native touch scrolling
    addEventListener("load", function(){
      if (!window.Lenis || !finePointer || reduce) return;
      var lenis = new Lenis({ lerp: .085, wheelMultiplier: .9, anchors: true });
      (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
      // the builder is a fixed overlay with its own scroll: freeze the page while it is open
      new MutationObserver(function(){ document.body.classList.contains("lock") ? lenis.stop() : lenis.start(); }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    });
  })();

  /* ---------- course cards strip under the slides: icon + short name, drifting sideways ---------- */
  (function(){
    var t = $("#csTrack"); if (!t) return;
    var keys = ["ai", "data", "code", "seo", "lead", "cloud", "ml", "sql", "social", "stats", "security", "email", "strategy", "design", "bigmove"];
    var one = keys.map(function(k){ return '<div class="cs-card"><img src="assets/cards/' + k + '.webp" alt="" loading="lazy" width="256" height="256"><span>' + CARDS[k] + '</span></div>'; }).join("");
    t.innerHTML = one + one; // two copies so the loop is seamless
  })();

  /* ---------- "There’s a lot packed inside" carousel: centre tile in focus, neighbours scaled down and blurred.
     Two of them: one on the landing page, one in the reveal screen (Scroll 6). Each [data-carousel] wraps its own .carousel + .c-dots ---------- */
  document.querySelectorAll("[data-carousel]").forEach(function(wrapEl){
    var root = wrapEl.querySelector(".carousel"), track = wrapEl.querySelector(".c-track"), dotsEl = wrapEl.querySelector(".c-dots"), n = TILES.length;
    var inBuilder = !!wrapEl.closest(".builder");
    var pos = 0, target = 0, dragging = false, dragX = 0, dragStart = 0, dragId = null, wasDrag = false;
    var hovering = false, focused = false, lastAuto = performance.now();
    var tiles = TILES.map(function(t, i){
      var el = document.createElement("article"); el.className = "c-tile"; el.setAttribute("aria-label", t.t);
      el.innerHTML = '<div class="c-img"><img alt="" loading="lazy" src="assets/tiles/' + t.img + '.webp"><span class="c-ph" aria-hidden="true">✦</span></div>' +
        '<div class="c-txt"><h3>' + t.t + '</h3></div>';
      var img = el.querySelector("img");
      img.addEventListener("error", function(){ el.classList.add("pending"); });
      img.addEventListener("load", function(){ el.classList.remove("pending"); });
      el.addEventListener("click", function(){ if (!wasDrag) go(i); });
      track.appendChild(el);
      var dot = document.createElement("i"); dotsEl.appendChild(dot);
      return el;
    });
    function wrap(d){ d = ((d % n) + n) % n; return d > n / 2 ? d - n : d; }
    var speed = 0, lastT = 0, snapping = false;
    function go(i){ var d = wrap(i - Math.round(pos)); target = Math.round(pos) + d; snapping = true; }
    function step(k){ target = Math.round(pos) + k; snapping = true; }
    wrapEl.querySelector(".c-arrow.prev").addEventListener("click", function(){ step(-1); });
    wrapEl.querySelector(".c-arrow.next").addEventListener("click", function(){ step(1); });
    root.addEventListener("keydown", function(e){ if (e.key === "ArrowRight"){ step(1); e.preventDefault(); } if (e.key === "ArrowLeft"){ step(-1); e.preventDefault(); } });
    // hover and keyboard focus pause autoplay independently; a tap must not leave it paused
    root.addEventListener("pointerenter", function(e){ if (e.pointerType === "mouse") hovering = true; });
    root.addEventListener("pointerleave", function(){ hovering = false; });
    root.addEventListener("focusin", function(){ focused = root.matches(":focus-visible") || !!root.querySelector(":focus-visible"); });
    root.addEventListener("focusout", function(){ focused = false; });
    // drag / swipe: primary pointer only, horizontal only; vertical page scroll stays native (touch-action: pan-y)
    root.addEventListener("pointerdown", function(e){
      if ((e.target.closest && e.target.closest(".c-arrow")) || !e.isPrimary || e.button !== 0) return;
      dragging = true; dragId = e.pointerId; dragStart = e.clientX; dragX = 0; wasDrag = false;
    });
    addEventListener("pointermove", function(e){ if (!dragging || e.pointerId !== dragId) return; dragX = e.clientX - dragStart; if (Math.abs(dragX) > 6) wasDrag = true; });
    function endDrag(e, cancelled){
      if (!dragging || (e && e.pointerId !== dragId)) return;
      dragging = false; dragId = null;
      // pos already follows the finger (target - dragX/sp), so snap to the tile it is showing
      // let go: keep gliding from wherever the finger left it (no snap), so the motion stays seamless
      target = pos; dragX = 0; snapping = false;
    }
    addEventListener("pointerup", function(e){ endDrag(e, false); });
    addEventListener("pointercancel", function(e){ endDrag(e, true); });
    function spacing(){ return Math.min(root.clientWidth * 0.62, 330); }
    (function tick(t){
      // also idle while its screen is hidden, and the landing one while the builder covers it
      var paused = hovering || focused || document.hidden || !root.offsetParent || (!inBuilder && document.body.classList.contains("lock"));
      // continuous glide: the strip drifts at a steady speed, eases down to a crawl under the cursor, and
      // keyboard/arrow/dot moves still snap with a spring. Speed is in tiles per second.
      var dt = Math.min(.05, (t - (lastT || t)) / 1000); lastT = t;
      var want = (reduce || dragging || focused || document.hidden || !root.offsetParent || (!inBuilder && document.body.classList.contains("lock"))) ? 0 : (hovering ? .1 : .55);
      speed += (want - speed) * Math.min(1, dt * 3);  // ease between cruise and crawl, never a hard stop
      var sp = spacing();
      if (dragging){ pos = target - dragX / sp; }
      else if (Math.abs(target - pos) > .002 && snapping){ pos += (target - pos) * (reduce ? 1 : .12); if (Math.abs(target - pos) < .01){ pos = target; snapping = false; } }
      else { pos += speed * dt; target = pos; snapping = false; }
      var active = ((Math.round(pos) % n) + n) % n;
      tiles.forEach(function(el, i){
        var d = wrap(i - pos), a = Math.abs(d), s = 1 - Math.min(a, 2.2) * .13;
        var op = Math.max(0, Math.min(1, 1 - (a - 2) / .6));
        el.style.transform = "translate(-50%, -50%) translateX(" + (d * sp) + "px) scale(" + s + ")";
        // the tile passing through the middle stays sharp; blur only builds up beyond half a tile out
        var fb = Math.max(0, Math.min(a, 2) - .5) / 1.5;
        el.style.filter = fb <= 0 ? "none" : "blur(" + (fb * 6).toFixed(2) + "px) brightness(" + (1 - fb * .26).toFixed(3) + ")";
        el.style.opacity = op;
        el.style.pointerEvents = op < .05 ? "none" : "";
        el.style.zIndex = String(100 - Math.round(a * 10));
        el.classList.toggle("on", i === active);
      });
      dotsEl.querySelectorAll("i").forEach(function(dt, i){ dt.classList.toggle("on", i === active); });
      requestAnimationFrame(tick);
    })(performance.now());
  });

  var PAY_URL = "https://pages.razorpay.com/pl_TtbakCLHtirsSY/view"; // Kish, 2026-10-29

  /* ---------- lead capture → /api/lead (Upstash, read in /admin). One row per visit, updated as the visitor moves on ---------- */
  var leadId = "";
  function newLeadId(){ return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)); }
  function sendLead(stage){
    if (!leadId || location.protocol === "file:") return;
    var v = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ""; };
    var other = state.mode === "other";
    var body = { id: leadId, stage: stage, mode: state.mode, domain: state.domain ? state.domain.name : "",
      buyer: { name: v("g-name"), phone: v("g-phone"), email: v("g-email") },
      recipient: other ? { name: v("r-name"), phone: v("r-phone"), email: v("r-email"), note: v("note") } : null,
      source: (function(){ var u = new URLSearchParams(location.search); ["frame", "device", "screens"].forEach(function(k){ u.delete(k); }); return u.toString().slice(0, 160); })() };
    try { fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(function(){}); } catch (e) {}
  }
  /* ---------- builder navigation ---------- */
  var builder = $("#builder"), state = { mode: null, domain: null, screen: "who" };
  var DOT = { who: 1, domain: 2, curate: 2, reveal: 3, checkout: 4, done: 4 };
  var BACK = { domain: "who", reveal: "domain", checkout: "reveal" };
  // every delayed step of the flow goes through later(), and any screen change cancels what's pending
  var flowTimers = [];
  function later(fn, ms){ flowTimers.push(setTimeout(fn, ms)); }
  function clearFlow(){ flowTimers.forEach(clearTimeout); flowTimers = []; }
  var behind = Array.prototype.slice.call(document.querySelectorAll("body > header, body > section, body > footer")), returnFocus = null;
  builder.querySelectorAll(".screen h2").forEach(function(h){ h.tabIndex = -1; });
  function go(name){
    clearFlow();
    state.screen = name;
    builder.querySelectorAll(".screen").forEach(function(s){ var on = s.dataset.screen === name; s.hidden = !on; if (on){ s.classList.remove("enter"); void s.offsetWidth; s.classList.add("enter"); } });
    builder.querySelectorAll(".b-dots i").forEach(function(d, i){ d.classList.toggle("on", i < DOT[name]); });
    $("#bBack").disabled = !BACK[name];
    builder.scrollTop = 0;
    var h = builder.querySelector('.screen[data-screen="' + name + '"] h2'); if (h) h.focus({ preventScroll: true });
  }
  function open(){
    if (!builder.hidden) return;
    returnFocus = document.activeElement;
    behind.forEach(function(el){ el.inert = true; });
    builder.hidden = false; builder.classList.remove("enter"); void builder.offsetWidth; builder.classList.add("enter"); document.body.classList.add("lock");
    go(state.mode && $("#g-name").value.trim() ? "domain" : "who");
    startBuilderBg();
  }
  function close(){
    clearFlow(); builder.hidden = true; if (dpop) dpop.hidden = true; document.body.classList.remove("lock");
    behind.forEach(function(el){ el.inert = false; });
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
  }
  document.querySelectorAll("[data-open-builder]").forEach(function(b){ b.addEventListener("click", open); });
  $("#bClose").addEventListener("click", close);
  $("#bBack").addEventListener("click", function(){ if (BACK[state.screen]) go(BACK[state.screen]); });
  document.addEventListener("keydown", function(e){ if (e.key !== "Escape" || builder.hidden) return; if (!dpop.hidden) closeDetails(); else close(); });

  /* ---------- gold-foil sheen + gentle tilt on the big tap cards ---------- */
  function tilt(card){
    if (reduce || !finePointer) return;
    card.addEventListener("pointermove", function(e){ var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.transform = "rotateY(" + ((x - .5) * 10) + "deg) rotateX(" + ((.5 - y) * 8) + "deg) translateY(-4px)";
      card.style.setProperty("--sx", (x * 100) + "%"); card.style.setProperty("--sy", (y * 100) + "%"); });
    card.addEventListener("pointerleave", function(){ card.style.transform = ""; });
  }

  /* step 1 · who */
  document.querySelectorAll(".who").forEach(function(c){ tilt(c); c.addEventListener("click", function(){ state.mode = c.dataset.mode; burst(c, 8); later(function(){ openDetails(c); }, 180); }); });

  /* ---------- details pop-up: right after the who-pick. "Me" = your details; "Someone you love" = theirs + yours ----------
     Continue validates, saves and moves on to the domains; checkout later shows them as a summary with "Edit details". */
  var dpop = $("#dpop"), dform = $("#detailsForm"), dReturn = null, dThen = "domain";
  function openDetails(from, then){
    var other = state.mode === "other";
    dReturn = from || null; dThen = then || "domain";
    $("#dpopTitle").textContent = other ? "Tell us who it’s for." : "A little about you.";
    $("#giftFields").hidden = !other;
    $("#selfLegend").className = other ? "" : "sr-only";
    $("#selfLine").hidden = other;
    $("#dpopGo").innerHTML = dThen === "checkout" ? "Save details" : 'Continue <span aria-hidden="true">→</span>';
    $("#dpopHint").textContent = ""; $("#dpopHint").classList.remove("err");
    dform.querySelectorAll(".bad").forEach(function(x){ x.classList.remove("bad"); });
    dpop.hidden = false; dpop.classList.remove("enter"); void dpop.offsetWidth; dpop.classList.add("enter");
    var first = dform.querySelector("fieldset:not([hidden]) input"); if (first) first.focus({ preventScroll: true });
  }
  function closeDetails(){ dpop.hidden = true; if (dReturn && dReturn.focus) dReturn.focus({ preventScroll: true }); }
  dpop.querySelectorAll("[data-dclose]").forEach(function(b){ b.addEventListener("click", closeDetails); });
  dform.addEventListener("input", function(e){ e.target.classList.remove("bad"); });
  dform.addEventListener("submit", function(e){ e.preventDefault();
    var ok = ["r-name", "r-phone", "r-email", "g-name", "g-phone", "g-email"].map(valid).every(Boolean), hint = $("#dpopHint");
    if (!ok){ hint.textContent = "Check the highlighted details."; hint.classList.add("err"); var bad = dform.querySelector(".bad"); if (bad) bad.focus(); return; }
    dpop.hidden = true;
    if (!leadId) leadId = newLeadId();
    sendLead(state.domain ? "curated" : "details");
    $("#domTitle").textContent = state.mode === "other" ? "What would they like to learn?" : "What would you like to learn?";
    if (dThen === "checkout") showCheckout(); else go("domain");
  });

  /* step 2 · domain */
  var dg = $("#domainGrid");
  DOMAINS.forEach(function(d){
    var b = document.createElement("button"); b.className = "tcard dom"; b.dataset.id = d.id;
    b.innerHTML = '<span class="dom-img"><img src="assets/course/' + d.tile + '.webp" alt="" loading="lazy" width="720" height="523"></span><span class="th">' + d.name + '</span><span class="tgo">Choose ' + d.name + ' →</span><span class="sheen"></span>';
    tilt(b); b.addEventListener("click", function(){ state.domain = d; burst(b, 8); later(startCuration, 220); });
    dg.appendChild(b);
  });

  /* ---------- curation: lines tick in while gifts drop into the box ---------- */
  function startCuration(){
    go("curate");
    var lines = CURATION[state.mode], ol = $("#curLines"), cols = [];
    ol.innerHTML = ""; curBox.classList.add("open"); curBox.classList.remove("tied"); fill(curBox, []);
    var step = reduce ? 120 : 760, t = 300;
    lines.forEach(function(L, i){
      var text = L[0].replace("{d}", state.domain.name), drop = L[1], last = i === lines.length - 1;
      later(function(){
        ol.querySelectorAll("li").forEach(function(x){ x.classList.remove("now"); });
        var li = document.createElement("li"); li.textContent = text; if (last) li.className = "final"; ol.appendChild(li);
        requestAnimationFrame(function(){ li.classList.add("in", "now"); });
        if (drop && drop !== "done"){ cols = cols.concat(DOMAIN_CARDS[state.domain.id][drop] || []); fill(curBox, cols); bump(curBox); }
        if (drop === "done"){ later(function(){ curBox.classList.remove("open"); }, 200); later(function(){ curBox.classList.add("tied"); bump(curBox); burst(curBox, 12); }, 750); }
      }, t);
      t += last ? 0 : step;
    });
    later(showReveal, t + (reduce ? 300 : 1900));
  }

  /* ---------- scrolls 5 + 6 · reveal: the curated box, exactly as the copy lists it for this domain ---------- */
  // paper-cut tile on top of each "What's inside" card (course_tiles/output, cropped to a band in assets/course)
  var GROUP_TILES = { "essential": "g1_the_essential", "mastery track": "g2_mastery_track", "short courses": "g3_short_courses", "ai learning": "g4_ai_learning", "free courses": "g5_free_courses", "for the bigger move": "g6_bigger_move" };
  function esc(t){ return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function groupHTML(G){
    var cls = "group" + (G.wide ? " wide" : "") + (G.big ? " wide big" : "") + (G.items && G.items.length > 4 && !G.big ? " free" : "");
    var tile = GROUP_TILES[G.k.toLowerCase().replace(/^the /, "")];
    var h = '<div class="' + cls + '">' + (tile ? '<div class="g-img"><img src="assets/course/' + tile + '.webp" alt="" loading="lazy" width="720" height="523"></div>' : '') + '<div class="gk">' + esc(G.k) + '</div>';
    if (G.intro) h += '<p class="gd">' + esc(G.intro) + '</p>';
    if (G.big && G.t) h += '<div class="bigitem"><div class="bt">' + esc(G.t) + '</div>' + (G.by ? '<div class="bb">' + esc(G.by) + '</div>' : '') + '</div>';
    else if (G.t) h += '<div class="gt">' + esc(G.t) + '</div>';
    if (G.d) h += '<p class="gd">' + esc(G.d) + '</p>';
    if (G.m) h += '<span class="gm' + (G.coupon ? ' coupon' : '') + '">' + esc(G.m) + '</span>';
    if (G.items) h += "<ul>" + G.items.map(function(x){ return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
    if (G.note) h += '<p class="gnote">' + esc(G.note) + '</p>';
    if (G.tag) h += '<span class="gm">' + esc(G.tag) + '</span>';
    return h + "</div>";
  }
  function showReveal(){
    var d = state.domain, other = state.mode === "other";
    sendLead("curated");
    $("#rvName").textContent = d.name;
    $("#rvCurated").textContent = d.curated;
    $("#rvLine").textContent = d.line;
    $("#rvEdition").textContent = d.edition;
    $("#rvGroups").innerHTML = d.groups.map(groupHTML).join("");
    $("#toCheckout").textContent = other ? "Send their AI Badhai Box for ₹249" : "Get my AI Badhai Box for ₹249";
    go("reveal");
    // plain timers (not later()): leaving the screen early must not leave cards hidden
    document.querySelectorAll("#rvGroups .group").forEach(function(el, i){ setTimeout(function(){ el.classList.add("in"); }, reduce ? 0 : 120 + i * 140); });
  }

  /* ---------- scroll 7 · payment: summary of the selection and the saved details, then Razorpay ---------- */
  function val(id){ var el = $("#" + id); return el ? el.value.trim() : ""; }
  function setCheckout(other, root){
    var q = function(id){ return (root || document).querySelector("#" + id + (root ? "-self" : "")); };
    q("coTitle").textContent = other ? "Give them something for the next career question." : "Ready for a better answer next time?";
    q("coSub").innerHTML = other ? "Their AI Badhai Box is ready.<br>Send it for ₹249." : "Your AI Badhai Box is ready.<br>Unlock it for ₹249.";
    q("sumDomain").textContent = state.domain.name;
    q("sumFor").textContent = other ? "Someone I love" : "Me";
    var row = function(k, v){ return '<div class="sum-row"><span class="sum-k">' + k + '</span><span class="sum-v">' + esc(v) + '</span></div>'; };
    var people = "";
    if (other) people += row("Sending to", [val("r-name"), val("r-phone"), val("r-email")].filter(Boolean).join(" · "));
    people += row(other ? "From" : "Your details", [val("g-name"), val("g-phone"), val("g-email")].filter(Boolean).join(" · "));
    q("sumPeople").innerHTML = people;
    q("payBtn").textContent = other ? "Send their AI Badhai Box for ₹249" : "Get my AI Badhai Box for ₹249";
  }
  function showCheckout(){
    setCheckout(state.mode === "other");
    $("#formHint").textContent = ""; $("#formHint").classList.remove("err");
    go("checkout");
  }
  $("#toCheckout").addEventListener("click", showCheckout);
  $("#changeSel").addEventListener("click", function(){ go("domain"); });
  $("#editDetails").addEventListener("click", function(e){ openDetails(e.currentTarget, "checkout"); });
  function valid(id){ var el = $("#" + id); if (!el || el.closest("[hidden]")) return true; var v = el.value.trim(), ok = !!v;
    if (ok && el.inputMode === "numeric") ok = /^[6-9]\d{9}$/.test(v); if (ok && el.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); el.classList.toggle("bad", !ok); return ok; }
  $("#form").addEventListener("submit", function(e){ e.preventDefault();
    sendLead("pay");
    location.href = PAY_URL; // details were checked in the pop-up; payment happens on Razorpay's page
  });
  // after-payment screen, kept for when Razorpay redirects back (not wired yet)
  function showDone(){
    var other = state.mode === "other";
    $("#doneH").textContent = other ? "Their AI Badhai Box is ready. ✨" : "Your AI Badhai Box is ready. ✨";
    $("#doneP").textContent = "";
    fill(doneBox, domainCards(state.domain.id)); doneBox.classList.add("open"); doneBox.classList.remove("tied");
    go("done");
    later(function(){ doneBox.classList.remove("open"); }, 600);
    later(function(){ doneBox.classList.add("tied"); bump(doneBox); burst(doneBox, 14); }, 1150);
  }
  $("#again").addEventListener("click", function(){ state.domain = null; state.mode = null; leadId = ""; dform.reset(); go("who"); });

  /* ---------- hero background: the living rangoli (v6: stars, click-glow rangoli, corner lotus) with drifting embers (v2) above it.
     Init order matters: each inserts its canvas as the first child, so embers first, rangoli second puts embers on top. */
  var heroEl = $(".v3-hero");
  if (heroEl && window.BGFX && BGFX.v2 && BGFX.v6){ try { heroEl.dataset.bgfx = "overlay"; heroEl.dataset.fxStrings = "off"; BGFX.v2.init(heroEl); BGFX.v6.init(heroEl);
    var hc = heroEl.querySelectorAll(":scope > canvas"); if (hc[0]) hc[0].dataset.fx = "scene"; if (hc[1]) hc[1].dataset.fx = "embers"; } catch (e){ console.error(e); } }

  /* ---------- builder background: small living rangoli (bgfx v6), started the first time the builder opens ----------
     The screens cover most of it, so pointer events on the builder are forwarded to the layer to keep it reacting everywhere. */
  var bbg = $("#builderBg"), bbgOn = false;
  function startBuilderBg(){ if (bbgOn || !window.BGFX || !BGFX.v6) return; bbgOn = true; try { bbg.dataset.fxStrings = "off"; BGFX.v6.init(bbg); } catch (e){ console.error(e); } }
  ["pointermove", "pointerdown", "pointerleave"].forEach(function(type){
    builder.addEventListener(type, function(e){ if (e.target === bbg) return; bbg.dispatchEvent(new PointerEvent(type, { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary })); }, { passive: true });
  });

  /* ---------- sparkle cursor: the real pointer stays visible (no lag); a light gold sparkle trail follows it, small burst on click ---------- */
  var cv = $("#cursorFx"), ctx = cv.getContext("2d"), parts = [], lastX = -999, lastY = -999;
  var SPARK = "#F3D9A0";
  function size(){ var dpr = Math.min(devicePixelRatio || 1, 2); cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); addEventListener("resize", size);
  function star(x, y, r, a, rot){ ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.globalAlpha = a; ctx.beginPath();
    ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * .18, -r * .18, r, 0); ctx.quadraticCurveTo(r * .18, r * .18, 0, r); ctx.quadraticCurveTo(-r * .18, r * .18, -r, 0); ctx.quadraticCurveTo(-r * .18, -r * .18, 0, -r); ctx.fill(); ctx.restore(); }
  function burst(el, n){ if (reduce) return; var r = el.getBoundingClientRect ? el.getBoundingClientRect() : el; if (!r.width && !r.height && el.getBoundingClientRect) return; var x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (var i = 0; i < n; i++){ var a = i / n * 6.283 + Math.random() * .4, v = 1.4 + Math.random() * 1.2; parts.push({ x:x, y:y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, r:2.2 + Math.random() * 2, l:1, d:.028, rot:Math.random() }); } }
  if (finePointer && !reduce){
    document.documentElement.classList.add("fx");
    addEventListener("pointermove", function(e){
      if (e.pointerType !== "mouse") return;
      var x = e.clientX, y = e.clientY, d = Math.hypot(x - lastX, y - lastY);
      if (d > 600){ lastX = x; lastY = y; return; } // re-entry jump: no streak across the screen
      // a sparkle every ~16px along the path, offset a little behind the tip so it never covers the pointer
      for (var k = 16; k <= d; k += 16){ var t = k / d, px = lastX + (x - lastX) * t, py = lastY + (y - lastY) * t;
        parts.push({ x:px + 6 + (Math.random() - .5) * 5, y:py + 10 + (Math.random() - .5) * 5, vx:(Math.random() - .5) * .3, vy:.25, r:1.5 + Math.random() * 1.7, l:.9, d:.045, rot:Math.random() * 3 }); }
      if (d >= 16){ lastX = x; lastY = y; }
    }, { passive: true });
    // pointer left the window or the tab lost focus: the next move starts fresh, so no streak from the exit point
    var resetTrail = function(){ lastX = lastY = -999; };
    document.documentElement.addEventListener("mouseleave", resetTrail);
    addEventListener("blur", resetTrail);
  }
  addEventListener("pointerdown", function(e){ if (reduce) return; for (var i = 0; i < 8; i++){ var a = i / 8 * 6.283, v = 1.6 + Math.random() * .8; parts.push({ x:e.clientX, y:e.clientY, vx:Math.cos(a) * v, vy:Math.sin(a) * v, r:2.4, l:1, d:.035, rot:a }); } parts.push({ ring:1, x:e.clientX, y:e.clientY, l:1, d:.06 }); });
  var drawn = false;
  (function tick(){
    if (parts.length || drawn){
      ctx.clearRect(0, 0, innerWidth, innerHeight); drawn = parts.length > 0;
      if (parts.length > 160) parts.splice(0, parts.length - 160);
      for (var i = parts.length - 1; i >= 0; i--){ var p = parts[i]; p.l -= p.d; if (p.l <= 0){ parts.splice(i, 1); continue; }
        if (p.ring){ ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(243,217,160," + (p.l * .7) + ")"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + (1 - p.l) * 22, 0, 6.283); ctx.stroke(); continue; }
        p.vx *= .94; p.vy *= .94; p.x += p.vx; p.y += p.vy; ctx.fillStyle = SPARK; star(p.x, p.y, p.r * (0.6 + p.l * .4), p.l, p.rot); }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(tick);
  })();

  /* ---------- ?screens=1: every builder step laid out on one static page, for importing into Figma ---------- */
  if (new URLSearchParams(location.search).get("screens") === "1") (function(){
    document.documentElement.classList.add("screens-mode");
    behind.forEach(function(el){ el.hidden = true; el.inert = false; });
    builder.hidden = false; builder.removeAttribute("aria-modal");
    // sample state: a Marketing gift for someone else
    state.mode = "other"; state.domain = DOMAINS.filter(function(d){ return d.id === "mkt"; })[0];
    showReveal(); clearFlow();
    var screens = Array.prototype.slice.call(builder.querySelectorAll(".screen"));
    screens.forEach(function(s){ s.hidden = false; s.classList.remove("enter"); });
    document.querySelectorAll("#rvGroups .group").forEach(function(g){ g.classList.add("in"); });
    // curation: show the finished state with every line visible
    var ol = $("#curLines"); ol.innerHTML = "";
    CURATION.other.forEach(function(L, i, arr){ var li = document.createElement("li"); li.textContent = L[0].replace("{d}", state.domain.name); li.className = "in" + (i === arr.length - 1 ? " final now" : ""); ol.appendChild(li); });
    fill(curBox, domainCards("mkt")); curBox.classList.remove("open"); curBox.classList.add("tied");
    // checkout: the "someone else" form, plus a copy showing the "me" variant
    var co = builder.querySelector('[data-screen="checkout"]');
    $("#r-name").value = "Amma"; $("#r-phone").value = "9876543210"; $("#r-email").value = "amma@example.com";
    $("#g-name").value = "Kish"; $("#g-phone").value = "9876501234"; $("#g-email").value = "kish@example.com";
    setCheckout(true);
    var self = co.cloneNode(true); self.dataset.screen = "checkout-self";
    self.querySelectorAll("[id]").forEach(function(el){ el.id = el.id + "-self"; });
    co.after(self); setCheckout(false, self);
    // success
    $("#doneH").textContent = "Their AI Badhai Box is ready. ✨";
    $("#doneP").textContent = "Draft: no payment was taken.";
    fill(doneBox, domainCards("mkt")); doneBox.classList.remove("open"); doneBox.classList.add("tied");
    // a label above each screen
    var LABELS = { who: "Scroll 2 · Who’s it for?", domain: "Scroll 3 · Choose a domain", curate: "Scroll 4 · Curation (animated in the live site)", reveal: "Scrolls 5 + 6 · Marketing & AI example", checkout: "Scroll 7 · Payment, someone you love", "checkout-self": "Scroll 7 · Payment, me", done: "After payment (draft)" };
    builder.querySelectorAll(".screen").forEach(function(s){ var p = document.createElement("p"); p.className = "screen-label"; p.textContent = LABELS[s.dataset.screen] || s.dataset.screen; s.prepend(p); });
  })();
})();
