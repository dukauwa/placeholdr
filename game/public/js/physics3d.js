// 3D movement: capsule-as-AABB vs world AABBs, axis-by-axis resolution.
// Run, jump, double-jump, crouch — and Meccha-style wall climbing: touching a
// climbable wall in the air grabs it; you hang there indefinitely (paint away),
// W climbs higher, S/Ctrl slides down, Space leaps off, and climbing past the
// top mantles you onto the ledge.

const GRAV = 24;
const WALK = 4.6;
const RUN = 8.2;
const CROUCH_SPEED = 2.2;
const JUMP_V = 8.8;
const DJUMP_V = 7.4;
const CLIMB_V = 3.2;
const SLIDE_V = 1.6;
const R = 0.26;                 // body radius
const CLING_COOLDOWN = 0.35;    // seconds after leaping off before re-grabbing

const POSE_H = {
  stand: 1.35, walk: 1.35, run: 1.35, jump: 1.35, climb: 1.35,
  crouch: 0.9, ball: 0.62, tpose: 1.35, lie: 0.4, sit: 0.95, star: 1.4,
};

export function stepPhysics3D(p, move, solids, bounds, dt) {
  const h = POSE_H[p.pose] || 1.8;
  p.clingCd = Math.max(0, (p.clingCd || 0) - dt);

  const speed = move.crouch ? CROUCH_SPEED : move.run ? RUN : WALK;
  const dx = move.dirX * speed, dz = move.dirZ * speed;

  const wall = touchingWall(p, solids, h);

  // --- grab: touching a climbable wall while airborne (and not just leapt off)
  if (wall && !p.onGround && !p.clinging && p.clingCd <= 0) {
    p.clinging = true;
  }

  if (p.clinging) {
    if (wall) {
      p.wallNx = wall.nx; p.wallNz = wall.nz;
      p.vx = 0; p.vz = 0;
      // hang by default; W climbs, S/Ctrl slides down slowly
      p.vy = move.up ? CLIMB_V : (move.down || move.crouch) ? -SLIDE_V : 0;
      p.jumps = 0;
      if (move.jumpPressed) {                    // leap away from the wall
        p.clinging = false;
        p.clingCd = CLING_COOLDOWN;
        p.leapT = 0.4;                           // momentum window
        p.vy = JUMP_V * 0.85;
        p.vx = wall.nx * RUN * 0.8;
        p.vz = wall.nz * RUN * 0.8;
        move.jumpPressed = false;
      } else if ((dx * wall.nx + dz * wall.nz) > 0.5) {
        // deliberately moving away from the wall lets go
        p.clinging = false;
        p.clingCd = CLING_COOLDOWN * 0.5;
      }
    } else if (move.up) {
      // climbed past the top edge → mantle onto the ledge
      p.clinging = false;
      p.vy = 6.5;
      p.vx = -(p.wallNx || 0) * 3;
      p.vz = -(p.wallNz || 0) * 3;
    } else {
      p.clinging = false;                        // wall ended (hang → gentle drop)
    }
  }

  if (!p.clinging) {
    if ((p.leapT || 0) > 0) {
      // wall-leap momentum: keep flying, blend in limited air control
      p.leapT -= dt;
      p.vx += dx * dt * 4;
      p.vz += dz * dt * 4;
    } else {
      p.vx = dx; p.vz = dz;
    }
    p.vy -= GRAV * dt;
    if (move.jumpPressed) {
      if (p.onGround) { p.vy = JUMP_V; p.jumps = 1; }
      else if (p.jumps < 2) { p.vy = DJUMP_V; p.jumps = 2; }
      move.jumpPressed = false;
    }
  }

  // --- integrate, axis by axis
  p.onGround = false;
  slide(p, solids, h, p.vx * dt, 0, 0);
  slide(p, solids, h, 0, p.vy * dt, 0);
  slide(p, solids, h, 0, 0, p.vz * dt);
  if (p.onGround) p.clinging = false;

  // world bounds + floor of last resort
  p.x = Math.max(-bounds.x, Math.min(bounds.x, p.x));
  p.z = Math.max(-bounds.z, Math.min(bounds.z, p.z));
  if (p.y < 0) { p.y = 0; p.vy = 0; p.onGround = true; p.jumps = 0; p.clinging = false; }
}

function overlap(p, h, s) {
  return p.x + R > s.min[0] && p.x - R < s.max[0] &&
         p.y + h > s.min[1] && p.y < s.max[1] &&
         p.z + R > s.min[2] && p.z - R < s.max[2];
}

