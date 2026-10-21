# E2.1 Phase A — comparison under REVIEW_PROTOCOL.md

Reviewer: the coordinating Claude session, 2026-10-21. **This is an exposed AI reviewer, not the human reviewer the protocol assumes.** It read `REVIEW_PROTOCOL.md` (including "Expected distinctions") before the trial, and it shares a model family with the Claude participants. Treat every verdict below as a first pass for a human to confirm or overturn.

## Conditions

| | Claude (blind) | Astra (`reviewer/ASTRA_TRIAL.md`) |
| --- | --- | --- |
| Sessions | Three fresh subagent sessions, one per app, launched shop → game → batch and run in parallel. Each saw only `candidate.zip` in an isolated directory. | One session for all three; author-exposed, **non-blind** (Astra designed the blueprints and the kit). |
| Prior exposure | None in-session. The model family may overlap with earlier Claude-authored DNode builds; all three declared this. | Declared fully. |
| Execution | Each verified the kit (`verify`, 1280 public cases) and ran read-only probes; commands and outputs are recorded. No app built. | Re-ran an existing E1 regression ("26 checks passed"). **Not reproducible here:** the supplied bundle has no `tests/run.mjs`. No app built. |
| First responses | Preserved unedited in `phase-a/` (commits `af7aef5`, `cbabbd4`, `77e04f9`). | As supplied. |

Executed facts about the kit that the verdicts rely on are in `KIT_EVIDENCE.md` (F1–F8). After the runs I also confirmed two of the batch participant's claims: a double-BOM file is accepted by the kit CLI, and rejection time is quadratic (500/1000/2000 invalid rows → 0.39/1.14/4.42 s). I also replayed the game participant's G-T3 traces (a) and (b) from its written policy alone; both final states match its predictions exactly.

## Verdicts by dimension

P = pass, F = fail, U = unresolved. A quote follows each mark where the mark depends on wording.

### BP-SHOP

| Dimension | Claude | Astra |
| --- | --- | --- |
| 1 Purpose | **P** — "When the shop cannot know whether the money was taken, it must say so plainly … give a safe 'check' action, not a 'pay again' action." | **P** — "knowing what happened and what to do next." |
| 2 Authority | **P** — separates D-S1–S3 (inherited, fixed), A-S1 (assumed), D-S4/S5 ("AI choices, not human requirements"), and opens U-S1–U-S3. | **P** — "inherited experiment choices … not necessities of all shops." |
| 3 Semantics | **P** — full four fields for `payment.apply`, including idempotent terminal transitions and a failure precedence. | **P** (thinner) — four fields for recovery, without a failure order. |
| 4 Freedom | **P** — C-S1 to C-S4, with exact layout, colours, copy and grayscale validation. | **P** — AS-D1 (390/1280 layouts, 48 px controls) and AS-D2. |
| 5 Preservation | **P** — S-C1 changes only `shop.view`; it keeps `shop.core` identity and forbids "not charged" copy. | **P**. |
| 6 Evidence honesty | **P** — every answer is labelled predicted, and probes are kept separate. | **P** for labels, but the regression claim can't be checked from the supplied artifacts. |
| 7 Handoff | **P** — settled/freedoms/dependencies with full hashes, plus G1–G10. | **U** — "inspect the kit's shop/profile boundaries" does not tell a successor what is settled at value level. |

**Expected distinctions — Claude.** All six are present:
- the stock example gives 3/1/2, with delta and net counterexamples;
- the same key with a changed intent conflicts;
- a deliberate second purchase gets a new key;
- a lost reply keeps its identity and reservation;
- atomicity needs a real state boundary, tested with a negative control;
- numeric text faults on shape before any precondition.

**Expected distinctions — Astra.** All six are present.

