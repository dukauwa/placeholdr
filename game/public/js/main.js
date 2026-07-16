// STICKMOUFLAGE client bootstrap + 3D game loop.
import { S, newPlayer } from './state.js';
import { POSES } from './figure.js';
import { getMapDef, probeGlbMaps } from './maps3d.js';
import { stepPhysics3D, stepPhysicsGrid } from './physics3d.js';
import { connect, send, onMsg, onClose } from './net.js';
import { input, initInput, on } from './input.js';
import * as paint from './paint.js';
import * as ui from './ui.js';
import {
  canvas, resize, loadWorld, getWorld, attachFigure, detachFigure,
  setSeekerLook, drawLabel, addSplatAlongRay, updateCamera3D, render3D,
  rayFromScreen, rayFromCenter, view, camera,
} from './render3d.js';
import { sfx } from './audio.js';

let world = null;
let selectedPose = 'stand';
let lastPosSend = 0;
let lastSent = '';
let painting = false;

function loadMapWorld(mapId) {
  const def = getMapDef(mapId);
  const glbUrl = def.kind === 'glb'
    ? (S.glbAvail?.[mapId] || `maps/${mapId}.glb`) : null;
  world = loadWorld(mapId, glbUrl);
  if (def.kind === 'glb' && !world.ready) {
    ui.toast(def.heavy
      ? 'Loading a heavy imported map — give it a few seconds…'
      : 'Loading imported map…', 2500);
    world.onReady.push(() => {
      // snap myself to a real spawn once the world has collision
      const me = S.me();
      if (me && (S.phase === 'prep' || S.phase === 'seek' || S.phase === 'lobby')) {
        const [x, z, fy] = me.role === 'seeker' ? world.seekerSpawn : world.hiderSpawn;
        me.x = x; me.z = z; me.y = (fy || 0) + 0.5; me.vy = 0;
      }
    });
  }
  return world;
}

// ---------------------------------------------------------------------------
// Network handlers
// ---------------------------------------------------------------------------

function spawnPoint(role) {
  const sp = world
    ? (role === 'seeker' ? world.seekerSpawn : world.hiderSpawn)
    : [0, 0];
  const [sx, sz, floorY] = sp;
  // imported worlds: only offset onto columns the collision grid approves
  if (world?.kind === 'glb' && world.grid) {
    const fy = floorY ?? 0;
    for (let i = 0; i < 10; i++) {
      const x = sx + (Math.random() - 0.5) * 3, z = sz + (Math.random() - 0.5) * 3;
      const f = world.grid.floorBelow(x, z, fy + 2);
      if (f > -0.6 && Math.abs(f - fy) < 1.6 &&
          !world.grid.occupied(x, z, f + 0.15, f + 2.0)) {
        return [x, f + 0.4, z];
      }
    }
    return [sx, fy + 0.4, sz];
  }
  return [sx + (Math.random() - 0.5) * 4, 0, sz + (Math.random() - 0.5) * 4];
}

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
      [p.x, p.y, p.z] = spawnPoint(pd.role);
      p.netX = p.x; p.netY = p.y; p.netZ = p.z;
      S.players.set(pd.id, p);
      attachFigure(p);
      setSeekerLook(p, pd.role === 'seeker');
    }
    const roleChanged = p.role !== pd.role;
    p.name = pd.name; p.role = pd.role; p.tagged = pd.tagged; p.tags = pd.tags;
    if (roleChanged) setSeekerLook(p, p.role === 'seeker');
    drawLabel(p);
  }
  for (const id of [...S.players.keys()]) {
    if (!seen.has(id)) { detachFigure(S.players.get(id)); S.players.delete(id); }
  }
}

onMsg('joined', (m) => {
  S.myId = m.id;
  S.mapId = m.settings.map;
  loadMapWorld(S.mapId);
  syncRoom(m);
  ui.showScreen('lobby');
  ui.renderLobby();
});

onMsg('room', (m) => {
  if (m.settings.map !== S.mapId) {
    S.mapId = m.settings.map;
    loadMapWorld(S.mapId);
  }
  syncRoom(m);
  if (m.phase === 'lobby') { S.phase = 'lobby'; ui.showScreen('lobby'); }
  if (S.phase === 'lobby' || S.phase === 'results') ui.renderLobby();
});

