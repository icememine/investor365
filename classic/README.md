# Ánh Trăng Classic — Ca đêm ở Công viên Ánh Trăng

A standalone fork of the original three-room game, taken from `game/` just before the Hầm Ma
action-RPG mode was added (commit `52612c8`). It has no dungeon code and evolves separately from
`game/`. Only the standalone exporter was updated to the newer, safer version.

A haunted-house RPG / simulation prototype with three rooms and two roles:
**visitor** (explore, hide, use the flashlight, find clues) and **employee** (place speakers,
admit guests, scare them).

1. **Phòng Nghĩa Địa** (cemetery): Xác Sống hunts by ear. Loose boards creak, running is loud,
   and a thrown coin pulls him away. Light only makes him flinch, then he follows it, and a lit
   flashlight gives away the coat hiding spot. Na's lost hair clip is hidden here. Staff can hide
   in the standing coffin and burst out for a guaranteed surprise. The arch leads on to room 2.
2. **Bàn Tiệc Ma Cà Rồng** (dining room): the vampire hunts by sight. Three clues unlock Khách
   Số 0 (Zin) and the story endings. The door leads on to room 3.
3. **Hành lang Ma Cổ Dài** (corridor): a head rides a ceiling rail and drops on whoever stands
   under its shadow. Crouch (Q), yank the pulley rope, shine the flashlight on the pulley to jam
   it, or take the dark staff back door. Light on her face only helps her find you. A wig on a
   second rope casts a decoy shadow. Staff work the rope: movement steers the head, Space drops
   it, and the walkie-talkie calls a coworker to take over for a while. The far door ends the visit.

The start screen picks the starting room; a visitor run normally starts in the cemetery. Full design, script and architecture notes: [GAME-DESIGN.md](GAME-DESIGN.md).

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
| `src/rooms.mjs` | Room data: bounds, colliders, spots, ghost type, guest routes. Add rooms here. |
| `src/sim.mjs` | Authoritative game state, pathfinding, interactions, ghost/guest AI, endings. No DOM. |
| `src/art.mjs` | Procedural placeholder art: the cemetery (painted from its colliders) and the Xác Sống sprite. |
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
