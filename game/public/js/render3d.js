// Three.js scene: world, lights, per-player figures, cameras, splats, labels.
import * as THREE from '../lib/three.module.js';
import { S } from './state.js';
import { getMapDef, buildMap, buildGlbMap } from './maps3d.js';
import { createFigure } from './figure.js';

export const canvas = document.getElementById('game');

export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 300);

// camera orbit state (radians)
export const view = { yaw: 0, pitch: -0.25, dist: 5.2 };

let world = null;            // { map, group, solids, colors }
let sunLight, ambLight;
const splatMeshes = [];
const raycaster = new THREE.Raycaster();

export function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const glbCache = new Map();   // heavy imported worlds are built once, reused

export function loadWorld(mapId, glbUrl = null) {
  if (world) {
    scene.remove(world.group);
    if (world.kind !== 'glb') {   // procedural worlds are cheap to rebuild
      world.group.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    }
  }
  clearSplats();
  const def = getMapDef(mapId);
  if (def.kind === 'glb' && glbUrl) {
    if (!glbCache.has(mapId)) glbCache.set(mapId, buildGlbMap(mapId, glbUrl));
    world = glbCache.get(mapId);
  } else {
    world = buildMap(mapId);
  }
  scene.add(world.group);
  const m = def;
  scene.background = new THREE.Color(m.sky);
  scene.fog = new THREE.Fog(m.fog, 60, 160);
  if (!sunLight) {
    sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -50; sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50; sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.camera.far = 200;
    scene.add(sunLight);
    ambLight = new THREE.HemisphereLight(0xffffff, 0x777788, 1.0);
    scene.add(ambLight);
  }
  sunLight.position.set(...m.sun);
  ambLight.color.set('#ffffff');
  ambLight.groundColor.set('#9999aa');
  ambLight.intensity = 0.8 + m.ambient;
  return world;
}

export function getWorld() { return world; }

// ---- per-player 3D attachments ---------------------------------------------

export function attachFigure(p) {
  if (p.fig) return p.fig;
  p.fig = createFigure();
  p.fig.root.position.set(p.x, p.y, p.z);
  // name label sprite
  const c = document.createElement('canvas');
  c.width = 256; c.height = 48;
  p.labelCtx = c.getContext('2d');
  p.labelTex = new THREE.CanvasTexture(c);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: p.labelTex, depthTest: false }));
  label.scale.set(2.4, 0.45, 1);
  label.position.y = 2.25;
  p.fig.root.add(label);
  p.label = label;
  drawLabel(p);
  scene.add(p.fig.root);
  return p.fig;
}

export function drawLabel(p) {
  const ctx = p.labelCtx;
  if (!ctx) return;
  ctx.clearRect(0, 0, 256, 48);
  ctx.font = '600 26px system-ui';
  ctx.textAlign = 'center';
  ctx.fillStyle = p.role === 'seeker' ? '#ff5a4e' : '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 6;
  ctx.fillText(p.name, 128, 34);
  p.labelTex.needsUpdate = true;
}

export function detachFigure(p) {
  if (!p.fig) return;
  scene.remove(p.fig.root);
  p.fig.meshes.forEach(m => m.geometry.dispose());
  p.fig = null;
}

// tint a figure red (seeker) or restore paintable white+atlas
export function setSeekerLook(p, isSeeker) {
  if (!p.fig) return;
  for (const mesh of p.fig.meshes) {
    if (isSeeker) {
      mesh.material = mesh.material.clone();
      mesh.material.map = null;
      mesh.material.color.set('#e03c2d');
    } else {
      mesh.material.map = p.fig.texture;
      mesh.material.color.set('#ffffff');
    }
    mesh.material.needsUpdate = true;
  }
}

// ---- splats ----------------------------------------------------------------

export function addSplatAlongRay(o, d, color = '#e0533d') {
  if (!world) return;
  raycaster.set(new THREE.Vector3(...o), new THREE.Vector3(...d));
  raycaster.far = 90;
  const hits = raycaster.intersectObjects(world.group.children, true);
  if (!hits.length) return;
  const h = hits[0];
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const r = 0.16 * (1 + Math.random());
    const blob = new THREE.Mesh(
      new THREE.SphereGeometry(r, 8, 6),
      new THREE.MeshLambertMaterial({ color }));
    blob.scale.setScalar(0.35);
    blob.position.copy(h.point)
      .addScaledVector(h.face.normal, 0.03)
      .add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5));
    // flatten against the surface
    const n = h.face.normal;
    blob.scale.set(1 - Math.abs(n.x) * 0.85, 1 - Math.abs(n.y) * 0.85, 1 - Math.abs(n.z) * 0.85).multiplyScalar(0.9);
    g.add(blob);
  }
  scene.add(g);
  splatMeshes.push(g);
  if (splatMeshes.length > 60) {
    const old = splatMeshes.shift();
    scene.remove(old);
    old.traverse(o2 => { o2.geometry?.dispose(); o2.material?.dispose(); });
  }
  return h.point;
}

export function clearSplats() {
  for (const g of splatMeshes) {
    scene.remove(g);
    g.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  }
  splatMeshes.length = 0;
}

// ---- camera + frame ---------------------------------------------------------

const camTarget = new THREE.Vector3();

export function updateCamera3D(dt) {
  const me = S.me();
  if (!me || !world) return;
  const isGhost = me.tagged && S.settings?.mode !== 'infection';
  const firstPerson = me.role === 'seeker' && S.phase === 'seek';

  if (firstPerson) {
    camera.position.set(me.x, me.y + 1.62, me.z);
    camera.rotation.set(view.pitch, view.yaw, 0, 'YXZ');
    if (me.fig) me.fig.root.visible = false;
  } else {
    if (me.fig) me.fig.root.visible = true;
    const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
    const dist = isGhost ? 7 : view.dist;
    camTarget.set(me.x, me.y + 1.2, me.z);
    const off = new THREE.Vector3(
      Math.sin(view.yaw) * cp * dist,
      -sp * dist + 0.4,
      Math.cos(view.yaw) * cp * dist);
    const desired = camTarget.clone().add(off);
    // keep the camera out of the floor
    desired.y = Math.max(0.4, desired.y);
    camera.position.lerp(desired, Math.min(1, dt * 10));
    camera.lookAt(camTarget);
  }
  void dt;
}

// screen point (client px) -> raycaster
export function rayFromScreen(sx, sy) {
  const ndc = new THREE.Vector2(
    (sx / window.innerWidth) * 2 - 1,
    -(sy / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster;
}

export function rayFromCenter() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  return raycaster;
}

export function render3D() {
  renderer.render(scene, camera);
}
