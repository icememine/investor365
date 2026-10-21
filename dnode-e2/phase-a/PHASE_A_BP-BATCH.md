# Submission — BP-BATCH — Claude Opus 5.5 (claude-opus-5-5) / fresh subagent session / 2026-10-21

**Phase:** A (interpretation and continuation). No application was built. Probe scripts were run against the frozen kit only. The kit stayed read-only.

**Provenance and prior exposure.** This is a fresh subagent session with no earlier conversation about this experiment. The owner launched one session per application in the order shop, game, batch, and they ran in parallel. I read only files inside `blind-batch/`. Earlier DNode builds, including an E1 shop/game/batch package, were written by Claude sessions, so this model family may have had prior exposure. I did not see those builds in this session. STRUCTURE §14.3 summarises them (Astra/Fable batch: whole-file acceptance, atomic single-file replacement). I treat that summary as inherited context, not as my own evidence.

**Identities (full SHA-256, as observed with `sha256sum` / kit `release.json`):**

| Artifact | Identity |
|---|---|
| candidate.zip | 3e1868a12bd35bcf94f279fbd51f1d4555bf02b4f5f27a08541326a0d3db39d8 |
| MANIFEST.json (not self-listed) | f1495f9c1d6e6404fd3cc45f06e813b2be4cd9b892b15b4a5cceeb7eba9b983f |
| BP-BATCH.md / STRUCTURE.md (211020261208) | 95b24fed…6ed8 / e7ec29d0…0b951. Every package file matched MANIFEST. |
| dnode-e1-kit.zip | 141331a5c76807da3b99ffb19cb1507d3a9acad6b00d4f8cee13b91a199a5633 |
| Kit spec / runtimeIdentity | 201020261730 / fd854bcb708f3031824b14819fe126b0be96b241ced19416035b6f49d4d7c55e |
| Root `supplier` / `prelude` | 0c35544ed5e56d00479656114dd226712a416054bf23b4140c30466d27011bff / 8e199f2776bb9c4ec44b3a435b4c70744748c42b784c646f77d2847c41e99dde |
| Node `supplier.from_csv` | bf894486d3bd45c018e74cd9e1ec415d008b41444ffa5c89f8c8647f0cbbcbae |
| Natives `csv` / `nat_fits` / `encode` | 4d629da6…9997 / aace9a6a…edd7 / 81c75acc…2da8 (full values are in kit `lock.json`) |
| `profiles/batch.json` | edfedf5bcf1bc7cfe8c6b4d33ad4d78c647bb0d9bbf50dd743e3815078062a96 |
| Trust key fingerprint | 4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244. Compared only with the README shipped in the same kit. No separately supplied fingerprint was available, so trust is self-referential (open item O7). |

## Purpose in my own words

A shop operator receives a legacy supplier CSV and needs one of two clear outcomes:

- **Accepted:** a complete, deterministic, normalized stock snapshot that the shop can import as the new physical-unsold quantities.
- **Rejected:** an exact list of what is wrong and where to fix it, with certainty that no stock meaning changed and that any file on disk is not the result of this run.

The tool converts and explains. It never mutates stock and never guesses meaning, such as currency, units, deltas, case or duplicates (P-B, D-B1–D-B4).

## What is fixed, chosen, assumed and unresolved

| ID | Class | Authority | Content / implication |
|---|---|---|---|
| P-B | required (purpose) | inherited E1 purpose (experiment owner) | Operator knows what is usable and how to fix rejections. Every design choice below is judged against it. |
| BP-BATCH "Domain and behavior" bullets | required | blueprint (experiment owner) | Dialect, 1 MiB / 10000-record limits, SKU/NAME/number grammar, range check before conversion, empty-snapshot refusal, sorted output, run ID, staged atomic publication, ownership boundaries. |
| D-B1 whole-file acceptance | chosen/fixed | E1 designers. A design choice, not a human requirement (COMMON). | Any invalid record means no snapshot. It may change only through an extension proposal (see B-C1). |
| D-B2 QTY = physical unsold incl. reserved | chosen/fixed | E1. Shared with shop D-S2. | Shown to the operator. Never converted. |
| D-B3 duplicates reject, even identical | chosen/fixed | E1 | No deduplication. |
| D-B4 sort by SKU; exact numbers; preserved names; deterministic bytes | chosen/fixed | E1 + kit `encode`/`json` | Bytes are pinned by kit `values.js` `json()`: sorted keys, no whitespace, raw UTF-8, no trailing newline. |
| D-B5 preview/error grouping/correction/old-vs-current | unresolved → **delegated, resolved by me** | delegated freedom | See D-B5a and D-B5b. |
| A-B1 single-file atomic replace by host | assumed/verify | blueprint | CLI only: temp file (`wx`) plus `rename` on the same filesystem, read from kit `tools/run.mjs`. No fsync, so no power-loss claim. The browser profile says "whole Blob download", which is not a replacement of an existing file. A-B1 therefore does not hold for the browser (O4). |
| Shared supplier meaning | required | COMMON | Batch imports pinned root `supplier` (0c35544e…). It is not reimplemented. My added explanation nodes never change the verdict. |
| U-1 Meaning of a SKU **absent** from an accepted snapshot when the shop imports it (delete? zero? keep?) | **unresolved** | neither BP-BATCH nor BP-SHOP states it | This blocks the full impact analysis of B-C1. Smallest missing item: one sentence added to D-B2/D-S2. |
| U-2 "Run ID binds canonical normalized input" | ambiguous → my interpretation is chosen and review-required (D-B6) | blueprint wording | A rejected or unlexable file has no normalized form, but still needs an ID. |
| U-3 Location of MalformedCSV | **distribution gap** | kit `csv` native | The refusal carries no offset, line or record (observed). B06 is weaker for this class (D-B8). |
| U-4 Whether duplicate involvement includes wrong-shape rows | ambiguity / shared-root behaviour | `supplier.fields` | A 3-field row `PEN,Pen,1` plus a valid `PEN` row: only the 4-field row gets "Duplicate SKU" (observed). The blueprint says "report every involved data-record index". I flag this. I did not patch it, because a patch would need a new supplier identity. |

