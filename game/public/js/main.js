// STICKMOUFLAGE client bootstrap + game loop.
import { S, newPlayer, POSES } from './state.js';
import { MAPS, solidsOf, mapSampler } from './maps.js';
import { stepPhysics } from './physics.js';
import { connect, send, onMsg, onClose } from './net.js';
import { input, initInput, on } from './input.js';
import * as paint from './paint.js';
import * as ui from './ui.js';
import { canvas, resize, updateCamera, drawWorld, screenToWorld } from './render.js';
import { sfx } from './audio.js';

let solids = [];
let selectedPose = 'stand';
let lastPosSend = 0;
let lastSent = '';
let painting = false;

// ---------------------------------------------------------------------------
// Network handlers
// ---------------------------------------------------------------------------

function syncRoom(m) {
  S.roomCode = m.code;
  S.hostId = m.hostId;
  S.settings = m.settings;
  const seen = new Set();
  for (const pd of m.players) {
    seen.add(pd.id);
    let p = S.players.get(pd.id);
    if (!p) {
      p = newPlayer(pd);
      const map = MAPS[S.mapId];
      p.x = p.netX = map.hiderSpawn.x + (Math.random() - 0.5) * 200;
      p.y = p.netY = map.hiderSpawn.y;
      S.players.set(pd.id, p);
    }
    p.name = pd.name; p.role = pd.role; p.tagged = pd.tagged; p.tags = pd.tags;
  }
  for (const id of [...S.players.keys()]) if (!seen.has(id)) S.players.delete(id);
}

onMsg('joined', (m) => {
  S.myId = m.id;
  syncRoom(m);
  S.mapId = m.settings.map;
  ui.showScreen('lobby');
  ui.renderLobby();
});

onMsg('room', (m) => {
  syncRoom(m);
  S.mapId = m.settings.map;
  if (m.phase === 'lobby') { S.phase = 'lobby'; ui.showScreen('lobby'); }
  if (S.phase === 'lobby' || S.phase === 'results') ui.renderLobby();
});

onMsg('error', (m) => ui.menuError(m.msg));

onMsg('phase', (m) => {
  S.phase = m.phase;
  S.phaseEndsAt = m.endsAt;
  S.settings = m.settings;
  S.mapId = m.settings.map;
  solids = solidsOf(MAPS[S.mapId]);
  for (const [id, role] of Object.entries(m.roles)) {
    const p = S.players.get(id);
    if (p) { p.role = role; p.tagged = false; p.tags = 0; }
  }
  const me = S.me();
  const map = MAPS[S.mapId];

  if (m.phase === 'prep') {
    paint.clearAllPaint();
    S.splats.length = 0;
    S.ammo = 6;
    selectedPose = 'stand';
    for (const p of S.players.values()) {
      const spawn = p.role === 'seeker' ? map.seekerSpawn : map.hiderSpawn;
      p.x = p.netX = spawn.x + (Math.random() - 0.5) * 220;
      p.y = p.netY = spawn.y;
      p.vx = p.vy = 0; p.pose = 'stand';
    }
    sfx.phase();
    if (me.role === 'seeker') {
      ui.showScreen('blindfold');
    } else {
      ui.showScreen(null);
      ui.togglePalette(true);
      ui.toast('Paint yourself to blend in! Alt+click samples stage colors.', 4200);
    }
  } else if (m.phase === 'seek') {
    sfx.phase();
    ui.showScreen(null);
    if (me.role === 'seeker') {
      me.x = map.seekerSpawn.x; me.y = map.seekerSpawn.y;
      ui.toast('Hunt! Click to shoot paint — every miss wastes ammo.', 3600);
    } else {
      ui.togglePalette(false);
      ui.toast('Seekers are coming. Hold still…', 3000);
    }
  }
});

onMsg('pos', (m) => {
  const p = S.players.get(m.id);
  if (!p || m.id === S.myId) return;
  p.netX = m.x; p.netY = m.y;
  p.vx = m.vx; p.vy = m.vy;
  p.pose = m.pose; p.face = m.face; p.anim = m.anim;
});

for (const t of ['stroke', 'fill', 'undo', 'clearPaint']) {
  onMsg(t, (m) => {
    const p = S.players.get(m.id);
    if (p && m.id !== S.myId) paint.applyOp(p, m);
  });
}