onMsg('error', (m) => ui.menuError(m.msg));

onMsg('phase', (m) => {
  S.phase = m.phase;
  S.phaseEndsAt = m.endsAt;
  S.settings = m.settings;
  S.mapId = m.settings.map;
  // fresh world each phase start clears splats; GLB worlds reload async but
  // keep their collision once ready
  loadMapWorld(S.mapId);

  for (const [id, role] of Object.entries(m.roles)) {
    const p = S.players.get(id);
    if (p) {
      p.role = role; p.tagged = false; p.tags = 0;
      setSeekerLook(p, role === 'seeker');
      drawLabel(p);
      setGhostLook(p, false);
    }
  }
  const me = S.me();
  // face the middle of the map when a phase begins
  view.yaw = Math.atan2(-(0 - me.x), -(0 - me.z));
  view.pitch = -0.2;

  if (m.phase === 'prep') {
    paint.clearAllPaint();
    S.ammo = 6;
    selectedPose = 'stand';
    for (const p of S.players.values()) {
      [p.x, p.y, p.z] = spawnPoint(p.role);
      p.netX = p.x; p.netY = p.y; p.netZ = p.z;
      p.vx = p.vy = p.vz = 0; p.pose = 'stand';
    }
    sfx.phase();
    if (me.role === 'seeker') {
      document.exitPointerLock?.();
      ui.showScreen('blindfold');
    } else {
      ui.showScreen(null);
      ui.togglePalette(true);
      ui.toast('Paint yourself to match the stage! Click any surface to grab its exact color.', 4200);
    }
  } else if (m.phase === 'seek') {
    sfx.phase();
    ui.showScreen(null);
    if (me.role === 'seeker') {
      [me.x, me.y, me.z] = spawnPoint('seeker');
      ui.toast('Hunt! Click to shoot paint — every miss wastes ammo.', 3600);
    } else {
      ui.togglePalette(false);
      ui.toast('Seekers are coming. Hold still…', 3000);
    }
  }
  updateOverlays();
});

onMsg('pos', (m) => {
  const p = S.players.get(m.id);
  if (!p || m.id === S.myId) return;
  p.netX = m.x; p.netY = m.y; p.netZ = m.z; p.netRy = m.ry;
  p.pose = m.pose; p.anim = m.anim;
});

for (const t of ['stroke', 'fill', 'undo', 'clearPaint']) {
  onMsg(t, (m) => {
    const p = S.players.get(m.id);
    if (p && m.id !== S.myId) paint.applyOp(p, m);
  });
}

onMsg('shot', (m) => {
  addSplatAlongRay(m.o, m.d);
  if (m.id === S.myId) S.ammo = m.ammo;
  m.hit ? sfx.tag() : sfx.splat();
});

onMsg('noammo', () => ui.toast('Out of paint! Wait for ammo to regenerate…', 1800));

onMsg('tagged', (m) => {
  const p = S.players.get(m.id);
  const by = S.players.get(m.by);
  if (p) { p.tagged = true; setGhostLook(p, true); }
  ui.toast(m.id === S.myId
    ? `You were found by ${by?.name || 'a seeker'}!`
    : `${p?.name || '?'} was found!`, 2800);
  if (m.id === S.myId) ui.togglePalette(false);
});

onMsg('converted', (m) => {
  const p = S.players.get(m.id);
  if (p) { p.role = 'seeker'; p.tagged = false; setSeekerLook(p, true); drawLabel(p); }
  ui.toast(m.id === S.myId
    ? 'You were caught — now you seek!'
    : `${p?.name || '?'} joined the seekers!`, 2800);
});

onMsg('results', (m) => {
  S.phase = 'results';
  document.exitPointerLock?.();
  const meWon = (m.winners === 'seekers') === (S.me()?.role === 'seeker');
  meWon ? sfx.win() : sfx.lose();
  ui.showResults(m.winners, m.stats);
});

onMsg('chat', (m) => ui.addChat(m.name, m.msg));

