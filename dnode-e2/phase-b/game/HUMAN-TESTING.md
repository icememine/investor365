# Human testing: G01, G02 (human part), G06

Status: **not yet run. Every result is pending.** The automated drives only check facts a machine can observe. They do not show that a person understands the game, finds it responsive or finds it fair, so do not treat them as a substitute for these sessions.

## Set-up (record all of it)

1. On the test machine run `node serve.mjs` (kit at `../kit/dnode-e1-kit`). For a phone on the same network, run `HOST=0.0.0.0 node serve.mjs` and open `http://<machine-ip>:8102/`. Note how the phone reached it.
2. Record the device inventory before timing anything:
   - device model
   - OS version
   - browser and version
   - screen size and DPR
   - input (finger, mouse model, keyboard)
   - power state
   - whether Low Power Mode is on
3. Use the required conditions:
   - **phone**: a 390×844 CSS-px viewport (e.g. iPhone 12–15 portrait), in iOS Safari *and* Android Chrome if possible;
   - **desktop**: a 1280×800 browser window.

   Confirm the viewport with `?desk=1` → Identities, or with `innerWidth`/`innerHeight` in the console.
4. Use a first-time player for G01. They must not have seen this game, the blueprint or this file. Give **no verbal coaching**. Say only "please play this game" and then stay silent.
5. Keep the test desk **off** (`/` not `/?desk=1`) for player sessions. Use `/?desk=1` only to download the trace afterwards: open the desk in the same tab only after the session, or ask the player to press nothing else.

## Session script (phone and desktop, about 10 minutes each)

| Step | Player does | Observer records |
|---|---|---|
| 1 | Opens the page and looks at it for up to 30 s | Did they find out how to move and launch without help? Time to first paddle movement; time to first launch; any wrong attempts (e.g. pressing on the ball, scrolling, pinching) |
| 2 | Plays freely until they win or lose all 3 lives | Misses they blame on the controls ("it didn't go where I wanted") vs on themselves; accidental launches; any page scroll, zoom, text selection or long-press menu; whether the paddle ever "jumped" |
| 3 | Pauses (their own choice of method), waits about 30 s, resumes | Could they find pause? Did anything move during the pause? Did the ball jump on resume? |
| 4 | Plays to a game end, then plays again | Was the restart obvious? Was the new game exactly a fresh start? |
| 5 | Desktop only: tries both keyboard and mouse | Preference; any conflict between the two (e.g. paddle pulled toward a resting mouse) |
| 6 | Phone only: drags from the strip below the field, then on the field itself | Is relative drag (the paddle does not jump to the finger) understood? Does a thumb travel of about 190 px for the full range feel right? |

## Ratings and questions (ask after the session; write the player's own words)

Use a 1–5 scale and also record the reason for each rating.

- **Readability** (G06): could you always see the ball, the paddle and the remaining bricks? Did the round-looking ball ever seem to hit or miss a brick unfairly? (The collision box is square: assumption A-G3.)
- **Responsiveness** (G06): did the paddle follow you immediately? Any lag?
- **Fairness** (G06): did every lost life feel like your own fault? Did the ball ever pass through the paddle edge? (The paddle has no side faces, by design: D-G4.3.)
- **Pace** (G06): was the ball too slow, too fast or about right? (This is the biggest predicted risk in D-G4.2.)
- **Frustration** and **confusion**: list each moment and what caused it.
- **Feedback**: did brick breaks, paddle hits and lost lives feel noticeable with the sound off? And with it on?
- **Enjoyment**: would you play another round? Why or why not?

## Measurements (kept separate from ratings)

- With `?desk=1` after the session: record the "ms per game.tick" mean, p95 and max, and "frames at 5-tick cap" and "discarded ticks". Note the device.
- Optional: estimate input-to-paint latency with a slow-motion camera (finger or key down to paddle movement on screen). Report frames at the camera fps.
- Download the trace (desk → Download trace) and keep it with the notes. Anyone can then replay it: desk → choose file → expect IDENTICAL.

## Where to record

Add one entry per session to `evidence/human-sessions/<date>-<device>-<reviewer>.md`, containing:

- reviewer (name or code)
- prior exposure
- device inventory
- step observations
- ratings with reasons
- frustration and confusion list
- measurements
- trace file name

Then update the G01/G02/G06 rows in `PHASE_B_BP-GAME.md`, quoting the session files. Until such files exist, G01 and G06 stay **pending**, and so does the human part of G02.

## Also pending (needs a real device, not drivable headless)

- The tab-hidden force-pause (visibilitychange). Switch apps or tabs mid-play, return, and confirm the game is paused with nothing moved.
- iOS Safari gestures: edge-swipe back, double-tap zoom, and the long-press callout during play.
