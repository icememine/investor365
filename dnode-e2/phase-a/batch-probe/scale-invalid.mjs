import fs from 'node:fs';import path from 'node:path';
const KIT=process.argv[2];const N=process.argv.slice(3).map(Number);
const {compile,Runtime}=await import(path.join(KIT,'dist/runtime/engine.js'));
const {verifyBundle}=await import(path.join(KIT,'dist/runtime/admission.js'));
const key=JSON.parse(fs.readFileSync(path.join(KIT,'dist/generated/trust-key.json'),'utf8'));
const {texts}=await verifyBundle(p=>fs.promises.readFile(path.join(KIT,'dist',p),'utf8'),key);
const g=compile(Object.entries(texts).filter(([p])=>p.startsWith('roots/')).map(([,s])=>s));
const rt=new Runtime(g,JSON.parse(texts['profiles/batch.json']));
for(const n of N){let t='SKU,NAME,PRICE_VND,QTY_ON_HAND\n';for(let i=0;i<n;i++)t+="P"+(i%Math.max(1,n>>1))+",N,x,1\n";const s=Date.now();try{const r=rt.run('supplier.from_csv',[t]);console.log(n,'rows ok',r.out.ok,r.out.rows.length,'ops',rt.operations,'ms',Date.now()-s)}catch(e){console.log(n,'rows',e.kind,e.code,e.message,'ms',Date.now()-s)}}
