# Submission — BP-GAME — Claude Opus 5.5 (claude-opus-5-5), fresh subagent session, 2026-10-21

Phase: **A** (interpretation and continuation). No application was built.

Prior exposure: this Phase A ran as a fresh subagent session on 2026-10-21, with no earlier conversation about this experiment. One session ran per application, launched in the order shop, game, batch, and the three ran in parallel. I have not seen any earlier DNode build in this session. Earlier DNode builds, including an E1 shop/game/batch package, were written by Claude sessions, so the underlying model family may have seen this material before. The only earlier game builds I know of are the ones described in the package (STRUCTURE §14.2: Astra uses a catch-up cap of 5, Fable a cap of 3). The kit's `generated/SEMANTICS.md` describes game geometry, and that geometry appears to come from an earlier reference build. I adopted parts of it on purpose (see D-G4.1) and say so wherever I do.

Identities (all hashes are SHA-256 and were checked in this session; see Evidence):
- candidate.zip `3e1868a12bd35bcf94f279fbd51f1d4555bf02b4f5f27a08541326a0d3db39d8`. Its extracted contents are byte-identical to `package/`.
- BP-GAME.md `7b3e9f2154c1625c5b399db2c4581596f29b91f4d4ce436a39b218830560e0c8`. STRUCTURE 211020261208 `e7ec29d0…0951`. COMMON `46f358ec…a0e6`. CHALLENGES `92d01eec…dfe6`. All 10 MANIFEST entries match.
- dnode-e1-kit.zip `141331a5c76807da3b99ffb19cb1507d3a9acad6b00d4f8cee13b91a199a5633`. Kit specification 201020261730.
- Runtime identity `fd854bcb708f3031824b14819fe126b0be96b241ced19416035b6f49d4d7c55e`.
- Prelude root `8e199f2776bb9c4ec44b3a435b4c70744748c42b784c646f77d2847c41e99dde`.
- browser profile `browser-e1`, file hash `cda00518bb6155832ad8bbd82392f0230ca8b0c3f957ba8409cfcecd5dfd17f7`.
- SEMANTICS.md `4d1120190273948d8233c647942bdd556f55409bc89ce280b8111fba4df2be39`.
- Trust-key fingerprint `4c7716c7…0244`. This value came only from inside the kit; I did not receive an independently supplied fingerprint.

---

## Purpose in my own words

Someone who has never played this version picks up the game and is playing Breakout in seconds, with no explanation. They should always be able to see the ball, the paddle and the remaining bricks. The paddle should go where they mean it to go. Every hit, miss and life lost should look like a consequence of the rules, never of glitches or timing hiccups. Progress should be visible as the brick field empties, and clearing it should feel like an earned win.

Behind that experience, DNode owns the authoritative game: one integer-only, replayable function from (state, per-tick input) to state. The host only captures input, schedules ticks, draws and plays sounds. Because of that split, correctness (G03–G05) can be checked by machine. Experience (G01, G02, G06) needs real people on real devices.

## What is fixed, chosen, assumed and unresolved

