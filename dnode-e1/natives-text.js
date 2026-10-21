/* natives-text.js — text and CSV natives for the batch and panel profiles, plus file.export.
 * Each native carries a contract (pre), a description and examples; the checker runs them through dispatch.
 * Loaded by engine.js at startup; identities are pinned in natives.lock.json like every other native. */
module.exports = function (N, Fault, canon) {
  const DQ = '"';
  return {
    'csv_records': N('splits a whole CSV text into records of fields: LF or CRLF between records, commas between fields, double quotes enclose a field and may contain commas, newlines and doubled quotes; a leading BOM is dropped; a quote that is never closed refuses',
      (text) => {
        let t = String(text); if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
        const recs = []; let rec = [], cur = '', q = false, i = 0;
        while (i < t.length) {
          const ch = t[i];
          if (q) { if (ch === DQ) { if (t[i + 1] === DQ) { cur += DQ; i += 2; continue; } q = false; i++; continue; } cur += ch; i++; continue; }
          if (ch === DQ) { q = true; i++; continue; }
          if (ch === ',') { rec.push(cur); cur = ''; i++; continue; }
          if (ch === '\r' && t[i + 1] === '\n') { rec.push(cur); recs.push(rec); rec = []; cur = ''; i += 2; continue; }
          if (ch === '\n') { rec.push(cur); recs.push(rec); rec = []; cur = ''; i++; continue; }
          cur += ch; i++;
        }
        if (cur !== '' || rec.length) { rec.push(cur); recs.push(rec); }
        return recs;
      },
      { numeric: false,
        pre: (text) => { const t = String(text); let q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === DQ) { if (t[i + 1] === DQ) i++; else q = false; } } else if (ch === DQ) q = true; } return !q || 'BrokenQuote'; },
        ex: [
          [['a,b\nc,d'], [['a', 'b'], ['c', 'd']]],
          [['a,b\r\nc,d\r\n'], [['a', 'b'], ['c', 'd']]],
          [['x,"one, two"\ny,"line\nbreak"'], [['x', 'one, two'], ['y', 'line\nbreak']]],
          [['s,"say ""hi"""'], [['s', 'say "hi"']]],
          [['﻿h1,h2\n1,2'], [['h1', 'h2'], ['1', '2']]],
          [[''], []],
          [['a,b,,'], [['a', 'b', '', '']]]
        ] }),
    'text_cmp': N('compares two texts by Unicode scalar sequence: −1, 0 or 1',
      (a, b) => { const A = [...String(a)], B = [...String(b)]; const n = Math.min(A.length, B.length); for (let i = 0; i < n; i++) { const x = A[i].codePointAt(0), y = B[i].codePointAt(0); if (x !== y) return x < y ? -1 : 1; } return A.length === B.length ? 0 : (A.length < B.length ? -1 : 1); },
      { numeric: false, ex: [[['a', 'b'], -1], [['b', 'a'], 1], [['a', 'a'], 0], [['10', '9'], -1], [['', 'a'], -1], [['NB-01', 'NB-02'], -1]] }),
    'is_digits': N('true when the text is one or more ASCII digits and nothing else',
      (t) => /^[0-9]+$/.test(String(t)),
      { numeric: false, ex: [[['0012'], true], [['12 '], false], [['-1'], false], [[''], false], [['１２'], false], [['1.5'], false]] }),
    'scalars': N('the number of Unicode scalar values in a text',
      (t) => [...String(t)].length,
      { numeric: false, ex: [[['abc'], 3], [['é'], 1], [['😀'], 1], [[''], 0]] }),
    'is_sku_text': N('true when the text is 1 to 32 uppercase ASCII letters, digits, hyphens or underscores',
      (t) => /^[A-Z0-9_-]{1,32}$/.test(String(t)),
      { numeric: false, ex: [[['NB-01'], true], [['nb-01'], false], [[''], false], [['A'.repeat(32)], true], [['A'.repeat(33)], false], [['A B'], false]] }),
    'strip_zeros': N('a digit string without leading zeros; "0" stays "0"',
      (t) => { const s = String(t).replace(/^0+/, ''); return s === '' ? '0' : s; },
      { numeric: false, ex: [[['0012'], '12'], [['0'], '0'], [['000'], '0'], [['12'], '12']] }),
    'encode': N('the pinned export encoding of a value as text: the substrate\'s canonical form, keys sorted, no whitespace, exact numbers',
      (v) => canon(v),
      { numeric: false, ex: [[[{ b: 2, a: 1 }], '{"a":1,"b":2}'], [[[1, 'x', true]], '[1,"x",true]'], [[[]], '[]'], [[{ sku: 'A', name: 'Tote "canvas"' }], '{"name":"Tote \\"canvas\\"","sku":"A"}'], [[0], '0']] }),
    'file.export': N('hands a named text file to the host for the person to save',
      (name, text, ctx) => { if (ctx.pure) throw new Fault('EffectNotAllowed', 'file.export inside a contract'); ctx.effects.push(['file.export', { name, text }]); return true; },
      { fx: ['file.export'], numeric: false, wantsCtx: true, ex: [] })
  };
};
