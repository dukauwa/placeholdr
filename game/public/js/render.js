// World rendering: camera, cached map layer, splats, players, cursors.
import { S, BODY_W, BODY_H } from './state.js';
import { MAPS, drawMapBg } from './maps.js';
import { composeBody } from './stickfigure.js';

export const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const VIEW_H = 950;                     // world units visible vertically
const mapLayerCache = new Map();        // mapId -> canvas

export function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
}
window.addEventListener('resize', resize);
resize();

function mapLayer(mapId) {
  if (!mapLayerCache.has(mapId)) {
    const map = MAPS[mapId];
    const c = document.createElement('canvas');
    c.width = map.w; c.height = map.h;
    drawMapBg(c.getContext('2d'), map);
    mapLayerCache.set(mapId, c);
  }
  return mapLayerCache.get(mapId);
}

export function updateCamera(dt) {
  const map = MAPS[S.mapId];
  const me = S.me();
  if (!me || !map) return;
  const cam = S.camera;
  cam.zoom = canvas.height / VIEW_H;
  const viewW = canvas.width / cam.zoom, viewH = canvas.height / cam.zoom;
  const tx = me.x - viewW / 2, ty = me.y - BODY_H / 2 - viewH / 2;
  cam.x += (tx - cam.x) * Math.min(1, dt * 8);
  cam.y += (ty - cam.y) * Math.min(1, dt * 8);
  cam.x = Math.max(0, Math.min(map.w - viewW, cam.x));
  cam.y = Math.max(0, Math.min(map.h - viewH, cam.y));
  if (map.w < viewW) cam.x = (map.w - viewW) / 2;
  if (map.h < viewH) cam.y = (map.h - viewH) / 2;
}

export function screenToWorld(sx, sy) {
  const cam = S.camera;
  return [sx * devicePixelRatio / cam.zoom + cam.x, sy * devicePixelRatio / cam.zoom + cam.y];
}

export function drawWorld(t) {
  const map = MAPS[S.mapId];
  const me = S.me();
  ctx.fillStyle = '#0c0c12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!map) return;

  const cam = S.camera;
  ctx.save();
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  ctx.drawImage(mapLayer(S.mapId), 0, 0);

  // persistent paint splats from seeker shots
  for (const sp of S.splats) {
    ctx.fillStyle = sp.color;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 7; i++) {
      const a = sp.seed * 7 + i * 0.9, d = (i % 3) * sp.r * 0.45;
      ctx.beginPath();
      ctx.arc(sp.x + Math.cos(a + i) * d, sp.y + Math.sin(a * 1.7 + i) * d,
              sp.r * (1 - i * 0.11), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // players (draw me last so I'm on top)
  const ordered = [...S.players.values()].sort((a, b) =>
    (a.id === S.myId) - (b.id === S.myId));
  for (const p of ordered) {
    if (p.tagged && S.settings?.mode !== 'infection') {
      drawGhost(p, t);
      continue;
    }
    drawPlayer(p, t);
  }

  ctx.restore();

  // cursor hints (screen space)
  if (me && !me.tagged) drawCursor(me);
}

function drawPlayer(p, t) {
  // seekers get a bold red tint so they're always obvious
  const body = composeBody(p, t, p.role === 'seeker' ? '#e03c2d' : null);
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.face === -1) ctx.scale(-1, 1);
  ctx.drawImage(body, -BODY_W / 2, -BODY_H);
  ctx.restore();

  // name labels: lobby & prep only (never during seek — that's the game!)
  if (S.phase !== 'seek' || p.role === 'seeker') {
    ctx.fillStyle = p.role === 'seeker' ? '#ff5a4e' : 'rgba(255,255,255,.75)';
    ctx.font = '600 15px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x, p.y - BODY_H - 10);
  }
}

function drawGhost(p, t) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  const body = composeBody(p, t);
  ctx.translate(p.x, p.y - 14 + Math.sin(t * 2 + p.x) * 6);
  if (p.face === -1) ctx.scale(-1, 1);
  ctx.drawImage(body, -BODY_W / 2, -BODY_H);
  ctx.restore();
}

function drawCursor(me) {
  const px = (x) => x * devicePixelRatio;
  const mx = px(window.__mouseX || 0), my = px(window.__mouseY || 0);
  ctx.save();
  if (me.role === 'seeker' && S.phase === 'seek') {
    ctx.strokeStyle = '#ff5a4e'; ctx.lineWidth = 2 * devicePixelRatio;
    ctx.beginPath(); ctx.arc(mx, my, 14 * devicePixelRatio, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 22 * devicePixelRatio, my); ctx.lineTo(mx + 22 * devicePixelRatio, my);
    ctx.moveTo(mx, my - 22 * devicePixelRatio); ctx.lineTo(mx, my + 22 * devicePixelRatio);
    ctx.stroke();
  } else if (me.role === 'hider') {
    if (S.tool === 'eyedrop' || window.__altDown) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * devicePixelRatio;
      ctx.beginPath(); ctx.arc(mx, my, 8 * devicePixelRatio, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = S.brushColor;
      ctx.beginPath(); ctx.arc(mx, my, 5 * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 1.5 * devicePixelRatio;
      ctx.beginPath();
      ctx.arc(mx, my, (S.brushSize / 2) * S.camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = S.brushColor + 'aa';
      ctx.beginPath();
      ctx.arc(mx, my, (S.brushSize / 2) * S.camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
