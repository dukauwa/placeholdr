// STICKMOUFLAGE server — rooms, roles, phase timers, tag authority.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

// ---------------------------------------------------------------------------

const rooms = new Map(); // code -> Room

const DEFAULT_SETTINGS = {
  mode: 'classic',       // 'classic' | 'infection'
  prepTime: 75,          // seconds
  seekTime: 120,         // seconds
  map: 'rooftop',
};

// Pose-aware hitboxes (world units, matches client stickfigure.js)
const POSE_BOX = {
  stand:     { w: 44, h: 96 },  walk: { w: 48, h: 96 },
  crouch:    { w: 52, h: 62 },  ball: { w: 50, h: 50 },
  tpose:     { w: 96, h: 96 },  lie:  { w: 100, h: 34 },
  sit:       { w: 56, h: 70 },  handstand: { w: 48, h: 96 },
  star:      { w: 96, h: 100 }, lean: { w: 60, h: 94 },
  climb:     { w: 46, h: 92 },  jump: { w: 52, h: 96 },
};

const AMMO_MAX = 6;
const AMMO_REGEN_MS = 4000;
const SHOT_COOLDOWN_MS = 450;

let nextId = 1;
const genId = () => 'p' + (nextId++).toString(36) + Math.random().toString(36).slice(2, 6);
const genCode = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join(''); }
  while (rooms.has(c));
  return c;
};

class Room {
  constructor(code) {
    this.code = code;
    this.players = new Map();   // id -> player
    this.hostId = null;
    this.settings = { ...DEFAULT_SETTINGS };
    this.phase = 'lobby';       // lobby | prep | seek | results
    this.phaseEndsAt = 0;
    this.timer = null;
    this.roundStats = null;
  }

  broadcast(msg, exceptId = null) {
    const data = JSON.stringify(msg);
    for (const p of this.players.values()) {
      if (p.id !== exceptId && p.ws.readyState === 1) p.ws.send(data);
    }
  }

  publicPlayers() {
    return [...this.players.values()].map(p => ({
      id: p.id, name: p.name, role: p.role, tagged: p.tagged, tags: p.tags,
    }));
  }

  roomState() {
    return {
      t: 'room', code: this.code, hostId: this.hostId,
      players: this.publicPlayers(), settings: this.settings, phase: this.phase,
    };
  }

  addPlayer(ws, name) {
    const p = {
      id: genId(), ws,
      name: String(name || 'Sticky').slice(0, 16),
      role: 'hider', tagged: false, tags: 0,
      x: 0, y: 0, pose: 'stand', face: 1,
      ammo: AMMO_MAX, lastShot: 0, lastRegen: 0,
      strokes: [], // replayable paint ops for late joiners in lobby
    };
    if (!this.hostId) this.hostId = p.id;
    this.players.set(p.id, p);
    return p;
  }

  removePlayer(id) {
    if (!this.players.delete(id)) return;
    if (this.hostId === id) this.hostId = this.players.keys().next().value || null;
    if (this.players.size === 0) {
      clearTimeout(this.timer);
      rooms.delete(this.code);
      return;
    }
    this.broadcast(this.roomState());
    if (this.phase === 'seek') this.checkSeekEnd();
  }

  // --- round flow ---------------------------------------------------------

  start() {
    if (this.phase !== 'lobby' && this.phase !== 'results') return;
    const ids = [...this.players.keys()];
    // 1 seeker per 4 players, at least 1 (solo runs hider-only for practice)
    const nSeekers = ids.length < 2 ? 0 : Math.max(1, Math.floor(ids.length / 4));
    const shuffled = ids.sort(() => Math.random() - 0.5);
    shuffled.forEach((id, i) => {
      const p = this.players.get(id);
      p.role = i < nSeekers ? 'seeker' : 'hider';
      p.tagged = false; p.tags = 0;
      p.ammo = AMMO_MAX; p.strokes = [];
    });
    this.roundStats = { taggedOrder: [] };
    this.setPhase('prep', this.settings.prepTime);
  }

