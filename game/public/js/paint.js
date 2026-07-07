// Body painting (3D): strokes live in the 256x256 texture atlas of each
// player's figure. Ops are replayable so undo/late-sync stay deterministic.
import { S } from './state.js';
import { ATLAS } from './figure.js';

export function applyOp(player, op) {
  player.paintOps.push(op);
  drawOp(player, op);
}

function actx(player) { return player.fig ? player.fig.actx : null; }
function touch(player) { if (player.fig) player.fig.texture.needsUpdate = true; }

export function drawOp(player, op) {
  const ctx = actx(player);
  if (!ctx) return;
  switch (op.t) {
    case 'stroke': {
      ctx.strokeStyle = op.color;
      ctx.lineWidth = op.size;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      const pts = op.pts;
      ctx.moveTo(pts[0][0], pts[0][1]);
      if (pts.length === 1) ctx.lineTo(pts[0][0] + 0.1, pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        // big jumps mean the brush crossed to another body part's atlas cell
        const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
        if (dx * dx + dy * dy > 45 * 45) ctx.moveTo(pts[i][0], pts[i][1]);
        else ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();
      break;
    }
    case 'fill':
      ctx.fillStyle = op.color;
      ctx.fillRect(0, 0, ATLAS, ATLAS);
      break;
    case 'undo': {
      const ops = player.paintOps;
      ops.pop(); // the undo marker itself
      for (let i = ops.length - 1; i >= 0; i--) {
        if (ops[i].t === 'stroke' || ops[i].t === 'fill') { ops.splice(i, 1); break; }
      }
      rerender(player);
      break;
    }
    case 'clearPaint':
      player.paintOps.length = 0;
      base(ctx);
      break;
  }
  touch(player);
}

function base(ctx) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ATLAS, ATLAS);
}

export function rerender(player) {
  const ctx = actx(player);
  if (!ctx) return;
  base(ctx);
  for (const op of player.paintOps) {
    if (op.t === 'stroke' || op.t === 'fill') {
      const keep = player.paintOps;
      player.paintOps = []; drawOp(player, op); player.paintOps = keep;
    }
  }
  touch(player);
}

export function clearAllPaint() {
  for (const p of S.players.values()) {
    p.paintOps.length = 0;
    const ctx = actx(p);
    if (ctx) { base(ctx); touch(p); }
  }
}

// ---- stroke batching for the network --------------------------------------
let pending = null;
export function beginStroke(color, size) {
  pending = { t: 'stroke', color, size, pts: [] };
}
export function strokePoint(player, pt, sendFn) {
  if (!pending) return;
  const prev = pending.pts[pending.pts.length - 1];
  pending.pts.push(pt);
  const ctx = actx(player);
  if (ctx) {
    ctx.strokeStyle = pending.color; ctx.lineWidth = pending.size;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const a = prev || pt;
    const jump = prev && ((pt[0] - a[0]) ** 2 + (pt[1] - a[1]) ** 2 > 45 * 45);
    ctx.moveTo(jump ? pt[0] : a[0], jump ? pt[1] : a[1]);
    ctx.lineTo(pt[0] + (prev ? 0 : 0.1), pt[1]);
    ctx.stroke();
    touch(player);
  }
  if (pending.pts.length >= 24) flushStroke(player, sendFn, true);
}
export function flushStroke(player, sendFn, continueStroke = false) {
  if (!pending || pending.pts.length === 0) { if (!continueStroke) pending = null; return; }
  const op = { t: 'stroke', color: pending.color, size: pending.size, pts: pending.pts };
  player.paintOps.push(op);           // already drawn incrementally
  sendFn(op);
  pending = continueStroke
    ? { t: 'stroke', color: pending.color, size: pending.size, pts: [pending.pts[pending.pts.length - 1]] }
    : null;
}

// ---- HSL color wheel -------------------------------------------------------
export function drawColorWheel(canvas, lightness) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, r = w / 2;
  const img = ctx.createImageData(w, w);
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - r, dy = y - r, d = Math.hypot(dx, dy);
      const i = (y * w + x) * 4;
      if (d > r) { img.data[i + 3] = 0; continue; }
      const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      const sat = Math.min(1, d / r);
      const [R, G, B] = hslToRgb(hue, sat, lightness / 100);
      img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function wheelPick(canvas, ev, lightness) {
  const rect = canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * canvas.width / rect.width;
  const y = (ev.clientY - rect.top) * canvas.height / rect.height;
  const r = canvas.width / 2;
  const dx = x - r, dy = y - r;
  if (Math.hypot(dx, dy) > r) return null;
  const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  const sat = Math.min(1, Math.hypot(dx, dy) / r);
  const [R, G, B] = hslToRgb(hue, sat, lightness / 100);
  return '#' + [R, G, B].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255].map(Math.round);
}

export function pushRecent(color) {
  const i = S.recentColors.indexOf(color);
  if (i >= 0) S.recentColors.splice(i, 1);
  S.recentColors.unshift(color);
  if (S.recentColors.length > 12) S.recentColors.pop();
}
