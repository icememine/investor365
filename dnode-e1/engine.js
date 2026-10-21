/* engine.js — runtime for the node language, second build.
 * Substrate only: evaluates expressions, interprets node bodies, resolves roots, computes effect sets,
 * hashes nodes, runs examples. Natives carry contracts and examples of their own, so the checker
 * certifies them like any node. Under `numbers exact` every value is a whole number and `/` is refused.
 */
(function (root) {
  'use strict';

  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    return JSON.stringify(v);
  }
  const subtle = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle)
    ? globalThis.crypto.subtle : (typeof require === 'function' ? require('crypto').webcrypto.subtle : null);
  async function sha256(s) {
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ---------- natives: primitives with contracts ----------
  const int = (...xs) => xs.every(Number.isInteger);
  const MAXI = Number.MAX_SAFE_INTEGER;
  class Fault extends Error { constructor(kind, msg) { super(`${kind}: ${msg}`); this.kind = kind; } }
  const floorDivBig = (A, B) => { let q = A / B; if ((A % B !== 0n) && ((A < 0n) !== (B < 0n))) q -= 1n; return q; };
  const floorDiv = (a, b) => Number(floorDivBig(BigInt(a), BigInt(b)));
  const floorMod = (a, b) => { const A = BigInt(a), B = BigInt(b); return Number(A - B * floorDivBig(A, B)); };
  const bounded = (op, v) => { if (typeof v === 'number' && (!Number.isFinite(v) || Math.abs(v) > MAXI)) throw new Fault('ArithmeticOverflow', `${op} left the exact range`); return v; };
  const N = (says, f, o = {}) => Object.assign({ says, f, fx: [], ex: [] }, o);
  const bools = (op, xs) => { for (const x of xs) if (typeof x !== 'boolean') throw new Fault('InputShape', `${op} given a non-Bool ${canon(x)}`); };
  const NATIVES = {
    '+':   N('adds two numbers; a result outside the exact range is a fault', (a, b) => a + b, { ex: [[[2, 3], 5], [[-1, 1], 0], [[9007199254740991, 1], { fault: 'ArithmeticOverflow' }]] }),
    '-':   N('subtracts the second from the first', (a, b) => a - b, { ex: [[[5, 3], 2]] }),
    '*':   N('multiplies two numbers; a result outside the exact range is a fault', (a, b) => a * b, { ex: [[[4, 5], 20], [[-2, 3], -6], [[9007199254740991, 2], { fault: 'ArithmeticOverflow' }]] }),
    '/':   N('divides; refused under numbers exact', (a, b) => a / b, { exact: false, ex: [[[6, 3], 2]] }),
    'div': N('whole-number division, rounded toward negative infinity, exact at every magnitude', (a, b) => floorDiv(a, b), { pre: (a, b) => b !== 0 || 'DivideByZero', ex: [[[7, 2], 3], [[-7, 2], -4], [[9007199254740991, -3], -3002399751580331]] }),
    'mod': N('a − b × div(a, b); the sign follows the divisor; exact at every magnitude', (a, b) => floorMod(a, b), { pre: (a, b) => b !== 0 || 'DivideByZero', ex: [[[7, 5], 2], [[-1, 5], 4], [[7, -3], -2], [[9007199254740991, -3], -2]] }),
    'neg': N('negates', (a) => -a, { ex: [[[3], -3]] }),
    'abs': N('absolute value', (a) => Math.abs(a), { ex: [[[-3], 3], [[3], 3]] }),
    'sign': N('−1, 0 or 1', (a) => Math.sign(a), { ex: [[[-9], -1], [[0], 0], [[4], 1]] }),
    'min': N('the smaller', (a, b) => Math.min(a, b), { ex: [[[2, 9], 2]] }),
    'max': N('the larger', (a, b) => Math.max(a, b), { ex: [[[2, 9], 9]] }),
    'clamp': N('v held between lo and hi', (v, lo, hi) => Math.min(hi, Math.max(lo, v)), { pre: (v, lo, hi) => lo <= hi || 'EmptyRange', ex: [[[5, 0, 3], 3], [[-1, 0, 3], 0], [[2, 0, 3], 2]] }),
    '<':   N('less than', (a, b) => a < b, { ex: [[[1, 2], true], [[2, 2], false]] }),
    '<=':  N('at most', (a, b) => a <= b, { ex: [[[2, 2], true]] }),
    '>':   N('greater than', (a, b) => a > b, { ex: [[[3, 2], true]] }),
    '>=':  N('at least', (a, b) => a >= b, { ex: [[[2, 2], true]] }),
    '==':  N('structurally equal', (a, b) => canon(a) === canon(b), { numeric: false, ex: [[[{ a: 1 }, { a: 1 }], true], [[1, 2], false]] }),
    '!=':  N('structurally different', (a, b) => canon(a) !== canon(b), { numeric: false, ex: [[[1, 2], true]] }),
    'and': N('all true', (...xs) => { bools('and', xs); return xs.every(x => x); }, { numeric: false, ex: [[[true, true], true], [[true, false], false]] }),
    'or':  N('any true', (...xs) => { bools('or', xs); return xs.some(x => x); }, { numeric: false, ex: [[[false, true], true]] }),
    'not': N('negation', (a) => { bools('not', [a]); return !a; }, { numeric: false, ex: [[[true], false]] }),
    'in':  N('membership in a list', (v, l) => l.some(x => canon(x) === canon(v)), { numeric: false, ex: [[[2, [1, 2]], true], [[3, [1, 2]], false]] }),
    'len': N('length of a list', (l) => l.length, { numeric: false, ex: [[[[1, 2, 3]], 3]] }),
    'str': N('number as text', (v) => String(v), { numeric: false, ex: [[[7], '7']] }),
    'cat': N('joins two texts', (a, b) => String(a) + String(b), { numeric: false, ex: [[['a', 'b'], 'ab']] }),
    // structured recursion over finite data: termination by construction
    'range': N('the whole numbers from 0 up to n, excluding n', (n) => Array.from({ length: n }, (_, i) => i), { pre: (n) => (n >= 0 && n <= 10000) || 'BadRange', ex: [[[3], [0, 1, 2]], [[0], []]] }),
    'pairs': N('every {a b} with a from the first list and b from the second', (xs, ys) => xs.flatMap(a => ys.map(b => ({ a, b }))), { numeric: false, ex: [[[[0, 1], [5]], [{ a: 0, b: 5 }, { a: 1, b: 5 }]]] }),
    'concat': N('one list after another', (a, b) => a.concat(b), { numeric: false, ex: [[[[1], [2, 3]], [1, 2, 3]]] }),
    'sum': N('adds up a list of numbers; every intermediate total must stay in the exact range', (l) => l.reduce((a, b) => bounded('sum', a + b), 0), { numeric: false, ex: [[[[1, 2, 3]], 6], [[[]], 0], [[[9007199254740991, 2, -2]], { fault: 'ArithmeticOverflow' }], [[[9007199254740991, -2, 2]], 9007199254740991]] }),
    // text — needed by the CSV adapter; 0.3 had no way to take text apart (finding F1)
    'split': N('splits text on a separator into a list of texts', (t, sep) => String(t).split(sep), { numeric: false, ex: [[['a,b,,c', ','], ['a', 'b', '', 'c']], [['', ','], ['']]] }),
    'csv_fields': N('splits one CSV line into fields: commas separate, double quotes enclose, a doubled quote is a quote', (line) => { const out = []; let cur = '', q = false; const t = String(line); for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; }, { numeric: false, ex: [[['a,b'], ['a', 'b']], [['NB-01,"Notebook, blue",12,45000'], ['NB-01', 'Notebook, blue', '12', '45000']], [['x,"say ""hi""",1'], ['x', 'say "hi"', '1']], [[''], ['']]] }),
    'trim': N('removes surrounding whitespace', (t) => String(t).trim(), { numeric: false, ex: [[[' a '], 'a']] }),
    'to_int': N('reads a whole number from text, surrounding whitespace allowed; refuses anything else and any value outside the exact range', (t) => parseInt(String(t).trim(), 10), { numeric: false, pre: (t) => { const m = /^\s*(-?\d{1,16})\s*$/.exec(String(t)); return (!!m && Number.isSafeInteger(Number(m[1]))) || 'NotANumber'; }, ex: [[['12'], 12], [[' -3 '], -3], [['9007199254740991'], 9007199254740991], [['-9007199254740991'], -9007199254740991]] }),
    'is_int': N('true when the text is a whole number', (t) => /^\s*-?\d{1,15}\s*$/.test(String(t)), { numeric: false, ex: [[['12'], true], [['twelve'], false], [[''], false]] }),
    'has': N('true when a record has a field of that name', (r, k) => !!r && typeof r === 'object' && !Array.isArray(r) && Object.prototype.hasOwnProperty.call(r, k), { numeric: false, ex: [[[{ a: 1 }, 'a'], true], [[{ a: 1 }, 'b'], false]] }),
    'text_len': N('number of characters', (t) => String(t).length, { numeric: false, ex: [[['abc'], 3], [[''], 0]] }),
    // collections from LATER, pulled forward because the shop needs them (finding F2)
    'filter': N('keeps the items for which the named node returns true', (name, list, ctx) => list.filter(x => { const r = callNode(name, [x], ctx); if (typeof r !== 'boolean') throw new Fault('InputShape', `filter predicate ${name} returned a non-Bool`); return r; }), { numeric: false, wantsCtx: true, ex: [] }),
    'at': N('one item of a list by position, from 0', (l, i) => l[i], { numeric: false, pre: (l, i) => (Number.isInteger(i) && i >= 0 && i < l.length) || 'IndexOutOfRange', ex: [[[[5, 6], 1], 6]] }),
    'map': N('calls a node on every item of a list; the node is named by a literal', (name, list, ctx) => list.map(x => callNode(name, [x], ctx)), { numeric: false, wantsCtx: true, ex: [] }),
    // effects: the executor outside the graph consumes these
    'screen.draw': N('hands a draw list to the screen', (dl, ctx) => { if (ctx.pure) throw new Fault('EffectNotAllowed', 'screen.draw inside a contract'); ctx.effects.push(['screen.draw', dl]); return true; }, { fx: ['screen.draw'], numeric: false, wantsCtx: true, ex: [] }),
    'panel.show': N('hands a list of panel items (text, buttons, inputs, tables) to the host', (items, ctx) => { if (ctx.pure) throw new Fault('EffectNotAllowed', 'panel.show inside a contract'); ctx.effects.push(['panel.show', items]); return true; }, { fx: ['panel.show'], numeric: false, wantsCtx: true, ex: [] }),
    'audio.play':  N('plays one named sound, or nothing for "none"', (s, ctx) => { if (ctx.pure) throw new Fault('EffectNotAllowed', 'audio.play inside a contract'); if (s !== 'none') ctx.effects.push(['audio.play', s]); return true; }, { fx: ['audio.play'], numeric: false, wantsCtx: true, ex: [] })
  };
  const extra = (typeof module !== 'undefined' && typeof require === 'function') ? require('./natives-text.js')(N, Fault, canon) : (root.__NATIVES_TEXT ? root.__NATIVES_TEXT(N, Fault, canon) : {});
  Object.assign(NATIVES, extra);
  const SPECIAL = new Set(['lit', 'if', 'rec', 'with', 'list']);

  class Refusal extends Error { constructor(node, err) { super(`${node} refused: ${err}`); this.node = node; this.err = err; } }

  // an environment is a scope, not a record: it is a null-prototype object whose prototype holds the view's constants,
  // so the first segment of a path may come from the constants while every later segment must be an own field (K05).
  const PATHS = new Map();
  function lookup(path, env) {
    let parts = PATHS.get(path); if (!parts) { parts = path.split('.'); PATHS.set(path, parts); }
    let v = env;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i === 0) { if (!(p in env)) throw new Fault('UnboundReference', path); v = env[p]; continue; }
      if (v === undefined || v === null || typeof v !== 'object' || !Object.prototype.hasOwnProperty.call(v, p)) throw new Fault('UnboundReference', path); v = v[p];
    }
    return v;
  }
  function scope(view) { if (!view._consts) { const c = Object.create(null); Object.assign(c, view.consts); view._consts = c; } return Object.create(view._consts); }
  function allowed(ctx, op, n) {
    const pr = ctx.profile; if (!pr) return;
    if (!pr._grants) { pr._grants = new Set(pr.grants || []); pr._natives = pr.natives ? new Set(pr.natives) : null; }
    if (n.fx.length) for (const f of n.fx) if (!pr._grants.has(f)) throw new Fault('EffectNotAllowed', `${op} is not granted by profile ${pr.name}`);
    if (pr._natives && !pr._natives.has(op)) throw new Fault('EffectNotAllowed', `native ${op} is not allowed by profile ${pr.name}`);
  }

  function ev(e, env, ctx) {
    if (typeof e === 'string') return lookup(e, env);
    if (typeof e === 'number' || typeof e === 'boolean' || e === null) return e;
    if (!Array.isArray(e)) throw new Error('bad expression: ' + JSON.stringify(e));
    const [op, ...args] = e;
    switch (op) {
      case 'lit': return args[0];
      case 'if': { const c = ev(args[0], env, ctx); if (typeof c !== 'boolean') throw new Fault('InputShape', `if given a non-Bool ${canon(c)}`); return c ? ev(args[1], env, ctx) : ev(args[2], env, ctx); }
      case 'rec': { const r = {}; for (let i = 0; i < args.length; i += 2) r[args[i]] = ev(args[i + 1], env, ctx); return r; }
      case 'with': { const b = Object.assign({}, ev(args[0], env, ctx)); for (let i = 1; i < args.length; i += 2) b[args[i]] = ev(args[i + 1], env, ctx); return b; }
      case 'list': return args.map(a => ev(a, env, ctx));
    }
    const n = NATIVES[op];
    if (n) {
      if (ctx.view.numbers === 'exact' && n.exact === false) throw new Error(`${op} is not allowed under numbers exact`);
      allowed(ctx, op, n);
      const vals = args.map(a => ev(a, env, ctx));
      if (n.pre) { const r = n.pre(...vals); if (r !== true) throw new Refusal(op, r); }
      if (ctx.view.numbers === 'exact' && n.numeric !== false && !int(...vals)) throw new Fault('InputShape', `${op} given a non-integer under numbers exact: ${canon(vals)}`);
      const out = n.wantsCtx ? n.f(...vals, ctx) : n.f(...vals);
      if (ctx.view.numbers === 'exact' && typeof out === 'number' && !Number.isInteger(out)) throw new Fault('ArithmeticOverflow', `${op} produced a non-integer under numbers exact`);
      return bounded(op, out);
    }
    if (ctx.view.nodes[op]) return callNode(op, args.map(a => ev(a, env, ctx)), ctx);
    throw new Error('unknown op: ' + op);
  }

  function callNode(name, vals, ctx) {
    const node = ctx.view.nodes[name];
    if (ctx.certified && !ctx.certified.has(name)) throw new Error(`node not certified: ${name}`);
    const env = scope(ctx.view);
    node.in.forEach((n, i) => { env[n] = vals[i]; });
    const pctx = ctx.pure ? ctx : Object.assign({}, ctx, { pure: true });
    for (const p of node.pre) {
      let c; try { c = ev(p.expr, env, pctx); } catch (e) { if (e instanceof Refusal) throw new Fault('ContractEvaluationFault', `pre of ${name} refused: ${e.err}`); throw e; }
      if (typeof c !== 'boolean') throw new Fault('ContractEvaluationFault', `pre of ${name} is not a Bool`);
      if (!c) throw new Refusal(name, p.err);
    }
    try {
      for (const b of node.body) env[b.let] = ev(b.expr, env, ctx);
      const out = ev(node.out, env, ctx);
      // strict mode: post and attached invariants are enforced at every return, in a pure context
      const penv = scope(ctx.view); node.in.forEach((n, i) => { penv[n] = vals[i]; }); penv.out = out;
      const test = (label, e) => { let v; try { v = ev(e, penv, pctx); } catch (err) { if (err instanceof Fault && err.kind === 'ContractViolation') throw err; throw new Fault('ContractEvaluationFault', `${label} of ${name}: ${err.message}`); } if (typeof v !== 'boolean') throw new Fault('ContractEvaluationFault', `${label} of ${name} is not a Bool`); if (!v) throw new Fault('ContractViolation', `${label} of ${name} false`); };
      node.post.forEach((p, i) => test(`post[${i}]`, p));
      node.inv.forEach(id => { const inv = ctx.view.inv[id]; if (!inv) throw new Fault('ContractEvaluationFault', `unknown invariant ${id}`); test(`inv ${id}`, inv.expr); });
      return out;
    } catch (e) {
      // a callee's or native's refusal may pass through only if this node declares it
      if (e instanceof Refusal && e.node !== name && !(node.raises || []).includes(e.err)) throw new Fault('UndeclaredRefusal', `${e.err} from ${e.node} reached ${name}, which does not declare raises ${e.err}`);
      throw e;
    }
  }

  // ---------- roots: a view is one root with everything it uses, merged ----------
  function resolve(graph, rootName) {
    const view = { root: rootName, consts: {}, nodes: {}, effects: {}, inv: {}, keys: {}, options: {}, numbers: null, roots: [], nodeRoot: {} };
    const seen = new Set();
    const visit = (rn) => {
      if (seen.has(rn)) return; seen.add(rn);
      const r = graph.roots[rn]; if (!r) throw new Error('unknown root ' + rn);
      r.uses.forEach(visit);
      view.roots.push(rn);
      if (view.numbers && r.numbers !== view.numbers) throw new Error(`root ${rn} uses numbers ${r.numbers}, view is ${view.numbers}`);
      view.numbers = r.numbers;
      for (const [k, v] of Object.entries(r.consts)) { if (k in view.consts && view.consts[k] !== v) throw new Error(`const ${k} conflicts in ${rn}`); view.consts[k] = v; }
      for (const [k, v] of Object.entries(r.effects)) view.effects[k] = v;
      for (const [k, v] of Object.entries(r.keys || {})) view.keys[k] = v;
      for (const [k, v] of Object.entries(r.options || {})) view.options[k] = v;
      for (const [k, v] of Object.entries(r.events || {})) (view.events = view.events || {})[k] = v;
      for (const [k, v] of Object.entries(r.inv)) view.inv[k] = v;
      for (const [k, v] of Object.entries(r.nodes)) { if (k in view.nodes) throw new Error(`node ${k} defined in both ${view.nodeRoot[k]} and ${rn}`); view.nodes[k] = v; view.nodeRoot[k] = rn; }
    };
    visit(rootName);
    return view;
  }

  // ---------- static analysis ----------
  function walk(e, visit) { if (Array.isArray(e)) { visit(e); e.slice(1).forEach(a => walk(a, visit)); } }
  function exprs(node) { return [...node.pre.map(p => p.expr), ...node.post, ...node.body.map(b => b.expr), node.out]; }
  // a node referenced by name in a call position, or by literal as map's function
  function refOf(view, x) { if (view.nodes[x[0]]) return x[0]; if ((x[0] === 'map' || x[0] === 'filter') && Array.isArray(x[1]) && x[1][0] === 'lit' && view.nodes[x[1][1]]) return x[1][1]; return null; }
  function callees(view, node) { const s = new Set(); [...exprs(node), ...node.inv.map(id => (view.inv[id] || {}).expr)].forEach(e => walk(e, x => { const r = refOf(view, x); if (r) s.add(r); })); return s; }
  function fxOf(view, es, memo, stack) {
    const fx = new Set();
    es.forEach(e => walk(e, x => {
      if (NATIVES[x[0]]) NATIVES[x[0]].fx.forEach(y => fx.add(y));
      const r = refOf(view, x); if (r) computedFx(view, r, memo, stack).forEach(y => fx.add(y));
    }));
    return fx;
  }
  // effects reachable from the body and out (the ceiling applies here)
  function computedFx(view, name, memo = {}, stack = new Set()) {
    if (memo[name]) return memo[name];
    if (stack.has(name)) throw new Error('cycle at ' + name);
    stack.add(name);
    const fx = fxOf(view, [...view.nodes[name].body.map(b => b.expr), view.nodes[name].out], memo, stack);
    stack.delete(name); memo[name] = fx; return fx;
  }
  // effects reachable from pre, post and attached invariants (must be empty)
  function contractFx(view, name) {
    const node = view.nodes[name];
    return fxOf(view, [...node.pre.map(p => p.expr), ...node.post, ...node.inv.map(id => (view.inv[id] || { expr: 0 }).expr)], {}, new Set());
  }
  function declaredFx(view, node) { const o = new Set(); node.fx.forEach(x => (view.effects[x] || [x]).forEach(y => o.add(y))); return o; }

  // which inputs does an expression depend on, through lets
  function deps(node, e, letDeps) {
    const s = new Set();
    const go = (x) => {
      if (typeof x === 'string') { const h = x.split('.')[0]; if (node.in.includes(h)) s.add(h); else if (letDeps[h]) letDeps[h].forEach(d => s.add(d)); }
      else if (Array.isArray(x)) { const [op, ...a] = x; if (op === 'rec' || op === 'with') { (op === 'with' ? [a[0]] : []).forEach(go); for (let i = op === 'with' ? 1 : 0; i < a.length; i += 2) go(a[i + 1]); } else a.forEach(go); }
    };
    go(e); return s;
  }
  function letDependencies(node) { const ld = {}; for (const b of node.body) ld[b.let] = deps(node, b.expr, ld); return ld; }
  // every input mentioned anywhere in the body, out or contracts (syntactic use, including effect requests)
  function usedInputs(node) {
    const ld = letDependencies(node);
    const letRefs = (e, acc) => { if (typeof e === 'string') { const h = e.split('.')[0]; if (ld[h] !== undefined) acc.add(h); } else if (Array.isArray(e)) e.slice(1).forEach(x => letRefs(x, acc)); return acc; };
    const live = new Set(); const stack = [...letRefs(node.out, new Set())];
    node.body.forEach(b => { let has = false; walk(b.expr, x => { if (NATIVES[x[0]] && NATIVES[x[0]].fx.length) has = true; }); if (has) stack.push(b.let); });
    while (stack.length) { const l = stack.pop(); if (live.has(l)) continue; live.add(l); const b = node.body.find(x => x.let === l); if (b) letRefs(b.expr, new Set()).forEach(x => stack.push(x)); }
    const s = new Set();
    const consider = (e) => deps(node, e, ld).forEach(d => s.add(d));
    // operational use only: out, pre, and lets that reach out or an effect. A post-only mention is not use.
    consider(node.out); node.pre.forEach(p => consider(p.expr));
    node.body.filter(b => live.has(b.let)).forEach(b => consider(b.expr));
    return { inputs: s, deadLets: node.body.filter(b => !live.has(b.let)).map(b => b.let) };
  }
  function literals(node) {
    const out = [];
    const leaf = (v) => { if (typeof v === 'number' && ![0, 1, -1].includes(v)) out.push(v); };
    [...node.body.map(b => b.expr), node.out].forEach(e => { leaf(e); walk(e, x => { const [op, ...a] = x; if (op === 'lit') return; a.forEach(leaf); }); });
    return out;
  }

  // ---------- identity ----------
  function resolveRefs(e, view, hashes) {
    if (!Array.isArray(e)) return e;
    const [op, ...a] = e; const r = a.map(x => resolveRefs(x, view, hashes));
    if ((op === 'map' || op === 'filter') && Array.isArray(a[0]) && a[0][0] === 'lit' && view.nodes[a[0][1]]) r[0] = ['lit', '#' + hashes[a[0][1]]];
    return [view.nodes[op] ? '#' + hashes[op] : op, ...r];
  }
  async function hashNative(op) { const n = NATIVES[op]; return (await sha256(canon({ native: op, says: n.says, fx: n.fx, ex: n.ex, impl: n.f.toString(), pre: n.pre ? n.pre.toString() : null, numeric: n.numeric !== false, exact: n.exact !== false }))).slice(0, 16); }
  async function hashNode(view, name, hashes = {}, stack = new Set()) {
    if (hashes[name]) return hashes[name];
    if (stack.has(name)) throw new Error('cycle at ' + name);
    stack.add(name);
    const node = view.nodes[name];
    for (const c of callees(view, node)) await hashNode(view, c, hashes, stack);
    const identity = {
      in: node.in, fx: [...declaredFx(view, node)].sort(), numbers: view.numbers,
      pre: node.pre, post: node.post, raises: (node.raises || []).slice().sort(), inv: node.inv.map(id => view.inv[id] ? view.inv[id].expr : id),
      body: node.body.map(b => ({ let: b.let, expr: resolveRefs(b.expr, view, hashes) })),
      out: resolveRefs(node.out, view, hashes), ex: node.ex, consts: view.consts
    };
    hashes[name] = (await sha256(canon(identity))).slice(0, 16);
    stack.delete(name); return hashes[name];
  }
  async function hashAll(view) { const h = {}; for (const n of Object.keys(view.nodes)) await hashNode(view, n, h); return h; }
  async function descriptionHash(view, name) { const node = view.nodes[name]; return (await sha256(canon({ says: node.says, inv: node.inv.map(id => (view.inv[id] || {}).says || id) }))).slice(0, 16); }
  async function hashRoot(graph, rn, rootHashes = {}) {
    if (rootHashes[rn]) return rootHashes[rn];
    const r = graph.roots[rn];
    const uses = {}; for (const u of r.uses) uses[u] = await hashRoot(graph, u, rootHashes);
    const view = resolve(graph, rn); const h = await hashAll(view);
    const own = {}; for (const n of Object.keys(r.nodes)) own[n] = h[n];
    rootHashes[rn] = (await sha256(canon({ name: rn, uses, numbers: r.numbers, consts: r.consts, inv: r.inv, effects: r.effects, nodes: own }))).slice(0, 16);
    return rootHashes[rn];
  }

  // ---------- examples ----------
  function checkAfter(view, node, env, ctx, ex, problems) {
    const pctx = Object.assign({}, ctx, { pure: true });
    const test = (label, e) => { let v; try { v = ev(e, env, pctx); } catch (err) { problems.push(`ContractEvaluationFault in ${label}: ${err.message}`); return; } if (typeof v !== 'boolean') problems.push(`ContractEvaluationFault: ${label} is not a Bool`); else if (!v) problems.push(`ContractViolation: ${label} false: ${JSON.stringify(e)}`); };
    (ex.check || []).forEach((c, i) => test(`check[${i}]`, c));
    node.post.forEach((p, i) => test(`post[${i}]`, p));
    node.inv.forEach(id => { if (!view.inv[id]) problems.push(`unknown invariant ${id}`); else test(`inv ${id} (${view.inv[id].says})`, view.inv[id].expr); });
  }
  function runExample(view, name, ex) {
    const node = view.nodes[name];
    const ctx = { view, effects: [], profile: view.profile || null };
    const problems = [];
    if (ex.seq) {
      let cur = ex.seq.initial, steps = 0;
      try {
        for (const part of ex.seq.over) {
          const args = Object.assign({}, part, { [ex.seq.field]: cur });
          const out = callNode(name, node.in.map(n => args[n]), ctx);
          checkAfter(view, node, Object.assign(scope(view), args, { out }), ctx, {}, problems);
          if (problems.length) { problems.unshift(`at step ${steps}`); break; }
          cur = ex.seq.from ? lookup(ex.seq.from, { out }) : out; steps++;
        }
        if (!problems.length) { const env = Object.assign(scope(view), { out: cur }); (ex.check || []).forEach((c, i) => { if (!ev(c, env, ctx)) problems.push(`final check[${i}] false: ${JSON.stringify(c)}`); }); }
      } catch (e) { problems.push(`step ${steps}: ${e.message}`); }
      return { problems, out: cur, effects: ctx.effects, steps };
    }
    let out, refused = null, fault = null;
    try { out = callNode(name, node.in.map(n => ex.args[n]), ctx); }
    catch (e) { if (e instanceof Refusal) refused = e; else if (e instanceof Fault) fault = e; else throw e; }
    const outcome = fault ? 'fault' : refused ? (refused.node === name ? 'refused' : 'propagated') : 'returned';
    if (ex.fault) {
      if (!fault) problems.push(`expected fault ${ex.fault}, got ${refused ? 'refusal ' + refused.err : 'a result'}`);
      else if (fault.kind !== ex.fault) problems.push(`expected fault ${ex.fault}, got ${fault.kind}`);
      return { problems, outcome, fault, effects: ctx.effects };
    }
    if (fault) { problems.push(`${fault.kind}: ${fault.message}`); return { problems, outcome, fault, effects: ctx.effects }; }
    if (ex.refuse) {
      if (!refused) problems.push(`expected refusal ${ex.refuse}, got a result`);
      else if (refused.err !== ex.refuse) problems.push(`expected refusal ${ex.refuse}, got ${refused.err}`);
      return { problems, outcome, refused: !!refused, effects: ctx.effects };
    }
    if (refused) { problems.push(`unexpected refusal: ${refused.err}`); return { problems, outcome, refused: true }; }
    const env = Object.assign(scope(view), ex.args, { out });
    if ('out' in ex && canon(out) !== canon(ex.out)) problems.push(`out ${canon(out)} ≠ expected ${canon(ex.out)}`);
    checkAfter(view, node, env, ctx, ex, problems);
    return { problems, outcome, refused: false, out, effects: ctx.effects };
  }

  const Engine = { canon, sha256, subtle, NATIVES, SPECIAL, Refusal, Fault, MAXI, ev, callNode, resolve, walk, exprs, callees, refOf, computedFx, contractFx, declaredFx, deps, letDependencies, usedInputs, literals, hashNode, hashAll, hashRoot, hashNative, descriptionHash, runExample };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