  setPhase(phase, seconds) {
    this.phase = phase;
    this.phaseEndsAt = Date.now() + seconds * 1000;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.onPhaseTimeout(), seconds * 1000 + 50);
    this.broadcast({
      t: 'phase', phase, endsAt: this.phaseEndsAt,
      settings: this.settings,
      roles: Object.fromEntries([...this.players.values()].map(p => [p.id, p.role])),
    });
  }

  onPhaseTimeout() {
    if (this.phase === 'prep') {
      this.setPhase('seek', this.settings.seekTime);
    } else if (this.phase === 'seek') {
      this.endRound('hiders'); // time up, surviving hiders win
    }
  }

  endRound(winners) {
    clearTimeout(this.timer);
    this.phase = 'results';
    const stats = [...this.players.values()].map(p => ({
      id: p.id, name: p.name, role: p.role, tagged: p.tagged, tags: p.tags,
      converted: !!p.converted,
    }));
    this.broadcast({ t: 'results', winners, stats });
  }

  checkSeekEnd() {
    const hiders = [...this.players.values()].filter(p => p.role === 'hider' && !p.tagged);
    if (hiders.length === 0) this.endRound('seekers');
  }

  // --- seeker shots -------------------------------------------------------

  handleShoot(shooter, wx, wy) {
    if (this.phase !== 'seek' || shooter.role !== 'seeker') return;
    const now = Date.now();
    if (now - shooter.lastShot < SHOT_COOLDOWN_MS) return;
    // ammo regen
    const regen = Math.floor((now - shooter.lastRegen) / AMMO_REGEN_MS);
    if (regen > 0) {
      shooter.ammo = Math.min(AMMO_MAX, shooter.ammo + regen);
      shooter.lastRegen += regen * AMMO_REGEN_MS;
    }
    if (shooter.ammo <= 0) {
      shooter.ws.send(JSON.stringify({ t: 'noammo', ammo: 0, regenAt: shooter.lastRegen + AMMO_REGEN_MS }));
      return;
    }
    shooter.ammo--; shooter.lastShot = now;
    if (shooter.ammo === AMMO_MAX - 1) shooter.lastRegen = now;

    // hit check against untagged hiders (pose-aware box, feet-anchored)
    let hit = null;
    for (const p of this.players.values()) {
      if (p.role !== 'hider' || p.tagged || p.id === shooter.id) continue;
      const box = POSE_BOX[p.pose] || POSE_BOX.stand;
      const pad = 6;
      if (wx >= p.x - box.w / 2 - pad && wx <= p.x + box.w / 2 + pad &&
          wy >= p.y - box.h - pad && wy <= p.y + pad) { hit = p; break; }
    }

    this.broadcast({ t: 'shot', id: shooter.id, x: wx, y: wy, hit: hit ? hit.id : null, ammo: shooter.ammo });

    if (hit) {
      hit.tagged = true;
      shooter.tags++;
      this.roundStats.taggedOrder.push(hit.id);
      if (this.settings.mode === 'infection') {
        hit.role = 'seeker'; hit.tagged = false; hit.converted = true;
        hit.ammo = AMMO_MAX; hit.lastRegen = Date.now();
        this.broadcast({ t: 'converted', id: hit.id, by: shooter.id });
      } else {
        this.broadcast({ t: 'tagged', id: hit.id, by: shooter.id });
      }
      this.broadcast(this.roomState());
      this.checkSeekEnd();
    }
  }
}

// ---------------------------------------------------------------------------

wss.on('connection', (ws) => {
  let room = null, me = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  const send = (msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    switch (m.t) {
      case 'create': {
        if (room) return;
        room = new Room(genCode());
        rooms.set(room.code, room);
        me = room.addPlayer(ws, m.name);
        send({ ...room.roomState(), t: 'joined', id: me.id });
        break;
      }
      case 'join': {
        if (room) return;
        const r = rooms.get(String(m.code || '').toUpperCase().trim());
        if (!r) return send({ t: 'error', msg: 'Room not found. Check the code.' });
        if (r.players.size >= 12) return send({ t: 'error', msg: 'Room is full (12 max).' });
        if (r.phase !== 'lobby' && r.phase !== 'results') {
          return send({ t: 'error', msg: 'Round in progress — try again in a minute.' });
        }
        room = r;
        me = room.addPlayer(ws, m.name);
        send({ ...room.roomState(), t: 'joined', id: me.id });
        room.broadcast(room.roomState(), me.id);
        break;
      }
      case 'settings': {
        if (!room || me.id !== room.hostId) return;
        const s = room.settings;
        if (['classic', 'infection'].includes(m.mode)) s.mode = m.mode;
        if (typeof m.map === 'string') s.map = m.map.slice(0, 24);
        s.prepTime = Math.min(180, Math.max(20, m.prepTime | 0 || s.prepTime));
        s.seekTime = Math.min(300, Math.max(30, m.seekTime | 0 || s.seekTime));
        room.broadcast(room.roomState());
        break;
      }
      case 'start': {
        if (room && me.id === room.hostId) room.start();
        break;
      }
      case 'pos': {
        if (!room) return;
        me.x = +m.x || 0; me.y = +m.y || 0;
        me.pose = typeof m.pose === 'string' ? m.pose : 'stand';
        room.broadcast({ t: 'pos', id: me.id, x: me.x, y: me.y, vx: +m.vx || 0, vy: +m.vy || 0,
                         pose: me.pose, face: m.face === -1 ? -1 : 1, anim: String(m.anim || '').slice(0, 12) }, me.id);
        break;
      }
      case 'stroke': case 'fill': case 'undo': case 'clearPaint': {
        if (!room || me.tagged) return;
        const op = { t: m.t, id: me.id };
        if (m.t === 'stroke') {
          if (!Array.isArray(m.pts) || m.pts.length > 200) return;
          op.pts = m.pts.slice(0, 200).map(p => [Math.round(+p[0]), Math.round(+p[1])]);
          op.color = String(m.color || '#fff').slice(0, 24);
          op.size = Math.min(40, Math.max(1, +m.size || 8));
        }
        if (m.t === 'fill') op.color = String(m.color || '#fff').slice(0, 24);
        me.strokes.push(op);
        if (me.strokes.length > 3000) me.strokes.shift();
        room.broadcast(op, me.id);
        break;
      }
      case 'shoot': {
        if (room) room.handleShoot(me, +m.x || 0, +m.y || 0);
        break;
      }
      case 'chat': {
        if (!room) return;
        const msg = String(m.msg || '').slice(0, 140).trim();
        if (msg) room.broadcast({ t: 'chat', id: me.id, name: me.name, msg });
        break;
      }
      case 'again': {
        if (room && me.id === room.hostId && room.phase === 'results') {
          room.phase = 'lobby';
          for (const p of room.players.values()) { p.tagged = false; p.role = 'hider'; }
          room.broadcast(room.roomState());
        }
        break;
      }
    }
  });

  ws.on('close', () => { if (room && me) room.removePlayer(me.id); });
  ws.on('error', () => {});
});

// heartbeat: drop dead connections
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 15000);

server.listen(PORT, () => console.log(`STICKMOUFLAGE listening on http://localhost:${PORT}`));