onMsg('shot', (m) => {
  S.splats.push({ x: m.x, y: m.y, color: '#e0533d', r: 26, seed: Math.random() * 10 });
  if (S.splats.length > 120) S.splats.shift();
  if (m.id === S.myId) S.ammo = m.ammo;
  m.hit ? sfx.tag() : sfx.splat();
});

onMsg('noammo', () => ui.toast('Out of paint! Wait for ammo to regenerate…', 1800));

onMsg('tagged', (m) => {
  const p = S.players.get(m.id);
  const by = S.players.get(m.by);
  if (p) p.tagged = true;
  ui.toast(m.id === S.myId
    ? `You were found by ${by?.name || 'a seeker'}!`
    : `${p?.name || '?'} was found!`, 2800);
  if (m.id === S.myId) ui.togglePalette(false);
});

onMsg('converted', (m) => {
  const p = S.players.get(m.id);
  if (p) { p.role = 'seeker'; p.tagged = false; }
  ui.toast(m.id === S.myId
    ? 'You were caught — now you seek!'
    : `${p?.name || '?'} joined the seekers!`, 2800);
});

onMsg('results', (m) => {
  S.phase = 'results';
  const meWon = (m.winners === 'seekers') === (S.me()?.role === 'seeker');
  meWon ? sfx.win() : sfx.lose();
  ui.showResults(m.winners, m.stats);
});

onMsg('chat', (m) => ui.addChat(m.name, m.msg));

onClose(() => {
  ui.showScreen('menu');
  ui.menuError('Disconnected from server.');
  S.players.clear();
});

// ---------------------------------------------------------------------------
// Input wiring
// ---------------------------------------------------------------------------

on('pose', () => {
  const me = S.me();
  if (!me || me.role !== 'hider') return;
  selectedPose = POSES[(POSES.indexOf(selectedPose) + 1) % POSES.length];
  sfx.pose();
  ui.toast(`Pose: ${selectedPose}`, 900);
});
on('poseSet', (i) => {
  const me = S.me();
  if (!me || me.role !== 'hider' || !POSES[i]) return;
  selectedPose = POSES[i];
  sfx.pose();
  ui.toast(`Pose: ${selectedPose}`, 900);
});
on('palette', () => { if (inGame()) ui.togglePalette(); });
on('tool', (t) => { ui.setTool(t); });
on('fill', () => paintAction('fill'));
on('undo', () => paintAction('undo'));
on('clear', () => paintAction('clear'));
on('chat', (what) => {
  if (what === 'focus' && S.screen !== 'menu') ui.focusChat();
  if (what === 'blur') document.activeElement?.blur();
});
on('shoot', () => {
  const me = S.me();
  if (!me || !inGame()) return;
  if (me.role === 'seeker' && S.phase === 'seek') {
    const [wx, wy] = screenToWorld(input.mouseX, input.mouseY);
    send({ t: 'shoot', x: wx, y: wy });
    sfx.shoot();
  }
});

document.addEventListener('paint-action', (e) => paintAction(e.detail));

function paintAction(action) {
  const me = S.me();
  if (!me || me.role !== 'hider' || me.tagged || !canPaint()) return;
  if (action === 'fill') {
    const op = { t: 'fill', color: S.brushColor };
    paint.applyOp(me, op); send(op);
  } else if (action === 'undo') {
    paint.applyOp(me, { t: 'undo' }); send({ t: 'undo' });
  } else if (action === 'clear') {
    paint.applyOp(me, { t: 'clearPaint' }); send({ t: 'clearPaint' });
  }
}

function inGame() { return S.phase === 'prep' || S.phase === 'seek'; }
function canPaint() {
  const me = S.me();
  return inGame() && me && me.role === 'hider' && !me.tagged &&
    !(S.phase === 'prep' && me.role === 'seeker');
}

// brush size via wheel
canvas.addEventListener('wheel', (e) => {
  if (S.me()?.role !== 'hider') return;
  S.brushSize = Math.max(2, Math.min(36, S.brushSize - Math.sign(e.deltaY) * 2));
  ui.setBrushSizeUI();
  e.preventDefault();
}, { passive: false });

