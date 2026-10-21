# Submission — BP-BATCH — Claude Opus 5.5 (claude-opus-5-5) / Phase B successor subagent / 2026-10-21

**Phase:** B (implementation). I built a working application. Human acceptance was **not** observed: B06's human part is pending.

**Provenance and prior exposure**
- I am a successor session with no access to the Phase A conversation. I read only:
  - the Phase A handoff `handoff/PHASE_A_BP-BATCH.md` (sha256 `84b637b3…b49569`);
  - `handoff/OWNER_RULINGS.md` (`8f7f49bc…50e5f7`);
  - the E2 package;
  - the frozen kit.
- I did not read `P/shop` or `P/game`.
- The model family wrote earlier DNode builds, but I saw none of them in this session.
- Order: the coordinating session ran batch Phase B. I have no record of the other apps' Phase B order.

## Identities (full SHA-256, observed)

| Artifact | Identity |
|---|---|
| `dnode-e1-kit.zip` (package) | 141331a5c76807da3b99ffb19cb1507d3a9acad6b00d4f8cee13b91a199a5633 |
| Kit spec / runtimeIdentity | 201020261730 / fd854bcb708f3031824b14819fe126b0be96b241ced19416035b6f49d4d7c55e |
| Runtime files | engine.js 730191eae563678061a787b6c21104bb21ce795bb7b544e1adf445af52febfb7 · values.js bb5f18d9144d92e527fee4e4c97da8bb202d753f88c99327394fc1418ee17625 · parser.js 4af28852cadd131229f5e27353f9768e06ad1a922ee6c36d8ef16d12c9a234ed · admission.js 1573605a4458ac69cd234425c282e125e90b667869a34167a6721e868439a8b6 · host.js 4ef32562035a64afc22c0882ccd54c5b8b210338f2b8f687bd91fb69980825cc |
| Root `supplier` / `prelude` | 0c35544ed5e56d00479656114dd226712a416054bf23b4140c30466d27011bff / 8e199f2776bb9c4ec44b3a435b4c70744748c42b784c646f77d2847c41e99dde. File hashes: supplier.node 9e2d768197ea6459438d913f136b0dd1dc8715214b21ffad1f9995057d52784f, prelude.node bf2a6cec6fb9d5ac3fca94ae35685e2d57e729d9bc95da607ea6db2c4c7eeb97 |
| Node `supplier.from_csv` (the only verdict source) | bf894486d3bd45c018e74cd9e1ec415d008b41444ffa5c89f8c8647f0cbbcbae |
| `profiles/batch.json` | edfedf5bcf1bc7cfe8c6b4d33ad4d78c647bb0d9bbf50dd743e3815078062a96 |
| Trust-key fingerprint | 4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244. It is in-kit and self-referential (R0.2). The hosts also pin it in `lib/core.mjs`. |
| Natives used by `batch.node` directly | csv 4d629da6851fce5a0f98f6e4e5d0ad755b0fbd6f90f12bc86a948c47b92e9997 · encode 81c75acc05816fb959d704671b1dc228fe6bc6e0b24c1addc61e9e576ac42da8 · nat_fits aace9a6aac5869d4448ea85474869a6d835c10f80c1c30ba74189e2f58cdedd7 · decimal be685e1bc5d1d27dbe73fa1cf5783aced4d1c46c46a2f3eed91e787650fbc537 · matches 5d14e6d9db296f44535370b9291bffcb620d898002584e2aa035a0de98d82c1e · unique ba6fdf3f22efaccdc4bc0a509b949583f931ed7811a858099262a707543cf7cc · contains 8805b76fddb2c1ea8ff2c969102acd71743a6a3d4711707fbecce0c3ccd1ac0b · len 99c79a339457e9d2ccbf19fb181dd3d6bc4e9d328e5334292213c8d6d66da492 · at e2277fca867bcb85f54fac2a77817bee49e1ee01532e65c840c67fe9058d5a81 · cat 747033a5fe776cd5f6380f88ec75e880fd6fba68c6ab32ad27658b79dd50cb52 · str e3a7cc7a3d97d0d27ec0b288ddb20b68b2f11fda548cb4430398df1bbfff184a · == 6b6f1367baee4740b43f322dfa3464f179e82cc1cad62895f2492d51627ddc7a · not d1f027736302c8f7b8a61b18007aa7d6f87d867918ba8e6c4bb615c15840dc7a · and e2c40f79e39d0f4f91e7c0cda77b759574c9a5506eb361ef8211363fcc7828be · or e858053899371665574fe54148cfa43b823908e2f63934a17b16f8e58afcf375 · > 3250826820650ada53f9a95c93fd8510598b0e4a087229b6a6cf59098107053f · >= eec559e2b31cdb091b73b8ce6d3ab677782c30d375a92d5bcd12627a8fcd42f5 · < 79c584ab6874b8bab0f4bd088b8dbf17a0ad621d61090dfd9fe7ac933c8ee2af · - 5c70f4042d1b1a67a2fd39b5891e799a5d87c15d8ac6cbc8b7cd238319bc7b6c. `supplier` additionally uses duplicates, concat, sort_by, slice, range, !=, <= (full pins in kit `generated/lock.json`). |
| **`batch.node` (app root, part of every runId)** | **6f29074338f27a37c5ba1a48c007bdd07f7bfa8a661e41af30e60adb17793471** |
| Host and test sources | See the "Source identities" section at the end. It is computed after the last edit. |

