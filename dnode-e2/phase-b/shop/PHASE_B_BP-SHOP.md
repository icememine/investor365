# Submission — BP-SHOP — Claude Opus 5.5 (claude-opus-5-5), Phase B successor session, 2026-10-21

**Phase:** B (implementation). A shop was built and run against the frozen kit.

**Human acceptance:** none observed. S01 and S08 stay **pending**.

## Prior exposure and continuity

This session is a successor and did not see the Phase A conversation. Its only inputs were:

- `handoff/PHASE_A_BP-SHOP.md`;
- `handoff/OWNER_RULINGS.md`;
- the E2 package in `handoff/package/`;
- the frozen kit.

It did not read `P/game`, `P/batch`, or the Phase A batch/game handoffs. The model family may have earlier exposure to DNode shops (see STRUCTURE §14). This session did not see any earlier shop source.

**Build order:**

1. Read the kit: README, generated DICTIONARY/KERNEL/SEMANTICS, profiles, roots, `runtime/*.js`, `tools/*`.
2. Ran `verify` and `npm test`.
3. Wrote `shop.core.node`.
4. Wrote the Python oracle from the blueprint text, before running any DNode transitions.
5. Wrote `shop.view.node` and the host.
6. Ran the drives.

## Identities

| Artifact | SHA-256 |
|---|---|
| package `dnode-e1-kit.zip` | `141331a5c76807da3b99ffb19cb1507d3a9acad6b00d4f8cee13b91a199a5633` |
| package `BP-SHOP.md` | `8efa5675f26d30f5da289d4d04b545531a19ec66174a5bdfe4b02543561c14e7` |
| handoff `PHASE_A_BP-SHOP.md` | `75f999bfa7753abbbb955c784101fd194d596a4a69de29297ff7697df4cc1272` |
| handoff `OWNER_RULINGS.md` | `8f7f49bc05fe7abca41ae1316fa0800f058c86d375f9aa86a888dd91c150e5f7` |
| kit runtime identity (spec 201020261730) | `fd854bcb708f3031824b14819fe126b0be96b241ced19416035b6f49d4d7c55e` |
| kit root `prelude` (kit identity) | `8e199f2776bb9c4ec44b3a435b4c70744748c42b784c646f77d2847c41e99dde` |
| kit root `supplier` (kit identity) | `0c35544ed5e56d00479656114dd226712a416054bf23b4140c30466d27011bff` |
| kit `runtime/host.js` | `4ef32562035a64afc22c0882ccd54c5b8b210338f2b8f687bd91fb69980825cc` |
| kit `runtime/engine.js` | `730191eae563678061a787b6c21104bb21ce795bb7b544e1adf445af52febfb7` |
| kit `profiles/browser.json` | `cda00518bb6155832ad8bbd82392f0230ca8b0c3f957ba8409cfcecd5dfd17f7` |
| kit trust-key fingerprint (in-kit) | `4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244` |
| `shop.core.node` (80 nodes) | `8c43a3a314b08101393b59ffe5542a08a04f879f34f22d3014a63036012b0caa` |
| `shop.view.node` (39 nodes) | `8e112669a0f15bfbe02849531e40c3a6eebbb2c37d6089abc6f4816ed03c4823` |
| `app.js` | `10cea3a64f434bc5e568d693af65c7bfedb993c52f682b3930f95ac47054a0ad` |
| `index.html` | `8ba2238b3754a4f45b282441908d0e5ea46feb9db15cc9cc29889882777a4536` |
| `serve.mjs` | `af7bc7ca70085a2d21a90fa2a76432b3e0a9bcda0753ebc75f7af98eb2e5855d` |
| `app-lock.json` | `d45b79ffa530ba48e3b198c7812e45fe641ee20e4ce2b30861cc1c7c4eeece19` |
| `tests/oracle.py` | `752c1d9b43c821fd105182939769b6c88b72c22d8c65018e4bbe638a6988b631` |
| `tests/drive.cjs` | `f2922129480310de89c35f48959ec21db81a2a1c505780f58877039bee30033e` |

All values above are full SHA-256, computed in this session by `tests/identities.mjs`; the complete list is in `evidence/identities.json`. Shop root identities are SHA-256 of the exact `.node` bytes. The kit's own `rootHashes` come from an algorithm the kit does not ship (gap G-B4), so a kit-compatible identity for application roots cannot be computed. The trust fingerprint is the in-kit value and is therefore self-referential (R0.2).

