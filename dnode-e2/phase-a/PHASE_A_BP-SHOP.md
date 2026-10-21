# Submission — BP-SHOP — Claude Opus 5.5 (claude-opus-5-5), fresh subagent session, 2026-10-21

Phase: **A** (interpretation and continuation). No application was built. This is the first response, preserved before any correction.

Prior exposure: this session started with no prior conversation about the experiment. Sessions were launched one per application (order: shop, game, batch), running in parallel. Earlier DNode builds, including an E1 shop/game/batch package, were authored by Claude sessions. The underlying model family may therefore have prior exposure. This session has not seen those builds. Everything I know about them comes from STRUCTURE.md §14 (for example "Astra", "Fable", 153 nodes, and the 3- vs 5-tick catch-up). I read only files inside `blind-shop/`.

Blueprint/runtime identities (SHA-256, computed in this session):
- candidate.zip `3e1868a12bd35bcf94f279fbd51f1d4555bf02b4f5f27a08541326a0d3db39d8`. All 10 files listed in MANIFEST.json match their digests (MANIFEST.json itself is `f1495f9c…983f`).
- BP-SHOP.md `8efa5675f26d30f5da289d4d04b545531a19ec66174a5bdfe4b02543561c14e7`; CHALLENGES.md `92d01eec…dfe6`; COMMON.md `46f358ec…0e6`; STRUCTURE.md `e7ec29d0…0951` (architecture 211020261208, E2.1).
- dnode-e1-kit.zip `141331a5c76807da3b99ffb19cb1507d3a9acad6b00d4f8cee13b91a199a5633` (spec 201020261730). Runtime identity `fd854bcb708f3031824b14819fe126b0be96b241ced19416035b6f49d4d7c55e`. Roots: prelude `8e199f2776bb9c4ec44b3a435b4c70744748c42b784c646f77d2847c41e99dde`, supplier `0c35544ed5e56d00479656114dd226712a416054bf23b4140c30466d27011bff`. Files: host.js `4ef32562035a64afc22c0882ccd54c5b8b210338f2b8f687bd91fb69980825cc`, profiles/browser.json `cda00518bb6155832ad8bbd82392f0230ca8b0c3f957ba8409cfcecd5dfd17f7`. Trust-key fingerprint `4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244`. This fingerprint comes only from inside the same package; I have no independent channel to confirm it.

---

## Purpose in my own words

A person who has never used the shop should be able to buy one to three stationery items. At every step they should know exactly what they are buying, the exact amount in VND, and whether the money was taken. When the shop cannot know whether the money was taken, it must say so plainly. It must keep the goods held and give a safe "check" action, not a "pay again" action. A shop operator replaces on-hand stock counts from a validated supplier snapshot. The replacement must never steal units already promised to open orders, and it must never leave stock half-updated. Calm presentation serves trust. It never outranks correct money and stock behavior.

## What is fixed, chosen, assumed and unresolved

| ID | Classification | Authority | Content / implication |
|---|---|---|---|
| P-S | required (purpose) | inherited E1 human purpose | Customer understands items, cost and outcome. Operator updates inventory safely. |
| Domain bullets of BP-SHOP | required for this trial | E1/E2 blueprint (experiment owner) | VND exact integers. No tax, delivery, discount, login, bank or FX. Seed NOTEBOOK/50000/5, PEN/20000/8, TOTE/120000/2. Quantity 1–9, 1–3 unique lines. A=H−R, 0≤R≤H. Reserve, commit and release transitions as given. Snapshot H_new<R rejects. Atomic whole-file import. Scoped instruction identity. Five payment states. |
| S01–S08 | required (mandatory acceptance) | blueprint | All start **unresolved**. |
| D-S1 | inherited choice, **fixed** | E1 design choice adopted for the trial (not a logical consequence of purpose) | Reserve at order creation. Keep the reservation through pending/unknown. |
| D-S2 | inherited choice, **fixed** | E1 design choice, shared with D-B2 | QTY_ON_HAND = physical unsold units including reserved units. It is not a delta and not net available stock. |
| D-S3 | inherited choice, **fixed** | E1 | Simulator only. Lost-reply and unavailable-inquiry modes. No production durability claim. |
| A-S1 | **assumed, verify** | blueprint | The host lock covers every contender. Kit fact: `SessionStore.transaction` = `navigator.locks.request(key)` around one localStorage record, **on one origin in one browser profile**. Other devices and other browsers are outside scope. That is a gap, not a guarantee. |
| D-S4, D-S5 | delegated → **chosen by me** (C-S2) | delegated design freedom | My concrete values are below. These are AI choices, **not human requirements**. |
| Env | required comparison condition | COMMON.md | Human tests at 390×844 and 1280×800, with the device and browser recorded. |
| U-S1 | **unresolved** | — | Does PRICE_VND/NAME in a snapshot set the shop's retail price and display name for future orders? Smallest missing fact: "Is PRICE_VND the shop's selling price?" Provisional handling in C-S3: validate the fields, do not apply them. |
| U-S2 | **unresolved** (provisional choice in C-S3) | — | Snapshot SKU set differs from the catalogue: is a missing SKU H=0 or unchanged? Is an extra SKU a new product? |
| U-S3 | **unresolved** | — | No policy ends an indefinitely `unknown` payment. The reservation is held indefinitely in E1. Smallest missing item: an operator resolution or expiry policy. It must not be a timeout-based release, which D-S1 forbids. |
| A-S2 | **assumed** (my assumption) | — | The base customer UI language is English. The blueprint is silent. S-C1 implies a non-Vietnamese base. |