## Purpose in my own words

An operator receives a legacy supplier CSV. They get one of two unmistakable outcomes:
- a complete, deterministic, normalized stock snapshot that the shop can treat as the new physical-unsold quantities; or
- a precise list of which record, field and value to fix, with certainty that nothing changed and that any older file is not this run's result.

The tool never guesses meaning: no currency, units, deltas, case folding or de-duplication (P-B, D-B1–D-B4).

## What is fixed, chosen, assumed and unresolved (as built)

| ID | Class | Authority | Status in this build |
|---|---|---|---|
| D-B1–D-B4 | chosen/fixed | E1 / blueprint | Delegated entirely to pinned `supplier.from_csv`; not reimplemented. |
| D-B5a rev 2 | chosen (delegated) | Phase A, R0.3 | Built. Small presentation revisions are recorded as REV-3 below. |
| D-B5b | chosen | Phase A | Built in DNode (`batch.hint` …). Wording extended in REV-2; the invariant is unchanged and checked on 75 cases. |
| D-B6 | chosen, accepted by R-B1 | Phase A + owner | Built. REV-1 adds a `fault` field for fault reports. |
| D-B7 | chosen/fixed | Phase A | Built in the CLI. Adds `--verify`. The browser follows R-B3: it never replaces files. |
| D-B8 | chosen/fixed | Phase A | Built (`batch.file_error`). No host re-lexing. |
| D-B9 | chosen/fixed | Phase A | Built (`batch.counts`). REV-4 clamps the empty-text case. |
| A-B1 | assumed/verify | blueprint | CLI: verified for process kill (B05). There is no fsync, so I make no power-loss claim. |
| R-B2 / EP-B1 | ruling | owner | The meaning panel states "An accepted file replaces the whole supplier snapshot." EP-B1 is **not built**. |
| R-B4 | ruling | owner | Quadratic time (G-3), unlocated MalformedCSV (G-1) and U-4 are kept as limits. The DNode call runs in a Web Worker with progress and Stop. |
| O7 (independent trust anchor) | unresolved | — | The trust anchor remains self-referential. |

## Decisions as built

### Responsibility split

**DNode, app root `batch` (`batch.node`, 17 nodes):**
- `batch.run`: verdict, issues and rows copied from `supplier.from_csv`; adds hints, counts, and snapshot bytes via the pinned `encode`. Post-conditions: `len issues = counts.issues`; `ok ⇒ no issues ∧ rows>0`; `¬ok ⇒ issues>0 ∧ rows=0`.
- `batch.hint`: one entry per shared issue. Post-condition: record, field and message are verbatim.
- `batch.numeric_hint`, `batch.sku_hint`, `batch.duplicate_hint`, `batch.name_hint`, `batch.row_hint`, `batch.header_hint`, `batch.hint_text`, `batch.issue_value`: the raw cell is returned for display.
- `batch.joined`, `batch.join_cell`, `batch.first_cell`, `batch.counts`, `batch.is_record_issue`, `batch.issue_record`.
- `batch.file_error`: precondition `UnknownFileError` for any other code.

**Host, `lib/core.mjs`, shared by the CLI, the browser worker and the tests:**
- admission;
- byte limit taken from `profile.host.maxBytes`;
- SHA-256;
- `TextDecoder('utf-8',{fatal:true,ignoreBOM:true})`;
- one `batch.run` call; refusals MalformedCSV, TooManyRows and FileTooLarge become `fileError`, everything else becomes `fault`;
- report assembly with the kit `json`;
- banner text (presentation, derived from the report only);
- duplicate grouping over already-flagged issues.

