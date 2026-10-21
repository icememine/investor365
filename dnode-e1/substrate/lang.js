/* lang.js — the text surface. Parses .node files (the authoring form) into the graph (the identity form).
 *
 * Top level:        root <name> | use <root> | numbers exact|float | effect <Bundle> <label>... |
 *                   const <K> <int> | inv <ID> "<says>" (expr) |
 *                   key <name> <KeyCode>... (a boolean the runtime puts in keys) | option <name> <value>... (a choice the runtime puts in keys)
 * Inside a node:    node <name> (<in>...)   then indented lines:
 *                   says "..." | demo | fx <Bundle|label>... | fx none | raises <Err>... | pre (expr) <Err> | post (expr) |
 *                   inv <ID>... | let <x> (expr) | out (expr) |
 *                   ex {args} -> <data> | ex {args} check (expr)... | ex {args} refuse <Err> |
 *                   seq <field> <data> [from <out.path>] over [<partial args>...] check (expr)...
 * Expressions:      (op a b)  numbers  true/false  "string literal"  name.path  [list]  {k v ...}
 */
'use strict';

function tokenize(line) {
  const toks = []; let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === ';') break;
    if (/\s/.test(c)) { i++; continue; }
    if ('()[]{}'.includes(c)) { toks.push({ t: c }); i++; continue; }
    if (c === '"') {
      // escapes: \" \\ \n \t ; an unterminated string is an error
      let j = i + 1, s = '';
      while (j < line.length && line[j] !== '"') { if (line[j] === '\\' && j + 1 < line.length) { const e = line[j + 1]; s += e === 'n' ? '\n' : e === 't' ? '\t' : e; j += 2; } else s += line[j++]; }
      if (j >= line.length) throw new Error('unterminated string');
      toks.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    let j = i; while (j < line.length && !/[\s()\[\]{};"]/.test(line[j])) j++;
    toks.push({ t: 'atom', v: line.slice(i, j) }); i = j;
  }
  return toks;
}

// reads one s-expression tree: {k:'num'|'bool'|'str'|'sym'|'list'|'vec'|'map', ...}
function readOne(toks, pos) {
  const t = toks[pos];
  if (!t) throw new Error('unexpected end');
  if (t.t === 'str') return [{ k: 'str', v: t.v }, pos + 1];
  if (t.t === 'atom') {
    if (/^-?\d+(\.\d+)?$/.test(t.v)) return [{ k: 'num', v: Number(t.v) }, pos + 1];
    if (t.v === 'true' || t.v === 'false') return [{ k: 'bool', v: t.v === 'true' }, pos + 1];
    return [{ k: 'sym', v: t.v }, pos + 1];
  }
  const close = { '(': ')', '[': ']', '{': '}' }[t.t];
  if (!close) throw new Error('unexpected ' + t.t);
  const items = []; let p = pos + 1;
  while (toks[p] && toks[p].t !== close) { const [x, np] = readOne(toks, p); items.push(x); p = np; }
  if (!toks[p]) throw new Error('unclosed ' + t.t);
  return [{ k: { '(': 'list', '[': 'vec', '{': 'map' }[t.t], items }, p + 1];
}
function readAll(toks) { const out = []; let p = 0; while (p < toks.length) { const [x, np] = readOne(toks, p); out.push(x); p = np; } return out; }

// tree → expression (graph form)
function toExpr(n) {
  switch (n.k) {
    case 'num': case 'bool': return n.v;
    case 'str': return ['lit', n.v];
    case 'sym': return n.v;
    case 'vec': return ['list', ...n.items.map(toExpr)];
    case 'map': { const r = ['rec']; for (let i = 0; i < n.items.length; i += 2) { r.push(n.items[i].v, toExpr(n.items[i + 1])); } return r; }
    case 'list': return [n.items[0].v, ...n.items.slice(1).map(toExpr)];
  }
}
// tree → plain data (for example arguments and expected values)
function toData(n) {
  switch (n.k) {
    case 'num': case 'bool': case 'str': return n.v;
    case 'sym': return n.v;
    case 'vec': return n.items.map(toData);
    case 'map': { const r = {}; for (let i = 0; i < n.items.length; i += 2) r[n.items[i].v] = toData(n.items[i + 1]); return r; }
    default: throw new Error('expression where data expected');
  }
}

function parse(text, fileName) {
  const root = { name: null, uses: [], numbers: 'exact', effects: {}, consts: {}, inv: {}, keys: {}, options: {}, nodes: {} };
  let node = null, lineNo = 0;
  for (const raw of text.split('\n')) {
    lineNo++;
    const line = raw.replace(/\t/g, '    ');
    if (!line.trim() || line.trim().startsWith(';')) continue;
    const indented = /^\s/.test(line);
    let items;
    try { items = readAll(tokenize(line)); } catch (e) { throw new Error(`${fileName}:${lineNo}: ${e.message}`); }
    const head = items[0].v, rest = items.slice(1);
    const fail = (m) => { throw new Error(`${fileName}:${lineNo}: ${m}`); };
    if (!indented) {
      node = null;
      switch (head) {
        case 'root': root.name = rest[0].v; break;
        case 'use': root.uses.push(rest[0].v); break;
        case 'numbers': root.numbers = rest[0].v; break;
        case 'effect': root.effects[rest[0].v] = rest.slice(1).map(x => x.v); break;
        case 'const': root.consts[rest[0].v] = rest[1].v; break;
        case 'key': root.keys[rest[0].v] = rest.slice(1).map(x => x.v); break;
        case 'option': root.options[rest[0].v] = rest.slice(1).map(x => x.v); break;
        case 'event': (root.events = root.events || {})[rest[0].v] = rest.slice(1).map(x => x.v); break;
        case 'inv': root.inv[rest[0].v] = { says: rest[1].v, expr: toExpr(rest[2]) }; break;
        case 'node':
          node = { says: '', in: rest[1].items.map(x => x.v), fx: [], raises: [], pre: [], post: [], inv: [], err: [], body: [], out: null, ex: [], line: lineNo };
          root.nodes[rest[0].v] = node; break;
        default: fail('unknown directive ' + head);
      }
      continue;
    }
    if (!node) fail('indented line outside a node');
    switch (head) {
      case 'says': node.says = rest[0].v; break;
      case 'fx': node.fx = rest.map(x => x.v).filter(x => x !== 'none'); break;
      case 'raises': node.raises = rest.map(x => x.v); break;
      case 'demo': node.demo = true; break;
      case 'pre': if (!rest[1]) fail('pre needs an error name'); node.pre.push({ expr: toExpr(rest[0]), err: rest[1].v }); if (!node.err.includes(rest[1].v)) node.err.push(rest[1].v); break;
      case 'post': node.post.push(toExpr(rest[0])); break;
      case 'inv': node.inv.push(...rest.map(x => x.v)); break;
      case 'let': node.body.push({ let: rest[0].v, expr: toExpr(rest[1]) }); break;
      case 'out': node.out = toExpr(rest[0]); break;
      case 'ex': {
        const ex = { args: toData(rest[0]) };
        const kw = rest[1] && rest[1].v;
        if (kw === '->') ex.out = toData(rest[2]);
        else if (kw === 'check') ex.check = rest.slice(2).map(toExpr);
        else if (kw === 'refuse') ex.refuse = rest[2].v;
        else if (kw === 'fault') ex.fault = rest[2].v;
        else fail('ex needs ->, check, refuse or fault');
        node.ex.push(ex); break;
      }
      case 'seq': {
        // seq <field> <initial> [from <out.path>] over [<partial args>...] [check (expr)...]
        let i = 2; const ex = { seq: { field: rest[0].v, initial: toData(rest[1]) } };
        if (rest[i] && rest[i].v === 'from') { ex.seq.from = rest[i + 1].v; i += 2; }
        if (!rest[i] || rest[i].v !== 'over') fail('seq needs over');
        ex.seq.over = toData(rest[i + 1]); i += 2;
        if (rest[i] && rest[i].v === 'check') ex.check = rest.slice(i + 1).map(toExpr);
        node.ex.push(ex); break;
      }
      default: fail('unknown node directive ' + head);
    }
  }
  if (!root.name) throw new Error(fileName + ': no root');
  for (const [n, nd] of Object.entries(root.nodes)) if (nd.out === null) throw new Error(`${fileName}: node ${n} has no out`);
  return root;
}

// graph form → text (the rendering a person reads; the inverse of parse for expressions)
function showExpr(e) {
  if (typeof e === 'string') return e;
  if (typeof e === 'number' || typeof e === 'boolean') return String(e);
  const [op, ...a] = e;
  if (op === 'lit') return JSON.stringify(a[0]);
  if (op === 'list') return '[' + a.map(showExpr).join(' ') + ']';
  if (op === 'rec') { const p = []; for (let i = 0; i < a.length; i += 2) p.push(a[i] + ' ' + showExpr(a[i + 1])); return '{' + p.join(' ') + '}'; }
  return '(' + [op, ...a.map(showExpr)].join(' ') + ')';
}

module.exports = { parse, showExpr, tokenize, readAll, toExpr, toData };
