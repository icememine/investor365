// Canvas renderer (D-G5.2, D-G7). Draws ONLY from a deep-frozen copy of the DNode state plus the static layout
// returned by geo.layout. It never writes to game state; feedback timers are presentation-only host state fed by
// the per-tick `events` list. Generic primitives only: rectangles, rounded rectangles, circles, fills.
export const PALETTE = {
  bg: '#10162a', field: '#141b33', border: '#2a3456',
  rows: ['#e5484d', '#f76b15', '#ffc53d', '#46a758', '#5b7cf0'],
  paddle: '#e8ecf4', paddleFlash: '#ffffff', ball: '#ffffff', hud: '#c9d1e3', life: '#ff5c5c',
};

export function deepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); for (const k of Object.keys(v)) deepFreeze(v[k]); }
  return v;
}

export class Feedback {
  constructor(reducedMotion) { this.reduced = reducedMotion; this.bricks = new Map(); this.paddleAt = -1e9; this.lifeAt = -1e9; this.wallAt = -1e9; }
  ingest(events, now) {
    for (const e of events) {
      if (e.startsWith('brick:')) this.bricks.set(Number(e.slice(6)), now);
      else if (e === 'paddle') this.paddleAt = now;
      else if (e === 'life') this.lifeAt = now;
      else if (e === 'wall') this.wallAt = now;
    }
    for (const [id, t] of this.bricks) if (now - t > 400) this.bricks.delete(id);
  }
  reset() { this.bricks.clear(); this.paddleAt = this.lifeAt = this.wallAt = -1e9; }
}

export class Renderer {
  constructor(canvas, layout) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.layout = layout; this.fault = false;
  }
  resize(cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.style.width = cssW + 'px'; this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.round(cssW * dpr); this.canvas.height = Math.round(cssH * dpr);
    this.cssW = cssW; this.cssH = cssH; this.k = (cssW / this.layout.field_w) * dpr;
  }
  draw(view, fb, now) {
    if (this.fault) {
      view.bx = 0;                               // injected fault: tries to "repair" the ball (frozen: throws)
      throw new Error('injected render fault');
    }
    const {ctx, k, layout: L} = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.field; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);          // logical units from here on
    // bricks
    for (let id = 0; id < L.bricks.length; id++) {
      const r = L.bricks[id], intact = view.bricks[id];
      const t0 = fb.bricks.get(id);
      if (!intact && t0 === undefined) continue;
      let a = 1, s = 1;
      if (!intact) { const p = Math.min(1, (now - t0) / 150); a = 1 - p; s = fb.reduced ? 1 : 1 + 0.25 * p; if (p >= 1) continue; }
      const w = r.x1 - r.x0, h = r.y1 - r.y0, cx = r.x0 + w / 2, cy = r.y0 + h / 2;
      ctx.globalAlpha = a; ctx.fillStyle = intact ? PALETTE.rows[Math.floor(id / 6)] : '#ffffff';
      roundRect(ctx, cx - (w * s) / 2, cy - (h * s) / 2, w * s, h * s, 40); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // paddle
    const flash = !fb.reduced && now - fb.paddleAt < 100;
    ctx.fillStyle = flash ? PALETTE.paddleFlash : PALETTE.paddle;
    roundRect(ctx, view.pc - L.pad_half, L.pad_top, 2 * L.pad_half, L.pad_h, 70); ctx.fill();
    // ball (AABB half-size 60 drawn as a circle of radius 60, A-G3)
    ctx.fillStyle = PALETTE.ball;
    ctx.beginPath(); ctx.arc(view.bx, view.by, L.ball_r, 0, Math.PI * 2); ctx.fill();
    // life-lost edge flash (300 ms); reduced motion: steady tint instead of a flash animation
    const sinceLife = now - fb.lifeAt;
    if (sinceLife < 300) {
      ctx.globalAlpha = fb.reduced ? 0.5 : 0.9 * (1 - sinceLife / 300);
      ctx.strokeStyle = PALETTE.life; ctx.lineWidth = 80; ctx.strokeRect(40, 40, L.field_w - 80, L.field_h - 80);
      ctx.globalAlpha = 1;
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
