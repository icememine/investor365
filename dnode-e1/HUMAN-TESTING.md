# Human testing — the three E1 applications

Open each page on a phone or a desktop browser. Nothing is installed; everything runs in the page. Each page re-verifies its certificates and the native lock before it runs; the Test desk / admission panel says "admitted".

The computational gates have already run (docs/RECORD-*.md). What only you can record is the experience: S01, S08, G01, G06, B06. Note what confused or annoyed you, not only pass/fail.

## BP-SHOP — Pencil & Paper (host/shop.html)

1. Shop tab. Add a Notebook and a Pen. Review order. Place order. Pay. You should be able to say what you ordered, what it cost (70.000 ₫) and that it is paid, without reading anything else.
2. Test desk → Payment simulator → "is accepted but the reply is lost". Shop tab: add something, review, place, pay. You should see that the shop does not know, that your items are held, and that nothing more will be charged. Reload the page: the same order and the recovery button should be there. Press "Check payment status" — the order becomes Paid and the ledger in the Test desk still shows one charge for it.
3. Simulator → "is declined". Pay an order: Declined, nothing charged, items released (stock table in the Test desk shows R back to 0).
4. Test desk → fixture `supplier_below_reserved` → Validate: rejected because the supplier reports fewer units than customers hold; nothing changes. Fixture `supplier_ok` → Validate → read the availability changes → Confirm import.
5. "Deliver the last instruction again" after a Pay: refused with a readable message; the ledger does not grow.

## BP-GAME — Breakout (host/breakout.html)

1. Press Launch (or tap the field). Move with arrows, A/D, the ◀ ▶ buttons, or drag on the field. Does it respond the way you expect? Is the ball readable? Is a lost ball fair?
2. P (or Pause) mid-flight, wait a while, resume: the ball continues from where it was, no jump.
3. Lose three balls: each loss waits for you to launch again. Clear a few bricks: score counts removed bricks.
4. Test desk → "Replay the trace from initial()": the final state must read IDENTICAL. "Make the next draw throw": the game goes on.

## BP-BATCH — Supplier snapshot transformer (host/batch_transform.html)

1. Click a fixture (`f07_bad_numbers`) → Validate and transform. Each rejected record is named with its text, the field, the problem and what to do. Edit the text in place, run again, see it accepted.
2. Published exports: the report (always) and the normalised snapshot (only when accepted), with sizes and hashes, plus run.json carrying the run ID and the timestamp. In the hosted page use Copy (downloads are not permitted by the artifact viewer); opened locally, Download works.
3. Test desk → "Run twice, compare export bytes": identical. "Interrupt the next publish" then run: nothing is published. "Try a 1.1 MiB input": stopped before parsing.

## Recording

For each obligation that needs a human (S01, S08, G01, G06, B06): reviewer name, date, device/viewport, pass/fail, and the reasons. Put them in docs/acceptance.json as `{"id": "G06", "reviewer": "…", "at": "…", "device": "…", "result": "passed|failed", "notes": "…"}`; docs/records.js can then be extended to read them. Until then every record says "human acceptance pending".