---

## Purpose in my own words

A first-time customer buys one to three stationery items. At every step they should be able to read three things in Vietnamese: what they ordered, the exact VND amount, and whether the money was taken. When the shop cannot know the payment outcome, it must say so. It must keep the goods held and offer only a "check again" action that can never create a second payment.

A shop operator replaces physical on-hand counts from a supplier CSV. The shared supplier definition interprets the file. The replacement is all-or-nothing, and it may never take away units already promised to open orders.

Diagnostics stay in the test desk, away from checkout.

## What is fixed, chosen, assumed and unresolved

| ID | Status | Authority | As built |
|---|---|---|---|
| BP-SHOP domain, S01–S08 | required | blueprint | Implemented in `shop.core`. S01/S08 human parts pending. |
| D-S1 (reserve at order; hold through pending/unknown) | fixed | E1/E2 | `shop.order_place` reserves. `payment_apply` keeps R for `unknown`. There is no timeout release. |
| D-S2 (snapshot = physical unsold incl. reserved) | fixed | E1/E2 | `shop.stock_import`: H := QTY_ON_HAND, R untouched. The sentence is shown before confirmation. |
| D-S3 (simulator only) | fixed | E1/E2 | The kit's `simulatedBank` via `dispatch`, unchanged. |
| A-S1 (host lock covers all contenders) | assumed → **verified within scope** | blueprint | Observed for two pages in one Chromium context on one origin (S04). Not verified across browsers, profiles or devices. |
| C-S1 (keys, one instruction, inquiry-only recovery, single tx) | review-required, Phase A | Phase A + R-S4 | Built. Revisions REV-1, REV-2, REV-4 and REV-6 are below. |
| C-S2 r2 (Vietnamese UI) + R-S5 copy | constrained | Phase A + R-S5 | Built. Copy additions are recorded in REV-5. |
| C-S3 → R-S1/R-S2/R-S3 | settled by owner | OWNER_RULINGS | CSV through `supplier.from_csv`; SKU-set equality; price and name validated but not applied. REV-3 adds a preview-binding guard. |
| C-S4 (root split; text→Int only in `parse_qty`) | fixed / constrained | Phase A | Built. REV-7 notes that `parse_qty` is not wired to the customer UI. |
| R-S6 (indefinite unknown) | open | owner | The reservation is held indefinitely, and the test desk shows it. Known limit. |
| R-S7 (product names) | settled | owner | Catalogue names Notebook, Pen and Tote bag are kept. |

## Decisions as built and revision records

Phase A records C-S1 to C-S4 carry over except for the revisions below. Each revision is a deviation with its reason. None changes a blueprint policy.

### REV-1 — C-S1 r1 → r1.1: per-page review keys, caller-held intent

- **Status:** chosen by me. Variation: review-required. Affects S03 and S04.
- **What changed:**
  - **Key minting.** `shop.checkout_prepare` mints `ORD-nnnn` when review is entered and records it in `state.drafts`. Drafts are bounded to the last 20. The page holds `{key, intent}` in memory. `shop.checkout_enter(state, key)` reuses the page's key while it is still an unbound draft (the C-S1 rule "reuse if the cart is edited"), and otherwise mints a new one.
  - **Placing.** `shop.order_place(state, key, intent)` receives the intent the customer reviewed. It is not re-read from the cart. For an unbound key, the intent is recomputed from current catalogue prices and must equal the reviewed one, else the call refuses `IntentStale`.
  - **Cart.** A successful new binding empties the shared cart.
- **Reason:**
  - *Separate keys for separate pages.* The cart lives in the shared session record. If the draft key were also shared, two tabs would carry the same key and intent. Two "orders" for the last unit would then collapse into one idempotent retrieval, so S04 would pass vacuously. Per-page keys make two pages two business occurrences.
  - *Comparing what was reviewed.* Passing the reviewed intent lets the comparison of key + intent work on what the customer actually saw, including the amount (S-T3).
- **Tradeoff:** Abandoned review keys are burned; numbers can skip. A reload on `#/review` mints a new key. That is harmless because unbound keys are not occurrences.
- **Evidence:** S03 and S04 drives; oracle scenarios.

### REV-2 — C-S1 failure 4: `OutcomeContradiction` is a refusal, not a fault