## My decisions and reasons

Each record lists: status · authority · choice · refs · reason · assumptions · tradeoffs · responsibility · acceptance · variation policy · revision.

### D-B5a — Operator result screen, grouping and exact messages

- **Status:** chosen, under delegated authority (D-B5). **Refs:** P-B, B03, B06, D-B1.
- **Choice: four result banners (accepted; rejected at record level; rejected at file level; tool fault). Colour is never the only carrier of meaning.**
  - **Accepted** banner:
    > `Accepted — N records ready. This snapshot (run R12) can replace the supplier stock in the shop.`

    A preview table follows, in published order (sorted by SKU). Columns: SKU, NAME, PRICE_VND, QTY_ON_HAND (physical unsold, incl. reserved). Line breaks inside a NAME are shown as `↵`. The data is not altered.
  - **Rejected, record level** banner:
    > `Rejected — no snapshot was produced. K of N records need correction (M problems). Nothing in the shop or in any earlier export was changed.`
  - **Rejected, file level** banner:
    > `Rejected — the file could not be read as the declared CSV (<code>). No records were checked and no snapshot was produced.`
  - **Internal fault** banner:
    > `Tool fault (<code>) — this is a defect in the tool or distribution, not a judgement about your file. No snapshot was produced.`
- **Old-vs-current line** (CLI, when the destination already exists), exact text:
  > `<path> was not changed and still holds sha256 <64hex> from an earlier run; it is NOT the result of this run.`

  The browser cannot see disk, so it shows instead:
  > `Any snapshot you downloaded earlier came from a different run; compare its run ID with the report.`
- **Grouping.**
  - A summary line counts records per field, e.g. `PRICE_VND · 3 records`.
  - Below it, one entry per rejected record, in ascending record index. Each entry is headed `Record r · spreadsheet row r+1 · SKU <raw>`. Each issue in it shows field, displayed value, the shared message (verbatim) and a hint (D-B5b).
  - Values are displayed with visible whitespace: space→`·`, tab→`→`, CR→`␍`, LF→`␊`. This is display only.
  - Duplicate issues are also grouped by SKU: `SKU PEN appears in records 1, 2. Keep one record per SKU.`
  - Layout: a table on desktop (1280×800), stacked cards on phone (390×844).
- **Correction workflow.**
  - The operator edits the source file and chooses it again. "Validate again" always re-reads bytes. A new run ID and input digest are shown, so a re-run is visibly a new run.
  - There is no in-app cell editing. Editing in the tool would create a second, unaudited source of truth.
- **Meaning panel**, shown before Validate (exact text):
  > `Each record gives, for one SKU: NAME exactly as written; PRICE_VND as a positive whole number copied exactly (leading zeros removed, no currency conversion); QTY_ON_HAND as physical unsold units on hand, including units currently reserved by shop orders — not "available to sell" and not a change (+/−). An accepted file replaces the whole supplier snapshot.`
- **Reason:**
  - The operator corrects one source row at a time, so grouping by record matches the fix action.
  - Spreadsheet row = record+1 holds even when a NAME contains quoted newlines. Physical text line numbers do not (see B-T4).
  - An explicit statement about the old output answers "did a failed run change anything?"
- **Assumptions:** the operator edits in a spreadsheet or text editor, not in this tool. A header row exists in the spreadsheet.
- **Tradeoffs:**
  - Per-record grouping makes "fix all PRICE_VND at once" slower. The per-field summary mitigates this.
  - No inline editing means more round trips, but one source of truth.
- **Responsibility (proposed):** host renderer for layout and grouping. DNode app root `batch` (proposed) for message and hint texts. Shared `supplier` root for issues.
- **Acceptance:** B06 human task (pending): an operator given `supplier-invalid.csv` fixes all records and says whether output is usable, with no verbal help. Record time, errors and device.
- **Variation:**
  - Constrained. Wording and layout may change only if the next B06 task still shows these four facts: (1) status, (2) whether a snapshot was produced, (3) the earlier output is untouched and not from this run, (4) which record and field to fix.
  - The banner's first word (`Accepted`/`Rejected`/`Tool fault`) is fixed.
