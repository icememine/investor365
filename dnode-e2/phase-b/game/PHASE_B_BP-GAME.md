# Submission: BP-GAME (Breakout), Claude Opus 5.5 (claude-opus-5-5), Phase B implementer subagent, 2026-10-21

Phase: **B** (implementation). A new implementation was built and is runnable: `node serve.mjs`, then open http://127.0.0.1:8102/.

**Prior exposure.** I am a successor session. I had no access to the conversation that produced the Phase A design. I worked only from:
- `handoff/PHASE_A_BP-GAME.md`
- `handoff/OWNER_RULINGS.md`
- `handoff/package/*`
- the frozen kit

I did not open `P/shop`, `P/batch`, `PHASE_A_BP-SHOP.md` or `PHASE_A_BP-BATCH.md`. Earlier DNode builds were written by Claude sessions, so the model family may have seen similar material. The independent oracle and the DNode roots were written by **the same model in the same session**. That limits independence; see "Oracle agreement".

**Human acceptance: none observed.** G01 and G06, and the human part of G02, are **pending**.

## Identities (full SHA-256)

| Artifact | Identity |
|---|---|
| `handoff/package/dnode-e1-kit.zip` | `141331a5c76807da3b99ffb19cb1507d3a9acad6b00d4f8cee13b91a199a5633`. The kit directory is byte-identical to the zip: 31/31 entries, compared in memory. |
| Kit runtime identity | `fd854bcb708f3031824b14819fe126b0be96b241ced19416035b6f49d4d7c55e`. Reproduced as `sha256(json(lock.runtimeHashes))`. |
| Prelude root (kit `rootHashes.prelude`) | `8e199f2776bb9c4ec44b3a435b4c70744748c42b784c646f77d2847c41e99dde`. The `roots/prelude.node` file is `bf2a6cec6fb9d5ac3fca94ae35685e2d57e729d9bc95da607ea6db2c4c7eeb97`. |
| `profiles/browser.json` (browser-e1) | `cda00518bb6155832ad8bbd82392f0230ca8b0c3f957ba8409cfcecd5dfd17f7` |
| Kit `runtime/engine.js` | `730191eae563678061a787b6c21104bb21ce795bb7b544e1adf445af52febfb7` |
| Trust-key fingerprint (in-kit, self-referential) | `4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244` |
| `dnode/breakout.geometry.node` | `e31ed731a3a6c9acdea4e3039c3aad3883702389635d745d9b75487d5c2ac78f` |
| `dnode/breakout.physics.node` | `ec0d8a7ddf930b6950bb9de19b76579de138e5cf592f864ed4a21605d0628edd` |
| `dnode/breakout.control.node` | `400ecd7f480b88358799345671a48b179c476e00a60c45eeb5f7f57762df673a` |
| `dnode/breakout.game.node` | `fd4de8d5493330d212e739c28196db363a93fcf665c0ed659bc6898c52a34ae7` |
| App identity: `sha256(json({roots, runtime, prelude}))` | `0cc1b3efe7dc4aee1ff9bde14d7f4320742e424afb999b12e6ed0edd32bf5029` |
| Host, tool, oracle and test files | Full hashes in `app-manifest.json` (`files`), written at the end of the final run |
| Inputs read | `PHASE_A_BP-GAME.md` `25b72f3c6482ef570b1a6b89ce1cf4f38c6d524e575811636aae69c8876bb0f3`; `OWNER_RULINGS.md` `8f7f49bc05fe7abca41ae1316fa0800f058c86d375f9aa86a888dd91c150e5f7`; `BP-GAME.md` `7b3e9f2154c1625c5b399db2c4581596f29b91f4d4ce436a39b218830560e0c8` |

Kit root identities cannot be derived from public artifacts (gap GB-5). For my own roots, the identity is the file SHA-256 plus the composite app identity above. Environment: Node v22.22.0, Python 3.13.16, headless Chromium 141.0.7390.37 (Playwright, `/opt/pw-browsers/chromium-1194`), Linux x64, Intel Xeon @ 2.80 GHz, 4 vCPU.

## Purpose in my own words

A first-time player should pick this up and be playing Breakout in seconds. Ball, paddle and bricks are always readable, the paddle goes where they mean it to, and every hit, miss and lost life follows from the declared rules. DNode holds the one authoritative, integer, replayable `game.tick(state, input)`. The host only turns time and input into ticks, draws, and plays sounds.

## What is fixed, chosen, assumed and unresolved (as built)

