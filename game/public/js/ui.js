// DOM screens, HUD, palette panel, chat.
import { S } from './state.js';
import { MAPS } from './maps3d.js';
import { drawColorWheel, wheelPick, pushRecent } from './paint.js';
import { send } from './net.js';

const $ = (id) => document.getElementById(id);

// ---------- platform-aware key names ----------
export const isMac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
export const KEY = {
  alt: isMac ? '⌥ Option' : 'Alt',
  altShort: isMac ? '⌥' : 'Alt',
  ctrl: isMac ? '⌃ Control' : 'Ctrl',
  shift: isMac ? '⇧ Shift' : 'Shift',
};

// ---------- controls overlay ----------
const CONTROLS = () => [
  ['Movement', [
    ['W A S D / arrows', 'Move (click the game first to capture the mouse)'],
    ['Mouse', 'Look around — Esc releases the cursor'],
    [KEY.shift, 'Run'],
    ['Space', 'Jump · press again in air to double-jump'],
    [KEY.ctrl + ' or C', 'Crouch (slower, smaller)'],
  ]],
  ['Climbing', [
    ['Jump at a wall', 'Grab any climbable surface — you hang there (paint away!)'],
    ['W / S', 'Climb up / slide down while hanging'],
    ['W past the top', 'Mantle up onto the ledge'],
    ['Space (on wall)', 'Leap off the wall'],
  ]],
  ['Painting (hiders)', [
    ['F', 'Open / close the palette — frees the mouse'],
    ['Click a surface', 'Grab that exact color (eyedropper)'],
    ['Click your body', 'Paint with the current color'],
    ['Space', 'Quick-pick the color under the cursor (palette open)'],
    [KEY.altShort + '+click / right-click', 'Eyedropper, always'],
    ['Drag empty space', 'Orbit the camera around your body'],
    ['Mouse wheel', 'Brush size (palette open) / camera zoom'],
    ['G / Z / X', 'Fill whole body · undo stroke · clear all paint'],
  ]],
  ['Poses (hiders)', [
    ['R', 'Cycle poses'],
    ['1–7', 'Stand · crouch · ball · T-pose · lie · sit · star'],
  ]],
  ['Seeking', [
    ['Left-click', 'Shoot a paintball from the crosshair'],
    ['', 'Ammo: 6 max, +1 every 4s — misses splat and waste paint'],
  ]],
  ['Other', [
    ['Enter', 'Chat'],
    ['H or ?', 'This controls screen'],
  ]],
];

export function initControlsOverlay() {
  const body = $('controls-body');
  body.innerHTML = CONTROLS().map(([section, rows]) => `
    <h3>${section}</h3>
    <table>${rows.map(([k, desc]) =>
      `<tr><td class="key">${k ? `<kbd>${k}</kbd>` : ''}</td><td>${desc}</td></tr>`).join('')}
    </table>`).join('');
  $('btn-controls-close').onclick = () => toggleControls(false);
  document.querySelectorAll('.btn-show-controls').forEach(b => {
    b.onclick = () => toggleControls(true);
  });
}

export function toggleControls(force) {
  const el = $('screen-controls');
  const show = force !== undefined ? force : el.classList.contains('hidden');
  el.classList.toggle('hidden', !show);
}

export function showScreen(name) {
  for (const s of ['menu', 'lobby', 'blindfold', 'results']) {
    $('screen-' + s).classList.toggle('hidden', s !== name);
  }
  const inGame = name === null;
  $('hud').classList.toggle('hidden', !inGame);
  $('chat').classList.toggle('hidden', name === 'menu');
  if (!inGame) $('palette').classList.add('hidden');
}

// ---------- menu ----------
export function initMenu({ onCreate, onJoin }) {
  const saved = localStorage.getItem('stickmouflage-name');
  if (saved) $('name-input').value = saved;
  const name = () => {
    const n = $('name-input').value.trim() || 'Sticky';
    localStorage.setItem('stickmouflage-name', n);
    return n;
  };
  $('btn-create').onclick = () => onCreate(name());
  $('btn-join').onclick = () => onJoin(name(), $('code-input').value.trim().toUpperCase());
  $('code-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-join').click(); });
}
export function menuError(msg) { $('menu-error').textContent = msg; }