- **What changed:** C-S1 asked for a fault here. As built it is a refusal.
- **Reason:** DNode E1 has no author-level way to raise a named fault, short of a contrived contract violation. As a refusal the state is still unchanged, and the test desk event log shows the code.
- **Evidence:** `tests/s02.mjs` case "apply: declined after confirmed".

### REV-3 — R-S1 import: confirm binds the previewed result

- **What changed:** `shop.stock_import(state, text, expected)` recomputes the preview inside the transaction. It refuses `PreviewChanged` unless the result equals the preview the operator confirmed.
- **Reason:** "Confirm whole snapshot" should confirm what was shown. Another page may reserve stock between preview and confirm.
- **Evidence:** import drive "stock changed between preview and confirm".

### REV-4 — order record gains `inquiries`

- **What changed:** The order record now has an `inquiries: Int` field.
- **Reason:** It drives the C-S2 r2 "still no response" line after a check that stays unknown, and it is shown in the test desk.

### REV-5 — C-S2 r2 values that Phase A left open (constrained variation)

- **Browse page:**
  - Lists "Đơn hàng của bạn", newest first, with status pills. This is the recovery entry point after navigating away or reloading.
  - Shows the note "Cửa hàng thử nghiệm: thanh toán được mô phỏng, không trừ tiền thật." (test shop; simulated payment).
- **Status headings and bodies Phase A did not specify:**
  - ready: "Chưa thanh toán" / "Các sản phẩm đang được giữ cho đơn này. Bấm nút bên dưới để thanh toán."
  - confirmed: "Đã thanh toán" / "Cảm ơn bạn! Đơn hàng đã được thanh toán thành công."
  - cancelled: "Đã hủy đơn" / "Đơn này đã được hủy. Bạn không bị trừ tiền."
  - declined: the body adds "Các sản phẩm không còn được giữ." This is true, because the reservation was released.
- **Order screen:** the receipt heading for a paid order is "Biên nhận".
- **Icons:** the ready card uses a receipt icon; cancelled uses a slashed circle.
- **Unchanged from r2 (with R-S5):**
  - status card first;
  - unknown copy: "Đang xác nhận thanh toán" / body ending "Vui lòng không thanh toán lại cho đơn này trước khi có kết quả.";
  - recovery label "Kiểm tra lại thanh toán";
  - follow-up line "Hệ thống thanh toán chưa phản hồi…";
  - hourglass icon and dashed border for unknown;
  - money format `240.000 ₫`.
- **Evidence:** journey drive (text matches), contrast measurement (`evidence/contrast.json`, every pair ≥ 5.8:1). Human interpretation is pending.

### REV-6 — `pending` is never persisted

- **What changed:** C-S1 runs submit → dispatch → apply in one transaction, so a stored order never sits in `pending`. The state still exists in the type and the view.
- **Customer view:** while a payment is in flight, the customer sees the button's busy label "Đang gửi thanh toán…".

### REV-7 — `parse_qty` exists but is not wired to the customer UI

- **What changed:** C-S2 chose stepper-only quantity entry. The text boundary `shop.parse_qty` → `text.parse_decimal_nat` is reachable through `shop.cart_set_text` and is tested, but no customer screen accepts typed quantities.

### Other behaviour choices, unchanged in meaning

- **Pay is a no-op after the first press.** `payment_submit` on a submitted or settled order emits nothing and returns the state unchanged. On a cancelled order it refuses `Cancelled`.
- **Reconcile emits nothing once the outcome is known.** On a terminal order, `payment_reconcile` emits no effect.
- **Cart increases are limited.** Each increase is capped at min(9, A). Decreases are always allowed. "Reorder" after a decline copies the lines into the cart; availability is checked again at place.

## Four-field transition definition (as built)

The definitions are recorded in the source with `domain`, `relation`, `failure` and `execution` directives on two nodes.

**`shop.order_place(state, key, intent)`**

- **Domain:**
  - `key` was minted by `checkout_prepare` (it is in `drafts`) or is already bound.
  - `intent` is a closed record: `{currency: "VND", lines: [{sku, qty, unit_price}], total}`.
- **Relationship:**
  - Unbound key: if q ≤ A for every line, apply (H,R) → (H,R+q) for all lines. The order becomes `ready` with instruction `key-P1`, and the cart is emptied.
  - Key bound to the same intent: return that order with the state unchanged.
  - Key bound to a different intent: refuse.