- **Revision:** 1, then 2 (continuation; see below).

### D-B5b — Explanatory hints refine, never decide

- **Status:** chosen. **Refs:** B03, B06, B-T2, U-4.
- **Choice.**
  - Proposed app node `batch.hint(issue, parsed)` runs in the pinned runtime under `profiles/batch.json`.
  - It re-lexes with the same pinned `csv` native and reads the raw cell `at parsed record`. Record index equals the index into the parsed list, because the header is index 0.
  - It returns one hint per shared issue. The shared message is kept verbatim.
- **Numeric hints**, PRICE_VND/QTY_ON_HAND. Evaluated in this order; the first match wins:
  1. `len s == 0`: `Value is missing. Enter digits 0–9.`
  2. `not matches(s,"^[0-9]+$")`: `Use digits 0–9 only: no spaces, signs, decimal points, exponents or thousands separators.`
  3. `not nat_fits s`: `Number is larger than 9007199254740991, the largest supported value.`
  4. PRICE_VND with `decimal s == 0`: `Price must be at least 1.`
- **Other hints:**
  - SKU: `SKU must be 1–32 characters from A–Z, 0–9, "-" and "_". Lowercase is not converted automatically.`
  - NAME: `Name is empty.` or `Name has L characters; the maximum is 120.`
  - Row shape: `This record has F fields; expected 4. Check for an extra comma, or a comma inside NAME without quotes.` When the row is `[""]`: `This record is an empty line. Delete the blank line.`
  - Header: `The first line must be exactly SKU,NAME,PRICE_VND,QTY_ON_HAND (uppercase, no spaces).`
  - Empty: `The file has a header but no product records. An empty file is never treated as "all stock is zero".`
- **Invariant:** the issue set (record, field, message) and `ok` come only from `supplier.from_csv`. The hint list has exactly one entry per issue. Duplicate grouping is host presentation over already-flagged issues. The host infers no new involvement.
- **Reason:**
  - In the kit, `" 20000"`, `9007199254740992`, `0`, `-1`, `1.0`, `1e3`, `"1,000"` and full-width `１` all produce the identical message `Expected a positive bounded decimal integer` (observed).
  - B-T2 and B06 need the syntax-vs-range distinction. Adding it outside the shared root keeps shared meaning identical.
- **Assumptions:** the app root can call `csv` again on the same text and gets an identical parse (pinned, pure native).
- **Tradeoffs:**
  - The file is lexed twice. Ops overhead is small next to `supplier.validate`.
  - Duplicate grouping stays in the host, because a DNode grouping is O(n·d). With `maxOperations` = 10,000,000 that is predicted to hit `ResourceLimit` for files with thousands of duplicates.
- **Responsibility:** `batch.hint`, `batch.numeric_hint` (proposed DNode). Host grouping.
- **Acceptance:**
  - Generated cases: a property that `len(hints)==len(issues)` and that the verdict is unchanged.
  - Independent expected hints for each numeric category, including 9007199254740991 accepted and 9007199254740992 range.
  - B06 human task.
- **Variation:** hint wording is constrained by B06. The rule "never alter verdict or issue set" is fixed.
- **Revision:** 1.

### D-B6 — Run identity and report binding

- **Status:** chosen, **review-required** (interprets U-2). **Refs:** B04, B-T5, A-B1.
- **Choice.** The host computes:
  - `inputSha = SHA-256(raw file bytes)`, before decoding.
  - `runId = SHA-256(encode({"input": inputSha, "transformer": {"app": SHA-256(batch .node bytes), "profile": "edfedf5b…a96", "runtime": "fd854bcb…c55e", "supplier": "0c35544e…1bff"}}))`. Here `encode` is the kit's sorted-key JSON.
  - `snapshotSha = SHA-256(snapshot bytes)`.
- **Semantic report.** One file `<dest>.report.json`, encoded by the kit `encode`. It uses only V values; there is no null, so keys are omitted when absent. Fields:
  - `status`: "accepted" | "rejected" | "fault"
  - `runId`
  - `input`: {bytes, sha256}
  - `transformer`: {…}
  - `counts`: {dataRecords, acceptedRecords, recordsWithIssues, issues}. Present only when lexing succeeded.
  - `issues`: [{record, field, message, hint}]
  - `fileError`: {code, message}. Present only on a file-level failure.
  - `snapshot`: {published:true, records, sha256} or {published:false}
- **Volatile data.** Timestamps, host name and the digest of the pre-existing destination go only to an append-only `batch-runs.log`. They never go into the report.
- **Reason:**
  - The ID must exist for unlexable files, so the raw-byte digest is used.
  - LF and CRLF variants get different run IDs but byte-identical snapshots (observed, sha 05d9b149… for both). The output identity is therefore a separate field.
  - The prior-destination digest depends on disk state, so putting it in the report would break B04.
