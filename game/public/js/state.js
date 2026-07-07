// Shared client state (3D).
export const S = {
  screen: 'menu',          // menu | lobby | game | results
  myId: null,
  roomCode: null,
  hostId: null,
  settings: null,
  phase: 'lobby',          // lobby | prep | seek | results
  phaseEndsAt: 0,
  mapId: 'rooftop',

  // players: id -> player (see newPlayer). fig/label are attached by render3d.
  players: new Map(),

  me() { return this.players.get(this.myId); },

  ammo: 6,
  paletteOpen: false,
  pointerLocked: false,
  tool: 'brush',
  brushColor: '#e0533d',
  brushSize: 10,
  recentColors: [],
};

export function newPlayer(p) {
  return {
    id: p.id, name: p.name, role: p.role || 'hider', tagged: !!p.tagged, tags: p.tags | 0,
    x: p.x || 0, y: p.y || 0, z: p.z || 0, ry: 0,
    vx: 0, vy: 0, vz: 0,
    pose: 'stand', anim: 'idle',
    netX: p.x || 0, netY: p.y || 0, netZ: p.z || 0, netRy: 0,
    onGround: false, jumps: 0, clinging: false,
    walkT: 0,
    paintOps: [],
    fig: null, label: null, labelCtx: null, labelTex: null,
  };
}