- **Failures, in precedence order:**
  1. shape fault;
  2. `UnknownKey`;
  3. `IntentConflict`;
  4. `InvalidOrder`;
  5. `IntentStale`;
  6. `OutOfStock`.

  The post-conditions are state invariants, key/intent equality, and "created ⇒ one more order, else the state is identical". There is no partial reservation: the node is pure, and the host writes only on return.
- **Execution:** Inside one `SessionStore.transaction`: Web Locks on `bp-shop-e2` plus a single localStorage record.

**`shop.payment_apply(state, key, reply)`**

- **Relationship:**
  - pending/unknown + confirmed → (H−q, R−q), phase confirmed.
  - pending/unknown + declined → (H, R−q), phase declined.
  - pending/unknown + unknown → phase unknown, reservation kept.
  - Terminal phase → no change.
- **Failures:** `UnknownOrder`, `NotSubmitted`, `OutcomeContradiction`.
- **Invariant after every transition:** `shop.state_ok`, which checks 0 ≤ R ≤ H, R = Σq over orders in ready/pending/unknown, unique SKUs and keys, and positive prices.

## Responsibility boundary

| Responsibility | Where |
|---|---|
| Cart validation, prices, totals, intent, keys, reservation, order and payment transitions, supplier import compatibility | `shop.core.node` (80 nodes) |
| All customer wording, money text, choice of next action, status → tone, test-desk tables and meaning sentence | `shop.view.node` (39 nodes) |
| Supplier record meaning | the kit's `supplier.from_csv`, attested entry, called from `shop.stock_preview` |
| Admission, block rendering, input, `SessionStore.transaction`, `dispatch` + `simulatedBank`, file size limit before decoding, strict UTF-8, SHA-256 of file bytes, simulator mode, session reset | `app.js` (326 lines), using `host.js` unchanged |

The host never coerces business values. Button arguments are SKU or key strings taken from DNode output. The host's only branch on business data is "state is null → `shop.initial`".

---

## Obligation mapping (actual results)

Evidence files are under `evidence/`. "Passed" means the automated check named here passed in the final run of `tests/run-all.sh` (see `evidence/commands.log`). It does not mean certification.

| ID | Responsibility / artifact | Evidence method | Actual result | Limitations |
|---|---|---|---|---|
| S01 | `shop.v.*` screens + `app.js` renderer | Human first-time users (HUMAN-TESTING.md T1). Automated: the journey drive at 390 and 1280 completes browse→cart→review→order→pay and reads "Đã thanh toán" and 240.000 ₫ | **pending** (human). Automated observable parts **passed** (`drive-journey.json`) | A drive is not a first-time user |
| S02 | `shop.intent_of`, `line_amount`, `cart_set`, `parse_qty`, `order_place` | Independent Python oracle: 400 scenarios / 4016 steps, 300 totals, 212 money cases. 33 inline `ex` cases. 29 DNode boundary cases. Malformed stored state in the browser | **passed**: 0 mismatches. Mutation check kills 9/9 seeded bugs. Malformed input faults `InputShape` before business logic, and the record is byte-identical. A text total cannot reach a charge (`drive-s02.json`, `s02-dnode.json`) | Finite cases. The oracle was written by the same session, from the blueprint text |
| S03 | `order_place` binding; `payment_submit` no-op after first submit; one `-P1` instruction | Two pages deliver the same key + intent concurrently; two concurrent pay presses; replay after payment; changed amount under the same key; deliberate second identical purchase | **passed**: one order, one reservation, one ledger entry, one stock consumption. `IntentConflict` leaves the state byte-identical. The second purchase gets a new key and its own charge (`drive-s03.json`) | Ledger exists only in the simulator |
| S04 | `order_place` precondition inside `SessionStore.transaction` | Two pages in one Chromium context click "Đặt hàng" for the last TOTE unit at the same scheduled instant (skew ≤ 3 ms), 30 iterations per arm. Arms: natural, and read-widened by 40 ms. Negative controls: the same with Web Locks replaced by a pass-through | **passed**: with the lock, 30/30 and 30/30 have exactly one winner, and the loser is refused `OutOfStock` and sees "không còn đủ hàng". Negative controls detected the race (both pages told "ordered", one order lost) in 30/30 widened and 30/30 natural (`drive-s04.json`) | One origin, one browser profile, Chromium only. Not distributed |
| S05 | `payment_submit/apply/reconcile`; simulator `lost`, `unavailable` | Fault injection, reload, then two concurrent recovery presses | **passed**: unknown is shown and order + R are kept. Exactly one bank record (confirmed). `unavailable` keeps unknown and shows the follow-up line. Reconcile → confirmed with H 5→4 once, the ledger unchanged, and a further press changes nothing (`drive-s05s07.json`) | Inquiry `unknown` cannot distinguish "no record" from "unavailable" (kit G4) |
| S06 | `settle_decline`, `stock_preview/stock_import` | Concurrent decline; repeated check/pay/cancel; below-reserved, SKU mismatch, malformed, non-UTF-8, >1 MiB and invalid-fixture files; PreviewChanged; S-T1 | **passed**: released once. Every rejection leaves the stored record byte-identical. Accepted files replace H and keep R. Name and price are not applied (`drive-s06.json`, `drive-import.json`) | MalformedCSV has no location (R-B4 / G-1) |
| S07 | persisted order, `#/order/<key>` route, browse order list | Reload during unknown, twice (order route and browse) | **passed**: same key and instruction; recovery button above the fold; order listed with a link (`drive-s05s07.json`) | Reload-durable only; no power-loss claim |
| S08 | `shop.v.status` + CSS (shape + text + colour + border style) | Human recognition including grayscale (T2–T4). Automated: at 390×844 the status, total and primary action of ready/confirmed/declined/unknown have bottom ≤ 844 at scroll 0, with no horizontal overflow; same at 1280×800; no hashes or instruction ids in customer text | **pending** (human). Automated geometry **passed** for all four states at both viewports (`drive-journey.json`). Grayscale screenshots are in `evidence/shots/gray-*.png` | Geometry is not comprehension |
| R0.2 | `admit()` in `app.js` | Tampered kit root, runtime file, trust key and app root, via request interception | **passed**: refused with no state written (`drive-admission.json`) | Trust key is in-kit; see G-B5 |

