/* Background fireworks: a few soft bursts at a time behind the content (hero + footer).
   Colours come from the page tokens (--gold, --gold-hi, --cream, --red), read on every burst, so a palette change follows live.
   Runs only while its section is on screen and the tab is visible; skipped entirely with prefers-reduced-motion. */
(function () {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { window.Fireworks = { mount: function () { return { launch: function () {} }; } }; return; }
  var TAU = Math.PI * 2;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  // blend two #rrggbb colours (t = share of b); anything else falls back to a
  function mix(a, b, t) {
    var A = /^#([0-9a-f]{6})$/i.exec(a), B = /^#([0-9a-f]{6})$/i.exec(b); if (!A || !B) return a;
    var out = "#"; for (var i = 0; i < 6; i += 2) { var v = Math.round(parseInt(A[1].substr(i, 2), 16) * (1 - t) + parseInt(B[1].substr(i, 2), 16) * t); out += (v < 16 ? "0" : "") + v.toString(16); }
    return out;
  }

  // opts: zone = [x0, x1, y0, y1] as fractions of the section where bursts open (xs = [[x0, x1], …] picks one of several column bands instead); every = [min, max] seconds between launches;
  //       z = z-index of the canvas; opacity = overall strength
  function mount(el, opts) {
    opts = opts || {};
    var zone = opts.zone || [0.08, 0.92, 0.12, 0.45], every = opts.every || [1.3, 2.6];
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "fx-fireworks";
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;z-index:" + (opts.z == null ? 0 : opts.z) + ";opacity:" + (opts.opacity || 0.85);
    var after = opts.after ? el.querySelector(opts.after) : null;
    if (after) after.after(canvas); else el.insertBefore(canvas, el.firstChild);
    var ctx = canvas.getContext("2d"), W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1);
    var rockets = [], sparks = [], next = 0.6, last = 0, running = false, onScreen = false, raf = 0, small = false;

    function size() {
      var r = el.getBoundingClientRect(); W = r.width; H = r.height; small = W < 640;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    function palette() {
      var cs = getComputedStyle(el), g = function (n, f) { return cs.getPropertyValue(n).trim() || f; };
      var p = { gold: g("--gold", "#E2B65A"), hi: g("--gold-hi", "#F3D9A0"), cream: g("--cream", "#F8EFDF"), accent: g("--red", "#EE2C3C") };
      // mostly cream-white and a soft rose from the accent; gold is only a small share (Kish: "not too much yellow")
      p.white = mix(p.cream, "#FFFFFF", 0.6); p.rose = mix(p.accent, p.cream, 0.45); p.blush = mix(p.accent, p.cream, 0.7);
      p.mix = [p.white, p.white, p.cream, p.rose, p.rose, p.blush, p.gold];
      return p;
    }

    function launch() {
      var p = palette(), xr = opts.xs ? pick(opts.xs) : zone, x = W * rnd(xr[0], xr[1]), ty = H * rnd(zone[2], zone[3]);
      rockets.push({ x: x + (opts.xs ? 0 : rnd(-30, 30)), y: H + 8, tx: x, ty: ty, t: 0, dur: rnd(0.9, 1.25), trail: [], col: p.cream, pal: p });
    }
    function burst(r) {
      var p = r.pal, type = pick(["peony", "peony", "ring", "peony", "ring", "willow"]), R = Math.min(W, H) * (small ? 0.24 : 0.2) * rnd(0.85, 1.15);
      var n = Math.round((type === "ring" ? 40 : type === "willow" ? 56 : 72) * (small ? 0.6 : 1));
      var outer = type === "willow" ? p.gold : pick(p.mix), inner = pick([p.white, p.rose, p.blush, p.cream]);
      if (inner === outer) inner = p.white;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * TAU + rnd(-0.08, 0.08), sp = type === "ring" ? 1 : Math.sqrt(Math.random()) * rnd(0.85, 1.05);
        var v = R * sp * (type === "willow" ? 1.7 : 2.5);
        sparks.push({ x: r.tx, y: r.ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: type === "willow" ? rnd(0.32, 0.45) : rnd(0.45, 0.65),
          drag: type === "willow" ? 1.6 : 2.4, grav: type === "willow" ? 70 : 46, col: sp < 0.45 ? inner : outer, w: type === "willow" ? 1.6 : rnd(1.6, 2.4),
          crackle: type === "peony" && Math.random() < 0.18, trail: [] });
      }
      // a soft glow where it opens
      sparks.push({ glow: true, x: r.tx, y: r.ty, life: 1, decay: 2.2, r: R * 0.9, col: outer });
    }

    function frame(now) {
      raf = 0;
      if (!running) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      next -= dt;
      if (next <= 0) { launch(); if (Math.random() < (small ? 0.2 : 0.35)) setTimeout(launch, rnd(220, 520)); next = rnd(every[0], every[1]) * (small ? 1.25 : 1); }
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (var i = rockets.length - 1; i >= 0; i--) {
        var r = rockets[i]; r.t += dt / r.dur;
        var e = 1 - Math.pow(1 - Math.min(1, r.t), 3);
        var x = r.x + (r.tx - r.x) * e, y = (H + 8) + (r.ty - H - 8) * e;
        r.trail.push([x, y]); if (r.trail.length > 10) r.trail.shift();
        for (var k = 1; k < r.trail.length; k++) {
          ctx.globalAlpha = (k / r.trail.length) * 0.45; ctx.strokeStyle = r.col; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(r.trail[k - 1][0], r.trail[k - 1][1]); ctx.lineTo(r.trail[k][0], r.trail[k][1]); ctx.stroke();
        }
        if (r.t >= 1) { rockets.splice(i, 1); burst(r); }
      }
      for (var j = sparks.length - 1; j >= 0; j--) {
        var s = sparks[j]; s.life -= s.decay * dt;
        if (s.life <= 0) { sparks.splice(j, 1); continue; }
        if (s.glow) {
          var gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
          ctx.globalAlpha = s.life * 0.22; gr.addColorStop(0, s.col); gr.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); continue;
        }
        var f = Math.exp(-s.drag * dt); s.vx *= f; s.vy = s.vy * f + s.grav * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.trail.push([s.x, s.y]); if (s.trail.length > 8) s.trail.shift();
        var al = Math.min(1, s.life * 1.4) * 0.9;
        if (s.crackle && s.life < 0.45) al *= Math.random() < 0.5 ? 1.4 : 0.15;
        ctx.strokeStyle = s.col; ctx.lineWidth = s.w;
        for (var t = 1; t < s.trail.length; t++) {
          ctx.globalAlpha = al * (t / s.trail.length);
          ctx.beginPath(); ctx.moveTo(s.trail[t - 1][0], s.trail[t - 1][1]); ctx.lineTo(s.trail[t][0], s.trail[t][1]); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    }
    function update() {
      var want = onScreen && !document.hidden;
      if (want && !running) { running = true; last = 0; if (!raf) raf = requestAnimationFrame(frame); }
      else if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    }
    size();
    if (window.ResizeObserver) new ResizeObserver(size).observe(el); else window.addEventListener("resize", size);
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(el);
    else { onScreen = true; update(); }
    document.addEventListener("visibilitychange", update);
    return { launch: launch };
  }
  window.Fireworks = { mount: mount };
})();