**CLI host `batch-host.mjs`:** D-B7 publication order, exit codes, run log, `--verify`, and the fault hook.

**Browser host:**
- `index.html`, `app.js` (main thread): rendering and exports only;
- `worker.js`: kit admission and the DNode call;
- `serve.mjs`: static server.

### Revision records (deviations from the Phase A handoff)

- **REV-1 — D-B6 rev 2 (report field set, additive).**
  - *Change:* when `status:"fault"`, the report carries `fault:{code, detail}`. For example: `{"code":"ResourceLimit","detail":"batch.run: ResourceLimit: list length"}`.
  - *Reason:* the D-B5a fault banner names `<code>`. Without this field a fault report would not say what failed.
  - *Unchanged:* every other field and its presence rules. Issue entries in the report remain exactly `{record, field, message, hint}`. Raw values and SKUs go only to the UI and CLI text.
  - *Determinism:* `detail` contains no volatile data.
  - *Evidence rerun:* the fixture with a fault (`row-60000-fields`) and B04.
- **REV-2 — D-B5b hint wording, within the hint-wording freedom.** The invariant "never alter verdict or issue set" is unchanged.
  - *Additions:*
    - SKU: `SKU is missing…` when empty; `SKU has L characters; the maximum is 32.` when longer than 32.
    - Duplicate hint names the SKU.
    - NAME empty: `Name is empty. Enter the product name.`
    - Row with fewer than 4 fields: `…Check for a missing comma or a missing value.`, with the singular "1 field".
    - Header with an extra BOM (first cell `﻿SKU`): a BOM-specific hint.
    - Empty file (`Missing CSV header`): its own hint.
  - *Reason:* B06. Each case gives the operator the fix, not just the rule.
  - *Constraint:* only the shared message is displayed as the "Rule". The duplicate hint is selected by exact match on the pinned duplicate message text. A new supplier identity would rerun the fixtures.
- **REV-3 — D-B5a presentation (constrained freedom).** The first words "Accepted", "Rejected" and "Tool fault" are fixed, and all four facts remain shown.
  - *File-level banner:* adds `Nothing in the shop or in any earlier export was changed.`
  - *Empty snapshot:* has its own banner, `Rejected — the file contains no product records (empty snapshot)…`. The "could not be read as the declared CSV" wording would be false for it.
  - *Header mismatch:* uses `(header)` as the code.
  - *Accepted runs in the browser:* show `Snapshot file for this run: snapshot-<id12>.json`. The browser old-vs-current line is shown for every non-accepted run.
  - *Duplicate group with one flagged record* (U-4): `SKU X in record r is also used by a record listed with a wrong number of fields.` This replaces the misleading "appears in records r".
  - *Phone layout:* stacked rows for both the issue tables and the preview.
- **REV-4 — D-B9 empty text.**
  - *Change:* `dataRecords = max(len(parsed)−1, 0)`.
  - *Reason:* the Phase A formula gives −1 for a 0-byte file.
- **Additions not in Phase A (host, within responsibility):**
  - CLI `--verify` implements the D-B7 usability rule as a command.
  - The CLI reports leftover `*.tmp` files from interrupted runs.
  - Oversize files are hashed by streaming and never loaded or decoded.
  - The browser explains `NotReadableError` when a chosen file was edited on disk ("choose it again").
  - Browser progress comes from the runtime `observe` hook (display only).
  - The trust fingerprint is pinned in the host.

### D-B5a and D-B7 exact texts as built

- **Accepted:** `Accepted — N records ready. This snapshot (run R12) can replace the supplier stock in the shop.`
- **Rejected, record level:** `Rejected — no snapshot was produced. K of N records need correction (M problems). Nothing in the shop or in any earlier export was changed. Partial acceptance is not available: correct the listed records and validate the whole file again.`
- **Rejected, file level:** `Rejected — the file could not be read as the declared CSV (<code>). No records were checked and no snapshot was produced. Nothing in the shop or in any earlier export was changed.`
- **Tool fault:** `Tool fault (<code>) — this is a defect in the tool or distribution, not a judgement about your file. No snapshot was produced.`
- **CLI old-vs-current:** `<path> was not changed and still holds sha256 <64hex> from an earlier run; it is NOT the result of this run.`
- **Browser old-vs-current:** `Any snapshot you downloaded earlier came from a different run; compare its run ID with the report.`
- **Meaning panel:** the Phase A text verbatim, shown before Validate.
- **Exit codes:** 0, 2 and 1 as in Phase A. `--verify` exits 0 when verified and 2 when unverified.

