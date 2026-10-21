#!/bin/sh
# Re-runs every public check and app acceptance drive, logging commands and outputs.
# Usage (from P/shop): sh tests/run-all.sh   (starts and stops its own server on PORT, default 8101)
cd "$(dirname "$0")/.." || exit 1
LOG=evidence/commands.log
PORT=${PORT:-8101}
: > $LOG
run() { echo "\$ $*" | tee -a $LOG; sh -c "$*" 2>&1 | tee -a $LOG; echo "(exit status: see above; recorded $(date -u +%FT%TZ))" >> $LOG; echo >> $LOG; }
echo "# BP-SHOP Phase B command log — $(date -u +%FT%TZ) — $(node --version), $(python3 --version)" >> $LOG
run "cd ../kit/dnode-e1-kit && node tools/run.mjs verify; echo exit=\$?"
run "cd ../kit/dnode-e1-kit && npm test --silent; echo exit=\$?"
run "cd ../kit/dnode-e1-kit && node tools/run.mjs check ../../shop/shop.core.node; echo exit=\$?"
run "cd ../kit/dnode-e1-kit && node tools/run.mjs check ../../shop/shop.view.node; echo exit=\$?"
run "node tests/lock.mjs; echo exit=\$?"
run "node tests/examples.mjs; echo exit=\$?"
run "python3 -I tests/oracle.py > evidence/oracle-cases.json; echo exit=\$?; sha256sum evidence/oracle-cases.json"
run "node tests/compare.mjs; echo exit=\$?"
run "node tests/s02.mjs; echo exit=\$?"
run "node tests/mutate.mjs; echo exit=\$?"
run "node tests/contrast.mjs; echo exit=\$?"
PORT=$PORT node serve.mjs > evidence/server.log 2>&1 &
SERVER=$!
sleep 1
run "BASE=http://127.0.0.1:$PORT/ RACE_N=${RACE_N:-30} node tests/drive.cjs admission journey s02 s03 s04 s05s07 s06 import timing; echo exit=\$?"
kill $SERVER
run "node tests/identities.mjs; echo exit=\$?"