// painting with the mouse
canvas.addEventListener('mousedown', (e) => {
  const me = S.me();
  if (!me || e.button !== 0 || !canPaint()) return;
  const [wx, wy] = screenToWorld(e.clientX, e.clientY);
  const eyedrop = S.tool === 'eyedrop' || e.altKey || input.rightDown;
  if (eyedrop) { sampleAt(wx, wy); return; }
  const pt = paint.worldToBody(me, wx, wy);
  if (!pt) return;
  painting = true;
  paint.beginStroke(S.brushColor, S.brushSize);
  paint.strokePoint(me, pt, send);
});
canvas.addEventListener('mousemove', (e) => {
  window.__mouseX = e.clientX; window.__mouseY = e.clientY;
  window.__altDown = e.altKey;
  if (!painting) return;
  const me = S.me();
  if (!me || !canPaint()) { painting = false; return; }
  const [wx, wy] = screenToWorld(e.clientX, e.clientY);
  const pt = paint.worldToBody(me, wx, wy);
  if (pt) paint.strokePoint(me, pt, send);
});
window.addEventListener('mouseup', () => {
  if (painting) { paint.flushStroke(S.me(), send); painting = false; }
});
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    const me = S.me();
    if (me && me.role === 'hider' && canPaint()) {
      const [wx, wy] = screenToWorld(e.clientX, e.clientY);
      sampleAt(wx, wy);
    }
  }
});

function sampleAt(wx, wy) {
  const c = mapSampler(S.mapId)(wx, wy);
  ui.setColor(c);
  sfx.pick();
}

// ---------------------------------------------------------------------------
// Game loop
// ---------------------------------------------------------------------------

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const t = now / 1000;
  const me = S.me();

  if (me && inGame()) {
    const isGhost = me.tagged && S.settings?.mode !== 'infection';
    const blindfolded = me.role === 'seeker' && S.phase === 'prep';

    if (isGhost) {
      // ghosts fly free
      me.vx = (input.right - input.left) * 420;
      me.vy = (input.down - input.up) * 420;
      me.x += me.vx * dt; me.y += me.vy * dt;
      const map = MAPS[S.mapId];
      me.x = Math.max(0, Math.min(map.w, me.x));
      me.y = Math.max(100, Math.min(map.h, me.y));
    } else if (!blindfolded) {
      const before = me.jumps;
      stepPhysics(me, input, solids, MAPS[S.mapId], dt, !painting);
      if (me.jumps > before) sfx.jump();
      // auto-pose from movement state, static pose when idle
      if (me.ceiling) me.pose = 'ceiling';
      else if (me.clinging) me.pose = 'climb';
      else if (!me.onGround) me.pose = 'jump';
      else if (Math.abs(me.vx) > 10) { me.pose = 'walk'; me.walkT += dt * (input.run ? 1.5 : 1); }
      else me.pose = me.role === 'seeker' ? 'stand' : selectedPose;
    }

    // broadcast position ~15Hz when it changes
    if (now - lastPosSend > 66) {
      const sig = `${me.x | 0},${me.y | 0},${me.pose},${me.face}`;
      if (sig !== lastSent) {
        send({ t: 'pos', x: Math.round(me.x), y: Math.round(me.y), vx: Math.round(me.vx),
               vy: Math.round(me.vy), pose: me.pose, face: me.face, anim: me.anim });
        lastSent = sig; lastPosSend = now;
      }
    }
  }

  // interpolate remote players
  for (const p of S.players.values()) {
    if (p.id === S.myId) continue;
    p.x += (p.netX - p.x) * Math.min(1, dt * 12);
    p.y += (p.netY - p.y) * Math.min(1, dt * 12);
    if (p.pose === 'walk' || p.pose === 'climb' || p.pose === 'ceiling') p.walkT += dt;
  }

  if (inGame() || S.phase === 'results') {
    updateCamera(dt);
    drawWorld(t);
    ui.updateHUD();
  }

  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

ui.initMenu({
  onCreate: async (name) => { await ensureConnected(); send({ t: 'create', name }); },
  onJoin: async (name, code) => {
    if (!code || code.length !== 4) return ui.menuError('Enter the 4-letter room code.');
    await ensureConnected();
    send({ t: 'join', name, code });
  },
});
ui.initLobby({
  onStart: () => send({ t: 'start' }),
  onLeave: () => location.reload(),
});
ui.initResults({ onAgain: () => send({ t: 'again' }) });
ui.initPalette();
ui.initChat();
ui.setColor('#e0533d');
initInput(canvas);
resize();

let connected = false;
async function ensureConnected() {
  if (connected) return;
  try { await connect(); connected = true; ui.menuError(''); }
  catch { ui.menuError('Could not reach the game server.'); throw new Error('no server'); }
}

requestAnimationFrame(frame);
