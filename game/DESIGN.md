# STICKMOUFLAGE — Design Document

A web-based multiplayer hide-and-seek game where you play a **plain white stick figure**
that paints itself to blend into the stage. Inspired by the mechanics of the viral
Steam hit *MECCHA CHAMELEON* (June 2026, by solo dev Remorion_1224) — reimplemented
from scratch with original code, art, name, and maps.

## Research summary (what the original does)

- Players split into **Seekers** and **Hiders**. Hiders have pure-white bodies and
  paint themselves with colors sampled from the stage to become invisible in plain sight.
- "The hiding spot, the pose, and above all, your artistic skills are the key."
- **Painting**: a palette (F key), freehand brush, and a "spoid" (eyedropper) to sample
  stage colors. Skilled players sample two tones (lit + shadow) to match shading.
- **Poses** (R key): break your silhouette so your body reads as part of the scene.
- **Movement**: walk/run, jump, double-jump, cling to and climb walls and ceilings.
- **Round flow**: a prep phase where hiders paint and hide, then a timed seek phase
  where seekers hunt (first person, no flashlight) and shoot paint to tag hiders.
- **Modes**: Normal (caught = eliminated), Infection (caught hiders join the seekers),
  Versus (everyone hides, then everyone seeks; most tags wins).
- 2–10 players per lobby, host picks map/mode; 18 maps + map editor; cosmetics.

## What we build (2D web version)

A side-view 2.5D-feel platformer presentation instead of first person — it suits
stick figures, works great on canvas, and keeps the core loop identical:
paint yourself → pose → blend into a colorful stage → survive the seekers.

### Roles & round flow

```
LOBBY → PREP (hiders paint & hide, seekers see a blindfold countdown)
      → SEEK (seekers hunt and shoot paintballs; hiders hold still... or run)
      → RESULTS (scoreboard) → back to LOBBY
```

- **Prep phase** (default 75s, host-adjustable): hiders move, pose, and paint.
  Seekers see a blindfold screen with the map name and a countdown.
- **Seek phase** (default 120s, host-adjustable): seekers spawn at the start and
  shoot paintballs. Hitting a hider tags them. Every shot costs ammo; ammo refills
  slowly, so spray-and-pray is punished. Hiders may still move and repaint — risky.
- **Win conditions**: Seekers win if all hiders are tagged before the timer ends;
  surviving hiders win otherwise.

### Modes

- **Classic** — tagged hiders become ghost spectators.
- **Infection** — tagged hiders respawn as seekers with their own paint gun.

### Controls (desktop)

| Key | Action |
|-----|--------|
| A / D or ◀ ▶ | walk (hold Shift to run) |
| W / Space | jump; press again in air = double jump |
| S | crouch / climb down |
| W/S at a wall | cling & climb (hold toward the wall) |
| R / 1–8 | cycle / select pose |
| F | toggle paint palette |
| Left click | paint on your body (hiders) / shoot paintball (seekers) |
| Alt or right-click | eyedropper — sample the stage color under the cursor |
| E | eyedropper toggle |
| [ / ] or wheel | brush size |
| G | fill whole body with current color |
| Z | undo last stroke |
| X | clear all paint (back to white) |
| Enter | chat |
| Tab | scoreboard |

### Painting system

- Each player's body is a **body canvas** (offscreen, 120×200). Strokes are recorded
  in body-space, applied with `source-atop` over the white stick-figure silhouette,
  so paint never bleeds outside the body.
- Tools: brush (3 sizes via wheel), eyedropper (samples the composited stage pixel
  under the cursor), fill, undo (stroke stack), clear.
- Strokes are batched (~30ms) and broadcast so everyone renders identical camo.

### Stick figures & poses

Stick figures are drawn as round-capped thick strokes (head circle + limbs) into the
body canvas silhouette. Poses: **stand, walk, crouch, ball, T-pose, lie down, sit,
handstand, star, lean**. Movement states (walk cycle, jump, climb) animate limbs;
static poses freeze the silhouette for blending.

### Maps

Data-driven: rects/ellipses/gradients with `climbable` flags. Ship four:
1. **Rooftop Sunset** — warm gradients, chimneys, billboards.
2. **Jungle Gym** — playground colors, bars and slides (lots of climbing).
3. **Gallery** — big abstract art blocks (brutal for seekers).
4. **Candy Works** — stripes and pastel machinery.

### Architecture

```
game/
  package.json          # dep: ws
  server/index.js       # http static + WebSocket rooms, phases, tag authority
  public/
    index.html  style.css
    js/ main.js net.js state.js input.js physics.js maps.js
       stickfigure.js paint.js render.js ui.js seeker.js audio.js
```

- **Server** is the authority for: room membership, roles, phase timers, tag hits
  (validated against last-known positions), scores, mode rules. Movement and paint
  are client-simulated and relayed (20Hz position snapshots, batched strokes).
- **Client** renders at 60fps with interpolation for remote players.
- No build step; plain ES modules. Node 18+, single npm dep (`ws`).

### Out of scope (future)

Map editor, cosmetics/unlocks, mobile touch controls, voice chat, matchmaking.
