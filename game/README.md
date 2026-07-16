# 🎨 STICKMOUFLAGE

**Paint yourself. Blend in. Don't get caught.**

A web-based 3D multiplayer hide-and-seek game. Hiders are pure-white stick
figures who paint their own bodies with colors sampled from the stage to
disappear into it; seekers hunt them down in first person with paintball guns.
An original clone of the *Meccha Chameleon*-style formula, built from scratch.

## Quick start

```bash
cd game
npm install
npm start          # → http://localhost:3000
```

Open the URL in a browser, create a room, and share the 4-letter code with
friends on your network (or port-forward / tunnel for remote friends).
2+ players recommended — solo start gives you a paint-practice sandbox.

## How a round works

1. **Lobby** — the host picks the map, mode (Classic / Infection), and the
   paint & seek timers.
2. **Prep phase** — hiders roam the 3D stage, sample surface colors with the
   eyedropper, paint their bodies, pick a pose, and settle into a hiding spot.
   Seekers wait blindfolded.
3. **Seek phase** — seekers hunt in first person. Click fires a paintball;
   hitting a hider tags them. Ammo is limited and regenerates slowly, so wild
   spraying loses the round. Tagged hiders become ghosts (Classic) or join the
   seekers (Infection).
4. **Results** — seekers win if every hider is found before the timer runs out.

## Controls

Press **H** (or the ⌨ Controls button) in-game for the full list with
platform-correct key names (⌥/⌃ on macOS, Alt/Ctrl elsewhere).

| Input | Action |
|-------|--------|
| **WASD** | move (click the screen first to capture the mouse) |
| **Mouse** | look · **Esc** releases the cursor |
| **Shift** | run · **Ctrl/C** crouch |
| **Space** | jump · double-jump in air · leap off a wall |
| **jump at a wall** | grab any climbable surface and hang there — paint away! |
| **W / S** (on wall) | climb up / slide down · climbing past the top mantles the ledge |
| **R** or **1–7** | poses: stand, crouch, ball, T-pose, lie, sit, star |
| **F** | open the palette (frees the mouse for painting) |
| **Click a surface** | eyedropper — grab the exact color under the cursor |
| **Click your body** | paint with the current color |
| **Space** (palette open) | quick-pick the color under the cursor |
| **⌥/Alt+click** or **right-click** | eyedropper, always |
| **Drag empty space** | orbit the camera around your body while painting |
| **Mouse wheel** | brush size (palette open) / camera zoom |
| **G** / **Z** / **X** | fill whole body · undo stroke · clear paint |
| **Enter** | chat · **H** controls screen |

## Tips

- The eyedropper returns the **exact texel** you click — on striped, checkered,
  brick, dotted, and mosaic surfaces each spot can differ, so sample where you
  will actually stand and repaint each body part to continue the pattern.
- You can hang from any climbable wall indefinitely: jump at it, climb with W,
  then open the palette and paint yourself into the wall art.
- Your pose changes your hitbox and your silhouette. A "ball" against a crate
  or "lie" on a striped floor is much harder to read than a standing figure.
- Body curvature still catches light differently than flat walls. Great hiders
  paint a slightly darker tone on their shaded side — just like the pros.
- Seekers: misses splat paint on the map, revealing where you've already
  checked. Ammo comes back 1 per 4 seconds, max 6.

## Imported 3D worlds (GLB maps)

The game can load whole environments from `.glb`/`.gltf` files — they get
auto-scaled to playable size, a collision grid is raycast from the geometry
(floors, walls, ceilings), every wall becomes climbable, spawn points are
found automatically, and the eyedropper samples the model's actual texture
pixels. A demo import ("Blockville") ships in `public/maps/`.

Three community maps are pre-registered and appear in the lobby as soon as
their file exists:

| File to add | Map | Credit (CC-BY) |
|---|---|---|
| `public/maps/medieval.glb` | Medieval Village | "Modular Lowpoly Medieval Environment" by Satendra Saraswat, via Sketchfab |
| `public/maps/temple.glb` | Sunrise Temple | "Sunrise Temple Environment" by Bl4ckGh0st, via Sketchfab |
| `public/maps/skatepark.glb` | Undercroft Skatepark | "Southbank Undercroft Skatepark" by artfletch, via Sketchfab |

To add them: log into Sketchfab (free), open the model page, click
**Download 3D Model → glTF/GLB (autoconverted)**, and either save the `.glb`
directly to the path above, or unzip a `.gltf` download into a folder
(`public/maps/medieval/scene.gltf` also works). Restart the server — done.
Credits show in the lobby; keep them there to satisfy the CC-BY license.
Note: Temple (~2.4M triangles) and Skatepark (~1.8M) are heavy and may lag
on older machines; the Medieval pack runs well everywhere.

To register a different model, add an entry to `GLB_MAPS` in
`public/js/maps3d.js` (name, credit, sky/sun colors) and drop the file in
`public/maps/<id>.glb`.

## Tech

- **Server**: Node 18+, single dependency (`ws`). Authoritative for rooms,
  roles, phase timers, shot rays vs pose-aware hit capsules, ammo, and modes.
- **Client**: Three.js (vendored — fully self-hosted, no CDN), plain ES
  modules, no build step. Painting works by raycasting your click onto your
  body mesh and drawing into a shared 256×256 canvas-texture atlas; paint ops
  are replayed on every client so all players see identical camouflage.
- **Imported worlds**: GLTFLoader + three-mesh-bvh (both vendored, MIT).
  Collision uses a column-interval grid built from BVH-accelerated raycasts
  over the imported meshes — floors, walls, ceilings, stairs all work, and
  any wall can be grabbed and climbed.
- See [DESIGN.md](DESIGN.md) for the full architecture and mechanics research.
