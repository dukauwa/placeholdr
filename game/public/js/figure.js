// Rigged 3D stick figure with a paintable texture atlas.
// Every body part's UVs are remapped into its own cell of a 256x256 canvas
// atlas, so paint strokes are simple 2D canvas draws that show up on the body.
import * as THREE from '../lib/three.module.js';

export const ATLAS = 256;
const CELL_W = 64, CELL_H = 85;   // 4 x 3 grid

// part -> atlas cell (col, row)
const CELLS = {
  head: [0, 0], torso: [1, 0], uArmL: [2, 0], fArmL: [3, 0],
  uArmR: [0, 1], fArmR: [1, 1], thighL: [2, 1], shinL: [3, 1],
  thighR: [0, 2], shinR: [1, 2],
};

function remapUVs(geo, part) {
  const [cx, cy] = CELLS[part];
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i,
      (uv.getX(i) * (CELL_W - 2) + cx * CELL_W + 1) / ATLAS,
      1 - ((1 - uv.getY(i)) * (CELL_H - 2) + cy * CELL_H + 1) / ATLAS);
  }
  uv.needsUpdate = true;
}

function limb(part, len, r, material) {
  // cylinder hanging down from its joint (origin at the top)
  const geo = new THREE.CylinderGeometry(r, r * 0.85, len, 10);
  geo.translate(0, -len / 2, 0);
  remapUVs(geo, part);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

const L = {   // skeleton dimensions (meters) — small and chunky with a big head
  hipsY: 0.58, torso: 0.34, headR: 0.19,
  uArm: 0.2, fArm: 0.18, thigh: 0.28, shin: 0.28,
  limbR: 0.055, torsoR: 0.08,
};

/**
 * Build a paintable stick figure. Returns { root, joints, meshes, atlas,
 * texture, setPose, animate }. root.position is the FEET point.
 */
export function createFigure() {
  const atlas = document.createElement('canvas');
  atlas.width = atlas.height = ATLAS;
  const actx = atlas.getContext('2d');
  actx.fillStyle = '#ffffff';
  actx.fillRect(0, 0, ATLAS, ATLAS);

  const texture = new THREE.CanvasTexture(atlas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshLambertMaterial({ map: texture });

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = L.hipsY;
  root.add(hips);

  // torso up from hips
  const torsoGeo = new THREE.CylinderGeometry(L.torsoR, L.torsoR, L.torso, 10);
  torsoGeo.translate(0, L.torso / 2, 0);
  remapUVs(torsoGeo, 'torso');
  const torso = new THREE.Mesh(torsoGeo, mat);
  torso.castShadow = true;
  hips.add(torso);

  // head
  const headGeo = new THREE.SphereGeometry(L.headR, 14, 12);
  remapUVs(headGeo, 'head');
  const head = new THREE.Mesh(headGeo, mat);
  head.castShadow = true;
  head.position.y = L.torso + L.headR + 0.03;
  hips.add(head);

  // little dot eyes (not paintable — they stay visible through any camo)
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#26262e' });
  const eyes = [];
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), eyeMat);
    eye.position.set(sx * 0.07, 0.035, L.headR * 0.88);
    head.add(eye);
    eyes.push(eye);
  }

  const joints = { hips };
  const meshes = [torso, head];

  const addLimb = (name, parent, pos, upperPart, upperLen, lowerName, lowerPart, lowerLen) => {
    const j = new THREE.Group();
    j.position.set(...pos);
    parent.add(j);
    const upper = limb(upperPart, upperLen, L.limbR, mat);
    j.add(upper);
    const k = new THREE.Group();
    k.position.y = -upperLen;
    j.add(k);
    const lower = limb(lowerPart, lowerLen, L.limbR, mat);
    k.add(lower);
    joints[name] = j;
    joints[lowerName] = k;
    meshes.push(upper, lower);
  };

  addLimb('shoulderL', hips, [-0.16, L.torso - 0.02, 0], 'uArmL', L.uArm, 'elbowL', 'fArmL', L.fArm);
  addLimb('shoulderR', hips, [0.16, L.torso - 0.02, 0], 'uArmR', L.uArm, 'elbowR', 'fArmR', L.fArm);
  addLimb('hipL', hips, [-0.09, 0, 0], 'thighL', L.thigh, 'kneeL', 'shinL', L.shin);
  addLimb('hipR', hips, [0.09, 0, 0], 'thighR', L.thigh, 'kneeR', 'shinR', L.shin);

  const fig = { root, joints, meshes, eyes, atlas, actx, texture };
  fig.setPose = (pose, t) => applyPose(fig, pose, t);
  return fig;
}

