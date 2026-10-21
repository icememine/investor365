# DNode E1 — author handoff

This is an experimental executable distribution based on specification 201020261730. Node.js 22+ and Python 3 (reference tests only) are used for tooling. Applications are authored as `.node` text. There are no npm dependencies to install.

## First commands

Run commands from the extracted package directory:

```
node tools/run.mjs verify
npm test
node tools/run.mjs call bounded.clamp '[12,0,10]'
node tools/run.mjs batch dist/fixtures/supplier-valid.csv snapshot.json
npm run serve
```

Open http://127.0.0.1:8080 for the generic execution harness. Load an additional application `.node` file and invoke its nodes. Read `dist/generated/DICTIONARY.md`, `docs/BLUEPRINTS.md`, profiles and shared roots first. Use `node tools/run.mjs check your-app.node` for structural checking. That command is not certification. Browser effect intents are displayed by the generic harness; a real application host must validate and dispatch them through the supplied runtime/host interfaces.

## Task prompt — use identically for each model

Build the assigned application (shop, Breakout or batch) from the corresponding blueprint using this frozen DNode distribution. Runtime, shared roots, profiles and evidence are read-only. Add application roots and a presentation layer. DNode owns business/game/data-meaning decisions. Host code owns rendering, event capture and declared capability execution. Do not add primitives, silently change source grammar, weaken tests or implement missing application logic in a host function. Record the smallest reproducible distribution gap if blocked. Continue supported independent work. Submit runnable source, dependency identities, blueprint-to-node mapping, public test results, repair history and known limits. Mark human acceptance pending until a person actually evaluates it.

## What you receive

The common runtime, prelude and supplier snapshot root; typed browser/batch profiles; generic session transaction and simulator adapters; public generated cases; schema/semantic dictionary; blueprints; verifier and command-line runner. Reference shop/game solutions are excluded. Separate reference distribution is for the experiment owner; do not give it to authors during blind trials. The original designers have prior exposure and should be labeled accordingly.

## Trust and limits

The bundled trust key is a convenience bootstrap. Compare its fingerprint with the owner's separately supplied fingerprint, or set DNODE_TRUST_KEY to an independently retained public-key JSON. A key shipped beside code cannot establish its own trust. A changed runtime/root/profile/report causes verification failure. Application additions are not automatically certified by the release signature. The interpreter is not a sandbox for arbitrary hostile JavaScript; keep host code under review.

Runtime checks are strict on each call. E1 root attestations cover named public entries and their bound dependency closure under finite conformance/generated evidence. They are not a theorem, production certification, individual certification of every helper, or human acceptance. There is no statistical certification tier.

The local payment simulator and localStorage/Web Locks adapter are experiments on one browser origin. They are not multi-user server persistence or real banking. Browser Web Locks and modern Canvas/WebCrypto are required. HTTP serving is required for ES modules. The host tick policy is 60 Hz with at most five catch-up ticks; game policy details are in generated/SEMANTICS.md.

## Evaluation record

Record model/version/date, task, package fingerprint, tools, time/token budget, all attempts and interventions. For every obligation: implementing nodes/capabilities, test/evidence, passed/failed/pending. Keep subjective quality assessment separate from correctness gates. Do not average away double charging, arithmetic errors or unauthorized effects.


Trust-key fingerprint for this build: `4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244`
