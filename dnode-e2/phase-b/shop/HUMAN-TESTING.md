# Human testing: S01 and S08 (pending)

No human session has been run. Automated drives checked only the observable facts: amounts, statuses, and that the status, total and next action sit above the fold at 390×844. **This is not human acceptance.**

## Who and where

- **Participants:** at least 3 first-time users who read Vietnamese and have not seen this shop or its design records. Nobody who built or reviewed it.
- **Devices:**
  - one real phone, or a desktop browser in device mode at **390×844** CSS px;
  - one desktop browser window at **1280×800** CSS px.
- **Record the actual environment:** device model, OS, browser and version, zoom and font-size settings.
- **Setup:** start the shop with `node serve.mjs`. On a phone on the same network, use a tunnel or a host that provides HTTPS or localhost; Web Locks need a secure context. Open `http://127.0.0.1:8101/`. Before each participant:
  1. the facilitator opens **Test desk → Reset test session**;
  2. the facilitator sets the simulator mode for the task (below);
  3. the facilitator returns to the shop home page.

  Participants do not see or use the test desk.
- **Coaching:** none. Read the task card aloud once, then only say "please continue as you think best". If the participant is stuck for 2 minutes, record "blocked" and the screen, then move on.

## Task cards (read in Vietnamese; English gloss for the facilitator)

**T1 — S01 normal order** (mode: `accept`)
> "Bạn muốn mua 2 cuốn Notebook và 1 cây Pen. Hãy đặt hàng và thanh toán. Khi xong, hãy cho tôi biết bạn đã trả bao nhiêu tiền và đơn hàng đã được thanh toán chưa."
> (Buy 2 Notebooks and 1 Pen; order and pay; then tell me how much you paid and whether the order is paid.)
>
> Expected answer: 120.000 ₫, paid ("Đã thanh toán").

**T2 — S08 declined** (facilitator sets mode `decline` before the participant pays)
> "Hãy mua 1 Tote bag và thanh toán. Cho tôi biết chuyện gì đã xảy ra, bạn có bị trừ tiền không, và bạn sẽ làm gì tiếp theo."
>
> Expected answer: declined, not charged, the next action is "Đặt đơn mới với các sản phẩm này" or continue shopping.

**T3 — S08 unknown and recovery** (mode `lost` before paying; after the participant has read the result, switch to `accept`)
> "Hãy mua 1 Pen và thanh toán. Cho tôi biết trạng thái thanh toán hiện tại, bạn có nên thanh toán lại không, và bạn sẽ làm gì."
>
> Expected answer: not yet known; do not pay again; press "Kiểm tra lại thanh toán". After recovery: paid.
>
> Variant: the facilitator reloads the page before the participant presses check. Note whether the participant still finds the recovery action.

**T4 — S08 grayscale recognition (5 seconds each)**
Show `evidence/shots/gray-confirmed-390.png`, `gray-declined-390.png` and `gray-unknown-390.png` in random order, 5 seconds each. Ask: "Đơn này đã thanh toán, bị từ chối, hay chưa rõ?" (paid, declined or not yet known?).

Repeat T1–T3 at both viewports, or split participants across viewports, and record which.

## What to record per participant and task

Use one row per task in `evidence/human-sessions.csv`. Create it; it does not exist yet. Columns:

`date, facilitator, participant_id, device, os, browser_version, viewport, task, mode, completed (yes/no/blocked), time_seconds, stated_amount, stated_status, correct_amount (y/n), correct_status (y/n), said_would_pay_again (y/n), found_recovery_action (y/n), needed_scroll_to_see_total_or_action (y/n), confusion_points, quotes_vi, quotes_en, frustration_1to5, trust_1to5`

Also keep:

- a screenshot of any confusing screen;
- the facilitator's free-text notes;
- the test desk's charge ledger after each task (it shows how many charges happened).

## Pass rules (fixed before testing)

- **S01:** T1 is completed without coaching, and the stated amount and status are correct.
- **S08:** in T2/T3/T4, paid, declined and unknown are correctly distinguished (including in grayscale). The total and the next action are found on the 390×844 viewport without scrolling. Nobody says they would pay again while the status is unknown.

Report each participant separately. Do not average a failed payment-status reading away. Until these rows exist and have been reviewed, S01 and S08 stay **pending**.
