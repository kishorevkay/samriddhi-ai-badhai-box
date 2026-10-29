/* BGFX v2 — "Drifting embers"
   upGrad Diwali microsite reactive background. Plain browser JS, no libraries. */
(function () {
  window.BGFX = window.BGFX || {};

  var RED = '#9A1B2B';
  var GOLD = '#E2B65A';
  var HI = '#F3D9A0';
  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // small seeded RNG so static decoration stays put across resizes
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // concave 4-point star (like ✦)
  function starPath(g, x, y, r) {
    var k = r * 0.16;
    g.moveTo(x, y - r);
    g.quadraticCurveTo(x + k, y - k, x + r, y);
    g.quadraticCurveTo(x + k, y + k, x, y + r);
    g.quadraticCurveTo(x - k, y + k, x - r, y);
    g.quadraticCurveTo(x - k, y - k, x, y - r);
    g.closePath();
  }

  // teardrop with the tip up, round end down; total height h, half-width w
  function dropPath(g, x, yTip, h, w) {
    var cy = yTip + h - w;
    var mid = yTip + (cy - yTip) * 0.5;
    g.moveTo(x, yTip);
    g.bezierCurveTo(x + w * 0.2, mid, x + w, cy - w * 0.6, x + w, cy);
    g.arc(x, cy, w, 0, Math.PI, false);
    g.bezierCurveTo(x - w, cy - w * 0.6, x - w * 0.2, mid, x, yTip);
    g.closePath();
  }

  function makeGlowSprite() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(243,217,160,1)');
    gr.addColorStop(0.22, 'rgba(243,217,160,0.55)');
    gr.addColorStop(0.55, 'rgba(226,182,90,0.16)');
    gr.addColorStop(1, 'rgba(226,182,90,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  }

  window.BGFX.v2 = {
    name: 'Drifting embers',
    hint: 'Move the cursor through the embers to part them; click or tap to send a soft golden ripple.',
    init: function (stage) {
      var canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block;';
      stage.insertBefore(canvas, stage.firstChild);
      var ctx = canvas.getContext('2d');

      var stat = document.createElement('canvas'); // static layer (ground, threads, diyas, lotus)
      var sctx = stat.getContext('2d');
      var glow = makeGlowSprite();

      var W = 0, H = 0, dpr = 1;
      var destroyed = false, raf = 0, last = 0, time = 0;
      var strands = [], beads = [], flames = [], stars = [], embers = [], ripples = [];
      var diyaS = 10;
      var pointer = { x: -9999, y: -9999, active: false, pw: 0 };
      var overlay = stage.dataset.bgfx === 'overlay'; // embers only, no ground/strings/lotus/stars

      var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      var reduced = !!(mq && mq.matches);

      /* ---------- layout ---------- */

      function buildStrands() {
        strands = []; beads = []; flames = [];
        var R = rng(7);
        diyaS = clamp(H * 0.018, 7, 13);
        var s = diyaS;
        var n = W < 520 ? 2 : 3;
        var gap = clamp(W * 0.04, 22, 58);
        var x0 = clamp(W * 0.035, 16, 64);
        var lens = [[0.5, 0.3, 0.42], [0.36, 0.52, 0.28]];
        var diyas = [[0.62, 0.55, -1], [-1, 0.6, 0.5]];
        for (var side = 0; side < 2; side++) {
          for (var i = 0; i < n; i++) {
            var x = side ? W - x0 - i * gap : x0 + i * gap;
            var len = clamp(H * lens[side][i], 70, H * 0.62);
            var dropH = clamp(s * 1.6, 10, 18);
            var d = (diyas[side][i] > 0 && len > s * 10) ? len * diyas[side][i] : -1;
            var st = { x: x, len: len, diya: d, dropH: dropH };
            strands.push(st);
            if (d > 0) flames.push({ x: x, y: d - s * 1.0, ph: R() * TAU });
            var y = 8 + R() * 10;
            while (y < len - dropH - 6) {
              if (d > 0 && y > d - s * 2.4 && y < d + s * 1.6) { y = d + s * 1.6; continue; }
              var r = R() < 0.3 ? 3.5 + R() * 1.5 : 2 + R() * 1.2;
              beads.push({ x: x, y: y, r: r, ph: R() * TAU, sp: 0.5 + R() * 0.9 });
              y += r * 2 + 6 + R() * 12;
            }
          }
        }
        if (overlay) { strands = []; beads = []; flames = []; }
      }

      function buildStars() {
        stars = [];
        if (overlay) return;
        var R = rng(31);
        var n = Math.round(clamp((W * H) / 55000, 6, 14));
        var tries = 0;
        while (stars.length < n && tries < 500) {
          tries++;
          var x = R() * W, y = R() * H, nx = x / W, ny = y / H;
          if (nx > 0.26 && nx < 0.74 && ny > 0.12 && ny < 0.8) continue; // keep centre clear
          var bad = false, j;
          for (j = 0; j < strands.length; j++) {
            if (Math.abs(x - strands[j].x) < 16 && y < strands[j].len + 24) { bad = true; break; }
          }
          for (j = 0; !bad && j < stars.length; j++) {
            var dx = stars[j].x - x, dy = stars[j].y - y;
            if (dx * dx + dy * dy < 3600) bad = true;
          }
          if (bad) continue;
          stars.push({ x: x, y: y, r: 4 + R() * 10, ph: R() * TAU, sp: 0.35 + R() * 0.5 });
        }
      }

      function emberCount() { return Math.round(clamp((W * H) / 3500, 120, 160)); }

      function resetEmber(e, fresh) {
        var sc = clamp(H / 560, 0.7, 1.6);
        e.x = Math.random() * W;
        e.y = fresh ? Math.random() * H : H + 6 + Math.random() * 24;
        e.vy = (9 + Math.random() * 22) * sc;
        e.amp = 3 + Math.random() * 11;
        e.fr = 0.25 + Math.random() * 0.55;
        e.ph = Math.random() * TAU;
        e.star = Math.random() < 0.42;
        e.r = e.star ? 1.6 + Math.random() * 2.2 : 0.7 + Math.random() * 1.2;
        e.a = 0.35 + Math.random() * 0.5;
        e.tw = 0.6 + Math.random() * 1.6;
        e.hi = Math.random() < 0.35;
        e.ox = 0; e.oy = 0; e.vx = 0; e.vyo = 0; e.boost = 0;
        e.X = e.x; e.Y = e.y; e.alpha = 0;
        return e;
      }

      function syncEmbers(oldW, oldH) {
        var i;
        if (oldW > 0 && oldH > 0 && embers.length) {
          var fx = W / oldW, fy = H / oldH;
          for (i = 0; i < embers.length; i++) { embers[i].x *= fx; embers[i].y *= fy; }
        }
        var n = emberCount();
        while (embers.length < n) embers.push(resetEmber({}, true));
        if (embers.length > n) embers.length = n;
      }

      /* ---------- static layer ---------- */

      function petal(g, ang, L, w) {
        var dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
        var mx = dx * L * 0.45, my = dy * L * 0.45;
        g.moveTo(0, 0);
        g.quadraticCurveTo(mx + px * w, my + py * w, dx * L, dy * L);
        g.quadraticCurveTo(mx - px * w, my - py * w, 0, 0);
      }

      function lotus(g, bx, by, S) {
        g.save();
        g.translate(bx, by);
        g.strokeStyle = GOLD;
        g.lineWidth = 1;
        var i, a;
        g.globalAlpha = 0.22;
        g.beginPath();
        for (i = 0; i < 7; i++) petal(g, (-165 + i * 25) * Math.PI / 180, S, S * 0.28);
        g.stroke();
        g.globalAlpha = 0.18;
        g.beginPath();
        for (i = 0; i < 6; i++) petal(g, (-152.5 + i * 25) * Math.PI / 180, S * 0.68, S * 0.2);
        g.stroke();
        g.globalAlpha = 0.12;
        g.beginPath();
        for (i = 0; i < 7; i++) {
          a = (-165 + i * 25) * Math.PI / 180;
          g.moveTo(Math.cos(a) * S * 0.18, Math.sin(a) * S * 0.18);
          g.lineTo(Math.cos(a) * S * 0.8, Math.sin(a) * S * 0.8);
        }
        g.stroke();
        g.globalAlpha = 0.16;
        g.beginPath();
        g.arc(0, 0, S * 1.18, Math.PI, TAU);
        g.moveTo(S * 1.34, 0);
        g.arc(0, 0, S * 1.34, 0, Math.PI, true);
        g.stroke();
        g.globalAlpha = 0.25;
        g.fillStyle = GOLD;
        g.beginPath();
        for (a = 180; a <= 360; a += 9) {
          var rad = a * Math.PI / 180, rr = S * 1.26;
          g.moveTo(Math.cos(rad) * rr + 1.3, Math.sin(rad) * rr);
          g.arc(Math.cos(rad) * rr, Math.sin(rad) * rr, 1.3, 0, TAU);
        }
        g.fill();
        g.restore();
      }

      function diya(g, x, y, s) {
        // two outward-curving petals forming a bowl + small bottom petal
        g.strokeStyle = GOLD;
        g.lineWidth = 1.1;
        g.globalAlpha = 0.95;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x - s * 0.8, y - s * 0.55, x - s * 1.75, y - s * 0.45);
        g.quadraticCurveTo(x - s * 1.0, y + s * 0.4, x, y + s * 0.18);
        g.moveTo(x, y);
        g.quadraticCurveTo(x + s * 0.8, y - s * 0.55, x + s * 1.75, y - s * 0.45);
        g.quadraticCurveTo(x + s * 1.0, y + s * 0.4, x, y + s * 0.18);
        g.moveTo(x - s * 0.5, y - s * 0.12);
        g.quadraticCurveTo(x - s * 1.0, y - s * 0.3, x - s * 1.35, y - s * 0.3);
        g.moveTo(x + s * 0.5, y - s * 0.12);
        g.quadraticCurveTo(x + s * 1.0, y - s * 0.3, x + s * 1.35, y - s * 0.3);
        g.moveTo(x, y + s * 0.18);
        g.quadraticCurveTo(x + s * 0.38, y + s * 0.6, x, y + s * 1.05);
        g.quadraticCurveTo(x - s * 0.38, y + s * 0.6, x, y + s * 0.18);
        g.stroke();
        // flame
        var tip = y - s * 1.85, fh = s * 1.6;
        var gr = g.createLinearGradient(x, tip, x, tip + fh);
        gr.addColorStop(0, GOLD);
        gr.addColorStop(1, HI);
        g.fillStyle = gr;
        g.globalAlpha = 1;
        g.beginPath(); dropPath(g, x, tip, fh, s * 0.34); g.fill();
        g.fillStyle = '#FFF4D6';
        g.globalAlpha = 0.9;
        g.beginPath(); dropPath(g, x, tip + fh * 0.4, fh * 0.55, s * 0.16); g.fill();
        g.globalAlpha = 1;
      }

      function buildStatic() {
        stat.width = Math.round(W * dpr);
        stat.height = Math.round(H * dpr);
        var g = sctx;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = RED;
        g.fillRect(0, 0, W, H);
        var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.sqrt(W * W + H * H) / 2);
        vg.addColorStop(0, 'rgba(200,16,46,0)');
        vg.addColorStop(1, 'rgba(200,16,46,0.35)');
        g.fillStyle = vg;
        g.fillRect(0, 0, W, H);

        // lotus / rangoli peeking from bottom corners
        var S = clamp(Math.min(W * 0.3, H * 0.4), 90, 320);
        lotus(g, W * 0.04, H + S * 0.12, S);
        lotus(g, W * 0.96, H + S * 0.12, S);

        // faint flowing lines along the bottom
        g.strokeStyle = GOLD;
        g.lineWidth = 1;
        g.globalAlpha = 0.1;
        g.beginPath();
        for (var k = 0; k < 3; k++) {
          var y0 = H - 14 - k * 9;
          g.moveTo(0, y0);
          for (var xx = 0; xx <= W + 20; xx += 20) g.lineTo(xx, y0 + Math.sin(xx * 0.012 + k * 1.7) * 4);
        }
        g.stroke();

        // hanging strings
        var s = diyaS, i, st;
        g.globalAlpha = 0.85;
        g.lineWidth = 1;
        g.strokeStyle = GOLD;
        g.beginPath();
        for (i = 0; i < strands.length; i++) {
          st = strands[i];
          var x = Math.round(st.x) + 0.5;
          var end = st.len - st.dropH;
          g.moveTo(x, 0);
          if (st.diya > 0) {
            g.lineTo(x, st.diya - s * 1.95);
            g.moveTo(x, st.diya + s * 1.05);
          }
          g.lineTo(x, end + 1);
        }
        g.stroke();
        g.globalAlpha = 1;
        g.fillStyle = GOLD;
        g.beginPath();
        for (i = 0; i < beads.length; i++) {
          var b = beads[i];
          g.moveTo(b.x + b.r, b.y);
          g.arc(b.x, b.y, b.r, 0, TAU);
        }
        g.fill();
        for (i = 0; i < strands.length; i++) {
          st = strands[i];
          g.fillStyle = GOLD;
          g.beginPath(); dropPath(g, st.x, st.len - st.dropH, st.dropH, st.dropH * 0.36); g.fill();
          if (st.diya > 0) diya(g, st.x, st.diya, s);
        }
      }

      /* ---------- simulation ---------- */

      function centreFactor(x, y) {
        var ex = (x - W * 0.5) / (W * 0.32), ey = (y - H * 0.45) / (H * 0.34);
        var e = ex * ex + ey * ey;
        return e < 1 ? 0.45 + 0.55 * e : 1;
      }

      var RAD = 120, K = 6, D = 4.4, REPEL = 700;
      var RIP_SPEED = 360, RIP_LIFE = 1.5, RIP_BAND = 46;

      function update(dt) {
        var target = pointer.active ? 1 : 0;
        pointer.pw += (target - pointer.pw) * Math.min(1, dt * 4);
        var i, j;
        for (i = ripples.length - 1; i >= 0; i--) {
          ripples[i].age += dt;
          if (ripples[i].age > RIP_LIFE) ripples.splice(i, 1);
        }
        var pw = pointer.pw, px = pointer.x, py = pointer.y, R2 = RAD * RAD;
        var decay = Math.exp(-dt * 2.5);
        for (i = 0; i < embers.length; i++) {
          var e = embers[i];
          e.y -= e.vy * dt;
          if (e.y + e.oy < -14) { resetEmber(e, false); }
          if (e.x < -12) e.x += W + 24; else if (e.x > W + 12) e.x -= W + 24;
          var bx = e.x + Math.sin(time * e.fr * TAU * 0.25 + e.ph) * e.amp;
          var X = bx + e.ox, Y = e.y + e.oy;
          var ax = -K * e.ox - D * e.vx, ay = -K * e.oy - D * e.vyo;
          if (pw > 0.01) {
            var dx = X - px, dy = Y - py, d2 = dx * dx + dy * dy;
            if (d2 < R2) {
              var d = Math.sqrt(d2) + 0.001, f = 1 - d / RAD;
              f = f * f * REPEL * pw;
              ax += (dx / d) * f; ay += (dy / d) * f;
            }
          }
          for (j = 0; j < ripples.length; j++) {
            var rp = ripples[j];
            var rx = X - rp.x, ry = Y - rp.y, rd = Math.sqrt(rx * rx + ry * ry) + 0.001;
            var band = Math.abs(rd - rp.age * RIP_SPEED);
            if (band < RIP_BAND) {
              var life = 1 - rp.age / RIP_LIFE;
              var k = (1 - band / RIP_BAND) * life;
              ax += (rx / rd) * k * 1600; ay += (ry / rd) * k * 1600;
              if (k > e.boost) e.boost = k;
            }
          }
          e.vx += ax * dt; e.vyo += ay * dt;
          e.ox += e.vx * dt; e.oy += e.vyo * dt;
          var om = e.ox * e.ox + e.oy * e.oy;
          if (om > 25600) { var sc = 160 / Math.sqrt(om); e.ox *= sc; e.oy *= sc; }
          e.boost *= decay;
          e.X = bx + e.ox; e.Y = e.y + e.oy;
          var yy = e.Y / H;
          var fin = clamp((1 - yy) / 0.12, 0, 1);
          var fout = clamp((yy - 0.04) / 0.22, 0, 1);
          var tw = e.star ? 0.7 + 0.3 * Math.sin(time * e.tw + e.ph) : 0.85 + 0.15 * Math.sin(time * e.tw + e.ph);
          e.alpha = Math.min(1, e.a * fin * fout * tw * centreFactor(e.X, e.Y) * (1 + e.boost * 1.2));
        }
      }

      function drawGlow(x, y, size, a) {
        if (a <= 0.005) return;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(glow, x - size * 0.5, y - size * 0.5, size, size);
      }

      function render() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        if (overlay) ctx.clearRect(0, 0, W, H); else ctx.drawImage(stat, 0, 0, W, H);
        var i, e, b, s, tw;

        // additive glow pass
        ctx.globalCompositeOperation = 'lighter';
        for (i = 0; i < beads.length; i++) {
          b = beads[i];
          tw = 0.5 + 0.5 * Math.sin(time * b.sp + b.ph);
          drawGlow(b.x, b.y, b.r * 6, 0.1 + 0.22 * tw);
        }
        for (i = 0; i < flames.length; i++) {
          var fl = flames[i];
          drawGlow(fl.x, fl.y, diyaS * 7, 0.3 + 0.08 * Math.sin(time * 1.3 + fl.ph));
        }
        for (i = 0; i < stars.length; i++) {
          s = stars[i];
          tw = 0.5 + 0.5 * Math.sin(time * s.sp + s.ph);
          drawGlow(s.x, s.y, s.r * 5, 0.12 + 0.2 * tw);
        }
        for (i = 0; i < embers.length; i++) {
          e = embers[i];
          if (e.alpha > 0.02) drawGlow(e.X, e.Y, e.r * (e.star ? 7 : 6) * (1 + e.boost * 0.6), e.alpha * 0.35);
        }
        for (i = 0; i < ripples.length; i++) {
          var rp0 = ripples[i], q = rp0.age / 0.45;
          if (q < 1) drawGlow(rp0.x, rp0.y, 70, 0.22 * (1 - q));
        }

        // solid cores
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = HI;
        for (i = 0; i < beads.length; i++) {
          b = beads[i];
          tw = 0.5 + 0.5 * Math.sin(time * b.sp + b.ph);
          ctx.globalAlpha = 0.3 + 0.6 * tw;
          ctx.beginPath();
          ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.45, 0, TAU);
          ctx.fill();
        }
        for (i = 0; i < stars.length; i++) {
          s = stars[i];
          tw = 0.5 + 0.5 * Math.sin(time * s.sp + s.ph);
          ctx.globalAlpha = 0.7 + 0.3 * tw;
          ctx.fillStyle = tw > 0.6 ? HI : GOLD;
          ctx.beginPath();
          starPath(ctx, s.x, s.y, s.r * (0.85 + 0.15 * tw));
          ctx.fill();
        }
        for (i = 0; i < embers.length; i++) {
          e = embers[i];
          if (e.alpha <= 0.02) continue;
          ctx.globalAlpha = e.alpha;
          ctx.fillStyle = (e.hi || e.boost > 0.3) ? HI : GOLD;
          var r = e.r * (1 + e.boost * 0.5);
          ctx.beginPath();
          if (e.star) starPath(ctx, e.X, e.Y, r * 1.6);
          else ctx.arc(e.X, e.Y, r, 0, TAU);
          ctx.fill();
        }

        // ripples
        for (i = 0; i < ripples.length; i++) {
          var rp = ripples[i], p = rp.age / RIP_LIFE, rad = rp.age * RIP_SPEED;
          if (rad < 1) continue;
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 7;
          ctx.globalAlpha = 0.07 * (1 - p);
          ctx.beginPath(); ctx.arc(rp.x, rp.y, rad, 0, TAU); ctx.stroke();
          ctx.strokeStyle = HI;
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = 0.32 * Math.pow(1 - p, 1.5);
          ctx.beginPath(); ctx.arc(rp.x, rp.y, rad, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      /* ---------- loop / lifecycle ---------- */

      function frame(now) {
        raf = 0;
        if (destroyed) return;
        var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        if (W > 0 && H > 0) {
          time += dt;
          update(dt);
          render();
        }
        raf = requestAnimationFrame(frame);
      }

      function start() {
        if (destroyed || reduced || raf || document.hidden) return;
        last = 0;
        raf = requestAnimationFrame(frame);
      }

      function stop() {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
      }

      function renderStill() {
        if (W > 0 && H > 0) { update(0); render(); }
      }

      function resize() {
        if (destroyed) return;
        var w = stage.clientWidth, h = stage.clientHeight;
        if (w <= 0 || h <= 0) { W = 0; H = 0; return; }
        var oldW = W, oldH = H;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = w; H = h;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        buildStrands();
        buildStars();
        syncEmbers(oldW, oldH);
        buildStatic();
        if (reduced) renderStill(); else { render(); start(); }
      }

      function localPos(ev) {
        var rc = stage.getBoundingClientRect();
        pointer.x = ev.clientX - rc.left - stage.clientLeft;
        pointer.y = ev.clientY - rc.top - stage.clientTop;
      }

      function onMove(ev) { localPos(ev); pointer.active = true; }
      function onLeave() { pointer.active = false; }
      function onDown(ev) {
        localPos(ev);
        pointer.active = true;
        if (reduced || W <= 0) return;
        ripples.push({ x: pointer.x, y: pointer.y, age: 0 });
        if (ripples.length > 4) ripples.shift();
      }
      function onVis() { if (document.hidden) stop(); else start(); }
      function onMq() {
        reduced = !!(mq && mq.matches);
        if (reduced) { stop(); ripples.length = 0; renderStill(); } else start();
      }

      var opts = { passive: true };
      stage.addEventListener('pointermove', onMove, opts);
      stage.addEventListener('pointerleave', onLeave, opts);
      stage.addEventListener('pointerdown', onDown, opts);
      document.addEventListener('visibilitychange', onVis);
      if (mq) {
        if (mq.addEventListener) mq.addEventListener('change', onMq);
        else if (mq.addListener) mq.addListener(onMq);
      }

      var ro = null;
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(function () { resize(); });
        ro.observe(stage);
      } else {
        window.addEventListener('resize', resize);
      }
      resize();

      return {
        destroy: function () {
          if (destroyed) return;
          destroyed = true;
          stop();
          if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
          stage.removeEventListener('pointermove', onMove, opts);
          stage.removeEventListener('pointerleave', onLeave, opts);
          stage.removeEventListener('pointerdown', onDown, opts);
          document.removeEventListener('visibilitychange', onVis);
          if (mq) {
            if (mq.removeEventListener) mq.removeEventListener('change', onMq);
            else if (mq.removeListener) mq.removeListener(onMq);
          }
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
          embers.length = 0; ripples.length = 0;
        }
      };
    }
  };
})();