## My decisions and reasons

All of the following are **chosen** by this AI session. Responsibility names are **proposed**. Nothing was built.

### C-S1 — Operation identity, payment instruction and recovery protocol
- **Status/authority:** chosen, within BP-SHOP policy freedom. Variation: **review-required**, because it affects S03, S05 and S07.
- **Choice:**
  1. `shop.checkout.prepare` mints the order key **in DNode** from a session counter in shop state: `ORD-` + four-digit zero-padded sequence (`ORD-0001`…). The key matches the pinned pattern `^[A-Z0-9_-]{1,32}$`, so DNode can validate it with the only text pattern available besides digits. The key is minted on entering Review. A key not yet bound to an order is reused if the cart is edited, with its intent replaced. Once `shop.order.place` binds a key, it is consumed. Any later Review mints `seq+1`.
  2. Canonical intent = `{currency:"VND", lines:[{sku,qty,unit_price}] sorted by sku, total}`. `place(k,i)` behaves as follows:
     - Unbound: reserve all lines atomically, or refuse `OutOfStock` with no change.
     - Bound to the same i (structural `==`): return the existing order, with no reservation and no effect.
     - Bound to a different i: refuse `IntentConflict` with no change.
  3. Exactly **one payment instruction per order**: id = `<order key>-P1`, amount = intent.total. The order never gets a second instruction. After a definite decline, the customer may start a *new order* (new key, new reservation, new instruction).
  4. The recovery action is `payment.inquire{id}` with the **same** id. A reply of `unknown` leaves everything unchanged, and the action is offered again. Recovery never sends `payment.charge`.
  5. Submit, dispatch and apply run inside **one** `SessionStore.transaction`:
     - DNode `payment.submit` (ready→pending, emits `payment.charge`);
     - host `dispatch` → `simulatedBank`;
     - DNode `payment.apply`;
     - the record is written once at the end.
- **Purpose/obligations:** P-S, D-S1, S03, S05, S07.
- **Reason:** The key is minted before the first submit, so a double tap and a reload-resubmit carry the same key. Binding happens at place, so editing the cart before ordering never produces a spurious conflict. With one instruction per order, the order maps one-to-one to a payment occurrence. Inquiry-only recovery cannot create a charge. One transaction is used because the kit host writes localStorage only after `fn` returns. Splitting the work would leave a "pending without bank record" state, which inquiry cannot resolve. The simulator returns `unknown` both for "no record" and for "inquiry unavailable" (see gap G4).
- **Assumptions:** The host lock covers all contenders (A-S1). The simulator binding id→{amount,status} is immutable, as stated in SEMANTICS.md and observed in host.js. Clearing the session resets both the counter and the bank ledger, because they share one record, so keys never collide within a store.
- **Tradeoffs/alternatives:** A host-generated random UUID was rejected: deciding *when* a new occurrence begins is business meaning and belongs in DNode. Re-sending the same-id charge as recovery was rejected: it would bypass the "inquiry unavailable" test mode, because `simulatedBank` returns the stored status for a repeat charge outside `lost` mode. A real external bank would need a write-ahead pending record plus same-id resubmission. That is out of E1 scope (handoff item).
- **Responsibility:** DNode `shop.checkout.prepare`, `shop.order.place`, `shop.payment.submit`, `shop.payment.apply`, `shop.payment.reconcile`. Host `SessionStore.transaction`, `dispatch`, `simulatedBank`.
- **Acceptance:** S03 (same key/same intent → one ledger entry and one commit; changed intent → `IntentConflict` with canonical state unchanged). S05/S07 fault injection plus reload. Test-desk ledger inspection.
- **Revision:** r1 (this submission).

