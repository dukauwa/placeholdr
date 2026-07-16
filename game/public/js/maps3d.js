// 3D maps: data-driven boxes/cylinders with flat colors OR canvas-generated
// patterns (stripes, checker, bricks, dots, mosaic). Patterns are what make
// blending interesting — and the eyedropper samples the EXACT texel you click.
// Every entry collides; `climb: true` sides can be grabbed and climbed.
// Units are meters, Y is up, boxes are center position + full size.
import * as THREE from '../lib/three.module.js';
import { GLTFLoader } from '../lib/GLTFLoader.js';
import { MeshBVH, acceleratedRaycast } from '../lib/three-mesh-bvh.module.js';

THREE.Mesh.prototype.raycast = acceleratedRaycast;   // fast raycasts everywhere

function box(p, s, c, opts = {}) { return { type: 'box', p, s, c, ...opts }; }
function cyl(p, r, h, c, opts = {}) { return { type: 'cyl', p, r, h, c, ...opts }; }

// tex: { kind, colors, scale }  — scale = meters per pattern tile
const stripes = (colors, scale = 1, vertical = false) => ({ kind: vertical ? 'vstripes' : 'stripes', colors, scale });
const checker = (colors, scale = 1) => ({ kind: 'checker', colors, scale });
const bricks = (colors, scale = 1) => ({ kind: 'bricks', colors, scale });
const dots = (colors, scale = 1) => ({ kind: 'dots', colors, scale });
const mosaic = (colors, scale = 1) => ({ kind: 'mosaic', colors, scale });