### Measurements (R0.5: measured only, no threshold)

Device: Linux, Intel Xeon 2.80 GHz ×4, headless Chromium (version in `drive-timing.json`).

| Measurement | 390 | 1280 |
|---|---|---|
| Admission + first render | 160 ms | 200 ms |

Median click-to-render: 390: cart +1 77 ms, place 66 ms, pay 67 ms; 1280: 76/66/67 ms (includes Playwright round-trips).

---

## Challenge answers, re-checked against the built app

**S-T1 — observed** (`drive-import.json`, both viewports).

- Setup: H=2 and R=1 (one open TOTE order). The CSV says TOTE 3.
- The preview row reads `TOTE 2 1 1 3 2` (H now, R, A now, H new, A new), shown with the meaning sentence.
- After confirmation: H=3, R=1, A=2.
- With TOTE=1 against R=3, the file was rejected and the state stayed byte-identical.

**S-T2 — observed** (`drive-s05s07.json`).

- After a lost reply: the order is `unknown`, the single bank record `ORD-0001-P1` reads confirmed, and R stays 1.
- After a reload, the same key appears with "Kiểm tra lại thanh toán".
- With inquiry unavailable: still unknown, the follow-up line appears, and there is no new record.
- Two pages pressed recovery simultaneously: one inquiry settled the order as confirmed, and the other found a terminal order and emitted nothing.
- Final ledger: one entry. Stock consumed exactly once (H 5→4, R 1→0).
- A further press left the state byte-identical.

**S-T3 — observed** (`drive-s03.json`).

- Same key with a changed amount (unit price 100000 instead of 120000): `IntentConflict`, record byte-identical, and the customer sees "Mã đơn này đã được dùng cho một đơn khác…".
- A deliberate second identical purchase: review mints a new key, placing reserves again, and paying creates a second instruction. Two ledger entries.

**S-T4 — observed** (`drive-s04.json`).

- The host atomic boundary enforces correctness. `navigator.locks` serializes read → `shop.order_place` (q ≤ A checked inside) → write of one record.
- Without the lock, the same test detected lost reservations in 30/30 iterations. A sequential sold-out test would not have shown this: it only exercises the precondition.

**S-T5 — observed** (`s02-dnode.json`).

