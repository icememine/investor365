// WCAG 2.x contrast ratios for the C-S2 colour tokens as shipped in index.html. Measure, report.
import fs from 'node:fs';
import path from 'node:path';
import {SHOP} from './load.mjs';
const css = fs.readFileSync(path.join(SHOP, 'index.html'), 'utf8');
const tok = Object.fromEntries([...css.matchAll(/--([a-z-]+):(#[0-9A-Fa-f]{6})/g)].map(m => [m[1], m[2]]));
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
const pairs = [['ink', 'bg', 'body text'], ['ink', 'card', 'card text'], ['muted', 'bg', 'notes on page'], ['muted', 'card', 'notes in cards'], ['primary-ink', 'primary', 'primary button'],
  ['primary', 'card', 'secondary button / ready heading'], ['primary', 'bg', 'secondary button on page'], ['ok', 'ok-bg', 'paid heading'], ['ink', 'ok-bg', 'paid body'], ['bad', 'bad-bg', 'declined heading'], ['ink', 'bad-bg', 'declined body / notice'],
  ['wait', 'wait-bg', 'unknown heading'], ['ink', 'wait-bg', 'unknown body'], ['neutral', 'neutral-bg', 'cancelled heading'], ['warn', 'card', 'availability warning']];
const rows = pairs.map(([f, b, use]) => ({use, fg: tok[f], bg: tok[b], ratio: ratio(tok[f], tok[b]), meets_4_5: ratio(tok[f], tok[b]) >= 4.5}));
fs.writeFileSync(path.join(SHOP, 'evidence/contrast.json'), JSON.stringify({kind: 'measured contrast of declared tokens (not a human accessibility review)', rows}, null, 1));
for (const r of rows) console.log(r.ratio.toFixed(2).padStart(6), r.meets_4_5 ? 'ok ' : 'LOW', r.use, r.fg, 'on', r.bg);