export const MAPS = {
  rooftop: {
    name: 'Rooftop Sunset',
    sky: '#e0764a', fog: '#c96b52', sun: [40, 60, 20], ambient: 0.55,
    bounds: { x: 40, z: 26 },
    hiderSpawn: [0, 0], seekerSpawn: [-34, 0],
    shapes: [
      // roof floor: big concrete tiles
      box([0, -0.5, 0], [80, 1, 52], '#6b4a78', { tex: checker(['#6b4a78', '#5c3a68'], 4) }),
      // parapet walls: brick
      box([0, 0.6, -25.6], [80, 1.2, 0.8], '#7a4a86', { tex: bricks(['#8a5a96', '#7a4a86', '#6b3a76'], 1) }),
      box([0, 0.6, 25.6], [80, 1.2, 0.8], '#7a4a86', { tex: bricks(['#8a5a96', '#7a4a86', '#6b3a76'], 1) }),
      box([-39.6, 0.6, 0], [0.8, 1.2, 52], '#7a4a86', { tex: bricks(['#8a5a96', '#7a4a86', '#6b3a76'], 1) }),
      box([39.6, 0.6, 0], [0.8, 1.2, 52], '#7a4a86', { tex: bricks(['#8a5a96', '#7a4a86', '#6b3a76'], 1) }),
      // stairwell hut: brick with striped door
      box([-20, 2, -14], [10, 4, 8], '#c94f3d', { climb: true, tex: bricks(['#d9614c', '#c94f3d', '#b8422f'], 1.2) }),
      box([-20, 4.4, -14], [11, 0.8, 9], '#a83e30'),
      box([-16.5, 1.5, -9.9], [1.6, 3, 0.2], '#e0a03d', { tex: stripes(['#e0a03d', '#c98a2f'], 0.4, true) }),
      // helipad: big yellow/dark checker circle-ish pad
      box([10, 0.05, 12], [12, 0.1, 12], '#e0a03d', { tex: checker(['#e0a03d', '#3a3a44'], 1.5) }),
      // AC units: vented
      box([-8, 0.9, 8], [3.4, 1.8, 2.2], '#9aa0b0', { tex: stripes(['#9aa0b0', '#7f8694'], 0.3) }),
      box([-4, 0.9, 8], [3.4, 1.8, 2.2], '#b8bec9', { tex: stripes(['#b8bec9', '#9aa0b0'], 0.3) }),
      box([-6, 2.2, 8], [2, 0.8, 1.6], '#7f8694'),
      cyl([-7.4, 2.9, 8], 0.5, 0.6, '#5f6570'),
      // chimney cluster: brick
      cyl([6, 2, -18], 1.1, 4, '#8a3a3a', { climb: true, tex: bricks(['#a04848', '#8a3a3a', '#7a3030'], 0.8) }),
      cyl([9, 1.5, -19], 0.9, 3, '#a84a4a', { climb: true, tex: bricks(['#b85a5a', '#a84a4a'], 0.7) }),
      cyl([7.5, 1, -16.5], 0.7, 2, '#984242', { climb: true }),
      // billboard: sunset-stripe ad + posts
      box([14, 4.5, -24.5], [16, 6, 0.6], '#ff6b9d', { climb: true, tex: stripes(['#ff6b9d', '#ffd23f', '#59c1e8', '#ff8a5c'], 1.5) }),
      box([9, 4.5, -24.1], [5, 6, 0.4], '#ffd23f', { climb: true, tex: dots(['#ffd23f', '#e0533d'], 1) }),
      box([19, 6, -24.1], [5, 3, 0.4], '#3d7be0', { climb: true, tex: mosaic(['#3d7be0', '#2f5fb0', '#59c1e8'], 0.8) }),
      box([14, 1, -24], [1.2, 2, 1.2], '#555566', { climb: true }),
      // water tower on legs
      cyl([28, 6, 12], 3.4, 5, '#7ac4e0', { climb: true, tex: stripes(['#7ac4e0', '#5fa8c9'], 0.9) }),
      cyl([28, 1.75, 12], 0.35, 3.5, '#777788', { climb: true }),
      cyl([26, 1.75, 10], 0.35, 3.5, '#777788'),
      cyl([30, 1.75, 14], 0.35, 3.5, '#777788'),
      // crates & pallets
      box([2, 0.75, 16], [1.5, 1.5, 1.5], '#e0a03d', { climb: true, tex: stripes(['#e0a03d', '#c98a2f'], 0.5, true) }),
      box([3.6, 0.6, 16.4], [1.2, 1.2, 1.2], '#c98a2f', { climb: true }),
      box([2.8, 1.9, 16.2], [1.2, 1.2, 1.2], '#8a5a2b', { climb: true, tex: stripes(['#8a5a2b', '#7a4a1f'], 0.4) }),
      box([5.5, 0.4, 15], [2.4, 0.8, 1.6], '#b8763d', { tex: stripes(['#b8763d', '#a3652f'], 0.3) }),
      // planters with hedges
      box([-30, 0.5, 16], [6, 1, 2], '#40a86b', { tex: mosaic(['#40a86b', '#357a52', '#57b357'], 0.6) }),
      box([-30, 1.2, 16], [5.4, 0.5, 1.6], '#357a52'),
      box([-30, 0.5, -18], [6, 1, 2], '#40a86b', { tex: mosaic(['#40a86b', '#357a52', '#57b357'], 0.6) }),
      // duct run + solar panels
      box([16, 0.6, 4], [12, 1.2, 1.4], '#6b6b7a', { climb: true, tex: stripes(['#6b6b7a', '#5a5a68'], 0.6) }),
      box([22, 1.4, 4], [1.4, 2.8, 1.4], '#6b6b7a', { climb: true }),
      box([-14, 0.5, 2], [4, 0.15, 3], '#2b3a5c', { tex: checker(['#2b3a5c', '#3d5480'], 0.75) }),
      box([-14, 0.25, 2], [4.2, 0.5, 0.4], '#8a8a99'),
      // skylight + pipes
      box([-10, 0.5, -4], [5, 1, 5], '#59c1e8', { tex: checker(['#59c1e8', '#7fd0ec'], 1.2) }),
      cyl([-34, 1.2, -8], 0.3, 2.4, '#c9c9d4', { climb: true }),
      cyl([-34, 2.6, -8], 0.3, 1.2, '#c9c9d4', { rx: Math.PI / 2 }),
      // antenna mast + graffiti wall
      cyl([34, 3, -18], 0.25, 6, '#99a', { climb: true }),
      box([32, 1.5, -6], [0.6, 3, 8], '#d9d2c7', { climb: true, tex: mosaic(['#e0533d', '#3d7be0', '#ffd23f', '#40a86b', '#d9d2c7'], 0.9) }),
    ],
  },

  junglegym: {
    name: 'Jungle Gym',
    sky: '#59c1e8', fog: '#7fd0ec', sun: [30, 70, 30], ambient: 0.65,
    bounds: { x: 36, z: 26 },
    hiderSpawn: [0, 0], seekerSpawn: [-30, 0],
    shapes: [
      // grass with mowing stripes
      box([0, -0.5, 0], [72, 1, 52], '#4da34d', { tex: stripes(['#4da34d', '#5fbf5f'], 3) }),
      // rubber safety tiles under the frame
      box([3, 0.02, -11], [12, 0.06, 12], '#e0533d', { tex: checker(['#e0533d', '#e07a3d'], 1.5) }),
      // sandbox
      box([-14, 0.2, 12], [8, 0.4, 8], '#e8d08a', { tex: dots(['#e8d08a', '#dcc077'], 0.5) }),
      box([-14, 0.5, 8.2], [8.6, 0.6, 0.6], '#b8763d', { tex: stripes(['#b8763d', '#8a5a2b'], 0.7) }),
      box([-14, 0.5, 15.8], [8.6, 0.6, 0.6], '#b8763d', { tex: stripes(['#b8763d', '#8a5a2b'], 0.7) }),
      box([-18.2, 0.5, 12], [0.6, 0.6, 8.6], '#b8763d'),
      box([-9.8, 0.5, 12], [0.6, 0.6, 8.6], '#b8763d'),
      // climbing frame: candy-striped poles + platforms
      cyl([0, 2.5, -8], 0.18, 5, '#e0533d', { climb: true, tex: stripes(['#e0533d', '#ffffff'], 0.35) }),
      cyl([6, 2.5, -8], 0.18, 5, '#3d7be0', { climb: true, tex: stripes(['#3d7be0', '#ffffff'], 0.35) }),
      cyl([0, 2.5, -14], 0.18, 5, '#ffd23f', { climb: true, tex: stripes(['#ffd23f', '#e0533d'], 0.35) }),
      cyl([6, 2.5, -14], 0.18, 5, '#40a86b', { climb: true, tex: stripes(['#40a86b', '#ffffff'], 0.35) }),
      box([3, 5.1, -11], [7, 0.3, 7], '#ffd23f', { climb: true, tex: checker(['#ffd23f', '#e0a03d'], 0.9) }),
      box([3, 2.6, -11], [6.4, 0.25, 6.4], '#3d7be0', { climb: true, tex: dots(['#3d7be0', '#2f5fb0'], 0.8) }),
      // monkey bars
      box([9.5, 4.2, -11], [6, 0.25, 1.2], '#e07ab8', { climb: true, tex: stripes(['#e07ab8', '#c95f9e'], 0.5) }),
      cyl([12.5, 2.1, -11], 0.16, 4.2, '#e07ab8', { climb: true }),
      // slide tower
      box([14, 1.75, 6], [4, 3.5, 4], '#3d7be0', { climb: true, tex: bricks(['#4d8bf0', '#3d7be0', '#2f5fb0'], 0.9) }),
      box([14, 3.8, 6], [4.6, 0.5, 4.6], '#e07ab8', { tex: stripes(['#e07ab8', '#f09ac9'], 0.6) }),
      box([18.8, 1.2, 6], [6.5, 0.4, 2.2], '#ffd23f', { rz: -0.42, tex: stripes(['#ffd23f', '#e0a03d'], 0.7) }),
      // swings
      box([26, 3.9, -10], [8, 0.4, 0.4], '#8a5a2b'),
      cyl([22.5, 1.9, -10], 0.22, 3.9, '#8a5a2b', { climb: true, tex: stripes(['#8a5a2b', '#7a4a1f'], 0.5) }),
      cyl([29.5, 1.9, -10], 0.22, 3.9, '#8a5a2b', { climb: true, tex: stripes(['#8a5a2b', '#7a4a1f'], 0.5) }),
      box([24.5, 1, -10], [1.4, 0.2, 0.5], '#e0533d'),
      box([27.5, 1.4, -10], [1.4, 0.2, 0.5], '#3d7be0'),
      // tree
      cyl([-24, 2.5, -12], 0.8, 5, '#8a5a2b', { climb: true, tex: bricks(['#9a6a3b', '#8a5a2b', '#7a4a1f'], 0.6) }),
      cyl([-24, 6.5, -12], 4.2, 4.5, '#3e8e4f', { tex: mosaic(['#3e8e4f', '#4da34d', '#57b357', '#357a52'], 1.2) }),
      cyl([-27, 5.4, -10], 2.4, 3, '#4da34d', { tex: mosaic(['#4da34d', '#57b357'], 1) }),
      cyl([-21, 5.6, -14], 2.6, 3.2, '#57b357', { tex: mosaic(['#57b357', '#3e8e4f'], 1) }),
      // picnic corner
      box([-6, 0.5, 18], [3.6, 0.2, 1], '#b8763d', { tex: stripes(['#b8763d', '#a3652f'], 0.3) }),
      box([-7.4, 0.25, 18], [0.3, 0.5, 1], '#8a5a2b'),
      box([-4.6, 0.25, 18], [0.3, 0.5, 1], '#8a5a2b'),
      box([-2, 0.45, 18], [2.4, 0.9, 1.4], '#e8d08a', { tex: checker(['#e8d08a', '#ffffff'], 0.4) }),
      cyl([8, 0.5, 14], 0.5, 1, '#e0533d', { tex: stripes(['#e0533d', '#ffffff'], 0.25) }),
      // spring riders + hopscotch
      box([-2, 0.8, -18], [1.2, 0.6, 0.5], '#ffd23f', { climb: true, tex: dots(['#ffd23f', '#e0533d'], 0.3) }),
      box([2, 0.8, -18], [1.2, 0.6, 0.5], '#e07ab8', { climb: true, tex: dots(['#e07ab8', '#ffffff'], 0.3) }),
      box([16, 0.03, 16], [2, 0.06, 8], '#ffffff', { tex: checker(['#e0533d', '#3d7be0'], 1) }),
      // low hedge maze corner
      box([-30, 0.8, 6], [1.2, 1.6, 10], '#357a52', { climb: true, tex: mosaic(['#357a52', '#40a86b'], 0.7) }),
      box([-26, 0.8, 10.5], [9, 1.6, 1.2], '#357a52', { climb: true, tex: mosaic(['#357a52', '#40a86b'], 0.7) }),
    ],
  },

  candy: {
    name: 'Candy Works',
    sky: '#ffc4e1', fog: '#ffd4e9', sun: [20, 60, 40], ambient: 0.7,
    bounds: { x: 34, z: 24 },
    hiderSpawn: [0, 0], seekerSpawn: [-28, 0],
    shapes: [
      // striped factory floor
      box([0, -0.5, 0], [68, 1, 48], '#ff8fc7', { tex: stripes(['#ff8fc7', '#ffb3d9'], 2.5) }),
      // sprinkle wall
      box([0, 2.5, -23.6], [68, 5, 0.8], '#fff5fa', { tex: dots(['#fff5fa', '#e0533d', '#3d7be0', '#ffd23f', '#40a86b'], 0.6) }),
      // gumball machine
      box([10, 1.5, -10], [3, 3, 3], '#e0533d', { climb: true, tex: stripes(['#e0533d', '#c93d2d'], 0.5, true) }),
      cyl([10, 4.4, -10], 1.9, 2.8, '#cfeaff', { tex: dots(['#cfeaff', '#e0533d', '#ffd23f', '#40a86b', '#3d7be0'], 0.55) }),
      // candy cane poles
      cyl([-8, 3, -14], 0.5, 6, '#e0533d', { climb: true, tex: stripes(['#e0533d', '#ffffff'], 0.4) }),
      cyl([-8, 3, 14], 0.5, 6, '#40a86b', { climb: true, tex: stripes(['#40a86b', '#ffffff'], 0.4) }),
      cyl([18, 3.5, 10], 0.5, 7, '#e07ab8', { climb: true, tex: stripes(['#e07ab8', '#ffffff'], 0.4) }),
      // chocolate slab stack (segments pattern)
      box([-18, 0.75, -8], [7, 1.5, 4], '#6b3e26', { climb: true, tex: checker(['#7d4a2e', '#6b3e26'], 0.9) }),
      box([-19, 2.2, -8.5], [5, 1.4, 3], '#7d4a2e', { climb: true, tex: checker(['#8f5636', '#7d4a2e'], 0.8) }),
      box([-20, 3.5, -9], [3, 1.2, 2], '#8f5636', { climb: true, tex: checker(['#9f6642', '#8f5636'], 0.7) }),
      // giant lollipops
      cyl([24, 2.5, -12], 0.3, 5, '#ffffff', { climb: true, tex: stripes(['#ffffff', '#e0533d'], 0.3) }),
      cyl([24, 6, -12], 2.2, 0.8, '#ffd23f', { rx: Math.PI / 2, tex: stripes(['#ffd23f', '#e0533d'], 0.5) }),
      cyl([28, 2, 2], 0.3, 4, '#ffffff', { climb: true, tex: stripes(['#ffffff', '#40a86b'], 0.3) }),
      cyl([28, 5, 2], 1.8, 0.8, '#e07ab8', { rx: Math.PI / 2, tex: stripes(['#e07ab8', '#ffffff'], 0.45) }),
      // syrup vat + conveyor
      cyl([-28, 2, 8], 3.2, 4, '#c94f8e', { climb: true, tex: stripes(['#c94f8e', '#e06ba8'], 0.8) }),
      box([-6, 1, 6], [14, 0.6, 2.4], '#8a5a9e', { climb: true, tex: stripes(['#8a5a9e', '#7a4a8e'], 0.5) }),
      cyl([-12.6, 1, 6], 0.5, 2.6, '#5c3a68', { rx: Math.PI / 2 }),
      cyl([0.6, 1, 6], 0.5, 2.6, '#5c3a68', { rx: Math.PI / 2 }),
      // wafer platform + cookie
      box([6, 0.9, 16], [5, 1.8, 3], '#e8c07a', { climb: true, tex: checker(['#e8c07a', '#d8a85f'], 0.45) }),
      cyl([0, 0.4, -16], 1.6, 0.8, '#b8763d', { climb: true, tex: dots(['#b8763d', '#6b3e26'], 0.4) }),
      // marshmallows & mints & gummies
      cyl([2, 0.75, -4], 1, 1.5, '#ffffff', { climb: true }),
      cyl([4.2, 0.6, -5], 0.8, 1.2, '#fff5fa', { climb: true }),
      box([14, 0.6, 16], [1.4, 1.2, 1.4], '#59c1e8', { climb: true, tex: dots(['#59c1e8', '#7fd0ec'], 0.3) }),
      box([16, 0.9, 15], [1.8, 1.8, 1.8], '#a5e6ba', { climb: true, tex: dots(['#a5e6ba', '#7fd09a'], 0.3) }),
      cyl([-14, 0.5, 16], 0.9, 1, '#e0533d', { climb: true, tex: stripes(['#e0533d', '#ffffff'], 0.25) }),
      cyl([-16.2, 0.4, 15], 0.7, 0.8, '#ffd23f', { climb: true, tex: stripes(['#ffd23f', '#ffffff'], 0.22) }),
      // licorice pipes along the back
      cyl([-2, 4.6, -23], 0.4, 10, '#3a3a44', { rz: Math.PI / 2, tex: stripes(['#3a3a44', '#e0533d'], 0.5) }),
    ],
  },

  gallery: {
    name: 'The Gallery',
    sky: '#f2efe9', fog: '#efeae2', sun: [10, 50, 10], ambient: 0.75,
    bounds: { x: 30, z: 18 },
    hiderSpawn: [0, 0], seekerSpawn: [-26, 0],
    shapes: [
      // parquet floor + walls
      box([0, -0.5, 0], [60, 1, 36], '#8a8177', { tex: bricks(['#9a9187', '#8a8177', '#7a7167'], 1.4) }),
      box([0, 4, -18.4], [60, 8, 0.8], '#e8e2d6', { tex: stripes(['#e8e2d6', '#ded8ca'], 2.2) }),
      box([0, 4, 18.4], [60, 8, 0.8], '#e8e2d6', { tex: stripes(['#e8e2d6', '#ded8ca'], 2.2) }),
      box([-30.4, 4, 0], [0.8, 8, 36], '#e8e2d6'),
      box([30.4, 4, 0], [0.8, 8, 36], '#e8e2d6'),
      // "paintings" — now genuinely complex artworks
      box([-20, 4, -17.8], [8, 5, 0.4], '#e0533d', { tex: mosaic(['#e0533d', '#ffd23f', '#8a2be2', '#ff6b9d'], 0.7) }),
      box([-9, 4, -17.8], [7, 5, 0.4], '#3d7be0', { tex: stripes(['#3d7be0', '#59c1e8', '#2f5fb0', '#a5e6ba'], 0.6) }),
      box([1, 4.5, -17.8], [6, 6, 0.4], '#ffd23f', { tex: dots(['#ffd23f', '#e0533d', '#2b2b33'], 0.55) }),
      box([10, 3.5, -17.8], [6, 4, 0.4], '#40a86b', { tex: checker(['#40a86b', '#a5e6ba'], 0.5) }),
      box([20, 4, -17.8], [8, 5, 0.4], '#2b2b33', { tex: mosaic(['#2b2b33', '#e8e2d6', '#8a8177'], 0.8) }),
      box([-14, 4, 17.8], [9, 5, 0.4], '#ff6b9d', { tex: mosaic(['#ff6b9d', '#ffd4e9', '#c94f8e', '#8a2be2'], 0.65) }),
      box([4, 4, 17.8], [10, 5, 0.4], '#8a2be2', { tex: stripes(['#8a2be2', '#b569f0', '#5c3a68'], 0.5, true) }),
      box([18, 4, 17.8], [7, 5, 0.4], '#59c1e8', { tex: dots(['#59c1e8', '#f2efe9', '#3d7be0'], 0.5) }),
      // pedestals + sculptures
      box([-16, 1, 0], [3, 2, 3], '#d9d2c7', { climb: true, tex: bricks(['#e5ded3', '#d9d2c7'], 0.6) }),
      cyl([-16, 2.9, 0], 1.2, 1.8, '#e0533d', { tex: stripes(['#e0533d', '#ff8a5c'], 0.35) }),
      box([0, 1.25, -6], [3.4, 2.5, 3.4], '#d9d2c7', { climb: true, tex: bricks(['#e5ded3', '#d9d2c7'], 0.6) }),
      box([0, 3.4, -6], [1.8, 1.8, 1.8], '#3d7be0', { ry: 0.6, tex: checker(['#3d7be0', '#59c1e8'], 0.4) }),
      box([14, 0.9, 4], [3, 1.8, 3], '#d9d2c7', { climb: true, tex: bricks(['#e5ded3', '#d9d2c7'], 0.6) }),
      cyl([14, 2.6, 4], 1.3, 1.6, '#ffd23f', { tex: dots(['#ffd23f', '#e0a03d'], 0.3) }),
      // mosaic rug + benches
      box([0, 0.02, 6], [10, 0.06, 6], '#c94f8e', { tex: mosaic(['#c94f8e', '#e0533d', '#ffd23f', '#3d7be0'], 0.5) }),
      box([-6, 0.4, 8], [4, 0.5, 1.2], '#4a4438', { tex: stripes(['#4a4438', '#5a5448'], 0.4) }),
      box([8, 0.4, -10], [4, 0.5, 1.2], '#4a4438', { tex: stripes(['#4a4438', '#5a5448'], 0.4) }),
      // divider walls to hide behind
      box([22, 2.5, -6], [0.8, 5, 10], '#d9d2c7', { climb: true, tex: stripes(['#d9d2c7', '#cfc8bb'], 1.5) }),
      box([22, 2.5, -6.2], [0.9, 3, 4], '#40a86b', { tex: mosaic(['#40a86b', '#a5e6ba', '#357a52'], 0.5) }),
      box([-24, 2.5, 8], [0.8, 5, 8], '#d9d2c7', { climb: true, tex: stripes(['#d9d2c7', '#cfc8bb'], 1.5) }),
      box([-24, 2.2, 8.2], [0.9, 2.6, 3.4], '#e0a03d', { tex: dots(['#e0a03d', '#8a5a2b'], 0.4) }),
      // column
      cyl([8, 3, 12], 0.8, 6, '#e8e2d6', { climb: true, tex: stripes(['#e8e2d6', '#d9d2c7'], 0.5, true) }),
    ],
  },
};

