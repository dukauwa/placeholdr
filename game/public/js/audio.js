// Tiny WebAudio bleeps — no assets needed.
let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'square', vol = 0.08, slideTo = null) {
  try {
    const a = ac();
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  } catch { /* audio blocked until user gesture — fine */ }
}

export const sfx = {
  shoot: () => tone(220, 0.12, 'square', 0.06, 90),
  splat: () => tone(120, 0.18, 'sawtooth', 0.07, 40),
  tag: () => { tone(660, 0.1); setTimeout(() => tone(440, 0.15), 90); },
  phase: () => { tone(523, 0.12, 'sine', 0.1); setTimeout(() => tone(784, 0.2, 'sine', 0.1), 120); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.1), i * 130)),
  lose: () => [400, 350, 300, 250].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.08), i * 150)),
  jump: () => tone(300, 0.08, 'sine', 0.04, 500),
  pose: () => tone(500, 0.06, 'sine', 0.05),
  pick: () => tone(880, 0.05, 'sine', 0.05),
};
