// 3D movement: capsule-as-AABB vs world AABBs, axis-by-axis resolution.
// Supports run, jump, double-jump, and cling/climb on climbable walls.
// Player position is the FEET point; move.dir is the desired XZ direction.

const GRAV = 24;
const WALK = 4.6;
const RUN = 8.2;
const JUMP_V = 8.8;
const DJUMP_V = 7.4;
const CLIMB_V = 3.2;
const R = 0.35;                 // body radius

const POSE_H = {
  stand: 1.8, walk: 1.8, run: 1.8, jump: 1.8, climb: 1.8,
  crouch: 1.15, ball: 0.85, tpose: 1.8, lie: 0.5, sit: 1.25, star: 1.9,
};

export function stepPhysics3D(p, move, solids, bounds, dt) {
  const h = POSE_H[p.pose] || 1.8;

  // --- desired horizontal velocity
  const speed = move.run ? RUN : WALK;
  let dx = move.dirX * speed, dz = move.dirZ * speed;

  // --- wall cling: touching a climbable wall while pushing into it
  const wall = touchingWall(p, solids, h);
  const pushing = wall && (dx * wall.nx + dz * wall.nz) < -0.3;

  if (p.clinging) {
    if (!wall) p.clinging = false;
  }
  if (pushing && !p.onGround) p.clinging = true;

  if (p.clinging && wall) {
    p.vx = 0; p.vz = 0;
    p.vy = move.up ? CLIMB_V : move.down ? -CLIMB_V : 0;
    p.jumps = 0;
    if (move.jumpPressed) {                 // leap off the wall
      p.clinging = false;
      p.vy = JUMP_V * 0.85;
      p.vx = wall.nx * RUN * 0.8;
      p.vz = wall.nz * RUN * 0.8;
      move.jumpPressed = false;
    } else if (!pushing && !move.up && !move.down) {
      p.clinging = false;
    }
  } else {
    p.clinging = false;
    p.vx = dx; p.vz = dz;
    p.vy -= GRAV * dt;
    if (move.jumpPressed) {
      if (p.onGround) { p.vy = JUMP_V; p.jumps = 1; }
      else if (p.jumps < 2) { p.vy = DJUMP_V; p.jumps = 2; }
      move.jumpPressed = false;
    }
    // slide slowly while pressed against a wall and falling
    if (wall && pushing && p.vy < -1.2) p.vy = -1.2;
  }

  // --- integrate, axis by axis
  p.onGround = false;
  slide(p, solids, h, p.vx * dt, 0, 0);
  slide(p, solids, h, 0, p.vy * dt, 0);
  slide(p, solids, h, 0, 0, p.vz * dt);

  // world bounds + floor of last resort
  p.x = Math.max(-bounds.x, Math.min(bounds.x, p.x));
  p.z = Math.max(-bounds.z, Math.min(bounds.z, p.z));
  if (p.y < 0) { p.y = 0; p.vy = 0; p.onGround = true; p.jumps = 0; }
}

function overlap(p, h, s) {
  return p.x + R > s.min[0] && p.x - R < s.max[0] &&
         p.y + h > s.min[1] && p.y < s.max[1] &&
         p.z + R > s.min[2] && p.z - R < s.max[2];
}

function touchingWall(p, solids, h) {
  // probe slightly beyond the radius on both XZ axes
  for (const s of solids) {
    if (!s.climb) continue;
    const yOk = p.y + h * 0.8 > s.min[1] && p.y + 0.3 < s.max[1];
    if (!yOk) continue;
    const zin = p.z + R > s.min[2] && p.z - R < s.max[2];
    const xin = p.x + R > s.min[0] && p.x - R < s.max[0];
    if (zin && Math.abs(p.x + R - s.min[0]) < 0.12 && p.x < s.min[0]) return { nx: -1, nz: 0 };
    if (zin && Math.abs(p.x - R - s.max[0]) < 0.12 && p.x > s.max[0]) return { nx: 1, nz: 0 };
    if (xin && Math.abs(p.z + R - s.min[2]) < 0.12 && p.z < s.min[2]) return { nx: 0, nz: -1 };
    if (xin && Math.abs(p.z - R - s.max[2]) < 0.12 && p.z > s.max[2]) return { nx: 0, nz: 1 };
  }
  return null;
}

function slide(p, solids, h, mx, my, mz) {
  p.x += mx; p.y += my; p.z += mz;
  for (const s of solids) {
    if (!overlap(p, h, s)) continue;
    if (my < 0) {          // landing
      p.y = s.max[1]; p.vy = 0; p.onGround = true; p.jumps = 0; p.clinging = false;
    } else if (my > 0) {   // head bonk
      p.y = s.min[1] - h; p.vy = 0;
    } else if (mx > 0) {
      p.x = s.min[0] - R;
    } else if (mx < 0) {
      p.x = s.max[0] + R;
    } else if (mz > 0) {
      p.z = s.min[2] - R;
    } else if (mz < 0) {
      p.z = s.max[2] + R;
    }
  }
}

export { POSE_H, R };