- **Assumptions:** the host SHA-256 is a trusted substrate facility (STRUCTURE §G). The batch app root gets a full identity once it exists.
- **Tradeoffs:**
  - Raw-byte IDs differ for semantically equal inputs.
  - The alternative, a canonical-lexed-rows ID, cannot name MalformedCSV, InvalidUTF8 or FileTooLarge runs.
- **Responsibility:** host, plus kit `encode`.
- **Acceptance:** B04 test: run twice and run once with LF→CRLF. Compare snapshot bytes and report bytes. A report change is expected only in `runId`/`input` for the CRLF variant.
- **Variation:** field set fixed once adopted. Interpretation of U-2 needs owner review.
- **Revision:** 1.

### D-B7 — Every run reports, and publication order

- **Status:** chosen. **Refs:** B03, B05, B-T5, A-B1.
- **Choice. Execution order:**
  1. Byte limit: more than 1048576 raw bytes gives FileTooLarge.
  2. `TextDecoder('utf-8',{fatal:true, ignoreBOM:true})`. Failure gives `InvalidUTF8`.
  3. `batch.run`. The host catches the refusals MalformedCSV, TooManyRows and FileTooLarge and records them as `fileError`.
  4. Any Fault gives status `fault`.
- **Accepted publication.** First write the snapshot as temp (`wx`) then `rename`. Then write the report as temp then `rename`.
- **Rejected or fault.** Write the report only. The snapshot is never touched.
- **Exit codes:** 0 accepted; 2 rejected (record or file level); 1 fault or publication failure.
- **Usability rule**, shown in the UI and given to the shop as a proposed check: a snapshot file is "verified current" only if the adjacent report has `status:"accepted"` and `snapshot.sha256` equals the snapshot's digest.
- **Reason:**
  - The kit CLI writes no report for MalformedCSV, non-UTF-8 or oversize files (observed). The previous run's report then sits beside the old snapshot. After an oversize run it still read `"ok":true` (observed).
  - The kit writes the report *before* the snapshot. A crash between the two would leave a report claiming acceptance next to an old snapshot (read from source; not exercised).
  - Writing the snapshot first means the report never claims an unperformed publication. Any interruption is then detectable as a digest mismatch, and a deterministic re-run repairs it.
  - `ignoreBOM:true` hands the BOM to the `csv` native, which strips exactly one. Kit CLI decoding strips one BOM and the native strips another, so a **double-BOM file is accepted by the kit CLI** (observed) but rejected by `supplier.from_csv` called directly (observed). This choice restores "optional *initial* BOM" without editing the kit.
- **Assumptions:**
  - POSIX `rename` is atomic within one directory on the operator's filesystem.
  - Temp files (`*.tmp`) are never imported by the shop.
- **Tradeoffs:**
  - Two renames are not a transaction. The mismatch window is detected, not prevented.
  - Exit 2 for file-level rejection differs from kit exit 1, deliberately: malformed input is a rejection, not a tool fault.
- **Responsibility:** proposed host script `batch-host.mjs` (Phase B). The kit `run.mjs batch` cannot load an app root and only calls `supplier.from_csv` (read from source).
- **Acceptance:**
  - B05 fault injection: SIGKILL (a) after the temp write, (b) after the snapshot rename and before the report. Destination bytes are old-or-complete-new. Case (b) shows "unverified".
  - B03 cases for each file-level code.
  - A double-BOM case is expected to be rejected with a header issue.
- **Variation:** fixed (order and reporting). Exit-code numbers are constrained.
- **Revision:** 1.

### D-B8 — The pinned `csv` native is the only lexer; MalformedCSV location is reported as unavailable

- **Status:** chosen. **Refs:** B02, B06, U-3.
- **Choice.**
  - No host re-lexing to find error positions.
  - File-level message:
    > `The file is not valid CSV for this format: a quote is unclosed, a quote appears inside an unquoted value, text follows a closing quote, or a carriage return is not followed by a line feed. This version of the reader cannot report where. No records were checked.`
  - For FileTooLarge and TooManyRows, append:
    > `Do not split one stock list into several files: each accepted file replaces the whole snapshot.`
- **Reason:**
  - A second lexer could disagree with the pinned dialect. That would move data meaning into the host.
  - "Split the file", the natural advice, would cause silent stock erasure under replacement semantics.
- **Tradeoffs:** for quote errors, B06 relies on the operator searching. This is a recorded gap, not a hidden weakness.
- **Acceptance:** B06 task containing one broken quote. Expected risk: slower correction (predicted).
- **Variation:** fixed until the distribution supplies a located refusal (extension proposal X-1).
- **Revision:** 1.

### D-B9 — Counts definition

- **Status:** chosen. **Refs:** B01.
- **Counts** (DNode, proposed `batch.counts`):
  - `dataRecords = len(parsed) − 1`. These are logical records after the header.
  - `acceptedRecords = len(rows)`. This is `dataRecords` if accepted, else 0. The shared post-condition enforces it.
  - `recordsWithIssues = len(unique(issue.record where record ≥ 1))`
  - `issues = len(errors)`
