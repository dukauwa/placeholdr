// Keyboard + pointer-lock mouse input.
export const input = {
  fwd: false, back: false, left: false, right: false,
  run: false, runLock: false, jumpPressed: false, down: false, crouch: false,
  mouseX: 0, mouseY: 0,
};
let lastFwdTap = 0;

const listeners = {
  pose: [], poseSet: [], palette: [], tool: [], chat: [], fill: [],
  undo: [], clear: [], scoreboard: [], click: [], look: [],
  quickpick: [], controls: [],
};
export function on(evt, fn) { listeners[evt].push(fn); }
const emit = (evt, arg) => listeners[evt].forEach(fn => fn(arg));

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
      if (e.key === 'Enter' || e.key === 'Escape') emit('chat', 'blur');
      return;
    }
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':
        if (!e.repeat && !input.fwd) {          // double-tap forward = sprint
          const now = performance.now();
          if (now - lastFwdTap < 280) input.runLock = true;
          lastFwdTap = now;
        }
        input.fwd = true;
        break;
      case 'KeyS': case 'ArrowDown': input.back = true; break;
      case 'KeyA': case 'ArrowLeft': input.left = true; break;
      case 'KeyD': case 'ArrowRight': input.right = true; break;
      case 'Space':
        if (!e.repeat) emit('quickpick');   // palette open → eyedrop under cursor
        if (!e.repeat) input.jumpPressed = true;
        e.preventDefault();
        break;
      case 'KeyC': input.down = true; break;
      case 'ControlLeft': case 'ControlRight': input.crouch = true; break;
      case 'ShiftLeft': case 'ShiftRight': input.run = true; break;
      case 'KeyR': if (!e.repeat) emit('pose'); break;
      case 'KeyF': if (!e.repeat) emit('palette'); break;
      case 'KeyE': if (!e.repeat) emit('tool', 'eyedrop'); break;
      case 'KeyB': if (!e.repeat) emit('tool', 'brush'); break;
      case 'KeyG': if (!e.repeat) emit('fill'); break;
      case 'KeyZ': if (!e.repeat) emit('undo'); break;
      case 'KeyX': if (!e.repeat) emit('clear'); break;
      case 'KeyH': if (!e.repeat) emit('controls'); break;
      case 'Slash': if (!e.repeat && e.shiftKey) emit('controls'); break;   // "?"
      case 'Enter': emit('chat', 'focus'); e.preventDefault(); break;
      case 'Tab': emit('scoreboard', true); e.preventDefault(); break;
      default:
        if (/^Digit[1-7]$/.test(e.code) && !e.repeat) emit('poseSet', +e.code.slice(5) - 1);
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': input.fwd = false; input.runLock = false; break;
      case 'KeyS': case 'ArrowDown': input.back = false; break;
      case 'KeyA': case 'ArrowLeft': input.left = false; break;
      case 'KeyD': case 'ArrowRight': input.right = false; break;
      case 'KeyC': input.down = false; break;
      case 'ControlLeft': case 'ControlRight': input.crouch = false; break;
      case 'ShiftLeft': case 'ShiftRight': input.run = false; break;
      case 'Tab': emit('scoreboard', false); break;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    input.mouseX = e.clientX; input.mouseY = e.clientY;
    if (document.pointerLockElement === canvas) {
      emit('look', { dx: e.movementX, dy: e.movementY });
    }
  });
  canvas.addEventListener('mousedown', (e) => emit('click', e));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => {
    input.fwd = input.back = input.left = input.right = input.run =
      input.down = input.crouch = false;
  });
}
