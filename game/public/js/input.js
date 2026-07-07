// Keyboard + mouse state. Bindings live here so they're easy to tweak.
export const input = {
  left: false, right: false, up: false, down: false,
  run: false, jumpPressed: false,
  mouseX: 0, mouseY: 0, mouseDown: false, rightDown: false, alt: false,
};

const listeners = { pose: [], poseSet: [], palette: [], tool: [], chat: [], fill: [], undo: [], clear: [], scoreboard: [], shoot: [] };
export function on(evt, fn) { listeners[evt].push(fn); }
const emit = (evt, arg) => listeners[evt].forEach(fn => fn(arg));

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
      if (e.key === 'Enter' || e.key === 'Escape') emit('chat', 'blur');
      return;
    }
    switch (e.code) {
      case 'KeyA': case 'ArrowLeft': input.left = true; break;
      case 'KeyD': case 'ArrowRight': input.right = true; break;
      case 'KeyW': case 'ArrowUp': input.up = true; if (!e.repeat) input.jumpPressed = true; break;
      case 'Space': if (!e.repeat) input.jumpPressed = true; input.up = true; e.preventDefault(); break;
      case 'KeyS': case 'ArrowDown': input.down = true; break;
      case 'ShiftLeft': case 'ShiftRight': input.run = true; break;
      case 'KeyR': if (!e.repeat) emit('pose'); break;
      case 'KeyF': if (!e.repeat) emit('palette'); break;
      case 'KeyE': if (!e.repeat) emit('tool', 'eyedrop'); break;
      case 'KeyB': if (!e.repeat) emit('tool', 'brush'); break;
      case 'KeyG': if (!e.repeat) emit('fill'); break;
      case 'KeyZ': if (!e.repeat) emit('undo'); break;
      case 'KeyX': if (!e.repeat) emit('clear'); break;
      case 'Enter': emit('chat', 'focus'); e.preventDefault(); break;
      case 'Tab': emit('scoreboard', true); e.preventDefault(); break;
      default:
        if (/^Digit[1-8]$/.test(e.code) && !e.repeat) emit('poseSet', +e.code.slice(5) - 1);
    }
    if (e.altKey) input.alt = true;
    if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyA': case 'ArrowLeft': input.left = false; break;
      case 'KeyD': case 'ArrowRight': input.right = false; break;
      case 'KeyW': case 'ArrowUp': input.up = false; break;
      case 'Space': input.up = false; break;
      case 'KeyS': case 'ArrowDown': input.down = false; break;
      case 'ShiftLeft': case 'ShiftRight': input.run = false; break;
      case 'Tab': emit('scoreboard', false); break;
    }
    if (!e.altKey) input.alt = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    input.mouseX = e.clientX; input.mouseY = e.clientY;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouseDown = true; emit('shoot', e); }
    if (e.button === 2) input.rightDown = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouseDown = false;
    if (e.button === 2) input.rightDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => {
    input.left = input.right = input.up = input.down = input.run = input.mouseDown = false;
  });
}