- Header-only file: dataRecords 0, issues 1 (record 0, field `file`).
- **Reason:** "N records" in banners must be exact and independent of physical lines.
- **Acceptance:** independent expected counts for `supplier-valid.csv` (3/3/0/0) and `supplier-invalid.csv` (4/0/4/6) (predicted from observed issue list).
- **Variation:** fixed.

## Four-field transition definition — `batch.publish(bytes) → (report, snapshot?)`

**D (domain).**
- Inputs: a byte string of any length, the pinned kit (identities above), `profiles/batch.json`, and the destination directory state.
- Shape inputs to DNode: `Text` (Unicode scalars) only after host decode.
- Business admissibility is separate: dialect, header, records and uniqueness.

**ℛ (relationship).** Accept ⇔ all of the following hold:
- `|bytes| ≤ 1048576`
- bytes are UTF-8, with at most one initial BOM removed
- `csv` lexes without refusal
- `1 ≤ n ≤ 10000` records after the header
- `header = [SKU,NAME,PRICE_VND,QTY_ON_HAND]`
- every record r_i (i = 1..n) has 4 fields with:
  - SKU ∈ `^[A-Z0-9_-]{1,32}$`
  - 1 ≤ |NAME|_scalars ≤ 120
  - PRICE ∈ `^[0-9]+$`, value ∈ [1, M]
  - QTY ∈ `^[0-9]+$`, value ∈ [0, M], where M = 9007199254740991
- SKUs are pairwise distinct as scalar sequences.

On accept, snapshot bytes = `encode(sort_by(map(normal, records), "sku"))`, where `normal` = {sku, name unchanged, price = decimal, stock = decimal}. The order is total because SKUs are unique. Scalar order puts `-` < digits < `A–Z` < `_`; observed: PEN-2, PEN2, PENA, PEN_2. Output is deterministic: one allowed result per (bytes, identities). Report bytes are deterministic. The run log is not.

**Φ (failures), by precedence:**
1. FileTooLarge, checked on bytes before decode.
2. InvalidUTF8.
3. Lexical: MalformedCSV or TooManyRows, whichever the single scan meets first. The kit throws TooManyRows when the 10002nd row is ended (read from source).
4. Header: `Missing CSV header` for empty text; otherwise `Expected SKU,NAME,PRICE_VND,QTY_ON_HAND`.
5. Empty snapshot: record 0, field `file`.
6. Record issues, all collected. Within a record the order is SKU, NAME, PRICE_VND, QTY_ON_HAND, then duplicate (observed). A wrong field count yields only the `row` issue.

Categories:
- Levels 1–5 are file-level rejections (exit 2).
- Level 6 is record-level rejection (exit 2).
- Runtime faults (ResourceLimit, UndeclaredRefusal, ContractViolation, any write error) are `fault` (exit 1).

No failure is a business refusal of a *valid* file. Range is checked by `nat_fits` before `decimal`, so an out-of-range digit string never faults. Contrast: `text.parse_decimal_nat("9007199254740992")` → **Fault ArithmeticOverflow** (observed). It must not be used as the validator.

**Σ (execution).**
1. Read bytes.
2. Size check.
3. Digest (inputSha, runId).
4. Decode.
5. Single pure DNode call `batch.run(text)`. This uses strict checks, `maxOperations` 10,000,000 and no effects (batch profile has no grants).
6. On accept: encode, digest, temp+rename the snapshot, then temp+rename the report.
7. On reject or fault: temp+rename the report only. The destination snapshot is untouched.
8. Append the run log.

Interruption semantics:
- Before the snapshot rename, nothing changes.
- Between the two renames, the new snapshot sits beside an old report. The digest mismatch shows "unverified"; a re-run reproduces the same bytes.

No power-loss durability (no fsync). No multi-file transaction. Previous output is never relabelled as newly accepted.

## Obligation mapping