### C-S2 — Customer presentation, status distinction and recovery placement (resolves D-S4, D-S5)
- **Status/authority:** chosen under delegated D-S4/D-S5. Variation: **constrained**. Wording, colors and spacing may change if S01/S08 are re-observed, the status distinction still uses shape plus text plus color, and no checkout screen shows hashes or instruction ids.
- **Choice (concrete):**
  - **Layout:** a single column at both viewports, max content width 560 px, centered at 1280×800, 16 px side gutters at 390×844, 8 px spacing grid. Body text is 16/24 px and headings 22/28 px. The total amount is 28/34 px, weight 600. Buttons are full-width, min-height 48 px, radius 8 px. The system font stack is `system-ui, "Segoe UI", Roboto, "Noto Sans", sans-serif`, all of which include Vietnamese glyphs.
  - **Colors:** background `#FAF8F5`, text `#1C1B1A`, primary button `#1F4E79` with white text. Contrast target is ≥4.5:1, measured during implementation and not asserted here.
  - **Status card, shown first on the payment screen.** Each status has a 40×40 inline SVG icon, a heading, a body line, then the amount and order reference (`Order ORD-0007`):
    - `confirmed`: filled circle with a check mark, `#1E6B3A`, heading "Payment complete".
    - `declined`: octagon with a cross, `#A1281E`, heading "Payment declined". Body: "You were not charged for this order."
    - `unknown`: hourglass, `#7A4E00` on `#FFF4DC`, **dashed** 2 px border, heading "Checking your payment".
    - `pending` (in flight): same hourglass icon, button disabled with the label "Sending payment…".

    Shape, heading text and border style each distinguish the states without color.
  - **Next action:** one primary button directly under the status body. Its bottom edge must be ≤ 844 px at initial scroll on 390×844, so it is visible without scrolling. Labels:
    - ready: "Pay 240,000 VND", plus secondary "Cancel order";
    - unknown: "Check payment status";
    - confirmed: "Continue shopping";
    - declined: "Start a new order with these items".
  - **Uncertainty copy (English base):** "We haven't received the payment result for this order yet. Your items are being held for you, and we won't create another payment. You don't need to pay again." After a check that still returns unknown: "The payment system hasn't answered yet. Your items are still held. You can check again in a few minutes."
  - **Money:** DNode formats amounts as text. In the base UI, `240,000 VND`.
  - **Quantity entry:** a stepper only (− / +, 48×48 targets, maximum min(9, A)). There is no free-text quantity field in the customer UI.
  - **Diagnostics:** in a separate route `#/test-desk`, reached by a footer text link "Test desk". It shows simulator mode, ledger, instruction ids and root and runtime hashes. None of these appear in browse/cart/review/payment/receipt.
- **Purpose/obligations:** P-S, S01, S05, S07, S08, D-S4, D-S5.
- **Reason:** The amount and the status come first because S01/S08 test reading them. "Check" instead of "Retry" or "Pay again" avoids implying that a new charge is needed. The dashed border and hourglass mark the state as provisional without alarm. The copy states only facts the design guarantees (held reservation, no new instruction). It never says "not charged" while the outcome is unknown; in the S05 scenario the simulator *has* charged. DNode-side formatting removes browser ICU variation from a money observable.
- **Assumptions:** A-S2 (English base). Reviewers read English for the base build.
- **Tradeoffs:** A single column wastes desktop width but keeps one reading order at both viewports. Amber can read as a warning (revisited in S-C1). Stepper-only entry is slower for quantity 9, but q ≤ 9 caps the cost at 8 taps.
- **Responsibility:** proposed root `shop.view` (status → label/icon key, `shop.view.money`). Host renderer maps icon keys to SVG and lays out the page.
- **Acceptance:** S01/S08 human observation at both viewports, plus a grayscale 5-second recognition task (reviewer names paid/declined/checking from screenshots). A layout check confirms the action button is above the fold. Formatting oracle cases: 20000→`20,000 VND`, 240000→`240,000 VND`, 1710000→`1,710,000 VND`. The maximum order is 9×(50000+20000+120000) = 1,710,000.
- **Revision:** r1, superseded for the customer locale by r2 in the continuation.