## Four-field transition (as built): `publish(bytes) → (report, snapshot?)`

- **Domain:**
  - any bytes;
  - the pinned kit, admitted by signature and digests;
  - `profiles/batch.json`;
  - the destination state (CLI).
- **Relationship:**
  - `status = accepted ⇔ supplier.from_csv(decode(bytes)).ok` within the byte limit;
  - the snapshot bytes are `encode(rows)`;
  - the report is the D-B6 rev 2 record, encoded by the kit's `json`;
  - `runId = SHA-256(encode({input: SHA-256(bytes), transformer:{app, profile, runtime, supplier}}))`.
- **Failures, in precedence order:**
  1. FileTooLarge, before any decode.
  2. InvalidUTF8.
  3. MalformedCSV or TooManyRows, whichever the single scan meets first.
  4. Header.
  5. Empty snapshot.
  6. Record issues.
  7. Any other runtime failure is `fault`. This includes the observed ResourceLimit for records with more than 50000 fields (G-7).
- **Execution:**
  1. Admit the kit.
  2. Check the size.
  3. Hash.
  4. Decode.
  5. Make one pure `batch.run` call.
  6. CLI publication:
     - accepted: snapshot temp file, then rename; then report temp file, then rename;
     - otherwise: report only.
  7. Append to the run log.
- **Browser:** no file is ever replaced. Each export is a new run-ID-named Blob download, or a copy to the clipboard.

## Obligation mapping (actual results)

| ID | Responsibility / artifact | Evidence method | Actual result | Limitations |
|---|---|---|---|---|
| B01 | `supplier.from_csv` via `batch.run`, `batch.counts`; kit `encode` | Python oracle (`fixtures/oracle.py`) vs built pipeline: exact report bytes, snapshot bytes, counts, runId | **Passed (observed).** 22 accepted fixtures agree byte for byte, including both kit fixtures, the 9000-record 1 MiB file and the 10000-record file. | The oracle shares the shared root's message strings and my hint text, taken as data. |
| B02 | Pinned `csv` native (host-implemented, 4d629da6…) | Lexical fixtures: quoted comma, newline, `""`, CR inside quotes, CRLF, mixed endings, no final newline, BOM, double BOM, all-quoted header, 4 malformed classes | **Passed (observed).** All agree with an independently written lexer. | No location for malformed input (G-1). |
| B03 | Shared issues + `batch.hint`, `batch.file_error`; host report | One fixture per failure class (63 rejection fixtures). Every report has `snapshot.published:false`. The CLI writes no snapshot (B-T5 test). | **Passed for all classes except one, which failed (observed):** a record with more than 50000 fields gives a **tool fault (ResourceLimit)** instead of a located row rejection (G-7). No snapshot is published in that case either. | G-1, G-7, U-4. |
| B04 | Kit `encode` + D-B6 host digests | `tests/cli-b04-b05.mjs`: repeat runs, LF vs CRLF, rejected repeat | **Passed (observed).** Snapshot 05d9b149… identical across runs and line endings. Report bytes identical on repeat (df2eb4a4…). LF and CRLF reports differ only in `runId`/`input`. There are no timestamps in reports; time appears only in `batch-runs.log`. | — |
| B05 | CLI temp+rename (A-B1), byte limit | SIGKILL fault hook (a) after temp write, (b) between renames; size and row limits; in-process spy | **Passed (observed, CLI).** See the B05 details below. | No fsync, so no power-loss claim. The browser never replaces files (R-B3). |
| B06 | D-B5a/b UI and texts | Human operator task (`HUMAN-TESTING.md`); Playwright for observable facts | **Automated observable checks passed:** 88/88 at 390×844 and 1280×800. **Human acceptance: pending, not observed.** | Long rejections are slow (G-3). Broken quotes cannot be located (G-1). |

