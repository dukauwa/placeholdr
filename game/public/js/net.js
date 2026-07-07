// WebSocket client: thin wrapper + message dispatch table.
const handlers = {};
let ws = null;
let queue = [];

export function onMsg(type, fn) { handlers[type] = fn; }

export function connect() {
  return new Promise((resolve, reject) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}`);
    ws.onopen = () => { queue.forEach(m => ws.send(m)); queue = []; resolve(); };
    ws.onerror = (e) => reject(e);
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      const h = handlers[m.t];
      if (h) h(m);
    };
    ws.onclose = () => { if (handlers._close) handlers._close(); };
  });
}

export function send(msg) {
  const data = JSON.stringify(msg);
  if (ws && ws.readyState === 1) ws.send(data);
  else queue.push(data);
}

export function onClose(fn) { handlers._close = fn; }