// ---------- lobby ----------
export function initLobby({ onStart, onLeave }) {
  const mapSel = $('set-map');
  mapSel.innerHTML = Object.entries(MAPS)
    .map(([id, m]) => `<option value="${id}">${m.name}</option>`).join('');
  const pushSettings = () => {
    if (S.myId !== S.hostId) return;
    send({
      t: 'settings', mode: $('set-mode').value, map: mapSel.value,
      prepTime: +$('set-prep').value, seekTime: +$('set-seek').value,
    });
  };
  for (const id of ['set-mode', 'set-map']) $(id).onchange = pushSettings;
  for (const id of ['set-prep', 'set-seek']) $(id).oninput = () => { syncSettingLabels(); pushSettings(); };
  $('btn-start').onclick = onStart;
  $('btn-leave').onclick = onLeave;
}

function syncSettingLabels() {
  $('set-prep-val').textContent = $('set-prep').value;
  $('set-seek-val').textContent = $('set-seek').value;
}

export function renderLobby() {
  $('lobby-code').textContent = S.roomCode || '----';
  $('btn-copy-code').onclick = async () => {
    const invite = `Join my STICKMOUFLAGE room! Code: ${S.roomCode} — ${location.origin}`;
    try { await navigator.clipboard.writeText(invite); $('btn-copy-code').textContent = 'Copied!'; }
    catch { $('btn-copy-code').textContent = S.roomCode; }
    setTimeout(() => { $('btn-copy-code').textContent = 'Copy invite'; }, 1600);
  };
  const isHost = S.myId === S.hostId;
  $('lobby-players').innerHTML = [...S.players.values()].map(p =>
    `<li>${p.id === S.hostId ? '<span class="host-star">★</span> ' : ''}${esc(p.name)}${p.id === S.myId ? ' (you)' : ''}</li>`
  ).join('');
  $('lobby-settings').classList.toggle('locked', !isHost);
  $('host-only-note').textContent = isHost ? '' : '(host controls these)';
  $('btn-start').style.display = isHost ? '' : 'none';
  if (S.settings) {
    $('set-mode').value = S.settings.mode;
    $('set-map').value = S.settings.map;
    $('set-prep').value = S.settings.prepTime;
    $('set-seek').value = S.settings.seekTime;
    syncSettingLabels();
  }
}

// ---------- HUD ----------
export function updateHUD() {
  const me = S.me();
  if (!me) return;
  const left = Math.max(0, Math.ceil((S.phaseEndsAt - Date.now()) / 1000));
  const mm = String(Math.floor(left / 60)), ss = String(left % 60).padStart(2, '0');
  $('hud-timer').textContent = `${mm}:${ss}`;
  $('hud-room').textContent = S.roomCode ? `room ${S.roomCode}` : '';
  $('hud-phase').textContent = S.phase === 'prep' ? 'Paint & hide' : S.phase === 'seek' ? 'Seekers hunting' : S.phase;
  const role = me.tagged && S.settings?.mode !== 'infection' ? 'ghost' : me.role;
  $('hud-role').textContent = role === 'seeker' ? 'SEEKER' : role === 'ghost' ? 'GHOST' : 'HIDER';
  $('hud-role').className = role;
  $('blindfold-timer').textContent = `${mm}:${ss}`;

  const showAmmo = me.role === 'seeker' && S.phase === 'seek';
  $('hud-ammo').classList.toggle('hidden', !showAmmo);
  if (showAmmo) $('hud-ammo').textContent = '●'.repeat(S.ammo) + '○'.repeat(Math.max(0, 6 - S.ammo));

  $('hud-hint').innerHTML = role === 'hider'
    ? (S.phase === 'prep'
      ? `<b>F</b> palette · <b>click a surface</b> = grab its color · <b>click your body</b> = paint · <b>R</b> pose · <b>H</b> all controls`
      : 'Hold still. Blend. Pray. (You can still move… if you dare.)')
    : role === 'seeker'
      ? '<b>Click</b> shoot paintball · misses waste ammo · <b>H</b> all controls'
      : 'You got tagged — spectating. WASD fly · Space up · C down.';
}