B05 details:
- **(a) Killed after the temp write:** the destination still holds the old snapshot and report. A `snapshot.json.<pid>.tmp` file remains. `--verify` reports the old pair as verified current.
- **(b) Killed between the renames:** the destination holds the complete new snapshot (05d9…) beside the old report. `--verify` reports **UNVERIFIED** and exits 2. A re-run repairs it.
- **Size limit:** 1048576 bytes is accepted. 1048577 bytes gives FileTooLarge, and the spy saw 0 decodes and only a `batch.file_error` call. A 64 MiB sparse file is rejected in 493 ms by stream hashing.
- **Row limit:** 10000 records are accepted. 10001 records, and 10000 records plus a trailing blank line, both give TooManyRows.

## Challenge answers, re-checked against the build

- **B-T1.** **Observed, matches the Phase A prediction.**
  - Snapshot `[{"name":"Blue, fine","price":20000,"sku":"PEN","stock":3}]`, 59 bytes, sha256 05d9b1490221a3625fa3100d8f56a8c138b80565df0506744a9a56083607bd31.
  - Counts 1/1/0/0 (the Phase A counts were predicted; they are now observed).
  - runId ca0e16bf6a90e37a19b5a7cb7787456c336f60a7f61521781409e5306eace45c.
  - CRLF variant: same snapshot bytes; runId f3e4583f…bb56.
- **B-T2.** **Observed, matches the Phase A prediction.** Both are rejected with `{record 1, PRICE_VND, "Expected a positive bounded decimal integer"}`, and neither is a fault.
  - `" 20000"` gets the hint `Use digits 0–9 only: no spaces, signs, decimal points, exponents or thousands separators.`
  - `9007199254740992` gets the hint `Number is larger than 9007199254740991, the largest supported value.`
  - The UI shows the value as `·20000`.
  - `9007199254740991` is accepted for both price and quantity (fixture `bt2-max-ok`).
- **B-T3.** **Observed.**
  - There is no de-duplication.
  - Records 1 and 2 each carry the duplicate issue, and the group line reads `SKU PEN appears in records 1, 2. Keep one record per SKU.`
  - Only a rejected report is published.
  - The previous snapshot stays byte-unchanged (CLI B-T5 test).
- **B-T4.** **Observed.**
  - A quoted LF or CRLF stays inside NAME; the CRLF is preserved as `\r\n`.
  - Duplicates are reported at records **2 and 4** (physical lines 4 and 7), in both the CLI and the browser.
  - The UI shows "spreadsheet row r+1".
- **B-T5.** **Observed (CLI)** after a valid export and then a file with one invalid record:
  - exit 2;
  - snapshot byte-unchanged;
  - the report is replaced atomically with `status:"rejected"`, `snapshot.published:false` and a new runId;
  - stdout prints the "was not changed … NOT the result of this run" line;
  - `--verify` reports UNVERIFIED because the latest report is rejected.

  In the browser, files are never replaced, so stale-vs-current confusion cannot arise there. Residual risk (predicted, not tested with people): someone imports a `snapshot-*.json` without reading its report. R-S1 removes the shop's dependency on this file: the shop reads the CSV itself.
- **B-C1.** Unchanged from Phase A. Partial acceptance is not available within the blueprint. EP-B1 stays a proposal and is not built (R-B2). The rev 2 banner sentence is built and observed in the drive.

## Fixture agreement

- **Totals:** 89 cases, of which 87 come from `fixtures/cases.json` and 2 are kit fixtures read in place.
  - **87 agree, 1 disagrees, 1 skipped in the default run (slow).** The slow case (`big-invalid-10000`: 10000 invalid duplicate records, 30000 issues) ran once in the background and **agrees**. `batch.run` took 374.6 s at 4,060,110 operations, under the 10M limit. The invariant holds. **Overall: 88 of 89 agree, 1 disagrees.**
- **D-B5b invariant:** batch.run's `ok`, issue set and rows equal a direct `supplier.from_csv` call. It **holds on 75 of 75** cases where `batch.run` returned.
- **Kept disagreement:** `row-60000-fields`.
  - Oracle (blueprint): rejected, with `{1, row, Expected exactly four fields}` and the hint "This record has 60001 fields…".
  - Observed: `status:"fault"`, `ResourceLimit: list length`.
  - *Resolution:* this is not a model error. It is distribution gap G-7: the runtime `value()` rejects any list longer than 50000 elements, including the `csv` native's own result row. The oracle expectation is **kept**, not weakened. The host cannot repair it without re-lexing (D-B8 forbids that) or moving meaning into host code (R0.1 forbids that). The app reports it honestly as a tool fault, exit 1, and publishes no snapshot.
