// 3D maps: data-driven boxes (and a few cylinders) with flat colors.
// Every entry collides; `climb: true` sides can be clung to and climbed.
// Units are meters, Y is up, boxes are given as center position + full size.
import * as THREE from '../lib/three.module.js';

function box(p, s, c, opts = {}) { return { type: 'box', p, s, c, ...opts }; }
function cyl(p, r, h, c, opts = {}) { return { type: 'cyl', p, r, h, c, ...opts }; }

export const MAPS = {
  rooftop: {
    name: 'Rooftop Sunset',
    sky: '#e0764a', fog: '#c96b52', sun: [40, 60, 20], ambient: 0.55,
    bounds: { x: 40, z: 26 },
    hiderSpawn: [0, 0], seekerSpawn: [-34, 0],
    shapes: [
      // roof floor
      box([0, -0.5, 0], [80, 1, 52], '#5c3a68'),
      // parapet walls
      box([0, 0.6, -25.6], [80, 1.2, 0.8], '#7a4a86'),
      box([0, 0.6, 25.6], [80, 1.2, 0.8], '#7a4a86'),
      box([-39.6, 0.6, 0], [0.8, 1.2, 52], '#7a4a86'),
      box([39.6, 0.6, 0], [0.8, 1.2, 52], '#7a4a86'),
      // stairwell hut
      box([-20, 2, -14], [10, 4, 8], '#c94f3d', { climb: true }),
      box([-20, 4.4, -14], [11, 0.8, 9], '#a83e30'),
      // AC units
      box([-8, 0.9, 8], [3.4, 1.8, 2.2], '#9aa0b0'),
      box([-4, 0.9, 8], [3.4, 1.8, 2.2], '#b8bec9'),
      box([-6, 2.2, 8], [2, 0.8, 1.6], '#7f8694'),
      // chimney cluster
      cyl([6, 2, -18], 1.1, 4, '#8a3a3a', { climb: true }),
      cyl([9, 1.5, -19], 0.9, 3, '#a84a4a', { climb: true }),
      // billboard (blend heaven: big flat gradient-ish panels)
      box([14, 4.5, -24.5], [16, 6, 0.6], '#ff6b9d', { climb: true }),
      box([9, 4.5, -24.1], [5, 6, 0.4], '#ffd23f'),
      box([19, 6, -24.1], [5, 3, 0.4], '#3d7be0'),
      box([14, 1, -24], [1.2, 2, 1.2], '#555566', { climb: true }),
      // water tower
      cyl([28, 6, 12], 3.4, 5, '#7ac4e0', { climb: true }),
      cyl([28, 1.75, 12], 0.35, 3.5, '#777788', { climb: true }),
      cyl([26, 1.75, 10], 0.35, 3.5, '#777788'),
      cyl([30, 1.75, 14], 0.35, 3.5, '#777788'),
      // crates & planters
      box([2, 0.75, 16], [1.5, 1.5, 1.5], '#e0a03d', { climb: true }),
      box([3.6, 0.6, 16.4], [1.2, 1.2, 1.2], '#c98a2f', { climb: true }),
      box([2.8, 1.9, 16.2], [1.2, 1.2, 1.2], '#8a5a2b', { climb: true }),
      box([-30, 0.5, 16], [6, 1, 2], '#40a86b'),
      box([-30, 1.2, 16], [5.4, 0.5, 1.6], '#357a52'),
      // duct run
      box([16, 0.6, 4], [12, 1.2, 1.4], '#6b6b7a', { climb: true }),
      box([22, 1.4, 4], [1.4, 2.8, 1.4], '#6b6b7a', { climb: true }),
      // skylight
      box([-10, 0.5, -4], [5, 1, 5], '#59c1e8'),
    ],
  },

  junglegym: {
    name: 'Jungle Gym',
    sky: '#59c1e8', fog: '#7fd0ec', sun: [30, 70, 30], ambient: 0.65,
    bounds: { x: 36, z: 26 },
    hiderSpawn: [0, 0], seekerSpawn: [-30, 0],
    shapes: [
      // grass
      box([0, -0.5, 0], [72, 1, 52], '#4da34d'),
      // sandbox
      box([-14, 0.2, 12], [8, 0.4, 8], '#e8d08a'),
      box([-14, 0.5, 8.2], [8.6, 0.6, 0.6], '#b8763d'),
      box([-14, 0.5, 15.8], [8.6, 0.6, 0.6], '#b8763d'),
      box([-18.2, 0.5, 12], [0.6, 0.6, 8.6], '#b8763d'),
      box([-9.8, 0.5, 12], [0.6, 0.6, 8.6], '#b8763d'),
      // climbing frame
      cyl([0, 2.5, -8], 0.18, 5, '#e0533d', { climb: true }),
      cyl([6, 2.5, -8], 0.18, 5, '#e0533d', { climb: true }),
      cyl([0, 2.5, -14], 0.18, 5, '#e0533d', { climb: true }),
      cyl([6, 2.5, -14], 0.18, 5, '#e0533d', { climb: true }),
      box([3, 5.1, -11], [7, 0.3, 7], '#ffd23f', { climb: true }),
      box([3, 2.6, -11], [6.4, 0.25, 6.4], '#3d7be0', { climb: true }),
      // slide tower
      box([14, 1.75, 6], [4, 3.5, 4], '#3d7be0', { climb: true }),
      box([14, 3.8, 6], [4.6, 0.5, 4.6], '#e07ab8'),
      box([18.8, 1.2, 6], [6.5, 0.4, 2.2], '#ffd23f', { ry: 0, rz: -0.42 }),
      // swings
      box([26, 3.9, -10], [8, 0.4, 0.4], '#8a5a2b'),
      cyl([22.5, 1.9, -10], 0.22, 3.9, '#8a5a2b', { climb: true }),
      cyl([29.5, 1.9, -10], 0.22, 3.9, '#8a5a2b', { climb: true }),
      box([24.5, 1, -10], [1.4, 0.2, 0.5], '#e0533d'),
      box([27.5, 1.4, -10], [1.4, 0.2, 0.5], '#3d7be0'),
      // tree
      cyl([-24, 2.5, -12], 0.8, 5, '#8a5a2b', { climb: true }),
      cyl([-24, 6.5, -12], 4.2, 4.5, '#3e8e4f'),
      cyl([-27, 5.4, -10], 2.4, 3, '#4da34d'),
      cyl([-21, 5.6, -14], 2.6, 3.2, '#57b357'),
      // bench + ball
      box([-6, 0.5, 18], [3.6, 0.2, 1], '#b8763d'),
      box([-7.4, 0.25, 18], [0.3, 0.5, 1], '#8a5a2b'),
      box([-4.6, 0.25, 18], [0.3, 0.5, 1], '#8a5a2b'),
      cyl([8, 0.5, 14], 0.5, 1, '#e0533d'),
      // spring riders
      box([-2, 0.8, -18], [1.2, 0.6, 0.5], '#ffd23f', { climb: true }),
      box([2, 0.8, -18], [1.2, 0.6, 0.5], '#e07ab8', { climb: true }),
    ],
  },

  candy: {
    name: 'Candy Works',
    sky: '#ffc4e1', fog: '#ffd4e9', sun: [20, 60, 40], ambient: 0.7,
    bounds: { x: 34, z: 24 },
    hiderSpawn: [0, 0], seekerSpawn: [-28, 0],
    shapes: [
      // striped floor (two interleaved slabs for stripes)
      box([0, -0.5, 0], [68, 1, 48], '#ff8fc7'),
      box([-17, -0.49, 0], [11.3, 1.02, 48], '#ffb3d9'),
      box([5, -0.49, 0], [11.3, 1.02, 48], '#ffb3d9'),
      box([27, -0.49, 0], [11.3, 1.02, 48], '#ffb3d9'),
      // gumball machine
      box([10, 1.5, -10], [3, 3, 3], '#e0533d', { climb: true }),
      cyl([10, 4.4, -10], 1.9, 2.8, '#cfeaff'),
      cyl([10.8, 4.9, -9.4], 0.5, 1, '#ffd23f'),
      cyl([9.2, 4.2, -10.4], 0.5, 1, '#40a86b'),
      // candy cane arches (vertical poles)
      cyl([-8, 3, -14], 0.5, 6, '#e0533d', { climb: true }),
      cyl([-8, 3, 14], 0.5, 6, '#ffffff', { climb: true }),
      cyl([18, 3.5, 10], 0.5, 7, '#40a86b', { climb: true }),
      // chocolate slabs stack
      box([-18, 0.75, -8], [7, 1.5, 4], '#6b3e26', { climb: true }),
      box([-19, 2.2, -8.5], [5, 1.4, 3], '#7d4a2e', { climb: true }),
      box([-20, 3.5, -9], [3, 1.2, 2], '#8f5636', { climb: true }),
      // giant lollipops
      cyl([24, 2.5, -12], 0.3, 5, '#ffffff', { climb: true }),
      cyl([24, 6, -12], 2.2, 0.8, '#ffd23f', { rx: Math.PI / 2 }),
      cyl([28, 2, 2], 0.3, 4, '#ffffff', { climb: true }),
      cyl([28, 5, 2], 1.8, 0.8, '#e07ab8', { rx: Math.PI / 2 }),
      // syrup vat + conveyor
      cyl([-28, 2, 8], 3.2, 4, '#c94f8e', { climb: true }),
      box([-6, 1, 6], [14, 0.6, 2.4], '#8a5a9e', { climb: true }),
      cyl([-12.6, 1, 6], 0.5, 2.6, '#5c3a68', { rx: Math.PI / 2 }),
      cyl([0.6, 1, 6], 0.5, 2.6, '#5c3a68', { rx: Math.PI / 2 }),
      // marshmallows & mints
      cyl([2, 0.75, -4], 1, 1.5, '#ffffff', { climb: true }),
      cyl([4.2, 0.6, -5], 0.8, 1.2, '#fff5fa', { climb: true }),
      box([14, 0.6, 16], [1.4, 1.2, 1.4], '#59c1e8', { climb: true }),
      box([16, 0.9, 15], [1.8, 1.8, 1.8], '#a5e6ba', { climb: true }),
    ],
  },

  gallery: {
    name: 'The Gallery',
    sky: '#f2efe9', fog: '#efeae2', sun: [10, 50, 10], ambient: 0.75,
    bounds: { x: 30, z: 18 },
    hiderSpawn: [0, 0], seekerSpawn: [-26, 0],
    shapes: [
      // floor + back/front walls
      box([0, -0.5, 0], [60, 1, 36], '#8a8177'),
      box([0, 4, -18.4], [60, 8, 0.8], '#e8e2d6'),
      box([0, 4, 18.4], [60, 8, 0.8], '#e8e2d6'),
      box([-30.4, 4, 0], [0.8, 8, 36], '#e8e2d6'),
      box([30.4, 4, 0], [0.8, 8, 36], '#e8e2d6'),
      // "paintings" on the back wall (colored panels)
      box([-20, 4, -17.8], [8, 5, 0.4], '#e0533d'),
      box([-9, 4, -17.8], [7, 5, 0.4], '#3d7be0'),
      box([1, 4.5, -17.8], [6, 6, 0.4], '#ffd23f'),
      box([10, 3.5, -17.8], [6, 4, 0.4], '#40a86b'),
      box([20, 4, -17.8], [8, 5, 0.4], '#2b2b33'),
      // front wall panels
      box([-14, 4, 17.8], [9, 5, 0.4], '#ff6b9d'),
      box([4, 4, 17.8], [10, 5, 0.4], '#8a2be2'),
      box([18, 4, 17.8], [7, 5, 0.4], '#59c1e8'),
      // pedestals + sculptures
      box([-16, 1, 0], [3, 2, 3], '#d9d2c7', { climb: true }),
      cyl([-16, 2.9, 0], 1.2, 1.8, '#e0533d'),
      box([0, 1.25, -6], [3.4, 2.5, 3.4], '#d9d2c7', { climb: true }),
      box([0, 3.4, -6], [1.8, 1.8, 1.8], '#3d7be0', { ry: 0.6 }),
      box([14, 0.9, 4], [3, 1.8, 3], '#d9d2c7', { climb: true }),
      cyl([14, 2.6, 4], 1.3, 1.6, '#ffd23f'),
      // benches
      box([-6, 0.4, 8], [4, 0.5, 1.2], '#4a4438'),
      box([8, 0.4, -10], [4, 0.5, 1.2], '#4a4438'),
      // divider wall to hide behind
      box([22, 2.5, -6], [0.8, 5, 10], '#d9d2c7', { climb: true }),
      box([22, 2.5, -6.2], [0.9, 3, 4], '#40a86b'),
    ],
  },
};