// Pose = joint Euler rotations + hips height (+ optional whole-body pitch).
// Rotation X bends forward/back, Z splays sideways.
const POSES3D = {
  stand: { hipsY: 0.58, rot: { shoulderL: [0.1, 0, 0.12], shoulderR: [-0.1, 0, -0.12], elbowL: [-0.15, 0, 0], elbowR: [-0.15, 0, 0] } },
  jump: { hipsY: 0.58, rot: { shoulderL: [0, 0, 2.6], shoulderR: [0, 0, -2.6], hipL: [-0.5, 0, 0.1], hipR: [-0.5, 0, -0.1], kneeL: [0.9, 0, 0], kneeR: [0.9, 0, 0] } },
  crouch: { hipsY: 0.36, rot: { hipL: [-1.9, 0, 0.15], hipR: [-1.9, 0, -0.15], kneeL: [1.9, 0, 0], kneeR: [1.9, 0, 0], shoulderL: [-0.7, 0, 0.2], shoulderR: [-0.7, 0, -0.2], elbowL: [-0.9, 0, 0], elbowR: [-0.9, 0, 0], hips: [0.5, 0, 0] } },
  ball: { hipsY: 0.32, rot: { hips: [1.35, 0, 0], hipL: [-2.6, 0, 0.12], hipR: [-2.6, 0, -0.12], kneeL: [2.65, 0, 0], kneeR: [2.65, 0, 0], shoulderL: [-1.2, 0, 0.35], shoulderR: [-1.2, 0, -0.35], elbowL: [-1.9, 0, 0], elbowR: [-1.9, 0, 0] } },
  tpose: { hipsY: 0.58, rot: { shoulderL: [0, 0, Math.PI / 2], shoulderR: [0, 0, -Math.PI / 2] } },
  lie: { hipsY: 0.16, rot: { hips: [-Math.PI / 2 + 0.06, 0, 0], shoulderL: [0.2, 0, 0.3], shoulderR: [0.2, 0, -0.3] } },
  sit: { hipsY: 0.33, rot: { hipL: [-1.55, 0, 0.1], hipR: [-1.55, 0, -0.1], kneeL: [1.5, 0, 0], kneeR: [1.5, 0, 0], shoulderL: [0.5, 0, 0.15], shoulderR: [0.5, 0, -0.15] } },
  star: { hipsY: 0.62, rot: { shoulderL: [0, 0, 2.3], shoulderR: [0, 0, -2.3], hipL: [0, 0, 0.55], hipR: [0, 0, -0.55] } },
};

const JOINT_NAMES = ['hips', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];

function applyPose(fig, pose, t = 0) {
  // dynamic movement poses
  if (pose === 'walk' || pose === 'run') {
    const speed = pose === 'run' ? 11 : 8;
    const amp = pose === 'run' ? 0.9 : 0.6;
    const s = Math.sin(t * speed);
    setRots(fig, {
      hips: [0.08, 0, 0],
      hipL: [s * amp, 0, 0.05], hipR: [-s * amp, 0, -0.05],
      kneeL: [Math.max(0, -s) * amp, 0, 0], kneeR: [Math.max(0, s) * amp, 0, 0],
      shoulderL: [-s * amp * 0.8, 0, 0.12], shoulderR: [s * amp * 0.8, 0, -0.12],
      elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0],
    });
    fig.joints.hips.position.y = 0.58;
    return;
  }
  if (pose === 'climb') {
    const s = Math.sin(t * 6);
    setRots(fig, {
      hips: [0, 0, 0],
      shoulderL: [2.6 + s * 0.4, 0, 0.25], shoulderR: [2.6 - s * 0.4, 0, -0.25],
      elbowL: [0.4, 0, 0], elbowR: [0.4, 0, 0],
      hipL: [-0.8 - s * 0.4, 0, 0.1], hipR: [-0.8 + s * 0.4, 0, -0.1],
      kneeL: [1.0, 0, 0], kneeR: [1.0, 0, 0],
    });
    fig.joints.hips.position.y = 0.58;
    return;
  }
  const def = POSES3D[pose] || POSES3D.stand;
  setRots(fig, def.rot);
  fig.joints.hips.position.y = def.hipsY;
}

function setRots(fig, rots) {
  for (const name of JOINT_NAMES) {
    const j = fig.joints[name];
    const r = rots[name] || [0, 0, 0];
    j.rotation.set(r[0], r[1], r[2]);
  }
}

export const POSES = ['stand', 'crouch', 'ball', 'tpose', 'lie', 'sit', 'star'];