- **Oracle independence:**
  - The oracle was written from the blueprint and the handoff text and does not call DNode.
  - It does take three things as data: the shared root's message strings, my own hint and file-error wording, and the transformer identities.
  - U-4 behaviour was modelled from Phase A's observed description, which R-B4 settled as a limit.
  - Hint agreement therefore shows only that the DNode nodes implement the written hint spec. It is not an independent design check.

## Distribution gaps (minimal reproducers; `node tests/gaps.mjs` → `evidence/gaps.json`)

- **G-1 MalformedCSV has no location.**
  - Reproducer: `supplier.from_csv("SKU,NAME,PRICE_VND,QTY_ON_HAND\nPEN,\"Pen,1,1\n")` gives `refused MalformedCSV origin csv`, with no offset.
- **G-2 The kit CLI accepts a double BOM.**
  - `tools/run.mjs batch` on `EF BB BF EF BB BF`+valid CSV prints `Published 1 records` and exits 0.
  - This host rejects it with a header issue and a BOM hint.
- **G-3 Rejection time is quadratic in the number of issues.**
  - Measured: 250, 500 and 1000 invalid rows took 301, 1033 and 3888 ms, at 26k–105k operations.
  - Browser, 1500 invalid rows: 8.1 s wall time; the main thread stayed responsive, with a largest 50 ms-timer gap of 198 ms.
  - 10000 invalid rows (30000 issues): `batch.run` took 374.6 s (Node, this container). The fixture run took 12 m 46 s in total, including the direct invariant call.
- **G-4 The kit CLI writes no report on file-level failures.**
  - Malformed input: `MalformedCSV MalformedCSV`, exit 1, no report. Oversize input: `Error FileTooLarge`, exit 1, no report.
  - The kit report also lacks run, input and output identity. This host fixes all of that in its own host code.
- **G-6 The kit's `check` and `run-file` compile apps under the browser profile.**
  - Source: `new Runtime(g,JSON.parse(texts['profiles/browser.json']))`.
  - `tests/check-node.mjs` runs `batch.node` under `profiles/batch.json` instead.
- **G-7 (new) A record with more than 50000 fields faults.**
  - Reproducer: `node tools/run.mjs call supplier.from_csv "[\"SKU,NAME,PRICE_VND,QTY_ON_HAND\n<50000 commas>\n\"]"` gives `ResourceLimit ResourceLimit: list length` and exits 1.
  - With 49999 commas (50000 fields) the result is a located `{1,row}` issue.
  - Effect: B03 cannot give an actionable diagnostic for this input class.
- **U-4 Wrong-shape rows count toward duplicate detection but are not flagged.**
  - Reproducer: `PEN,Pen,1` plus `PEN,Pen,1,1` gives `[{1,row},{2,SKU,Duplicate…}]`.
  - The UI wording was adjusted (REV-3).
- **P-1 `text.parse_decimal_nat("9007199254740992")` faults with ArithmeticOverflow.**
  - It is not used as a validator here; `nat_fits` is checked before `decimal`.

## Repair log (first failures preserved)

| # | First failure (observed) | Classification | Repair |
|---|---|---|---|
| R1 | `node tests/check-node.mjs` → `Error: Parse: mismatched delimiter` at batch.node line 96 (`batch.hint_text`). | My error: 8 closing parentheses for 7 nested `if`s. | Removed one `)`. Then all 27 inline examples passed. |
| R2 | First fixture run (`evidence/fixtures-first-run.json`): 87 agree / 1 disagree (`row-60000-fields`). | Distribution gap G-7. | **Not repaired.** The disagreement is preserved (above). |
| R3 | `tests/cli-b04-b05.mjs` first run: `FAIL B04 no timestamp in semantic report` (31/32). | Test defect: `/time/i` matched `"runtime"` in the transformer identity. | The check now looks for an ISO timestamp or a `"time"`/`"timestamp"`/`"date"` key. 32/32 on rerun. Product unchanged. |
| R4 | Browser drive first run (`evidence/browser-first-run.log`): 82/84. Both failures were `leading space shown as ·` observing `"PEN"`. | Test defect: the selector `article.rec .val` first matched the SKU in the card heading. | Selector changed to `article.rec tbody .val`. |
| R5 | Screenshot review after R4 (not caught by any check): preview PRICE/QTY cells rendered as green circles, and the progress row ("Reading CSV… Stop") stayed visible after the result. | My CSS errors: the `.num` class collided with the step badge, and `.progress{display:grid}` overrode `[hidden]`. | Renamed the class and added `[hidden]{display:none!important}`. Two regression checks were added to the drive. 88/88 after the fix. |
| R6 | 390×844 screenshot review: the preview table broke SKUs and prices mid-token ("NOT EBO OK", "50 50 0"). | Layout defect (no check had failed). | Preview rows now stack on narrow screens. Re-inspected the screenshot. |
| R7 | CLI text review: for U-4, the group line read "SKU PEN appears in records 2". | Misleading presentation. | REV-3 wording. |

