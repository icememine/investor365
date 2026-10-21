// BP-BATCH browser host, main thread: rendering, input capture, exports (R-B3). No acceptance logic:
// everything shown is derived from the worker's report (supplier.from_csv verdict + batch.node hints).
import { banner, duplicateGroups } from './lib/core.mjs';

const $ = id => document.getElementById(id);
const fileInput = $('file'), validateBtn = $('validate'), note = $('validate-note');
const resultEl = $('result'), progressEl = $('progress');
let worker, kitOk = false, identity = null, chosen = null, running = false, t0 = 0, timer = 0;
const history = [];

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : String(k));
  return el;
}

// Visible whitespace (display only): space ·, tab →, CR ␍, LF ␊. Long values are shortened for display.
function vis(s, max = 160) {
  if (s === '') return h('span', { class: 'empty' }, '(empty)');
  const chars = Array.from(s), shown = chars.slice(0, max);
  const out = h('span', { class: 'val' });
  let buf = '';
  const map = { ' ': ['·', 'space'], '\t': ['→', 'tab'], '\r': ['␍', 'carriage return'], '\n': ['␊', 'line feed'] };
  for (const c of shown) {
    if (map[c]) { if (buf) { out.append(buf); buf = ''; } out.append(h('span', { class: 'ws', title: map[c][1] }, map[c][0])); }
    else buf += c;
  }
  if (buf) out.append(buf);
  if (chars.length > max) out.append(h('span', { class: 'empty' }, ` … (+${chars.length - max} more characters)`));
  return out;
}
const nameCell = s => s.replace(/\r\n|\n|\r/g, ' ↵ ');

function startWorker() {
  kitOk = false; identity = null;
  setKit('pending', 'Verifying the DNode kit…');
  worker = new Worker('worker.js', { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'ready') { kitOk = true; identity = data.identity; setKit('ok', 'Kit verified · trust key ' + identity.trustFingerprint.slice(0, 8) + '…' + identity.trustFingerprint.slice(-4) + ' (bundled with the kit)'); renderIdentity(); }
    else if (data.type === 'refused') { setKit('bad', 'Kit refused — nothing will run. ' + data.message); stopProgress(); }
    else if (data.type === 'progress') showProgress(data);
    else if (data.type === 'readError') { stopProgress(); showReadError(data.message); }
    else if (data.type === 'done') { stopProgress(); showResult(data); }
    updateButtons();
  };
  worker.onerror = e => { setKit('bad', 'Kit refused — the worker could not start: ' + (e.message || 'error')); updateButtons(); };
}
function setKit(state, text) { const k = $('kit'); k.className = 'pill ' + state; k.textContent = text; }
function renderIdentity() {
  const dl = $('identity'); dl.replaceChildren();
  const t = identity.transformer;
  for (const [k, v] of [['Distribution', identity.distribution + ' · spec ' + identity.specification], ['Profile', identity.profile + ' · ' + t.profile],
    ['Runtime', t.runtime], ['Supplier root', t.supplier], ['App root batch.node', t.app], ['CSV native', identity.csvNative], ['Trust key', identity.trustFingerprint + ' (self-referential: shipped inside the kit)'],
    ['Publication', 'Browser: new files only, named with the run ID; never replaces a file.']])
    dl.append(h('dt', {}, k), h('dd', {}, v));
}
function updateButtons() {
  validateBtn.disabled = !(kitOk && chosen && !running);
  note.textContent = !kitOk ? 'Waiting for kit verification.' : !chosen ? 'Choose a file first.' : running ? 'Validating…' : 'Reads the file again each time you press it.';
}

fileInput.addEventListener('change', () => {
  chosen = fileInput.files[0] ?? null;
  $('fileinfo').textContent = chosen ? `${chosen.name} · ${chosen.size.toLocaleString('en-US')} bytes` : 'No file chosen.';
  if (resultEl.childElementCount) {
    resultEl.replaceChildren(h('p', { class: 'card muted' }, 'A different file was chosen, so the earlier result was cleared. Press Validate to check this file.'));
  }
  updateButtons();
});

