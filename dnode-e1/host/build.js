/* build.js — inline the substrate (engine + text natives), the admitted graph, its certificates, the profile manifest,
 * the natives lock and optional seed fixtures into one self-contained host page.
 * usage: node host/build.js <main root> <profile> [title] [page.src.html]  →  host/<main root>.html
 * The page re-verifies every certificate and every native identity before it runs anything. */
const fs = require('fs'); const path = require('path');
const dist = path.join(__dirname, '..');
const [main, profile, title, page] = process.argv.slice(2);
if (!main || !profile) { console.error('usage: node host/build.js <main root> <profile> [title]'); process.exit(1); }
const read = (p) => fs.readFileSync(path.join(dist, p), 'utf8');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const nativesText = `window.__NATIVES_TEXT = (function () { const module = { exports: null };\n${read('substrate/natives-text.js')}\nreturn module.exports; })();`;
const seedDir = fs.existsSync(path.join(dist, 'fixtures', main)) ? 'fixtures/' + main : 'fixtures';
const seeds = fs.existsSync(path.join(dist, seedDir)) ? fs.readdirSync(path.join(dist, seedDir)).filter(f => f.endsWith('.csv')).sort().slice(0, 8).map(f => ({ name: f.replace(/\.csv$/, ''), text: read(seedDir + '/' + f) })) : [];
const html = read('host/' + (page || 'panel.src.html')).split('__TITLE__').join(title || main)
  .replace('__NATIVES_TEXT__', () => safe(nativesText))
  .replace('__ENGINE__', () => safe(read('substrate/engine.js')))
  .replace('__GRAPH__', () => safe(read(`graph.${main}.json`)))
  .replace('__CERTS__', () => safe(read(`certs.${main}.json`)))
  .replace('__PROFILE__', () => safe(read(`profiles/${profile}.json`)))
  .replace('__LOCK__', () => safe(read('natives.lock.json')))
  .replace('__SEEDS__', () => safe(JSON.stringify(seeds)));
const out = path.join(__dirname, `${main}.html`);
fs.writeFileSync(out, html);
console.log(path.relative(dist, out), html.length, 'bytes');