## Commands actually run, with outputs (Node v22.22.0, Python 3.13.16, Chromium 141.0.7390.37 via Playwright 1.56.1, headless)

Kit public checks, run from `kit/dnode-e1-kit` (`evidence/kit-public-checks.txt`):

```
$ node tools/run.mjs verify
VERIFIED DNode-E1-author-kit trust fingerprint 4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244   (exit 0)
$ node tools/selftest.mjs
Verified pinned package and 1280 independently expected public generated cases. This does not certify your application.   (exit 0)
$ node tools/run.mjs check ../../batch/batch.node        # browser profile (G-6)
STRUCTURAL PASS. Not a certificate; provide examples and independent evidence.   (exit 0)
```

App checks, run from `batch/`:

```
$ node tests/check-node.mjs
{"profile":"batch-e1",…,"nodes":17,"nodesWithExamples":10,"examples":27,"passed":27,"failed":0,"scope":"structural compile under batch profile + inline examples; not certification"}
$ python3 -I fixtures/make_fixtures.py   → wrote 87 cases
$ python3 -I fixtures/oracle.py          → expected for 89 cases; 22 accepted
$ node fixtures/run-fixtures.mjs         → {"total":89,"agree":87,"disagree":1,"skipped":1,"invariantHolds":75,…}   (exit 1 because of the kept disagreement)
$ node fixtures/run-fixtures.mjs --only big-invalid-10000 --out evidence/fixtures-slow.json   → agree big-invalid-10000 rejected 374638ms; real 12m46s
$ node tests/cli-b04-b05.mjs             → {"checks":32,"passed":32,"failed":0}
$ NODE_PATH=/usr/local/lib/node_modules_global node tests/browser-drive.cjs → {"checks":88,"passed":88,"failed":0,"env":{"browser":"chromium (Playwright 1.56.1)","version":"141.0.7390.37","headless":true}}
$ node tests/gaps.mjs                    → evidence/gaps.json (quoted in "Distribution gaps")
```

Evidence files:
- `evidence/node-check.json`
- `evidence/fixtures.json`, plus the first run in `evidence/fixtures-first-run.json`
- `evidence/fixtures-slow.json` and `.log`
- `evidence/b04.json`, `evidence/b05.json`
- `evidence/browser.json`, plus the first run in `evidence/browser-first-run.log`
- `evidence/gaps.json`
- `evidence/kit-public-checks.txt`
- `evidence/shots/{390x844,1280x800}-{01-start,02-rejected,03-accepted,04-file-malformed,05-fault}.png`

Browser observation, recorded rather than asserted: after the chosen file was edited on disk, pressing Validate in Chromium gave a read error. The app showed "The file could not be read. If you edited and saved it after choosing it, choose it again…".

## Known limits

- **R-B4 (settled as limits):**
  - Quadratic rejection time (G-3). Progress, a responsive UI and Stop mitigate it, but the 10000-invalid case still takes minutes.
  - MalformedCSV has no location (G-1).
  - Wrong-shape rows are not counted in duplicate involvement (U-4).
- G-7: inputs with more than 50000 fields in one record become tool faults.
- No fsync, so no power-loss durability. Two renames are not a transaction: the mismatch window between them is detected by `--verify`, not prevented.
- Browser publication is a download of new files only (R-B3). There is no atomic replacement. Oversize files are read into memory to hash them, because WebCrypto has no streaming digest.
- Kit runtime modules are imported before `verifyBundle` checks the same files' digests. This is a time-of-check/time-of-use window, the same as in kit tools. The compiled roots and profile come from the verified texts.
- The trust anchor is self-referential (O7).
- The run ID covers app, profile, runtime and supplier, but not the prelude identity (the Phase A field set). `verifyBundle` pins the whole kit anyway.
- Hints are English only.
- Display shortens values longer than 160 characters; the data itself is not altered.
- Fixture CSVs total about 11 MB. They can be regenerated with `make_fixtures.py`.

