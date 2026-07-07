// Map data + rendering. Shapes are drawn in order; `solid:true` ones collide.
// `climb:true` solids can be clung to / climbed on their sides.

function rect(x, y, w, h, color, opts = {}) { return { type: 'rect', x, y, w, h, color, ...opts }; }
function grad(x, y, w, h, dir, stops, opts = {}) { return { type: 'grad', x, y, w, h, dir, stops, ...opts }; }
function circle(x, y, r, color, opts = {}) { return { type: 'circle', x, y, r, color, ...opts }; }
function stripes(x, y, w, h, colors, sw, opts = {}) { return { type: 'stripes', x, y, w, h, colors, sw, ...opts }; }
function poly(pts, color, opts = {}) { return { type: 'poly', pts, color, ...opts }; }

export const MAPS = {
  rooftop: {
    name: 'Rooftop Sunset', w: 2600, h: 1300,
    sky: ['#2b1a4d', '#8a3a6b', '#e0764a', '#f7b267'],
    hiderSpawn: { x: 1300, y: 1160 }, seekerSpawn: { x: 120, y: 1160 },
    shapes: [
      // sun + clouds
      circle(2100, 320, 120, '#ffd23f'),
      circle(500, 220, 60, 'rgba(255,255,255,.25)'), circle(580, 240, 45, 'rgba(255,255,255,.2)'),
      // distant skyline
      rect(0, 700, 300, 600, '#3a2450'), rect(350, 620, 220, 700, '#452a5c'),
      rect(650, 760, 260, 600, '#3a2450'), rect(2300, 640, 300, 700, '#452a5c'),
      // ground roof
      rect(0, 1160, 2600, 140, '#5c3a68', { solid: true }),
      stripes(0, 1160, 2600, 18, ['#7a4a86', '#5c3a68'], 60),
      // buildings / platforms
      rect(300, 900, 420, 260, '#c94f3d', { solid: true, climb: true }),
      stripes(300, 900, 420, 30, ['#e0644f', '#c94f3d'], 42),
      rect(860, 980, 300, 180, '#3d7be0', { solid: true, climb: true }),
      rect(1000, 760, 160, 220, '#2f5fb0', { solid: true, climb: true }),
      rect(1350, 880, 380, 280, '#e0a03d', { solid: true, climb: true }),
      stripes(1350, 880, 380, 280, ['#e0a03d', '#c98a2f'], 55),
      rect(1900, 940, 320, 220, '#40a86b', { solid: true, climb: true }),
      // chimneys + vents
      rect(420, 800, 70, 100, '#8a3a3a', { solid: true, climb: true }),
      stripes(420, 800, 70, 100, ['#a84a4a', '#8a3a3a'], 25),
      rect(1450, 780, 60, 100, '#6b6b7a', { solid: true, climb: true }),
      rect(2000, 840, 90, 100, '#357a52', { solid: true, climb: true }),
      // billboard
      rect(1680, 560, 30, 320, '#555566', { solid: true, climb: true }),
      grad(1560, 420, 420, 220, 'h', ['#ff6b9d', '#ffd23f'], { solid: true, climb: true }),
      circle(1700, 520, 44, '#fff'), circle(1840, 500, 30, '#3d7be0'),
      // water tower
      rect(2320, 760, 24, 400, '#777788', { solid: true, climb: true }),
      rect(2440, 760, 24, 400, '#777788', { solid: true, climb: true }),
      circle(2390, 700, 95, '#7ac4e0', { solid: true }),
      // AC units
      rect(950, 1100, 90, 60, '#9aa0b0', { solid: true }),
      rect(2180, 1100, 80, 60, '#9aa0b0', { solid: true }),
    ],
  },

  junglegym: {
    name: 'Jungle Gym', w: 2400, h: 1300,
    sky: ['#59c1e8', '#a5e6ba'],
    hiderSpawn: { x: 1200, y: 1140 }, seekerSpawn: { x: 100, y: 1140 },
    shapes: [
      circle(400, 200, 80, '#fff7'), circle(490, 220, 55, '#fff5'),
      // grass ground
      rect(0, 1140, 2400, 160, '#4da34d', { solid: true }),
      stripes(0, 1140, 2400, 24, ['#5fbf5f', '#4da34d'], 48),
      // sandbox
      rect(180, 1090, 360, 50, '#e8d08a', { solid: true }),
      // climbing frame (bars)
      rect(700, 700, 26, 440, '#e0533d', { solid: true, climb: true }),
      rect(1060, 700, 26, 440, '#e0533d', { solid: true, climb: true }),
      rect(700, 700, 386, 26, '#e0533d', { solid: true, climb: true }),
      rect(760, 880, 270, 22, '#ffd23f', { solid: true }),
      // slide tower
      rect(1300, 860, 240, 280, '#3d7be0', { solid: true, climb: true }),
      stripes(1300, 860, 240, 280, ['#3d7be0', '#2f5fb0'], 40),
      poly([[1540, 880], [1900, 1140], [1540, 1140]], '#ffd23f', {}),
      rect(1340, 760, 160, 100, '#e07ab8', { solid: true, climb: true }),
      // swings
      rect(1980, 760, 20, 380, '#8a5a2b', { solid: true, climb: true }),
      rect(2260, 760, 20, 380, '#8a5a2b', { solid: true, climb: true }),
      rect(1980, 740, 300, 20, '#8a5a2b', { solid: true }),
      rect(2060, 1000, 60, 14, '#e0533d', { solid: true }),
      rect(2160, 940, 60, 14, '#3d7be0', { solid: true }),
      // tree
      rect(320, 820, 60, 270, '#8a5a2b', { solid: true, climb: true }),
      circle(350, 700, 150, '#3e8e4f', { solid: true }),
      circle(240, 780, 90, '#4da34d'), circle(470, 770, 95, '#57b357'),
      // hopscotch decor
      stripes(1600, 1130, 340, 10, ['#e0533d', '#ffd23f', '#3d7be0', '#e07ab8'], 42),
      // bench
      rect(120, 1060, 200, 16, '#b8763d', { solid: true }),
      rect(140, 1076, 16, 64, '#8a5a2b'), rect(284, 1076, 16, 64, '#8a5a2b'),
    ],
  },

  gallery: {
    name: 'The Gallery', w: 2200, h: 1200,
    sky: ['#f2efe9', '#e6e1d8'],
    hiderSpawn: { x: 1100, y: 1040 }, seekerSpawn: { x: 90, y: 1040 },
    shapes: [
      // floor + ceiling trim
      rect(0, 1040, 2200, 160, '#8a8177', { solid: true }),
      stripes(0, 1040, 2200, 14, ['#a39a8e', '#8a8177'], 90),
      rect(0, 0, 2200, 40, '#3a3630'),
      // pedestals
      rect(260, 900, 140, 140, '#d9d2c7', { solid: true, climb: true }),
      rect(1020, 860, 160, 180, '#d9d2c7', { solid: true, climb: true }),
      rect(1780, 900, 140, 140, '#d9d2c7', { solid: true, climb: true }),
      // sculptures
      circle(330, 830, 62, '#e0533d', { solid: true }),
      poly([[1100, 660], [1180, 860], [1020, 860]], '#3d7be0', { solid: true }),
      circle(1850, 840, 58, '#ffd23f', { solid: true }),
      // big abstract paintings (blend heaven)
      grad(120, 300, 420, 460, 'v', ['#e0533d', '#8a2be2'], { solid: false }),
      rect(110, 290, 440, 480, 'transparent', { frame: '#4a4438' }),
      stripes(660, 340, 380, 400, ['#ffd23f', '#3d7be0', '#40a86b'], 62),
      rect(650, 330, 400, 420, 'transparent', { frame: '#4a4438' }),
      grad(1160, 300, 430, 440, 'h', ['#ff6b9d', '#59c1e8', '#a5e6ba']),
      rect(1150, 290, 450, 460, 'transparent', { frame: '#4a4438' }),
      rect(1720, 340, 340, 380, '#2b2b33'),
      circle(1890, 530, 110, '#e8e2d6'),
      rect(1710, 330, 360, 400, 'transparent', { frame: '#4a4438' }),
      // benches
      rect(560, 980, 220, 24, '#4a4438', { solid: true }),
      rect(1420, 980, 220, 24, '#4a4438', { solid: true }),
      // hanging mobile
      rect(1330, 40, 8, 180, '#3a3630', { solid: true, climb: true }),
      circle(1334, 260, 46, '#40a86b', { solid: true }),
    ],
  },

  candy: {
    name: 'Candy Works', w: 2400, h: 1300,
    sky: ['#ffdff0', '#ffc4e1'],
    hiderSpawn: { x: 1200, y: 1140 }, seekerSpawn: { x: 110, y: 1140 },
    shapes: [
      // floor
      stripes(0, 1140, 2400, 160, ['#ff8fc7', '#ffb3d9'], 80, { solid: true }),
      // conveyor
      rect(300, 960, 700, 40, '#8a5a9e', { solid: true }),
      circle(320, 980, 26, '#5c3a68'), circle(980, 980, 26, '#5c3a68'),
      // gumball machine
      rect(1180, 900, 140, 240, '#e0533d', { solid: true, climb: true }),
      circle(1250, 800, 110, '#cfeaff', { solid: true }),
      circle(1210, 780, 24, '#e0533d'), circle(1265, 750, 24, '#ffd23f'),
      circle(1295, 810, 24, '#40a86b'), circle(1235, 840, 24, '#3d7be0'),
      // candy cane pillars
      stripes(500, 600, 44, 540, ['#e0533d', '#fff'], 36, { solid: true, climb: true }),
      stripes(1700, 560, 44, 580, ['#40a86b', '#fff'], 36, { solid: true, climb: true }),
      // chocolate slabs
      rect(760, 760, 340, 60, '#6b3e26', { solid: true, climb: true }),
      stripes(760, 760, 340, 60, ['#7d4a2e', '#6b3e26'], 56),
      rect(1900, 880, 380, 90, '#6b3e26', { solid: true, climb: true }),
      // lollipops
      rect(2080, 640, 18, 240, '#fff', { solid: true, climb: true }),
      circle(2089, 590, 80, '#ffd23f', { solid: true }),
      circle(2089, 590, 52, '#e0533d'), circle(2089, 590, 26, '#fff'),
      // frosting drips
      circle(700, 1140, 60, '#fff'), circle(820, 1150, 45, '#fff'),
      circle(1560, 1145, 55, '#fff'),
      // syrup vat
      rect(60, 900, 300, 240, '#c94f8e', { solid: true, climb: true }),
      grad(80, 920, 260, 40, 'h', ['#ff8fc7', '#c94f8e']),
    ],
  },
};