| Record | Classification | Source | As built |
|---|---|---|---|
| D-G1 (30 bricks, 3 lives, 1 point/brick) | required/fixed | E1 | Built |
| D-G2 (logic in DNode; renderer never repairs) | required/fixed | BP-GAME | Built. State is replaced only by `game.tick`'s return (`host/main.js` `runTicks`). The renderer gets a deep-frozen clone. |
| D-G3 (60 Hz, ≤5 catch-up, discard backlog and pause time) | chosen/fixed | BP-GAME | Built in host, per R-G2. hz and cap are read from the verified profile (`host.tickHz`, `maxCatchUpTicks`). |
| D-G3.1 scheduler | chosen/fixed | Phase A | `host/scheduler.js`, plus fixture `tests/scheduler.test.mjs` |
| D-G4.1 to D-G4.4 | chosen; settled by R-G1 | Phase A | Built as written. Clarifications C1 to C13 are listed below. |
| D-G5.1 r2 touch, r1 keyboard/mouse | chosen; R0.3 | Phase A | Built. r1 absolute touch was **not** built. |
| D-G5.2 visuals/feedback/audio | chosen; free within constraints | Phase A | Built. Palette as written; non-audio cue for every event; audio optional. |
| D-G7 replay/render isolation | chosen/fixed | Phase A | Built (`host/trace.js`, `host/render.js`) |
| A-G1 (device supports the bridge) | assumed | BP-GAME | Verified in headless Chromium only. Real devices pending. |
| A-G3 (AABB drawn as a circle feels fair) | assumed | Phase A | Unverified. Needs G06. |
| A-G4 (tick fits in a frame) | assumed | Phase A | **Measured.** It did not hold for the first build; see repair R4. |
| U-G1 reviewers/devices | unresolved | R-G4 | Pending. Instructions in `HUMAN-TESTING.md`. |
| U-G2 performance targets | resolved by R0.5 | Owner | Measured only, no threshold |
| U-G3 SEMANTICS authority | resolved by R-G1 | Owner | Treated as reference. Phase A geometry is binding. |

### Phase B clarification records (C1 to C13)

These were written **before** any DNode code or output existed, in `oracle/SPEC_CLARIFICATIONS.md`. For each one:
- status: chosen by the Phase B implementer
- variation: review-required
- both the oracle and the DNode follow it
- none changes a value Phase A pinned

| ID | Choice | Reason |
|---|---|---|
| C1 | Keyboard is active iff left or right. It moves 80/tick; both keys cancel. Pointer and touch are ignored for that tick, and `ctl.was_down := false`. | Phase A says the keyboard "takes precedence" but is silent on the touch anchor. Clearing it avoids a paddle jump when the keys are released, which is the same reasoning as the r2 pause re-anchor. |
| C2 | Precedence is keyboard > touch > mouse. With no touch, `was_down := false`. | The input record carries both pointer and touch. |
| C3 | Won sets `v := (0,0)`; the ball stays where the collision left it. | Phase A's invariant says "(0,0) outside play". |
| C4 | Event strings and order: `wall` ×n, `paddle`, `brick:<id>`, `won`, `life`, `lost`. They reset every tick. | Feedback needs a deterministic order. |
| C5 | Restart in serve/play is ignored; action in play/paused is ignored or discarded; force while paused is a no-op. | Literal reading of D-G4.4 |
| C6/C7 | A pause tick sets phase, resume and `was_down := false`. A resume tick changes only the phase. Other paused ticks change only `events := []`. | D-G4.4 step 2/3 and r2 #4 |
| C8 | Launch tick: paddle first, then attach the ball, then the action sets `play` and v. No microsteps run that tick. | "Starts moving on the next tick" |
| C9 | Velocity invariant is phase-dependent; in paused it follows `resume`. | Phase A's "outside play" would otherwise forbid pausing a moving ball. |
| C10 | `InvalidGameState` predicate (exact list in the file). The same predicate is the tick invariant. | Phase A four-field "pre-check of state-domain invariants" |
| C11 | The centre-zone sign is the sign of vx after this microstep's wall step. | "Incoming vx" was ambiguous |
| C12 | Shape errors are `InputShape` faults | K01/K07 |
| C13 | Paddle movement (D-G4.4 step 4) also runs in won/lost. | The step has no phase guard. Kept literal rather than inventing a freeze. Invisible under the end overlay. |

### Revision records (deviations from the Phase A text, with reason)