| Record | Classification | Authority/source | Implication for this submission |
|---|---|---|---|
| P-G | required purpose | Inherited from E1 (human) | Every decision below cites it. |
| D-G1: 30 bricks (5×6), 3 lives, 1 point per brick, no upgrades or randomness | chosen/**fixed** | E1 policy, fixed for the comparison | Preserved. Score is the removed-brick count, win at 30, lose at 0 lives. |
| D-G2: logic in DNode; the renderer never repairs state | required/**fixed** | BP-GAME | Collisions, score, lives and phases all run in DNode. The host gets a frozen read-only projection (D-G7). |
| D-G3: 60 ticks/s, at most 5 catch-up ticks per host frame, excess backlog discarded, paused time discarded | chosen/**fixed** (E2 shared experimental choice) | BP-GAME. Matches browser profile `host.tickHz=60`, `maxCatchUpTicks=5` | Implemented in author host code (D-G3.1), because the kit ships no scheduler (Gap 1). |
| D-G4: dimensions, velocities, collision geometry, ties, tunneling | unresolved/**delegated** to the author | BP-GAME | Resolved by my records D-G4.1–D-G4.4 below. |
| D-G5: control placement, colours, feedback, audio | unresolved/**delegated** | BP-GAME | Resolved by D-G5.1 and D-G5.2. D-G5.1 is revised by G-C1. |
| A-G1: the device/browser supports the pointer/keyboard bridge | assumed/**verify** | BP-GAME | Still an assumption. Response must be measured on recorded devices. |
| Environment: viewports 390×844 and 1280×800, with the actual device/browser recorded | required comparison condition | COMMON | My layouts target both sizes. Nothing has been measured. |
| Kernel K01–K12 as implemented, strict checking, exact integers, no recursion, `map/filter/fold` with literal names, `maxOperations` 10,000,000 per call | required substrate | Kit generated reference and runtime | Game nodes must fit within these limits. Fixed-count loops use `fold`/`filter` over `range`. |
| SEMANTICS.md "Game:" paragraph (4800×6400, paddle, ball 60, 4 microsteps, AABB, walls→paddle→brick, lowest brick ID) | **ambiguous authority**. It is in the signed kit but conflicts with D-G4 being delegated. | Kit | I treat it as a reference description, not a binding, because no game root or checker enforces it. I *chose* to adopt its compatible parts, and say which (D-G4.1, D-G4.3). This is reported as Gap 3. |
| `bounded.clamp` (prelude) | available shared root | Kit, attested public entry | Reused for paddle bounds, as SHARED_LIBRARY 6.1 intends. |
| Collision/pacing policy as a language rule | not inherited | STRUCTURE §14.2 | Breakout collision stays an application root and is not promoted. |

Assumptions I add:
- **A-G2:** The host may implement scheduling, event capture and rendering. Input reaches DNode only as typed node arguments, because the profile has no event bridge. Verify by re-reading the profile when the kit is updated.
- **A-G3:** A renderer can draw the 120×120 AABB ball as a circle of radius 60 without seeming unfair. The worst-case gap is about 25 units, which is 2.5 px at reference scale or 1.9 px on a 390-wide phone. Verify in G06.
- **A-G4:** One `game.tick` call fits comfortably inside a 16.7 ms frame in the interpreter, including 5 catch-up calls. This is a prediction, not measured.

Unresolved items, each with the smallest missing piece:
- **U-G1:** Human reviewers, devices and browsers for G01/G02/G06. Missing: a named reviewer list and device inventory.
- **U-G2:** Performance targets. BP-GAME says to fix them before timed measurement, but none are given. Missing: a target per recorded device, or an explicit "measure only, no threshold".
- **U-G3:** Whether the SEMANTICS.md game paragraph binds authors. Missing: a one-line ruling from the owner.

## My decisions and reasons

Logical frame: x points right, y points down, in integer units, with field (0,0)–(4800,6400). The reference scale is 10 units per CSS px, but rendering scale is independent. Overlap is **strict**: ball box [bx−60, bx+60]×[by−60, by+60] overlaps rectangle [x0,x1]×[y0,y1] iff `bx+60>x0 ∧ bx−60<x1 ∧ by+60>y0 ∧ by−60<y1`. Touching edges never collide.

### D-G4.1 — Geometry (status: chosen; variation: review-required; revision r1)
- **Choice:**
  - Field: 4800×6400.
  - Paddle: width 1000 and height 140, occupying y 5700–5840. Its centre `pc` is in [500,4300] and starts at 2400, kept in range with `bounded.clamp`.
  - Ball: an AABB with half-size 60 (radius 60 for drawing).
  - Bricks: id = 6r+c, with r∈0..4 and c∈0..5. Each brick spans x0=200+740c, x1=x0+700 and y0=800+280r, y1=y0+240. So the columns are 200–900, 940–1640, 1680–2380, 2420–3120, 3160–3860 and 3900–4600, and the rows are 800–1040, 1080–1320, 1360–1600, 1640–1880 and 1920–2160.
- **Purpose refs:** P-G, G01, G03, G06.
- **Reason:**
  - The field, paddle and ball values are the kit-documented ones, so traces stay comparable with other authors.
  - Brick gaps of 40 are smaller than the 120 ball box, so the ball can never slip between bricks. That avoids a "missed" collision that would look unfair.
  - The 200-unit side channels and the 800-unit top gap keep the classic behaviour where the ball can get behind the bricks.
  - At 390 px wide (scale ≈0.0746), a brick is about 52×18 CSS px and the paddle about 75×10 CSS px, which I predict is readable.
- **Assumptions:** A-G3. Portrait 3:4 field.
- **Tradeoffs:** A 3:4 field leaves vertical room on phones for a touch strip, but wastes width on desktop. The AABB ball is cheap and exact in integers but not circle-accurate at corners.
- **Responsibility (proposed):** root `breakout.geometry` (consts plus `brick.rect(id)`).
- **Acceptance:** G03 traces built on these coordinates, plus G06 readability ratings at 390×844 and 1280×800.
- **Variation:** Any change is review-required. It gets a new identity and requires rerunning all G03/G05 traces.

### D-G4.2 — Velocities, launch, paddle deflection (chosen; review-required; r1)
- **Choice:**
  - Components are integers per tick that are multiples of 4: vx ∈ {±16, ±24, ±32} and vy ∈ {±24, ±32, ±36}. Each tick has 4 microsteps of exactly v/4, so the per-microstep step is at most 9 units. That stays inside the kit's ≤40/tick, ≤10/step envelope.
  - **Launch** happens on an `action` edge in phase `serve`: v = (+24, −32) if pc < 2400, otherwise (−24, −32). So the ball launches toward the more open side, and the initial launch at pc=2400 goes up-left. The ball starts moving on the *next* tick.
  - **Paddle bounce:** let d = nx − pc at the hit microstep, with d in [−559, 559]. Then:
    - d ≤ −301 → (−32, −24)
    - −300 ≤ d ≤ −101 → (−24, −32)
    - −100 ≤ d ≤ 100 → (s·16, −36), where s is the sign of the incoming vx
    - 101 ≤ d ≤ 300 → (24, −32)
    - d ≥ 301 → (32, −24)
  - Walls and bricks only negate one component. Speed is constant apart from the zone choice. There is no speed-up rule.
- **Purpose refs:** P-G (familiar, fair, controllable), G03, G06.
- **Reason:**
  - Five discrete zones give the player visible aim control without fractions.
  - |vy| ≥ 24 means the ball never crawls horizontally, and vx ≠ 0 means it never sticks vertically.
  - Using sign(vx) in the centre zone means a centre hit continues the ball's direction, which is predictable.
  - Rejecting a speed-up rule avoids a new rule system (D-G1).
- **Assumptions:** The pace is acceptable. A full-height traversal takes 3.0–4.4 s, and the gap from the bricks to the paddle about 1.6–2.5 s (predicted from 3540/vy/60). This is the biggest experience risk, and G06 must judge it.
- **Tradeoffs:** The pace is slower than some arcade Breakouts, but it stays inside the documented tunneling envelope and is easier for a first-time player.
- **Responsibility (proposed):** `breakout.physics.paddle_bounce` and `breakout.game.launch`.
- **Acceptance:** Zone-boundary traces (d = ±100/101, ±300/301, ±559/560) and G06.
- **Variation:** review-required. A successor may raise speeds up to the ≤10/step envelope only with a new identity, rerun traces and a new G06 session.

### D-G4.3 — Collision order, tie rule, tunneling (chosen; fixed for this submission once traces exist; changes review-required; r1)
- **Choice (per microstep k = 0..3, only while phase = play):**
  1. Move: (nx, ny) = (bx + vx/4, by + vy/4). Call the start-of-microstep position (px, py).
  2. Walls, in this order:
     - left: if nx−60 < 0, then nx := 60 and vx := |vx|
     - right: if nx+60 > 4800, then nx := 4740 and vx := −|vx|
     - top: if ny−60 < 0, then ny := 60 and vy := |vy|
  3. Paddle: if vy > 0 and py+60 ≤ 5700 < ny+60 and nx+60 > pc−500 and nx−60 < pc+500, then ny := 5640 and v := the zone vector from D-G4.2. This is a top-line crossing test only. The paddle has no side faces, so a ball already below the top line cannot be caught.
  4. Brick: let I be the intact bricks that the moved ball overlaps. If I is non-empty, take **only the lowest id** b.
     - **Vertical response** if py ≤ y0(b)−60 or py ≥ y1(b)+60, meaning the previous centre was outside b's expanded vertical interval. Then: if vy < 0, ny := y1+60; otherwise ny := y0−60. Negate vy.
     - **Horizontal response** otherwise. Then: if vx > 0, nx := x0−60; otherwise nx := x1+60. Negate vx.
     - Mark b removed and add 1 to the score. **A diagonal corner entry, where both axes are newly overlapping, therefore takes the vertical response.** Any other overlapped brick is examined on the next microstep with the same rule.
  5. If score = 30, the phase becomes `won`.
  6. If ny−60 ≥ 6400 (the ball is fully below the field), lives := lives−1. The phase becomes `lost` if lives = 0, otherwise `serve`, with the ball re-attached at (pc, 5640) and v = (0, 0).
  7. Once the phase is no longer `play`, the remaining microsteps of the tick do nothing.
- **Tunneling policy:** collision is discrete overlap testing at every microstep, with steps of at most 9 units per axis.
  - To skip an obstacle without ever overlapping it, a step must exceed the obstacle's extent plus 120. That means at least 360 for a brick vertically, at least 820 horizontally, and at least 260 for the paddle. With 9-unit steps this cannot happen.
  - The paddle test is a continuous line-crossing test, and walls are half-plane tests. **Therefore no required collision can be silently missed.** This argument is predicted, and the high-speed traces must confirm it.
  - Any loop with no brick hit must pass through the paddle region, so there is no autonomous infinite loop.
- **Purpose refs:** G03, G05, P-G ("fair").
- **Reason:**
  - The walls → paddle → brick order and the lowest-id choice match the kit's documented order, which aids comparison.
  - Removing one brick per microstep keeps "one hit, one brick" readable. It also avoids the double-negation that "resolve all overlaps" causes at a brick joint, where the ball would continue straight through.
  - Snapping is exact in integers and leaves the ball not overlapping the obstacle it hit.
- **Assumptions:** A-G3. A loss of up to 9 units of travel per snap is imperceptible (under 1 px).
- **Tradeoffs:**
  - Lowest-id is biased toward upper-left bricks in a tie, rather than the brick with the most overlap.
  - With no paddle side faces, a ball that grazes the paddle side passes through it visually. This is rare, and G06 should note it.
  - In "pocket" cases a second brick can remain overlapped for one microstep (1/240 s).
- **Responsibility (proposed):** root `breakout.physics` (`physics.microstep`, `physics.walls`, `physics.paddle`, `physics.brick_hit`, using `filter` over `range 30`).
- **Acceptance:** G03 traces checked against an independently written oracle, as in G-T3.
- **Variation:** Fixed in this submission. Changes are review-required, and every G03/G05 trace must be rerun.

### D-G4.4 — Phase machine and input semantics (chosen; fixed; r1)
- **Phases:** `serve`, `play`, `paused`, `won`, `lost`. The initial state is `serve` with lives 3, score 0, all 30 bricks intact, pc 2400, ball (2400, 5640), v (0, 0), `resume = serve`, and no events.
- **Per-tick input record:** `{left:Bool, right:Bool, action:Bool, pause:"none"|"toggle"|"force", restart:Bool, pointer:{active:Bool, x:Int}}`.
  - `action`, `pause` and `restart` are **edges**. The host delivers each edge to exactly one tick: the first tick of the next batch. Several presses of the same kind before a tick count as one. Keyboard auto-repeat is ignored.
  - `left`, `right` and `pointer` are **levels**, sampled once per frame and applied to every tick in that frame's batch.
- **Order within a tick:**
  1. `restart` (honoured only in paused/won/lost), or `action` in won/lost → return exactly `game.initial()`. Nothing else happens that tick.
  2. Pause: `toggle` pauses from serve/play (storing `resume`) or resumes from paused. `force` only pauses. In won/lost it is ignored. A tick that pauses or resumes does no gameplay update.
  3. Paused → return the state with the gameplay projection unchanged and events = []. Other edges are discarded, not queued.
  4. Paddle movement (D-G5.1).
  5. In serve: the ball is attached at (pc, 5640), and `action` launches (D-G4.2).
  6. In play: four microsteps (D-G4.3).
- **Gameplay projection** Gp(s) = (pc, bx, by, vx, vy, bricks, score, lives, resume). Control fields and per-tick `events` (`brick:<id>`, `paddle`, `wall`, `life`, `won`, `lost`) are not gameplay.
- **Invariants on every return:**
  - score = number of removed bricks
  - 0 ≤ lives ≤ 3
  - pc ∈ [500, 4300]
  - in play, the ball does not overlap the walls
  - won ⇔ score = 30
  - lost ⇔ lives = 0
  - velocities are in the D-G4.2 set, or (0, 0) outside play
- **Refs:** BP-GAME behaviour bullets, G03, G04, G05.
- **Reason:** These rules make "one life per exit", "relaunch needs explicit action", "pause freezes" and "restart is exactly initial" checkable by state equality.
- **Variation:** Fixed. These rules are mostly inherited and only made precise here.

### D-G3.1 — Host tick scheduler (chosen to implement fixed D-G3; fixed; r1)
- On each animation frame: `due = floor((now − epoch)·60/1000) − done`. Run `n = min(due, 5)` ticks. If `due > 5`, set epoch := now and done := 0, which discards the excess backlog. Otherwise done += n.
- The host keeps ticking at 60 Hz while paused. Paused ticks are gameplay no-ops, so paused time is consumed and never becomes backlog.
- On `visibilitychange` to hidden, the host enqueues `pause:"force"` if the phase is serve or play. On becoming visible, epoch := now and done := 0.
- `restart` clears the pending edges and the held-key map, and held keys are ignored until they are pressed again. This clears input queued from the previous session.
- **Reason:** It is drift-free because it is integer tick counting from an epoch, and it gives exactly D-G3's observable behaviour.
- **Responsibility:** proposed `host/scheduler.js`.
- **Acceptance:** a scheduler fixture of synthetic timestamps → expected tick counts (G04), plus device measurement.
- **Gap:** the kit supplies no scheduler (Gap 1).

### D-G5.1 r1 — Controls, first response, preserved (chosen; review-required)
- **Keyboard:** ←/→ or A/D move the paddle 80 units/tick, so a full traverse takes 47.5 ticks (about 0.8 s). Holding both moves nothing. Keyboard input takes precedence over the pointer for that tick. Space, Enter or ↑ is `action`. P or Esc is `pause:toggle`. R is `restart`.
- **Pointer** (mouse and touch, both **absolute**): the target is the pointer's logical x over the field or the strip below it. The paddle moves toward the target by at most 160 units/tick, then is clamped.
- **Touch tap** (≤10 CSS px of travel and ≤300 ms, classified by the host) is `action`.
- **Visible controls:**
  - A pause button at top-right, at least 48×48 CSS px.
  - A serve-time overlay reading "← → or drag to move · Space or tap to launch", shown whenever the phase is serve.
  - A "Play again" button in won/lost.
- **Scroll protection:**
  - The game surface uses `touch-action:none`, `overscroll-behavior:none`, `user-select:none` and `-webkit-touch-callout:none`.
  - Non-passive `touchmove` events call preventDefault, and the context menu is suppressed.
  - The body is 100dvh with overflow hidden.
- **Refs:** G01, G02, G06.
- **Reason:** These are familiar mappings, and one pointer rule covers both mouse and touch.
- **Tradeoff:** On a phone, absolute touch puts the finger over the paddle and ball, and the 160 cap makes the paddle lag behind the finger. These are the known risks, and G-C1 addresses them.

### D-G5.2 — Visual, feedback, audio (chosen; freely variable within constraints)
- **Palette:**
  - background #10162a
  - brick rows: #e5484d, #f76b15, #ffc53d, #46a758, #5b7cf0
  - paddle #e8ecf4
  - ball #ffffff
  - HUD #c9d1e3
  - Computed WCAG non-text contrast against the background is 4.59 to 17.95. This is a formula result, not a human judgement.
- **HUD** above the field: "Bricks n/30" and the lives as icons with a number.
- **Non-audio feedback for every event:**
  - Brick: 150 ms fade/scale-out.
  - Paddle: 100 ms flash.
  - Life lost: 300 ms red edge flash and a pulse on the lives icon.
  - Win: "You cleared all 30 bricks!" and Play again.
  - Lose: "Out of lives" and Play again.
  - `prefers-reduced-motion` disables scaling and flashes, leaving colour changes only.
  - There is no screen shake.
- **Audio:** optional WebAudio beeps, started on the first user gesture, with a mute toggle. Audio failures are caught and ignored.
- **Layout:**
  - Field fitted to the viewport. At 390×844 that is about 358×477 CSS px, with a strip of about 250 px below it.
  - At 1280×800 it is about 540×720 px.
- **Variation (free) within these constraints:**
  - non-text contrast of at least 3:1
  - every event keeps a non-audio cue
  - feedback is drawn only from `events`/state and never written back
  - touch targets of at least 44 px
- **Acceptance:** G06.

### D-G7 — Replay and render isolation (chosen; fixed)
- **Trace format:** {app/runtime/profile identities, `canon(initial)` hash, ordered per-tick input records (run-length encoding allowed), and a state-hash checkpoint every 60 ticks plus the final `canon(state)`}.
- The renderer and audio receive a deep-frozen copy of the state. Any exception they throw is logged and shown as a non-blocking notice. The authoritative state is replaced **only** by the return value of `game.tick`.
- If a tick refuses or faults, the game freezes on the last good state, shows "Game error", and saves the trace for reproduction. Nothing is repaired.
- **Refs:** G05, D-G2.

## Four-field transition definition — `physics.microstep` (one of the four microsteps of a `play` tick)

**Domain**
- A state with phase = play. Integers satisfy pc ∈ [500, 4300], bx ∈ [60, 4740] and by ∈ [60, 6459].
- vx ∈ {±16, ±24, ±32} and vy ∈ {±24, ±32, ±36}.
- bricks is a list of exactly 30 Bools. score = number of false entries, ≤ 29. lives ∈ [1, 3].
- The current state does not overlap any intact brick, except possibly the one pocket-case brick carried over from the previous microstep.
- Shape is checked before business conditions (K01/K07). Malformed state/input, such as text "24", a missing field or a list of 29, gives an InputShape **fault** and is never treated as a game event.

**Relationship (deterministic)**
- (px, py) := (bx, by). Then (nx, ny) := (bx + vx/4, by + vy/4).
- Apply in order: walls, paddle, then the single lowest-id overlapped brick, exactly as in D-G4.3 steps 2–4. Then the win check, then the exit check.
- **Postconditions:**
  - At most one brick goes from intact to removed, and only if it was overlapped.
  - score′ = score + (1 if a brick was removed, else 0).
  - lives′ = lives − (1 if exited, else 0).
  - |Δx|, |Δy| ≤ 9 apart from snaps.
  - If phase′ = play, the ball does not overlap any wall.
  - If phase′ = serve, the ball is at (pc, 5640) with v = (0, 0).
  - Each velocity component is unchanged or negated, or set to a zone vector on a paddle hit.
- Identical inputs give an identical output, with no clock and no randomness.

**Failure rules**
- Shape fault (K01). Any pre-check of state-domain invariants that fails is declared as refusal `InvalidGameState`. That indicates a defect, and the host treats it like a fault (D-G7: freeze, keep the last good state, report).
- ArithmeticOverflow cannot happen within the domain: magnitudes are at most about 10^4.
- A ContractViolation fault, for example on the score invariant, propagates. No refusal is converted into a game outcome.
- No effects are emitted, so nothing external has been committed when a failure occurs.

**Execution semantics**
- The node is pure and has no `fx`. Strict input → pre → body → result shape → post/inv checks on every call (K09).
- `game.tick` runs it via `fold "physics.microstep" (range 4) state ctx`.
- Once the phase leaves `play`, each later microstep returns its input unchanged.
- The first failure stops the tick. The host keeps the prior state.

## Obligation mapping

| ID | Responsibility/artifact (proposed, not yet built) | Evidence method | Actual result or pending | Limitations |
|---|---|---|---|---|
| G01 | `game.tick` serve/launch logic; host overlay text, pause button, D-G5.1 r2 controls | Unaided first-time player session at 390×844 and 1280×800 with device recorded; time to first launch; coaching events | Pending (not built; no human) | A small sample can't generalise. Overlay wording is variable. |
| G02 | `control.*` (keyboard and touch mapping), `bounded.clamp`; host `input.js` scroll guards | Traces: full-range paddle travel by keyboard and by touch drag. Real-device check (iOS Safari, Android Chrome) for no scroll/zoom during play. | Pending | Browser gesture behaviour varies by version. |
| G03 | `breakout.physics`, `breakout.game` (score, lives, won/lost) | Independent oracle (Python, written from this text only) compared against DNode traces: corner/joint, diagonal, zone boundaries, edge-touch non-hits, max-speed approaches, exit at exactly ny−60 = 6400, last-brick win, 3 life losses → lost | Pending. G-T3 expected values are predictions only. | Finite traces support the declared policy; they don't prove it. |
| G04 | `game.tick` pause/restart rules; `host/scheduler.js` (D-G3.1) | Scheduler fixture: frame timestamps with deltas {16.7, 100, 250, 30000 paused} → tick counts {1, 5, 5 then discard, paused no-ops}. State equality across pause, and `restart` = canon(`game.initial()`). | Pending | Needs real long-frame measurement on a device. |
| G05 | D-G7 trace recorder/replayer; frozen render input | Record→replay checkpoint-hash equality; fault-injection renderer (throws, mutates attempt) → state hashes unchanged | Pending | Same app/runtime identities required. |
| G06 | Whole application | Human sessions recording readability, responsiveness, frustration, confusion and perceived fairness (including the AABB-vs-circle look, pace and touch feel). Kept separate from frame/tick measurements. | Pending. No human acceptance is claimed. | Reviewer and devices unresolved (U-G1). |

## Challenge answers

**G-T1 (3 vs 5 catch-up ticks).** No, they are not necessarily equivalent.
- With identical per-tick input traces, both give identical states, because tick logic doesn't depend on the cap. They differ in how wall-clock time turns into ticks.
- Counterexample: a 100 ms host stall (6 ticks due). With cap 3, 3 ticks run and about 50 ms of game time is lost. With cap 5, 5 ticks run and about 17 ms is lost. The ball's visible jump is about 3×36 = 108 vs 5×36 = 180 units in vy=36 play. Inputs sampled after the stall land on different tick indices, so recorded traces and outcomes can diverge. Below 3 due ticks per frame they behave the same.
- Both can meet the broad playability purpose: both bound the visible jump and avoid a "spiral of death".
- **What must be pinned for this trial:**
  - 60 Hz and cap 5 (D-G3)
  - the backlog discard rule (re-epoch, D-G3.1)
  - paused time is not accumulated
  - edges go to the first tick of a batch, and levels apply to all ticks of a batch
  - traces record per-tick inputs rather than wall time

**G-T2 (pause 30 s).**
- **Unchanged:** the whole gameplay projection Gp: paddle, ball position and velocity, the 30 brick flags, score, lives and the resume phase. The phase itself is `paused`. Menus and overlays may change.
- **Elapsed time:** the 30 s is discarded. The host keeps ticking at 60 Hz, and each of the roughly 1800 paused ticks is a gameplay no-op. If the tab was hidden, the visibility handler re-epochs.
- **On resume:** the resume tick only changes the phase. The next tick advances exactly one normal tick, for example moving the ball by v. There is no catch-up jump.
- Edges other than pause/restart that arrive while paused are discarded. Under r2, a touch drag active at pause is cancelled and re-anchored when the next touch starts.
- Predicted test: Gp hash before the pause = Gp hash after 1800 paused ticks = Gp hash after the resume tick.

**G-T3 (corner tie).**
- **My decision (D-G4.3):** in each microstep, only the lowest-id overlapped intact brick is hit. The response is vertical if the previous centre was outside that brick's expanded vertical interval, otherwise horizontal. A diagonal corner entry therefore reflects vertically, and walls → paddle → brick order applies.
- **Inherited:** only that a deterministic policy, including ties, must be declared before evaluation, that each brick goes intact→removed once, and that score equals the removed count (BP-GAME, D-G4). The lowest-id/vertical-priority rule is *my choice*. It matches the kit's description but is not a requirement.
- **Tests (expected values are predictions, to be checked by an oracle written independently):**
  - **(a) Joint of two bricks.** Play state with ball (1660, 2224), v (16, −36), and no paddle involvement.
    - Microstep 1 reaches (1664, 2215), which overlaps bricks 25 and 26. Brick 25 is removed, the response is vertical, by := 2220 and vy := +36.
    - After the tick: ball (1676, 2247), v (16, 36), only brick 25 removed, score 1.
    - Counterexample policies differ observably: "remove all overlaps" gives score 2, and double-negation keeps vy = −36.
  - **(b) Diagonal corner of brick 29.** Ball (4662, 2222), v (−32, −24).
    - Microstep 1 reaches (4654, 2216), which overlaps only brick 29. The response is vertical, by := 2220 and vy := +24.
    - After the tick: ball (4630, 2238), v (−32, 24), score 1.
    - A horizontal-priority policy would give bx := 4660 and vx := +32 instead.
  - **(c) Touching is not a hit.** Ball top exactly at 2160 under brick 25 → no removal.
  - **(d) Lowest-id with vertical stacking.** Moving right into the left faces of bricks 18 and 24 at their joint → 18 is removed and the response is horizontal.

**G-T4 (trace oracle agrees).** No, enjoyment has not been shown.
- Agreement supports only that the implementation matches the declared policy on the traced cases.
- The oracle and the implementation can share a misreading of the specification.
- The policy itself could feel unfair, for example an AABB hit when the drawn circle visibly misses, or a pace that is too slow.
- **What remains:**
  - G01/G02/G06 human sessions on the recorded 390×844 and 1280×800 devices, covering frustration, confusion, perceived fairness and responsiveness
  - device-measured input-to-paint latency and frame timing, reported separately
  - G04 under real stalls
  - hidden adversarial traces from a reviewer

**G-T5 (bad frame).** No, the renderer may not repair the authoritative ball position.
- First determine where the fault is: compare the drawn frame with `canon(state)` for that tick.
- **If the state is right and the drawing is wrong**, the fix belongs to the host renderer's projection (scale, rounding, interpolation). The state stays untouched.
- **If the state is wrong**, the fix belongs to the DNode root, for example `breakout.physics`. It gets a new identity, and the G03/G05 traces are rerun.
- Counterexample: a renderer that "nudges" a ball drawn inside a brick hides a tunneling bug, makes the screen disagree with replay, and breaks D-G2/G05.
- The renderer only receives frozen state (D-G7).

## Continuation amendment — G-C1 (touch control is awkward)

**Diagnosis from r1** (hypotheses to validate, not observed): absolute touch makes the paddle jump to wherever the finger lands. The thumb covers the paddle and the ball near the bottom. The 160/tick cap makes the paddle lag behind the finger. Taps intended as drags can launch the ball accidentally.

**Revised D-G5.1 r2** (chosen; review-required; supersedes r1 for touch only; r1 kept above). Mouse and keyboard behaviour stay exactly as in r1.
1. **Touch surface:** the whole game surface (field plus the strip below it). On a 390×844 viewport the strip is the bottom area, at least 200 CSS px tall. It shows a faint track labelled "Drag anywhere to move · Tap to launch" and a marker under the paddle's current x. Only the first touch pointer is tracked. Other touches are ignored.
2. **Relative drag in DNode, so it can be replayed:**
   - The input gains `touch:{down:Bool, x:Int}`. Here x is the finger's logical x, which the host computes as floor(cssX / scale).
   - The control state gains `ctl:{was_down:Bool, af:Int, ap:Int}`.
   - **On the first tick with down ∧ ¬was_down:** set af := x and ap := pc. *The paddle does not move on touchdown.*
   - **While down:**
     - raw := ap + floor(3·(x − af)/2), a gain of 1.5×
     - t := bounded.clamp(raw, 500, 4300)
     - if raw ≠ t, then ap := t and af := x, so turning back at a wall responds immediately with no dead zone
     - pc := t, applied in the same tick with no speed cap
   - **When ¬down:** was_down := false.
   - Keyboard still takes precedence in a tick where both are active.
   - Predicted thumb travel for the full paddle range is about 189 CSS px on a 390-wide phone.
3. **Tap = `action`.** The host classifies a tap as total travel ≤10 CSS px and duration ≤300 ms, and emits `action`. A drag followed by a lift never launches.
4. **Pause and resume:** pausing sets was_down := false. A finger still down after resume is re-anchored, with no jump. Touch input is ignored while paused, except the on-screen Resume/Restart buttons.
5. The scroll and zoom guards from r1 stay in place, with non-passive touchstart/touchmove preventDefault on the game surface.

**Preserved (invariant):**
- D-G4.1–D-G4.4 unchanged: collision geometry, tie rule, tunneling, score, lives and phases. The `breakout.physics` root identity must stay the same.
- D-G1, D-G2 and D-G3 are unchanged.
- Score equals removed bricks.
- Paddle within [500, 4300].
- Relaunch only on an explicit action.
- Pause freezes Gp.
- Restart returns exactly the initial state. `ctl` is part of the initial state, as {false, 0, 2400}.
- Replay determinism.

**What changes:**
- The `control.*` root, the game input type and state type (adding `touch` and `ctl`), `game.initial`, and the identity of `game.tick`.
- Host `input.js` and the layout.
- Touch traces recorded under r1 can no longer be replayed under r2, because the input schema changed. They must be re-recorded. Keyboard traces should still give identical Gp when the new fields are set to `touch.down = false`. This is predicted.

**Validation still needed (none performed):**
- An independent oracle for anchor, gain, floor-of-negatives, clamp-rebase, pause re-anchor and tap-vs-drag sequences, compared with DNode traces.
- A rerun of the full G03/G05 suite, with the `breakout.physics` identity confirmed unchanged and the results identical.
- A keyboard-trace regression.
- Real-device checks on recorded iOS Safari and Android Chrome at 390×844: no scroll, zoom, text selection or long-press menu during play, and no paddle jump on touchdown or resume.
- Device-measured touch-to-paint latency.
- A counterbalanced human comparison of r1 absolute vs r2 relative control, recording misses the player blames on the controls, accidental launches, frustration, perceived control and fairness.
- G06 re-acceptance. The gain (1.5) and the strip height are the first tuning candidates, and changing them is review-required.

## Handoff to the next model

- **Settled (preserve):**
  - D-G1, D-G2 and D-G3, which are inherited and fixed.
  - My D-G4.1 geometry, D-G4.2 velocity set, zones and launch, D-G4.3 collision order, lowest-id tie, vertical-priority corner, snap and tunneling bound, and D-G4.4 phase and input-edge rules.
  - D-G3.1 scheduler, D-G7 replay/render isolation, and D-G5.1 r2 touch control.
  - Changing any of these requires a revision record, a new identity and the reruns listed in the obligation table.
- **Freedoms:**
  - D-G5.2 colours, feedback styling, audio and wording, within the stated constraints.
  - Strip layout.
  - The r2 gain in [1.0, 2.0] and the tap thresholds, each review-required with a G06 rerun.
  - Node decomposition and names, which are proposals only.
- **Dependencies:** the kit identities listed at the top, the `bounded.clamp` prelude root, the `browser-e1` profile, and Node 22. The kit's `with` special form is used for record updates, and its keys must be bare tokens (see Evidence).
- **Assumptions:** A-G1–A-G4.
- **Open:**
  - U-G1 reviewers and devices
  - U-G2 performance targets
  - U-G3 SEMANTICS authority
  - Gaps 1–6 below
- **Next action (Phase B):**
  1. Write the independent Python oracle from this document alone, together with the G-T3 and boundary traces.
  2. Implement `breakout.geometry`, `breakout.physics`, `breakout.control` and `breakout.game` against the kit, then run `node tools/run.mjs check` and trace comparison.
  3. Build the host scheduler, input, render, trace and audio modules with the D-G3.1 fixture.
  4. Run the real-device and human sessions.
  - Keep human acceptance pending until it is actually observed.

## Evidence and release status

**No new implementation was made.** Nothing below is human acceptance. All commands were run in `…/scratchpad/blind-game/` (the kit was extracted to `kit/`) or in `kit/dnode-e1-kit/`. The outputs are the ones I observed.

| Command | Observed output |
|---|---|
| `sha256sum package/*` + Python MANIFEST compare | All 10 entries `OK`. candidate.zip `3e1868a1…39d8`. |
| `unzip candidate.zip -d czcheck && diff -r czcheck package` | `IDENTICAL` (czcheck was removed afterwards) |
| `node --version` | `v22.22.0` |
| `node tools/run.mjs verify` | `VERIFIED DNode-E1-author-kit trust fingerprint 4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244` (exit 0) |
| `npm test` | `Verified pinned package and 1280 independently expected public generated cases. This does not certify your application.` (exit 0) |
| `node tools/run.mjs call bounded.clamp '[12,0,10]'` / `'[5,10,0]'` | `{"effects":[],"out":10}` / `InvalidBounds InvalidBounds` (exit 1) |
| `node tools/run.mjs check ../../probe/probe.node` (language probe, not the game) | `STRUCTURAL PASS. Not a certificate; …` |
| `run-file … probe.run '[{"x":10,"phase":"ready"},5]'` written with `(with acc "x" nx)` | **First failure:** `RecordKey RecordKey`. **Repair:** use a bare key, `(with acc x nx)` → `{"effects":[],"out":{"phase":"ready","x":36}}` |
| same, with `phase:"running"` / with `"5"` as text | `InputShape InputShape: probe.run` / the same. The enum type and no-coercion behaviour were confirmed. |
| `run-file … probe.ids '[7]'` (`filter` over `range 30` with a ctx value) | `{"effects":[],"out":[0,7,14,21,28]}` |
| Python WCAG contrast calculation for the D-G5.2 palette | 4.59–17.95 against #10162a (formula only) |

The probe is at `…/scratchpad/blind-game/probe/probe.node`. It only demonstrates that `with`, `fold`/`filter` over `range` with a ctx value, and `enum` types work, which a Phase B microstep design relies on.

**Distribution gaps and ambiguities found:**
1. **No game host facilities ship.** `runtime/host.js` exports only `SessionStore`, `simulatedBank`, `dispatch` and `stableEqual`. There is no tick scheduler, event bridge or renderer, although SEMANTICS.md says "generic renderer/event bridge" and the profile declares `tickHz`/`maxCatchUpTicks` only as prose. As a result, D-G3 is author-implemented and not checked for conformance. Smallest missing item: a pinned scheduler module and a timestamp→tick-count fixture.
2. **No public game traces or fixtures,** although BLUEPRINTS §7 lists "game traces with independently fixed expected outcomes" as a required package item.
3. **The SEMANTICS.md "Game:" paragraph's authority is unclear.** It is signed in the kit yet conflicts with BP-GAME D-G4 being delegated, and it is incomplete: it gives no brick layout, speeds, launch, paddle speed or exit rule.
4. **`with` is supported by the engine but missing from the generated DICTIONARY.** Its keys must be bare tokens, and a quoted key gives a `RecordKey` fault, as observed. The type grammar (`fields`/`list`/`enum`) is also not spelled out there.
5. **`run-file` works but is not listed** in the README or in run.mjs's help text.
6. **The browser profile has no input/event capability or schema.** Inputs are only node arguments, so event-shape enforcement relies on node input types. This does not block the work. The trust fingerprint can only be read from inside the kit.

Human acceptance: **none observed, pending.**
