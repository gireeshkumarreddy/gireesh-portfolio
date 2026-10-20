/* =========================================================================
   Cinematic Designer Portfolio — direction & choreography
   One fixed stage, one scroll track. Every scene reads the same scroll
   position (in viewport heights) so transitions overlap without cuts.
   ========================================================================= */
(function () {
  'use strict';

  /* ---------- edit your details here ---------- */
  const CONFIG = {
    name: 'Gireesh',
    role: 'Visual & UI/UX Designer',
    email: 'hello@yourname.design',
    handle: '@gireesh',
    social: 'https://x.com/gireesh',
    wordmark: 'Book My Design',
    mark: 'GIREESH', // dot-matrix monogram in the studio scene (A–Z, up to ~5 letters)
  };

  /* ---------- film timeline, in viewport heights of scroll ---------- */
  const T = { heroHold: .2, heroOut: 1.25, uniStart: .25, uniLen: 6.95, camStart: 7.2, camLen: 4 };
  T.uniEnd = T.uniStart + T.uniLen; T.total = T.camStart + T.camLen;
  const CHAPTERS = [
    { id: 'reel', label: 'Reel', s: 0 },
    { id: 'universe', label: 'Universe', s: T.uniStart + T.uniLen * .1 },
    { id: 'genesis', label: 'Genesis', s: T.uniStart + T.uniLen * .55 },
    { id: 'skills', label: 'Capabilities', s: T.uniStart + T.uniLen * .86 },
    { id: 'camera', label: 'Camera', s: T.camStart + T.camLen * .66 },
    { id: 'studio', label: 'Studio', s: T.total },
  ];

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const bell = (v, a, b, c, d) => smooth(a, b, v) * (1 - smooth(c, d, v));
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const html = document.documentElement;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    s: 0, vw: innerWidth, vh: innerHeight, t: 0,
    entered: false, entering: false, sound: true, vol: 0,
    mouse: { x: 0, y: 0, nx: 0, ny: 0, sx: 0, sy: 0 },
  };

  /* ---------- config binding ---------- */
  $$('[data-cfg]').forEach((el) => { el.textContent = CONFIG[el.dataset.cfg] ?? ''; });
  $$('[data-cfg-href]').forEach((el) => {
    const k = el.dataset.cfgHref;
    el.href = k === 'mailto' ? `mailto:${CONFIG.email}` : CONFIG[k];
  });

  /* ---------- film grain ---------- */
  (function grain() {
    const c = document.createElement('canvas'); c.width = c.height = 220;
    const g = c.getContext('2d'); const d = g.createImageData(220, 220);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    $('#grain').style.backgroundImage = `url(${c.toDataURL('image/png')})`;
  })();

  /* =================================================================== SOUND
     Light synthesized sound design + the reel's own soundtrack. */
  const Sound = {
    ctx: null, master: null, drone: null,
    unlock() {
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
          this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = state.sound ? .7 : 0; this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { /* audio is optional */ }
    },
    setOn(on) { if (this.master) this.master.gain.setTargetAtTime(on ? .7 : 0, this.ctx.currentTime, .1); },
    noise(dur) {
      const b = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = this.ctx.createBufferSource(); s.buffer = b; return s;
    },
    whoosh(dur = 2.4, from = 200, to = 2400, vol = .12) {
      if (!this.ctx) return; const t = this.ctx.currentTime;
      const n = this.noise(dur), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      f.type = 'bandpass'; f.Q.value = .8; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur * .7);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .55); g.gain.linearRampToValueAtTime(0, t + dur);
      n.connect(f).connect(g).connect(this.master); n.start(t); n.stop(t + dur);
    },
    boom() {
      if (!this.ctx) return; const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), og = this.ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.6);
      og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(.55, t + .03); og.gain.exponentialRampToValueAtTime(.0001, t + 2.2);
      o.connect(og).connect(this.master); o.start(t); o.stop(t + 2.3);
      const n = this.noise(2.4), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      f.type = 'lowpass'; f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(180, t + 2);
      g.gain.setValueAtTime(.32, t); g.gain.exponentialRampToValueAtTime(.0001, t + 2.3);
      n.connect(f).connect(g).connect(this.master); n.start(t); n.stop(t + 2.4);
      // glass tinkle
      for (let i = 0; i < 14; i++) {
        const tt = t + .25 + Math.random() * 1.6, oo = this.ctx.createOscillator(), gg = this.ctx.createGain();
        oo.type = 'sine'; oo.frequency.value = 2400 + Math.random() * 4200;
        gg.gain.setValueAtTime(.0001, tt); gg.gain.exponentialRampToValueAtTime(.03, tt + .005); gg.gain.exponentialRampToValueAtTime(.0001, tt + .35);
        oo.connect(gg).connect(this.master); oo.start(tt); oo.stop(tt + .4);
      }
    },
    blip(freq = 1320, vol = .06) {
      if (!this.ctx) return; const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'square'; o.frequency.value = freq; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .12);
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3000;
      o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + .15);
    },
    setDrone(level, pitch) {
      if (!this.ctx) return;
      if (!this.drone && level > .001) {
        const g = this.ctx.createGain(); g.gain.value = 0;
        const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 4;
        const os = [55, 55.4, 82.4].map((fr, i) => { const o = this.ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
        f.connect(g).connect(this.master); this.drone = { g, f, os };
      }
      if (!this.drone) return;
      const t = this.ctx.currentTime;
      this.drone.g.gain.setTargetAtTime(level * .07, t, .25);
      this.drone.f.frequency.setTargetAtTime(260 + pitch * 1400, t, .3);
      this.drone.os.forEach((o, i) => o.frequency.setTargetAtTime([55, 55.4, 82.4][i] * (1 + pitch * .5), t, .3));
    },
  };

  /* ================================================================ CURSOR */
  const cur = $('#cursor'), curDot = $('.cur__dot'), curRing = $('.cur__ring'), curLabel = $('.cur__ring em');
  const cp = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
  let curText = '';
  function setCursorLabel(txt) {
    if (txt === curText) return; curText = txt;
    if (txt) curLabel.textContent = txt;
    cur.classList.toggle('has-label', !!txt);
  }
  addEventListener('pointermove', (e) => {
    cp.x = e.clientX; cp.y = e.clientY;
    state.mouse.x = e.clientX; state.mouse.y = e.clientY;
    state.mouse.nx = (e.clientX / state.vw) * 2 - 1; state.mouse.ny = -((e.clientY / state.vh) * 2 - 1);
    const el = e.target.closest ? e.target.closest('[data-cursor]') : null;
    let label = el ? el.dataset.cursor : '';
    if (!label && state.entered && state.s < .2 && e.target.closest && e.target.closest('#hero') && !e.target.closest('button, a')) label = 'Drag';
    if (state.entering) label = '';
    setCursorLabel(label);
  }, { passive: true });
  addEventListener('pointerdown', () => cur.classList.add('is-down'));
  addEventListener('pointerup', () => cur.classList.remove('is-down'));

  /* ================================================================= LENIS */
  const track = $('#track');
  let lenis = null;
  try {
    lenis = new window.Lenis({ lerp: reduce ? 1 : .085, wheelMultiplier: .85, smoothWheel: !reduce, syncTouch: false });
    lenis.stop();
  } catch (e) { lenis = null; }
  const scrollPx = () => (lenis ? lenis.animatedScroll : window.scrollY);
  function scrollToS(s, dur) {
    const px = s * state.vh;
    const d = dur ?? clamp(Math.abs(s - state.s) * .55, 1.2, 4.8);
    if (lenis) lenis.scrollTo(px, { duration: d, easing: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), force: true });
    else window.scrollTo({ top: px, behavior: 'smooth' });
  }

  /* ================================================================ LAYOUT */
  const opening = $('#opening'), hero = $('#hero'), heroFrame = $('#heroFrame'), reel = $('#reel'), reelVideo = $('#reelVideo'), reelPoster = $('.reel__poster');
  const camera = $('#camera'), studio = $('#studio'), gl = $('#gl'), veil = $('#veil'), flash = $('#flash');
  const uniCopy = $('#uniCopy'), skPanel = $('.sk__panel'), skShade = $('.sk__shade'), bar = $('#bar'), chapters = $('#chapters');

  function layout() {
    state.vw = innerWidth; state.vh = innerHeight;
    track.style.height = `${Math.round((T.total + 1) * state.vh)}px`;
    ringLayout();
    if (universe) universe.resize(state.vw, state.vh);
    sizeDust(); sizeMarks();
  }

  /* ================================================================ LOADER */
  let universe = null;
  const IMAGES = ['opening-bg', 'card-shattered', 'card-genesis', 'reel-poster', 'camera', 'designer-shades', 'avatar',
    'ring-glass', 'ring-shades', 'ring-crystal', 'ring-robot', 'ring-human', 'ring-camera', 'ring-reel', 'ring-ui', 'ring-film',
    'site-bms', 'site-hero', 'site-film', 'site-genesis', 'site-glass', 'site-shades'].map((n) => `assets/img/${n}.jpg`);

  async function preload() {
    const bar = $('.ld__bar i'), cnt = $('#ldCount');
    const total = IMAGES.length + 3; let done = 0, shown = 0;
    const tick = () => { done++; };
    const ticker = setInterval(() => {
      shown = lerp(shown, done / total, .18);
      bar.style.transform = `scaleX(${shown})`; cnt.textContent = Math.round(shown * 100);
    }, 33);
    const imgs = IMAGES.map((src) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => { tick(); res(); }; i.src = src; }));
    const video = new Promise((res) => {
      let fin = false; const ok = () => { if (!fin) { fin = true; tick(); res(); } };
      reelVideo.addEventListener('canplaythrough', ok, { once: true });
      reelVideo.addEventListener('error', ok, { once: true });
      setTimeout(ok, 9000); reelVideo.load();
    });
    const fonts = (document.fonts ? document.fonts.ready : Promise.resolve()).then(tick);
    const gfx = window.Universe.then(async (u) => {
      universe = u;
      if (u) { u.resize(state.vw, state.vh); await u.prewarm(); }
      tick();
    });
    await Promise.all([...imgs, video, fonts, gfx]);
    await new Promise((r) => setTimeout(r, 350));
    clearInterval(ticker); bar.style.transform = 'scaleX(1)'; cnt.textContent = '100';
  }

  /* =============================================================== OPENING */
  const cards = $$('.card').map((el) => ({
    el, main: el.classList.contains('card--main'), side: el.classList.contains('card--l') ? -1 : el.classList.contains('card--r') ? 1 : 0,
    rx: 0, ry: 0, tx: 0, ty: 0, s: 1, hov: 0, mx: 0, my: 0, gx: 50, gy: 50, a: 210,
    intro: { y: 90, rx: 16 }, out: { x: 0, ry: 0 }, hover: false,
  }));
  cards.forEach((c) => {
    c.el.addEventListener('pointerenter', () => { c.hover = true; });
    c.el.addEventListener('pointerleave', () => { c.hover = false; });
  });
  const opBg = $('.op__bg');

  function openingFrame() {
    const m = state.mouse;
    opBg.style.transform = `translate3d(${(-m.sx * 14).toFixed(2)}px, ${(m.sy * 9).toFixed(2)}px, 0) scale(1.06)`;
    const rects = cards.map((c) => c.el.getBoundingClientRect());
    cards.forEach((c, ci) => {
      const r = rects[ci];
      const px = clamp((m.x - r.left) / r.width), py = clamp((m.y - r.top) / r.height);
      const hot = c.hover && !state.entering;
      if (!state.entering) {
      const trx = hot ? -(py - .5) * 11 : m.sy * 3.2;
      const try_ = hot ? (px - .5) * 15 : m.sx * 4.5 + c.side * -3;
      c.rx = lerp(c.rx, trx, .09); c.ry = lerp(c.ry, try_, .09);
      c.tx = lerp(c.tx, -m.sx * (c.main ? 10 : 18), .07);
      c.ty = lerp(c.ty, m.sy * (c.main ? 6 : 10), .07);
      c.hov = lerp(c.hov, hot ? 1 : 0, .1);
      c.s = lerp(c.s, hot ? (c.main ? 1.025 : 1.03) : 1, .1);
      c.mx = lerp(c.mx, hot ? -(px - .5) * 18 : -m.sx * 6, .08);
      c.my = lerp(c.my, hot ? -(py - .5) * 12 : m.sy * 4, .08);
      c.gx = lerp(c.gx, px * 100, .15); c.gy = lerp(c.gy, py * 100, .15);
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      c.a = Math.atan2(m.x - cx, -(m.y - cy)) * 57.2958;
      }
      const st = c.el.style;
      st.setProperty('--rx', `${(c.rx + c.intro.rx).toFixed(2)}deg`);
      st.setProperty('--ry', `${(c.ry + c.out.ry).toFixed(2)}deg`);
      st.setProperty('--tx', `${(c.tx + c.out.x).toFixed(1)}px`);
      st.setProperty('--ty', `${(c.ty + c.intro.y).toFixed(1)}px`);
      st.setProperty('--s', c.s.toFixed(4));
      st.setProperty('--hov', c.hov.toFixed(3));
      st.setProperty('--mx', `${c.mx.toFixed(1)}px`); st.setProperty('--my', `${c.my.toFixed(1)}px`);
      st.setProperty('--gx', `${c.gx.toFixed(1)}%`); st.setProperty('--gy', `${c.gy.toFixed(1)}%`);
      st.setProperty('--a', `${(c.a - 0).toFixed(1)}deg`);
    });
  }

  function introOpening() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'power4.inOut' })
      .set('#loader', { display: 'none' })
      .fromTo(opBg, { opacity: 0 }, { opacity: 1, duration: 2.2, ease: 'power2.out' }, .35)
      .fromTo(opBg.querySelector('img'), { scale: 1.16, filter: 'saturate(.9) brightness(.2)' }, { scale: 1, filter: 'saturate(.9) brightness(.82)', duration: 2.8 }, .35)
      .from('.op__nav > *', { y: -24, opacity: 0, duration: 1.2, stagger: .08 }, .9);
    cards.forEach((c, i) => {
      const at = c.main ? 1.0 : 1.22;
      tl.fromTo(c.el, { opacity: 0, filter: 'blur(14px)' }, { opacity: 1, filter: 'blur(0px)', duration: 1.4, clearProps: 'filter' }, at)
        .to(c.intro, { y: 0, rx: 0, duration: 1.8, ease: 'expo.out' }, at);
    });
    tl.from('.card__title', { letterSpacing: '.3em', opacity: 0, duration: 1.8, ease: 'expo.out', stagger: .08 }, 1.5)
      .from('.op__search', { y: 40, opacity: 0, duration: 1.3 }, 1.6)
      .from('.op__hint', { opacity: 0, y: 10, duration: 1 }, 2.1);
    typewriter();
  }

  // search: cycle suggestions, Enter dives in
  const SUGGEST = ['Search Brand Identity, Motion, UI/UX…', 'Try “Typography”', 'Try “Art Direction”', 'Try “3D & CGI”', 'Search Movies, Events, Sports, Venues… just kidding: search the work'];
  function typewriter() {
    const inp = $('#opSearchInput'); let i = 0;
    const run = () => {
      if (state.entered || document.activeElement === inp) return setTimeout(run, 2500);
      const txt = SUGGEST[i++ % SUGGEST.length]; let k = 0;
      const step = () => { inp.placeholder = txt.slice(0, ++k); if (k < txt.length) setTimeout(step, 34); else setTimeout(run, 2600); };
      step();
    };
    setTimeout(run, 3200);
  }
  $('#opSearch').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#opSearchInput').value.toLowerCase();
    const target = /type|brand|ui|ux|motion|3d|art|skill|direction|system/.test(q) ? 'skills' : /camera|film|video/.test(q) ? 'camera' : /contact|hire|mail/.test(q) ? 'studio' : null;
    $('#opSearchInput').blur(); enter(target);
  });

  /* ================================================================= ENTRY */
  const mainCard = $('#mainCard');
  mainCard.addEventListener('click', () => enter());
  mainCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); } });
  let wheelAcc = 0;
  addEventListener('wheel', (e) => {
    if (state.entered || state.entering || html.classList.contains('is-loading')) return;
    wheelAcc += Math.max(0, e.deltaY);
    if (wheelAcc > 120) enter();
  }, { passive: true });
  let touchY = null;
  addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (state.entered || state.entering || touchY === null || html.classList.contains('is-loading')) return;
    if (touchY - e.touches[0].clientY > 60) enter();
  }, { passive: true });

  let pendingGoto = null;
  function enter(then) {
    if (then) pendingGoto = then;
    if (state.entered || state.entering || html.classList.contains('is-loading')) return;
    state.entering = true; setCursorLabel('');
    Sound.unlock(); Sound.whoosh(3.1, 120, 1800, .1);

    const main = cards.find((c) => c.main);
    const others = cards.filter((c) => !c.main);
    const tl = gsap.timeline();

    // 1 · the frame settles, everything else leaves
    tl.to(main, { rx: 0, ry: 0, tx: 0, ty: 0, s: 1, mx: 0, my: 0, duration: .5, ease: 'power2.out', onUpdate: () => (main.hover = false) }, 0)
      .to(mainCard.querySelector('.card__title'), { letterSpacing: '.55em', opacity: 0, filter: 'blur(8px)', duration: .9, ease: 'power2.in' }, 0)
      .to(mainCard.querySelectorAll('.card__meta, .card__rate, .card__play'), { opacity: 0, y: 12, duration: .5, ease: 'power2.in' }, 0);
    others.forEach((c) => {
      tl.to(c.out, { x: c.side * state.vw * .32, ry: c.side * 28, duration: 1.6, ease: 'power3.inOut' }, .05)
        .to(c.el, { opacity: 0, filter: 'blur(10px)', duration: 1.2, ease: 'power2.in' }, .15);
    });
    tl.to('.op__nav', { y: -40, opacity: 0, duration: 1, ease: 'power3.in' }, 0)
      .to('.op__search', { y: 60, opacity: 0, duration: 1, ease: 'power3.in' }, 0)
      .to('.op__hint', { opacity: 0, duration: .4 }, 0)
      .to(opBg.querySelector('img'), { filter: 'saturate(.6) brightness(.08)', scale: 1.12, duration: 2.6, ease: 'power2.inOut' }, .2);

    // 2 · the reel takes over the frame and opens to full screen
    tl.add(() => {
      const r = mainCard.getBoundingClientRect();
      const w = mainCard.offsetWidth, h = mainCard.offsetHeight;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const rad = parseFloat(getComputedStyle(mainCard).borderRadius) || 18;
      hero.style.visibility = 'visible';
      gsap.set(reel, { visibility: 'visible', left: cx - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: rad, boxShadow: '0 40px 90px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.25)' });
      gsap.set(mainCard, { opacity: 0 });
      reelVideo.currentTime = 0; reelVideo.pause();
      const ex = gsap.timeline({ onComplete: playReel });
      ex.to(reel, { left: 0, top: 0, width: state.vw, height: state.vh, borderRadius: 0, duration: 2.6, ease: 'expo.inOut' }, 0)
        .to(reel, { boxShadow: '0 0 0 0 rgba(0,0,0,0), 0 0 0 0 rgba(255,255,255,0)', duration: 1.4, ease: 'power2.in' }, 1)
        .fromTo(reelPoster, { scale: 1.1 }, { scale: 1, duration: 2.8, ease: 'power3.inOut' }, 0)
        .fromTo(reelVideo, { scale: 1.1 }, { scale: 1, duration: 2.8, ease: 'power3.inOut' }, 0)
        .to(reelVideo, { opacity: 1, duration: .6 }, 1.7)
        .fromTo('.hero__glow', { opacity: 0 }, { opacity: 1, duration: 2 }, 1.6);
      lightSweep(reel, .5, 2.2);
    }, .55);
  }

  function lightSweep(host, delay, dur) {
    const s = document.createElement('i');
    s.style.cssText = 'position:absolute;inset:-20% -60%;pointer-events:none;mix-blend-mode:screen;background:linear-gradient(105deg,transparent 40%,rgba(255,170,110,.0) 44%,rgba(255,200,160,.35) 50%,rgba(255,170,110,0) 56%,transparent 60%);transform:translateX(-60%)';
    host.appendChild(s);
    gsap.to(s, { x: '60%', duration: dur, delay, ease: 'power2.inOut', onComplete: () => s.remove() });
  }

  function playReel() {
    reel.style.cssText += ';left:0;top:0;width:100%;height:100%;';
    reelVideo.muted = !state.sound;
    reelVideo.volume = 0;
    const p = reelVideo.play();
    if (p && p.catch) p.catch(() => { reelVideo.muted = true; reelVideo.play().catch(() => {}); });
    gsap.to(state, { vol: .75, duration: 3, ease: 'power1.inOut' });
    state.entered = true; state.entering = false;
    html.classList.remove('is-gated');
    opening.style.visibility = 'hidden';
    if (lenis) lenis.start();
    // hero UI arrives
    ring.cards.forEach((c, i) => gsap.to(c, { intro: 1, duration: 1.6, delay: .1 + i * .045, ease: 'expo.out' }));
    gsap.to(['.hero__arrow', '.hero__cta'], { opacity: 1, duration: 1.2, delay: .6, stagger: .1 });
    gsap.fromTo('.hero__cta', { y: 20 }, { y: 0, duration: 1.4, delay: .7, ease: 'expo.out' });
    gsap.to(['.hero__caption', '.hero__hint'], { opacity: 1, duration: 1.4, delay: 1, stagger: .15 });
    gsap.to([bar, chapters], { opacity: 1, duration: 1.2, delay: 1.2 });
    if (pendingGoto) { const g = pendingGoto; pendingGoto = null; setTimeout(() => goto(g), 1200); }
  }

  /* ============================================================ HERO RING */
  const FACES = [
    { img: 'ring-reel', t: 'The Reel', c: 'Showreel · 2026' },
    { face: 'type', t: 'Typography', c: 'Type Specimen' },
    { img: 'ring-glass', t: 'Shattered', c: 'Art Direction' },
    { face: 'palette', t: 'Ember Palette', c: 'Colour System' },
    { img: 'ring-crystal', t: 'Genesis Crystal', c: '3D · CGI' },
    { face: 'bezier', t: 'Vector Craft', c: 'Illustration' },
    { img: 'ring-shades', t: 'Monochrome', c: 'Portrait Series' },
    { face: 'ui', t: 'Interface Kit', c: 'UI Components' },
    { img: 'ring-ui', t: 'Book My Design', c: 'Web Concept' },
    { face: 'grid', t: 'Golden Grid', c: 'Layout Systems' },
    { img: 'ring-film', t: 'Filmmaker Site', c: 'Web Design' },
    { face: 'orb', t: 'Gradient Study', c: 'Colour · Light' },
    { img: 'ring-robot', t: 'Machine Hand', c: 'Concept Art' },
    { img: 'ring-camera', t: 'Director’s Cut', c: 'Motion' },
    { img: 'ring-human', t: 'Human Touch', c: 'Concept Art' },
  ];
  const FACE_HTML = {
    type: '<div class="face face--type"><b>Aa</b><i></i><small>Cinzel · 500</small></div>',
    palette: '<div class="face face--palette">' + [['#FF6A2B', '#1a0b04'], ['#B8101B', '#ffe9e6'], ['#1A0F0B', '#f3efe8'], ['#F3EFE8', '#1a0f0b'], ['#7B61FF', '#fff']].map(([c, t]) => `<span style="background:${c};color:${t}">${c}</span>`).join('') + '</div>',
    bezier: '<div class="face face--bezier"><svg viewBox="0 0 100 100"><path d="M14 74 C 30 14, 70 92, 86 30" stroke="#fff" stroke-width="1.6"/><path d="M14 74 L30 14 M86 30 L70 92" stroke="rgba(255,255,255,.5)" stroke-width=".8"/><circle cx="30" cy="14" r="2.6" fill="#ff6a2b" stroke="none"/><circle cx="70" cy="92" r="2.6" fill="#ff6a2b" stroke="none"/><rect x="11" y="71" width="6" height="6" fill="#fff" stroke="none"/><rect x="83" y="27" width="6" height="6" fill="#fff" stroke="none"/></svg><span class="face__tag">Pen Tool</span></div>',
    ui: '<div class="face face--ui"><svg viewBox="0 0 100 100"><rect x="14" y="16" width="72" height="20" rx="10" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.25)" stroke-width=".8"/><rect x="58" y="19" width="25" height="14" rx="7" fill="#ff6a2b" stroke="none"/><circle cx="76" cy="26" r="5" fill="#fff" stroke="none"/><rect x="18" y="23" width="26" height="5" rx="2.5" fill="rgba(255,255,255,.6)" stroke="none"/><line x1="16" y1="52" x2="84" y2="52" stroke="rgba(255,255,255,.25)" stroke-width="2"/><line x1="16" y1="52" x2="58" y2="52" stroke="#7b61ff" stroke-width="2"/><circle cx="58" cy="52" r="5" fill="#fff" stroke="none"/><rect x="14" y="66" width="72" height="18" rx="9" fill="#fff" stroke="none"/><rect x="34" y="73" width="32" height="4" rx="2" fill="#111" stroke="none"/></svg></div>',
    grid: '<div class="face face--grid"><svg viewBox="0 0 100 100"><g stroke="rgba(255,255,255,.18)" stroke-width=".5">' + Array.from({ length: 9 }, (_, i) => `<line x1="${10 + i * 10}" y1="10" x2="${10 + i * 10}" y2="90"/><line x1="10" y1="${10 + i * 10}" x2="90" y2="${10 + i * 10}"/>`).join('') + '</g><path d="M90 90 A80 80 0 0 1 10 10 M10 10 A49.4 49.4 0 0 1 59.4 59.4 M59.4 59.4 A30.6 30.6 0 0 1 28.8 28.8 M28.8 28.8 A18.9 18.9 0 0 1 47.7 47.7 M47.7 47.7 A11.7 11.7 0 0 1 36 36" stroke="#ff6a2b" stroke-width="1.4"/></svg><span class="face__tag">φ 1.618</span></div>',
    orb: '<div class="face face--orb"><span class="face__tag">Gradient · Grain</span></div>',
  };
  const ringEl = $('#ring'), tip = $('#ringTip');
  const ring = { cards: [], offset: 0, target: 0, inertia: 0, pause: 0, hovered: null, cx: 0, cy: 0, r: 0, size: 160, dragging: false, moved: 0 };
  const SLOTS = 24, STEP = 360 / SLOTS;
  for (let i = 0; i < SLOTS; i++) {
    const f = FACES[i % FACES.length];
    const el = document.createElement('div'); el.className = 'ring__card'; el.dataset.cursor = 'View';
    el.innerHTML = f.img ? `<img src="assets/img/${f.img}.jpg" alt="${f.t}" draggable="false">` : FACE_HTML[f.face];
    ringEl.appendChild(el);
    const c = { el, f, i, intro: 0, hov: 0 };
    el.addEventListener('pointerenter', () => { ring.hovered = c; tip.querySelector('b').textContent = f.t; tip.querySelector('span').textContent = f.c; });
    el.addEventListener('pointerleave', () => { if (ring.hovered === c) ring.hovered = null; });
    el.addEventListener('click', () => { if (ring.moved < 6) openLightbox(f); });
    ring.cards.push(c);
  }
  function ringLayout() {
    const { vw, vh } = state;
    const portrait = vw < vh * .9;
    ring.cx = vw / 2;
    ring.cy = portrait ? vh * .52 : vh * .82;
    // slight ellipse: the top of the arc clears the head, the sides stay inside the frame
    ring.ry = portrait ? vh * .4 : vh * .705;
    ring.r = portrait ? vw * .4 : Math.min(vh * .66, vw * .4);
    ring.size = portrait ? vw * .15 : Math.min(vh * .135, vw * .11);
    ringEl.style.setProperty('--rs', `${ring.size.toFixed(1)}px`);
    ringEl.style.fontSize = `${(ring.size / 7).toFixed(2)}px`;
  }
  $('#ringPrev').addEventListener('click', () => { ring.target += STEP; Sound.blip(880, .03); });
  $('#ringNext').addEventListener('click', () => { ring.target -= STEP; Sound.blip(990, .03); });
  hero.addEventListener('pointerdown', (e) => {
    if (!state.entered || e.target.closest('button, a') || state.s > .2) return;
    ring.dragging = true; ring.moved = 0; ring.lastX = e.clientX; ring.lastT = performance.now(); ring.inertia = 0;
  });
  addEventListener('pointermove', (e) => {
    if (!ring.dragging) return;
    const dx = e.clientX - ring.lastX, now = performance.now(), dt = Math.max(1, now - ring.lastT);
    ring.moved += Math.abs(dx); ring.target -= dx * .12; ring.inertia = (-dx * .12) / (dt / 1000);
    ring.lastX = e.clientX; ring.lastT = now;
  });
  addEventListener('pointerup', () => { ring.dragging = false; });

  function ringFrame(dt, vis) {
    const m = state.mouse;
    ring.pause = lerp(ring.pause, ring.hovered || ring.dragging ? 1 : 0, .08);
    if (!ring.dragging) { ring.target += ring.inertia * dt; ring.inertia *= Math.pow(.04, dt); }
    ring.target += (reduce ? 1 : 3.2) * dt * (1 - ring.pause); // anticlockwise drift
    ring.offset = lerp(ring.offset, ring.target, .085);
    const cx = ring.cx + m.sx * -16, cy = ring.cy + m.sy * 10;
    let tipXY = null;
    ring.cards.forEach((c) => {
      let th = 90 + c.i * STEP + ring.offset;
      th = (((th + 90) % 360) + 360) % 360 - 90; // [-90, 270)
      const rad = th * Math.PI / 180;
      const x = cx + Math.cos(rad) * ring.r, y = cy - Math.sin(rad) * ring.ry;
      const arc = smooth(2, 22, th) * (1 - smooth(158, 178, th));
      const hot = ring.hovered === c;
      c.hov = lerp(c.hov, hot ? 1 : 0, .12);
      const glow = Math.pow(Math.max(0, Math.cos((th - 90) * Math.PI / 180)), 3);
      const sc = (.25 + .75 * c.intro) * (1 + c.hov * .16);
      const ri = .55 + .45 * c.intro;
      const ix = cx + Math.cos(rad) * ring.r * ri, iy = cy - Math.sin(rad) * ring.ry * ri;
      const op = arc * clamp(c.intro * 1.4) * vis;
      if (op < .002) { if (c.el._v !== 0) { c.el.style.opacity = 0; c.el.style.visibility = 'hidden'; c.el._v = 0; } return; }
      if (c.el._v !== 1) { c.el.style.visibility = 'visible'; c.el._v = 1; }
      c.el.style.transform = `translate3d(${ix.toFixed(1)}px, ${iy.toFixed(1)}px, 0) rotate(${((90 - th) * .55).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      c.el.style.opacity = op.toFixed(3);
      c.el.style.setProperty('--glow', (glow * .8 + c.hov * .6).toFixed(3));
      c.el.style.zIndex = hot ? 5 : 1;
      c.el.classList.toggle('is-hot', hot);
      if (hot) tipXY = [x, y - ring.size * .5 * sc - 16];
    });
    if (tipXY) { tip.style.transform = `translate3d(calc(${tipXY[0].toFixed(1)}px - 50%), calc(${tipXY[1].toFixed(1)}px - 100%), 0)`; }
    tip.classList.toggle('is-on', !!tipXY && vis > .5);
  }

  /* ============================================================== LIGHTBOX */
  const lb = $('#lightbox');
  function openLightbox(f) {
    const fig = lb.querySelector('figure');
    const old = fig.querySelector('img, .face'); if (old) old.remove();
    let node;
    if (f.img) { node = document.createElement('img'); node.src = `assets/img/${f.img}.jpg`; node.alt = f.t; }
    else { const w = document.createElement('div'); w.innerHTML = FACE_HTML[f.face]; node = w.firstChild; }
    fig.prepend(node);
    fig.querySelector('figcaption b').textContent = f.t; fig.querySelector('figcaption span').textContent = f.c;
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
  }
  function closeLightbox() { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); if (lenis && state.entered) lenis.start(); }
  lb.addEventListener('click', closeLightbox);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

  /* ================================================================ CAMERA */
  const camRig = $('#camRig'), camBeam = $('#camBeam'), camHud = $('#camHud'), camTC = $('#camTC'), camFlood = $('#camFlood');
  const camNotesHost = $('#camNotes'), camNotes = $$('.note'), camTitleSpans = $$('.cam__title span'), camLabels = $$('.cam__label'), camFrames = $$('.cam__frame');
  const beamText = $('#camBeamText');
  (function fillBeam() {
    const words = ['Typography', 'Composition', 'Colour Theory', 'Rhythm', 'Contrast', 'Negative Space', 'Grid Systems', 'Hierarchy', 'Light', 'Story', 'Emotion', 'Detail', 'Motion', 'Craft', 'Balance', 'Texture', 'Silence', 'Scale', 'Tension', 'Clarity'];
    let out = '';
    for (let l = 0; l < 64; l++) {
      let line = ''; for (let k = 0; k < 22; k++) line += words[(l * 7 + k * 3) % words.length] + ' · ';
      out += `<p style="margin-left:${-(l * 37) % 260}px">${line}</p>`;
    }
    beamText.innerHTML = out;
  })();
  const camTally = { v: 0, on: false, tw: null };
  function setTally(on) {
    if (on === camTally.on) return; camTally.on = on;
    if (camTally.tw) camTally.tw.kill();
    if (on) {
      Sound.blip(1500, .05);
      camTally.tw = gsap.timeline()
        .to(camTally, { v: 1, duration: .05 }).to(camTally, { v: .05, duration: .08 }).to(camTally, { v: .7, duration: .04 })
        .to(camTally, { v: 0, duration: .12 }).to(camTally, { v: 1, duration: .05 }).to(camTally, { v: .4, duration: .06 }).to(camTally, { v: 1, duration: .25 });
    } else camTally.tw = gsap.to(camTally, { v: 0, duration: .3 });
  }
  // dust motes inside the projector beam
  const dust = $('#camDust'), dctx = dust.getContext('2d');
  const motes = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4, v: Math.random() * .02 + .006, a: Math.random() * 6.28 }));
  function sizeDust() { dust.width = Math.round(state.vw * .75); dust.height = Math.round(state.vh * .75); }
  function drawDust(t, k) {
    dctx.clearRect(0, 0, dust.width, dust.height);
    if (k <= 0) return;
    dctx.fillStyle = 'rgba(255,210,200,1)';
    motes.forEach((p) => {
      p.x += p.v * .016; if (p.x > 1.05) p.x = -.05;
      const y = p.y + Math.sin(t * .5 + p.a) * .01;
      dctx.globalAlpha = k * (.25 + .5 * Math.abs(Math.sin(t * 1.3 + p.a)));
      dctx.beginPath(); dctx.arc(p.x * dust.width, y * dust.height, p.r, 0, 6.28); dctx.fill();
    });
    dctx.globalAlpha = 1;
  }

  function cameraFrame(pc, t) {
    const { vw, vh } = state;
    // rig geometry (mirrors CSS) — lens front at (0.994, 0.596) of the cut-out
    const h = Math.min(vh * .7, vw * .62), w = h * (954 / 1350);
    const r = smooth(.03, .3, pc);
    const sc = lerp(1.14, 1, outCubic(r)) * (1 + smooth(.4, .9, pc) * .03);
    const tx = lerp(-vw * .04, 0, outCubic(r)) + state.mouse.sx * -6;
    const left = vw <= 820 ? -vw * .12 : -vw * .01, top = (vw <= 820 ? vh * .36 : vh * .5) - h / 2;
    const ox = left + w * .3, oy = top + h * .55;
    const lens = { x: ox + (w * .994 - w * .3) * sc + tx, y: oy + (h * .596 - h * .55) * sc, half: h * .163 * sc };
    camRig.style.transform = `translateY(-50%) translateX(${tx.toFixed(1)}px) scale(${sc.toFixed(4)})`;
    camRig.style.filter = `blur(${((1 - r) * 6).toFixed(2)}px)`;
    camRig.style.opacity = (1 - smooth(.8, .9, pc)).toFixed(3);
    camNotesHost.style.opacity = (1 - smooth(.78, .86, pc)).toFixed(3);
    const st = camRig.style;
    st.setProperty('--lr', `${(r * 175).toFixed(1)}%`);
    st.setProperty('--lx', `${lerp(88, 55, r).toFixed(1)}%`);
    st.setProperty('--ly', `${lerp(40, 52, r).toFixed(1)}%`);
    st.setProperty('--b', (smooth(.03, .26, pc) * (1 + bell(pc, .1, .2, .3, .4) * .25)).toFixed(3));
    st.setProperty('--sw', `${lerp(-30, 130, smooth(.08, .34, pc)).toFixed(1)}%`);
    st.setProperty('--rim', (bell(pc, .08, .13, .3, .36) * .8).toFixed(3));
    st.setProperty('--gl', bell(pc, .24, .27, .29, .33).toFixed(3));
    setTally(pc > .34);
    const beamK = smooth(.38, .56, pc);
    st.setProperty('--tally', camTally.v.toFixed(3));
    st.setProperty('--red', (camTally.v * .55 + beamK * .45).toFixed(3));

    // projector beam: grows out of the lens, then floods the frame
    const b = outCubic(beamK), f = smooth(.8, .92, pc);
    const farX = lerp(lens.x, vw * 1.06, b);
    const topFar = lerp(lens.y - lens.half, -vh * .1, b), botFar = lerp(lens.y + lens.half, vh * 1.1, b);
    const P = [
      [lerp(lens.x, -vw * .1, f), lerp(lens.y - lens.half, -vh * .1, f)],
      [lerp(farX, vw * 1.1, f), lerp(topFar, -vh * .1, f)],
      [lerp(farX, vw * 1.1, f), lerp(botFar, vh * 1.1, f)],
      [lerp(lens.x, -vw * .1, f), lerp(lens.y + lens.half, vh * 1.1, f)],
    ];
    camBeam.style.clipPath = beamK > 0 ? `polygon(${P.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})` : 'polygon(0 0,0 0,0 0,0 0)';
    camBeam.style.setProperty('--bx', `${((lens.x / vw) * 100).toFixed(1)}%`);
    camBeam.style.setProperty('--by', `${((lens.y / vh) * 100).toFixed(1)}%`);
    beamText.style.transform = `rotate(-9deg) translateX(${(-(t * 14) % 260).toFixed(1)}px)`;
    drawDust(t, beamK * (1 - f));

    camHud.style.opacity = (smooth(.2, .3, pc) * (1 - smooth(.78, .86, pc))).toFixed(3);
    if (camHud.style.opacity > 0) {
      const fr = Math.floor(t * 24);
      camTC.textContent = [Math.floor(fr / 86400) % 24, Math.floor(fr / 1440) % 60, Math.floor(fr / 24) % 60, fr % 24].map((n) => String(n).padStart(2, '0')).join(':');
    }
    camNotes.forEach((n, i) => { n.style.opacity = bell(pc, .22 + i * .02, .3 + i * .02, .44, .52).toFixed(3); });
    const c1 = smooth(.5, .64, pc), out = 1 - smooth(.8, .88, pc);
    camTitleSpans.forEach((s, i) => {
      const k = smooth(.5 + i * .04, .64 + i * .04, pc);
      s.style.clipPath = `inset(0 0 ${((1 - k) * 100).toFixed(1)}% 0)`;
      s.style.transform = `translateY(${((1 - outCubic(k)) * 40).toFixed(1)}px)`;
      s.style.opacity = out.toFixed(3);
    });
    camLabels.forEach((l, i) => { l.style.opacity = (smooth(.6 + i * .03, .68 + i * .03, pc) * out).toFixed(3); });
    camFrames.forEach((fEl, i) => {
      const k = smooth(.55 + i * .04, .66 + i * .04, pc);
      fEl.style.opacity = (k * out).toFixed(3);
      fEl.style.transform = `translateY(${((1 - outCubic(k)) * (i ? 30 : -30)).toFixed(1)}px)`;
    });
    // white burst from the lens into the studio
    const wb = 0; // the studio now scrolls in over the red light
    camFlood.style.opacity = wb > 0 ? 1 : 0;
    camFlood.style.setProperty('--fx', `${((lens.x / vw) * 100).toFixed(1)}%`);
    camFlood.style.setProperty('--fy', `${((lens.y / vh) * 100).toFixed(1)}%`);
    camFlood.style.setProperty('--fr', `${(wb * 190).toFixed(1)}%`);
    Sound.setDrone(0, 0);
    return c1;
  }

  /* ================================================================ STUDIO */
  const FONT = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31], ' ': [0, 0, 0, 0, 0, 0, 0],
  };
  function dotMatrix(canvas, text) {
    const chars = text.toUpperCase().split('').map((ch) => FONT[ch] || FONT[' ']);
    const cols = chars.length * 6 - 1, rows = 7;
    canvas.style.aspectRatio = `${cols} / ${rows}`;
    const dots = [];
    chars.forEach((g, ci) => g.forEach((bits, r) => { for (let c = 0; c < 5; c++) if (bits & (1 << (4 - c))) dots.push({ c: ci * 6 + c, r, b: 1, tb: 1, ox: 0, oy: 0 }); }));
    return { canvas, ctx: canvas.getContext('2d'), cols, rows, dots, w: 0, h: 0 };
  }
  const marks = [dotMatrix($('#stMark'), CONFIG.mark), dotMatrix($('#pfMark'), CONFIG.mark)];
  function sizeMarks() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    marks.forEach((m) => { const r = m.canvas.getBoundingClientRect(); m.w = r.width; m.h = r.height; m.canvas.width = Math.max(1, Math.round(r.width * dpr)); m.canvas.height = Math.max(1, Math.round(r.height * dpr)); m.dpr = dpr; });
  }
  let glitchAt = 0;
  function drawMark(m, t, mouse) {
    if (!m.w) return;
    const { ctx, cols, rows, dots } = m, W = m.canvas.width, H = m.canvas.height, p = W / cols;
    ctx.clearRect(0, 0, W, H);
    const glitch = t > glitchAt && t < glitchAt + .7;
    const r = m.canvas.getBoundingClientRect();
    const mx = (mouse.x - r.left) * m.dpr, my = (mouse.y - r.top) * m.dpr;
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = p * .7;
    dots.forEach((d) => {
      if (glitch && Math.random() < .08) d.tb = Math.random() < .5 ? 0 : 1;
      if (!glitch) d.tb = 1;
      d.b = lerp(d.b, d.tb, .25);
      let x = (d.c + .5) * p, y = (d.r + .5) * (H / rows);
      const dx = x - mx, dy = y - my, dist = Math.hypot(dx, dy), R = p * 3.2;
      const push = dist < R ? (1 - dist / R) : 0;
      d.ox = lerp(d.ox, push ? (dx / (dist || 1)) * push * p * 1.6 : 0, .2);
      d.oy = lerp(d.oy, push ? (dy / (dist || 1)) * push * p * 1.6 : 0, .2);
      const rad = p * .36 * (.35 + .65 * d.b) * (1 - push * .4);
      ctx.globalAlpha = .35 + .65 * d.b;
      ctx.beginPath(); ctx.arc(x + d.ox, y + d.oy, rad, 0, 6.2832); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  const stBand = $('#stBand');
  const SITES = ['site-bms', 'site-hero', 'site-film', 'site-genesis', 'site-glass', 'site-shades', 'site-hero', 'site-bms'];
  const stPanels = SITES.map((s, i) => {
    const p = document.createElement('div'); p.className = 'st__panel';
    p.style.backgroundImage = `url(assets/img/${s}.jpg)`;
    p.style.transform = `rotateY(${i * 45}deg) translateZ(calc(var(--u) * 18.1))`;
    stBand.appendChild(p); return p;
  });
  let stRy = 0;
  const stWork = $('#stWork'), stX = $('#stX');
  const setStudio = (cls, on) => studio.classList.toggle(cls, on);
  stWork.addEventListener('pointerenter', () => setStudio('is-work', true));
  stWork.addEventListener('pointerleave', () => setStudio('is-work', false));
  stWork.addEventListener('focus', () => setStudio('is-work', true));
  stWork.addEventListener('blur', () => setStudio('is-work', false));
  stWork.addEventListener('click', () => { if (isTouch) setStudio('is-work', !studio.classList.contains('is-work')); });
  stX.addEventListener('pointerenter', () => setStudio('is-profile', true));
  stX.addEventListener('pointerleave', () => setStudio('is-profile', false));
  stX.addEventListener('focus', () => setStudio('is-profile', true));
  stX.addEventListener('blur', () => setStudio('is-profile', false));
  const stClock = $('#stClock');
  setInterval(() => { const d = new Date(); stClock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':'); }, 1000);

  function studioFrame(t, dt) {
    if (t > glitchAt + 4.2) glitchAt = t + Math.random() * 1.5;
    drawMark(marks[0], t, state.mouse);
    if (studio.classList.contains('is-profile')) drawMark(marks[1], t, { x: -1e4, y: -1e4 });
    if (studio.classList.contains('is-work')) {
      stRy -= dt * 22;
      stBand.style.setProperty('--ry', `${stRy.toFixed(2)}deg`);
      stPanels.forEach((p, i) => {
        const a = (i * 45 + stRy) * Math.PI / 180;
        p.style.setProperty('--shade', (.08 + (1 - Math.cos(a)) * .36).toFixed(3));
      });
    }
  }

  /* ============================================================== CHAPTERS */
  CHAPTERS.forEach((c) => {
    const b = document.createElement('button'); b.dataset.goto = c.id; b.dataset.cursor = 'Go';
    b.innerHTML = `<span>${c.label}</span><i></i>`; b.setAttribute('aria-label', `Go to ${c.label}`);
    chapters.appendChild(b);
  });
  const chapterBtns = $$('#chapters button');
  function goto(id) {
    const ch = CHAPTERS.find((c) => c.id === id); if (!ch) return;
    if (!state.entered) { enter(id); return; }
    scrollToS(ch.s);
  }
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goto]');
    if (!g || g === mainCard) return;
    e.preventDefault(); goto(g.dataset.goto);
  });

  /* ================================================================= SOUND UI */
  const soundBtn = $('#soundBtn');
  soundBtn.addEventListener('click', () => {
    state.sound = !state.sound;
    soundBtn.setAttribute('aria-pressed', String(state.sound));
    soundBtn.querySelector('.bar__sound-t').textContent = state.sound ? 'Sound on' : 'Sound off';
    reelVideo.muted = !state.sound; Sound.unlock(); Sound.setOn(state.sound);
  });

  /* ============================================================ MAIN LOOP */
  let lastT = performance.now() / 1000, lastPu = 0, videoPaused = false, lastS = 0, scrollV = 0, isScrolling = false;
  const rail = $('#rail'), railThumb = $('#rail i');
  function frame(now) {
    requestAnimationFrame(frame);
    if (lenis) lenis.raf(now);
    const t = now / 1000, dt = Math.min(.05, t - lastT); lastT = t; state.t = t;
    const m = state.mouse;
    m.sx = lerp(m.sx, m.nx, .06); m.sy = lerp(m.sy, m.ny, .06);

    // cursor
    cp.rx = lerp(cp.rx, cp.x, .2); cp.ry = lerp(cp.ry, cp.y, .2);
    curDot.style.transform = `translate3d(${cp.x}px, ${cp.y}px, 0)`;
    curRing.style.transform = `translate3d(${cp.rx.toFixed(1)}px, ${cp.ry.toFixed(1)}px, 0)`;

    const s = state.entered ? scrollPx() / state.vh : 0;
    state.s = s;

    // scroll feedback: wheel cursor + slim position rail
    scrollV = lerp(scrollV, Math.abs(s - lastS) / Math.max(dt, 1e-3), .25); lastS = s;
    const scrolling = state.entered && scrollV > .1;
    if (scrolling !== isScrolling) { isScrolling = scrolling; cur.classList.toggle('is-scrolling', scrolling); }
    if (state.entered) {
      const railH = state.vh - 24, thH = Math.max(28, railH / (T.total + 1));
      railThumb.style.height = `${thH.toFixed(1)}px`;
      railThumb.style.transform = `translate3d(0, ${((railH - thH) * clamp(s / T.total)).toFixed(1)}px, 0)`;
      rail.style.opacity = (.35 + .65 * clamp(scrollV * 2.5)).toFixed(3);
    }

    if (!state.entered) { openingFrame(); }

    /* -- 01/02 hero ---------------------------------------------------- */
    // the hero scrolls away like a page section, revealing the design universe pinned beneath it
    const up = clamp((s - .1) / 1.1);
    const heroVis = up < 1 ? 1 : 0;
    if (state.entered || state.entering) {
      hero.style.visibility = heroVis > 0 ? 'visible' : 'hidden';
      if (state.entered) {
        hero.style.transform = up > 0 ? `translate3d(0, ${(-up * 1.1 * state.vh).toFixed(1)}px, 0)` : '';
        heroFrame.style.transform = up > 0 ? `scale(${(1 - .06 * up).toFixed(4)})` : '';
        heroFrame.style.borderRadius = up > 0 ? `${(up * 28).toFixed(1)}px` : '';
        heroFrame.style.overflow = up > 0 ? 'hidden' : '';
        heroFrame.style.boxShadow = up > 0 ? `0 30px 90px rgba(0,0,0,${(.7 * up).toFixed(3)})` : '';
        reel.style.transform = `translate3d(${(-m.sx * 10).toFixed(1)}px, ${(m.sy * 6).toFixed(1)}px, 0) scale(1.03)`;
        const ui = 1 - smooth(.3, .7, s);
        $('.hero__ui').style.opacity = ui.toFixed(3);
        $('.hero__ui').style.visibility = ui > 0 ? 'visible' : 'hidden';
        if (heroVis > 0) ringFrame(dt, 1 - smooth(.35, .95, s));
        if (!reelVideo.paused || videoPaused) {
          reelVideo.volume = clamp(state.vol * (1 - smooth(.2, 1.1, s)));
          if (s > 1.35 && !reelVideo.paused) { reelVideo.pause(); videoPaused = true; }
        }
        if (s < 1.3 && videoPaused) { videoPaused = false; reelVideo.play().catch(() => {}); }
      }
    }

    /* -- 03/04/05 universe --------------------------------------------- */
    const pu = clamp((s - T.uniStart) / T.uniLen);
    const uniActive = state.entered && s > .12 && s < T.uniEnd + .1;
    gl.style.opacity = (smooth(.12, .6, s)).toFixed(3);
    gl.style.visibility = uniActive ? 'visible' : 'hidden';
    if (universe) universe.update(pu, t, dt, { x: m.sx, y: m.sy }, uniActive);
    // chapter copy travels with the page as it scrolls
    uniCopy.style.transform = `translate3d(0, ${((1.95 - s) * state.vh * .9).toFixed(1)}px, 0)`;
    uniCopy.style.opacity = s > .9 && s < 3.4 ? '1' : '0';
    skPanel.style.transform = `translate3d(0, ${((6.35 - s) * state.vh * .9).toFixed(1)}px, 0)`;
    skPanel.style.opacity = s > 5.2 && s < 7.6 ? '1' : '0';
    flash.style.opacity = (bell(pu, .598, .606, .609, .627) * .85).toFixed(3);
    skShade.style.opacity = (smooth(.77, .84, pu) * (1 - smooth(.95, .99, pu))).toFixed(3);
    const toBlack = s < T.camStart ? smooth(.93, .995, pu) : 1 - smooth(T.camStart, T.camStart + .05, s);
    veil.style.opacity = toBlack.toFixed(3);
    if (pu >= .6 && lastPu < .6 && state.entered) Sound.boom();
    lastPu = pu;
    if (uniActive) {
      const grow = smooth(.36, .6, pu);
      Sound.setDrone(smooth(.0, .1, pu) * (1 - smooth(.6, .64, pu)) * .9 + smooth(.7, .8, pu) * (1 - smooth(.9, 1, pu)) * .35, grow);
    }

    /* -- 06 camera ---------------------------------------------------- */
    const pc = clamp((s - T.camStart) / T.camLen);
    const camOn = state.entered && s > T.camStart - .02 && pc < 1;
    camera.style.visibility = camOn ? 'visible' : 'hidden';
    if (camOn) cameraFrame(pc, t);
    else if (!uniActive) Sound.setDrone(0, 0);

    /* -- 07 studio ---------------------------------------------------- */
    // the studio is the last page: it scrolls up over the projector's red light
    const so = clamp((pc - .88) / .12);
    studio.style.visibility = so > 0 ? 'visible' : 'hidden';
    studio.style.transform = so < 1 ? `translate3d(0, ${((1 - so) * state.vh).toFixed(1)}px, 0)` : '';
    studio.style.pointerEvents = so > .98 ? 'auto' : 'none';
    html.classList.toggle('on-light', so > .5);
    if (so > 0) studioFrame(t, dt);

    // chapters
    let active = 0; CHAPTERS.forEach((c, i) => { if (s >= c.s - .35) active = i; });
    chapterBtns.forEach((b, i) => b.classList.toggle('is-on', i === active));
  }

  window.__portfolio = { state, scrollToS, get lenis() { return lenis; } };

  /* ================================================================== BOOT */
  addEventListener('resize', () => { layout(); });
  layout();
  requestAnimationFrame(frame);
  if (lenis === null) window.scrollTo(0, 0);
  preload().then(() => {
    html.classList.remove('is-loading');
    sizeMarks();
    introOpening();
  });
})();