// ---- pattern texture generation --------------------------------------------

const TEX_PX = 128;
function drawPattern(ctx, kind, colors) {
  const n = TEX_PX;
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, n, n);
  switch (kind) {
    case 'stripes':
      for (let i = 0; i < colors.length; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(0, (n / colors.length) * i, n, n / colors.length);
      }
      break;
    case 'vstripes':
      for (let i = 0; i < colors.length; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect((n / colors.length) * i, 0, n / colors.length, n);
      }
      break;
    case 'checker': {
      ctx.fillStyle = colors[1] || colors[0];
      ctx.fillRect(0, 0, n / 2, n / 2);
      ctx.fillRect(n / 2, n / 2, n / 2, n / 2);
      break;
    }
    case 'bricks': {
      const rows = 4, bw = n / 2, bh = n / rows;
      for (let r = 0; r < rows; r++) {
        for (let cX = -1; cX < 3; cX++) {
          ctx.fillStyle = colors[(r + cX + 10) % colors.length];
          const off = (r % 2) * bw / 2;
          ctx.fillRect(cX * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
        }
      }
      break;
    }
    case 'dots': {
      let k = 1;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = colors[k++ % (colors.length - 1) + 1] || colors[1];
          ctx.beginPath();
          ctx.arc(x * n / 4 + n / 8 + ((y % 2) * n / 8), y * n / 4 + n / 8, n / 11, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'mosaic': {
      // deterministic pseudo-random tiles (seeded), so all clients match
      let seed = 12345;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const t = n / 8;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
          ctx.fillRect(x * t + 0.5, y * t + 0.5, t - 1, t - 1);
        }
      }
      break;
    }
  }
}

