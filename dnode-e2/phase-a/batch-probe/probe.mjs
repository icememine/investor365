// Probe harness: loads the verified kit read-only and runs supplier.from_csv on cases.
import fs from 'node:fs';import path from 'node:path';
const KIT=process.argv[2];
const {compile,Runtime,json}=await import(path.join(KIT,'dist/runtime/engine.js'));
const {verifyBundle}=await import(path.join(KIT,'dist/runtime/admission.js'));
const key=JSON.parse(fs.readFileSync(path.join(KIT,'dist/generated/trust-key.json'),'utf8'));
const {texts}=await verifyBundle(p=>fs.promises.readFile(path.join(KIT,'dist',p),'utf8'),key);
const g=compile(Object.entries(texts).filter(([p])=>p.startsWith('roots/')).map(([,s])=>s));
const rt=new Runtime(g,JSON.parse(texts['profiles/batch.json']));
const H='SKU,NAME,PRICE_VND,QTY_ON_HAND\n';
const run=(label,node,args)=>{try{const r=rt.run(node,args);console.log(label,'=> RETURN',json(r.out),'ops',rt.operations)}catch(e){console.log(label,'=> ',e.kind??'error',e.code,e.origin??'',e.message)}};
const cases={
 'B-T1':H+'PEN,"Blue, fine",020000,003\n',
 'B-T2a space':H+'PEN,Pen, 20000,1\n',
 'B-T2b 2^53':H+'PEN,Pen,9007199254740992,1\n',
 'B-T2c MAX':H+'PEN,Pen,9007199254740991,9007199254740991\n',
 'price0':H+'PEN,Pen,0,1\n',
 'qty empty':H+'PEN,Pen,1,\n',
 'B-T3 dup identical':H+'PEN,Pen,1,1\nPEN,Pen,1,1\n',
 'B-T4 quoted NL + dup':H+'A,"two\nlines",1,1\nPEN,Pen,1,1\nB,"x\r\ny",1,1\nPEN,Pen,1,1\n',
 'dup with 3-field row':H+'PEN,Pen,1\nPEN,Pen,1,1\n',
 'CRLF':'SKU,NAME,PRICE_VND,QTY_ON_HAND\r\nPEN,"say ""hi""",1,2\r\n',
 'no final NL':H+'PEN,Pen,1,1',
 'BOM':'﻿'+H+'PEN,Pen,1,1\n',
 'double BOM':'﻿﻿'+H+'PEN,Pen,1,1\n',
 'trailing blank line':H+'PEN,Pen,1,1\n\n',
 'header only':H,
 'empty':'',
 'bad header lower':'sku,NAME,PRICE_VND,QTY_ON_HAND\nPEN,Pen,1,1\n',
 'broken quote':H+'PEN,"Pen,1,1\n',
 'quote mid field':H+'PEN,Pe"n,1,1\n',
 'lone CR':H+'PEN,Pen,1,1\rX\n',
 'trailing comma':H+'PEN,Pen,1,1,\n',
 'lowercase sku':H+'pen,Pen,1,1\n',
 'name 121':H+'PEN,'+'é'.repeat(121)+',1,1\n',
 'name 120 astral':H+'PEN,'+'😀'.repeat(120)+',1,1\n',
 'sort order':H+'PEN_2,a,1,1\nPENA,b,1,1\nPEN2,c,1,1\nPEN-2,d,1,1\n',
 'negative/frac/exp/sep':H+'A,a,-1,1\nB,b,1.0,1\nC,c,1e3,1\nD,d,"1,000",1\nE,e,1,+1\n',
 'fullwidth digits':H+'A,a,１,1\n',
 'empty name quoted':H+'A,"",1,1\n',
};
for(const [k,v] of Object.entries(cases))run(k,'supplier.from_csv',[v]);
run('parse_decimal_nat 2^53','text.parse_decimal_nat',['9007199254740992']);
run('parse_decimal_nat " 2"','text.parse_decimal_nat',[' 2']);
// size/row limits
let rows=H;for(let i=0;i<10000;i++)rows+='P'+i+',N,1,1\n';
console.log('10000 rows bytes',Buffer.byteLength(rows));run('10000 rows (summary)','sequence.unique_text',[['x']]);
try{const r=rt.run('supplier.from_csv',[rows]);console.log('10000 rows => ok',r.out.ok,'n',r.out.rows.length,'ops',rt.operations)}catch(e){console.log('10000 rows =>',e.kind,e.code,e.message)}
try{const r=rt.run('supplier.from_csv',[rows+'Q,N,1,1\n']);console.log('10001 rows => ok',r.out.ok)}catch(e){console.log('10001 rows =>',e.kind,e.code,e.message)}
// invalid-scaling measured separately in scale-invalid.mjs

const big=H+'A,"'+'x'.repeat(1048576)+'",1,1\n';
run('>1MiB text','supplier.from_csv',[big]);
