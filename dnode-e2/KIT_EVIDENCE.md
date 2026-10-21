# E2 reviewer evidence — executed checks against the enclosed author kit

Author: the coordinating Claude session (2026-10-21). **Not a Phase A participant submission.** This session read `README.md` and `reviewer/REVIEW_PROTOCOL.md` (including its "Expected distinctions") before the Phase A runs, so it is exposed and its views cannot count as blind. The blind submissions are in `phase-a/`, produced by three fresh subagent sessions that saw only `candidate.zip`.

Everything below was **executed**. Where it says "gap", it's a property of the frozen kit, not of any participant.

## Package identity

- All ten `candidate.zip` entries match the SHA-256 digests in `MANIFEST.json`.
- `node tools/run.mjs verify` → `VERIFIED DNode-E1-author-kit trust fingerprint 4c7716c7…0244` (matches the fingerprint printed in the kit README; that's the only out-of-band copy I have, so this is consistency, not independent trust).
- `npm test` → `Verified pinned package and 1280 independently expected public generated cases.`
- This kit is **Astra's E1 author kit** (`browser`/`batch` profiles, `prelude` + `supplier` roots). It is *not* the Fable E1 package committed in `../dnode-e1/` (which has `pure`/`panel`/`canvas`/`batch` profiles and 50 natives).

## Challenge inputs run through the pinned `supplier.from_csv`

| Case | Observed |
| --- | --- |
| B-T1 `PEN,"Blue, fine",020000,003` | `ok:true`, `{sku:"PEN", name:"Blue, fine", price:20000, stock:3}` |
| B-T2 `PRICE_VND=" 20000"` | `ok:false`, record 1, PRICE_VND, "Expected a positive bounded decimal integer" |
| B-T2 `PRICE_VND=9007199254740992` | **same** record/field/message as the whitespace case |
| `PRICE_VND=9007199254740991` | accepted |
| B-T3 two identical `PEN` rows | `ok:false`; SKU duplicate issue on records 1 **and** 2; no rows |
| B-T4 quoted newline in record 1, duplicate PEN at record 3 | duplicates reported at records **1 and 3** (logical records; the embedded newline does not shift numbering) |
| header only | `ok:false`, record 0, field `file`, "An empty snapshot cannot replace stock" |
| broken quote | **fault** `MalformedCSV` (not a report value) |
| BOM + CRLF | accepted |
| NAME of 120 emoji / 121 emoji | accepted / rejected — `len` counts Unicode scalars, as declared |
| lowercase SKU; SKU `"PEN\n"` | both rejected with the SKU message (no case folding, `$` does not admit a trailing newline) |
| S-T5 `bounded.clamp(["2",0,10])` | **fault** `InputShape` before any precondition |
| 10 001 data rows (CLI) | fault `TooManyRows` |

## Findings

**F1 — B-T2: no diagnostic distinction (pinned root).** Whitespace (`" 20000"`) and out-of-range (`9007199254740992`) produce byte-identical issues. The blueprint asks for *actionable* diagnostics (B03/B06) and the challenge asks for the distinction; the shared root can't supply it. A batch app can add its own explanatory classification of the raw field text, but the acceptance decision must remain `supplier.validate`'s.

**F2 — B-T5: stale `ok:true` report after a fatal rejection (kit CLI, `tools/run.mjs batch`).** Sequence executed: valid file → `out.json` + `out.json.report.json` (`ok:true`); then a broken-quote file → exit 1, `MalformedCSV` on stderr, **no new report written**. The destination still holds the previous run's `ok:true` report and snapshot. An operator reading the files sees "accepted" for a run that was rejected. `TooManyRows` and `FileTooLarge` take the same path.

**F3 — B-T5: nothing binds files to a run.** The report carries only `transformer` (root hash). It has no input digest, run ID, output digest or timestamp, and the snapshot carries nothing. After an ordinary rejection (exit 2) the old `out.json` is byte-identical (`bdc6092c…441f`) and unmarked. BP-BATCH requires "a run ID binds canonical normalized input/interpretation and pinned transformer identity" and A-B1 requires "each report binds the run and output identity/status". The kit host doesn't do it.

**F4 — publication order.** On success the CLI writes the report first and the snapshot second, each via temp file + rename. An interruption between them leaves an `ok:true` report next to the *previous* snapshot. Combined with F3, the mismatch can't be detected.

**F5 — no game host in the kit.** `browser.json` declares `tickHz: 60, maxCatchUpTicks: 5`, and `SEMANTICS.md` says "Host: generic renderer/event bridge". However, `dist/runtime/` contains no tick scheduler, pause handling, input-event types, render primitives or trace recorder (`grep -i 'tick|render|frame|canvas|pointer'` over `runtime/*.js` → nothing). D-G3 ("if the supplied host cannot implement it, report the gap") therefore applies: every game author must write the scheduler, so the catch-up policy is not held constant by the distribution.

**F6 — game geometry authority conflict.** `SEMANTICS.md` pins a partial game policy (4800×6400 field, paddle width 1000 at y 5700, ball radius 60, four microsteps, |v| ≤ 40/tick, "first overlapping brick by ID", walls → paddle → brick). BP-GAME D-G4 says geometry, tie priority and tunneling policy are **delegated** to the author. Brick dimensions, launch velocity and paddle speed are absent from both. The owner should say which source governs.

**F7 — shop simulator shares the app's transaction.** `SessionStore` keeps the app state *and* the simulated bank in one `localStorage` record under one Web Lock. A charge dispatched inside the same transaction is therefore atomic with the app's own state change, which a real bank can never be. If the function throws after the charge, the bank entry is lost too. "Crash after dispatch, before recording" can't be produced; only `mode:'lost'` is available. Separately, `payment.inquire` returns `unknown` both for "never received" and for "inquiry unavailable", so an app can't tell them apart through the simulator.

**F8 — simulator intent = amount only.** `IntentConflict` triggers only when the same id arrives with a different amount. A changed cart with an equal total (NOTEBOOK×2 vs PEN×5, both 100 000 ₫) is not detected by the simulator; the shop's own operation binding must compare full canonical intent (lines + total).