| ID | Responsibility/artifact | Evidence method | Actual result or pending | Limitations |
|---|---|---|---|---|
| B01 | `supplier.from_csv` (existing, bf894486…) via proposed `batch.run`, `batch.counts`; kit `encode` | Independent expected records, bytes and counts for fixtures plus fresh cases | **Observed (kit only):** `supplier-valid.csv` → 3 records, sorted NOTEBOOK, PEN, TOTE. B-T1 bytes match my expectation. App counts are **pending**. | Kit public generated cases for `from_csv` are 160 single-row valid files with no quotes, CRLF, BOM, rejection or boundary value (observed). |
| B02 | `csv` native (existing host native 4d629da6…; implementation is `values.js csv`) | Lexical cases: quoted comma, newline, `""`, CRLF, mixed, BOM, no final newline | **Observed (kit):** quoted comma/newline, `""`, CRLF, BOM, no final newline, and CR LF inside quotes preserved as `\r\n` all behave as declared. The double-BOM discrepancy is in the kit CLI decode. | No independent lexer oracle in the kit. The evidence is my probes. |
| B03 | Shared issues, plus proposed `batch.hint`, `batch.file_error`, host report writer | One case per failure class; check record/field/message/hint and that no snapshot is written | **Partly observed (kit):** all record-level classes and header/empty refusals. MalformedCSV/UTF-8/size produce **no report** in the kit CLI. App behaviour **pending**. | MalformedCSV lacks location (U-3). Wrong-shape duplicates are not flagged (U-4). |
| B04 | Kit `encode` + D-B6 host digests | Repeat runs; LF/CRLF; compare bytes | **Observed (kit CLI):** identical snapshot and kit-report bytes on rerun and for the CRLF variant (05d9b149…, 5eabe4be…). D-B6 report **pending**. | The kit report lacks a run ID. |
| B05 | Host temp+rename (A-B1), byte limit | Fault injection (SIGKILL at two points); 1048576/1048577 bytes; 10000/10001 records | **Observed:** 1048577 bytes → `Error FileTooLarge`, exit 1. 10000 records accepted in 1163 ms. 10001 → TooManyRows. Interruption **pending** (not run). | Browser download is not atomic replacement (O4). No fsync. |
| B06 | D-B5a/b UI and texts | Human operator correction task on phone and desktop | **Pending.** No human was observed. | Worst-case rejection latency (G-3) may harm the experience. |

## Challenge answers

**B-T1.**
- **Observed** with kit CLI `batch` and `supplier.from_csv`: one record `{sku:"PEN", name:"Blue, fine", price:20000, stock:3}`. The final newline produces no extra record.
- Published bytes (59 bytes, no trailing newline, sha256 `05d9b1490221a3625fa3100d8f56a8c138b80565df0506744a9a56083607bd31`):

  ```
  [{"name":"Blue, fine","price":20000,"sku":"PEN","stock":3}]
  ```

- The CRLF variant gives identical bytes (observed).
- Counts (D-B9, predicted): dataRecords 1, acceptedRecords 1, recordsWithIssues 0, issues 0.
- Leading zeroes are normalized (`020000`→20000, `003`→3). The quoted comma stays in NAME.

**B-T2.**
- Each value, in its own otherwise-valid file, gives a whole-file rejection with a located issue `{record:1, field:"PRICE_VND", message:"Expected a positive bounded decimal integer"}`. No snapshot is produced. Kit CLI exits 2 and writes a rejected report (observed for `" 20000"`; `9007199254740992` observed via runtime call).
- Neither is a Fault, because `nat_fits` checks the digit string before conversion.
- **Kit distinction: none in wording** (observed identical message).
- **My distinction (D-B5b, predicted for Phase B):**
  - `" 20000"` → hint `Use digits 0–9 only: no spaces, signs, decimal points, exponents or thousands separators.` This is a syntax category; surrounding whitespace is rejected, not trimmed.
  - `9007199254740992` → hint `Number is larger than 9007199254740991, the largest supported value.` This is a range category.
- Boundary counterexample: `9007199254740991` is accepted for both price and qty (observed).
- Evidence gap: the blueprint requires an independently tested range check. The kit ships no public evidence for `nat_fits` at the boundary. Public `parse_decimal_nat` cases are 5-character strings with maximum value 159. The full check report is "available with reference distribution" only.

**B-T3.**
- **Deduplication is not permitted** (D-B3, fixed).
- **Observed:** both records are reported, `{record:1, field:"SKU", message:"Duplicate SKU: all occurrences reject the snapshot"}` and the same for record 2.
- **Published:** no snapshot; only a rejected report. Any earlier snapshot is byte-unchanged.
- The UI groups them as `SKU PEN appears in records 1, 2. Keep one record per SKU.`

**B-T4.**
- **No.** A quoted newline stays inside the NAME value, and record indices count logical records (header = 0, first data record = 1).
- **Observed** with this file:
  - header
  - `A,"two\nlines",…`
  - `PEN,…`
  - `B,"x\r\ny",…`
  - `PEN,…`

  Duplicates are reported at **records 2 and 4**, although the PEN rows sit on physical lines 4 and 7.
- Duplicate locations are counted as data-record indices, with every occurrence listed. The UI also shows spreadsheet row = record+1.
- Physical line numbers are not reported, because the lexer gives no spans (U-3).
- A CRLF inside quotes is preserved as `\r\n` in NAME (observed) and counts as 2 scalars toward the 120 limit.