export function drawShape(ctx, s) {
  switch (s.type) {
    case 'rect':
      if (s.color && s.color !== 'transparent') { ctx.fillStyle = s.color; ctx.fillRect(s.x, s.y, s.w, s.h); }
      if (s.frame) { ctx.strokeStyle = s.frame; ctx.lineWidth = 14; ctx.strokeRect(s.x, s.y, s.w, s.h); }
      break;
    case 'grad': {
      const g = s.dir === 'h'
        ? ctx.createLinearGradient(s.x, 0, s.x + s.w, 0)
        : ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
      s.stops.forEach((c, i) => g.addColorStop(i / (s.stops.length - 1), c));
      ctx.fillStyle = g; ctx.fillRect(s.x, s.y, s.w, s.h);
      break;
    }
    case 'circle':
      ctx.fillStyle = s.color; ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      break;
    case 'stripes': {
      ctx.save(); ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
      for (let i = 0, x = s.x; x < s.x + s.w; x += s.sw, i++) {
        ctx.fillStyle = s.colors[i % s.colors.length];
        ctx.fillRect(x, s.y, s.sw, s.h);
      }
      ctx.restore();
      break;
    }
    case 'poly':
      ctx.fillStyle = s.color; ctx.beginPath();
      ctx.moveTo(s.pts[0][0], s.pts[0][1]);
      for (const [x, y] of s.pts.slice(1)) ctx.lineTo(x, y);
      ctx.closePath(); ctx.fill();
      break;
  }
}

