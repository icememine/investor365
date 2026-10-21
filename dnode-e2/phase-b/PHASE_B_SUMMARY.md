# E2.1 Phase B — summary across the three applications

Date 2026-10-21. Kit: `kit/dnode-e1-kit`, the frozen author kit enclosed in `candidate.zip` (zip sha256 `141331a5…5633`), byte-identical and `verify`-clean after all work. Runtime identity `fd854bcb708f3031824b14819fe126b0be96b241ced19416035b6f49d4d7c55e`. Rulings: `OWNER_RULINGS.md`.

## Conditions

- Each app was built by a fresh Claude session. It had the frozen kit, the E2 package, **its own Phase A handoff** and the owner rulings, and no access to the conversation that produced the design: this is the STRUCTURE §11 step 6 continuation condition. The three ran in parallel, each restricted to its own directory.
- The same model family wrote each app's code **and** its oracle. Oracle independence is therefore limited to "written from the text before comparing". A reviewer who did not author the implementation should supply fresh cases before broader claims (REVIEW_PROTOCOL, next phase).
- The coordinating session then re-ran every app's full suite itself. Logs are in `recheck/`. Each app's own `evidence/` is preserved as the builder recorded it.
- **No human has used any of the apps.** Every human obligation is pending, and every release is **incomplete**.

## Launch

| App | Command (from its directory) | URL |
| --- | --- | --- |
| Shop — Pencil & paper, Vietnamese customer UI | `node serve.mjs` | http://127.0.0.1:8101/ (test desk: footer link) |
| Breakout | `node serve.mjs` | http://127.0.0.1:8102/ (`?desk=1` for test desk) |
| Batch transformer | `node serve.mjs` / `node batch-host.mjs <in.csv> <dest>` | http://127.0.0.1:8103/ |

Node 22+, with no npm install. For phone testing, use `HOST=0.0.0.0` where the app's README says so. Each page refuses to run if the kit, its trust key or the app roots fail admission (tamper tests pass in all three).

## Obligation status (observed; human parts pending)

| App | Passed (machine) | Pending (human) | Not passed |
| --- | --- | --- | --- |
| Shop | S02, S03, S04, S05, S06, S07 | S01, S08 (machine-observable parts pass at 390×844 and 1280×800) | — |
| Game | G03, G04, G05; machine parts of G01, G02 | G01, G02 (real device), G06 | — |
| Batch | B01, B02, B04, B05, machine parts of B06 | B06 | **B03, one input class:** a record with more than 50,000 fields gives a tool fault (`ResourceLimit`) instead of a located row rejection. Kit gap G-7, reproducible with the kit's own `run.mjs call supplier.from_csv`. |

## Re-check by the coordinating session

| App | Re-run result |
| --- | --- |
| Shop (`tests/run-all.sh`, RACE_N=10) | 33/33 inline cases. Oracle: 400 scenarios, 4016 steps, 0 mismatches. 9/9 seeded bugs caught. Browser 76/76, including the two-page last-unit race with the kit lock (one winner every run) and without it (race detected). |
| Game (`tools/run-all.sh`) | Oracle 102/102 cases, 38,024 ticks agree. Browser-recorded sessions 3/3 (22,323 ticks). 17/17 policy slips detected. Scheduler fixture 11/11. Replays IDENTICAL. Drives 20 pass, 1 not exercised. **Plus** `recheck/game-visibility-probe.cjs`: the tab-hidden force-pause the drive couldn't reach passes 5/5 with simulated visibility. A real device must still confirm it. |
| Batch | 27/27 inline. Fixtures 87/88 agree (the disagreement is G-7; the oracle keeps the blueprint's expectation). CLI B04/B05 32/32, including kills mid-publication. Browser 88/88. |

## Distribution gaps (consolidated; reproducers in each app)

1. **No game host.** There is no scheduler, input or event schema, renderer bridge or public game traces. D-G3 is therefore author-implemented and checked only by each author's own fixture.
2. **`run.mjs check`** takes one file, so multi-root apps fail with `MissingRoot`. It never runs inline `ex` cases, so a wrong example still passes. It always uses the browser profile.
3. **Root identity derivation** isn't reproducible from public files, so app roots are pinned by file SHA-256.
4. **Browser time-of-check/time-of-use:** runtime modules are imported separately from the bytes `verifyBundle` hashes. The kit's own `index.html` does the same.
5. **Supplier root:**
   - one message for both syntax and range errors;
   - MalformedCSV has no location;
   - wrong-shape rows are left out of duplicate involvement;
   - rejection time is quadratic (10,000 invalid rows: about 6 min);
   - more than 50,000 fields in one record gives `ResourceLimit` (G-7).
6. **Kit batch CLI:**
   - leaves a stale `ok:true` report after a fatal rejection;
   - binds no run identity;
   - writes the report before the snapshot;
   - accepts a double BOM.

   The batch app's own host avoids all four.
7. **Payment simulator:**
   - shares the app's transaction record;
   - `unknown` doesn't distinguish "no record" from "unavailable";
   - compares intent by amount only;
   - refusals carry no detail.
8. **Language and documentation:**
   - `with` is undocumented;
   - there is no "count matching" native (per-call cost is 20–28 µs, so the game had to be optimised in DNode, not the host);
   - the trust fingerprint is self-referential.

## Known limits carried into release

- **Shop R-S4:** charging in one transaction is valid only inside the E1 simulator. It is not a real-bank pattern.
- **Shop R-S6:** an unresolved `unknown` holds its reservation indefinitely.
- **Shop lock scope:** one origin, one browser profile.
- **Game timing:** the worst-case 5-tick batch takes 15.1 ms in Node, inside a 16.7 ms frame with thin margin. Real-phone timing is unmeasured.
- **Batch:** no fsync. Browser exports are new run-ID files, never a replacement.

## What only a person can do now

Follow each app's `HUMAN-TESTING.md` on a real phone (390×844 class) and a desktop (1280×800), recording reviewer, date, device/browser, result and reasons:

- **Shop:** S01 and S08, with a Vietnamese-reading first-time user.
- **Game:** G01, G02 and G06. Record frustration, confusion, perceived fairness and responsiveness, not just pass/fail. Also check the tab-hidden pause on the device.
- **Batch:** B06, the operator correction task.

Until those are recorded, every release decision stays **incomplete**.
