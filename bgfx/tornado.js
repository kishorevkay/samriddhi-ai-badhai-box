// Curation tornado for the builder: course cards whirl up in a golden funnel, pour into the AI Badhai Box, the lid shuts
// and gold dust bursts out. Ported from the teaser film's scene (TEASER_FILM/tornado), drawn on a transparent canvas over
// the site's own background. create(el) → { ready, play(), stop() }; the timeline is in seconds and the lid shuts at CLOSE.
import * as THREE from "../vendor/three.module.min.js";

export const DUR = 6.5, CLOSE = 5.42;
const INK = "#7A1128", CREAM = "#FEF9E7", GOLD = "#D9A84A";
const asset = (p) => new URL("../assets/" + p, import.meta.url).href;

const ease = (p) => { p = Math.min(1, Math.max(0, p)); return p * p * (3 - 2 * p); };
const easeIn = (p) => { p = Math.min(1, Math.max(0, p)); return p * p * p; };

function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, "rgba(255,226,160,1)"); r.addColorStop(.35, "rgba(255,206,120,.55)"); r.addColorStop(1, "rgba(255,190,90,0)");
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sparkTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,248,220,1)"); r.addColorStop(.25, "rgba(255,214,130,.8)"); r.addColorStop(1, "rgba(255,190,90,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "rgba(255,250,235,.95)"; g.beginPath();                       // 4-point star core
  g.moveTo(64, 14); g.quadraticCurveTo(70, 58, 114, 64); g.quadraticCurveTo(70, 70, 64, 114); g.quadraticCurveTo(58, 70, 14, 64); g.quadraticCurveTo(58, 58, 64, 14); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dustTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,246,214,1)"); r.addColorStop(.18, "rgba(244,206,120,1)"); r.addColorStop(.42, "rgba(214,160,64,.35)"); r.addColorStop(1, "rgba(214,160,64,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
// course card: cream paper, gold edge, paper-cut icon, short name
function iconCard(image, label) {
  const c = document.createElement("canvas"); c.width = 360; c.height = 480; const g = c.getContext("2d");
  roundRect(g, 6, 6, 348, 468, 36); g.fillStyle = CREAM; g.fill(); g.lineWidth = 7; g.strokeStyle = GOLD; g.stroke();
  roundRect(g, 22, 22, 316, 436, 26); g.lineWidth = 2; g.strokeStyle = "rgba(217,168,74,.55)"; g.stroke();
  g.save(); roundRect(g, 40, 40, 280, 280, 18); g.clip(); g.drawImage(image, 40, 40, 280, 280); g.restore();
  g.fillStyle = INK; g.textAlign = "center"; g.font = "800 64px 'Playfair Display'"; g.fillText(label, 180, 410);
  return canvasTex(c);
}
function tileCard(image) {
  const c = document.createElement("canvas"); c.width = 520; c.height = 400; const g = c.getContext("2d");
  roundRect(g, 6, 6, 508, 388, 30); g.fillStyle = CREAM; g.fill(); g.lineWidth = 7; g.strokeStyle = GOLD; g.stroke();
  g.save(); roundRect(g, 24, 24, 472, 352, 18); g.clip();
  const sc = Math.max(472 / image.width, 352 / image.height), dw = image.width * sc, dh = image.height * sc;   // cover-fit
  g.drawImage(image, 24 + (472 - dw) / 2, 24 + (352 - dh) / 2, dw, dh); g.restore();
  return canvasTex(c);
}

const ICONS = [["01_ai", "AI"], ["02_data", "DATA"], ["04_sql", "SQL"], ["05_stats", "STATS"], ["06_code", "CODE"], ["07_cloud", "CLOUD"], ["08_ml", "ML"],
  ["09_security", "CYBER"], ["10_seo", "SEO"], ["11_social", "SOCIAL"], ["12_email", "EMAIL"], ["13_lead", "LEAD"], ["14_strategy", "PLAN"], ["15_design", "DESIGN"], ["16_bigmove_career", "CAREER"]];
const TILES = ["d1_data_ai", "d2_tech_ai", "d3_marketing_ai", "d4_management_ai", "g1_the_essential", "g2_mastery_track", "g3_short_courses", "g4_ai_learning", "g5_free_courses", "g6_bigger_move"];

const S = 4.37, BOX_Y = -2.06;                 // box layers share one square frame (S world units), centred at BOX_Y
const MOUTH = new THREE.Vector3(0, BOX_Y + S * (.5 - .452), 0);
const VIEW_Y = -.55, HALF_H = 3.95, HALF_W = 2.75;   // what must stay in frame: the whole box and the top of the funnel

export function create(el) {
  const small = Math.min(window.innerWidth, screen.width || 9999) < 640;   // phones: fewer cards and sprites
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
  const loader = new THREE.TextureLoader();
  const tex = (src) => new Promise((res, rej) => loader.load(src, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t); }, undefined, rej));
  const img = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const cards = [], sparks = [], dust = [];
  let lid, glowMouth, glowFunnel, flash, now = 0, raf = 0, t0 = 0;

  function size() {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    const a = w / h, tanH = Math.tan(THREE.MathUtils.degToRad(20));
    camera.aspect = a; camera.position.set(0, VIEW_Y, Math.max(HALF_H / tanH, HALF_W / (tanH * a))); camera.updateProjectionMatrix();
    render(now);
  }

  async function build() {
    await document.fonts.load("800 64px 'Playfair Display'");
    const layer = async (name, order) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshBasicMaterial({ map: await tex(asset(`tornado/box_${name}.webp`)), transparent: true, depthTest: false, depthWrite: false }));
      m.renderOrder = order; scene.add(m); return m;
    };
    (await layer("inside", 1)).position.set(0, BOX_Y, 0);
    (await layer("body", 300)).position.set(0, BOX_Y, 0);
    // lid pivots on its left hinge (frame px 438, 1001 of 2048)
    const hx = S * (438 / 2048 - .5), hy = S * (.5 - 1001 / 2048);
    const lg = new THREE.PlaneGeometry(S, S); lg.translate(-hx, -hy, 0);
    lid = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ map: await tex(asset("tornado/box_lid.webp")), transparent: true, depthTest: false, depthWrite: false }));
    lid.position.set(hx, BOX_Y + hy, 0); lid.renderOrder = 310; scene.add(lid);

    const gT = glowTexture();
    const glow = (order) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gT, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending })); s.renderOrder = order; scene.add(s); return s; };
    glowMouth = glow(2); glowFunnel = glow(0); flash = glow(400);

    const icons = await Promise.all(ICONS.map(([f]) => img(asset(`tornado/icons/icon_${f}.jpg`))));
    const tiles = await Promise.all(TILES.map((f) => img(asset(`course/${f}.webp`))));
    const defs = [...ICONS.map(([, l], i) => ({ t: iconCard(icons[i], l), w: .78, h: 1.04 })), ...tiles.map((im) => ({ t: tileCard(im), w: 1.12, h: .86 }))];
    if (!small) defs.push(...defs.map((d) => ({ ...d })));        // a fuller funnel on bigger screens
    defs.sort(() => rnd() - .5);
    defs.forEach((d, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), new THREE.MeshBasicMaterial({ map: d.t, transparent: true, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
      const n = defs.length;
      m.userData = {
        phase: (k / n) * Math.PI * 2 * 5 + rnd() * .5,          // 5 turns of the spiral spread across the deck
        h: .15 + .85 * (k / (n - 1)),                            // height in the funnel (0 = mouth, 1 = top)
        enter: .35 + rnd() * 1.0,                                // when it flies in
        dive: 3.35 + (k / (n - 1)) * 1.15 + rnd() * .1,          // low cards drop in first, the top of the funnel last
        from: new THREE.Vector3((rnd() - .5) * 9, 6 + rnd() * 4, 2 + rnd() * 3),
        spin: (rnd() - .5) * 6, wob: rnd() * 6.28,
      };
      scene.add(m); cards.push(m);
    });
    const sT = sparkTexture();
    for (let i = 0; i < (small ? 120 : 200); i++) {           // gold sparkles riding the funnel
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sT, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.userData = { phase: rnd() * 6.28, h: rnd(), size: .04 + rnd() * .1, speed: .7 + rnd() * .9 };
      s.renderOrder = 250; scene.add(s); sparks.push(s);
    }
    const dT = dustTexture();
    for (let i = 0; i < (small ? 240 : 420); i++) {           // gold dust out of the closing box
      const glint = i < 28, a = rnd() * Math.PI * 2, up = .35 + rnd() * .6, sp = (glint ? 1.3 : 1) * (1.2 + rnd() * 3.4);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glint ? sT : dT, transparent: true, depthTest: false, depthWrite: false, blending: glint ? THREE.AdditiveBlending : THREE.NormalBlending }));
      s.userData = { v: new THREE.Vector3(Math.cos(a) * sp * (1.1 - up) * 2.2, sp * up * 2.3, Math.sin(a) * sp * .6), size: glint ? .08 + rnd() * .06 : .022 + rnd() * .04,
        delay: rnd() * .15, life: 1.2 + rnd() * 1.0, tw: rnd() * 6.28, glint };
      s.renderOrder = 420; scene.add(s); dust.push(s);
    }
  }

  function funnel(h, ang) {                    // point on the tornado for height h and angle ang
    const r = .28 + 1.45 * Math.pow(h, 1.3);
    return new THREE.Vector3(Math.cos(ang) * r, MOUTH.y + .7 + h * 4.15, Math.sin(ang) * r * .5);
  }

  function update(t) {
    t = Math.max(0, Math.min(DUR, t));
    // lid: opens at the start, slams shut once the last card is in
    const open = ease((t - .15) / .55) * (1 - ease((t - 5.05) / .32));
    lid.rotation.z = open * .5; lid.position.y = BOX_Y + S * (.5 - 1001 / 2048) + open * .55 + Math.sin(t * 3) * .02 * open;
    lid.position.x = S * (438 / 2048 - .5) - open * .55;
    lid.renderOrder = open > .02 && t < 5.0 ? 40 : 310;        // behind the whirl while open, in front when it shuts
    const angAt = (tt) => 1.6 * tt + .55 * tt * tt;             // the whirl accelerates into the dive
    const swirl = ease((t - .9) / 1.2);
    cards.forEach((m) => {
      const u = m.userData;
      const ang = u.phase + angAt(t) * (.75 + u.h * .35);
      const hh = u.h + Math.sin(t * 1.7 + u.wob) * .03;
      const inP = ease((t - u.enter) / .9);
      let p = u.from.clone().lerp(funnel(hh, ang), inP);
      let s = .55 + .45 * inP, op = Math.min(1, (t - u.enter + .2) / .25);
      const d = easeIn((t - u.dive) / .55);                    // dive: spiral down to the mouth, shrink, vanish behind the front wall
      if (d > 0) { const dp = funnel(Math.max(0, hh * (1 - d)), ang + d * 4); p = dp.lerp(MOUTH.clone().add(new THREE.Vector3(0, -.35, 0)), d); s *= 1 - .7 * d; }
      if (t > u.dive + .55) op = 0;
      m.position.copy(p); m.scale.setScalar(s * (1 + .08 * swirl));
      m.rotation.set(Math.sin(t * 2 + u.wob) * .22, Math.sin(ang) * .75 + u.spin * .4 * (1 - inP), Math.cos(ang) * .28 * swirl + Math.sin(t * 1.3 + u.wob) * .1);
      m.material.opacity = Math.max(0, Math.min(1, op));
      m.renderOrder = d > .65 ? 50 + p.z : 100 + Math.round(p.z * 20);
    });
    const whirl = ease((t - .8) / 1.4) * (1 - ease((t - 4.7) / .6));
    glowFunnel.position.set(0, MOUTH.y + 2.6, -1); glowFunnel.scale.set(4.2, 7.5, 1); glowFunnel.material.opacity = .32 * whirl;
    const mouthG = ease((t - .25) / .6) * (1 - ease((t - 5.1) / .3));
    glowMouth.position.set(0, MOUTH.y + .45, 0); glowMouth.scale.set(3.4 + Math.sin(t * 5) * .15, 2.6, 1); glowMouth.material.opacity = .85 * mouthG;
    const fl = Math.max(0, 1 - Math.abs(t - CLOSE) / .22);
    flash.position.set(0, MOUTH.y + .2, .5); flash.scale.setScalar(2.5 + 9 * ease((t - 5.3) / .5)); flash.material.opacity = fl * .7;
    sparks.forEach((s) => {
      const u = s.userData, ang = u.phase + angAt(t) * u.speed, hh = (u.h + t * .07 * u.speed) % 1;
      s.position.copy(funnel(hh, ang)); s.position.x *= 1.15;
      s.material.opacity = whirl * (.45 + .4 * Math.sin(t * 9 + u.phase)); s.scale.setScalar(u.size * (1 + .4 * whirl));
    });
    dust.forEach((s) => {
      const u = s.userData, tt = t - 5.38 - u.delay;
      if (tt <= 0) { s.material.opacity = 0; return; }
      const k = 1.8, e = (1 - Math.exp(-k * tt)) / k;          // ballistic arcs with drag and gravity
      s.position.set(MOUTH.x + u.v.x * e, MOUTH.y + .3 + u.v.y * e - .75 * tt * tt, MOUTH.z + u.v.z * e);
      const life = Math.max(0, 1 - tt / u.life);
      s.material.opacity = life * (u.glint ? .9 : (.7 + .3 * Math.sin(tt * 18 + u.tw)));
      s.scale.setScalar(u.size * (u.glint ? (.8 + .4 * Math.sin(tt * 14 + u.tw)) : 1));
    });
  }
  function render(t) { if (!lid) return; now = t; update(t); renderer.render(scene, camera); }

  const ready = build().then(() => { size(); if (window.ResizeObserver) new ResizeObserver(size).observe(el); else window.addEventListener("resize", size); });
  return {
    ready,
    // plays the whole curation once (DUR seconds) and holds the last frame: the box shut and tied
    play() { cancelAnimationFrame(raf); t0 = performance.now(); (function loop(n) { const t = (n - t0) / 1000; render(t); if (t < DUR) raf = requestAnimationFrame(loop); })(t0); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