function makeTexture(tex, sizeU, sizeV) {
  const c = document.createElement('canvas');
  c.width = c.height = TEX_PX;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  drawPattern(ctx, tex.kind, tex.colors);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const rep = [Math.max(1, Math.round(sizeU / tex.scale)), Math.max(1, Math.round(sizeV / tex.scale))];
  t.repeat.set(rep[0], rep[1]);
  // exact texel color at a raycast UV (repeat-aware)
  const sample = (uv) => {
    const u = ((uv.x * rep[0]) % 1 + 1) % 1;
    const v = ((1 - uv.y) * rep[1] % 1 + 1) % 1;
    const d = ctx.getImageData(Math.min(TEX_PX - 1, u * TEX_PX) | 0, Math.min(TEX_PX - 1, v * TEX_PX) | 0, 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map(x => x.toString(16).padStart(2, '0')).join('');
  };
  return { t, sample };
}

// ---------------------------------------------------------------------------
// Imported GLB worlds. Files live in /maps/<id>.glb (or /maps/<id>/scene.gltf,
// the layout of a Sketchfab auto-converted download). A map only appears in
// the lobby once its file exists on the server. CC-BY credits shown in lobby.
// ---------------------------------------------------------------------------

export const GLB_MAPS = {
  blockville: {
    name: 'Blockville (demo import)',
    credit: 'Built-in demo scene (CC0, ours)',
    sky: '#7fc4e8', fog: '#9fd4ee', sun: [30, 60, 20], ambient: 0.7,
  },
  medieval: {
    name: 'Medieval Village',
    credit: '“Modular Lowpoly Medieval Environment” by Satendra Saraswat — CC-BY via Sketchfab',
    sky: '#a8d0e8', fog: '#b8dcee', sun: [30, 65, 25], ambient: 0.65,
  },
  temple: {
    name: 'Sunrise Temple (heavy)',
    credit: '“Sunrise Temple Environment” by Bl4ckGh0st — CC-BY via Sketchfab',
    sky: '#f7b267', fog: '#e8a05c', sun: [45, 55, 10], ambient: 0.6, heavy: true,
  },
  skatepark: {
    name: 'Undercroft Skatepark (heavy)',
    credit: '“Southbank Undercroft Skatepark” by artfletch — CC-BY via Sketchfab',
    sky: '#9aa4b8', fog: '#8a94a8', sun: [20, 55, 30], ambient: 0.7, heavy: true,
  },
};

export function getMapDef(id) {
  if (MAPS[id]) return { kind: 'boxes', ...MAPS[id] };
  if (GLB_MAPS[id]) return { kind: 'glb', ...GLB_MAPS[id] };
  return { kind: 'boxes', ...MAPS.rooftop };
}

// Which GLB files actually exist on the server right now?
export async function probeGlbMaps() {
  const avail = {};
  await Promise.all(Object.keys(GLB_MAPS).map(async (id) => {
    for (const url of [`maps/${id}.glb`, `maps/${id}/scene.gltf`]) {
      try {
        const r = await fetch(url, { method: 'HEAD' });
        if (r.ok) { avail[id] = url; return; }
      } catch { /* server unreachable — treat as absent */ }
    }
  }));
  return avail;
}

const TARGET_SIZE = 70;      // world meters across the larger horizontal axis
const STEP = 0.55;

export function buildGlbMap(id, url) {
  const def = GLB_MAPS[id];
  const world = {
    kind: 'glb', map: def, group: new THREE.Group(), solids: [], grid: null,
    bounds: { x: 40, z: 30 }, hiderSpawn: [0, 0], seekerSpawn: [0, 0],
    ready: false, onReady: [],
  };

  new GLTFLoader().load(url, (gltf) => {
    const root = gltf.scene;
    // normalize: uniform scale to a playable size, center on origin, floor at 0
    let bb = new THREE.Box3().setFromObject(root);
    const sizeX = bb.max.x - bb.min.x, sizeZ = bb.max.z - bb.min.z;
    const scale = TARGET_SIZE / Math.max(sizeX, sizeZ, 0.001);
    root.scale.setScalar(scale);
    root.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(root);
    root.position.set(
      -(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    root.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(root);

    const meshes = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      o.geometry.boundsTree = new MeshBVH(o.geometry);
      o.userData.normalMat = new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
      o.userData.pick = makeGlbPicker(o);
      meshes.push(o);
    });

    world.group.add(root);
    world.bounds = {
      x: Math.max(5, (bb.max.x - bb.min.x) / 2 - 0.5),
      z: Math.max(5, (bb.max.z - bb.min.z) / 2 - 0.5),
    };
    world.grid = buildColumnGrid(meshes, bb);
    pickSpawns(world);
    world.ready = true;
    world.onReady.forEach(fn => fn(world));
  }, undefined, (err) => console.error('GLB load failed:', id, err));

  return world;
}

// exact texel / vertex-color / material-color picker for an imported mesh
const texCanvasCache = new WeakMap();
function textureCanvas(map) {
  if (texCanvasCache.has(map)) return texCanvasCache.get(map);
  const img = map.image;
  if (!img || !img.width) return null;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const entry = { ctx, w: img.width, h: img.height };
  texCanvasCache.set(map, entry);
  return entry;
}

function makeGlbPicker(mesh) {
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return (uv) => {
    if (mat.map && uv) {
      const t = textureCanvas(mat.map);
      if (t) {
        const u = ((uv.x * mat.map.repeat.x + mat.map.offset.x) % 1 + 1) % 1;
        const v = ((uv.y * mat.map.repeat.y + mat.map.offset.y) % 1 + 1) % 1;
        const py = mat.map.flipY ? (1 - v) : v;
        const d = t.ctx.getImageData(
          Math.min(t.w - 1, u * t.w) | 0, Math.min(t.h - 1, py * t.h) | 0, 1, 1).data;
        return '#' + [d[0], d[1], d[2]].map(x => x.toString(16).padStart(2, '0')).join('');
      }
    }
    return '#' + (mat.color ? mat.color.getHexString() : '888888');
  };
}

/**
 * Column-interval collision: a uniform XZ grid; each cell stores the solid
 * vertical intervals [lo, hi] found by a single all-hits downward raycast
 * (BVH-accelerated). Gives floors, walls, and ceilings for ANY imported mesh.
 */
function buildColumnGrid(meshes, bb) {
  const w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z;
  const cell = Math.max(0.55, Math.max(w, d) / 150);
  const nx = Math.ceil(w / cell), nz = Math.ceil(d / cell);
  const cols = new Array(nx * nz);
  const ray = new THREE.Raycaster();
  ray.firstHitOnly = false;
  const down = new THREE.Vector3(0, -1, 0);
  const origin = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      origin.set(bb.min.x + (ix + 0.5) * cell, bb.max.y + 2, bb.min.z + (iz + 0.5) * cell);
      ray.set(origin, down);
      ray.far = bb.max.y - bb.min.y + 4;
      const hits = ray.intersectObjects(meshes, false);
      // walk hits top→down, pairing top surfaces with the next underside
      const iv = [];
      let curTop = null;
      for (const h of hits) {
        if (!h.face) continue;
        const ny = n.copy(h.face.normal).applyMatrix3(h.object.userData.normalMat).normalize().y;
        if (ny >= -0.05) { if (curTop === null) curTop = h.point.y; }
        else if (curTop !== null) {
          if (curTop - h.point.y > 0.04) iv.push(h.point.y, curTop);
          curTop = null;
        }
      }
      if (curTop !== null) iv.push(bb.min.y - 1, curTop);
      cols[iz * nx + ix] = iv.length ? new Float32Array(iv) : null;
    }
  }

  const colAt = (x, z) => {
    const ix = Math.floor((x - bb.min.x) / cell), iz = Math.floor((z - bb.min.z) / cell);
    if (ix < 0 || iz < 0 || ix >= nx || iz >= nz) return null;
    return cols[iz * nx + ix];
  };

  return {
    cell, bb,
    // highest solid top ≤ yMax (or -Infinity)
    floorBelow(x, z, yMax) {
      const c = colAt(x, z);
      let best = -Infinity;
      if (c) for (let i = 0; i < c.length; i += 2) {
        if (c[i + 1] <= yMax + 1e-4 && c[i + 1] > best) best = c[i + 1];
      }
      return best;
    },
    // lowest solid underside ≥ yMin (or +Infinity) — ceilings
    ceilAbove(x, z, yMin) {
      const c = colAt(x, z);
      let best = Infinity;
      if (c) for (let i = 0; i < c.length; i += 2) {
        if (c[i] >= yMin - 1e-4 && c[i] < best) best = c[i];
      }
      return best;
    },
    // any solid material within the open interval (yLo, yHi)?
    occupied(x, z, yLo, yHi) {
      const c = colAt(x, z);
      if (c) for (let i = 0; i < c.length; i += 2) {
        if (c[i] < yHi && c[i + 1] > yLo) return true;
      }
      return false;
    },
  };
}

