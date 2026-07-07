// Stick figure rendering: poses drawn as thick white strokes into a body canvas
// (body space 140x220, feet at bottom center). Paint is composited source-atop
// so camo never bleeds outside the silhouette.
import { BODY_W, BODY_H } from './state.js';

const LIMB = 11;      // limb thickness
const HEAD_R = 16;

function limbs(ctx, segs) {
  ctx.lineWidth = LIMB;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const seg of segs) {
    ctx.beginPath();
    ctx.moveTo(seg[0][0], seg[0][1]);
    for (const p of seg.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  }
}
function head(ctx, x, y, r = HEAD_R) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// Each pose draws a full figure. t = animation time (seconds).
export const POSE_DRAWERS = {
  stand(ctx) {
    head(ctx, 70, 70);
    limbs(ctx, [
      [[70, 86], [70, 140]],                       // spine
      [[70, 140], [61, 178], [59, 212]],           // left leg
      [[70, 140], [79, 178], [81, 212]],           // right leg
      [[70, 98], [55, 124], [50, 150]],            // left arm
      [[70, 98], [85, 124], [90, 150]],            // right arm
    ]);
  },
  walk(ctx, t) {
    const s = Math.sin(t * 9), c = Math.cos(t * 9);
    head(ctx, 70, 72);
    limbs(ctx, [
      [[70, 88], [70, 142]],
      [[70, 142], [70 - 14 * s, 178], [70 - 22 * s, 210 + Math.max(0, 4 * s)]],
      [[70, 142], [70 + 14 * s, 178], [70 + 22 * s, 210 - Math.min(0, 4 * s)]],
      [[70, 100], [70 + 12 * s, 124], [70 + 20 * s, 146]],
      [[70, 100], [70 - 12 * s, 124], [70 - 20 * s, 146]],
    ]);
    void c;
  },
  jump(ctx) {
    head(ctx, 70, 66);
    limbs(ctx, [
      [[70, 82], [70, 132]],
      [[70, 132], [56, 160], [58, 186]],
      [[70, 132], [84, 160], [82, 186]],
      [[70, 94], [48, 74], [34, 52]],
      [[70, 94], [92, 74], [106, 52]],
    ]);
  },
  crouch(ctx) {
    head(ctx, 70, 130);
    limbs(ctx, [
      [[70, 146], [72, 176]],
      [[72, 176], [48, 186], [46, 212]],
      [[72, 176], [96, 186], [98, 212]],
      [[70, 152], [50, 168], [44, 188]],
      [[70, 152], [90, 168], [96, 188]],
    ]);
  },
  ball(ctx) {
    // curled into a ball: head tucked, limbs wrapped
    head(ctx, 62, 176);
    ctx.lineWidth = LIMB; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(72, 188, 24, -2.4, 1.8); ctx.stroke();   // curled spine
    limbs(ctx, [
      [[86, 172], [94, 192], [80, 208]],   // legs tucked
      [[82, 168], [92, 184], [78, 200]],
      [[60, 192], [74, 202], [86, 198]],   // arms hugging
    ]);
  },
  tpose(ctx) {
    head(ctx, 70, 70);
    limbs(ctx, [
      [[70, 86], [70, 140]],
      [[70, 140], [60, 178], [58, 212]],
      [[70, 140], [80, 178], [82, 212]],
      [[70, 100], [22, 100]],
      [[70, 100], [118, 100]],
    ]);
  },
  lie(ctx) {
    head(ctx, 26, 198);
    limbs(ctx, [
      [[42, 200], [92, 202]],                       // spine flat
      [[92, 202], [112, 200], [132, 202]],          // legs
      [[92, 202], [110, 206], [128, 208]],
      [[52, 200], [66, 190], [80, 192]],            // arm resting on body
    ]);
  },
  sit(ctx) {
    head(ctx, 70, 118);
    limbs(ctx, [
      [[70, 134], [70, 178]],
      [[70, 178], [98, 182], [102, 210]],           // legs forward, knees up
      [[70, 178], [92, 186], [96, 212]],
      [[70, 142], [56, 164], [58, 184]],            // arms back propping
      [[70, 142], [86, 162], [92, 180]],
    ]);
  },
  handstand(ctx) {
    head(ctx, 70, 186);
    limbs(ctx, [
      [[70, 170], [70, 116]],                       // spine (inverted)
      [[70, 116], [58, 76], [60, 40]],              // legs up
      [[70, 116], [82, 76], [80, 40]],
      [[70, 162], [54, 188], [50, 210]],            // arms to ground
      [[70, 162], [86, 188], [90, 210]],
    ]);
  },
  star(ctx) {
    head(ctx, 70, 62);
    limbs(ctx, [
      [[70, 78], [70, 128]],
      [[70, 128], [46, 168], [34, 208]],
      [[70, 128], [94, 168], [106, 208]],
      [[70, 90], [40, 66], [24, 46]],
      [[70, 90], [100, 66], [116, 46]],
    ]);
  },
  climb(ctx, t) {
    const s = Math.sin(t * 7);
    head(ctx, 70, 74);
    limbs(ctx, [
      [[70, 90], [70, 142]],
      [[70, 142], [58, 172 - 8 * s], [56, 202 - 12 * s]],
      [[70, 142], [82, 172 + 8 * s], [84, 202 + 12 * s]],
      [[70, 98], [56, 74 + 8 * s], [52, 50 + 12 * s]],
      [[70, 98], [86, 74 - 8 * s], [90, 50 - 12 * s]],
    ]);
  },
  ceiling(ctx, t) {
    const s = Math.sin(t * 7);
    head(ctx, 70, 150);
    limbs(ctx, [
      [[70, 134], [70, 82]],
      [[70, 82], [54 + 6 * s, 44], [50 + 8 * s, 12]],   // legs gripping ceiling
      [[70, 82], [86 - 6 * s, 44], [90 - 8 * s, 12]],
      [[70, 126], [52, 96], [48 - 6 * s, 64]],          // arms reaching up
      [[70, 126], [88, 96], [92 + 6 * s, 64]],
    ]);
  },
};

