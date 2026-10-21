/* test_dictionary.js — the generator is deterministic and its projection matches independently specified fields. */
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const dir = path.join(__dirname, '..');
const run = () => { execSync('node translate.js', { cwd: dir, stdio: 'ignore' }); return fs.readFileSync(path.join(dir, 'docs', 'dictionary.json'), 'utf8'); };
const a = run(), b = run();
const problems = [];
if (a !== b) problems.push('generator output differs between two runs on the same inputs');
const dict = JSON.parse(a); const byId = {}; dict.entries.forEach(e => { byId[e.id] = e; });
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'dictionary.fixture.json'), 'utf8'));
const canon = (v) => JSON.stringify(v, Object.keys(v || {}).sort ? undefined : undefined);
for (const [id, want] of Object.entries(fixture.entries)) {
  const got = byId[id]; if (!got) { problems.push(`${id}: missing from the dictionary`); continue; }
  for (const [k, v] of Object.entries(want)) {
    const g = got[k];
    if (JSON.stringify(g) !== JSON.stringify(v)) problems.push(`${id}.${k}: generated ${JSON.stringify(g)} ≠ fixture ${JSON.stringify(v)}`);
  }
}
const unresolved = dict.entries.filter(e => e.kind !== 'native' && !e.identity);
if (unresolved.length) problems.push('entries without identity: ' + unresolved.map(e => e.id).join(', '));
console.log(`dictionary test: ${Object.keys(fixture.entries).length} fixture entries, deterministic ${a === b}, ${problems.length} problems`);
problems.forEach(p => console.log('  ' + p)); process.exit(problems.length ? 1 : 0);