onClose(() => {
  ui.showScreen('menu');
  ui.menuError('Disconnected from server.');
  for (const p of S.players.values()) detachFigure(p);
  S.players.clear();
});

function setGhostLook(p, ghost) {
  if (!p.fig) return;
  for (const mesh of p.fig.meshes) {
    mesh.material.transparent = ghost;
    mesh.material.opacity = ghost ? 0.2 : 1;
    mesh.material.needsUpdate = true;
  }
  if (p.label) p.label.material.opacity = ghost ? 0.25 : 1;
}

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
on('palette', () => {
  if (!inGame()) return;
  ui.togglePalette();
  if (S.paletteOpen) document.exitPointerLock?.();
  updateOverlays();
});
on('tool', (t) => ui.setTool(t));
on('fill', () => paintAction('fill'));
on('undo', () => paintAction('undo'));
on('clear', () => paintAction('clear'));
on('controls', () => ui.toggleControls());
on('quickpick', () => {
  // Space with the palette open = eyedrop whatever is under the cursor
  if (S.paletteOpen && !document.pointerLockElement) {
    trySampleAt(input.mouseX, input.mouseY);
    input.jumpPressed = false;   // sampling, not jumping
  }
});
on('chat', (what) => {
  if (what === 'focus' && S.screen !== 'menu') ui.focusChat();
  if (what === 'blur') document.activeElement?.blur();
});

on('look', ({ dx, dy }) => {
  view.yaw -= dx * 0.0024;
  view.pitch = Math.max(-1.25, Math.min(1.25, view.pitch - dy * 0.0024));
});

let orbitDrag = null;   // { x, y, moved } while dragging empty space (palette open)

on('click', (e) => {
  const me = S.me();
  if (!me || !inGame()) return;
  const locked = document.pointerLockElement === canvas;
  const seeking = me.role === 'seeker' && S.phase === 'seek';

  if (seeking) {
    if (!locked) { canvas.requestPointerLock?.(); return; }
    if (e.button === 0) shoot();
    return;
  }

  // hider / ghost with the palette open: click body = paint, click world =
  // sample its color, drag empty space = orbit the camera
  if (S.paletteOpen && !locked) {
    if (e.button === 2 || e.altKey || S.tool === 'eyedrop') {
      trySampleAt(e.clientX, e.clientY);
      return;
    }
    if (e.button === 0) {
      const pt = bodyPointAt(e.clientX, e.clientY);
      if (pt) {
        painting = true;
        paint.beginStroke(S.brushColor, S.brushSize);
        paint.strokePoint(me, pt, send);
      } else {
        orbitDrag = { x: e.clientX, y: e.clientY, moved: false };
      }
      return;
    }
  }
  if (!locked) canvas.requestPointerLock?.();
});

document.addEventListener('pointerlockchange', () => {
  S.pointerLocked = document.pointerLockElement === canvas;
  updateOverlays();
});

document.addEventListener('paint-action', (e) => paintAction(e.detail));

function shoot() {
  const rc = rayFromCenter();
  const o = rc.ray.origin, d = rc.ray.direction;
  send({ t: 'shoot', o: [o.x, o.y, o.z], d: [d.x, d.y, d.z] });
  sfx.shoot();
}

function paintAction(action) {
  const me = S.me();
  if (!me || !canPaint()) return;
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
  return inGame() && me && me.role === 'hider' && !me.tagged;
}

// convert a screen click to an atlas point on my own body
function bodyPointAt(sx, sy) {
  const me = S.me();
  if (!me?.fig) return null;
  const rc = rayFromScreen(sx, sy);
  const hits = rc.intersectObjects(me.fig.meshes, false);
  if (!hits.length || !hits[0].uv) return null;
  const uv = hits[0].uv;
  return [Math.round(uv.x * 256), Math.round((1 - uv.y) * 256)];
}

function tryPaintAt(sx, sy) {
  if (!canPaint()) return;
  const pt = bodyPointAt(sx, sy);
  if (!pt) { trySampleAt(sx, sy); return; }   // clicked past the body: sample
  if (S.tool === 'eyedrop') { trySampleAt(sx, sy); return; }
  painting = true;
  paint.beginStroke(S.brushColor, S.brushSize);
  paint.strokePoint(S.me(), pt, send);
}

