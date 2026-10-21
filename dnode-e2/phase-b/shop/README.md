# BP-SHOP — small stationery shop (DNode E2.1, Phase B)

A Vietnamese-language customer shop (browse → cart → review → order → payment status → receipt or recovery) and an English test desk (supplier stock import, payment simulator, ledger, identities, session reset). The business behaviour lives in two DNode roots run by the frozen E1 author kit; the page script only admits the kit, renders, captures input, persists the session record and dispatches effects to the kit's simulator.

## Launch

Requirements: Node.js 22+. There are no npm dependencies. The frozen kit must sit at `../kit/dnode-e1-kit` relative to this folder.

```
node serve.mjs            # PORT=… to change the default port, 8101
```

Then open **http://127.0.0.1:8101/**. Use `127.0.0.1` or `localhost`: Web Locks need a secure context. The server maps `/` to this folder and `/kit/` to `../kit/dnode-e1-kit/dist/`.

Before anything runs, the page:

1. checks the kit trust-key fingerprint (`4c7716c7…0244`, the in-kit value, so the check is self-referential);
2. runs `verifyBundle` over the whole kit;
3. checks both shop roots against `app-lock.json`.

If any of these fails, it shows "Không thể mở cửa hàng" and runs nothing.

The **Test desk** link in the footer (`#/test-desk`) holds everything diagnostic:

- simulator mode: accept, decline, lost, unavailable;
- the charge ledger;
- H/R/A inventory and the orders table;
- supplier CSV import with preview and confirmation;
- kit and app identities;
- the raw session record;
- "Reset test session".

## Files

| Path | Role |
|---|---|
| `shop.core.node` | Business root: cart, prices and intent, order keys, reservation, payment transitions, supplier import compatibility. Uses `prelude`, `supplier`. |
| `shop.view.node` | Presentation root: Vietnamese customer screens as generic blocks, money format, refusal messages, English test-desk tables. Uses `shop.core`. |
| `app.js`, `index.html` | Host: admission, generic block renderer, input, `SessionStore`/`dispatch`/`simulatedBank` from the kit's `host.js` (unchanged), file bytes. |
| `app-lock.json` | SHA-256 of the two roots (regenerate with `node tests/lock.mjs` after editing them). |
| `serve.mjs` | Static server, no dependencies. |
| `fixtures/` | Extra supplier CSVs for the import tests. |
| `tests/` | Node harness, Python oracle, mutation check, Playwright drives, `run-all.sh`. |
| `evidence/` | Machine results (`*.json`), `commands.log`, screenshots in `shots/`. |
| `PHASE_B_BP-SHOP.md` | The submission. |
| `HUMAN-TESTING.md` | S01/S08 human sessions (pending). |

## Re-running the checks

```
sh tests/run-all.sh       # starts its own server; about 10 minutes, mostly the S04 race (RACE_N=30 per arm)
```

Individual steps are listed in `evidence/commands.log`. The browser drives need Playwright with Chromium at `/opt/pw-browsers` (`NODE_PATH` must point at a global `playwright`). Never run `playwright install`.

These checks are structural, example, oracle and drive evidence. They are not certification and not human acceptance.
