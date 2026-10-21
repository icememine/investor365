# E2.1 owner rulings for Phase B

Issued 2026-10-21 by the coordinating session, acting under the experiment owner's instruction to "decide according to the blueprint". These rulings resolve the open items from the Phase A submissions. Each records its status, reason and variation policy. Where a ruling amends a Phase A decision, the amendment is named. Everything not mentioned here stays as the Phase A handoff settled it.

## General

- **R0.1 — Kit is frozen and read-only (fixed).** Use `kit/dnode-e1-kit` exactly as shipped: runtime, roots, profiles, natives, checker, fixtures. Never edit it. Kit gaps are handled in application host code **only within the host's declared responsibility**: scheduling, rendering, input capture, file bytes, publication, session persistence. Each one is also recorded as a distribution gap with a minimal reproducer. Business, game and data-meaning decisions never move into host code to work around a gap. *Reason:* the experiment holds the distribution constant (BP §1, START_HERE step 7).
- **R0.2 — Admission before execution (fixed).** Every host verifies the kit with `verifyBundle` and the kit trust key before running any node, and refuses to run on failure. The trust fingerprint is the in-kit one, recorded as self-referential (known limit).
- **R0.3 — Build the latest settled revisions (fixed).** Shop builds C-S2 **r2** (Vietnamese customer UI). Game builds D-G5.1 **r2** (relative touch drag) for touch and r1 for keyboard and mouse. Batch builds D-B5a **rev 2**.
- **R0.4 — Evidence honesty (fixed).** Human acceptance (S01, S08, G01, G06, B06, and the human parts of G02) stays **pending**. Automated drives may check the geometry and observable facts those obligations need, but must not be reported as acceptance. Preserve first failures and repairs in a repair log.
- **R0.5 — Test environment (fixed).** Use headless Chromium from `/opt/pw-browsers` (never run `playwright install`), at 390×844 and 1280×800 viewports, with screenshots saved. Playwright is importable from CommonJS (`require('playwright')`, via `NODE_PATH`). From ES modules use `createRequire`. No performance threshold is set for E1: **measure and report only** (resolves game U-G2).

## BP-SHOP

- **R-S1 — Supplier import reads the supplier CSV through `supplier.from_csv` (amends C-S3; review-required → settled).** The shop operator chooses a supplier CSV, the same input the batch tool takes. The host decodes it with `TextDecoder('utf-8',{fatal:true, ignoreBOM:true})` and enforces 1 MiB before decoding. DNode calls the attested public entry `supplier.from_csv` and gets located diagnostics. Only then are shop compatibility checks applied (SKU set, `H_new ≥ R`). *Reason:*
  - it uses an **attested** entry instead of the unattested `supplier.valid_products` (gap G6);
  - it gives the operator record and field locations;
  - it removes any dependency on matching a batch report to a snapshot (the cross-app composition gap found in review);
  - it is still the single shared supplier definition.
- **R-S2 — SKU-set rule (resolves U-S2, settled for E1).** An accepted snapshot is a *whole replacement* of physical unsold stock for the catalogue. Neither blueprint defines what an absent or extra SKU means. Deletion, zeroing and "unchanged" would each silently change meaning, so in E1 the import **refuses `SkuSetMismatch`** unless the snapshot's SKU set equals the catalogue's, listing every missing and extra SKU. The state is unchanged on refusal. *Variation:* review-required. Adding products or retiring SKUs needs a new blueprint rule.
- **R-S3 — Price and name are not applied (resolves U-S1, settled for E1).** Snapshot PRICE_VND and NAME are validated but do not change catalogue price or name. Captured order prices are immutable regardless. The preview shows differences as "not applied in E1".
- **R-S4 — Simulator scope (resolves the review challenge on C-S1; settled for E1 only).** C-S1's single `SessionStore.transaction` (submit → dispatch → apply) is **accepted only within the E1 simulator scope**. The kit's simulated bank shares the app's stored record (gap F7/G3). Record it in the submission as a known limit: *not a payment pattern for a real external bank*, which would need a write-ahead pending record before dispatch. Recovery stays inquiry-only with the same instruction id.
- **R-S5 — Uncertainty copy (amends C-S2 r2).** Replace the last sentence "Bạn không cần thanh toán lại." with **"Vui lòng không thanh toán lại cho đơn này trước khi có kết quả."** ("Please don't pay again for this order before there is a result."). *Reason:* a real unknown can resolve to declined, so "you don't need to pay again" overstates. The new sentence is true in every outcome. The heading "Đang xác nhận thanh toán" and the label "Kiểm tra lại thanh toán" are unchanged.
- **R-S6 — Indefinite unknown (U-S3).** Stays open. The reservation is held, no timeout release happens, and the test desk shows it. Record as a known limit.
- **R-S7 — Product display names (U-S4).** Keep the catalogue names (Notebook, Pen, Tote bag). No Vietnamese product names are invented.

## BP-GAME

- **R-G1 — SEMANTICS.md game paragraph (resolves U-G3, settled).** It is a **reference description, not a binding**. BP-GAME D-G4 (E2) is the newer authority and delegates geometry to the author, and no kit root or checker enforces the paragraph. The Phase A geometry (D-G4.1–D-G4.4), which deliberately adopts its compatible parts, is the settled policy. Astra's AG-D1 is not inherited.
- **R-G2 — Scheduler in host (settled).** D-G3.1 is implemented in host code (kit gap: no scheduler) as a separate module with its own timestamp → tick-count fixture. It is the host's declared responsibility, not game logic.
- **R-G3 — Independent oracle (settled).** G03/G05 traces are checked against a Python oracle written from the Phase A text, **before** looking at the DNode implementation's outputs. Run it with `python3 -I`.
- **R-G4 — Reviewers and devices (U-G1).** Human sessions are pending. Instructions go in HUMAN-TESTING. Device inventory is recorded at test time.

## BP-BATCH

- **R-B1 — Run ID over raw bytes (resolves U-2, settled).** D-B6 is accepted. *Reason:* unparseable inputs still need an identity, and the snapshot digest is a separate field.
- **R-B2 — Absent-SKU meaning (U-1).** Settled for the shop by R-S2 (set mismatch refuses). Batch only states, in the meaning panel, that "an accepted file replaces the whole supplier snapshot". EP-B1 stays a proposal and is **not built**.
- **R-B3 — Browser publication (resolves O4, settled).** A browser cannot atomically replace an existing file, so the browser host never replaces anything. Each export is a whole new file named with the run ID (`snapshot-<runId first 12 hex>.json`, `report-<…>.json`), offered through download and copy. This makes stale-vs-current confusion structurally impossible in the browser. Atomic replace-in-place (D-B7 order, temp + rename) is delivered by the **CLI host**, which is where B05 interruption is tested.
- **R-B4 — Known shared-root limits (settled as limits).** These stay as they are because the root is pinned; record them, don't work around them in the verdict:
  - quadratic rejection time (G-3)
  - MalformedCSV has no location (G-1)
  - wrong-shape rows are not counted in duplicate involvement (U-4)

  The batch UI must stay responsive: run the DNode call in a Web Worker or otherwise off the main thread, and show progress for long runs.
- **R-B5 — Shop usability rule (O5).** Superseded by R-S1: the shop reads the CSV, not the batch JSON.