/**
 * Build meshes + collision solids for a map.
 * Returns { group, solids, colors } — solids are world AABBs {min,max,climb},
 * colors is the palette of all map colors (handy for UI swatches).
 */
export function buildMap(mapId) {
  const map = MAPS[mapId];
  const group = new THREE.Group();
  const solids = [];
  const colors = new Set();

  for (const s of map.shapes) {
    let mesh, size;
    if (s.type === 'box') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(s.s[0], s.s[1], s.s[2]),
        new THREE.MeshLambertMaterial({ color: s.c }));
      size = s.s;
    } else {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(s.r, s.r, s.h, 20),
        new THREE.MeshLambertMaterial({ color: s.c }));
      size = [s.r * 2, s.h, s.r * 2];
    }
    mesh.position.set(s.p[0], s.p[1], s.p[2]);
    if (s.rx) mesh.rotation.x = s.rx;
    if (s.ry) mesh.rotation.y = s.ry;
    if (s.rz) mesh.rotation.z = s.rz;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.color = s.c;
    group.add(mesh);
    colors.add(s.c);

    // collision AABB (rotated shapes get a conservative bounding box)
    if (s.rx || s.rz) {
      const b = new THREE.Box3().setFromObject(mesh);
      solids.push({ min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z], climb: !!s.climb });
    } else {
      solids.push({
        min: [s.p[0] - size[0] / 2, s.p[1] - size[1] / 2, s.p[2] - size[2] / 2],
        max: [s.p[0] + size[0] / 2, s.p[1] + size[1] / 2, s.p[2] + size[2] / 2],
        climb: !!s.climb,
      });
    }
  }
  return { map, group, solids, colors: [...colors] };
}