validateBtn.addEventListener('click', () => {
  if (!chosen || running) return;
  running = true; updateButtons();
  resultEl.hidden = true; resultEl.replaceChildren();
  progressEl.hidden = false; $('bar').style.width = '2%'; $('progress-text').textContent = 'Reading the file…';
  t0 = performance.now(); clearInterval(timer);
  timer = setInterval(() => { $('elapsed').textContent = Math.round((performance.now() - t0) / 1000) + ' s'; }, 250);
  worker.postMessage({ type: 'run', file: chosen });
});

$('stop').addEventListener('click', () => {
  worker.terminate(); stopProgress();
  resultEl.hidden = false;
  resultEl.replaceChildren(h('div', { class: 'card' }, h('p', {}, h('b', {}, 'Stopped. '), 'No result was produced and nothing was exported. Validate again to restart.')));
  startWorker();
});

function stopProgress() { running = false; clearInterval(timer); progressEl.hidden = true; updateButtons(); }
function showProgress(p) {
  let text, frac = 0.02;
  const n = p.n.toLocaleString('en-US');
  if (p.hints > 0 && p.m > 0) { text = `Writing explanations: ${p.hints.toLocaleString('en-US')} of ${p.m.toLocaleString('en-US')}`; frac = 0.9 + 0.1 * p.hints / p.m; }
  else if (p.joins > 0 && p.n) { text = `Collecting problems: ${p.joins.toLocaleString('en-US')} of ${n} records`; frac = 0.5 + 0.4 * p.joins / p.n; }
  else if (p.k > 0 && p.n) { text = `Checking records: ${p.k.toLocaleString('en-US')} of ${n}`; frac = 0.1 + 0.4 * p.k / p.n; }
  else text = 'Reading CSV…';
  $('progress-text').textContent = text;
  $('bar').style.width = Math.min(100, Math.round(frac * 100)) + '%';
}
function showReadError(message) {
  resultEl.hidden = false;
  resultEl.replaceChildren(h('div', { class: 'card' }, h('p', {}, h('b', {}, 'The file could not be read. '),
    'If you edited and saved it after choosing it, choose it again with "Choose file…". Nothing was checked or exported.'), h('p', { class: 'muted' }, message)));
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
async function copy(text, btn) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; }
  catch { const ta = h('textarea', { class: 'visually-hidden' }); ta.value = text; document.body.append(ta); ta.select(); try { ok = document.execCommand('copy'); } catch {} ta.remove(); }
  const old = btn.textContent; btn.textContent = ok ? 'Copied' : 'Copy failed — use Download'; setTimeout(() => { btn.textContent = old; }, 1600);
}
function exportBox(fname, text, what) {
  return h('div', { class: 'export' }, h('div', { class: 'fname' }, fname), h('div', { class: 'muted' }, what),
    h('div', { class: 'row' }, h('button', { class: 'btn small', 'data-export': fname, onclick: () => download(fname, text) }, 'Download'),
      h('button', { class: 'btn small secondary', onclick: e => copy(text, e.currentTarget) }, 'Copy JSON')));
}

