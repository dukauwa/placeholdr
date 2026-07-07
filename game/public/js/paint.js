// Body painting: strokes live in body space (140x220) on each player's paint
// canvas. Ops are replayable so undo/late-sync re-render deterministically.
import { S, BODY_W, BODY_H } from './state.js';

export function applyOp(player, op) {
  player.paint.ops.push(op);
  drawOp(player.paint.ctx, op, player);
}

export function drawOp(ctx, op, player) {
  switch (op.t) {
    case 'stroke': {
      ctx.strokeStyle = op.color;
      ctx.lineWidth = op.size;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      const pts = op.pts;
      ctx.moveTo(pts[0][0], pts[0][1]);
      if (pts.length === 1) ctx.lineTo(pts[0][0] + 0.1, pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      break;
    }
    case 'fill':
      ctx.fillStyle = op.color;
      ctx.fillRect(0, 0, BODY_W, BODY_H);
      break;
    case 'undo': {
      // remove last stroke/fill (the undo op itself was already pushed)
      const ops = player.paint.ops;
      ops.pop(); // the undo marker
      for (let i = ops.length - 1; i >= 0; i--) {
        if (ops[i].t === 'stroke' || ops[i].t === 'fill') { ops.splice(i, 1); break; }
      }
      rerender(player);
      break;
    }
    case 'clearPaint':
      player.paint.ops.length = 0;
      ctx.clearRect(0, 0, BODY_W, BODY_H);
      break;
  }
}

export function rerender(player) {
  const { ctx, ops } = player.paint;
  ctx.clearRect(0, 0, BODY_W, BODY_H);
  for (const op of ops) if (op.t === 'stroke' || op.t === 'fill') drawOp(ctx, op, player);
}

export function clearAllPaint() {
  for (const p of S.players.values()) {
    p.paint.ops.length = 0;
    p.paint.ctx.clearRect(0, 0, BODY_W, BODY_H);
  }
}

/**
 * Convert a world point to body space for a player, honoring facing flip.
 * Returns null if outside the body canvas box.
 */
export function worldToBody(player, wx, wy) {
  let bx = wx - (player.x - BODY_W / 2);
  const by = wy - (player.y - BODY_H);
  if (player.face === -1) bx = BODY_W - bx;
  if (bx < -10 || bx > BODY_W + 10 || by < -10 || by > BODY_H + 10) return null;
  return [Math.round(bx), Math.round(by)];
}

// ---- stroke batching for the network --------------------------------------
let pending = null;
export function beginStroke(color, size) {
  pending = { t: 'stroke', color, size, pts: [] };
}
export function strokePoint(player, pt, sendFn) {
  if (!pending) return;
  pending.pts.push(pt);
  // draw incrementally: just the last segment
  const ctx = player.paint.ctx;
  ctx.strokeStyle = pending.color; ctx.lineWidth = pending.size;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const n = pending.pts.length;
  ctx.beginPath();
  const a = pending.pts[Math.max(0, n - 2)], b = pending.pts[n - 1];
  ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0] + (n === 1 ? 0.1 : 0), b[1]);
  ctx.stroke();
  if (pending.pts.length >= 24) flushStroke(player, sendFn, true);
}
export function flushStroke(player, sendFn, continueStroke = false) {
  if (!pending || pending.pts.length === 0) { if (!continueStroke) pending = null; return; }
  const op = { t: 'stroke', color: pending.color, size: pending.size, pts: pending.pts };
  player.paint.ops.push(op);          // already drawn incrementally
  sendFn(op);
  pending = continueStroke ? { t: 'stroke', color: pending.color, size: pending.size, pts: [pending.pts[pending.pts.length - 1]] } : null;
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
