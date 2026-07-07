// DOM screens, HUD, palette panel, chat.
import { S } from './state.js';
import { MAPS } from './maps3d.js';
import { drawColorWheel, wheelPick, pushRecent } from './paint.js';
import { send } from './net.js';

const $ = (id) => document.getElementById(id);

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
      ? '<b>F</b> palette (frees mouse) · <b>click body</b> paint · <b>Alt+click</b> sample surface · <b>R</b> pose · <b>G</b> fill · <b>Esc</b> free mouse'
      : 'Hold still. Blend. Pray. (You can still move… if you dare.)')
    : role === 'seeker'
      ? '<b>Click</b> shoot paintball · misses waste ammo · ammo regenerates slowly'
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