**B-T5.**
- **Previous output:** untouched, byte-identical (observed: sha 05d9… unchanged after a rejected run).
- **New report:** a rejected report replaces the prior report atomically. It carries `status:"rejected"`, `snapshot:{published:false}`, the new runId and inputSha (D-B6/D-B7; predicted).
- **Can an operator mistake old output for a new success?**
  - **With the kit CLI as shipped: yes (observed).** The report carries no run, input or output identity. MalformedCSV, non-UTF-8 and oversize runs write no report. After an oversize run, the on-disk report from the previous run still said `"ok":true` next to the old snapshot. The report-before-snapshot order adds a crash window (predicted from source).
  - **With my design: mitigated, not eliminated.** Measures:
    - Every run writes a report bound to runId and inputSha.
    - The accepted report binds snapshotSha.
    - The CLI/UI states `…was not changed and still holds sha256 … from an earlier run; it is NOT the result of this run.`
    - Exit 2 on rejection.
  - Residual risk: someone who opens `snapshot.json` directly in the shop without the report. Closing it needs the shop to apply the usability rule (dependency O5).

**B-C1** — see the Continuation amendment below.

## Continuation amendment (B-C1: supplier asks for partial acceptance)

**Can it be enabled within this blueprint? No.**
- D-B1 is chosen/fixed for this comparison (COMMON: fixed policies may be challenged only via an extension proposal).
- P-B says the operator must never wonder whether a failed run partially changed stock.
- Under replacement semantics, a snapshot missing the rejected SKUs would, depending on unresolved U-1, delete them, zero them or leave them alone. Any of these silently changes inventory meaning.

**Rejected shortcut (counterexample).** Exporting "valid rows only" as a CSV for the operator to re-run would be accepted as a *complete* snapshot that lacks the bad SKUs. That is partial acceptance by stealth. I will not offer it.

**Smallest explicit proposal — EP-B1 "supplier partial update" (status: proposed, review-required, not in effect; authority needed: experiment owner/human):**
1. **New artifact kind, not a snapshot.**
   - Shape: `{"kind":"supplier-partial-update","updates":[Product…],"excluded":[{record,sku,fields}]}`, written to a distinct file name `*.partial.json`.
   - Meaning: for each listed SKU, set H := stock and price := price. SKUs not listed are **unchanged**. It never deletes, and absence never means zero.
   - The snapshot artifact, its bytes and D-B1 stay exactly as now.
2. **What still rejects the whole file.**
   - All file-level failures, header failures and the empty file.
   - Zero valid records.
   - Every record of a duplicated SKU is excluded, because the tool cannot choose between them.
   - Records with an invalid SKU are excluded and listed by record index only, because they cannot be keyed.
3. **Shared root.**
   - A new node `supplier.partition(rows)` gives `supplier` a **new identity**, invalidating the supplier certificate and all batch and shop evidence that depends on it.
   - `supplier.from_csv` behaviour must stay byte-identical. Verify by re-running all snapshot fixtures.
4. **Shop.**
   - Needs a new atomic import transition (per-SKU upsert with the `H_new ≥ R` check per SKU, whole update atomic) and an operator confirmation that names the excluded SKUs.
   - Open question O6: whether a partial update must bind the identity of the base snapshot it was prepared against, so it cannot be applied over a different snapshot.
5. **Evidence to rerun if adopted:**
   - Kit selftest
   - B01–B06
   - Shop S06/import tests
   - New B07: the partial update equals the independently expected valid subset and exact exclusions; non-listed SKUs are unchanged in the shop.
   - B06 extended: the operator correctly states which SKUs were *not* updated.

**Changed records in this submission:**
- **D-B5a rev 2:** the record-level rejected banner gains the sentence `Partial acceptance is not available: correct the listed records and validate the whole file again.`
- **EP-B1 rev 1** added as a proposal.

**Preserved (invariant):** D-B1–D-B4, D-B6–D-B9, snapshot bytes and meaning, shared supplier identity, exit codes, and the usability rule.

**Impact and evidence to rerun for rev 2:** the text-only change requires re-running only the B06 human task.

## Handoff to the next model

**Settled (do not change without a revision record):**
- D-B1–D-B4 (inherited fixed).
- D-B6 (run identity; review-required on U-2).
- D-B7 (every run reports; snapshot-then-report; usability rule; `ignoreBOM:true`; exit 0/2/1).
- D-B8 (no host re-lexing).
- D-B9 (counts).
- D-B5b invariant: hints never alter the verdict or issue set.

**Freedoms:**
- D-B5a wording and layout, within its four-fact constraint and fixed first word.
- Hint wording.
- Visual style.
- App node names and decomposition.

**Dependencies:**
- Kit runtime fd854bcb…, roots supplier 0c35544e… and prelude 8e199f27…, `profiles/batch.json` edfedf5b…
- Host SHA-256, TextDecoder, POSIX rename.
- Shop adoption of the usability rule (O5).

**Assumptions:**
- A-B1 (CLI rename atomic, same directory).
- Operators edit in a spreadsheet, so row = record+1.