**Challenges (originals preserved; counterexamples given).**
- **Claude C-S1: one transaction for submit → charge → apply.** The design is correct in the kit only because the simulated bank shares the app's `localStorage` record (F7). Counterexample: `payment.apply` faults (say, an invariant bug) after `simulatedBank` has recorded a charge. The whole record is discarded, so in the simulation no charge exists. A real bank would have charged with no local record, and inquiry-only recovery could not find it from a "ready" order. Claude flagged this as G3 and noted that real payments need "a write-ahead pending record plus same-id resubmission", but still chose the design. **U** — acceptable for E1 only if the owner accepts the simulator scope; it must not be carried to Phase B as a payment pattern without that ruling.
- **Claude S-C1 copy: "Bạn không cần thanh toán lại" (You do not need to pay again).** True inside the simulator, because an `unknown` there is never a hidden decline. A real unknown can resolve to *declined*, and then the customer does need to pay again. Astra's "Hãy kiểm tra lại trạng thái trước khi thực hiện thanh toán khác" (check the status before making another payment) states only what is guaranteed. Minor; **U** until a Vietnamese reader reviews it.
- **Astra S-T5: "A declared UI/input adapter may parse strict text."** This leaves room for the parse to happen in host code. Claude pins it to one DNode node (`shop.core.parse_qty`), which matches "DNode owns cart validation". Minor.
- **Neither** addresses "an `unknown` that never resolves". Claude records it as U-S3; Astra does not mention it.

### BP-GAME

| Dimension | Claude | Astra |
| --- | --- | --- |
| 1 Purpose | **P** | **P** |
| 2 Authority | **P** — flags the SEMANTICS.md vs D-G4 conflict as "ambiguous authority" (U-G3) and labels its adoption as a choice. | **U** — does not mention that the signed kit already describes a geometry. |
| 3 Semantics | **P** — four fields for `physics.microstep` with explicit invariants. | **P** — pause four fields. |
| 4 Freedom | **P** — exact geometry, velocity set, five deflection zones, scheduler, palette, feedback. | **P** — AG-D1, AG-D2. |
| 5 Preservation | **P** — G-C1 r2 changes only `control.*` and the input type; it requires the `breakout.physics` identity to stay unchanged and keyboard traces to replay identically. | **P** |
| 6 Evidence honesty | **P** — "This argument is predicted, and the high-speed traces must confirm it." | **P** — "Do not claim microstep count by itself proves collision completeness." |
| 7 Handoff | **P** | **P** (thinner) |

**Expected distinctions — both.** Both cover all six:
- different catch-up caps can differ (Claude gives a 100 ms stall counterexample with jump sizes);
- E2 pins five catch-up ticks at 60 Hz;
- paused time is discarded;
- the tie rule is a declared choice;
- oracle agreement is not enjoyment;
- the renderer may not repair state.

**Convergence worth noting.** Working blind, Claude's G-C1 revision (relative drag, no jump on touchdown, re-anchor on resume) is essentially Astra's AG-D2. Both chose walls → paddle → lowest-id brick, with vertical priority at a corner.

**Challenges.**
- **Astra AG-D1 contradicts the kit Astra signed.** AG-D1 has a paddle of 900×100 at y = 5900 and "±40 per microstep". The signed `SEMANTICS.md` says a paddle 1000 wide, top 5700, height 140, and "maximum absolute velocity 40 per tick (steps ≤10)". 40 per microstep is 160 per tick, four times the documented envelope. Either the kit paragraph is stale or AG-D1 is wrong. This strengthens U-G3: the owner must rule which source binds before any trace is written.
- **Claude D-G4.3: the paddle has no side faces.** It is declared, and G06 is asked to watch for it. A ball grazing the paddle side passes through visibly. That is a fairness risk recorded as a choice, not a hidden defect.
- **Both:** the kit has no game host (F5), so D-G3 is implemented separately by every author and checked by nobody. Claude names it as Gap 1. Astra's pause four-field definition says "host discards paused elapsed backlog" without noting that no such host ships.

### BP-BATCH

| Dimension | Claude | Astra |
| --- | --- | --- |
| 1 Purpose | **P** | **P** |
| 2 Authority | **P** — D-B1–B4 fixed; D-B6's reading of "run ID" (U-2) is flagged review-required rather than assumed. | **P** |
| 3 Semantics | **P** — four fields for `batch.publish`, with a six-level failure precedence and interruption windows. | **P** |
| 4 Freedom | **P** — exact banner texts, hint rules, run-ID construction, publication order. | **P** — AB-D1, AB-D2. |
| 5 Preservation | **P** — B-C1 refuses partial acceptance, rejects the "export valid rows" shortcut with a counterexample, and proposes EP-B1 as a separate artifact kind with a new supplier identity. | **P** — same conclusion, less specific. |
| 6 Evidence honesty | **P** — observed and predicted results are separated row by row. | **U** — B-T2 predicts "numeric grammar rejection" vs "out-of-range field rejection" as distinct outcomes; the pinned root that Astra shipped gives both the **identical** message (F1). Labelled a prediction, but it describes the kit's behaviour wrongly. |
| 7 Handoff | **P** | **P** |