function showResult(d) {
  const r = d.report, b = banner(r), id12 = r.runId.slice(0, 12), c = r.counts;
  const icons = { accepted: '✓', records: '✕', file: '!', fault: '?' };
  const facts = [];
  if (b.kind === 'accepted') facts.push(`Snapshot file for this run: snapshot-${id12}.json (sha256 ${r.snapshot.sha256.slice(0, 12)}…).`);
  else facts.push('Any snapshot you downloaded earlier came from a different run; compare its run ID with the report.');
  const bannerEl = h('div', { class: 'banner ' + b.kind, role: 'status', 'data-kind': b.kind },
    h('div', { class: 'icon', 'aria-hidden': 'true' }, icons[b.kind]), h('p', { class: 'title', id: 'banner-text' }, b.text),
    h('ul', { class: 'facts' }, facts.map(f => h('li', {}, f))));
  const runline = h('p', { class: 'runline' }, `Run ${id12} · ${d.fileName} · ${r.input.bytes.toLocaleString('en-US')} bytes · input sha256 ${r.input.sha256.slice(0, 12)}… · ${(d.ms / 1000).toFixed(1)} s`);
  const parts = [bannerEl, runline];

  if (c) parts.push(h('dl', { class: 'counts', id: 'counts' },
    [['Records in file', c.dataRecords], ['Accepted records', c.acceptedRecords], ['Records with problems', c.recordsWithIssues], ['Problems', c.issues]]
      .map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v.toLocaleString('en-US'))))));

  if (b.kind === 'accepted') parts.push(previewCard(d.rows));
  if (b.kind === 'records') parts.push(recordsCard(d.issues));
  if (b.kind === 'file') parts.push(fileCard(r, d.issues));
  if (b.kind === 'fault') parts.push(h('div', { class: 'card' }, h('h2', {}, 'What happened'), h('p', {}, r.fault.detail),
    h('p', { class: 'muted' }, 'Keep the report file and give it to whoever maintains this tool. Your file was not judged.')));

  const exps = [];
  if (d.snapshotText !== null) exps.push(exportBox(`snapshot-${id12}.json`, d.snapshotText, `Normalized snapshot, ${r.snapshot.records} records, sorted by SKU. Import this into the shop.`));
  exps.push(exportBox(`report-${id12}.json`, d.reportText, `Report for run ${id12} (status: ${r.status}).`));
  parts.push(h('section', { class: 'card', 'aria-labelledby': 'exp-h' }, h('h2', { id: 'exp-h' }, 'Export'),
    d.snapshotText === null ? h('p', { class: 'muted' }, 'No snapshot file exists for this run. Only the report can be exported.') : null,
    h('div', { class: 'exports' }, exps),
    h('p', { class: 'muted' }, 'Each export is a new file named with this run\'s ID. Nothing on your computer is replaced.')));

  parts.push(h('details', { class: 'card' }, h('summary', {}, 'Run details'), h('dl', { class: 'ident' },
    [['Run ID', r.runId], ['Status', r.status], ['Input', `${d.fileName} · ${r.input.bytes} bytes · sha256 ${r.input.sha256}`],
      ['Snapshot', r.snapshot.published ? `sha256 ${r.snapshot.sha256} · ${r.snapshot.records} records` : 'none'],
      ['App root', r.transformer.app], ['Supplier root', r.transformer.supplier], ['Runtime', r.transformer.runtime], ['Profile', r.transformer.profile],
      ['Time (not in report)', `${d.ms} ms` + (d.operations !== null ? ` · ${d.operations.toLocaleString('en-US')} DNode operations` : '')]]
      .flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]))));

  resultEl.replaceChildren(...parts);
  resultEl.hidden = false;
  history.unshift({ time: new Date().toLocaleTimeString(), id12, status: r.status, kind: b.kind, file: d.fileName, n: c ? c.recordsWithIssues : null });
  $('history-card').hidden = false;
  $('history').replaceChildren(...history.map((x, i) => h('li', {}, `${x.time} · run ${x.id12} · ${x.kind === 'accepted' ? 'Accepted' : x.kind === 'fault' ? 'Tool fault' : 'Rejected'} · ${x.file}${i === 0 ? ' (shown above)' : ''}`)));
  bannerEl.scrollIntoView({ block: 'start', behavior: 'instant' });
}

function previewCard(rows) {
  const LIMIT = 200;
  const body = rows.slice(0, LIMIT).map(p => h('tr', {}, h('td', { 'data-label': 'SKU', class: 'sku' }, p.sku), h('td', { 'data-label': 'NAME' }, nameCell(p.name)), h('td', { class: 'n', 'data-label': 'PRICE_VND' }, String(p.price)), h('td', { class: 'n', 'data-label': 'QTY_ON_HAND (physical unsold, incl. reserved)' }, String(p.stock))));
  return h('section', { class: 'card', 'aria-labelledby': 'pv-h' }, h('h2', { id: 'pv-h' }, 'Preview (published order: by SKU)'),
    h('div', { class: 'tablebox' }, h('table', { class: 'preview' }, h('thead', {}, h('tr', {}, h('th', {}, 'SKU'), h('th', {}, 'NAME'), h('th', { class: 'n' }, 'PRICE_VND'), h('th', { class: 'n' }, 'QTY_ON_HAND (physical unsold, incl. reserved)'))), h('tbody', {}, body))),
    rows.length > LIMIT ? h('p', { class: 'muted' }, `Showing ${LIMIT} of ${rows.length.toLocaleString('en-US')} records. The export contains all of them.`) : null,
    h('p', { class: 'muted' }, 'Line breaks inside a NAME are shown as ↵; the data is not altered.'));
}