function trySampleAt(sx, sy) {
  const w = getWorld();
  if (!w) return;
  const rc = rayFromScreen(sx, sy);
  const hits = rc.intersectObjects(w.group.children, true);
  const hit = hits.find(h => h.object.userData.pick);
  if (!hit) return;
  // exact texel color under the cursor (pattern- and texture-aware)
  ui.setColor(hit.object.userData.pick(hit.uv));
  sfx.pick();
}

canvas.addEventListener('mousemove', (e) => {
  if (orbitDrag) {
    const dx = e.clientX - orbitDrag.x, dy = e.clientY - orbitDrag.y;
    orbitDrag.x = e.clientX; orbitDrag.y = e.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) orbitDrag.moved = true;
    view.yaw -= dx * 0.006;
    view.pitch = Math.max(-1.25, Math.min(1.25, view.pitch - dy * 0.006));
    return;
  }
  if (!painting) return;
  if (!canPaint()) { painting = false; return; }
  const pt = bodyPointAt(e.clientX, e.clientY);
  if (pt) paint.strokePoint(S.me(), pt, send);
});
window.addEventListener('mouseup', (e) => {
  if (orbitDrag) {
    // a click (no drag) on the world = eyedrop that spot
    if (!orbitDrag.moved) trySampleAt(e.clientX, e.clientY);
    orbitDrag = null;
    return;
  }
  if (painting) { paint.flushStroke(S.me(), send); painting = false; }
});

// wheel: brush size when palette open, camera zoom otherwise
canvas.addEventListener('wheel', (e) => {
  if (S.paletteOpen) {
    S.brushSize = Math.max(2, Math.min(36, S.brushSize - Math.sign(e.deltaY) * 2));
    ui.setBrushSizeUI();
  } else {
    view.dist = Math.max(2.4, Math.min(10, view.dist + Math.sign(e.deltaY) * 0.6));
  }
  e.preventDefault();
}, { passive: false });

function updateOverlays() {
  const me = S.me();
  const seeking = me?.role === 'seeker' && S.phase === 'seek';
  document.getElementById('crosshair').classList.toggle('hidden', !(seeking && S.pointerLocked));
  const showLockHint = inGame() && !S.pointerLocked && !S.paletteOpen &&
    !(me?.role === 'seeker' && S.phase === 'prep');
  document.getElementById('lock-hint').classList.toggle('hidden', !showLockHint);
}