- `shop.cart_set(state,"PEN","2")` → fault `InputShape`, not a stock refusal. An intent line with qty `"2"` likewise faults.
- Text becomes a quantity only in `shop.parse_qty` (`"2"`→2, `" 2"`→`InvalidInteger`, `"10"`→`QuantityOutOfRange`), reachable via `shop.cart_set_text`.
- Corrupted stored state faults before business logic, and the customer sees a system-error message. The test desk still offers reset (observed in the browser).

**S-C1 — built and observed** (`drive-journey.json` text checks).

- Customer UI in Vietnamese (`<html lang="vi">`).
- The uncertainty message is exactly the R-S5 text: "Đang xác nhận thanh toán / Chúng tôi chưa nhận được kết quả thanh toán cho đơn hàng này. Các sản phẩm trong đơn vẫn đang được giữ cho bạn và chúng tôi sẽ không tạo thêm khoản thanh toán nào. Vui lòng không thanh toán lại cho đơn này trước khi có kết quả."
- Recovery label "Kiểm tra lại thanh toán".
- Reassurance is carried by slate (#33547A on #EEF3F8), the hourglass icon and a dashed border. Unknown never uses green or the check icon.
- Whether the copy actually reassures readers is human-pending.

---

## Distribution gaps found (minimal reproducers)

- **G-B1 — `tools/run.mjs check` accepts exactly one application file.**
  - A multi-root application (C-S4 requires `shop.view` → `shop.core`) cannot be checked.
  - Reproducer: `cd kit/dnode-e1-kit && node tools/run.mjs check ../../shop/shop.view.node` → `MissingRoot MissingRoot: shop.core`, exit 1.
  - Workaround (test-only): `tests/load.mjs` compiles kit roots plus both shop roots under the browser profile, the same way `check` does.
- **G-B2 — `check` does not run inline `ex` cases.**
  - Reproducer: `evidence/gaps/check-ignores-ex-and-with-form.node` has `repro.one` with `out 1` and `ex {"args":[],"out":2}`. `check` prints `STRUCTURAL PASS`, and `run-file repro.one` returns 1.
  - Workaround: `tests/examples.mjs` runs all 33 shop `ex` cases.
- **G-B3 — the engine accepts an undocumented special form `with`.**
  - `(with r k v)` performs a record update, but DICTIONARY does not list it.
  - Reproducer: same file, `run-file repro.with '[{"a":1,"b":2}]'` → `{"a":5,"b":2}`.
  - I did not use it.
- **G-B4 — root identity derivation is not shipped.**
  - `rootHashes.prelude = 8e199f27…`, but `sha256(roots/prelude.node) = bf2a6cec…`, and no shipped tool reproduces the kit value.
  - The runtime identity *is* reproducible: `sha256(json(lock.runtimeHashes))`.
  - Application roots can only be identified by file SHA-256.
- **G-B5 — admission check and executed code are separate fetches.**
  - The browser imports `runtime/*.js` as ES modules (`admission.js` itself imports `engine.js`) before `verifyBundle` hashes separately fetched copies. A server that serves different bytes to the two requests would not be detected.
  - The kit's own `dist/index.html` has the same pattern. Recorded as a known limit; not worked around.
- **G-B6 — refusals carry no payload.**
  - `OutOfStock` cannot say which SKU is short, so the customer message is generic. The customer does see the per-line "Chỉ còn N sản phẩm" warning in the cart.
- **Still present from Phase A:**
  - G1: no payment-scenario or seed fixtures in the kit.
  - G3 / R-S4: the simulator ledger is inside the transaction record, so an abort after dispatch discards the simulated charge.
  - G4: inquiry `unknown` is ambiguous.
  - G5: the simulator compares only the amount.
  - G8: `parse_decimal_nat` overflow faults; the shop pre-limits the text to 2 digits.
  - G10: E2 records are not runtime-enforced.
- **Not a gap, but observed:** within the stated scope (one origin, one Chromium profile, two pages), Web Locks + localStorage did serialize correctly. Over 60 locked iterations, no stale read appeared after lock acquisition.

## Repair log (first failures preserved)

1. **`drive s02` (first run): FAIL "customer sees system-error message, no business screen" (`{"notice":""}`).**
   - Cause: on a corrupt stored state, `render()` fell back to a notice element without the shared `role=alert` and `data-testid` attributes.
   - Also found: the test desk itself crashed on corrupt state, so "Reset test session" was unreachable.
   - Repair (host): consistent fallback markup. The desk renders the DNode tables defensively and always shows reset.
   - Added check: "test desk still offers reset on corrupt state; reset restores the seed". Passed.
2. **`drive import` (first run): FAIL on the S-T1 preview row, then a 30 s timeout.**
   - Cause: two test-script bugs. The row was matched in the inventory table instead of the preview table. The click helper waited on the action counter, which import does not bump.
   - Repair: tests only. Assertions are unchanged.
3. **`drive s04` (first run): `TypeError: Failed to execute 'request' on 'LockManager': parameter 3 is not of type 'Function'`.**
   - Cause: my negative-control lock wrapper forwarded an `undefined` third argument.
   - Repair: test instrumentation only.
4. **`drive s04` (second run): all arms "passed", but the losing page's recorded code was `EmptyCart`, not `OutOfStock`.**
   - Diagnosis: after the refused place, `render()` re-entered review. The winner had emptied the shared cart, so `checkout_enter` refused `EmptyCart`. That overwrote both the event read by the test and the customer's notice. The customer would have seen "giỏ hàng đang trống" instead of the out-of-stock message.
   - Repair:
     - host keeps the failed action's notice;
     - `tx` traces refused transactions too;
     - `window.__shop.last` records the action result.
   - The S04 assertion was **strengthened**: the loser must be refused `OutOfStock` *and* display "không còn đủ hàng".
5. **`tests/mutate.mjs` (first run): mutant 1 was "killed" by the compiler (`UnusedInput: shop.item_release.lines`), not by behaviour.**
   - Repair: rewrote the mutant so it compiles. It is then killed by 992 oracle mismatches.
6. **Copy and style fixes found by inspecting screenshots, not by failing checks:**
   - `font:600 16px/22px inherit` was an invalid shorthand, so button labels were not bold.
   - The cart line read "50.000 ₫ × 2" while review read "2 × 50.000 ₫"; unified to the review form.

`shop.core` passed `check` and all oracle steps on its first run. No business-logic repair was needed after the oracle comparison.

## Commands run and outputs

The final full run is `sh tests/run-all.sh`. The complete transcript is in `evidence/commands.log`; a summary:

```
$ cd ../kit/dnode-e1-kit && node tools/run.mjs verify; echo exit=$?
VERIFIED DNode-E1-author-kit trust fingerprint 4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244
exit=0
$ cd ../kit/dnode-e1-kit && npm test --silent; echo exit=$?
Verified pinned package and 1280 independently expected public generated cases. This does not certify your application.
exit=0
$ cd ../kit/dnode-e1-kit && node tools/run.mjs check ../../shop/shop.core.node; echo exit=$?
STRUCTURAL PASS. Not a certificate; provide examples and independent evidence.
exit=0
$ cd ../kit/dnode-e1-kit && node tools/run.mjs check ../../shop/shop.view.node; echo exit=$?
MissingRoot MissingRoot: shop.core
exit=1
$ node tests/lock.mjs; echo exit=$?
exit=0
$ node tests/examples.mjs; echo exit=$?
shop roots: 119 nodes; 33 inline cases; 33 passed; 0 failed
exit=0
$ python3 -I tests/oracle.py > evidence/oracle-cases.json; echo exit=$?; sha256sum evidence/oracle-cases.json
exit=0
$ node tests/compare.mjs; echo exit=$?
scenarios 400, steps 4016, step mismatches 0; money 212 cases, 0 mismatches; totals 300 cases, 0 mismatches
exit=0
$ node tests/s02.mjs; echo exit=$?
29 DNode boundary cases, 0 failed
exit=0
$ node tests/mutate.mjs; echo exit=$?
KILLED   release keeps reservation | scenarios 400, steps 4016, step mismatches 992; money 212 cases, 0 mismatches; totals 300 cases, 0 mismatches
KILLED   reserve without stock check | scenarios 400, steps 4016, step mismatches 450; money 212 cases, 0 mismatches; totals 300 cases, 0 mismatches
KILLED   unknown reply treated as decline | scenarios 400, steps 4016, step mismatches 554; money 212 cases, 0 mismatches; totals 300 cases, 0 mismatches
KILLED   import adds instead of replacing | scenarios 400, steps 4016, step mismatches 1100; money 212 cases, 0 mismatches; totals 300 cases, 0 mismatches
KILLED   import ignores below-reserved | scenarios 400, steps 4016, step mismatches 42; money 212 cases, 0 mismatches; totals 300 cases, 0 mismatches
KILLED   confirm consumes twice | scenarios 400, steps 4016, step mismatches 768; money 212 cases, 0 mismatches; totals 300 cases, 0 mismatches
KILLED   submit charges every time | scenarios 400, steps 4016, step mismatches 370; money 212 cases, 0 mismatches; totals 300 cases, 0 mismatches
KILLED   total ignores quantity | scenarios 400, steps 4016, step mismatches 1537; money 212 cases, 0 mismatches; totals 300 cases, 141 mismatches
KILLED   money without grouping dots | scenarios 400, steps 4016, step mismatches 0; money 212 cases, 209 mismatches; totals 300 cases, 0 mismatches
exit=0
$ node tests/contrast.mjs; echo exit=$?
exit=0
$ BASE=http://127.0.0.1:8101/ RACE_N=30 node tests/drive.cjs admission journey s02 s03 s04 s05s07 s06 import timing; echo exit=$?
== admission: 5 passed, 0 failed
== journey: 28 passed, 0 failed
== s02: 7 passed, 0 failed
== s03: 5 passed, 0 failed
== s04: 4 passed, 0 failed
== s05s07: 7 passed, 0 failed
== s06: 3 passed, 0 failed
== import: 16 passed, 0 failed
== timing: 1 passed, 0 failed
exit=0
$ node tests/identities.mjs; echo exit=$?
exit=0
```

## Known limits

- **R-S4:** the single transaction (submit → dispatch → apply) is valid only for the E1 simulator, which shares the app's stored record. It is **not a payment pattern for a real external bank**; that needs a write-ahead pending record before dispatch. Recovery stays inquiry-only with the same instruction.
- **R-S6:** an indefinitely `unknown` payment holds its reservation forever. There is no timeout release and no operator resolution flow. The test desk shows the held R and the order.
- **Lock and storage scope:** one origin, one browser profile (A-S1). Other browsers, devices, private windows and server persistence are out of scope. The state is reload-durable only, with no power-loss guarantee.
- **Admission:** the trust anchor is in-kit (self-referential). G-B5 applies.
- **Catalogue:** R-S2/R-S3 mean the operator cannot add or retire SKUs or change price or name in E1.
- **Evidence:** the oracle was written by the same session that wrote the DNode code, so a fresh reviewer's cases are still needed. The drives run Chromium only.
- **Customer UI:** there is no Vietnamese product naming (R-S7). The "Test desk" footer link is visible on customer screens, but leads to diagnostics only.

## Handoff to the next model

- **Settled (preserve):**
  - D-S1–D-S3; R-S1–R-S7;
  - C-S1 r1.1 (REV-1/2/4/6);
  - C-S2 r2 + R-S5 + REV-5;
  - R-S1 + REV-3;
  - C-S4 (`shop.view` uses `shop.core`, never the reverse).
- **Freedoms:**
  - spacing, colours and wording within C-S2's constraints: shape + text + colour, facts-only uncertainty copy, action above the fold at 390×844;
  - test-desk design;
  - internal node decomposition.
- **Rerun rules:**
  - Changing anything in `shop.core` → rerun `tests/run-all.sh` in full.
  - Changing only `shop.view` or CSS → rerun the `examples`, `journey`, `s05s07` and `s02` drives and the human S01/S08 sessions.
  - Always regenerate `app-lock.json` (`node tests/lock.mjs`), or the page refuses to run.
- **Dependencies:** the kit at `../kit/dnode-e1-kit` with runtime identity `fd854bcb…`, roots `prelude`/`supplier`, profile `browser.json`, and `host.js` unchanged.
- **Open:**
  - R-S6 (policy for resolving an indefinite unknown);
  - the U-S4 follow-up (localized names supplied as data);
  - G-B1 to G-B6.
- **Next actions:**
  1. Run HUMAN-TESTING T1–T4 with Vietnamese-reading first-time users on a real phone and a desktop, and record the rows in `evidence/human-sessions.csv`.
  2. Have an independent reviewer supply fresh oracle scenarios.
  3. Decide R-S6.

## Evidence and release status

- **Implementation:** made, at `P/shop/`.
- **Automated computational and observable checks:** all passed in the final run.
- **Human acceptance:** S01 and S08 are **pending**; nothing was observed.
- **Release decision:** **incomplete**. The mandatory S01 and S08 human acceptance remain unsatisfied.