function touchingWall(p, solids, h) {
  for (const s of solids) {
    if (!s.climb) continue;
    const yOk = p.y + h * 0.8 > s.min[1] && p.y + 0.3 < s.max[1];
    if (!yOk) continue;
    const zin = p.z + R > s.min[2] && p.z - R < s.max[2];
    const xin = p.x + R > s.min[0] && p.x - R < s.max[0];
    if (zin && Math.abs(p.x + R - s.min[0]) < 0.14 && p.x < s.min[0]) return { nx: -1, nz: 0 };
    if (zin && Math.abs(p.x - R - s.max[0]) < 0.14 && p.x > s.max[0]) return { nx: 1, nz: 0 };
    if (xin && Math.abs(p.z + R - s.min[2]) < 0.14 && p.z < s.min[2]) return { nx: 0, nz: -1 };
    if (xin && Math.abs(p.z - R - s.max[2]) < 0.14 && p.z > s.max[2]) return { nx: 0, nz: 1 };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Column-grid physics for imported GLB worlds. Same feel as the AABB path:
// run/jump/double-jump, grab-and-hang on ANY wall, climb, mantle, leap.
// ---------------------------------------------------------------------------

const GRID_STEP = 0.55;

export function stepPhysicsGrid(p, move, grid, bounds, dt) {
  const h = POSE_H[p.pose] || 1.8;
  p.clingCd = Math.max(0, (p.clingCd || 0) - dt);

  const speed = move.crouch ? CROUCH_SPEED : move.run ? RUN : WALK;
  const dx = move.dirX * speed, dz = move.dirZ * speed;

  // body-space blocked test at a target XZ (feet y): anything solid between
  // step height and head height?
  const blockedAt = (x, z, y) => grid.occupied(x, z, y + GRID_STEP, y + h * 0.92);

  if (p.clinging) {
    const wx = p.x - (p.wallNx || 0) * 0.5, wz = p.z - (p.wallNz || 0) * 0.5;
    const wallThere = blockedAt(wx, wz, p.y - 0.3);
    p.vx = 0; p.vz = 0;
    if (move.jumpPressed) {                       // leap away
      p.clinging = false;
      p.clingCd = CLING_COOLDOWN;
      p.leapT = 0.4;
      p.vy = JUMP_V * 0.85;
      p.vx = (p.wallNx || 0) * RUN * 0.8;
      p.vz = (p.wallNz || 0) * RUN * 0.8;
      move.jumpPressed = false;
    } else if ((dx * (p.wallNx || 0) + dz * (p.wallNz || 0)) > 0.5) {
      p.clinging = false;                         // deliberately moving away
      p.clingCd = CLING_COOLDOWN * 0.5;
    } else if (wallThere) {
      p.vy = move.up ? CLIMB_V : (move.down || move.crouch) ? -SLIDE_V : 0;
      p.jumps = 0;
    } else if (move.up) {                         // past the top → mantle
      p.clinging = false;
      p.vy = 6.5;
      p.vx = -(p.wallNx || 0) * 3;
      p.vz = -(p.wallNz || 0) * 3;
    } else {
      p.clinging = false;
    }
  }

  if (!p.clinging) {
    if ((p.leapT || 0) > 0) {
      p.leapT -= dt;
      p.vx += dx * dt * 4;
      p.vz += dz * dt * 4;
    } else {
      p.vx = dx; p.vz = dz;
    }
    p.vy -= GRAV * dt;
    if (move.jumpPressed) {
      if (p.onGround) { p.vy = JUMP_V; p.jumps = 1; }
      else if (p.jumps < 2) { p.vy = DJUMP_V; p.jumps = 2; }
      move.jumpPressed = false;
    }
  }

  // --- horizontal, axis by axis; a blocked axis while airborne = wall grab.
  // If our OWN column is blocked we're wedged inside geometry — always allow
  // moving so the player can escape.
  const wedged = blockedAt(p.x, p.z, p.y);
  let hitWallX = false, hitWallZ = false;
  const nxp = p.x + p.vx * dt;
  if (wedged || !blockedAt(nxp, p.z, p.y)) p.x = nxp;
  else hitWallX = Math.abs(p.vx) > 0.05;
  const nzp = p.z + p.vz * dt;
  if (wedged || !blockedAt(p.x, nzp, p.y)) p.z = nzp;
  else hitWallZ = Math.abs(p.vz) > 0.05;

  if ((hitWallX || hitWallZ) && !p.onGround && !p.clinging && p.clingCd <= 0) {
    const l = Math.hypot(p.vx, p.vz) || 1;
    p.wallNx = -(hitWallX ? p.vx : 0) / l;
    p.wallNz = -(hitWallZ ? p.vz : 0) / l;
    const nl = Math.hypot(p.wallNx, p.wallNz) || 1;
    p.wallNx /= nl; p.wallNz /= nl;
    p.clinging = true;
    p.vy = Math.max(p.vy, 0);
  }

  // --- vertical: land on tops, bonk on undersides
  const oldY = p.y;
  p.y += p.vy * dt;
  const wasGrounded = p.onGround;
  p.onGround = false;
  if (p.vy <= 0) {
    const floor = grid.floorBelow(p.x, p.z, oldY + 0.06);
    if (floor > -Infinity && p.y <= floor) {
      p.y = floor; p.vy = 0; p.onGround = true; p.jumps = 0; p.clinging = false;
    }
  } else {
    const ceil = grid.ceilAbove(p.x, p.z, oldY + h - 0.05);
    if (ceil < Infinity && p.y + h > ceil) { p.y = ceil - h; p.vy = 0; }
  }

  // stairs/slopes: snap to nearby floor while walking
  if (wasGrounded && !p.onGround && p.vy <= 0) {
    const f = grid.floorBelow(p.x, p.z, p.y + GRID_STEP);
    if (f > -Infinity && Math.abs(f - p.y) <= GRID_STEP + 0.05) {
      p.y = f; p.vy = 0; p.onGround = true; p.jumps = 0;
    }
  }

  p.x = Math.max(-bounds.x, Math.min(bounds.x, p.x));
  p.z = Math.max(-bounds.z, Math.min(bounds.z, p.z));
  if (p.y < 0) { p.y = 0; p.vy = 0; p.onGround = true; p.jumps = 0; p.clinging = false; }
}

function slide(p, solids, h, mx, my, mz) {
  p.x += mx; p.y += my; p.z += mz;
  for (const s of solids) {
    if (!overlap(p, h, s)) continue;
    if (my < 0) {          // landing
      p.y = s.max[1]; p.vy = 0; p.onGround = true; p.jumps = 0;
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