function issueTable(list) {
  return h('table', { class: 'issues' }, h('thead', {}, h('tr', {}, h('th', {}, 'Field'), h('th', {}, 'Value in your file'), h('th', {}, 'Problem and how to fix it'))),
    h('tbody', {}, list.map(i => h('tr', {}, h('td', { class: 'field', 'data-label': 'Field' }, i.field),
      h('td', { 'data-label': 'Value in your file' }, vis(i.value)),
      h('td', { 'data-label': 'Problem and how to fix it' }, h('b', { class: 'hint' }, i.hint), h('span', { class: 'msg' }, 'Rule: ' + i.message))))));
}

function recordsCard(issues) {
  const recs = new Map();
  for (const i of issues) { if (!recs.has(i.record)) recs.set(i.record, []); recs.get(i.record).push(i); }
  const ordered = [...recs].sort((a, b) => a[0] - b[0]);
  const perField = new Map();
  for (const [, list] of ordered) for (const f of new Set(list.map(i => i.field))) perField.set(f, (perField.get(f) ?? 0) + 1);
  const groups = duplicateGroups(issues);
  const container = h('div', { id: 'records' });
  let shown = 0;
  const PAGE = 100;
  const more = h('button', { class: 'btn small secondary more', onclick: () => renderMore() }, 'Show more records');
  function renderMore() {
    for (const [r, list] of ordered.slice(shown, shown + PAGE)) {
      container.append(h('article', { class: 'rec', 'data-record': r },
        h('h3', {}, `Record ${r} · spreadsheet row ${r + 1} · SKU `, list[0].sku === '' ? h('span', { class: 'empty' }, '(empty)') : vis(list[0].sku, 40)),
        issueTable(list)));
    }
    shown = Math.min(ordered.length, shown + PAGE);
    more.hidden = shown >= ordered.length;
    more.textContent = `Show more records (${(ordered.length - shown).toLocaleString('en-US')} left)`;
  }
  renderMore();
  return h('section', { class: 'card', 'aria-labelledby': 'fix-h' }, h('h2', { id: 'fix-h' }, 'What to fix'),
    h('p', { class: 'next' }, 'Correct these records in your spreadsheet or source file, save it as CSV UTF-8, then choose the corrected file and press Validate. Rows are numbered as in a spreadsheet whose first row is the header.'),
    h('ul', { class: 'chips', 'aria-label': 'Problems by field' }, [...perField].map(([f, n]) => h('li', {}, `${f} · ${n} record${n === 1 ? '' : 's'}`))),
    groups.length ? h('ul', { class: 'dups', 'aria-label': 'Duplicate SKUs' }, groups.map(g => h('li', {}, g.text))) : null,
    h('div', { class: 'row' }, h('label', { class: 'btn small secondary', for: 'file' }, 'Choose corrected file…')),
    h('div', { style: 'height:12px' }), container, more);
}

function fileCard(r, issues) {
  const i = issues[0];
  const msg = r.fileError ? r.fileError.message : i.hint;
  return h('section', { class: 'card', 'aria-labelledby': 'ff-h' }, h('h2', { id: 'ff-h' }, 'What to fix'),
    h('p', {}, h('b', {}, msg)),
    !r.fileError ? h('p', { class: 'muted' }, 'Rule: ' + i.message + (i.field === 'header' && i.value !== '' ? '' : '')) : null,
    !r.fileError && i.field === 'header' && i.value !== '' ? h('p', {}, 'First line in your file: ', vis(i.value)) : null,
    h('div', { class: 'row' }, h('label', { class: 'btn small secondary', for: 'file' }, 'Choose corrected file…')));
}

startWorker();
updateButtons();
