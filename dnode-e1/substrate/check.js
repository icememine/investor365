/* check.js — the checker, second build. A deterministic program, not a model.
 * Tiers run per node: Examples (written), Generated (thousands of inputs across pre), effect ceiling,
 * literal rule, dependency rule, gap report. Natives are certified first, by their own examples.
 * Certificates already held for an unchanged hash are reused, not re-run. Everything signed.
 */
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');
const L = require('./lang.js');

const dir = __dirname;
const GENERATED = 2000;

function prng(seedHex) { let a = parseInt(seedHex.slice(0, 8), 16) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function mutate(v, rnd, exact, strings) {
  if (typeof v === 'number') { if (rnd() < 0.4) return v; const span = Math.max(Math.abs(v), 1000); const d = (rnd() * 2 - 1) * span * (rnd() < 0.2 ? 20 : 1); let n = v + d; if (exact) n = Math.round(n); return Math.max(-E.MAXI, Math.min(E.MAXI, n)); }
  if (typeof v === 'boolean') return rnd() < 0.5;
  if (typeof v === 'string') return rnd() < 0.8 && strings.length ? strings[Math.floor(rnd() * strings.length)] : v;
  if (Array.isArray(v)) return v.map(x => mutate(x, rnd, exact, strings));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = mutate(v[k], rnd, exact, strings); return o; }
  return v;
}
function collectStrings(v, out) { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(x => collectStrings(x, out)); else if (v && typeof v === 'object') Object.values(v).forEach(x => collectStrings(x, out)); }

