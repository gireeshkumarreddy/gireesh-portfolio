/* =========================================================================
   Design Universe (scenes 03 – 05)
   Perspective tunnel with travelling image panels → voxel glass crystal →
   robot + human hands (point clouds sampled from the reference halftone) →
   explosion → particles re-form into the designer's halftone portrait →
   photo plate → real glass shards with skills streaming toward the screen.
   Classic script: three.js is pulled in with dynamic import() through the
   import map, so the site also runs from file://.
   ========================================================================= */
(function () {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  let seed = 1337;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rr = (a, b) => a + (b - a) * rnd();

  const SKILLS = [
    'Brand Identity', 'UI / UX Design', 'Motion Design', 'Art Direction', 'Typography', '3D & CGI',
    'Creative Direction', 'Interaction Design', 'Design Systems', 'Prototyping', 'Visual Storytelling', 'Web Experiences',
  ];

  window.Universe = (async function boot() {
    const D = window.PORTFOLIO_DATA;
    if (!D) throw new Error('data.js missing');

    const THREE = await import('three');
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { RoundedBoxGeometry }, { RoomEnvironment }] =
      await Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
        import('three/addons/postprocessing/OutputPass.js'),
        import('three/addons/geometries/RoundedBoxGeometry.js'),
        import('three/addons/environments/RoomEnvironment.js'),
      ]);

    /* ------------------------------------------------------------ renderer */
    const canvas = document.getElementById('gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 1);
    renderer.toneMapping = THREE.NoToneMapping;
    const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(DPR);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 54);
    const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 220);
    camera.position.set(0, 0, 6);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.8, 0.55, 0.2);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    /* --------------------------------------------------------- environment */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 vP;
        float spot(vec3 p, vec3 d, float k){ return pow(max(0., dot(p, normalize(d))), k); }
        void main(){
          vec3 p = normalize(vP);
          vec3 c = mix(vec3(.01,0.,.04), vec3(.18,.10,.9), smoothstep(-.3, .9, p.y));
          c += vec3(2.4,.75,.28) * spot(p, vec3(.9,.05,.45), 10.);
          c += vec3(.45,.9,2.2) * spot(p, vec3(-.85,.3,.35), 9.);
          c += vec3(1.8,.35,1.3) * spot(p, vec3(0.,-.7,.7), 7.);
          c += vec3(3.) * spot(p, vec3(.2,.95,.25), 60.);
          gl_FragColor = vec4(c, 1.);
        }`,
    })));
    const crystalEnv = pmrem.fromScene(envScene, 0.02).texture;

    /* ------------------------------------------------------ canvas sprites */
    function canvasTex(size, draw) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'); draw(g, size);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    }
    const glowTex = canvasTex(256, (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.12, 'rgba(255,240,255,.85)');
      r.addColorStop(.35, 'rgba(200,170,255,.28)'); r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    });
    const starTex = canvasTex(1024, (g, s) => {
      g.translate(s / 2, s / 2); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 46; i++) {
        const a = rr(0, Math.PI * 2), len = rr(.18, .5) * s * (i % 7 === 0 ? 1 : .6), w = rr(1.2, 3.2);
        g.save(); g.rotate(a);
        const lg = g.createLinearGradient(0, 0, len, 0);
        lg.addColorStop(0, `rgba(255,255,255,${rr(.35, .7)})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(0, -w); g.lineTo(len, 0); g.lineTo(0, w); g.fill(); g.restore();
      }
      const r = g.createRadialGradient(0, 0, 0, 0, 0, s * .12);
      r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.beginPath(); g.arc(0, 0, s * .12, 0, Math.PI * 2); g.fill();
    });
    const streakTex = canvasTex(512, (g, s) => {
      g.translate(s / 2, s / 2); g.scale(1, .045);
      const r = g.createRadialGradient(0, 0, 0, 0, 0, s / 2);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(160,190,255,.45)'); r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r; g.beginPath(); g.arc(0, 0, s / 2, 0, Math.PI * 2); g.fill();
    });

    // design glyphs (pen tool, bezier, cursor, type, swatches, grid, crop marks, hex, layers, bbox, ruler, text tool)
    const glyphDraw = [
      (g) => { g.beginPath(); g.moveTo(128, 30); g.lineTo(196, 120); g.lineTo(160, 220); g.lineTo(96, 220); g.lineTo(60, 120); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(128, 30); g.lineTo(128, 140); g.stroke(); g.beginPath(); g.arc(128, 150, 12, 0, 7); g.stroke(); g.strokeRect(92, 222, 72, 16); },
      (g) => { g.beginPath(); g.moveTo(36, 196); g.bezierCurveTo(70, 40, 190, 230, 220, 64); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(36, 196); g.lineTo(70, 40); g.moveTo(220, 64); g.lineTo(190, 230); g.stroke(); g.fillStyle = '#ff7a3d'; [[70, 40], [190, 230]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }); g.fillStyle = '#fff'; [[36, 196], [220, 64]].forEach(([x, y]) => g.fillRect(x - 10, y - 10, 20, 20)); },
      (g) => { g.beginPath(); g.moveTo(70, 34); g.lineTo(70, 214); g.lineTo(112, 172); g.lineTo(142, 236); g.lineTo(168, 224); g.lineTo(138, 162); g.lineTo(196, 162); g.closePath(); g.fill(); },
      (g) => { g.font = 'italic 400 150px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Aa', 128, 132); g.lineWidth = 2; g.beginPath(); g.moveTo(20, 186); g.lineTo(236, 186); g.moveTo(20, 80); g.lineTo(236, 80); g.stroke(); },
      (g) => { g.globalCompositeOperation = 'lighter'; [['rgba(255,106,43,.9)', 100, 104], ['rgba(123,97,255,.9)', 156, 104], ['rgba(60,200,255,.85)', 128, 152]].forEach(([c, x, y]) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, 58, 0, 7); g.fill(); }); },
      (g) => { g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(28 + i * 50, 28); g.lineTo(28 + i * 50, 228); g.moveTo(28, 28 + i * 50); g.lineTo(228, 28 + i * 50); g.stroke(); } g.lineWidth = 6; g.strokeStyle = '#ff7a3d'; g.beginPath(); let a = 0, r = 4, x = 150, y = 120; g.moveTo(x, y); for (let i = 0; i < 260; i++) { a += .055; r *= 1.0105; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.stroke(); },
      (g) => { [[40, 40, 1, 1], [216, 40, -1, 1], [40, 216, 1, -1], [216, 216, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x, y + sy * 54); g.lineTo(x, y); g.lineTo(x + sx * 54, y); g.stroke(); }); g.lineWidth = 2; g.beginPath(); g.arc(128, 128, 22, 0, 7); g.moveTo(96, 128); g.lineTo(160, 128); g.moveTo(128, 96); g.lineTo(128, 160); g.stroke(); },
      (g) => { g.fillStyle = '#ff6a2b'; g.fillRect(28, 70, 64, 64); g.fillStyle = '#fff'; g.font = '500 40px "Geist Mono", monospace'; g.textBaseline = 'middle'; g.fillText('#FF6A2B', 104, 104); g.font = '400 24px "Geist Mono", monospace'; g.globalAlpha = .6; g.fillText('RGB 255 106 43', 30, 176); },
      (g) => { [0, 34, 68].forEach((o, i) => { g.globalAlpha = 1 - i * .25; g.beginPath(); g.moveTo(128, 50 + o); g.lineTo(218, 96 + o); g.lineTo(128, 142 + o); g.lineTo(38, 96 + o); g.closePath(); g.stroke(); }); },
      (g) => { g.lineWidth = 3; g.strokeRect(46, 60, 164, 136); g.fillStyle = '#000'; g.lineWidth = 4; [[46, 60], [128, 60], [210, 60], [46, 128], [210, 128], [46, 196], [128, 196], [210, 196]].forEach(([x, y]) => { g.fillRect(x - 9, y - 9, 18, 18); g.strokeRect(x - 9, y - 9, 18, 18); }); },
      (g) => { g.lineWidth = 4; g.strokeRect(20, 100, 216, 56); g.lineWidth = 3; for (let i = 0; i <= 20; i++) { const x = 30 + i * 9.8; g.beginPath(); g.moveTo(x, 100); g.lineTo(x, 100 + (i % 5 === 0 ? 26 : 14)); g.stroke(); } g.font = '500 30px "Geist Mono", monospace'; g.textAlign = 'center'; g.fillText('24 px', 128, 200); },
      (g) => { g.font = '500 170px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('T', 104, 136); g.lineWidth = 5; g.strokeStyle = '#ff7a3d'; g.beginPath(); g.moveTo(186, 60); g.lineTo(186, 200); g.moveTo(170, 60); g.lineTo(202, 60); g.moveTo(170, 200); g.lineTo(202, 200); g.stroke(); },
    ];
    const glyphTex = glyphDraw.map((d) => canvasTex(256, (g) => { g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; d(g); }));

    /* --------------------------------------------------------------- tunnel */
    const tunnel = new THREE.Group(); scene.add(tunnel);
    let HW = 5.6, HH = 3.25, Z_NEAR = 8, Z_FAR = -64, LOOP = Z_NEAR - Z_FAR;
    const lineMat = new THREE.LineBasicMaterial({ color: 0x777777, transparent: true, opacity: .55, fog: true, depthWrite: false });
    const sqGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, -1, 0), new THREE.Vector3(1, 1, 0), new THREE.Vector3(-1, 1, 0)]);
    const rings = [];
    for (let i = 0; i < 14; i++) { const r = new THREE.LineLoop(sqGeo, lineMat); r.userData.z = Z_FAR + (i / 14) * LOOP; rings.push(r); tunnel.add(r); }
    const rails = new THREE.Group(); tunnel.add(rails);
    function buildRails() {
      rails.clear();
      const pts = [];
      const push = (x, y) => { pts.push(new THREE.Vector3(x, y, Z_NEAR), new THREE.Vector3(x, y, Z_FAR)); };
      [-1, -.5, 0, .5, 1].forEach((f) => { push(f * HW, HH); push(f * HW, -HH); });
      [-.5, 0, .5].forEach((f) => { push(-HW, f * HH); push(HW, f * HH); });
      rails.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }

    const texLoader = new THREE.TextureLoader();
    const panelTex = await Promise.all(D.tunnel.map((src) => texLoader.loadAsync(src).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })));
    const panels = [];
    const panelGeo = new THREE.PlaneGeometry(1, 1);
    const PANELS = 26;
    for (let i = 0; i < PANELS; i++) {
      const tex = panelTex[i % panelTex.length];
      const m = new THREE.MeshBasicMaterial({ map: tex, color: 0xa6a6a6, transparent: true, opacity: 0, fog: true, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(panelGeo, m);
      const h = rr(1.25, 2.3), asp = tex.image.width / tex.image.height;
      mesh.scale.set(h * asp, h, 1);
      mesh.userData = { wall: i % 4, u: rr(-.55, .55), z: Z_FAR + ((i + rr(0, .6)) / PANELS) * LOOP };
      panels.push(mesh); tunnel.add(mesh);
    }
    function placePanels() {
      panels.forEach((p) => {
        const { wall, u } = p.userData;
        p.rotation.set(0, 0, 0);
        if (wall === 0) { p.position.x = -HW + .02; p.position.y = u * HH; p.rotation.y = Math.PI / 2; }
        if (wall === 1) { p.position.x = HW - .02; p.position.y = u * HH; p.rotation.y = -Math.PI / 2; }
        if (wall === 2) { p.position.y = HH - .02; p.position.x = u * HW; p.rotation.x = Math.PI / 2; }
        if (wall === 3) { p.position.y = -HH + .02; p.position.x = u * HW; p.rotation.x = -Math.PI / 2; }
      });
    }

    // soft volumetric haze behind the crystal
    const haze = [];
    [[0x5b3bff, 9, -9, .5, .2], [0xff5a1f, 7, -12, -2.5, -.8], [0x2a7bff, 8, -14, 2.6, 1.0]].forEach(([c, s, z, x, y]) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      sp.scale.set(s, s, 1); sp.position.set(x, y, z); sp.userData.base = .18; haze.push(sp); scene.add(sp);
    });

    /* -------------------------------------------------------------- crystal */
    const crystal = new THREE.Group(); scene.add(crystal);
    const U = .105;
    const vox = [];
    const addV = (a, b, z, ang) => {
      const c = Math.cos(ang), s = Math.sin(ang);
      vox.push({ p: new THREE.Vector3((a * c - b * s) * U, (a * s + b * c) * U, z * U), ang });
    };
    addV(0, 0, 0, 0); addV(0, 0, 1, 0); addV(0, 0, -1, 0);
    [0, 60, 120, 180, 240, 300].forEach((d) => {
      const ang = THREE.MathUtils.degToRad(d + 98);
      for (let a = 1; a <= 4; a++) addV(a, 0, 0, ang);
      addV(4, 1, 0, ang); addV(4, -1, 0, ang); addV(5, 0, 0, ang); addV(2, 0, 1, ang); addV(3, 0, -1, ang);
    });
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x8f7dff, metalness: 0, roughness: .1, transmission: .82, thickness: .5, ior: 1.7, dispersion: 4,
      iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 720],
      clearcoat: 1, clearcoatRoughness: .04, specularIntensity: 1,
      attenuationColor: new THREE.Color(0x6a4dff), attenuationDistance: .55,
      emissive: new THREE.Color(0x4a2cff), emissiveIntensity: .45, envMap: crystalEnv, envMapIntensity: 2.6,
    });
    const voxMesh = new THREE.InstancedMesh(new RoundedBoxGeometry(U * .96, U * .96, U * .96, 2, U * .12), crystalMat, vox.length);
    voxMesh.frustumCulled = false;
    crystal.add(voxMesh);
    const maxR = Math.max(...vox.map((v) => v.p.length()));
    vox.forEach((v) => {
      const side = v.p.x < 0 ? -1 : 1;
      v.start = new THREE.Vector3(side * rr(6, 9), v.p.y + rr(-1.6, 1.6), rr(-2.5, 1.2));
      v.q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), v.ang);
      v.q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(rr(-3, 3), rr(-3, 3), rr(-3, 3)));
      v.delay = (v.p.length() / maxR) * .35 + rr(0, .12);
      const dir = v.p.clone().add(new THREE.Vector3(rr(-.05, .05), rr(-.05, .05), rr(-.05, .05))).normalize();
      v.vel = new THREE.Vector3(dir.x * rr(3, 8), dir.y * rr(3, 8), rr(1.5, 9));
      v.spinAxis = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize();
      v.spin = rr(4, 14);
    });
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qs = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xe7c9ff, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false }));
    const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xd8d0ff, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false }));
    const streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: streakTex, color: 0x9fb8ff, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false }));
    crystal.add(core); scene.add(star); scene.add(streak);
    const crystalLight = new THREE.PointLight(0x8f6bff, 0, 7, 1.6); crystal.add(crystalLight);
    scene.add(new THREE.AmbientLight(0xffffff, .12));

    const shock = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 160), new THREE.MeshBasicMaterial({ color: 0xb9a3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    scene.add(shock);

    /* -------------------------------------------- particles: hands + sparks */
    const K = .0064; // reference pixels → world units
    const portrait = D.portrait; // [u, v, r, g, b, lum] * n
    const PN = portrait.length / 6;
    const order = Array.from({ length: PN }, (_, i) => i);
    const left = order.filter((i) => portrait[i * 6] < .5), right = order.filter((i) => portrait[i * 6] >= .5);
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    shuffle(left); shuffle(right);
    const col = new THREE.Color();
    const taken = new Set();

    const particleMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uIntro: { value: 0 }, uExplode: { value: 0 }, uMorph: { value: 0 }, uFade: { value: 0 },
        uSize: { value: 48 }, uPR: { value: DPR }, uPlane: { value: new THREE.Vector3(16, 9, -4) }, uTPitch: { value: 3 },
      },
      vertexShader: `
        uniform float uTime, uIntro, uExplode, uMorph, uFade, uSize, uPR, uTPitch;
        uniform vec3 uPlane;
        attribute vec3 aColor; attribute float aSize; attribute vec2 aTUV; attribute vec3 aTColor; attribute float aTSize; attribute vec4 aRand; attribute float aKind;
        varying vec3 vColor; varying float vAlpha; varying float vHot;
        void main(){
          float d = aRand.w * .55;
          float ia = clamp((uIntro - d) / .45, 0., 1.); ia = ia * ia * (3. - 2. * ia);
          vec3 local = position + (1. - ia) * (aRand.xyz * vec3(2.2, 1.4, 2.4) + vec3(0., 0., -1.8));
          local.z += sin(uTime * 1.3 + aRand.w * 31.) * .014;
          vec4 w = modelMatrix * vec4(local, 1.);
          float ee = 1. - pow(1. - clamp(uExplode, 0., 1.), 3.);
          vec3 dir = normalize(w.xyz + aRand.xyz * .7 + vec3(1e-4)); dir.z *= .3;
          float dist = aKind > .5 ? (1.4 + aRand.w * 5.) : (1. + aRand.w * 3.2);
          vec3 we = w.xyz + (dir * dist + aRand.xyz * vec3(1.3, 1.3, .5) + vec3(0., 0., .8 * aRand.y)) * ee;
          float m = clamp((uMorph - aRand.w * .35) / .65, 0., 1.); m = m * m * (3. - 2. * m);
          float ang = ee * (1. - m) * (aRand.x * 1.6) + uTime * .05 * ee * (1. - m);
          we.xy = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * we.xy;
          vec3 target = vec3((aTUV.x - .5) * uPlane.x, (.5 - aTUV.y) * uPlane.y, uPlane.z + .04);
          vec3 wp = mix(we, target, m);
          wp.z += sin(m * 3.14159) * (1. + aRand.y * .8);
          vec4 mv = viewMatrix * vec4(wp, 1.);
          gl_Position = projectionMatrix * mv;
          float size = mix(aSize, aTSize * uTPitch, m);
          gl_PointSize = clamp(uSize * size * uPR / -mv.z, 0., 26. * uPR);
          vColor = mix(aColor, aTColor, m);
          float vis = aKind > .5 ? smoothstep(0., .06, uExplode) : ia;
          vAlpha = vis * (1. - uFade);
          vHot = ee * (1. - m) * (1. - smoothstep(.2, 1., ee) * .7) * .5;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vAlpha; varying float vHot;
        void main(){
          float d = length(gl_PointCoord - .5);
          float a = smoothstep(.5, .34, d);
          if (a * vAlpha < .01) discard;
          vec3 c = vColor * (1. + vHot * 1.2) + vec3(1., .5, .25) * vHot * .35;
          gl_FragColor = vec4(c, a * vAlpha);
        }`,
    });

    function makeCloud(n, fill) {
      const g = new THREE.BufferGeometry();
      const A = { position: 3, aColor: 3, aSize: 1, aTUV: 2, aTColor: 3, aTSize: 1, aRand: 4, aKind: 1 };
      const buf = {}; Object.entries(A).forEach(([k, s]) => (buf[k] = new Float32Array(n * s)));
      for (let i = 0; i < n; i++) fill(i, buf);
      Object.entries(A).forEach(([k, s]) => g.setAttribute(k, new THREE.BufferAttribute(buf[k], s)));
      const pts = new THREE.Points(g, particleMat); pts.frustumCulled = false; return pts;
    }
    function assignTarget(i, buf, pool) {
      let idx = pool.pop();
      while (idx !== undefined && taken.has(idx)) idx = pool.pop();
      if (idx === undefined) { idx = Math.floor(rnd() * PN); }
      taken.add(idx);
      const o = idx * 6;
      buf.aTUV[i * 2] = portrait[o]; buf.aTUV[i * 2 + 1] = portrait[o + 1];
      col.setRGB(portrait[o + 2] / 255, portrait[o + 3] / 255, portrait[o + 4] / 255, THREE.SRGBColorSpace);
      buf.aTColor[i * 3] = col.r * 1.08; buf.aTColor[i * 3 + 1] = col.g * 1.04; buf.aTColor[i * 3 + 2] = col.b;
      buf.aTSize[i] = Math.sqrt(portrait[o + 5]) * 1.02;
    }
    function randDir(buf, i, kind) {
      const v = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize();
      buf.aRand[i * 4] = v.x; buf.aRand[i * 4 + 1] = v.y; buf.aRand[i * 4 + 2] = v.z; buf.aRand[i * 4 + 3] = rnd();
      buf.aKind[i] = kind;
    }
    function handCloud(arr, pool) {
      const n = arr.length / 6;
      return makeCloud(n, (i, buf) => {
        const o = i * 6;
        buf.position[i * 3] = arr[o] * K; buf.position[i * 3 + 1] = -arr[o + 1] * K; buf.position[i * 3 + 2] = rr(-.03, .03);
        col.setRGB(arr[o + 2] / 255, arr[o + 3] / 255, arr[o + 4] / 255, THREE.SRGBColorSpace);
        buf.aColor[i * 3] = col.r * .92; buf.aColor[i * 3 + 1] = col.g * .92; buf.aColor[i * 3 + 2] = col.b * .92;
        buf.aSize[i] = .5 + arr[o + 5] * .8;
        randDir(buf, i, 0); assignTarget(i, buf, pool);
      });
    }
    const robot = new THREE.Group(), human = new THREE.Group();
    robot.add(handCloud(D.hands.robot, left)); human.add(handCloud(D.hands.human, right));
    scene.add(robot, human);
    const remaining = shuffle(order.filter((i) => !taken.has(i)));
    const SPARK = ['#ffffff', '#c9b8ff', '#8f7dff', '#ff9a5c', '#7fb2ff'];
    const sparks = makeCloud(remaining.length, (i, buf) => {
      buf.position[i * 3] = rr(-.12, .12); buf.position[i * 3 + 1] = rr(-.12, .12); buf.position[i * 3 + 2] = rr(-.12, .12);
      col.set(SPARK[i % SPARK.length]); col.convertSRGBToLinear();
      buf.aColor[i * 3] = col.r; buf.aColor[i * 3 + 1] = col.g; buf.aColor[i * 3 + 2] = col.b;
      buf.aSize[i] = rr(.25, .8);
      randDir(buf, i, 1); assignTarget(i, buf, remaining);
    });
    scene.add(sparks);

    const tipGlow = (c) => new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const robotTip = tipGlow(0xdfe8ff), humanTip = tipGlow(0xff8a4a);
    robotTip.position.set(.02, 0, .05); humanTip.position.set(-.02, 0, .05);
    robot.add(robotTip); human.add(humanTip);
    const robotLight = new THREE.PointLight(0xdfe8ff, 0, 3, 2), humanLight = new THREE.PointLight(0xff7a3a, 0, 3, 2);
    robot.add(robotLight); human.add(humanLight);

    /* ------------------------------------------------------- reveal plate */
    const revealTex = await texLoader.loadAsync(D.reveal);
    revealTex.colorSpace = THREE.SRGBColorSpace; revealTex.anisotropy = 8;
    const reveal = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: revealTex, fog: false, color: 0x000000 }));
    reveal.position.z = -4; reveal.visible = false; scene.add(reveal);
    let plane = { w: 16, h: 9 };

    /* ---------------------------------------------------------- glass shards */
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: .035, transmission: 1, thickness: .32, ior: 1.52, dispersion: 6,
      iridescence: .55, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 820],
      clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1, envMap: roomEnv, envMapIntensity: 1.5,
      attenuationColor: new THREE.Color(0xf1f8ff), attenuationDistance: 3,
    });
    const shardGeos = Array.from({ length: 12 }, () => {
      const n = 3 + Math.floor(rnd() * 3), base = rr(0, 6.28), pts = [];
      for (let i = 0; i < n; i++) { const a = base + (i / n) * 6.28 + rr(-.38, .38), r = rr(.55, 1); pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: .05, bevelEnabled: true, bevelThickness: .014, bevelSize: .014, bevelSegments: 1, curveSegments: 1 });
      g.center(); return g;
    });
    const shards = new THREE.Group(); shards.visible = false; scene.add(shards);
    const SH = 46, SH_Z0 = -3.6, SH_L = 10.4;
    const shardList = [];
    for (let i = 0; i < SH; i++) {
      const m = new THREE.Mesh(shardGeos[i % shardGeos.length], glassMat);
      const isSkill = i < SKILLS.length;
      const s = isSkill ? rr(.28, .42) : rr(.1, .38);
      m.userData = {
        sx: s * rr(.7, 1.4), sy: s * rr(.6, 1.6),
        x0: isSkill ? (i % 2 ? 1 : -1) * rr(.9, 2.2) : rr(-3.6, 3.6),
        y0: isSkill ? rr(-1.3, 1.5) : rr(-2.2, 2.2),
        v: rr(.9, 1.7), phase: isSkill ? (i / SKILLS.length) * SH_L : rr(0, SH_L),
        rx: rr(-1, 1), ry: rr(-1, 1), rz: rr(-.6, .6), r0: new THREE.Euler(rr(0, 6), rr(0, 6), rr(0, 6)),
        skill: isSkill ? i : -1,
      };
      shardList.push(m); shards.add(m);
    }

    const glyphs = new THREE.Group(); scene.add(glyphs);
    const glyphList = [];
    for (let i = 0; i < 30; i++) {
      const tex = glyphTex[i % glyphTex.length];
      const tint = i % 3 === 0 ? 0xffb08a : i % 3 === 1 ? 0xc9bdff : 0xffffff;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: tint, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      const dir = new THREE.Vector3(rr(-1, 1), rr(-.75, .75), rr(-.2, .6)).normalize();
      m.userData = { dir, dist: rr(1.8, 4.2), travel: rr(5, 10), s: rr(.32, .62), spin: new THREE.Vector3(rr(-2, 2), rr(-2, 2), rr(-1, 1)), wob: rr(0, 6) };
      glyphList.push(m); glyphs.add(m);
    }

    /* -------------------------------------------------------- skill labels */
    const labelHost = document.getElementById('skLabels');
    const labels = SKILLS.map((name, i) => {
      const el = document.createElement('div'); el.className = 'sk__label';
      el.innerHTML = `<i></i><em></em><span><small>${String(i + 1).padStart(2, '0')}</small><b>${name}</b></span>`;
      labelHost.appendChild(el); return el;
    });

    /* --------------------------------------------------------------- resize */
    let W = innerWidth, H = innerHeight, distF = 1, camBase = 6;
    function resize(w = innerWidth, h = innerHeight) {
      w = Math.max(2, w || 0); h = Math.max(2, h || 0);
      W = w; H = h;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      distF = clamp(1.65 / camera.aspect, 1, 2.6);
      camBase = 6 * distF;
      HH = 3.25 * distF; HW = HH * Math.max(camera.aspect, 1.05);
      Z_NEAR = camBase + 3; LOOP = Z_NEAR - Z_FAR;
      rings.forEach((r) => r.scale.set(HW, HH, 1));
      buildRails(); placePanels();
      const dist = camBase + 4;
      const vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(25)), vw = vh * camera.aspect, ia = 1672 / 941;
      plane = vw / vh > ia ? { w: vw * 1.05, h: (vw * 1.05) / ia } : { w: vh * 1.05 * ia, h: vh * 1.05 };
      reveal.scale.set(plane.w, plane.h, 1);
      particleMat.uniforms.uPlane.value.set(plane.w, plane.h, -4);
      particleMat.uniforms.uSize.value = 48 * (H / 1080);
      particleMat.uniforms.uTPitch.value = plane.w * (12.6 / 1672) * 24.13;
      particleMat.uniforms.uPR.value = renderer.getPixelRatio();
    }
    resize();

    /* --------------------------------------------------------------- update */
    let enterT = null, last = 0, exAge = 0, crystalSpin = 0, tunnelSpeed = 2;
    const proj = new THREE.Vector3();

    function update(pu, t, dt, mouse, active) {
      if (!active) { if (pu <= 0.001) enterT = null; return; }
      if (enterT === null) enterT = t;
      const since = t - enterT;
      const P = particleMat.uniforms;
      P.uTime.value = t;

      // phases
      const arrive = smooth(0, .12, pu);
      const assemble = Math.max(smooth(1.9, 3.6, since), smooth(.07, .15, pu));
      const intro = Math.max(smooth(3.2, 6.4, since), smooth(.08, .24, pu));
      const creep = smooth(6, 30, since) * .12;
      const reach = clamp(smooth(.24, .54, pu) + creep);
      const grow = smooth(.36, .6, pu);
      const ex = clamp((pu - .6) / .08);
      const ee = outCubic(ex);
      const morph = smooth(.655, .74, pu);
      const plate = smooth(.715, .79, pu);
      const skills = smooth(.76, .82, pu);
      const end = smooth(.93, 1, pu);

      // camera
      const shake = grow * grow * .03 * (1 - ex) + Math.sin(ex * Math.PI) * .09;
      camera.position.set(
        mouse.x * .32 + (rnd() - .5) * shake,
        mouse.y * .2 + (rnd() - .5) * shake,
        camBase + 3.4 * (1 - outCubic(arrive)) - .7 * Math.sin(ex * Math.PI) - .25 * skills
      );
      camera.lookAt(mouse.x * .1, mouse.y * .06, -2);

      // tunnel
      const tunnelVis = arrive * (1 - smooth(.66, .76, pu));
      tunnelSpeed = lerp(tunnelSpeed, 2 + grow * 9 + Math.sin(ex * Math.PI) * 14, .06);
      lineMat.opacity = .55 * tunnelVis;
      tunnel.visible = tunnelVis > .002;
      rings.forEach((r) => {
        r.userData.z -= tunnelSpeed * dt * .5;
        if (r.userData.z < Z_FAR) r.userData.z += LOOP;
        r.position.z = r.userData.z;
      });
      panels.forEach((p) => {
        p.userData.z -= tunnelSpeed * dt;
        if (p.userData.z < Z_FAR) p.userData.z += LOOP;
        p.position.z = p.userData.z;
        p.material.opacity = tunnelVis * smooth(Z_NEAR, Z_NEAR - 5, p.userData.z) * .95;
      });
      haze.forEach((h, i) => { h.material.opacity = (h.userData.base * .6 + grow * .12) * arrive * (1 - plate) * (.85 + .15 * Math.sin(t * .7 + i)); });

      // crystal
      crystalSpin += dt * (.18 + grow * 1.6) * (1 - ex);
      crystal.rotation.set(Math.sin(t * .37) * .32 + mouse.y * .3, Math.sin(t * .29) * .55 + mouse.x * .4, crystalSpin);
      crystal.position.y = Math.sin(t * 1.1) * .05 * (1 - grow);
      const pulse = 1 + Math.sin(t * (6 + grow * 14)) * .025 * grow;
      const cs = (1 + grow * .78) * pulse;
      crystal.scale.setScalar(cs);
      crystal.visible = assemble > .001 && ex < 1;
      vox.forEach((v, i) => {
        const a = outCubic(clamp((assemble - v.delay) / .55));
        _p.lerpVectors(v.start, v.p, a);
        _q.slerpQuaternions(v.q0, v.q, a);
        if (ex > 0) {
          const d = outExpo(ex);
          _p.addScaledVector(v.vel, d * 1.6 / Math.max(cs, .4));
          _qs.setFromAxisAngle(v.spinAxis, ex * v.spin); _q.multiply(_qs);
        }
        const sc = (.35 + .65 * a) * (1 - ex * .35);
        _m.compose(_p, _q, _s.set(sc, sc, sc));
        voxMesh.setMatrixAt(i, _m);
      });
      voxMesh.instanceMatrix.needsUpdate = true;
      crystalMat.emissiveIntensity = .3 + grow * 1.1 + Math.sin(ex * Math.PI) * 2;
      crystalLight.intensity = (1.5 + grow * 7) * assemble * (1 - ex);
      const coreS = (.42 + grow * .7 + Math.sin(ex * Math.PI) * 3) * assemble;
      core.scale.set(coreS, coreS, 1); core.material.opacity = (.4 + grow * .3) * (1 - ee);
      const starS = (1.7 + grow * 2.2 + Math.sin(ex * Math.PI) * 7) * assemble;
      star.scale.set(starS, starS, 1); star.material.rotation = t * .05; star.position.copy(crystal.position);
      star.material.opacity = (.22 + grow * .3) * assemble * (1 - smooth(.62, .7, pu)) + Math.sin(ex * Math.PI) * .35;
      streak.scale.set((3 + grow * 5 + Math.sin(ex * Math.PI) * 12) * assemble, (.35 + grow * .3) * assemble, 1);
      streak.material.opacity = (.16 + grow * .3) * assemble * (1 - ee) + Math.sin(ex * Math.PI) * .3;
      shock.visible = ex > 0 && ex < 1;
      shock.scale.setScalar(.2 + outExpo(ex) * 11);
      shock.material.opacity = (1 - ex) * .9;
      shock.lookAt(camera.position);

      // hands
      const visHalf = Math.tan(THREE.MathUtils.degToRad(25)) * camBase * camera.aspect;
      const introX = outCubic(intro);
      const gap = lerp(2.75, .95 + grow * .22, outCubic(reach));
      robot.position.set(lerp(-visHalf - 2.2, -gap, introX), .06 + Math.sin(t * .9) * .03, .0);
      human.position.set(lerp(visHalf + 2.2, gap, introX), -.1 + Math.sin(t * .8 + 1) * .03, .0);
      robot.rotation.set(mouse.y * .12, .18 + mouse.x * .2, -.04);
      human.rotation.set(mouse.y * .12, -.18 + mouse.x * .2, .02);
      robot.visible = human.visible = intro > .001 && plate < 1;
      const tipI = clamp((.35 + reach * .4 + grow * .5) * intro * (1 - ee), 0, 1.2);
      robotTip.scale.setScalar(.14 + tipI * .16); robotTip.material.opacity = tipI * .55;
      humanTip.scale.setScalar(.14 + tipI * .16); humanTip.material.opacity = tipI * .55;
      robotLight.intensity = humanLight.intensity = tipI * 1.2;
      sparks.visible = ex > 0 && plate < 1;
      P.uIntro.value = intro; P.uExplode.value = ex; P.uMorph.value = morph;
      P.uFade.value = smooth(.745, .8, pu);

      // reveal plate: black → over-exposed → graded
      reveal.visible = plate > 0;
      const expo = plate * (1 + 1.2 * (1 - smooth(.76, .84, pu))) * lerp(1, .5, smooth(.79, .87, pu));
      reveal.material.color.setScalar(expo * (1 - end * .9));
      const push = 1.06 - .06 * smooth(.715, 1, pu);
      reveal.scale.set(plane.w * push, plane.h * push, 1);

      // shards (time-driven stream toward the lens once the plate is up)
      shards.visible = plate > .2 && end < 1;
      if (pu < .7) exAge = 0; else exAge += dt;
      const born = smooth(0, 1.2, exAge);
      shardList.forEach((m) => {
        const u = m.userData;
        const tt = (exAge * u.v + u.phase) % SH_L;
        const z = SH_Z0 + tt;
        const spread = 1 + tt * .06;
        m.position.set(u.x0 * spread, u.y0 * spread + Math.sin(t * .6 + u.phase) * .05, z);
        m.rotation.set(u.r0.x + exAge * u.rx, u.r0.y + exAge * u.ry, u.r0.z + exAge * u.rz);
        const s = born * smooth(0, 1.1, tt) * (1 - smooth(SH_L - .6, SH_L, tt));
        m.scale.set(u.sx * s, u.sy * s, s);
      });

      // design glyphs burst with the explosion, then drift toward the screen
      glyphs.visible = ex > 0 && end < 1;
      glyphList.forEach((m) => {
        const u = m.userData;
        const out = outExpo(ex) * u.dist;
        const drift = smooth(.7, 1, pu) * u.travel;
        m.position.set(u.dir.x * out * 1.6, u.dir.y * out, u.dir.z * out + drift + Math.sin(t + u.wob) * .05);
        m.rotation.set(u.spin.x * ex + t * .2 * u.spin.x, u.spin.y * ex + t * .2 * u.spin.y, u.spin.z * ex);
        m.scale.setScalar(u.s * (.3 + .7 * outCubic(ex)));
        m.material.opacity = smooth(0, .15, ex) * (1 - smooth(4.2, camera.position.z - .5, m.position.z)) * (.75 - morph * .35) * (1 - end);
      });

      // skill labels follow their shards
      const showLabels = skills * (1 - end);
      const halfW = W / 2, halfH = H / 2;
      labels.forEach((el, i) => {
        const m = shardList[i];
        if (!shards.visible || showLabels <= 0) { if (el._o !== 0) { el.style.opacity = 0; el._o = 0; } return; }
        proj.copy(m.position).project(camera);
        const z = m.position.z;
        const vis = smooth(SH_Z0 + .6, SH_Z0 + 2.2, z) * (1 - smooth(3.2, 4.4, z)) * showLabels;
        const sc = clamp(1 / Math.max(.5, (camera.position.z - z) / 7.5), .6, 1.6);
        const flip = proj.x > .15;
        const x = proj.x * halfW + halfW + (flip ? -26 : 26) * sc, y = -proj.y * halfH + halfH;
        if (el._f !== flip) { el.classList.toggle('is-flip', flip); el._f = flip; }
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - 20).toFixed(1)}px, 0)${flip ? ' translateX(-100%)' : ''} scale(${sc.toFixed(3)})`;
        el.style.transformOrigin = flip ? '100% 50%' : '0 50%';
        el.style.opacity = vis.toFixed(3); el._o = vis;
      });

      // bloom
      bloom.strength = Math.max(.15, .55 + grow * .45 + Math.sin(ex * Math.PI) * .9 - plate * .4);
      bloom.threshold = lerp(.42, .7, plate);
      bloom.radius = .45 + grow * .15;

      composer.render(dt);
      last = t;
    }

    async function prewarm() {
      const vis = [tunnel, crystal, robot, human, sparks, reveal, shards, glyphs].map((o) => o.visible);
      [tunnel, crystal, robot, human, sparks, reveal, shards, glyphs].forEach((o) => (o.visible = true));
      shardList.forEach((m) => m.scale.setScalar(.3));
      try { await renderer.compileAsync(scene, camera); } catch (e) { renderer.compile(scene, camera); }
      composer.render(0.016);
      [tunnel, crystal, robot, human, sparks, reveal, shards, glyphs].forEach((o, i) => (o.visible = vis[i]));
    }

    return { resize, update, prewarm, renderer };
  })().catch((err) => {
    console.warn('[universe] WebGL scene unavailable:', err);
    return null;
  });
})();
