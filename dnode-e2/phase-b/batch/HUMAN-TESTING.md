# B06 human test: operator correction task (pending)

B06: *the operator can identify and correct a rejected record without verbal explanation and knows whether the output is usable.* Automated drives (`evidence/browser.json`) only show that the needed facts are on screen. They are not this test. Until a real person has done the task below, B06 stays **pending**.

## Participants and devices

- At least one operator who has not seen this tool or its code. Record whether they have edited CSV files or spreadsheets before.
- **Phone:** viewport 390×844 CSS px.
- **Desktop:** viewport 1280×800.
- For each device, record:
  - the actual device model, OS, browser and version;
  - the zoom level;
  - whether the viewport was exact (e.g. browser devtools device mode, or a real phone).
- Operator and facilitator must not use the same session for both devices without a break. Use a different input copy per device.

## Setup (facilitator)

1. `node serve.mjs` from `batch/`. Open `http://127.0.0.1:8103/` on the device. For a real phone, serve on a reachable address with a port forward. Record the method.
2. Give the operator `../kit/dnode-e1-kit/dist/fixtures/supplier-invalid.csv` (a copy) and a way to edit it: a spreadsheet app or a text editor. Record which.
3. Optionally, add one broken quote to the copy for the second device (e.g. change `Tote bag` to `"Tote bag`). This exercises the MalformedCSV path, which cannot report a location (gap G-1).
4. Say only: *"Turn this supplier file into a stock snapshot for the shop. Tell me when you are done and whether the result can be used."* Give no other explanation. Do not point at the screen.

## What to observe and record

Record per device in `evidence/human/B06-<device>-<date>.md`. Create the folder; one file per session.

| Item | Record |
|---|---|
| Time to first Validate | seconds |
| Did they read the meaning panel? | yes / no / partly; any question they asked about QTY_ON_HAND meaning |
| First result understood? | Operator's own words for what happened (quote) |
| Records identified | which record/field they located for each of the 4 records, and whether correct |
| Corrections made | what they changed (e.g. `notebook`→`NOTEBOOK`, `50.5`→?, duplicate PEN resolved how?) |
| Re-validation | did they choose the corrected file again? any "file could not be read" message? |
| Final status | Accepted / still rejected; number of rounds |
| Usability statement | Ask: *"Can the shop use what you have now? Which file?"* Record the answer. Did they name `snapshot-<run>.json` from the accepted run, and not an earlier report? |
| Old-vs-new confusion | Ask: *"Did the failed run change anything?"* Record the answer. |
| Errors, hesitations, help requested | every instance, with timestamp |
| Layout problems | anything clipped, overlapped or too small (phone especially) |
| Subjective | 1–5 confidence that the output is usable, and free comments |

Pass criteria, to be judged by the reviewer and recorded:

- the operator reaches Accepted for a correct file without verbal help;
- they correctly say whether the output is usable and which file;
- they correctly say that the failed runs changed nothing.

Corrections that change data meaning count as observations to discuss, not passes. For example: inventing a price for `50.5`, or deleting a duplicate row without asking which one is right.

## Where results go

- `evidence/human/B06-*.md`: one file per session, as above.
- Screenshots or screen recordings: `evidence/human/` (optional, with consent).
- Update the B06 row in `PHASE_B_BP-BATCH.md` with a link and an observed status. Never mark B06 passed from the automated drive.