- **RB-1: brick candidate superset (performance; no semantic change).** `phys.candidates` lists, in ascending order, the at most 4 bricks whose pitch cell meets the ball box. The exact strict-overlap test and lowest-id rule are then applied as before.
  - Why it is a superset: ball box 120 < pitch 740/280 (proof in the node's `says`).
  - The r1 full 30-brick scan is preserved at `tests/probe/breakout.physics.r1-fullscan.node`. It agreed with the oracle on the same cases before the change, and the new version agrees after.
  - Reason: the full scan cost 7.8 ms per brick-zone tick (repair R4).
- **RB-2: removed-brick count via the pinned `encode` native.** `game.removed_count` computes `len(encode b) − 1 − 5n`. That equals the number of `false` entries for a non-empty Bool list, because the JSON tokens are `true` (4 chars) and `false` (5 chars).
  - Checked against the per-element `filter` count on 10,191 lists: all Bool lists of length 0 to 12, plus 2,000 pseudo-random length-30 lists. 0 failures (`tools/check.mjs`).
  - Reason: the C10 predicate runs twice per tick (pre and inv), and 60 node calls cost about 1 ms per tick. The kit has no Bool-count native (GB-4).
- **RB-3: root decomposition.** The proposed names became:
  - `breakout.geometry`: types, constants, `geo.*`, plus `geo.layout` so the renderer never re-declares dimensions
  - `breakout.physics`: `phys.*`
  - `breakout.control`: `ctl.*`, using `bounded.clamp` from the prelude for every paddle bound
  - `breakout.game`: `game.*`
- **RB-4: host pointer level.** The mouse `pointer.active` becomes true after a mouse move inside the surface. It becomes false on pointerleave, on a movement key press, and on restart. This is an event-capture choice: a resting mouse should not pull the paddle back after keyboard play. The game rule stays in DNode.
- **RB-5: visible wording follows the device** (D-G5.2 freedom).
  - With `(pointer: coarse)`: "Drag anywhere to move · Tap to launch".
  - Otherwise: "← → or mouse to move · Space or click to launch".
  - After a lost life: "Ball lost · N lives left".
  - Phase A's combined line "← → or drag to move · Space or tap to launch" was split by device.
- **RB-6: end screens and pause button.** "Play again" sends a `restart` edge, which DNode honours in won/lost. The pause button is disabled in won/lost, where DNode ignores pause.
- **RB-7: input clearing after restart.** The host clears pending edges, the held-key map, the touch track and the pointer level when a tick that carried restart or action turns a non-initial state into `canon(game.initial)`. The rest of that frame's batch gets neutral levels. A key or finger still down must be released and pressed again.

## Decisions and reasons (two complete records, as built)

**D-G4.3: collision order, tie and tunneling.** Status: chosen; fixed. Source: Phase A r1, settled by R-G1.
- **Choice.** Per microstep (v/4 per step, steps ≤ 9 per axis):
  1. walls: left, right, top
  2. paddle: top-line crossing only
  3. bricks: only the lowest-id overlapped intact brick
     - the response is vertical iff the previous centre was outside the brick's expanded vertical interval, otherwise horizontal
     - snap
  4. win
  5. exit: `ny−60 ≥ 6400`
- **Purpose:** G03, G05, fair play.
- **Reason:** "one hit, one brick" is readable, the order is deterministic, and the result is exact in integers.
- **Assumptions:** A-G3.
- **Tradeoffs:**
  - lowest-id favours the upper-left brick
  - the paddle has no side faces
  - a pocket brick can stay overlapped for one microstep (the oracle saw 8 multi-overlap microsteps in 38k ticks)
- **Responsibility:** `phys.advance`, `phys.walls`, `phys.paddle`, `phys.candidates`, `phys.brick_candidate`, `phys.brick_response`, `phys.remove`, `phys.win`, `phys.exit`, `phys.microstep`.
- **Acceptance (observed):**
  - DNode agrees with the oracle on 102/102 cases and 38,024 ticks
  - 17/17 policy mutants are detected
  - browser sessions agree on 21,816 ticks
- **Variation:** review-required. A change needs a new identity, and every G03/G05 trace must be rerun.

**D-G5.1 r2: relative touch drag.** Status: chosen; R0.3.
- **Choice.**
  - Anchor on the first down tick; touchdown does not move the paddle.
  - `pc = clamp(ap + floor(3(x−af)/2), 500, 4300)`.
  - When clamped, rebase `ap := t, af := x`.
  - Pause clears `was_down`.
  - Host tap = travel ≤10 CSS px and ≤300 ms → action edge.
  - Only the first finger is tracked.
  - The whole surface (field and strip) is the touch area.
- **Purpose:** G01, G02, G06, G-C1.
- **Reason:** the finger does not cover the ball, the paddle never jumps, and the paddle turns back from a wall immediately.
- **Assumptions:** a gain of 1.5 and a full range of about 190 px thumb travel suit a 390-wide phone (G06 must judge).
- **Tradeoffs:** relative control must be discovered by the player; the strip hint and track marker help.
- **Responsibility:** `ctl.touch`, `ctl.paddle`, `game.pause`, and host `input.js`.
- **Acceptance (observed in Chromium touch emulation, 390×844):**
  - touchdown 2400 → 2400 (no jump)
  - full range 500 and 4300 reached
  - turning back 10 px from the wall gives 4300 → 4099 immediately
  - thumb travel for the full range: 189 CSS px (the prediction was 189)
  - pause re-anchor: pc 2489 before and after a finger move of 80 px while paused, then −402 for −20 px (1.5×)
  - real-device and human comparison pending
- **Variation:** gain in [1.0, 2.0] and tap thresholds are review-required, with a G06 rerun.

## Four-field transition definition: `phys.microstep` (as built)

- **Domain:** `State` (closed record, checked on every call) in phase `play`, with k ∈ [0,3] (`BadMicrostep` otherwise). The surrounding `game.tick` guarantees C10 validity, refusing `InvalidGameState` before any change.
- **Relationship:** as in D-G4.3 above. At most one brick goes intact → removed. score′ = score + hit. lives′ = lives − exit. Identical inputs give identical outputs (no clock, no randomness).
- **Failures:**
  - shape fault (`InputShape`/`ResultShape`)
  - `BrickNotIntact` or `BadPaddleOffset` from helpers surfaces as an `UndeclaredRefusal` fault, which indicates a defect; none was observed
  - a contract violation on the tick invariant is a fault
  - the host freezes on the last good state, shows "Game error" and offers the trace
- **Execution:** pure, no `fx`. Strict checks run on every call. `game.tick` runs `fold "phys.microstep" (range 4)`; after the phase leaves `play`, the remaining microsteps return their input.

## Obligation mapping (actual results)

| ID | Responsibility / artifact | Evidence method | Actual result | Limitations |
|---|---|---|---|---|
| G01 | `game.serve`, `game.tick` (launch); host overlay text, pause button, `input.js` | Drives D-G01-observable and P-G01-observable (instructions visible, pause ≥48×48, field fully in view, touch strip ≥200 px); human session | **Observable parts PASS** (1280×800 and 390×844). **Human acceptance PENDING.** | No first-time player observed. The text was checked, not comprehension. |
| G02 | `ctl.*`, `bounded.clamp`; host `input.js` scroll/zoom guards | Oracle control and touch cases. Drives: keyboard full range, mouse full range, touch drag full range (strip and field), tap launch, pause re-anchor; `scrollX/Y = 0`, document ≤ viewport, `visualViewport.scale = 1`, after Space, wheel and drags | **Machine PASS:** pc reached 500 and 4300 by keyboard, mouse and touch; no scroll or zoom observed. **Human part and real iOS/Android PENDING.** | Headless touch emulation is not a real browser's gesture handling (edge swipe, double-tap zoom, callout). |
| G03 | `breakout.physics`, `breakout.game` | Python oracle (R-G3) vs DNode, per tick, on full canonical state including events; mutation sensitivity; browser play-throughs re-checked by the oracle | **PASS (machine):** 102/102 designed cases and 38,024/38,024 ticks agree; browser sessions 3/3 and 21,816/21,816 ticks agree; 17/17 mutants detected; desktop and touch autopilots won 30/30, a forced run lost lives 3→2→1→0 | Finite traces. Oracle and DNode come from the same model and the same clarifications. |
| G04 | `game.tick` pause/restart; `host/scheduler.js`; `input.clearSession` | Scheduler fixture; oracle cases `pause_1800_ticks`, `pause_ignores_inputs`, `restart_*`; drives for a 30 s pause (injected clock jump and a real 30 s), restart, and a long frame | **PASS (machine)** for everything except the hidden-tab path. Fixture 11/11. Gameplay projection unchanged across 1,828 paused ticks and the 30 s jump (one frame: 5 ticks, 1,796 discarded); after resume, every frame ran 1 tick. Restart gives the exact initial canon, and a held key is ignored until pressed again. A 600 ms injected frame ran 5 ticks and discarded 32. Over a 1.5 s window that included the stall, 21 ticks ran where wall-clock time would give 90. **Hidden-tab force pause: NOT EXERCISED** (headless stays `visible`), pending a real device. | Long frames were injected, not natural device stalls. |
| G05 | D-G7 `host/trace.js`; frozen render input; `host/render.js` fault mode; audio fault mode | In-page replay from initial; Node cross-environment replay of the saved traces; render-fault probe; 1.5 s of play with render and audio faults injected; admission refusal | **PASS (machine):** in-page replay IDENTICAL on desktop and phone (live state equal to replay); Node replay IDENTICAL 3/3 (362 checkpoints, 0 bad); probe hash unchanged (the renderer's write to frozen `bx` threw); during 95 ticks of injected faults (95 render, 95 audio) the game kept ticking with no halt; tampered kit, tampered app root and swapped key each refused to run | Replay requires the same runtime, prelude and app identities, which is enforced. |
| G06 | Whole app | Human sessions (`HUMAN-TESTING.md`) | **PENDING.** No human has played. | — |

Machine results: `evidence/drive-results.json`, `oracle-compare.json`, `oracle-compare-browser.json`, `mutants.json`, `scheduler-fixture.json`, `replay-node.json`, `tick-timing-node.json`. Screenshots are in `evidence/shots/`.

## Challenge answers, re-checked against the build

- **G-T1 (3 vs 5 catch-up ticks).** Observed with the same `Scheduler` code at cap 3 and cap 5, using frames at 16.7, 116.7, 133.4 and 150.1 ms:
  - cap 3: `[1,0] [3,3] [1,0] [1,0]` (ticks, discarded)
  - cap 5: `[1,0] [5,1] [1,0] [1,0]`

  The two caps are not equivalent after a stall: they run a different number of ticks, so later inputs land on different tick indices. With identical per-tick input traces, the state results are identical by construction, because `game.tick` has no cap parameter. What this trial pins: 60 Hz and cap 5 (read from the verified profile), re-epoch on discard, paused time consumed by no-op ticks or by `reset`, edges on the first tick of a batch, and traces recording per-tick inputs. Whether both caps meet the playability purpose is still a prediction.
- **G-T2 (pause 30 s).** Observed:
  - the gameplay projection was identical before the pause, after an injected 30 s clock jump, and after a further real 30 s wait
  - 1,828 paused ticks ran as no-ops
  - the jump frame ran 5 ticks and discarded 1,796
  - the resume tick changed only the phase, and after resume each frame ran 1 tick (no catch-up jump)
  - oracle case `pause_1800_ticks` agrees
- **G-T3 (corner tie).** The rule is my choice (D-G4.3), not inherited. Observed in DNode (`ex` cases and oracle cases), matching every Phase A prediction:

  | Case | Result |
  |---|---|
  | (a) joint of bricks 25/26 | ball (1676,2247), v (16,36), only 25 removed |
  | (b) diagonal corner of 29 | ball (4630,2238), v (−32,24) |
  | (c) edge touch | no hit when touching from below (brick 25, and brick 19 with 25 removed), from above (brick 1), from the left (brick 0) or from the right (brick 5); each hits on the next microstep |
  | (d) left faces of 18/24 | 18 removed, horizontal response |

  Mutants that switch to highest-id, horizontal priority, non-strict overlap or remove-all-overlaps are each detected.
- **G-T4.** Oracle agreement does **not** show enjoyment. It shows the build matches the declared policy on finite traces, written by the same model. Still to do: G01/G06 human sessions, real-device latency and frame timing, real stalls, and fresh adversarial traces from a reviewer.
- **G-T5.** The renderer may not repair state. Observed: the injected fault made the renderer try `view.bx = 0` on its deep-frozen copy; that threw, and the authoritative state hash was unchanged. A wrong drawing is fixed in the host projection. A wrong state is fixed in DNode, which gets a new identity and a rerun of G03/G05.
- **G-C1.** r2 is built. The observed numbers are under D-G5.1 r2 above. Still to do: a real-device check on iOS and Android, touch-to-paint latency, and the human r1-vs-r2 comparison. Under R0.3, r1 touch was not built, so that comparison would need an r1 build.

## Continuation amendment (G-C1) as built

Changed:
- `breakout.control` (`ctl.touch`, precedence)
- the `Input.touch` and `State.ctl` types
- `game.pause` (clears `was_down`)
- host `input.js` and the strip layout

Preserved: the collision geometry, tie rule, scoring, lives and phases. Every touch case agrees with the oracle (`touch_*`, 10 cases plus the touch autopilot).

## Oracle agreement

- **Designed cases.** `oracle/policy.py` (written before DNode existed) with `oracle/make_cases.py`: **102/102 cases agree, 38,024/38,024 ticks agree, 0 disagreements.** The comparison covers full canonical state including events, and refusal/fault codes.
- **Coverage.** G-T3 a–d; edge touches on all four faces; zone boundaries ±100/101, ±300/301, ±559/560 for both vx signs; paddle line equality; no upward catch; no side faces; max-speed walls and corners; exit at exactly 6400 and at 6399; last-brick win; 3 lives → lost; pause/restart combinations; keyboard, mouse and touch r2 (anchor, floor of negatives, clamp-rebase both sides, lift re-anchor, pause re-anchor, keyboard precedence); malformed and invalid states; 6 autopilot play-throughs (5 wins, 1 forced loss).
- **Browser sessions.** Recorded in Chromium, converted with `tools/trace2cases.mjs`: **3/3 cases, 21,816/21,816 ticks agree** (final run; an earlier run of the same drives gave 22,363/22,363).
- **Disagreements.** None was ever observed, so there was nothing to resolve between spec text, oracle and DNode. Two oracle *case-generator* errors and two DNode *example* or *coverage* gaps are in the repair log; the oracle policy itself was never edited after DNode outputs existed.
- **Sensitivity.** Because both sides come from one author, `tests/mutants.mjs` checks that the comparison actually detects plausible slips: **17/17 mutants detected.** The first mutant run exposed two coverage gaps, and I added cases (repair R6).

## Tick-time measurements (R0.5: measured, no threshold)

| Where | Scenario | ms per `game.tick` |
|---|---|---|
| Node 22, kit interpreter (`tools/timing.mjs`, 1,000 ticks each) | serve idle | mean 0.37, p95 0.56 |
| | play, open field | mean 1.09, p95 1.76 |
| | play, brick zone | mean 1.72, p95 3.01, max 4.75 |
| | paused | mean 0.38, p95 0.67 |
| | worst-case 5-tick batch at brick-zone p95 | 15.1 ms, which fits inside one 16.7 ms frame with little margin (earlier run: 14.0 ms) |
| Node, **first build** (r1 full scan + filter count) | brick zone | mean 7.8, p95 12.4; 5-tick batch about 62 ms |
| Headless Chromium 141.0.7390.37, 1280×800 session (last 1,200 ticks) | mixed | mean 0.61, p95 1.2, max 4.3; largest 5-tick frame sim time 6.6 ms (earlier run: max 9.3, 6.8 ms) |
| Headless Chromium, 390×844 touch emulation (same CPU, **not** a phone) | play | mean 1.40, p95 2.4, max 15.3 |

Node calls per tick: serve 13, open field 34, brick zone 56 (the first build used 338). Real-phone timing is pending; the desk shows mean, p95 and max on any device.

## Distribution gaps (minimal reproducers)

- **GB-1: no scheduler, event bridge or renderer ships** (confirms Phase A Gap 1). `grep export dist/runtime/host.js` shows only `SessionStore`, `simulatedBank`, `dispatch` and `stableEqual`. D-G3.1 is host code with its own fixture (R-G2).
- **GB-2: `tools/run.mjs check` accepts exactly one app file.**
  - `tests/probe/gap-b.node` (`root gapb`, `use gapa`) gives `MissingRoot MissingRoot: gapa`.
  - Likewise for `breakout.physics`, `breakout.control` and `breakout.game` (`MissingRoot: breakout.geometry`). Only `breakout.geometry` gets `STRUCTURAL PASS`.
  - Workaround: `tools/check.mjs` compiles kit roots plus all four app roots with the kit's own `compile()`/`Runtime` and browser profile.
- **GB-3: `check` does not run inline `ex` cases.** `tests/probe/gap-a.node` has `ex {"args":[1],"out":999}` for `(+ x 1)` and still gets `STRUCTURAL PASS`. Workaround: `tools/check.mjs` runs every `ex` case: 43/43 pass.
- **GB-4: interpreter cost and no Bool-count native.**
  - About 20–28 µs per node call: copying the const environment twice per call, plus strict shape and contract checks.
  - The straightforward D-G4.3 scan cost 7.8 ms per tick. That needed RB-1/RB-2 restructuring in DNode, not host code.
  - Counting `false` in a list needs one node call per element (`filter`), or the `encode`-length identity.
- **GB-5: root identity derivation is not reproducible.**
  - `rootHashes.prelude` (`8e199f27…`) is not the file SHA-256 (`bf2a6cec…`), nor `json(parse(src))`, nor any of 14 tried compositions.
  - The runtime identity *is* reproducible (`sha256(json(lock.runtimeHashes))`).
  - So app roots cannot be given kit-style identities; I use file SHA-256 plus a composite app identity.
- **GB-6: no public game traces or fixtures** (Phase A Gap 2), still true. My traces are author-made.
- **GB-7: `with` is missing from the generated DICTIONARY** (Phase A Gap 4). It is used throughout the roots with bare keys.
- **GB-8: browser admission cannot bind the executed module bytes.** The page imports `kit/runtime/*.js` through the module loader, while `verifyBundle` hashes a separate `fetch` of the same paths. A server that changes bytes between the two requests would not be caught (TOCTOU). The kit has no verified-blob loading path. Known limit.
- **GB-9: the browser profile declares no input or event schema** (Phase A Gap 6). Input shape is enforced by the `Input` node type.

## Repair log (first failures preserved)

| # | First failure (observed) | Classification | Repair |
|---|---|---|---|
| R1 | Oracle case `zone_edge_pc4300` ended in `InvalidGameState`: the generator placed the ball at bx = 4850, outside the field | Case-generator error. The oracle was right to refuse. | Case moved to bx = 3750. The oracle was not edited. |
| R2 | The first language probe was written to `scratchpad/probe`, outside `P/game` | Rule compliance | Moved to `tests/probe/`. Nothing else was written outside `P/game`. |
| R3 | `phys.candidates` example expected `[3]` for nx = 2400; the runtime gave `[2,3]` | My example was wrong. Brick 2 spans x up to 2380 > 2340. | Example corrected; a `[3]` case was added at nx = 2570. |
| R4 | First timing: brick zone 7.8 ms mean, 12.4 ms p95, about 62 ms for 5 ticks (A-G4 false) | Interpreter cost (GB-4) | RB-1, then RB-2. A first RB-2 attempt kept a `filter`-based `post`, which took 20 ms per 5 ticks; it was replaced by the property test. The oracle comparison was rerun after each change, and still showed 0 disagreements. |
| R5 | First oracle comparison: 96/96 agree | — | No disagreement to resolve. Recorded so the absence is explicit. |
| R6 | First mutant run: the `y0` non-strict mutant was caught only by autopilots; after adding cases, the `y1` mutant was likewise caught only by autopilots, because the brick-zone guard `ny−60 < 2160` already enforces strictness at row 4 | Coverage gap in my designed cases | Added top, right and upper-row (brick 19, 25 removed) edge-touch cases. 102 cases; 17/17 mutants detected. |
| R7 | Admission drive appended `; tampered` to a `.js` file | Drive bug: it would have refused for the wrong reason (syntax) | Uses a JS comment. Refusal is now `AdmissionDenied: changed runtime/engine.js`. |
| R8 | The first drive run got `ERR_CONNECTION_REFUSED` | Environment: the server was started in a subshell that exited | Server run as a managed background task |
| R9 | `P-G02-pause-reanchor` FAIL: pc stayed 4300 | Drive precondition: the paddle was already at the clamp and the drive dragged further right | Drive moves the paddle off the clamp first and asserts that precondition |
| R10 | `P-G05-replay`: IDENTICAL, but the live-state comparison returned null. Investigating found a **host race**: `TraceRecorder.export` read `ticks`/`inputs` *after* `await`, so ticks recorded during hashing could enter a trace whose final hash came from an earlier state | Host bug in `host/trace.js` | Synchronous snapshot before any `await`; the live canon is kept for comparison. Rerun: IDENTICAL and live state equal to replay. |
| R11 | `D-G04-hidden-tab-force-pause` FAIL: headless reports `visible` with another tab in front | Test environment limit, not a product result | Reported as NOT-EXERCISED; real-device check pending |

## Commands run (outputs in `evidence/commands.log`, produced by `tools/run-all.sh`)

```
(kit) node --version                                   -> v22.22.0
(kit) node tools/run.mjs verify                        -> VERIFIED DNode-E1-author-kit trust fingerprint 4c7716c7…0244
(kit) npm test                                         -> Verified pinned package and 1280 independently expected public generated cases.
(kit) node tools/run.mjs call bounded.clamp '[5200,500,4300]' -> {"effects":[],"out":4300}
(kit) node tools/run.mjs check ../../game/dnode/breakout.geometry.node -> STRUCTURAL PASS. Not a certificate; …
(kit) node tools/run.mjs check ../../game/dnode/breakout.{physics,control,game}.node -> MissingRoot MissingRoot: breakout.geometry (GB-2)
node tools/check.mjs                 -> compiled 45 nodes; ex 43 passed, 0 failed; removed_count property 10191 checked, 0 failed
node tests/scheduler.test.mjs        -> scheduler fixtures: 11 passed, 0 failed
python3 -I oracle/make_cases.py oracle -> cases 102 ticks 38024
node tools/compare.mjs               -> cases 102: agree 102, disagree 0; ticks agree 38024, disagree 0
node tests/mutants.mjs               -> 17/17 mutants detected (see evidence/mutants.json)
node tools/timing.mjs evidence/tick-timing-node.json -> brick zone mean 1.717 ms, p95 3.011; 5-tick worst p95 15.055 ms
node drives/drive.cjs                -> {"pass":20,"fail":0,"notExercised":1} in 276 s (Chromium 141.0.7390.37)
node tools/replay-node.mjs evidence/traces/*.json -> IDENTICAL ×3
node tools/trace2cases.mjs … && python3 -I oracle/run_cases.py … && node tools/compare.mjs oracle/browser-cases.json … -> cases 3: agree 3, disagree 0; ticks agree 21816, disagree 0
node tools/manifest.mjs
```

## Known limits

- Oracle independence is limited: the same model and session wrote the oracle, and the shared C1–C13. The mutation test shows sensitivity, not independence. A reviewer should bring fresh traces.
- The trust key is in-kit (self-referential). Browser admission has a TOCTOU window (GB-8).
- All timing comes from one Linux VM (Xeon 2.8 GHz). Phone numbers come from emulation on that CPU. Audio was never heard (headless); only its failure isolation was tested.
- The AABB ball is drawn as a circle (A-G3). The paddle has no side faces. Lowest-id bias. A pocket brick can stay overlapped for 1/240 s. All are by design and need G06 judgement.
- The paddle moves in won/lost (C13), unseen under the overlay.
- The tab-hidden force pause is untested headless. The touch hint is chosen by `(pointer: coarse)`, so hybrid devices may see the other hint.
- No render interpolation: each frame draws the latest tick.
- The trace grows for the whole page session (RLE inputs plus a canon string every 60 ticks). Replay costs about 0.8–0.9 ms per tick in the browser (6,247 ticks: 5.6 s; 9,186 ticks: 7.2 s).
- `serve.mjs` binds 127.0.0.1 unless `HOST` is set.

## Handoff to the next model

- **Settled (preserve; changes need a revision record, a new identity and the reruns below):**
  - D-G1, D-G2, D-G3/D-G3.1
  - D-G4.1 to D-G4.4 as built, with C1–C13
  - D-G5.1 r2 touch, r1 keyboard and mouse
  - D-G7
  - RB-1/RB-2 are performance restructurings that must stay semantically equal to the r1 scan and the filter count
- **Freedoms:**
  - D-G5.2 styling, wording, sounds and layout (≥3:1 non-text contrast, a non-audio cue per event, ≥44 px targets, feedback only from `events`/state)
  - the r2 gain and tap thresholds (review-required, with a G06 rerun)
  - host module structure
- **Dependencies:** the kit at `../kit/dnode-e1-kit` with the identities above, the prelude `bounded.clamp`, the browser-e1 profile, Node 22, Python 3 (`-I`), and Playwright with Chromium via `NODE_PATH`.
- **Rerun after any root change:** `tools/run-all.sh` (check and ex, compare, mutants, timing, drives, replay-node, browser compare), then `node tools/manifest.mjs`. The host refuses roots that do not match the manifest.
- **Open:**
  - G01/G06 and the human part of G02 (`HUMAN-TESTING.md`)
  - real iOS Safari and Android Chrome checks (gestures, hidden-tab pause, latency, timing)
  - reviewer-supplied adversarial traces
  - GB-2 to GB-9
- **Next action:** run the human sessions at 390×844 and 1280×800 on recorded devices, and store them under `evidence/human-sessions/`.

## Evidence and release status

Release decision: **incomplete.** The machine obligations G02 (machine part), G03, G04 (except the hidden-tab path) and G05 passed in the recorded environment. G01, G06, the human part of G02, and the real-device and hidden-tab parts of G04 are **pending**. No human acceptance is claimed.
