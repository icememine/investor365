# DNode E2.1 — Phase A trial record

| Path | What it is |
| --- | --- |
| `inputs/DNODE_E2_BLUEPRINTS_AND_TRIAL.zip` | The E2 package as received (candidate.zip + reviewer files), unchanged. |
| `inputs/dnode.bundle` | DNode git history v0.1 → v0.4-e1-apps, unchanged (`git clone dnode.bundle`). |
| `phase-a/PHASE_A_BP-{SHOP,GAME,BATCH}.md` | Blind first responses from three fresh Claude sessions that saw only candidate.zip. Preserved unedited. |
| `phase-a/batch-probe/` | The batch participant's probe scripts and recorded outputs. |
| `KIT_EVIDENCE.md` | Executed checks against the enclosed author kit (findings F1–F8). |
| `REVIEW.md` | Comparison with Astra's trial under REVIEW_PROTOCOL.md, open owner decisions, gaps to fix before Phase B. |

The coordinating session read REVIEW_PROTOCOL.md before the runs and is therefore exposed; REVIEW.md is a first-pass AI review for a human reviewer to confirm. No application was built and no human acceptance was observed.

## Phase B

| Path | What it is |
| --- | --- |
| `phase-b/OWNER_RULINGS.md` | Decisions that resolved the Phase A open items. |
| `phase-b/PHASE_B_SUMMARY.md` | Status across all three apps, launch commands, gaps, and the human tests still needed. |
| `phase-b/kit/dnode-e1-kit/` | The frozen author kit, unchanged. |
| `phase-b/{shop,game,batch}/` | The three apps; each has `PHASE_B_BP-*.md`, `README.md`, `HUMAN-TESTING.md`, tests and evidence. |
| `phase-b/recheck/` | The coordinating session's independent re-run logs and the game visibility probe. |
