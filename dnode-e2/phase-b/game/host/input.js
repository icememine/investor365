// Input bridge (host responsibility): captures keyboard, mouse and touch, and turns them into the per-tick Input
// record of D-G4.4. Edges (action, pause, restart) go to exactly the first tick of the next batch; levels (left,
// right, pointer, touch) are sampled once per frame and applied to every tick of that batch. No game rule lives
// here: the bridge never moves the paddle, never decides a launch and never reads collision state.
// Touch: D-G5.1 r2 reports the first finger's logical x (floor(cssX/scale)); DNode does the relative-drag math.
// Tap (<=10 CSS px travel and <=300 ms) is an action edge. Mouse: D-G5.1 r1 absolute pointer + click = action.
const KEYS_LEFT = new Set(['ArrowLeft', 'KeyA']);
const KEYS_RIGHT = new Set(['ArrowRight', 'KeyD']);
const KEYS_ACTION = new Set(['Space', 'Enter', 'ArrowUp']);
const KEYS_PAUSE = new Set(['KeyP', 'Escape']);
const KEYS_RESTART = new Set(['KeyR']);
const TAP_MAX_PX = 10, TAP_MAX_MS = 300;

export const NEUTRAL = Object.freeze({left: false, right: false, action: false, pause: 'none', restart: false,
  pointer: Object.freeze({active: false, x: 0}), touch: Object.freeze({down: false, x: 0})});

export class InputBridge {
  constructor({surface, toLogicalX, now = () => performance.now(), getPhase}) {
    this.surface = surface; this.toLogicalX = toLogicalX; this.now = now; this.getPhase = getPhase;
    this.held = new Map();          // code -> true while held (only keys pressed in this session)
    this.stale = new Set();         // keys held across a restart: ignored until released
    this.edges = {action: false, pause: 'none', restart: false};
    this.pointer = {active: false, x: 0};
    this.touch = null;              // {id, x0, y0, t0, maxTravel, x, stale}
    this.lastTouchEnd = 0;
    this.log = [];                  // timestamps of captured events for latency diagnostics (desk)
    this._bind();
  }
  _bind() {
    const s = this.surface;
    addEventListener('keydown', e => this._key(e, true), {passive: false});
    addEventListener('keyup', e => this._key(e, false), {passive: false});
    addEventListener('blur', () => { this.held.clear(); });
    s.addEventListener('pointerdown', e => this._down(e), {passive: false});
    addEventListener('pointermove', e => this._move(e), {passive: false});
    addEventListener('pointerup', e => this._up(e, false), {passive: false});
    addEventListener('pointercancel', e => this._up(e, true), {passive: false});
    s.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') this.pointer.active = false; });
    // Scroll/zoom guards (G02): non-passive touch handlers on the surface and the document.
    const stop = e => { if (e.cancelable) e.preventDefault(); };
    s.addEventListener('touchstart', stop, {passive: false});
    s.addEventListener('touchmove', stop, {passive: false});
    document.addEventListener('touchmove', stop, {passive: false});
    document.addEventListener('gesturestart', stop, {passive: false});
    s.addEventListener('contextmenu', stop);
    s.addEventListener('dblclick', stop);
    addEventListener('wheel', e => { if (e.target.closest?.('#surface')) stop(e); }, {passive: false});
  }
  _typing(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'); }
  _key(e, down) {
    if (this._typing(e)) return;
    const c = e.code;
    const known = KEYS_LEFT.has(c) || KEYS_RIGHT.has(c) || KEYS_ACTION.has(c) || KEYS_PAUSE.has(c) || KEYS_RESTART.has(c);
    if (!known) return;
    if (e.target?.tagName === 'BUTTON' && (c === 'Space' || c === 'Enter')) return; // let focused buttons work
    e.preventDefault();                       // arrows/space must never scroll the page
    if (!down) { this.held.delete(c); this.stale.delete(c); return; }
    this.log.push(this.now());
    if (KEYS_LEFT.has(c) || KEYS_RIGHT.has(c)) {
      if (!this.stale.has(c)) this.held.set(c, true);
      this.pointer.active = false;            // keyboard user: mouse resting on the field stops steering
      return;
    }
    if (e.repeat) return;                     // auto-repeat never makes extra edges
    if (KEYS_ACTION.has(c)) this.edges.action = true;
    else if (KEYS_PAUSE.has(c)) this.edges.pause = this.edges.pause === 'force' ? 'force' : 'toggle';
    else if (KEYS_RESTART.has(c)) this.edges.restart = true;
  }
  _down(e) {
    if (e.target.closest('button')) return;
    if (e.cancelable) e.preventDefault();
    this.log.push(this.now());
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      this.pointer = {active: true, x: this.toLogicalX(e.clientX)};
      this.edges.action = true;
      return;
    }
    if (this.touch) return;                   // only the first finger is tracked
    try { this.surface.setPointerCapture(e.pointerId); } catch { /* not fatal */ }
    this.touch = {id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: this.now(), maxTravel: 0, x: this.toLogicalX(e.clientX), stale: false};
  }
  _move(e) {
    if (e.pointerType === 'mouse') {
      const r = this.surface.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) this.pointer = {active: true, x: this.toLogicalX(e.clientX)};
      return;
    }
    const t = this.touch;
    if (!t || e.pointerId !== t.id) return;
    if (e.cancelable) e.preventDefault();
    t.maxTravel = Math.max(t.maxTravel, Math.hypot(e.clientX - t.x0, e.clientY - t.y0));
    t.x = this.toLogicalX(e.clientX);
  }
  _up(e, cancelled) {
    if (e.pointerType === 'mouse') return;
    const t = this.touch;
    if (!t || e.pointerId !== t.id) return;
    if (!cancelled && !t.stale && t.maxTravel <= TAP_MAX_PX && this.now() - t.t0 <= TAP_MAX_MS) {
      this.edges.action = true;
      this.log.push(this.now());
    }
    this.touch = null; this.lastTouchEnd = this.now();
  }
  // Host-level pause request (visibility change, pause button).
  requestPause(kind) { this.edges.pause = kind === 'force' || this.edges.pause === 'force' ? 'force' : 'toggle'; }
  requestRestart() { this.edges.restart = true; }
  requestAction() { this.edges.action = true; }
  levels() {
    let left = false, right = false;
    for (const c of this.held.keys()) { if (KEYS_LEFT.has(c)) left = true; if (KEYS_RIGHT.has(c)) right = true; }
    const t = this.touch && !this.touch.stale ? {down: true, x: this.touch.x} : {down: false, x: 0};
    return {left, right, pointer: {...this.pointer}, touch: t};
  }
  // Inputs for a batch of n ticks: edges on the first tick only; levels on all. Edges persist until a tick runs.
  sample(n) {
    if (n <= 0) return [];
    const lv = this.levels();
    const out = [];
    for (let k = 0; k < n; k++) {
      const first = k === 0;
      out.push({left: lv.left, right: lv.right, action: first && this.edges.action, pause: first ? this.edges.pause : 'none',
        restart: first && this.edges.restart, pointer: {...lv.pointer}, touch: {...lv.touch}});
    }
    this.edges = {action: false, pause: 'none', restart: false};
    return out;
  }
  // After a restart: clear queued edges and the held-key map; keys still physically held are ignored until released
  // and pressed again; a finger still down must lift and touch again; the mouse must move again.
  clearSession() {
    for (const c of this.held.keys()) this.stale.add(c);
    this.held.clear();
    this.edges = {action: false, pause: 'none', restart: false};
    if (this.touch) this.touch.stale = true;
    this.pointer = {active: false, x: 0};
  }
}
