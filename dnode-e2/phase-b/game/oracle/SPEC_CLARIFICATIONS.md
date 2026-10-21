# Phase B clarifications (written before any DNode code or output existed)

The oracle (`policy.py`) is written from `handoff/PHASE_A_BP-GAME.md` (D-G4.1 to D-G4.4, D-G5.1 r1 keyboard/mouse,
D-G5.1 r2 touch) plus `OWNER_RULINGS.md`. Where the Phase A text is silent, the Phase B implementer settles the
point here, once, and both the oracle and the DNode roots follow this list. Each item is a Phase B
clarification record (status: chosen by the Phase B implementer; variation: review-required). None of them
changes a value Phase A pinned.

- **C1 Keyboard precedence.** The keyboard is *active* in a tick iff `left or right`. If active,
  `pc := clamp(pc + 80*(right-left), 500, 4300)` (both held gives 0), pointer and touch are ignored for that
  tick, and `ctl.was_down := false` so a finger that is still down re-anchors when the keys are released
  (no jump; same reasoning as the r2 pause re-anchor). `af`/`ap` are left unchanged.
- **C2 Touch over mouse.** If the keyboard is not active and `touch.down`, the r2 relative rule applies
  (anchor on `down and not was_down`; `raw = ap + floor(3*(x-af)/2)`; `t = clamp(raw,500,4300)`;
  if `raw != t` then `ap := t, af := x`; `pc := t`; `was_down := true`). Otherwise `was_down := false` and,
  if `pointer.active`, the r1 mouse rule applies: `pc := clamp(pc + clamp(x - pc, -160, 160), 500, 4300)`.
  Otherwise the paddle does not move.
- **C3 Win state.** On the microstep that makes score 30: phase `won`, `vx = vy = 0`, ball keeps its
  post-collision position. Remaining microsteps do nothing.
- **C4 Events.** `events` is reset to `[]` at the start of every tick. Within a microstep, in order:
  one `"wall"` per wall that reflects (left, right, top order), `"paddle"`, `"brick:<id>"`, `"won"`,
  `"life"`, then `"lost"` if lives reached 0. No other event strings exist.
- **C5 Ignored edges.** `restart` in serve/play is ignored. `action` in play is ignored. In paused, `action`
  is discarded. `pause:"force"` while already paused changes nothing.
- **C6 Pause and resume ticks.** A tick that pauses sets `phase := paused`, `resume := previous phase`,
  `ctl.was_down := false`, `events := []` and changes nothing else. A tick that resumes sets
  `phase := resume`, `events := []` and changes nothing else.
- **C7 Paused tick.** Any other tick in paused returns the state with only `events := []`.
- **C8 Launch tick.** Paddle movement first, then the ball is attached at `(pc,5640)`, then `action`
  sets phase `play` and `v := (+24,-32) if pc < 2400 else (-24,-32)`. No microsteps run on that tick.
- **C9 Velocity invariant.** `(0,0)` in serve, won, lost and in paused with `resume = serve`. In play and in
  paused with `resume = play`, `vx in {+-16,+-24,+-32}` and `vy in {+-24,+-32,+-36}`.
- **C10 InvalidGameState.** `game.tick` refuses `InvalidGameState` (before doing anything) unless:
  30 bricks; `score` = number of `false` bricks; `0 <= lives <= 3`; `500 <= pc <= 4300`;
  `resume in {serve, play}`; `phase = won` iff `score = 30`; `phase = lost` iff `lives = 0`;
  velocities obey C9; in serve (and paused with resume serve) the ball is at `(pc,5640)`;
  in play (and paused with resume play) `60 <= bx <= 4740` and `60 <= by <= 6459`.
  The same predicate is an invariant on every `game.tick` return.
- **C11 Paddle centre-zone sign.** "Sign of the incoming vx" is the sign of `vx` after this microstep's
  wall step (vx is never 0 in play).
- **C12 Shapes.** Input/state shape errors (missing field, `"24"` as text, unknown pause value) are
  `InputShape` faults, raised before any precondition.
- **C13 Paddle in won/lost.** D-G4.4 step 4 (paddle movement) carries no phase guard, so the paddle (and
  `ctl`) keep responding in `won` and `lost`; the ball, bricks, score and lives do not change there.
  Literal reading kept instead of inventing a freeze.
