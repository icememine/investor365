// D-G3.1 fixed-tick scheduler (host responsibility per R-G2; kit gap: no scheduler ships).
// Integer tick counting from an epoch: due = floor((now - epoch) * hz / 1000) - done.
// Run n = min(due, cap). If due > cap: run cap ticks, discard the excess backlog by re-epoching (epoch := now,
// done := 0). Paused time is consumed by paused (no-op) ticks or discarded by reset(); it never becomes backlog.
// Pure: no DOM, no game knowledge. hz and cap come from the verified browser profile (host.tickHz, maxCatchUpTicks).
export class Scheduler {
  constructor(now, hz = 60, cap = 5) {
    if (!Number.isInteger(hz) || hz <= 0 || !Number.isInteger(cap) || cap <= 0) throw new Error('Scheduler: bad hz/cap');
    this.hz = hz; this.cap = cap; this.reset(now);
  }
  reset(now) { this.epoch = now; this.done = 0; }
  frame(now) {
    const due = Math.floor(((now - this.epoch) * this.hz) / 1000) - this.done;
    if (due > this.cap) {
      this.epoch = now; this.done = 0;
      return {ticks: this.cap, discarded: due - this.cap};
    }
    const ticks = Math.max(0, due);
    this.done += ticks;
    return {ticks, discarded: 0};
  }
}
