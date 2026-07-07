// Shared client state.
export const S = {
  screen: 'menu',          // menu | lobby | game | results
  myId: null,
  roomCode: null,
  hostId: null,
  settings: null,
  phase: 'lobby',          // lobby | prep | seek | results
  phaseEndsAt: 0,
  mode: 'classic',
  mapId: 'rooftop',

  // players: id -> {id,name,role,tagged,tags, x,y,vx,vy,pose,face,anim,
  //                 paint:{canvas,ctx,ops[]}, netX,netY (interp targets)}
  players: new Map(),

  me() { return this.players.get(this.myId); },

  camera: { x: 0, y: 0, zoom: 1 },
  ammo: 6,
  splats: [],              // {x,y,color,r,seed} persistent paint splats on the map
  toasts: [],
  paletteOpen: false,
  tool: 'brush',
  brushColor: '#e0533d',
  brushSize: 10,
  recentColors: [],
};

export const BODY_W = 140;   // body-canvas size (body space)
export const BODY_H = 220;

export const POSES = ['stand', 'crouch', 'ball', 'tpose', 'lie', 'sit', 'handstand', 'star'];

export function newPlayer(p) {
  const canvas = document.createElement('canvas');
  canvas.width = BODY_W; canvas.height = BODY_H;
  return {
    id: p.id, name: p.name, role: p.role || 'hider', tagged: !!p.tagged, tags: p.tags | 0,
    x: p.x || 0, y: p.y || 0, vx: 0, vy: 0,
    pose: 'stand', face: 1, anim: 'idle',
    netX: p.x || 0, netY: p.y || 0,
    onGround: false, jumps: 0, clinging: false, ceiling: false,
    walkT: 0,
    paint: { canvas, ctx: canvas.getContext('2d'), ops: [] },
  };
}
