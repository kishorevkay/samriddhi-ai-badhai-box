/* BGFX v4 - "Living rangoli"
   A large faint gold line-art rangoli turns very slowly behind the content.
   Lines near the pointer glow; a click/tap sends a ring of light through it.
   Plus hanging diya strings, twinkling 4-point stars, drifting gold specks
   and a faint corner lotus. Plain browser JS, no libraries. */
(function () {
  window.BGFX = window.BGFX || {};

  var TAU = Math.PI * 2;
  var GOLD = "226,182,90";      // #E2B65A muted gold
  var HI = "243,217,160";       // #F3D9A0

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- rangoli geometry, unit radius, built once ---------- */
  var GEO = null;
  function buildRangoli() {
    var segs = [], dots = [];
    function P(r, a) { return [Math.cos(a) * r, Math.sin(a) * r]; }
    function line(p, q) { segs.push(p[0], p[1], q[0], q[1]); }
    function quad(p0, c, p1, n) {
      var prev = p0;
      for (var i = 1; i <= n; i++) {
        var t = i / n, u = 1 - t;
        var p = [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
                 u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
        line(prev, p); prev = p;
      }
    }
    function circle(r, n) {
      var prev = P(r, 0);
      for (var i = 1; i <= n; i++) { var p = P(r, i / n * TAU); line(prev, p); prev = p; }
    }
    function petal(a, r0, r1, hw, bulge, n) {
      var rc = r0 + (r1 - r0) * bulge, tip = P(r1, a);
      quad(P(r0, a - hw), P(rc, a - hw * 1.35), tip, n);
      quad(tip, P(rc, a + hw * 1.35), P(r0, a + hw), n);
    }
    function scallop(a, r0, r1, hw, n) {
      quad(P(r0, a - hw), P(r0 + 2 * (r1 - r0), a), P(r0, a + hw), n);
    }
    var i, a;
    // heart: 8-fold
    circle(0.035, 24);
    for (i = 0; i < 8; i++) { a = i / 8 * TAU; petal(a, 0.04, 0.16, TAU / 16 * 0.9, 0.55, 6); }
    circle(0.18, 48);
    for (i = 0; i < 16; i++) dots.push(P(0.2, (i + 0.5) / 16 * TAU).concat([1.3]));
    // 16-fold petals with inner petal
    for (i = 0; i < 16; i++) {
      a = i / 16 * TAU;
      petal(a, 0.22, 0.4, TAU / 32 * 0.95, 0.5, 7);
      petal(a, 0.24, 0.34, TAU / 32 * 0.5, 0.5, 4);
    }
    circle(0.43, 96);
    for (i = 0; i < 32; i++) dots.push(P(0.465, i / 32 * TAU).concat([1.5]));
    circle(0.5, 110);
    // big lotus ring, offset half a step
    for (i = 0; i < 16; i++) {
      a = (i + 0.5) / 16 * TAU;
      petal(a, 0.5, 0.78, TAU / 32, 0.45, 9);
      petal(a, 0.53, 0.7, TAU / 32 * 0.55, 0.45, 6);
      line(P(0.56, a), P(0.66, a));
    }
    // small petals sitting in the gaps between big petal tips
    for (i = 0; i < 16; i++) { a = i / 16 * TAU; petal(a, 0.66, 0.8, TAU / 32 * 0.35, 0.5, 5); }
    for (i = 0; i < 48; i++) dots.push(P(0.83, i / 48 * TAU).concat([1.6]));
    circle(0.86, 150);
    for (i = 0; i < 32; i++) { a = i / 32 * TAU; scallop(a, 0.86, 0.92, TAU / 64, 6); }
    circle(0.95, 160);
    for (i = 0; i < 32; i++) {
      a = (i + 0.5) / 32 * TAU;
      petal(a, 0.95, 1.06, TAU / 64 * 0.8, 0.5, 4);
      dots.push(P(1.1, a).concat([1.8]));
    }
    return { segs: new Float32Array(segs), dots: dots };
  }

  /* ---------- static drawing helpers ---------- */
  function petalPath(c, ox, oy, a, r0, r1, hw, bulge) {
    var rc = r0 + (r1 - r0) * bulge;
    c.moveTo(ox + Math.cos(a - hw) * r0, oy + Math.sin(a - hw) * r0);
    c.quadraticCurveTo(ox + Math.cos(a - hw * 1.35) * rc, oy + Math.sin(a - hw * 1.35) * rc,
                       ox + Math.cos(a) * r1, oy + Math.sin(a) * r1);
    c.quadraticCurveTo(ox + Math.cos(a + hw * 1.35) * rc, oy + Math.sin(a + hw * 1.35) * rc,
                       ox + Math.cos(a + hw) * r0, oy + Math.sin(a + hw) * r0);
  }

  function starPath(c, x, y, r) {
    var k = r * 0.13;
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x + k, y - k, x + r, y);
    c.quadraticCurveTo(x + k, y + k, x, y + r);
    c.quadraticCurveTo(x - k, y + k, x - r, y);
    c.quadraticCurveTo(x - k, y - k, x, y - r);
  }

  function init(stage) {
    if (!GEO) GEO = buildRangoli();
    var segs = GEO.segs, nSeg = segs.length / 4, dots = GEO.dots, nDot = dots.length;
    var scr = new Float32Array(nSeg * 4), bk = new Uint8Array(nSeg);
    var dotX = new Float32Array(nDot), dotY = new Float32Array(nDot), dotI = new Float32Array(nDot);

    var canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block;";
    canvas.setAttribute("aria-hidden", "true");
    stage.insertBefore(canvas, stage.firstChild);
    var ctx = canvas.getContext("2d");
    var bg = document.createElement("canvas"), bctx = bg.getContext("2d");

    var W = 0, H = 0, DPR = 1, S = 1;
    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var reduced = !!(mq && mq.matches);
    var raf = 0, running = false, last = 0, T = 0, destroyed = false;
    var ptr = { x: 0, y: 0, sx: 0, sy: 0, active: false, amt: 0, lastX: null };
    var ripples = [];
    var strands = [], stars = [], specks = [];
    var RG = { cx: 0, cy: 0, R: 1 };
    var RIP_LIFE = 1.2, PROX = 150;
    // per-frame pointer snapshot used by intensity()
    var fpx = 0, fpy = 0, fpa = 0;

    /* ---------- layout (deterministic, rebuilt on resize) ---------- */
    function layout() {
      var rnd = mulberry32(20261028);
      S = clamp(W / 1200, 0.72, 1.12);

      if (W >= 720) { RG.cx = W * 0.8; RG.cy = H * 0.78; RG.R = clamp(Math.min(W * 0.17, H * 0.36), 130, 240); }
      else { RG.cx = W * 0.7; RG.cy = H * 0.86; RG.R = clamp(W * 0.3, 100, 180); }

      // hanging strings
      strands = [];
      var per = W < 360 ? 2 : (W < 900 ? 3 : 4);
      var edge = clamp(W * 0.035, 18, 60), gap = clamp(W * 0.045, 26, 64);
      var leftT = [{ lf: 0.62, d: 0.7 }, { lf: 0.36, d: 0.8 }, { lf: 0.22, d: -1 }, { lf: 0.46, d: 0.52 }];
      var rightT = [{ lf: 0.5, d: 0.76 }, { lf: 0.26, d: -1 }, { lf: 0.58, d: 0.6 }, { lf: 0.2, d: -1 }];
      for (var i = 0; i < per; i++) {
        strands.push(mkStrand(edge + i * gap, leftT[i], rnd));
        strands.push(mkStrand(W - edge - i * gap, rightT[i], rnd));
      }

      // stars, kept out of the readable centre
      stars = [];
      var nS = Math.round(clamp(W * H / 42000, 10, 26));
      for (i = 0; i < nS; i++) {
        var x, y, tries = 0;
        do { x = rnd() * W; y = rnd() * H; tries++; } while (tries < 14 && inCentre(x, y));
        stars.push({ x: x, y: y, r: 4 + rnd() * rnd() * 10, ph: rnd() * TAU, sp: 0.35 + rnd() * 0.5 });
      }

      // tiny gold specks drifting upward
      specks = [];
      var nP = Math.round(clamp(W * H / 14000, 18, 60));
      for (i = 0; i < nP; i++) {
        specks.push({ x: rnd() * W, y: rnd() * H, r: 0.6 + rnd() * 1.1, vy: 4 + rnd() * 9, ph: rnd() * TAU, sp: 0.6 + rnd() * 1.2 });
      }
    }

    function inCentre(x, y) { return x > W * 0.24 && x < W * 0.76 && y > H * 0.16 && y < H * 0.74; }

    function mkStrand(x, t, rnd) {
      var L = clamp(H * t.lf, 50, 540 * S);
      var dy = t.d > 0 ? L * t.d : -1;
      if (dy > 0 && L - dy < 46 * S) dy = L - 46 * S;
      if (dy > 0 && dy < 50 * S) dy = -1;
      var beads = [], y = 12 + rnd() * 12, k = 0;
      while (y < L - 14 * S) {
        var r = Math.max(2, (k % 3 === 1 ? 3.4 : 2.0 + rnd() * 0.7) * S);
        if (!(dy > 0 && Math.abs(y - dy) < 46 * S)) beads.push(y, r);
        y += (15 + rnd() * 10) * S + r * 2.2;
        k++;
      }
      if (dy > 0) {
        beads.push(dy - 36 * S, Math.min(5, 4.4 * S));
        if (dy + 32 * S < L - 12 * S) beads.push(dy + 32 * S, Math.min(5, 3.8 * S));
      }
      return { x: x, L: L, dy: dy, beads: beads, ph: rnd() * TAU, amp: 0.008 + rnd() * 0.008,
               om: 0.45 + rnd() * 0.35, sw: 0, sv: 0 };
    }

    /* ---------- cached background: red ground, vignette, corner lotus ---------- */
    // ground follows the page's --bg token (the Design Board can change it live)
    var ground = "";
    function groundColor() { ground = getComputedStyle(stage).getPropertyValue("--bg").trim() || "#9A1B2B"; return ground; }
    function paintBg() {
      bg.width = canvas.width; bg.height = canvas.height;
      bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      bctx.fillStyle = groundColor(); // deep crimson ground = --bg from styles.css
      bctx.fillRect(0, 0, W, H);
      var g = bctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.22, W / 2, H / 2, Math.sqrt(W * W + H * H) * 0.62);
      g.addColorStop(0, "rgba(71,11,21,0)");
      g.addColorStop(1, "rgba(71,11,21,0.6)");
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, W, H);

      // faint lotus peeking from bottom-left
      var Lr = clamp(Math.min(W, H) * 0.46, 120, 340), ox = -W * 0.01, oy = H + 6;
      var a0 = -Math.PI * 0.53, a1 = Math.PI * 0.03, n = 6, i;
      bctx.lineCap = "round";
      bctx.lineWidth = 1;
      bctx.strokeStyle = "rgba(" + GOLD + ",0.21)";
      bctx.beginPath();
      for (i = 0; i < n; i++) {
        var a = a0 + (i + 0.5) / n * (a1 - a0);
        petalPath(bctx, ox, oy, a, Lr * 0.16, Lr, 0.17, 0.45);
        petalPath(bctx, ox, oy, a, Lr * 0.22, Lr * 0.66, 0.09, 0.45);
      }
      bctx.stroke();
      bctx.strokeStyle = "rgba(" + GOLD + ",0.16)";
      bctx.beginPath(); bctx.arc(ox, oy, Lr * 1.1, a0, a1); bctx.stroke();
      bctx.beginPath(); bctx.arc(ox, oy, Lr * 1.26, a0, a1); bctx.stroke();
      bctx.fillStyle = "rgba(" + GOLD + ",0.24)";
      bctx.beginPath();
      for (i = 0; i <= 10; i++) {
        var b = a0 + i / 10 * (a1 - a0), rr = Lr * 1.18;
        bctx.moveTo(ox + Math.cos(b) * rr + 1.6, oy + Math.sin(b) * rr);
        bctx.arc(ox + Math.cos(b) * rr, oy + Math.sin(b) * rr, 1.6, 0, TAU);
      }
      bctx.fill();
    }

    /* ---------- simulation ---------- */
    function step(dt) {
      var k = Math.min(1, dt * 5);
      ptr.amt += ((ptr.active ? 1 : 0) - ptr.amt) * k;
      var kp = Math.min(1, dt * 12);
      ptr.sx += (ptr.x - ptr.sx) * kp;
      ptr.sy += (ptr.y - ptr.sy) * kp;

      for (var i = ripples.length - 1; i >= 0; i--) {
        var rp = ripples[i];
        rp.age += dt;
        if (rp.age >= RIP_LIFE) { ripples.splice(i, 1); continue; }
        var p = rp.age / RIP_LIFE;
        rp.rad = rp.max * (1 - (1 - p) * (1 - p));
        rp.f = Math.pow(1 - p, 1.4) * 0.95;
      }

      for (i = 0; i < strands.length; i++) {
        var st = strands[i];
        var acc = -9 * st.sw - 2.4 * st.sv;
        st.sv += acc * dt;
        st.sw = clamp(st.sw + st.sv * dt, -0.09, 0.09);
      }

      for (i = 0; i < specks.length; i++) {
        var sp = specks[i];
        sp.y -= sp.vy * dt;
        if (sp.y < -4) { sp.y = H + 4; sp.x = Math.random() * W; }
      }
    }

    function intensity(mx, my) {
      var I = 0;
      if (fpa > 0.01) {
        var dx = mx - fpx, dy = my - fpy, d2 = dx * dx + dy * dy;
        if (d2 < PROX * PROX) {
          var q = 1 - Math.sqrt(d2) / PROX;
          I += q * q * (3 - 2 * q) * fpa * 0.85;
        }
      }
      for (var k = 0; k < ripples.length; k++) {
        var rp = ripples[k], ex = mx - rp.x, ey = my - rp.y;
        var dr = Math.sqrt(ex * ex + ey * ey) - rp.rad;
        if (dr > -90 && dr < 90) { var z = dr / 34; I += Math.exp(-z * z) * rp.f; }
      }
      return I > 1 ? 1 : I;
    }

    /* ---------- drawing ---------- */
    function strokeBucket(b) {
      ctx.beginPath();
      for (var i = 0, j = 0; i < nSeg; i++, j += 4) {
        if (bk[i] !== b) continue;
        ctx.moveTo(scr[j], scr[j + 1]);
        ctx.lineTo(scr[j + 2], scr[j + 3]);
      }
      ctx.stroke();
    }

    function drawRangoli() {
      var th = T * TAU / 180; // one turn per 3 minutes
      var c = Math.cos(th) * RG.R, s = Math.sin(th) * RG.R, cx = RG.cx, cy = RG.cy;
      var live = fpa > 0.01 || ripples.length > 0;
      var counts = [0, 0, 0, 0, 0, 0], i, j, b;

      for (i = 0, j = 0; i < nSeg; i++, j += 4) {
        var x1 = segs[j], y1 = segs[j + 1], x2 = segs[j + 2], y2 = segs[j + 3];
        var X1 = cx + x1 * c - y1 * s, Y1 = cy + x1 * s + y1 * c;
        var X2 = cx + x2 * c - y2 * s, Y2 = cy + x2 * s + y2 * c;
        scr[j] = X1; scr[j + 1] = Y1; scr[j + 2] = X2; scr[j + 3] = Y2;
        b = 0;
        if (live) {
          var I = intensity((X1 + X2) * 0.5, (Y1 + Y2) * 0.5);
          b = I < 0.08 ? 0 : Math.min(5, 1 + Math.floor(I * 5));
        }
        bk[i] = b; counts[b]++;
      }

      ctx.lineCap = "round";
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(" + GOLD + ",0.16)";
      if (counts[0]) strokeBucket(0);
      if (counts[0] < nSeg) {
        // soft gold halo
        for (b = 1; b <= 5; b++) {
          if (!counts[b]) continue;
          ctx.lineWidth = 3.4;
          ctx.strokeStyle = "rgba(" + GOLD + "," + (0.05 * b).toFixed(3) + ")";
          strokeBucket(b);
        }
        // bright core line, gold -> highlight
        for (b = 1; b <= 5; b++) {
          if (!counts[b]) continue;
          var t = b / 5;
          ctx.lineWidth = 1 + 0.12 * b;
          ctx.strokeStyle = "rgba(" + Math.round(242 + 13 * t) + "," + Math.round(193 + 38 * t) + "," +
            Math.round(78 + 90 * t) + "," + (0.22 + 0.14 * b).toFixed(3) + ")";
          strokeBucket(b);
        }
      }

      // dot rings
      var ds = clamp(RG.R / 480, 0.8, 1.3), anyBright = false;
      ctx.fillStyle = "rgba(" + GOLD + ",0.24)";
      ctx.beginPath();
      for (i = 0; i < nDot; i++) {
        var d = dots[i];
        var X = cx + d[0] * c - d[1] * s, Y = cy + d[0] * s + d[1] * c, r = d[2] * ds;
        dotX[i] = X; dotY[i] = Y;
        dotI[i] = live ? intensity(X, Y) : 0;
        if (dotI[i] < 0.08) { ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, TAU); }
        else anyBright = true;
      }
      ctx.fill();
      if (anyBright) {
        for (i = 0; i < nDot; i++) {
          var di = dotI[i];
          if (di < 0.08) continue;
          var rr = dots[i][2] * ds * (1 + di * 0.8);
          ctx.fillStyle = "rgba(" + GOLD + "," + (0.12 * di).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(dotX[i], dotY[i], rr * 3.2, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(" + HI + "," + (0.25 + 0.7 * di).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(dotX[i], dotY[i], rr, 0, TAU); ctx.fill();
        }
      }
    }

    function drawRipples() {
      for (var i = 0; i < ripples.length; i++) {
        var rp = ripples[i];
        if (rp.age < 0.4) {
          var bf = 1 - rp.age / 0.4, gr = 26;
          var g = ctx.createRadialGradient(rp.x, rp.y, 0, rp.x, rp.y, gr);
          g.addColorStop(0, "rgba(" + HI + "," + (0.22 * bf).toFixed(3) + ")");
          g.addColorStop(1, "rgba(" + HI + ",0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(rp.x, rp.y, gr, 0, TAU); ctx.fill();
        }
        if (rp.rad < 1) continue;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.rad, 0, TAU);
        ctx.lineWidth = 10;
        ctx.strokeStyle = "rgba(" + GOLD + "," + (0.045 * rp.f).toFixed(3) + ")";
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(" + HI + "," + (0.18 * rp.f).toFixed(3) + ")";
        ctx.stroke();
      }
    }

    function drawSpecks() {
      for (var i = 0; i < specks.length; i++) {
        var p = specks[i];
        var a = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(T * p.sp + p.ph));
        ctx.fillStyle = "rgba(" + HI + "," + a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
    }

    function drawStars() {
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(T * st.sp + st.ph));
        var boost = (fpa > 0.01 || ripples.length) ? intensity(st.x, st.y) : 0;
        var a = clamp(tw * 0.85 + boost * 0.4, 0, 1);
        var r = st.r * (1 + boost * 0.25);
        var gr = r * 2.4;
        var g = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, gr);
        g.addColorStop(0, "rgba(255,214,125," + (0.34 * a).toFixed(3) + ")");
        g.addColorStop(1, "rgba(255,214,125,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(st.x, st.y, gr, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,236,180," + a.toFixed(3) + ")";
        ctx.beginPath(); starPath(ctx, st.x, st.y, r); ctx.fill();
      }
    }

    function drawDiya(s, f, boost) {
      // warm glow (additive, small)
      var g = ctx.createRadialGradient(0, -9 * s, 0, 0, -9 * s, 30 * s);
      g.addColorStop(0, "rgba(255,210,118," + (0.34 * f + 0.2 * boost).toFixed(3) + ")");
      g.addColorStop(0.45, "rgba(255,200,105," + (0.12 * f + 0.08 * boost).toFixed(3) + ")");
      g.addColorStop(1, "rgba(255,200,105,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -9 * s, 30 * s, 0, TAU); ctx.fill();
      // tiny additive core so the flame reads as light
      ctx.globalCompositeOperation = "lighter";
      var g2 = ctx.createRadialGradient(0, -8 * s, 0, 0, -8 * s, 9 * s);
      g2.addColorStop(0, "rgba(" + HI + "," + (0.22 * f).toFixed(3) + ")");
      g2.addColorStop(1, "rgba(" + HI + ",0)");
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(0, -8 * s, 9 * s, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // two outward-curving petals
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(" + GOLD + ",0.95)";
      ctx.fillStyle = "rgba(" + GOLD + ",0.22)";
      ctx.beginPath();
      ctx.moveTo(0, s); ctx.quadraticCurveTo(-9 * s, 7 * s, -21 * s, -3 * s); ctx.quadraticCurveTo(-11 * s, -s, 0, s);
      ctx.moveTo(0, s); ctx.quadraticCurveTo(9 * s, 7 * s, 21 * s, -3 * s); ctx.quadraticCurveTo(11 * s, -s, 0, s);
      ctx.fill(); ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3 * s, 2 * s); ctx.quadraticCurveTo(-9 * s, 3 * s, -15 * s, -1.5 * s);
      ctx.moveTo(3 * s, 2 * s); ctx.quadraticCurveTo(9 * s, 3 * s, 15 * s, -1.5 * s);
      ctx.stroke();
      // small down-pointing petal
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 3 * s); ctx.quadraticCurveTo(-5 * s, 9 * s, 0, 16 * s); ctx.quadraticCurveTo(5 * s, 9 * s, 0, 3 * s);
      ctx.stroke();

      // flame teardrop
      var fh = 21 * s * f, top = -2 * s - fh;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.bezierCurveTo(4.5 * s, -2 * s - fh * 0.55, 6 * s, -4 * s, 0, -s);
      ctx.bezierCurveTo(-6 * s, -4 * s, -4.5 * s, -2 * s - fh * 0.55, 0, top);
      var lg = ctx.createLinearGradient(0, top, 0, -s);
      lg.addColorStop(0, "#E2B65A"); lg.addColorStop(0.6, "#F3D9A0"); lg.addColorStop(1, "#FFF4D6");
      ctx.fillStyle = lg;
      ctx.fill();
      // inner core
      var ch = fh * 0.45;
      ctx.beginPath();
      ctx.moveTo(0, -2.5 * s - ch);
      ctx.bezierCurveTo(2 * s, -2.5 * s - ch * 0.5, 2.6 * s, -3.5 * s, 0, -2.2 * s);
      ctx.bezierCurveTo(-2.6 * s, -3.5 * s, -2 * s, -2.5 * s - ch * 0.5, 0, -2.5 * s - ch);
      ctx.fillStyle = "rgba(255,250,235,0.9)";
      ctx.fill();
    }

    function drawDrop(s) {
      var rr = 4.2 * s;
      ctx.fillStyle = "rgba(" + GOLD + ",0.16)";
      ctx.beginPath(); ctx.arc(0, 9 * s, rr * 2.6, 0, TAU); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(4.5 * s, 5 * s, rr, 9 * s);
      ctx.arc(0, 9 * s, rr, 0, Math.PI);
      ctx.quadraticCurveTo(-4.5 * s, 5 * s, 0, 0);
      ctx.fillStyle = "#E2B65A";
      ctx.fill();
      ctx.fillStyle = "rgba(" + HI + ",0.9)";
      ctx.beginPath(); ctx.arc(-1.4 * s, 8 * s, 1.2 * s, 0, TAU); ctx.fill();
    }

    function drawStrands() {
      var i, j, st, th, sn, cs;
      var angs = [];
      // threads
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(" + GOLD + ",0.85)";
      ctx.beginPath();
      for (i = 0; i < strands.length; i++) {
        st = strands[i];
        th = st.amp * Math.sin(T * st.om + st.ph) + st.sw;
        angs.push(th);
        ctx.moveTo(st.x, 0);
        ctx.lineTo(st.x + Math.sin(th) * st.L, Math.cos(th) * st.L);
      }
      ctx.stroke();
      // beads (one path) + highlights (one path)
      ctx.fillStyle = "#E2B65A";
      ctx.beginPath();
      for (i = 0; i < strands.length; i++) {
        st = strands[i]; sn = Math.sin(angs[i]); cs = Math.cos(angs[i]);
        for (j = 0; j < st.beads.length; j += 2) {
          var by = st.beads[j], br = st.beads[j + 1];
          var bx = st.x + sn * by, byy = cs * by;
          ctx.moveTo(bx + br, byy); ctx.arc(bx, byy, br, 0, TAU);
        }
      }
      ctx.fill();
      ctx.fillStyle = "rgba(" + HI + ",0.85)";
      ctx.beginPath();
      for (i = 0; i < strands.length; i++) {
        st = strands[i]; sn = Math.sin(angs[i]); cs = Math.cos(angs[i]);
        for (j = 0; j < st.beads.length; j += 2) {
          var hr = st.beads[j + 1];
          if (hr < 2.6) continue;
          var hx = st.x + sn * st.beads[j] - hr * 0.3, hy = cs * st.beads[j] - hr * 0.3;
          ctx.moveTo(hx + hr * 0.35, hy); ctx.arc(hx, hy, hr * 0.35, 0, TAU);
        }
      }
      ctx.fill();
      // diyas and end drops
      for (i = 0; i < strands.length; i++) {
        st = strands[i]; th = angs[i]; sn = Math.sin(th); cs = Math.cos(th);
        if (st.dy > 0) {
          var px = st.x + sn * st.dy, py = cs * st.dy;
          var boost = 0;
          if (fpa > 0.01) {
            var ddx = fpx - px, ddy = fpy - py;
            boost = fpa * Math.max(0, 1 - Math.sqrt(ddx * ddx + ddy * ddy) / 160);
          }
          var f = 0.9 + 0.07 * Math.sin(T * 7.3 + st.ph) + 0.04 * Math.sin(T * 12.7 + st.ph * 2);
          ctx.save(); ctx.translate(px, py); ctx.rotate(-th);
          drawDiya(S, f, boost);
          ctx.restore();
        }
        ctx.save(); ctx.translate(st.x + sn * st.L, cs * st.L); ctx.rotate(-th);
        drawDrop(S);
        ctx.restore();
      }
    }

    function draw() {
      if (W <= 0 || H <= 0 || !canvas.width || !canvas.height) return;
      fpx = ptr.sx; fpy = ptr.sy; fpa = reduced ? 0 : ptr.amt;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(bg, 0, 0);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // live switches set by the Design Board: data-fx-rangoli / data-fx-stars / data-fx-strings = "off"
      var fx = stage.dataset;
      if (fx.fxRangoli !== "off") { drawRangoli(); drawRipples(); }
      if (fx.fxStars !== "off") { drawSpecks(); drawStars(); }
      if (fx.fxStrings !== "off") drawStrands();
    }

    /* ---------- loop control ---------- */
    var frames = 0;
    function frame(now) {
      raf = 0;
      if (!running) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      T += dt;
      if ((++frames & 31) === 0 && (getComputedStyle(stage).getPropertyValue("--bg").trim() || "#9A1B2B") !== ground) paintBg();
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running || reduced || destroyed || document.hidden) return;
      running = true; last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function resize() {
      if (destroyed) return;
      var w = stage.clientWidth, h = stage.clientHeight;
      W = w; H = h;
      if (W <= 0 || H <= 0) return;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(W * DPR));
      canvas.height = Math.max(1, Math.round(H * DPR));
      layout();
      paintBg();
      draw(); // repaint now so the resized canvas never shows blank
    }

    /* ---------- input (listeners on stage only; never preventDefault) ---------- */
    function local(e) {
      var r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function onMove(e) {
      var p = local(e);
      if (!reduced && ptr.lastX !== null) {
        var dx = clamp(p.x - ptr.lastX, -30, 30);
        for (var i = 0; i < strands.length; i++) {
          var st = strands[i];
          if (p.y > st.L + 20) continue;
          var sxp = st.x + st.sw * Math.min(Math.max(p.y, 0), st.L);
          var ad = Math.abs(p.x - sxp);
          if (ad < 36) st.sv += (dx / Math.max(80, p.y)) * 1.6 * (1 - ad / 36);
        }
      }
      ptr.lastX = p.x;
      ptr.x = p.x; ptr.y = p.y;
      if (!ptr.active) {
        ptr.active = true;
        if (ptr.amt < 0.02) { ptr.sx = p.x; ptr.sy = p.y; }
      }
    }
    function onLeave() { ptr.active = false; ptr.lastX = null; }
    function onDown(e) {
      var p = local(e);
      ptr.x = p.x; ptr.y = p.y; ptr.lastX = p.x;
      if (!ptr.active) { ptr.active = true; if (ptr.amt < 0.02) { ptr.sx = p.x; ptr.sy = p.y; } }
      if (reduced) return;
      var far = Math.max(Math.sqrt(W * W + H * H) * 0.6, 500);
      ripples.push({ x: p.x, y: p.y, age: 0, rad: 0, f: 0.95, max: Math.min(far, 900) });
      if (ripples.length > 4) ripples.shift();
      for (var i = 0; i < strands.length; i++) {
        var st = strands[i];
        if (p.y > st.L + 60) continue;
        var d = Math.abs(st.x - p.x);
        if (d < 140) st.sv += (st.x >= p.x ? 1 : -1) * 0.12 * (1 - d / 140);
      }
    }
    function onVis() { if (document.hidden) stop(); else start(); }
    function onMQ() {
      reduced = !!(mq && mq.matches);
      if (reduced) { stop(); ripples.length = 0; draw(); } else start();
    }

    stage.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerleave", onLeave, { passive: true });
    stage.addEventListener("pointercancel", onLeave, { passive: true });
    stage.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    if (mq) {
      if (mq.addEventListener) mq.addEventListener("change", onMQ);
      else if (mq.addListener) mq.addListener(onMQ);
    }

    var ro = null;
    if (window.ResizeObserver) { ro = new window.ResizeObserver(resize); ro.observe(stage); }
    else window.addEventListener("resize", resize);

    resize();
    start();

    return {
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        stop();
        if (ro) ro.disconnect(); else window.removeEventListener("resize", resize);
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerleave", onLeave);
        stage.removeEventListener("pointercancel", onLeave);
        stage.removeEventListener("pointerdown", onDown);
        document.removeEventListener("visibilitychange", onVis);
        if (mq) {
          if (mq.removeEventListener) mq.removeEventListener("change", onMQ);
          else if (mq.removeListener) mq.removeListener(onMQ);
        }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        bg.width = bg.height = 0;
      }
    };
  }

  window.BGFX.v6 = {
    name: "Smaller rangoli (4, resized)",
    hint: "Move across the bottom-right rangoli to light its lines; click or tap anywhere to send a ring of light through it.",
    init: init
  };
})();