async function main() {
  // ---- load the text surface into the graph ----
  const graph = { roots: {} };
  const rootDirs = (process.env.DNODE_ROOTS || dir).split(':');
  for (const rd of rootDirs) for (const f of fs.readdirSync(rd).filter(f => f.endsWith('.node'))) {
    const r = L.parse(fs.readFileSync(path.join(rd, f), 'utf8'), f);
    if (graph.roots[r.name]) throw new Error(`root ${r.name} defined twice (${f})`);
    graph.roots[r.name] = r;
  }
  const MAIN = process.argv[2] || 'shop';
  const PROFILE_NAME = process.argv[3] || null;
  // natives.lock.json pins every native's identity; an unknown or changed native is refused before anything runs
  const lockPath = path.join(dir, 'natives.lock.json');
  const lock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, 'utf8')) : null;
  const lockProblems = [];
  if (lock) {
    for (const op of Object.keys(E.NATIVES)) { const h = await E.hashNative(op); if (!lock.natives[op]) lockProblems.push(`native ${op} is not in natives.lock.json`); else if (lock.natives[op] !== h) lockProblems.push(`native ${op} identity ${h} does not match the lock ${lock.natives[op]}`); }
    for (const op of Object.keys(lock.natives)) if (!E.NATIVES[op]) lockProblems.push(`locked native ${op} is missing from the runtime`);
  }
  const profile = PROFILE_NAME ? JSON.parse(fs.readFileSync(path.join(dir, 'profiles', PROFILE_NAME + '.json'), 'utf8')) : null;
  const view = E.resolve(graph, MAIN);
  if (lockProblems.length) { console.log('ADMISSION DENIED (natives):\n  ' + lockProblems.join('\n  ')); process.exit(2); }
  if (profile) view.profile = profile;
  const hashes = await E.hashAll(view);
  const rootHashes = {}; await E.hashRoot(graph, MAIN, rootHashes);
  fs.writeFileSync(path.join(dir, `graph.${MAIN}.json`), JSON.stringify(graph, null, 1));

  const checkerId = 'checker#' + (await E.sha256(fs.readFileSync(__filename, 'utf8') + fs.readFileSync(path.join(dir, 'engine.js'), 'utf8') + fs.readFileSync(path.join(dir, 'lang.js'), 'utf8'))).slice(0, 8);
  const certPath = path.join(dir, `certs.${MAIN}.json`);
  const previous = fs.existsSync(certPath) ? JSON.parse(fs.readFileSync(certPath, 'utf8')) : null;

  // ---- signing key ----
  const keyPath = path.join(dir, 'checker.key.json');
  let priv, pubJwk;
  if (fs.existsSync(keyPath)) { const k = JSON.parse(fs.readFileSync(keyPath, 'utf8')); priv = await E.subtle.importKey('jwk', k.priv, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']); pubJwk = k.pub; }
  else { const kp = await E.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']); priv = kp.privateKey; pubJwk = await E.subtle.exportKey('jwk', kp.publicKey); fs.writeFileSync(keyPath, JSON.stringify({ priv: await E.subtle.exportKey('jwk', kp.privateKey), pub: pubJwk }, null, 2)); }
  const sign = async (s) => Buffer.from(await E.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, priv, new TextEncoder().encode(s))).toString('base64');
  const pub = await E.subtle.importKey('jwk', pubJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const verify = async (c) => { try { return await E.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, Buffer.from(c.sig, 'base64'), new TextEncoder().encode(`${c.hash}|${c.descriptionHash}|${c.checker}|${c.at}`)); } catch (e) { return false; } };
  const at = new Date().toISOString();

  // ---- natives: certified by their own examples ----
  const natives = {};
  for (const [op, n] of Object.entries(E.NATIVES)) {
    const h = await E.hashNative(op);
    const problems = [];
    if (view.numbers === 'exact' && n.exact === false) { natives[op] = { hash: h, descriptionHash: h, fx: n.fx, examples: n.ex.length, status: 'excluded', problems: ['not allowed under numbers exact'], sig: null }; continue; }
    for (const [args, want] of n.ex) {
      const expectFault = want && typeof want === 'object' && !Array.isArray(want) && want.fault;
      const asExpr = (v) => typeof v === 'string' ? ['lit', v] : Array.isArray(v) ? ['list', ...v.map(asExpr)] : (v && typeof v === 'object') ? ['rec', ...Object.entries(v).flatMap(([k, x]) => [k, asExpr(x)])] : v;
      try { const got = E.ev([op, ...args.map(asExpr)], {}, { view, effects: [] }); if (expectFault) problems.push(`${op}(${E.canon(args)}) returned ${E.canon(got)}, expected fault ${want.fault}`); else if (E.canon(got) !== E.canon(want)) problems.push(`${op}(${E.canon(args)}) = ${E.canon(got)}, expected ${E.canon(want)}`); }
      catch (e) { if (expectFault && e instanceof E.Fault && e.kind === want.fault) continue; problems.push(`${op}(${E.canon(args)}) ${expectFault ? 'faulted with ' + e.message : 'crashed: ' + e.message}`); }
    }
    natives[op] = { hash: h, descriptionHash: h, fx: n.fx, examples: n.ex.length, status: problems.length ? 'refused' : (n.ex.length ? 'certified' : 'by-use'), problems, sig: problems.length ? null : await sign(`${h}|${h}|${checkerId}|${at}`) };
  }

  // ---- nodes, callees first ----
  const order = []; const seen = new Set();
  const visit = (n) => { if (seen.has(n)) return; seen.add(n); E.callees(view, view.nodes[n]).forEach(visit); order.push(n); };
  Object.keys(view.nodes).forEach(visit);

  const certified = {}, refused = {}, demonstrated = {}; const rows = [];
  for (const name of order) {
    const node = view.nodes[name];
    const reasons = [], gaps = [];
    const row = { name, root: view.nodeRoot[name], hash: hashes[name], in: node.in, inv: node.inv, examples: node.ex.length };

    // reuse a certificate for an unchanged hash from the same checker
    const dhash = await E.descriptionHash(view, name);
    row.descriptionHash = dhash;
    const prev = previous && previous.checker === checkerId && previous.certified[name];
    if (prev && prev.hash === hashes[name] && prev.descriptionHash === dhash && await verify(prev)) { certified[name] = Object.assign({}, prev, { reused: true }); rows.push([name, hashes[name], 'certified', 'reused', '', '']); continue; }

    // 1. effects ceiling
    const computed = [...E.computedFx(view, name)].sort(), declared = [...E.declaredFx(view, node)].sort();
    const excess = computed.filter(x => !declared.includes(x));
    if (excess.length) reasons.push(`EffectNotAllowed: body uses ${excess.join(', ')}, declares ${declared.join(', ') || 'none'}`);
    if (profile) declared.filter(f => !(profile.grants || []).includes(f)).forEach(f => reasons.push(`EffectNotAllowed: ${f} is declared but profile ${profile.name} does not grant it`));
    const inContracts = [...E.contractFx(view, name)];
    if (inContracts.length) reasons.push(`EffectNotAllowed: a contract reaches ${inContracts.join(', ')}; contracts must be pure`);
    row.fx = declared; row.computedFx = computed;

    // 2. callees certified, natives certified
    [...E.callees(view, node)].filter(c => !certified[c]).forEach(c => reasons.push(`calls uncertified node ${c}`));
    const nativesUsed = new Set(); E.exprs(node).forEach(e => E.walk(e, x => { if (E.NATIVES[x[0]]) nativesUsed.add(x[0]); }));
    if (profile && profile.natives) [...nativesUsed].filter(op => !profile.natives.includes(op)).forEach(op => reasons.push(`native ${op} is not allowed by profile ${profile.name}`));
    [...nativesUsed].filter(op => natives[op].status === 'refused').forEach(op => reasons.push(`uses refused native ${op}`));
    row.natives = [...nativesUsed];
    if (view.numbers === 'exact' && nativesUsed.has('/')) reasons.push('uses / under numbers exact');

    // 3. literal rule: numbers in bodies must be 0, 1, -1 or a named constant
    const lits = E.literals(node); if (lits.length) reasons.push(`literals outside the root: ${[...new Set(lits)].join(', ')}`);

    // 4. dependency rule: every input is used; every output field depends on some input
    const ld = E.letDependencies(node);
    const outDeps = E.deps(node, node.out, ld);
    const used = E.usedInputs(node);
    node.in.filter(i => !used.inputs.has(i)).forEach(i => reasons.push(`input ${i} is never used`));
    used.deadLets.forEach(l => reasons.push(`let ${l} reaches neither out nor an effect`));
    if (outDeps.size === 0) gaps.push('output depends on no input (constant)');
    if (Array.isArray(node.out) && node.out[0] === 'rec') for (let i = 1; i < node.out.length; i += 2) { if (E.deps(node, node.out[i + 1], ld).size === 0) gaps.push(`output field ${node.out[i]} is constant`); }
    if (!node.post.length) gaps.push('no post clause');

    // 5. written examples
    let passed = 0, returned = 0; const refusalsSeen = new Set(), raisesSeen = new Set(); const bases = [];
    node.ex.forEach((ex, i) => {
      try {
        const r = E.runExample(view, name, ex);
        if (r.problems.length) reasons.push(`ex[${i}]: ${r.problems.join('; ')}`); else passed++;
        if (ex.refuse && r.refused && !r.problems.length) { if (r.outcome === 'refused') refusalsSeen.add(ex.refuse); else raisesSeen.add(ex.refuse); }
        if (r.outcome === 'returned' && !r.problems.length) returned++;
        if (ex.args && !ex.refuse && !ex.fault) bases.push(ex.args);
      } catch (e) { reasons.push(`ex[${i}] crashed: ${e.message}`); }
    });
    if (!node.ex.length) reasons.push('no examples');
    if (!returned && !node.demo) reasons.push('no example returns a result');
    if (!node.demo) node.err.forEach(err => { if (!refusalsSeen.has(err)) reasons.push(`error ${err} has no refusal example`); });
    (node.raises || []).forEach(err => { if (!raisesSeen.has(err)) reasons.push(`raises ${err} has no example showing it propagate`); });
    row.passed = passed; row.raises = node.raises || [];

    // 6. generated tier: mutate the written examples across pre, check post and invariants
    if (node.demo) { row.demo = true; }
    else if (!reasons.length && bases.length && node.in.length) {
      const rnd = prng(hashes[name]); const strings = []; bases.forEach(b => collectStrings(b, strings));
      const seen = new Set(); let attempted = 0, returnedG = 0, preRejected = 0, propagated = 0, failure = null;
      for (let t = 0; t < GENERATED && !failure; t++) {
        const base = bases[Math.floor(rnd() * bases.length)];
        const args = {}; for (const k of Object.keys(base)) args[k] = rnd() < 0.7 ? mutate(base[k], rnd, view.numbers === 'exact', strings) : JSON.parse(JSON.stringify(base[k]));
        const key = E.canon(args); if (seen.has(key)) continue; seen.add(key); attempted++;
        try {
          const r = E.runExample(view, name, { args, check: [] });
          if (r.outcome === 'refused') preRejected++;
          else if (r.outcome === 'propagated') propagated++;
          else if (r.outcome === 'fault') failure = `${r.problems.join('; ')} for ${key}`;
          else { returnedG++; if (r.problems.length) failure = `${r.problems.join('; ')} for ${key}`; }
        } catch (e) { failure = `${e.message} for ${key}`; }
      }
      row.generated = { attempted, distinct: seen.size, returned: returnedG, preRejected, propagated };
      if (failure) reasons.push(`generated: ${failure}`);
      else if (!returnedG) reasons.push('generated: no input returned a result; written examples alone are below the certification floor');
    } else if (!node.in.length) { row.generated = { attempted: 1, distinct: 1, returned: returned ? 1 : 0, preRejected: 0, propagated: 0 }; gaps.push('zero inputs: one case, not a campaign'); }

    row.gaps = gaps;
    if (node.demo && !reasons.length) { demonstrated[name] = Object.assign(row, { checker: checkerId, at }); rows.push([name, hashes[name], 'demo', `${passed}/${node.ex.length}`, computed.join(',') || 'none', 'demonstration only; never callable']); continue; }
    if (reasons.length) { refused[name] = Object.assign(row, { reasons }); }
    else { certified[name] = Object.assign(row, { checker: checkerId, at, sig: await sign(`${hashes[name]}|${dhash}|${checkerId}|${at}`) }); }
    rows.push([name, hashes[name], reasons.length ? 'REFUSED' : 'certified', `${passed}/${node.ex.length}` + (row.generated ? ` +${row.generated.returned}r/${row.generated.preRejected}p/${row.generated.propagated}x` : ''), computed.join(',') || 'none', reasons.join(' | ') || gaps.join(' | ')]);
  }

  for (const [op, n] of Object.entries(natives)) if (n.status === 'by-use') { const users = Object.values(certified).filter(c => (c.natives || []).includes(op) && c.passed > 0).map(c => c.name); n.status = users.length ? 'certified-by-use' : 'not_checked'; n.usedBy = users; }

  // ---- metrics: fresh vs referenced ----
  const gameRoots = view.roots.filter(r => !['prelude', 'consts'].includes(r));
  const fresh = Object.keys(view.nodes).filter(n => gameRoots.includes(view.nodeRoot[n]));
  let refCalls = 0, freshCalls = 0, nativeCalls = 0;
  for (const n of fresh) E.exprs(view.nodes[n]).forEach(e => E.walk(e, x => { if (view.nodes[x[0]]) { if (gameRoots.includes(view.nodeRoot[x[0]])) freshCalls++; else refCalls++; } else if (E.NATIVES[x[0]]) nativeCalls++; }));
  const metrics = { freshNodes: fresh.length, preludeNodes: Object.keys(view.nodes).length - fresh.length, callsToPrelude: refCalls, callsToFresh: freshCalls, callsToNatives: nativeCalls, reusedCertificates: Object.values(certified).filter(c => c.reused).length };

  const certs = { schema: 'dnode-cert/0.4', profile: profile ? { name: profile.name, version: profile.version } : null, nativesLock: lock ? lock.identity : null, checker: checkerId, at, publicKey: pubJwk, main: MAIN, roots: rootHashes, numbers: view.numbers, natives, certified, refused, demonstrated, metrics, meaning: 'Under this checker and runtime, each certified node passed its written examples and the generated inputs recorded here, kept its contracts and listed invariants on every returned case, and requested no effect beyond its declared set. This is tested evidence with signatures, not a proof over all inputs.' };
  fs.writeFileSync(certPath, JSON.stringify(certs, null, 2));

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${checkerId}  ${at}  numbers ${view.numbers}`);
  console.log(`roots: ${Object.entries(rootHashes).map(([k, v]) => `${k}#${v.slice(0, 8)}`).join('  ')}`);
  const ns = Object.values(natives); console.log(`natives: ${ns.filter(n => n.status === 'certified').length} by examples, ${ns.filter(n => n.status === 'certified-by-use').length} by use, ${ns.filter(n => n.status === 'not_checked').length} not checked, ${ns.filter(n => n.status === 'excluded').length} excluded, ${ns.filter(n => n.status === 'refused').length} refused\n`);
  console.log(pad('node', 16) + pad('root', 14) + pad('hash', 18) + pad('status', 10) + pad('ex +returned/pre/propagated', 28) + pad('effects', 23) + 'reason or gaps');
  rows.forEach(r => console.log(pad(r[0], 16) + pad(view.nodeRoot[r[0]], 14) + pad(r[1], 18) + pad(r[2], 10) + pad(r[3], 28) + pad(r[4], 23) + r[5]));
  console.log(`\n${Object.keys(certified).length} certified, ${Object.keys(demonstrated).length} demonstrated, ${Object.keys(refused).length} refused`);
  console.log('metrics:', JSON.stringify(metrics));
}
main().catch(e => { console.error(e); process.exit(1); });