### C-S3 — Supplier snapshot import contract in the shop
- **Status/authority:** chosen. Variation: **review-required** (U-S1 and U-S2 are open).
- **Choice:** The operator selects the **batch-published normalized snapshot** (JSON). The host passes both the raw UTF-8 text `t` and `JSON.parse(t)` = `ps`. DNode `shop.stock.import(state, t, ps)` checks the following, in order:
  1. Shape `ps : Products`, else InputShape fault (malformed, not a business refusal).
  2. `(== (encode ps) t)`, else refuse `NonCanonicalSnapshot`. This rejects host JSON coercions such as `3.0`, `1e2`, reordered keys or whitespace. `encode` is the same `json()` the batch CLI uses for export.
  3. `supplier.valid_products ps`, the shared pinned definition and not a reimplementation, else refuse `InvalidSnapshot`.
  4. `(== (sort_by ps "sku") ps)`, else refuse `NotCanonicalOrder`.
  5. **Provisional U-S2:** the SKU set equals the catalogue set {NOTEBOOK, PEN, TOTE}, else refuse `SkuSetMismatch` with each missing or extra SKU listed.
  6. For every SKU, `stock ≥ R`, else refuse `BelowReserved` listing every offending SKU with its H_new and R.

  On success, H := stock for every SKU in one state write, and R is untouched. On any refusal the state is canonically identical to before. **Provisional U-S1:** price and name are validated but **not applied**. The preview shows "Supplier price/name differs; not applied in E1". For example, the valid fixture's "Notebook, forest green" differs from the seed name "Notebook".

  Before confirmation the preview shows: SKU | H now | reserved R | H new | A new. It also shows the sentence: "QTY_ON_HAND is the number of physical unsold units, including units reserved for unpaid orders. It replaces on-hand stock; it is not added to it."
- **Purpose/obligations:** P-S, D-S2, S06; shared-meaning rule (COMMON).
- **Reason:** Re-checking the bytes binds the import to the exact pinned export encoding, so no host-side numeric coercion slips through. Using `supplier.valid_products` keeps one supplier meaning. Set equality avoids inventing semantics for absent SKUs. Treating an absent SKU as "0" would refuse or erase reservation-backing stock; treating it as "unchanged" would make a partial file look complete. Not applying price/name avoids silently re-pricing future orders on the strength of an unconfirmed reading of PRICE_VND.
- **Assumptions:** The batch export bytes are `json(rows)` with no trailing newline (observed). E1 has only the seed SKUs.
- **Tradeoffs:** Operators cannot add products or update prices in E1. `supplier.valid_products` returns only a Boolean and is not an individually certified entry (gap G6), so its refusals carry no record or field location. The UI directs the operator to the batch report for located errors. Accepting the raw CSV via `supplier.from_csv` instead would give located diagnostics from a certified entry; I keep that as an alternative needing review.
- **Responsibility:** DNode `shop.stock.import`, prelude/supplier imports. Host: file bytes, UTF-8 fatal decode, `JSON.parse`, single transaction.
- **Acceptance:** S06 (H_new<R rejected with byte-identical state). Fixture snapshot.json (sha `bdc6092c…441f`, produced below) → H=(5,8,2). Cases: `3.0` variant → NonCanonicalSnapshot; missing TOTE → SkuSetMismatch.
- **Revision:** r1.