function pickSpawns(world) {
  // walkable = a floor below 4m with 2m of clearance above it
  const g = world.grid;
  const walkable = (x, z) => {
    const f = g.floorBelow(x, z, 4);
    return f > -Infinity && f >= -0.5 && !g.occupied(x, z, f + 0.1, f + 2.2) ? f : null;
  };
  const scan = (fromX) => {
    for (let r = 0; r < world.bounds.x; r += 1.5) {
      for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r]]) {
        const x = fromX + dx, z = dz;
        if (Math.abs(x) > world.bounds.x || Math.abs(z) > world.bounds.z) continue;
        if (walkable(x, z) !== null) return [x, z];
      }
    }
    return [0, 0];
  };
  world.hiderSpawn = scan(0);
  world.seekerSpawn = scan(-world.bounds.x * 0.8);
}

/**
 * Build meshes + collision solids for a map.
 * Each mesh gets userData.pick(hitUv) → exact color under the cursor.
 */
export function buildMap(mapId) {
  const map = MAPS[mapId];
  const group = new THREE.Group();
  const solids = [];

  for (const s of map.shapes) {
    let geo, size;
    if (s.type === 'box') {
      geo = new THREE.BoxGeometry(s.s[0], s.s[1], s.s[2]);
      size = s.s;
    } else {
      geo = new THREE.CylinderGeometry(s.r, s.r, s.h, 20);
      size = [s.r * 2, s.h, s.r * 2];
    }

    let mat, pick;
    if (s.tex) {
      const { t, sample } = makeTexture(s.tex, Math.max(size[0], size[2]), size[1] > 0.5 ? size[1] : Math.max(size[0], size[2]));
      mat = new THREE.MeshLambertMaterial({ map: t });
      pick = (uv) => (uv ? sample(uv) : s.tex.colors[0]);
    } else {
      mat = new THREE.MeshLambertMaterial({ color: s.c });
      pick = () => s.c;
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(s.p[0], s.p[1], s.p[2]);
    if (s.rx) mesh.rotation.x = s.rx;
    if (s.ry) mesh.rotation.y = s.ry;
    if (s.rz) mesh.rotation.z = s.rz;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.pick = pick;
    group.add(mesh);

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
  return {
    kind: 'boxes', map, group, solids, grid: null,
    bounds: map.bounds, hiderSpawn: map.hiderSpawn, seekerSpawn: map.seekerSpawn,
    ready: true, onReady: [],
  };
}
