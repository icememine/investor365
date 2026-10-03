# Ánh Trăng — Ca đêm ở Công viên Ánh Trăng

A haunted-house RPG / simulation prototype. One room (the vampire dining room), two roles:
**visitor** (explore, hide, use the flashlight, find clues) and **employee** (place speakers,
admit guests, scare them). Full design, script and architecture notes: [GAME-DESIGN.md](GAME-DESIGN.md).

Plain HTML5 Canvas + ES modules. No framework, package manager or server code.

## Play

- **Offline:** open `simulator.html` directly in a browser.
- **From source:** ES modules need HTTP, so serve this folder and open `src/index.html`:

  ```sh
  python3 -m http.server 8000   # then http://localhost:8000/src/index.html
  ```

Controls: WASD/arrows or tap the floor to move · E use · Space flashlight / scare ·
Q hide / trigger speaker · P place speaker · Shift run · J journal · Esc pause.
Phones get a joystick and action buttons.

## Layout

| Path | Role |
|---|---|
| `src/sim.mjs` | Authoritative game state, pathfinding, interactions, ghost/guest AI, endings. No DOM. |
| `src/app.js` | Input, camera, Canvas rendering, HUD, dialogs. |
| `src/index.html`, `src/style.css` | Layout, HUD, touch controls. |
| `assets/world.png`, `assets/actors.png` | Room backdrop and the 4-sprite character atlas (`actors.atlas.json`; the crops are mirrored in `app.js`). |
| `tools/build-standalone.py` | Generates `simulator.html` with CSS, JS and PNGs inlined. |
| `tests/sim.test.mjs` | Headless tests for the simulation rules. |

`src/` is the source of truth. `simulator.html` is generated, so don't edit it by hand.

## Develop

```sh
node --test tests/*.test.mjs        # simulation rule tests (Node 18+)
python3 tools/build-standalone.py   # rebuild simulator.html after changing src/ or assets/
```