### C-S4 — Root split and text-to-integer boundary
- **Status:** chosen. Variation: **fixed** for the root split (it determines evidence invalidation). Text boundary **constrained**.
- **Choice:**
  - Business behavior lives in root `shop.core`: cart, price, intent, reservation, order/payment transitions, import. Presentation helpers live in root `shop.view`: money text, status → label key, copy table. `shop.view` uses `shop.core`, never the reverse.
  - Text becomes Int only in `shop.core.parse_qty(s)`. It requires `matches s "^[0-9]+$"` (else refuse `InvalidInteger`) and `len s ≤ 2` (else refuse `QuantityOutOfRange`, which keeps the prelude's overflow fault out of reach). It then calls `text.parse_decimal_nat`, then `bounded.within q 1 9`.
  - Host code never calls `Number`, `parseInt` or `+s` on business values.
- **Reason:** Root identity binds its transitive closure (K06/K12). Changing copy (S-C1) then leaves the `shop.core` identity unchanged, so S02–S04/S06 evidence may be reused through an explicit match instead of being invalidated. Shape-before-pre (K07) is only meaningful if no host coercion happens upstream.
- **Acceptance:** S02 cases `"2"`→2, `" 2"`/`"+2"`/`"2.0"`/`"two"`→InvalidInteger, `"10"`→out of 1..9 refusal, `"02"`→2 (prelude accepts leading zeros; noted). Int 2 passed to a Text input → InputShape (observed on the prelude node below).

## Four-field transition definition — `shop.core.payment.apply(σ, k, reply)`

(Reserve is already specified in BP-SHOP. This is the transition that carries S03/S05/S06/S07.)

- **Domain:**
  - σ is shop state: `catalogue : list {sku,name,price,H,R}` sorted by sku, `orders : list Order`, `seq : Int`.
  - `k : Text` matching `^[A-Z0-9_-]{1,32}$`.
  - `reply ∈ enum{confirmed, declined, unknown}`.
  - `Order = {key, instr, intent{currency,lines[{sku,qty,unit_price}],total}, phase ∈ enum{ready,pending,unknown,confirmed,declined,cancelled}}`.
  - Business admissibility: k is bound in σ.orders.
- **Relationship:** Let o be the order bound to k, and for each line (s,q):
  - o.phase ∈ {pending, unknown} ∧ reply=confirmed → H_s−=q, R_s−=q, phase:=confirmed.
  - o.phase ∈ {pending, unknown} ∧ reply=declined → R_s−=q, phase:=declined.
  - o.phase ∈ {pending, unknown} ∧ reply=unknown → phase:=unknown, nothing else changes.
  - o.phase=confirmed ∧ reply=confirmed, or o.phase=declined ∧ reply=declined → σ'=σ (idempotent; no second consumption or release).

  Invariants after every return, for each SKU s:
  - 0 ≤ R_s ≤ H_s;
  - R_s = Σ q over lines of orders with phase ∈ {ready, pending, unknown}.

  Deterministic: one σ' for each (σ,k,reply).
- **Failures, in precedence order:**
  1. Shape fault (σ, k or reply malformed).
  2. Refuse `UnknownOrder` (k unbound).
  3. Refuse `NotSubmitted` (phase ∈ {ready, cancelled}).
  4. Fault `OutcomeContradiction` (terminal phase with the opposite definite reply). The simulator's immutable binding should make this impossible, so it signals corruption, and the test desk shows it.
  5. Invariant violation → ContractViolation fault.
  6. `-` overflow is impossible under the invariant but would still fault.

  No failure produces a partial σ'.
- **Execution semantics:**
  - Runs inside one `SessionStore.transaction` (Web Locks exclusive on the session key). The sequence is: read record → `payment.submit` (ready→pending, emit `payment.charge{id:o.instr, amount:o.intent.total}`) or `payment.reconcile` (pending/unknown → emit `payment.inquire{id:o.instr}`; terminal phase → no effect and σ unchanged) → `dispatch` validates the grant and payload of the full batch and again per effect → `simulatedBank` → `payment.apply` → strict result, post and invariant checks → single `localStorage.setItem`.
  - Any Refuse or Fault aborts before the write.
  - Limit: the simulated ledger is in the same record, so an abort also discards a simulated charge (gap G3). A timeout or `unknown` is never treated as a decline.
  - Concurrent recovery presses serialize on the lock. The second press sees the terminal phase and emits nothing.

## Obligation mapping

All responsibilities are **proposed**. No artifact exists. Evidence status: **pending** for every row.

| ID | Responsibility / artifact (proposed) | Evidence method | Actual result | Limitations |
|---|---|---|---|---|
| S01 | `shop.view` + host renderer; C-S2 layout and copy | Observe first-time users completing an order without coaching and reading the total and status, at 390×844 and 1280×800 | pending | Phase A cannot observe humans; the device and browser must be recorded |
| S02 | `shop.core` cart, `price.total` (via `sequence.sum_exact`), `parse_qty`, `checkout.prepare` | Independent oracle cases (e.g. NOTEBOOK×2+PEN×1+TOTE×1 = 240,000), shape-vs-refusal cases, generated cases on public entries | pending (prelude probes observed, below) | Generated evidence is finite |
| S03 | `order.place` binding plus C-S1 single instruction; host simulator | Same key ×2 → one ledger entry, one commit; changed intent → IntentConflict and unchanged canonical state | pending | Ledger is simulator-only |
| S04 | `order.place` precondition plus host `SessionStore.transaction` | Two concurrent `place` calls for the last unit in two tabs or contexts on one origin; also a negative control without the lock that must expose the race | pending | Browser-only (no `navigator.locks` in Node); single origin |
| S05 | `payment.submit/apply/reconcile`; simulator mode `lost` | Fault injection → unknown screen, R retained → reconcile → confirmed; ledger count stays 1 | pending | Mode `unavailable` also tested |
| S06 | `payment.apply` (declined), `stock.import` | Decline releases R once; repeated apply is a no-op; H_new<R import → refusal, state bytes identical | pending | — |
| S07 | Host reload plus persisted σ; `shop.view` unknown state | Inject lost reply, reload, assert same key, instruction and reservation, and that the recovery button is shown | pending | Reload-durable only; no power-loss claim |
| S08 | C-S2 status distinction | Human recognition of paid/declined/unknown (including in grayscale) with total and next action visible at 390×844 | pending | Human judgment required |

## Challenge answers

**S-T1.** After import, **H=3, R=1, A=2**. The snapshot reports physical unsold units *including* the reserved unit (D-S2), so it replaces H and leaves R untouched. Import is allowed because 3 ≥ R=1.
- Counterexamples: reading it as a delta would give H=5 (A=4); reading it as net available would give H=4 (A=3). Both are wrong here.
- If the open order later confirms: (3,1) → (2,0), A=2. If it is declined: (3,0), A=3.
- Had the snapshot said 0, the whole file would be refused `BelowReserved` with the state unchanged. Clamping R is never allowed.

**S-T2.** Accept-with-lost-reply: the simulator records `ORD-k-P1` → {amount, confirmed} and returns `unknown`. The order is `unknown`; H and R are unchanged, R still includes q; A excludes q.
- Reload restores the same key, instruction and reservation from the session record (S07).
- The only permitted payment identity is the existing `ORD-k-P1`. No new instruction is minted, and no `payment.charge` is re-sent.
- Press 1: `payment.inquire{ORD-k-P1}` → `confirmed` → commit (H−q, R−q) exactly once; receipt shown.
- Press 2 (serialized by the lock): the order is terminal, so no effect, no stock change, and the receipt stays.
- If inquiry is unavailable, both presses return `unknown`, nothing changes, and the reservation stays held.
- Ledger: exactly one entry. Stock consumed: exactly q, once, and only on a confirmed outcome.
- Predicted, not executed.

**S-T3.**
- *Same key, different amount* is a client or protocol error. `order.place` compares the canonical intent bound to the key and refuses `IntentConflict` before any reservation or effect, with σ unchanged. The simulator's own amount check (`IntentConflict` fault) is defense in depth, not the primary guard: it compares only the amount.
- *Deliberate second identical purchase* is a new business occurrence. The customer starts a new order after the first key is bound, so `checkout.prepare` mints `ORD-(k+1)`. That order gets a new reservation (needing A ≥ q) and a new instruction `ORD-(k+1)-P1`, so two legitimate charges result.
- Equal payloads (same lines and amount) do not merge them. Identity does.

**S-T4.**
- Correctness is enforced by the host atomic boundary: `navigator.locks.request` serializes read→check→write of the single localStorage record. The DNode precondition q ≤ A is evaluated *inside* that critical section, and all lines are reserved or none.
- The second contender reads A=0 and refuses `OutOfStock`.
- DNode syntax alone does not prevent the race. Pure nodes only see the state they are given.
- A sequential sold-out screen test does **not** establish this. It shows the precondition works when calls never overlap.
- S04 needs overlapping transactions at the state boundary (two tabs or contexts on one origin started together, repeated), plus a negative control where the read-await-write runs without the lock, to show the test can detect a race.
- Scope: one origin in one browser profile. Not across devices or browsers.

**S-T5.** No. It is not a stock refusal. Text `"2"` at an `Int` input is malformed input: an **InputShape fault** raised before any precondition or business check (K07). Observed: `text.parse_decimal_nat [2]` → `InputShape`, the reverse direction of the same rule. Text may become an integer only in the declared DNode boundary node `shop.core.parse_qty` → `text.parse_decimal_nat`, followed by the 1–9 range check. Host code and stored-state loading must not coerce. Corrupted stored state faults and is offered "Reset test session" in the test desk.

**S-C1.** See the continuation amendment. The exact Vietnamese uncertainty message is:

> **Đang xác nhận thanh toán**
> Chúng tôi chưa nhận được kết quả thanh toán cho đơn hàng này. Các sản phẩm trong đơn vẫn đang được giữ cho bạn và chúng tôi sẽ không tạo thêm khoản thanh toán nào. Bạn không cần thanh toán lại.

Gloss: "**Confirming your payment.** We have not yet received the payment result for this order. The items in your order are still being held for you, and we will not create any additional payment. You do not need to pay again."

Recovery label: **"Kiểm tra lại thanh toán"** ("Check the payment again").

## Continuation amendment (S-C1: Vietnamese customer UI, more reassuring uncertainty)

**Changed records:**
- **C-S2 r2.** Revises D-S4 and D-S5 values within constrained variation.
  - Customer UI language is Vietnamese (`<html lang="vi">`).
  - Money format is `240.000 ₫` (dot grouping, NBSP, ₫ suffix), produced by `shop.view.money`. Oracle cases: 20000→`20.000 ₫`, 1710000→`1.710.000 ₫`.
  - Labels:
    - Pay: "Thanh toán 240.000 ₫". Cancel: "Hủy đơn". Place order: "Đặt hàng". Review: "Xem lại đơn hàng". Total: "Tổng cộng". Sold out: "Hết hàng". Order reference: "Mã đơn ORD-0007".
    - Pending: "Đang gửi thanh toán…".
    - Confirmed: "Đã thanh toán" (Paid).
    - Declined: "Thanh toán bị từ chối" + "Bạn không bị trừ tiền cho đơn này." (You were not charged for this order.)
    - After decline: "Đặt đơn mới với các sản phẩm này" (Start a new order with these items).
    - Continue: "Tiếp tục mua sắm".
  - Uncertainty message and recovery label: as quoted under S-C1 above.
  - Still unknown after a check: "Hệ thống thanh toán chưa phản hồi. Các sản phẩm vẫn đang được giữ cho bạn. Bạn có thể kiểm tra lại sau vài phút." ("The payment system has not responded yet. The items are still being held for you. You can check again in a few minutes.")
  - Reassurance styling: the unknown card changes from amber to calm slate (`#33547A` on `#EEF3F8`). The hourglass icon and **dashed** border are kept, so the non-color distinction is unchanged. Unknown must never use the confirmed green or the check icon.
  - The test desk may remain English. It is not customer UI.
- **Product names** stay as catalogue data (Notebook, Pen, Tote bag). NAME comes from the shared supplier record and is preserved. A Vietnamese display name is new open item U-S4; it should be supplied as data, not invented in a host table.

**Preserved (must not change):**
- The five payment states and their meaning.
- `unknown` is never shown as success or as "not charged". Forbidden counterexample copy: "Đừng lo, bạn chưa bị trừ tiền" ("Don't worry, you haven't been charged"), which is false in S05.
- The reservation is held while the outcome is uncertain. No new instruction. Recovery = inquiry with the same instruction. No "Pay again" or "Thử lại thanh toán" action.
- Amounts are the exact integers. The order key and instruction are unchanged.
- No hashes in checkout.
- Every claim in the copy is guaranteed by C-S1 (held items, no additional payment). No timing promise beyond "you can check again".
- No automatic background polling is added. That would change effect timing and needs its own decision record.
- The `shop.core` root is untouched.

**Impact:**
- Only `shop.view` copy, format and color tokens and the host stylesheet change. The `shop.core` identity is unchanged (C-S4), so S02/S03/S04/S06 evidence may be reused through an explicit identity match.
- `shop.view` gets a new identity, which invalidates all presentation evidence.

**Evidence to rerun:**
- S01 and S08 with Vietnamese-reading first-time users at both viewports, including grayscale status recognition.
- The UI parts of S05 and S07 (lost reply → Vietnamese uncertainty card → reload → "Kiểm tra lại thanh toán" → receipt).
- Money-format oracle cases.
- A 390 px layout check that the longest Vietnamese strings wrap without truncation or horizontal scroll, and the action stays above the fold.
- A diacritic rendering check on the recorded browser.

## Handoff to the next model

- **Settled (preserve):**
  - Inherited fixed: D-S1, D-S2, D-S3, the BP-SHOP domain policies, S01–S08.
  - My review-required decisions: C-S1 (DNode-minted `ORD-nnnn` key bound at place, one `-P1` instruction per order, inquiry-only recovery, single-transaction submit/dispatch/apply); C-S3 (canonical-bytes import via `encode`, `supplier.valid_products`, SKU-set equality, apply H only, `BelowReserved` refusal).
  - Fixed: C-S4 (`shop.core` / `shop.view` split, text→Int only via `parse_qty`).
  - Constrained: C-S2 r2 (Vietnamese UI, values above).
- **Freedoms:**
  - Spacing, colors and wording within C-S2's constraint (shape + text + color distinction; facts-only uncertainty copy; action above the fold at 390×844).
  - Internal node decomposition.
  - Test-desk design.
  - Changing C-S1/C-S3 requires a revision record and the S03–S07 reruns.
- **Dependencies:** kit `141331a5…` (runtime `fd854bcb…`), prelude `8e199f27…`, supplier `0c35544e…`, browser profile `cda00518…`, host.js `4ef32562…`. `matches` allows only `^[0-9]+$` and `^[A-Z0-9_-]{1,32}$`. `map`/`fold`/`filter` need literal node names. No recursion and no floats.
- **Assumptions:** A-S1 (single-origin lock scope), A-S2 (English base, now replaced by Vietnamese), immutable simulator binding, and the batch export bytes = `json(rows)`.
- **Open questions:** U-S1 (does PRICE_VND/NAME set retail data?), U-S2 (SKU-set mismatch semantics), U-S3 (resolving an indefinitely unknown payment without a time-based release), U-S4 (Vietnamese product names), and the gaps G1–G10 below.
- **Next action (Phase B):**
  1. Run `node tools/run.mjs verify` and `npm test`.
  2. Write `shop.core.node` with inline `ex` cases for the S-T1…S-T5 values. `check` it, then `run-file` the transitions.
  3. Write `shop.view.node`.
  4. Write the host page using `SessionStore`, `dispatch` and `simulatedBank` from host.js unchanged.
  5. Build the browser S04 contention test and the S05/S07 fault+reload scripts.
  6. Schedule human sessions for S01/S08.

**Distribution gaps found (smallest reproducer in brackets):**
- **G1:** No payment-scenario or seed-catalogue fixtures ship, although kit BLUEPRINTS §7 lists them. Only the two CSV fixtures exist. [`ls dist/fixtures`]
- **G2:** `SessionStore` requires `navigator.locks`. There is no Node harness, so S04 can only run in a browser. A test-only lock shim would not be the real boundary. [host.js `transaction`: `if(!navigator.locks) throw HostUnsupported`]
- **G3:** The simulator ledger `store.bank` lives in the same transaction record, so an abort after dispatch erases the simulated charge. "Charged externally, app write failed" cannot be simulated. The mode is global, not per instruction.
- **G4:** `payment.inquire` returns `unknown` both for "no record" and for "unavailable", so they cannot be told apart. [host.js `simulatedBank` inquire branch]
- **G5:** The simulator conflict check covers only `amount` (payload `{id, amount}`). Currency and lines are not part of the bank intent, so DNode must own intent comparison.
- **G6:** `supplier.valid_products` (needed to import normalized JSON) returns only a Boolean, has 0 inline cases and no generated campaign, and is not an attested public entry. Only `supplier.validate` and `supplier.from_csv` are attested. [supplier.certificate.json `publicEntries`]
- **G7:** The published snapshot file carries no run id or ok flag. After a rejected batch run, the previous `snapshot.json` remains beside the new rejected report (observed below), so the shop cannot tell a stale file from a current one and can only revalidate.
- **G8:** `text.parse_decimal_nat` faults with `ArithmeticOverflow` on an oversized digit string (observed). A shop text boundary must pre-limit length to keep it a refusal.
- **G9:** There is no monotonic id or nonce native, so the key comes from a DNode-managed counter in state (handled by C-S1, no blocker).
- **G10:** The kit is spec 201020261730 while the structure is 211020261208. The E2 decision records are not parsed or enforced by the runtime. The trust key is self-supplied.

## Evidence and release status

**No new implementation was made. No application code was written, compiled or checked.** All challenge answers and acceptance outcomes above are **predictions**. Human acceptance: **none observed, pending**.

Commands actually run (Node v22.22.0), from `blind-shop/kit/dnode-e1-kit/` after `unzip ../package/dnode-e1-kit.zip` into `blind-shop/kit/`:

```
$ sha256sum package/* candidate.zip     → all 10 MANIFEST digests match (values in header)
$ node tools/run.mjs verify
VERIFIED DNode-E1-author-kit trust fingerprint 4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244   (exit 0)
$ npm test
Verified pinned package and 1280 independently expected public generated cases. This does not certify your application.   (exit 0)
$ node tools/run.mjs batch dist/fixtures/supplier-valid.csv <blind-shop>/out/snapshot.json
Published 3 records to …/out/snapshot.json   (exit 0)
  snapshot.json = [{"name":"Notebook, forest green","price":50000,"sku":"NOTEBOOK","stock":5},{"name":"Pen","price":20000,"sku":"PEN","stock":8},{"name":"Tote bag","price":120000,"sku":"TOTE","stock":2}]
  sha256 bdc6092ceb99a6ee5b8d6d8329e1542b7a778b54810c55deda346fa5cc6e441f
$ node tools/run.mjs batch dist/fixtures/supplier-invalid.csv <blind-shop>/out/snapshot.json
Rejected: no new snapshot published. Any previous destination is unchanged; see …/snapshot.json.report.json   (exit 2)
  report errors: rec1 SKU duplicate; rec2 QTY_ON_HAND; rec2 SKU duplicate; rec3 SKU pattern; rec3 PRICE_VND; rec4 PRICE_VND; previous snapshot.json still present (G7)
$ node tools/run.mjs call text.parse_decimal_nat '["2"]'                → {"effects":[],"out":2}
$ node tools/run.mjs call text.parse_decimal_nat '[2]'                  → InputShape InputShape: text.parse_decimal_nat (exit 1)
$ node tools/run.mjs call text.parse_decimal_nat '[" 2"]'               → InvalidInteger InvalidInteger (exit 1)
$ node tools/run.mjs call text.parse_decimal_nat '["9007199254740992"]' → ArithmeticOverflow ArithmeticOverflow (exit 1)
$ node tools/run.mjs call sequence.sum_exact '[[100000,20000,120000]]'  → {"effects":[],"out":240000}
$ node tools/run.mjs call supplier.valid_products '[[{"sku":"PEN","name":"Pen","price":20000,"stock":3}]]'   → {"effects":[],"out":true}
$ node tools/run.mjs call supplier.valid_products '[[{"sku":"PEN","name":"Pen","price":20000,"stock":"3"}]]' → InputShape InputShape: supplier.valid_products (exit 1)
$ node tools/run.mjs call supplier.valid_products '[[]]'                → {"effects":[],"out":false}
```

These probes exercise only shipped kit roots under the batch profile, which is what `run.mjs call` uses. They support the distribution facts cited above. They are not evidence for any shop obligation. No first failures or repairs, because nothing was implemented. Kit files were not modified.
