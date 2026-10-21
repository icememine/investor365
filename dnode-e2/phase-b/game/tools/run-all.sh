#!/bin/sh
# Re-runs every machine check for BP-GAME Phase B and writes evidence/commands.log.
# Requires: node 22, python3, Playwright + Chromium via NODE_PATH, and `node serve.mjs` running on :8102 for drives.
G=$(cd "$(dirname "$0")/.." && pwd)
K="$G/../kit/dnode-e1-kit"
LOG="$G/evidence/commands.log"
: > "$LOG"
run() { echo "\$ $*" >> "$LOG"; sh -c "$*" >> "$LOG" 2>&1; echo "[exit $?]" >> "$LOG"; echo >> "$LOG"; }
run "cd '$K' && node --version"
run "cd '$K' && node tools/run.mjs verify"
run "cd '$K' && npm test --silent"
run "cd '$K' && node tools/run.mjs call bounded.clamp '[5200,500,4300]'"
for r in geometry physics control game; do run "cd '$K' && node tools/run.mjs check ../../game/dnode/breakout.$r.node"; done
run "cd '$G' && node tools/check.mjs"
run "cd '$G' && node tests/scheduler.test.mjs"
run "cd '$G' && python3 -I oracle/make_cases.py oracle | tail -3"
run "cd '$G' && node tools/compare.mjs"
run "cd '$G' && node tests/mutants.mjs"
run "cd '$G' && node tools/timing.mjs evidence/tick-timing-node.json"
run "cd '$G' && rm -f evidence/traces/*.json && node drives/drive.cjs"
run "cd '$G' && node tools/replay-node.mjs evidence/traces/*.json"
run "cd '$G' && node tools/trace2cases.mjs oracle/browser-cases.json evidence/traces/*.json && python3 -I oracle/run_cases.py oracle/browser-cases.json oracle/browser-expected.json && node tools/compare.mjs oracle/browser-cases.json oracle/browser-expected.json evidence/oracle-compare-browser.json"
run "cd '$G' && node tools/manifest.mjs"
echo done >> "$LOG"
