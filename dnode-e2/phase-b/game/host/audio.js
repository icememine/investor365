// Optional WebAudio feedback (D-G5.2). Started on the first user gesture; mute toggle; every failure is caught by
// the caller and shown as a notice. Audio reads events only and can never change game state.
const TONES = {wall: [330, 0.03, 0.04], paddle: [440, 0.06, 0.08], brick: [660, 0.07, 0.08], life: [180, 0.3, 0.12],
  won: [880, 0.5, 0.1], lost: [140, 0.6, 0.12]};

export class Audio {
  constructor() { this.ctx = null; this.muted = false; this.fault = false; try { this.muted = localStorage.getItem('breakout.muted') === '1'; } catch { /* storage blocked */ } }
  unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
  }
  setMuted(m) { this.muted = m; try { localStorage.setItem('breakout.muted', m ? '1' : '0'); } catch { /* ignore */ } }
  play(events) {
    if (this.fault) throw new Error('injected audio fault');
    if (this.muted || !this.ctx || !events.length) return;
    const seen = new Set();
    for (const e of events) {
      const kind = e.startsWith('brick:') ? 'brick' : e;
      if (seen.has(kind) || !TONES[kind]) continue;
      seen.add(kind);
      const [f, dur, vol] = TONES[kind];
      const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = kind === 'life' || kind === 'lost' ? 'triangle' : 'square';
      o.frequency.setValueAtTime(f, t);
      if (kind === 'life' || kind === 'lost') o.frequency.exponentialRampToValueAtTime(f / 2, t + dur);
      if (kind === 'won') o.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    }
  }
}
