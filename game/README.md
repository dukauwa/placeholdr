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

| Input | Action |
|-------|--------|
| **WASD** | move (click the screen first to capture the mouse) |
| **Mouse** | look · **Esc** releases the cursor |
| **Shift** | run |
| **Space** | jump · double-jump in air · leap off a wall |
| **push into a wall** | cling to climbable surfaces, then **W/S** to climb |
| **R** or **1–7** | poses: stand, crouch, ball, T-pose, lie, sit, star |
| **F** | open the palette (frees the mouse for painting) |
| **Left-click** | paint your body (hider, palette open) / shoot (seeker) |
| **Alt+click** or **right-click** | eyedropper — sample any surface color |
| **Mouse wheel** | brush size (palette open) / camera zoom |
| **G** / **Z** / **X** | fill whole body · undo stroke · clear paint |
| **Enter** | chat |

## Tips

- The eyedropper returns the **exact** color of a surface — fill with it, then
  paint the neighbouring surfaces' colors on the matching parts of your body.
- Your pose changes your hitbox and your silhouette. A "ball" against a crate
  or "lie" on a striped floor is much harder to read than a standing figure.
- Body curvature still catches light differently than flat walls. Great hiders
  paint a slightly darker tone on their shaded side — just like the pros.
- Seekers: misses splat paint on the map, revealing where you've already
  checked. Ammo comes back 1 per 4 seconds, max 6.

## Tech

- **Server**: Node 18+, single dependency (`ws`). Authoritative for rooms,
  roles, phase timers, shot rays vs pose-aware hit capsules, ammo, and modes.
- **Client**: Three.js (vendored — fully self-hosted, no CDN), plain ES
  modules, no build step. Painting works by raycasting your click onto your
  body mesh and drawing into a shared 256×256 canvas-texture atlas; paint ops
  are replayed on every client so all players see identical camouflage.
- See [DESIGN.md](DESIGN.md) for the full architecture and mechanics research.