export function drawMapBg(ctx, map) {
  const g = ctx.createLinearGradient(0, 0, 0, map.h);
  map.sky.forEach((c, i) => g.addColorStop(i / (map.sky.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, map.w, map.h);
  for (const s of map.shapes) drawShape(ctx, s);
}

// Collision solids as AABBs (poly/circle solids approximated by bounding boxes).
export function solidsOf(map) {
  const out = [];
  for (const s of map.shapes) {
    if (!s.solid) continue;
    if (s.type === 'circle') out.push({ x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2, climb: !!s.climb });
    else if (s.type === 'poly') {
      const xs = s.pts.map(p => p[0]), ys = s.pts.map(p => p[1]);
      const x = Math.min(...xs), y = Math.min(...ys);
      out.push({ x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, climb: !!s.climb });
    } else out.push({ x: s.x, y: s.y, w: s.w, h: s.h, climb: !!s.climb });
  }
  return out;
}

// Offscreen 1:1 render of the map for eyedropper sampling.
const sampleCache = new Map();
export function mapSampler(mapId) {
  if (sampleCache.has(mapId)) return sampleCache.get(mapId);
  const map = MAPS[mapId];
  const c = document.createElement('canvas');
  c.width = map.w; c.height = map.h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  drawMapBg(ctx, map);
  const sampler = (x, y) => {
    x = Math.max(0, Math.min(map.w - 1, Math.round(x)));
    y = Math.max(0, Math.min(map.h - 1, Math.round(y)));
    const d = ctx.getImageData(x, y, 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
  };
  sampleCache.set(mapId, sampler);
  return sampler;
}