## Handoff to the next model

**Preserve:**
- D-B1–D-B4, delegated to `supplier.from_csv`.
- The D-B5b invariant, and its check in `run-fixtures.mjs`.
- D-B6 rev 2 field set.
- D-B7 order and exit codes.
- D-B8: no host re-lexing.
- D-B9 with REV-4.
- R-B3: the browser never replaces files.
- The first words of the banners.

**Free to change:**
- Hint and banner wording, within the four-fact constraint, rerunning B06.
- Visual style and layout.
- Node decomposition inside `batch.node`. Any change gives a new app identity, so every runId changes; rerun all evidence.

**Rerun after any change:**
- `check-node`
- `make_fixtures` + `oracle` + `run-fixtures`
- `cli-b04-b05`
- `browser-drive`
- B06 human task, if text or layout changed

A kit change invalidates everything.

**Open items:**
- B06 human sessions (`HUMAN-TESTING.md`).
- G-7 needs a kit-level fix: a located refusal for oversize rows, or a higher list limit.
- X-1: a located MalformedCSV.
- O7: an independent trust anchor.
- G-3 needs a root fix, which would give a new supplier identity.

**Next action:** run the B06 operator task on a real phone and a desktop, and record the results under `evidence/human/`.

## Source identities (SHA-256 of the submitted files)

```
    6f29074338f27a37c5ba1a48c007bdd07f7bfa8a661e41af30e60adb17793471  batch.node
    c61d3ad59c70d96ff5ea48100ec9aed35a839d72385459b0edeba3d56bcfe545  batch-host.mjs
    25f9c5fd38f7c5c71fd2d97118741e0ca6c4653bf6b6184120af781561e2f6df  serve.mjs
    b4799868c25de3994c0f66265f6f78d7c29079ba3ec0f27c36104d12c7142341  index.html
    b1c3ad4da09f4b313d6c8f725ac08cd41d4ff9a4820df0a15bc693824038cc58  app.js
    4e864aeeda50a09dfd6cd83a8dd7384b548c5e7fd7d5ea9b4cc82f20514e47a5  worker.js
    9b125af6543e434f717145ff71355d7deedf37f28a5745d5e13a496d998cc103  styles.css
    d08ef80d2bd7df635f8f4e0aff82b310598e890d51c9837228d276383037e61d  lib/core.mjs
    803b53d71ee95356d102ac11366db21d8e7d5756e56f49b69d20a306825df77e  lib/node-kit.mjs
    52b15489097d3abd5abc1a26740540c3504780edb778772fe6b66616dacceedc  fixtures/make_fixtures.py
    2bfadc9aba80d33059bd82f2cfc920b66d19ea8629f1dd1b784f0b04e1409770  fixtures/oracle.py
    54f903b6f450b3ce13fddcf504faffa96265ef0cf14b73e9d05391cff1b15da7  fixtures/run-fixtures.mjs
    7e8c38bc0c8b2a02fba4c2461031b3d1cecc492b4fb9971a43bdfd21cd9825ef  fixtures/cases.json
    13983e4708b17c98241f249739983f32df9b969f445bfcb284299501690935f6  fixtures/expected.json
    afa666708ee768cabf3a3f816709988d7bfcac8a00446dbd3e3b076fde3ce4d5  tests/check-node.mjs
    61352873d4265e3efb6ea5225aef05231089841384c5a8ac8d380e6ffb96fecc  tests/cli-b04-b05.mjs
    c53d0efea61fba777789857c578b081d3e90673233170542ab370c40d0cab905  tests/browser-drive.cjs
    0cdd94a56a9c5a196682201e06ed2a5406fef771a1c7bb66ff5dee1b54256f7c  tests/gaps.mjs
    9064daef75242eab7b1bcc48d2ef45d71c987382728997b35d0eb0fa48b055f6  README.md
    9f0771651ec55c3d86450f758e42b1fd638ef6490a17653b93462aa471811e27  HUMAN-TESTING.md
```
This file (PHASE_B_BP-BATCH.md) is not self-listed. `fixtures/cases/*.csv` can be regenerated byte for byte by `make_fixtures.py`; the sha256 of each one's bytes appears as `input.sha256` in its expected report.