**Expected distinctions — Claude.** All six are present:
- leading zeros are accepted;
- whitespace and out-of-range values are rejected with located diagnostics, and Claude observed the wording to be identical and added hints that "never decide";
- duplicates reject everything;
- a quoted newline does not increment the record count (observed records 2 and 4, against physical lines 4 and 7);
- old output is preserved and labelled old;
- partial acceptance needs an explicit new meaning contract.

**Expected distinctions — Astra.** All six are stated, but the second does not hold against the kit, as noted under dimension 6.

**Challenges.**
- **Astra B-T5 vs Astra's own kit.** Astra says the current report will be "explicitly rejected/no new publication". The shipped CLI writes **no** report for MalformedCSV, oversize or non-UTF-8 input and leaves the previous `ok:true` report in place (F2). Its reports carry no run identity (F3). AB-D1 is the right remedy, but it is a proposal, and the kit as frozen fails the property Astra predicts.
- **Claude D-B7 (snapshot first, then report).** Between the two renames the new snapshot sits beside the old report, so it is only *detected* as unverified, and only by a consumer that applies the usability rule. That depends on the shop adopting it (O5). The shop participant independently chose to import the batch JSON without a report check (C-S3). **The two Claude designs don't yet compose**, and this is the first cross-app item to settle.
- **Claude D-B6:** the run ID is computed over raw bytes, while the blueprint says "canonical normalized input". This is a reasoned deviation (unparseable files still need an ID) and is flagged for review, not hidden.

## Mandatory acceptance mapping

Every S01–S08, G01–G06 and B01–B06 ID has a responsibility and an evidence status in **all six** submissions. Nothing is marked passed. Human acceptance is pending everywhere, and no submission claims otherwise.

## Distribution gaps to fix before Phase B

These are distribution gaps, not author errors. Each one lists who found it.

1. **No game host.** There is no tick scheduler, input-event schema, renderer bridge or game fixtures, although the profile declares 60 Hz / 5 ticks and SEMANTICS.md claims a generic bridge. Found by the coordinating session and the game participant.
2. **SEMANTICS.md game paragraph vs D-G4.** It is incomplete and conflicts with Astra's own AG-D1. A one-line owner ruling is needed.
3. **Batch CLI publication.** It leaves a stale `ok:true` report after fatal rejections, binds no run, input or output identity, writes the report before the snapshot, and accepts a double BOM. Found by the coordinating session and the batch participant.
4. **`supplier` root diagnostics.** One message covers syntax and range errors. MalformedCSV has no location. Wrong-shape rows are left out of duplicate involvement. Rejection is quadratic (~4 min for 10 000 invalid rows).
5. **Payment simulator.** It shares the app's transaction record. Inquiry `unknown` does not distinguish "no record" from "unavailable". Intent is compared by amount only.
6. **Thin public evidence.** `from_csv` cases are all trivially valid; there are no `nat_fits` boundary cases; there are no payment or seed fixtures. The dictionary omits `with` and `run-file`.
7. **Trust fingerprint.** Every participant could check it only against the README inside the same kit.

## Owner decisions needed before Phase B

- **U-G3:** does the SEMANTICS.md game paragraph bind authors? If it does, AG-D1 must change; if it doesn't, the paragraph should be removed or relabelled.
- **U-1 / U-S2:** what does a SKU absent from an accepted snapshot mean on shop import? Neither blueprint says, and it blocks B-C1 impact analysis and shop import design.
- **U-S1:** does PRICE_VND/NAME in a snapshot reprice or rename the catalogue?
- **Simulator scope:** is "charge inside the app transaction" acceptable for E1? If not, the kit needs a separate bank store.
- Fix gaps 1, 3 and 5 in the kit **or** freeze them as known limits. Phase B authors are otherwise each re-implementing (or tripping on) the same host gaps, which defeats "hold the distribution constant".
