# STICKMOUFLAGE — Design Document

A web-based **3D multiplayer** hide-and-seek game where you play a plain white
stick figure that paints itself to blend into the stage. Inspired by the
mechanics of the viral Steam hit *MECCHA CHAMELEON* (June 2026, solo dev
Remorion_1224) — reimplemented from scratch with original code, art, name, and maps.

## Research summary (what the original does)

- Players split into **Seekers** and **Hiders**. Hiders have pure-white bodies and
  paint themselves with colors sampled from the stage to become invisible in plain sight.
- "The hiding spot, the pose, and above all, your artistic skills are the key."
- **Painting**: a palette (F key), freehand brush, and a "spoid" (eyedropper) to sample
  stage colors. Skilled players sample two tones (lit + shadow) to match shading.
- **Poses** (R key): break your silhouette so your body reads as part of the scene.
- **Movement**: walk/run, jump, double-jump, cling to and climb walls.
- **Round flow**: a prep phase where hiders paint and hide, then a timed seek phase
  where seekers hunt in first person (no flashlight) and shoot paint to tag hiders.
- **Modes**: Normal (caught = eliminated), Infection (caught hiders join the seekers),
  Versus (everyone hides, then everyone seeks; most tags wins).
- 2–10 players per lobby, host picks map/mode; 18 maps + map editor; cosmetics.

## What we build

A browser 3D game (Three.js, vendored — no CDN): third-person hiders paint their
own 3D body by clicking on it; seekers hunt in first person and shoot paintballs.

### Roles & round flow

```
LOBBY → PREP (hiders paint & hide, seekers see a blindfold countdown)
      → SEEK (seekers hunt in first person and shoot paintballs)
      → RESULTS (scoreboard) → back to LOBBY
```

- **Prep** (default 75s, host-adjustable 20–180): hiders move, pose, and paint.
  Seekers see a blindfold screen with a countdown.
- **Seek** (default 120s, host-adjustable 30–300): seekers shoot paintballs
  (server-validated rays). Hits tag hiders. Ammo (6) regenerates 1 per 4s with a
  450ms shot cooldown — spraying is punished. Hiders may still move and repaint.
- **Win**: seekers win if every hider is tagged before the timer; otherwise hiders win.

### Modes

- **Classic** — tagged hiders become translucent flying ghosts (spectators).
- **Infection** — tagged hiders respawn as seekers.

### Controls (desktop)

| Input | Action |
|-------|--------|
| WASD / arrows | move (camera-relative) |
| Mouse (click to capture) | look around; Esc releases |
| Shift | run |
| Space | jump; again in air = double jump; on a wall = leap off |
| push into climbable wall | cling; W/S climbs up/down |
| R / 1–7 | cycle / select pose (stand, crouch, ball, T-pose, lie, sit, star) |
| F | toggle palette — frees the mouse for painting |
| Left click (palette open) | paint the clicked spot on your own body |
| Alt+click / right-click | eyedropper — sample any surface's color |
| Wheel | brush size (palette open) / camera zoom (closed) |
| G / Z / X | fill body · undo · clear paint |
| Left click (seeker, locked) | shoot paintball from the crosshair |
| Enter | chat |

### Painting system

- Each figure's body parts share a **256×256 canvas texture atlas**; every part
  (head, torso, upper/lower arms, thighs, shins) owns a cell with remapped UVs.
- Clicking the body raycasts to a mesh, reads the interpolated UV, and draws into
  the atlas — so strokes land exactly where you clicked and wrap around limbs.
- Tools: brush (wheel sizes), eyedropper (returns the exact flat color of any map
  surface — matching a surface makes you nearly invisible on it), fill, undo
  (op stack), clear.
- Ops (`stroke`/`fill`/`undo`/`clearPaint`) are broadcast and replayed
  deterministically on every client, so all players see identical camouflage.

### Stick figures & poses

Figures are rigged from cylinders + a sphere head with joint groups (shoulders,
elbows, hips, knees). Static poses set joint rotations; walk/run/climb are
procedurally animated. Movement overrides the chosen pose; standing still
snaps back to it (that's your hiding silhouette). Pose changes also change the
server-side hit capsule (a lying figure is short and wide, etc.).

### Maps

Data-driven: axis-aligned boxes and cylinders with flat colors, `climb` flags,
and per-map sky/fog/sun. Four ship with the game:
1. **Rooftop Sunset** — stairwell hut, AC units, billboard, water tower.
2. **Jungle Gym** — climbing frame, slide tower, swings, tree.
3. **Candy Works** — gumball machine, candy canes, chocolate stack, lollipops.
4. **The Gallery** — colored "paintings", pedestals, divider walls.

Flat colors are a design choice: the eyedropper returns the exact surface color,
so a well-painted, well-posed hider truly disappears — shading from body
curvature is the tell, exactly like the original's lit/shadow two-tone skill.

### Architecture

```
game/
  package.json          # deps: ws (server), three (vendored to public/lib)
  server/index.js       # http static + WebSocket rooms, phases, ray-hit authority
  public/
    index.html  style.css
    lib/three.module.js three.core.js (MIT, vendored)
    js/ main.js net.js state.js input.js ui.js audio.js
        maps3d.js figure.js physics3d.js render3d.js paint.js
```

- **Server** is authoritative for rooms, roles, phase timers, shot validation
  (ray vs pose-aware capsules over last-known positions), ammo/cooldown, scores,
  and mode rules. Movement and painting are client-simulated and relayed
  (~15Hz position snapshots, batched paint ops, capped and sanitized).
- **Client** renders at 60fps with interpolation for remote players; third-person
  orbit camera for hiders/ghosts, first-person for seekers; pointer lock for look,
  unlocked cursor for painting.
- No build step; plain ES modules. Node 18+, single runtime dep (`ws`).

### Testing

- `scratchpad` e2e: two headless Chromium clients play a full round (create/join,
  role split, move, sample, raycast-paint, sync check, blindfold, ray shot,
  tag, results, lobby loop) — plus a 4-player WebSocket protocol test covering
  infection conversion, host-only permissions, prep-shot rejection, and cooldowns.

### Out of scope (future)

Versus mode, map editor, cosmetics, mobile touch controls, voice chat,
server-side movement validation (anti-cheat), spectator paint-replay for late joiners.
