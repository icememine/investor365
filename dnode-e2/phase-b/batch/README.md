# BP-BATCH — supplier snapshot transformer (DNode E2.1, Phase B)

Turns a legacy supplier CSV into a validated, normalized shop stock snapshot, or explains exactly which record and field to fix. The accept/reject decision comes only from the pinned shared definition `supplier.from_csv` in the frozen DNode E1 kit. This app's DNode root (`batch.node`) adds explanations, counts and the snapshot bytes. It never changes the verdict.

Requirements: Node.js 22+. No npm install. Python 3 only to regenerate the fixtures.

## Layout (relocatable)

```
<any>/kit/dnode-e1-kit/   frozen author kit (read-only), reached as ../kit/dnode-e1-kit
<any>/batch/              this directory
```

Both hosts verify the kit with `verifyBundle` plus the kit trust key before running anything. They refuse to run if verification fails. To supply an independently held key, set `DNODE_TRUST_KEY=/path/key.json`. Its fingerprint must equal the release attestation's and the one pinned in `lib/core.mjs`.

## Browser

```
node serve.mjs            # http://127.0.0.1:8103/   (--port N or PORT=N to change)
```

`serve.mjs` serves this directory at `/` and `../kit/dnode-e1-kit/dist/` at `/kit/`.

To use the page:

1. Choose a CSV.
2. Read the meaning panel.
3. Press **Validate**.

The DNode call runs in a Web Worker. Progress is shown and **Stop** cancels.

Exports are always new files named with the run ID: `snapshot-<12 hex>.json` and `report-<12 hex>.json`. Each has Download and Copy buttons. The browser never replaces a file.

## CLI

```
node batch-host.mjs <input.csv> <dest-dir-or-path>
node batch-host.mjs --verify <dest-dir-or-path>
```

- Destination: an existing directory, or a path ending in `/`, means `<dir>/snapshot.json`.
- Files written:
  - `<dest>`: the snapshot, written only when accepted.
  - `<dest>.report.json`: the report, written on every run.
  - `<dir>/batch-runs.log`: an append-only run log. Timestamps live only here.
- Order: byte limit, then strict UTF-8, then DNode. When accepted, the host writes the snapshot temp file and renames it, then writes the report temp file and renames it. When rejected or on a fault, it writes only the report and does not touch the snapshot.
- Exit codes: `0` accepted, `2` rejected (record or file level), `1` tool fault, kit refusal or publication failure.
- `--verify` checks the usability rule: the snapshot is "verified current" only if the report says `accepted` and its `snapshot.sha256` equals the file's digest. It exits `0` when verified and `2` when unverified.
- Test-only fault hook: `BATCH_HOST_FAULT=after-temp-write|between-renames` kills the process with SIGKILL at that point.

## Checks

```
node tests/check-node.mjs                     # batch.node examples under profiles/batch.json → evidence/node-check.json
python3 -I fixtures/make_fixtures.py          # regenerate fixture CSVs (deterministic)
python3 -I fixtures/oracle.py                 # independent expected results → fixtures/expected.json
node fixtures/run-fixtures.mjs [--slow]       # built pipeline vs oracle → evidence/fixtures.json
node tests/cli-b04-b05.mjs                    # B04 determinism, B05 interruption/limits, B-T5, kit refusal → evidence/b04.json, b05.json
NODE_PATH=/usr/local/lib/node_modules_global node tests/browser-drive.cjs   # Playwright 390×844 + 1280×800 → evidence/browser.json, evidence/shots/
node tests/gaps.mjs                           # distribution-gap reproducers → evidence/gaps.json
```

Kit public checks, run from `../kit/dnode-e1-kit`: `node tools/run.mjs verify`, `node tools/selftest.mjs`, and `node tools/run.mjs check ../../batch/batch.node`. The last one compiles under the *browser* profile only. Output is in `evidence/kit-public-checks.txt`.

None of these checks is certification or human acceptance. See `PHASE_B_BP-BATCH.md` for results and limits, and `HUMAN-TESTING.md` for the pending B06 operator task.
