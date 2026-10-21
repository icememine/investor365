/* translate.js — generates the operational dictionary from authoritative artifacts:
 * kernel records (KERNEL.md + kernel conformance certificates), natives (lock + examples), admitted roots (certificates),
 * and profile manifests. Deterministic for the same inputs; the header records every input identity.
 * usage: node translate.js  →  docs/DICTIONARY.generated.md and docs/dictionary.json */
const fs = require('fs'); const path = require('path');
const E = require('./engine.js'); const L = require('./lang.js');
const dir = fs.existsSync(path.join(__dirname, 'natives.lock.json')) ? __dirname : path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(dir, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(dir, p));

(async () => {
  const lock = JSON.parse(read('natives.lock.json'));
  const profiles = fs.readdirSync(path.join(dir, 'profiles')).filter(f => f.endsWith('.json')).map(f => JSON.parse(read('profiles/' + f)));
  const certFiles = fs.readdirSync(dir).filter(f => /^certs\..*\.json$/.test(f)).map(f => ({ file: f, c: JSON.parse(read(f)) }));
  const kernelMd = exists('kernel/KERNEL.md') ? read('kernel/KERNEL.md') : '';
  const translatorId = (await E.sha256(fs.readFileSync(__filename, 'utf8'))).slice(0, 16);

  // gather every root from the certified sets: a root is admitted only through a certificate
  const nodes = {};   // name → { root, says, in, fx, raises, pre, post, inv, status, cert, certFile }
  const roots = {};
  for (const { file, c } of certFiles) {
    const graph = JSON.parse(read(`graph.${c.main}.json`));
    const view = E.resolve(graph, c.main); if (c.profile) view.profile = c.profile;
    for (const [name, cert] of Object.entries(c.certified)) { const n = view.nodes[name]; if (!n) continue; if (nodes[name] && nodes[name].cert.hash !== cert.hash) nodes[name].conflict = true; nodes[name] = { root: cert.root, says: n.says, in: n.in, fx: cert.fx, raises: cert.raises || [], pre: n.pre, post: n.post, inv: n.inv, demo: false, status: 'admitted', cert, certFile: file, profile: c.profile ? c.profile.name : null }; roots[cert.root] = roots[cert.root] || { hash: c.roots[cert.root] }; }
    for (const [name, cert] of Object.entries(c.demonstrated || {})) { const n = view.nodes[name]; nodes[name] = { root: cert.root, says: n.says, in: n.in, fx: cert.fx || [], raises: [], pre: n.pre, post: n.post, inv: n.inv, demo: true, status: 'demonstrated', cert, certFile: file }; }
    for (const [name, cert] of Object.entries(c.refused)) { const n = view.nodes[name]; nodes[name] = nodes[name] || { root: cert.root, says: n ? n.says : '', in: cert.in, fx: cert.fx || [], raises: [], pre: n ? n.pre : [], post: n ? n.post : [], inv: cert.inv || [], status: 'refused', cert, certFile: file }; }
  }
  const INFIX = { '+': '+', '-': '−', '*': '×', 'div': '÷', 'mod': 'mod', '<': '<', '<=': '≤', '>': '>', '>=': '≥', '==': '=', '!=': '≠' };
  const say = (e) => { if (typeof e === 'string') return e.replace(/^out\b/, 'result'); if (!Array.isArray(e)) return String(e); const [op, ...a] = e; if (op === 'lit') return JSON.stringify(a[0]); if (op === 'list') return '{' + a.map(say).join(', ') + '}'; if (op === 'rec') { const p = []; for (let i = 0; i < a.length; i += 2) p.push(a[i] + ': ' + say(a[i + 1])); return '{' + p.join(', ') + '}'; } if (op === 'and') return a.map(say).join(' and '); if (op === 'or') return '(' + a.map(say).join(' or ') + ')'; if (op === 'not') return 'not ' + say(a[0]); if (op === 'neg') return '−' + say(a[0]); if (op === 'abs') return '|' + say(a[0]) + '|'; if (op === 'in') return say(a[0]) + ' is one of ' + say(a[1]); if (op === 'if') return '(' + say(a[1]) + ' if ' + say(a[0]) + ', else ' + say(a[2]) + ')'; if (INFIX[op]) return say(a[0]) + ' ' + INFIX[op] + ' ' + say(a[1]); return op + '(' + a.map(say).join(', ') + ')'; };

  const entries = [];
  // natives
  for (const [op, h] of Object.entries(lock.natives)) {
    const n = E.NATIVES[op]; const st = {}; for (const { c } of certFiles) if (c.natives[op]) st[c.natives[op].status] = (st[c.natives[op].status] || 0) + 1;
    entries.push({ kind: 'native', id: op, identity: h, says: n.says, fx: n.fx, examples: n.ex.length, numeric: n.numeric !== false, exactOnly: n.exact !== false, status: Object.keys(st).sort().join('/') || 'unchecked', failure: n.pre ? 'refuses per its precondition' : (n.fx.length ? 'faults inside a contract' : 'faults on wrong kind or overflow') });
  }
  // nodes
  for (const [name, n] of Object.entries(nodes).sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    const c = n.cert;
    entries.push({ kind: n.demo ? 'demonstration' : 'node', id: name, root: n.root, rootIdentity: (roots[n.root] || {}).hash, identity: c.hash, descriptionIdentity: c.descriptionHash, says: n.says, inputs: n.in, effects: n.fx, raises: n.raises, pre: n.pre.map(p => ({ unless: say(p.expr), refuses: p.err })), post: n.post.map(say), inv: n.inv, status: n.status, evidence: { examples: c.examples, passed: c.passed, generated: c.generated || null, gaps: c.gaps || [], reasons: c.reasons || [] }, checker: c.checker, at: c.at, certFile: n.certFile, profile: n.profile || null, conflict: !!n.conflict });
  }
  const header = { schema: 'dnode-dictionary/0.4', generatedBy: 'translate#' + translatorId, inputs: { nativesLock: lock.identity, certificates: certFiles.map(f => f.file), profiles: profiles.map(p => p.name + '/' + p.version), kernel: kernelMd ? (await E.sha256(kernelMd)).slice(0, 16) : null }, counts: { natives: entries.filter(e => e.kind === 'native').length, nodes: entries.filter(e => e.kind === 'node').length, demonstrations: entries.filter(e => e.kind === 'demonstration').length, refused: entries.filter(e => e.status === 'refused').length } };
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs', 'dictionary.json'), JSON.stringify({ header, profiles, entries }, null, 1));

  // markdown projection
  let md = `# DNode dictionary — generated\n\nGenerated by \`${header.generatedBy}\` from natives lock \`${lock.identity}\`, certificates ${certFiles.map(f => '`' + f.file + '`').join(', ')}, profiles ${profiles.map(p => '`' + p.name + '`').join(', ')}${header.inputs.kernel ? ', kernel `' + header.inputs.kernel + '`' : ''}. Do not edit; edit the artifacts and regenerate. Status words: admitted = certified under the named checker; demonstrated = a demo node whose examples pass and which is never callable; refused = reasons listed; certified-by-use = a native with no examples of its own, called by a certified node.\n\n`;
  md += `## Kernel records\n\n${kernelMd ? kernelMd.split('\n').filter(l => l.startsWith('| K') || l.startsWith('| ID') || l.startsWith('| ---')).join('\n') : '(no KERNEL.md)'}\n\nFull records in kernel/KERNEL.md; paired cases are the \`kernel\` root below.\n\n`;
  md += `## Profiles\n\n| Profile | Entry points | Grants | Natives | Says |\n| --- | --- | --- | --- | --- |\n` + profiles.map(p => `| ${p.name} ${p.version} | ${(p.entry || []).map(e => e.node + '(' + e.in.join(', ') + ')').join(', ') || '—'} | ${(p.grants || []).join(', ') || 'none'} | ${(p.natives || []).length} | ${p.says} |`).join('\n') + '\n\n';
  md += `## Natives\n\n| Native | Identity | Status | Effects | Examples | Failure | Says |\n| --- | --- | --- | --- | --- | --- | --- |\n` + entries.filter(e => e.kind === 'native').map(e => `| \`${e.id}\` | ${e.identity} | ${e.status} | ${e.fx.join(', ') || 'none'} | ${e.examples} | ${e.failure} | ${e.says} |`).join('\n') + '\n\n';
  const byRoot = {}; entries.filter(e => e.kind !== 'native').forEach(e => (byRoot[e.root] = byRoot[e.root] || []).push(e));
  for (const [root, es] of Object.entries(byRoot).sort()) {
    md += `## Root \`${root}\`${(roots[root] || {}).hash ? ' #' + roots[root].hash : ''}\n\n`;
    for (const e of es) {
      md += `### \`${e.id}\` · ${e.status}${e.conflict ? ' · CONFLICT: different identities in different certificates' : ''}\n\n${e.says[0].toUpperCase() + e.says.slice(1)}.\n\n`;
      md += `- Takes: ${e.inputs.join(', ') || 'nothing'}. Effects: ${e.effects.join(', ') || 'none'}.${e.raises.length ? ' Lets through: ' + e.raises.join(', ') + '.' : ''}\n`;
      if (e.pre.length) md += `- Refuses unless: ${e.pre.map(p => p.unless + ' (else ' + p.refuses + ')').join('; ')}.\n`;
      if (e.post.length) md += `- Afterwards: ${e.post.join('; ')}.\n`;
      if (e.inv.length) md += `- Held to: ${e.inv.join(', ')}.\n`;
      md += `- Evidence: ${e.evidence.passed}/${e.evidence.examples} written examples${e.evidence.generated ? `; generated ${e.evidence.generated.returned} returned, ${e.evidence.generated.preRejected} refused, ${e.evidence.generated.propagated} propagated of ${e.evidence.generated.distinct} distinct` : ''}${e.evidence.gaps.length ? '; gaps: ' + e.evidence.gaps.join('; ') : ''}${e.evidence.reasons.length ? '; refused: ' + e.evidence.reasons.join(' | ') : ''}.\n`;
      md += `- Identity ${e.identity}, description ${e.descriptionIdentity || '—'}, checker ${e.checker || '—'}${e.profile ? ', profile ' + e.profile : ''}.\n\n`;
    }
  }
  fs.writeFileSync(path.join(dir, 'docs', 'DICTIONARY.generated.md'), md);
  console.log(`dictionary: ${header.counts.natives} natives, ${header.counts.nodes} nodes, ${header.counts.demonstrations} demonstrations, ${header.counts.refused} refused → docs/DICTIONARY.generated.md (${md.length} chars), docs/dictionary.json`);
})();