let toastTimer = null;
export function toast(msg, ms = 2600) {
  const el = $('hud-toast');
  el.textContent = msg;
  el.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = 0; }, ms);
}

// ---------- palette ----------
let lightness = 50;
export function initPalette() {
  const wheel = $('pal-wheel');
  drawColorWheel(wheel, lightness);
  const pick = (ev) => {
    const c = wheelPick(wheel, ev, lightness);
    if (c) setColor(c);
  };
  let dragging = false;
  wheel.addEventListener('mousedown', (e) => { dragging = true; pick(e); });
  window.addEventListener('mousemove', (e) => { if (dragging) pick(e); });
  window.addEventListener('mouseup', () => { dragging = false; });
  $('pal-light').oninput = (e) => { lightness = +e.target.value; drawColorWheel(wheel, lightness); };
  $('pal-size').oninput = (e) => { S.brushSize = +e.target.value; };
  document.querySelectorAll('.pal-tools .tool').forEach(btn => {
    btn.onclick = () => {
      const tool = btn.dataset.tool;
      if (tool === 'brush' || tool === 'eyedrop') setTool(tool);
      else document.dispatchEvent(new CustomEvent('paint-action', { detail: tool }));
    };
  });
}

export function setColor(c) {
  S.brushColor = c;
  $('pal-swatch').style.background = c;
  $('pal-hex').textContent = c;
  pushRecent(c);
  $('pal-recent').innerHTML = S.recentColors
    .map(rc => `<span style="background:${rc}" data-c="${rc}"></span>`).join('');
  document.querySelectorAll('#pal-recent span').forEach(sp => {
    sp.onclick = () => setColor(sp.dataset.c);
  });
}

export function setTool(tool) {
  S.tool = tool;
  document.querySelectorAll('.pal-tools .tool').forEach(b =>
    b.classList.toggle('active', b.dataset.tool === tool));
}

export function togglePalette(force) {
  S.paletteOpen = force !== undefined ? force : !S.paletteOpen;
  const me = S.me();
  if (me && me.role !== 'hider') S.paletteOpen = false;
  $('palette').classList.toggle('hidden', !S.paletteOpen);
}

export function setBrushSizeUI() { $('pal-size').value = S.brushSize; }

// ---------- chat ----------
export function initChat() {
  $('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const msg = $('chat-input').value.trim();
      if (msg) send({ t: 'chat', msg });
      $('chat-input').value = '';
      $('chat-input').blur();
    }
    if (e.key === 'Escape') $('chat-input').blur();
    e.stopPropagation();
  });
}
export function focusChat() { $('chat-input').focus(); }
export function addChat(name, msg) {
  const log = $('chat-log');
  const div = document.createElement('div');
  div.innerHTML = `<span class="cname">${esc(name)}:</span> ${esc(msg)}`;
  log.appendChild(div);
  while (log.children.length > 40) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

// ---------- results ----------
export function showResults(winners, stats) {
  $('results-title').innerHTML = winners === 'seekers'
    ? '🔴 Seekers win — every hider was found!'
    : '⚪ Hiders win — the camouflage held!';
  const rows = stats
    .sort((a, b) => (b.role === 'seeker' ? b.tags : !b.tagged) - (a.role === 'seeker' ? a.tags : !a.tagged))
    .map(p => {
      const outcome = p.role === 'seeker'
        ? `${p.tags} tag${p.tags === 1 ? '' : 's'}`
        : p.tagged ? 'found' : '<span class="win">survived</span>';
      return `<tr><td>${esc(p.name)}</td><td>${p.role}</td><td>${outcome}</td></tr>`;
    }).join('');
  $('results-table').innerHTML = `<tr><th>Player</th><th>Role</th><th>Result</th></tr>${rows}`;
  $('btn-again').style.display = S.myId === S.hostId ? '' : 'none';
  showScreen('results');
}
export function initResults({ onAgain }) { $('btn-again').onclick = onAgain; }

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
