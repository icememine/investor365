# Breakout on DNode E1 (BP-GAME, E2.1 Phase B)

The game logic is four DNode roots in `dnode/`. A small browser host runs them through the frozen E1 author kit. The host's jobs are scheduling, input, drawing, sound and trace record/replay. DNode decides everything about the game.

## Launch

The kit must sit beside this directory at `../kit/dnode-e1-kit` (read-only and unmodified). Requires Node.js 22+.

```
node serve.mjs            # http://127.0.0.1:8102/   (PORT=xxxx to change)
```

Open http://127.0.0.1:8102/ to play. Open http://127.0.0.1:8102/?desk=1 for the same game with the test desk. The desk shows identities, tick timing, replay from initial (IDENTICAL/DIFFERENT), trace download and upload, render/audio fault injection, a long-frame injection and a +30 s clock jump.

`serve.mjs` serves this directory at `/` and `../kit/dnode-e1-kit/dist/` at `/kit/`. The page then:

1. verifies the kit with the kit's `verifyBundle` and its trust key, with the fingerprint pinned to `4c7716c7…0244`;
2. checks the four root files against `app-manifest.json`;
3. only after both checks pass, compiles and runs anything.

If either check fails, the page shows "Refusing to run".

## Controls

| | Move | Launch / play again | Pause |
|---|---|---|---|
| Keyboard | ← → or A D | Space, Enter or ↑ (R restarts while paused or after the game ends) | P or Esc |
| Mouse | move over the field | click | pause button |
| Touch | drag anywhere on the field or the strip below it (relative, 1.5×) | tap | pause button |

## Layout

| Path | What |
|---|---|
| `dnode/breakout.geometry.node` | Types, D-G4.1 dimensions, brick rectangles, overlap, `geo.layout` for the renderer |
| `dnode/breakout.physics.node` | D-G4.2 zones, D-G4.3 microstep (walls → paddle → lowest-id brick, win, exit) |
| `dnode/breakout.control.node` | Paddle control: keyboard and mouse r1, touch r2 (uses prelude `bounded.clamp`) |
| `dnode/breakout.game.node` | D-G4.4 phase machine, `game.initial`, `game.tick`, C10 validity predicate |
| `host/` | `kit.js` admission, `scheduler.js` D-G3.1, `input.js`, `render.js`, `audio.js`, `trace.js`, `desk.js`, `main.js` |
| `oracle/` | Independent Python oracle (`policy.py`), clarifications it was written from, case generator, expected results |
| `tools/` | Node harness (`lib.mjs`), `check.mjs` (compile + inline `ex` cases), `compare.mjs` (DNode vs oracle), `timing.mjs`, trace tools, `run-all.sh` |
| `tests/` | Scheduler fixture, mutation sensitivity test, language probe, preserved first physics revision |
| `drives/drive.cjs` | Playwright drives at 1280×800 and 390×844 (touch) |
| `evidence/` | Machine results (`*.json`), screenshots, browser-recorded traces, `commands.log` |

## Re-running the checks

```
node serve.mjs &                         # needed for the drives
NODE_PATH=/usr/local/lib/node_modules_global sh tools/run-all.sh   # writes evidence/commands.log
```

The individual commands are listed in `tools/run-all.sh`. Python is always run with `python3 -I`.

None of this is certification. Human acceptance (G01, G06 and the human part of G02) is pending; see `HUMAN-TESTING.md`. The submission is `PHASE_B_BP-GAME.md`.