// ---------------------------------------------------------------------------
// Game loop
// ---------------------------------------------------------------------------

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const me = S.me();

  if (me && inGame()) {
    const isGhost = me.tagged && S.settings?.mode !== 'infection';
    const blindfolded = me.role === 'seeker' && S.phase === 'prep';

    // camera-relative move direction
    const f = (input.fwd ? 1 : 0) - (input.back ? 1 : 0);
    const r = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const sy = Math.sin(view.yaw), cy = Math.cos(view.yaw);
    let dirX = -sy * f + cy * r;
    let dirZ = -cy * f - sy * r;
    const dl = Math.hypot(dirX, dirZ);
    if (dl > 1) { dirX /= dl; dirZ /= dl; }

    if (isGhost) {
      const fly = input.run ? 14 : 8;
      me.x += dirX * fly * dt;
      me.z += dirZ * fly * dt;
      if (input.down) me.y -= fly * dt;
      if (input.jumpPressed) { me.y += 2.5; input.jumpPressed = false; }
      me.y = Math.max(0.5, Math.min(40, me.y));
      const b = world?.bounds || { x: 40, z: 30 };
      me.x = Math.max(-b.x, Math.min(b.x, me.x));
      me.z = Math.max(-b.z, Math.min(b.z, me.z));
      me.pose = 'tpose';
    } else if (!blindfolded && world) {
      const move = {
        dirX, dirZ, run: input.run, crouch: input.crouch || input.down,
        up: input.fwd, down: input.back || input.down,
        jumpPressed: input.jumpPressed,
      };
      if (world.kind === 'glb') {
        if (world.grid) stepPhysicsGrid(me, move, world.grid, world.bounds, dt);
      } else {
        stepPhysics3D(me, move, world.solids, world.bounds, dt);
      }
      input.jumpPressed = false;

      const moving = Math.hypot(me.vx, me.vz) > 0.5;
      if (me.clinging) me.pose = 'climb';
      else if (!me.onGround) me.pose = 'jump';
      else if ((input.crouch || input.down)) { me.pose = 'crouch'; if (moving) me.walkT += dt; }
      else if (moving) { me.pose = input.run ? 'run' : 'walk'; me.walkT += dt; }
      else me.pose = me.role === 'seeker' ? 'stand' : selectedPose;

      if (moving && !me.clinging) me.ry = Math.atan2(me.vx, me.vz);
      if (me.role === 'seeker' && S.phase === 'seek') me.ry = view.yaw + Math.PI;
    }

    // sync my figure
    if (me.fig) {
      me.fig.root.position.set(me.x, me.y, me.z);
      me.fig.root.rotation.y = me.ry;
      me.fig.setPose(me.pose, me.walkT);
    }

    // broadcast ~15Hz on change
    if (now - lastPosSend > 66) {
      const sig = `${me.x.toFixed(1)},${me.y.toFixed(1)},${me.z.toFixed(1)},${me.pose},${me.ry.toFixed(1)}`;
      if (sig !== lastSent) {
        send({ t: 'pos', x: +me.x.toFixed(2), y: +me.y.toFixed(2), z: +me.z.toFixed(2),
               ry: +me.ry.toFixed(2), pose: me.pose, anim: me.anim });
        lastSent = sig; lastPosSend = now;
      }
    }
  }

  // interpolate + animate remote players
  for (const p of S.players.values()) {
    if (p.id !== S.myId) {
      const k = Math.min(1, dt * 12);
      p.x += (p.netX - p.x) * k;
      p.y += (p.netY - p.y) * k;
      p.z += (p.netZ - p.z) * k;
      let dr = p.netRy - p.ry;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      p.ry += dr * k;
      if (p.pose === 'walk' || p.pose === 'run' || p.pose === 'climb') p.walkT += dt;
      if (p.fig) {
        p.fig.root.position.set(p.x, p.y, p.z);
        p.fig.root.rotation.y = p.ry;
        p.fig.setPose(p.pose, p.walkT);
      }
    }
    // hider name labels are hidden during the hunt — that IS the game
    if (p.label) {
      p.label.visible = !(S.phase === 'seek' && p.role === 'hider') && p.id !== S.myId;
    }
  }

  if ((inGame() || S.phase === 'results') && getWorld()) {
    updateCamera3D(dt);
    render3D();
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
ui.initControlsOverlay();
ui.setColor('#e0533d');
document.getElementById('pal-howto').innerHTML =
  `<b>1.</b> Click any surface (or press <b>Space</b> over it) to grab its exact color<br>` +
  `<b>2.</b> Click your body to paint it on<br>` +
  `<b>3.</b> Drag empty space to spin the camera · ${ui.KEY.altShort}+click always samples`;
initInput(canvas);
resize();

// discover which imported GLB maps exist on this server
probeGlbMaps().then((avail) => {
  S.glbAvail = avail;
  ui.refreshMapOptions();
});

let connected = false;
async function ensureConnected() {
  if (connected) return;
  try { await connect(); connected = true; ui.menuError(''); }
  catch { ui.menuError('Could not reach the game server.'); throw new Error('no server'); }
}

requestAnimationFrame(frame);

// test hooks (used by the automated e2e harness; harmless in production)
window.__T = {
  S, send, view, camera, getWorld,
  paintAt: tryPaintAt, sampleAt: trySampleAt,
  endStroke: () => { if (painting) { paint.flushStroke(S.me(), send); painting = false; } },
  shootAtWorld: (x, y, z) => {
    const me = S.me();
    const o = [me.x, me.y + 1.62, me.z];
    const d = [x - o[0], y - o[1], z - o[2]];
    send({ t: 'shoot', o, d });
  },
  setPose: (p) => { selectedPose = p; },
};
