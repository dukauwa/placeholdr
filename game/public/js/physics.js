// Platformer physics: run, jump, double-jump, wall cling/climb, ceiling stick.
// Player position (x, y) is the FEET point (bottom center).
import { POSE_ANCHOR } from './stickfigure.js';

const GRAV = 2300;
const WALK = 270;
const RUN = 440;
const JUMP_V = 780;
const DJUMP_V = 660;
const CLIMB_V = 190;
const CEIL_V = 160;
const WALL_SLIDE = 90;

export function stepPhysics(p, input, solids, map, dt, canMove) {
  const box = POSE_ANCHOR[p.pose] || POSE_ANCHOR.stand;
  const hw = Math.min(box.w, 52) / 2;   // physics body stays narrow even in wide poses
  const bh = box.h;

  const left = canMove && input.left, right = canMove && input.right;
  const up = canMove && input.up, down = canMove && input.down;
  const run = input.run;

  // --- horizontal intent
  let ax = 0;
  if (left) ax = -1;
  if (right) ax = 1;
  if (ax) p.face = ax;

  // --- wall cling detection: touching a climbable wall and pushing toward it
  const touchL = touchWall(p, solids, hw, bh, -1);
  const touchR = touchWall(p, solids, hw, bh, 1);
  const wantCling = (touchL && left) || (touchR && right);

  if (p.clinging && !wantCling && !(touchL || touchR)) p.clinging = false;

  if (wantCling && !p.onGround) {
    p.clinging = true;
    p.ceiling = false;
  }

  if (p.clinging) {
    p.vx = 0;
    p.vy = up ? -CLIMB_V : down ? CLIMB_V : WALL_SLIDE * 0.15;
    p.jumps = 0;
    if (canMove && input.jumpPressed) {           // wall jump: leap away
      p.clinging = false;
      p.vy = -JUMP_V * 0.9;
      p.vx = (touchL ? 1 : -1) * RUN * 0.9;
      p.face = touchL ? 1 : -1;
      input.jumpPressed = false;
    }
    if (!wantCling && !up && !down) p.clinging = false;
  } else if (p.ceiling) {
    // stuck to ceiling: crawl with A/D, drop with S or releasing W
    p.vy = 0;
    p.vx = ax * CEIL_V;
    if (!up || down) { p.ceiling = false; p.vy = 40; }
  } else {
    const speed = run ? RUN : WALK;
    p.vx = ax * speed;
    p.vy += GRAV * dt;
    if (canMove && input.jumpPressed) {
      if (p.onGround) { p.vy = -JUMP_V; p.jumps = 1; }
      else if (p.jumps < 2) { p.vy = -DJUMP_V; p.jumps = 2; }
      input.jumpPressed = false;
    }
    // slow wall slide when touching a wall while falling
    if ((touchL || touchR) && p.vy > WALL_SLIDE && (left || right)) p.vy = WALL_SLIDE;
  }

  // --- integrate & resolve, axis by axis
  p.onGround = false;
  p._bonked = false;
  moveAxis(p, solids, hw, bh, p.vx * dt, 0, map);
  moveAxis(p, solids, hw, bh, 0, p.vy * dt, map);
  if (p._bonked && up && !p.onGround) p.ceiling = true;   // grab the ceiling

  // map bounds
  p.x = Math.max(hw, Math.min(map.w - hw, p.x));
  if (p.y > map.h) { p.y = map.h; p.vy = 0; p.onGround = true; p.jumps = 0; }
  if (p.y - bh < 0 && p.vy < 0) { p.y = bh; p.vy = 0; }
}

function rectOf(p, hw, bh) { return { x: p.x - hw, y: p.y - bh, w: hw * 2, h: bh }; }

function overlaps(a, s) {
  return a.x < s.x + s.w && a.x + a.w > s.x && a.y < s.y + s.h && a.y + a.h > s.y;
}

function touchWall(p, solids, hw, bh, dir) {
  const probe = { x: p.x - hw + dir * 3, y: p.y - bh + 6, w: hw * 2, h: bh - 12 };
  for (const s of solids) if (s.climb && overlaps(probe, s)) return true;
  return false;
}

function moveAxis(p, solids, hw, bh, dx, dy, map) {
  p.x += dx; p.y += dy;
  const r = rectOf(p, hw, bh);
  for (const s of solids) {
    if (!overlaps(r, s)) continue;
    if (dy > 0) {           // falling: land on top
      p.y = s.y; p.vy = 0; p.onGround = true; p.jumps = 0; p.clinging = false;
    } else if (dy < 0) {    // rising: bonk head (ceiling grab decided by caller)
      p.y = s.y + s.h + bh;
      if (p.vy < 0) p.vy = 0;
      p._bonked = true;
    } else if (dx > 0) {
      p.x = s.x - hw;
    } else if (dx < 0) {
      p.x = s.x + s.w + hw;
    }
    r.x = p.x - hw; r.y = p.y - bh;
  }
  // keep glued while ceiling-crawling: check there is still a ceiling above
  if (p.ceiling && dy === 0 && dx !== 0) {
    const probe = { x: p.x - hw, y: p.y - bh - 4, w: hw * 2, h: 6 };
    let found = false;
    for (const s of solids) if (overlaps(probe, s)) { found = true; p.y = s.y + s.h + bh; break; }
    if (!found) p.ceiling = false;
  }
  void map;
}