// Scratch canvases reused every frame.
const silCanvas = document.createElement('canvas');
silCanvas.width = BODY_W; silCanvas.height = BODY_H;
const silCtx = silCanvas.getContext('2d');

/**
 * Compose the player's body (white silhouette + their paint, clipped) into a
 * canvas ready to be drawn into the world. Returns silCanvas (reused!).
 */
export function composeBody(player, t, tint = null) {
  silCtx.clearRect(0, 0, BODY_W, BODY_H);
  silCtx.save();
  silCtx.fillStyle = '#ffffff';
  silCtx.strokeStyle = '#ffffff';
  const drawer = POSE_DRAWERS[player.pose] || POSE_DRAWERS.stand;
  drawer(silCtx, t + (player.walkT || 0));
  silCtx.globalCompositeOperation = 'source-atop';
  if (tint) {
    silCtx.fillStyle = tint;
    silCtx.fillRect(0, 0, BODY_W, BODY_H);
  } else {
    silCtx.drawImage(player.paint.canvas, 0, 0);
  }
  silCtx.restore();
  return silCanvas;
}

// Pose-dependent visual heights so the figure sits on the ground correctly.
export const POSE_ANCHOR = { // world-space half-width/height of collision body
  stand: { w: 44, h: 96 }, walk: { w: 48, h: 96 }, jump: { w: 52, h: 96 },
  crouch: { w: 52, h: 62 }, ball: { w: 50, h: 50 }, tpose: { w: 96, h: 96 },
  lie: { w: 100, h: 34 }, sit: { w: 56, h: 70 }, handstand: { w: 48, h: 96 },
  star: { w: 96, h: 100 }, climb: { w: 46, h: 92 }, ceiling: { w: 46, h: 92 },
};