**Distribution gaps (minimal reproducers; all observed):**
- **G-1** MalformedCSV has no location: `supplier.from_csv` on `"SKU,NAME,PRICE_VND,QTY_ON_HAND\nPEN,\"Pen,1,1\n"` → `refused MalformedCSV csv`, with no offset.
- **G-2** Kit CLI accepts a double BOM: file bytes `EF BB BF EF BB BF` + valid CSV → `Published 1 records`. Direct `supplier.from_csv` with `"﻿﻿…"` → header issue.
- **G-3** Rejection run time grows quadratically with issue count:

  | Duplicate/invalid rows | Time |
  |---|---|
  | 1000 | 2.75 s |
  | 2000 | 8.56 s |
  | 4000 | 35.7 s |
  | 10000 | **232.9 s** (~3.9 min; 970,051 ops, far below maxOperations: no fault, only wall time) |

  10000 valid rows take 1.16 s. Predicted cause, not verified: the growing `fold supplier.join` accumulator is re-checked and copied per call.
- **G-4** Kit CLI writes no report on file-level failures and its report has no run/input/output identity.
- **G-5** No public boundary evidence for `nat_fits`. No public rejection-case evidence for `supplier.*`.
- **G-6** No browser batch host exists; `index.html` is a generic node runner. `tools/run.mjs check` and `run-file` use the *browser* profile, not batch.
- **U-4** Wrong-shape rows are not counted in duplicate involvement.

**Open questions:**
- O1 = U-1: SKU-absence semantics in shop import.
- O2 = U-2: run-ID input canonicalisation.
- O4: browser publication guarantee.
- O5: shop-side usability check.
- O6: partial-update base binding.
- O7: independent trust fingerprint.

**Next action (Phase B):**
1. Write `batch.node` (`batch.run`, `batch.hint`, `batch.numeric_hint`, `batch.counts`, `batch.file_error`) and `batch-host.mjs`, implementing D-B7.
2. Write independent expected fixtures for B-T1–B-T5 and every Φ class.
3. Run fault-injection for B05.
4. Then run the B06 human task on 390×844 and 1280×800, recording device and browser.

## Evidence and release status

**No new implementation was made. No human acceptance exists. Nothing below certifies an application.**

**Commands actually run.** Working directory `kit/dnode-e1-kit` unless noted; Node v22.22.0.
1. `sha256sum package/* candidate.zip` → every listed file matches MANIFEST.json.
2. `node tools/run.mjs verify` → `VERIFIED DNode-E1-author-kit trust fingerprint 4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244`, exit 0.
3. `node tools/selftest.mjs` → `Verified pinned package and 1280 independently expected public generated cases. This does not certify your application.`, exit 0.
4. `node probe/probe.mjs <kit>`. My read-only harness: it verifies the bundle, then calls `supplier.from_csv` and `text.parse_decimal_nat` through the runtime. Output is in `blind-batch/probe/probe.out`. Results quoted above:
   - B-T1…B-T4 cases.
   - Numeric cases: `-1`, `1.0`, `1e3`, `"1,000"`, `+1`, `１`, `0`, empty.
   - BOM, double BOM, blank trailing line, trailing comma, CR alone.
   - Name length 121 (rejected); 120 astral (accepted).
   - Sort order.
   - 10000 records → ok, 1,120,055 ops. 10001 → `refused TooManyRows`. Text >1 MiB → `refused FileTooLarge`.
   - `parse_decimal_nat("9007199254740992")` → `fault ArithmeticOverflow`.
   - The first attempt, which included the 10000-invalid case, was killed after more than 3 CPU-minutes. That case was moved to a separate job.
5. `node tools/run.mjs batch <file> <dest>`, sequentially on bt1, bad (` 20000`), broken quote, non-UTF-8, double BOM, 1048577-byte, CRLF-in-name → outputs as quoted in B-T5/G-2/G-4:

   | Input | Output | Exit |
   |---|---|---|
   | bt1 | Published | 0 |
   | bad | Rejected… | 2 |
   | broken quote | `MalformedCSV MalformedCSV` | 1 |
   | non-UTF-8 | `ERR_ENCODING_INVALID_ENCODED_DATA The encoded data was not valid for encoding utf-8` | 1 |
   | double BOM | Published | 0 |
   | 1048577-byte | `Error FileTooLarge` | 1 |

   Report files were stale after the exit-1 runs. Determinism: r1, r2 and the CRLF variant r3 have snapshot sha 05d9b149… and report sha 5eabe4be… for all three. Fixtures: `supplier-invalid.csv` → exit 2, 6 issues; `supplier-valid.csv` → 3 records.
6. `node probe/scale.mjs <kit> 250 500 1000 2000` and `… 10000 10001` → valid files are linear: 2000 rows 166 ms, 10000 rows 1163 ms. 10001 → TooManyRows.
7. `node probe/scale-invalid.mjs <kit> 250 500 1000 2000` and `… 4000 10000`. Rows are all invalid, with half-duplicate SKUs. Results: 185 ms, 563 ms, 2750 ms, 8562 ms, 35742 ms; 10000 → 232939 ms (`10000 rows ok false 0 ops 970051 ms 232939`).

**Predictions** (not executed): every D-B5/D-B6/D-B7/D-B9 output, the exact hint texts as produced by nodes, run IDs, interruption behaviour, and human outcomes.

**Release status:** not releasable. B01–B06 are unresolved for the batch application, because it does not exist.
