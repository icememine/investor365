import {parse} from './parser.js';
import {Fault,Refusal,MAX,value,shape,canon,json,compare,exact,floor,csv} from './values.js';
export {Fault,Refusal,canon,json,parse};
const list=t=>({list:t});
const native=(input,output,f,meaning,failures=[])=>({input,output,f,meaning,failures,fx:[]});
export const natives={
 '+':native(['Int','Int'],'Int',(a,b)=>exact(BigInt(a)+BigInt(b)),'Exact addition; bounds checked after operation',['ArithmeticOverflow']),
 '-':native(['Int','Int'],'Int',(a,b)=>exact(BigInt(a)-BigInt(b)),'Exact subtraction',['ArithmeticOverflow']),
 '*':native(['Int','Int'],'Int',(a,b)=>exact(BigInt(a)*BigInt(b)),'Exact multiplication',['ArithmeticOverflow']),
 div:native(['Int','Int'],'Int',(a,b)=>exact(floor(a,b)),'Floor quotient',['DivideByZero']),
 mod:native(['Int','Int'],'Int',(a,b)=>exact(BigInt(a)-BigInt(b)*floor(a,b)),'Remainder with divisor sign or zero; exact internal intermediates',['DivideByZero']),
 neg:native(['Int'],'Int',a=>-a,'Negation'),abs:native(['Int'],'Int',Math.abs,'Absolute value'),min:native(['Int','Int'],'Int',Math.min,'Minimum'),max:native(['Int','Int'],'Int',Math.max,'Maximum'),
 '<':native(['Int','Int'],'Bool',(a,b)=>a<b,'Less than'),'<=':native(['Int','Int'],'Bool',(a,b)=>a<=b,'At most'),'>':native(['Int','Int'],'Bool',(a,b)=>a>b,'Greater than'),'>=':native(['Int','Int'],'Bool',(a,b)=>a>=b,'At least'),
 '==':native(['Any','Any'],'Bool',(a,b)=>canon(a)===canon(b),'Kind-sensitive structural equality'), '!=':native(['Any','Any'],'Bool',(a,b)=>canon(a)!==canon(b),'Structural inequality'),
 and:native(['Bool','Bool'],'Bool',(a,b)=>a&&b,'Eager Boolean conjunction'),or:native(['Bool','Bool'],'Bool',(a,b)=>a||b,'Eager Boolean disjunction'),not:native(['Bool'],'Bool',a=>!a,'Boolean negation'),
 len:native(['Any'],'Int',a=>{if(typeof a==='string')return Array.from(a).length;if(Array.isArray(a))return a.length;throw new Fault('InputShape','len')},'List length or Unicode scalar count'),
 at:native([list('Any'),'Int'],'Any',(a,i)=>{if(i<0||i>=a.length)throw new Refusal('IndexOutOfRange','at');return a[i]},'Zero-based indexed list access',['IndexOutOfRange']),
 slice:native([list('Any'),'Int','Int'],list('Any'),(a,b,e)=>{if(b<0||e<b||e>a.length)throw new Refusal('IndexOutOfRange','slice');return a.slice(b,e)},'Half-open bounded list slice',['IndexOutOfRange']),
 concat:native([list('Any'),list('Any')],list('Any'),(a,b)=>a.concat(b),'Ordered concatenation'),
 sum:native([list('Int')],'Int',a=>a.reduce((s,x)=>exact(BigInt(s)+BigInt(x)),0),'Left-to-right bounded accumulation, empty=0',['ArithmeticOverflow']),
 all:native([list('Bool')],'Bool',a=>a.every(Boolean),'All, empty=true'),any:native([list('Bool')],'Bool',a=>a.some(Boolean),'Any, empty=false'),
 contains:native(['Any',list('Any')],'Bool',(v,xs)=>xs.some(x=>canon(x)===canon(v)),'Structural membership'),
 duplicates:native([list('Text')],list('Text'),xs=>{const counts=new Map();xs.forEach(x=>counts.set(x,(counts.get(x)||0)+1));return [...counts].filter(x=>x[1]>1).map(x=>x[0])},'Distinct repeated strings in first occurrence order'),
 unique:native([list('Any')],list('Any'),a=>{const seen=new Set();return a.filter(x=>{const s=canon(x);if(seen.has(s))return false;seen.add(s);return true})},'Stable structural deduplication'),
 range:native(['Int'],list('Int'),n=>{if(n<0||n>10000)throw new Refusal('BadRange','range');return Array.from({length:n},(_,i)=>i)},'Integers 0..n-1, 0<=n<=10000',['BadRange']),
 str:native(['Int'],'Text',String,'Decimal integer string'),cat:native(['Text','Text'],'Text',(a,b)=>a+b,'Text concatenation'),
 matches:native(['Text','Text'],'Bool',(s,p)=>{if(p.length>128||s.length>1048576)throw new Fault('ResourceLimit');if(!['^[0-9]+$','^[A-Z0-9_-]{1,32}$'].includes(p))throw new Refusal('PatternNotAllowed','matches');return new RegExp(p).test(s)},'Two pinned ASCII validation patterns; no arbitrary regex',['PatternNotAllowed']),
 nat_fits:native(['Text'],'Bool',s=>/^[0-9]+$/.test(s)&&BigInt(s)<=BigInt(MAX),'Exact decimal-string range predicate; malformed=false'),
 decimal:native(['Text'],'Int',s=>{if(!/^[0-9]+$/.test(s))throw new Refusal('InvalidInteger','decimal');return exact(BigInt(s))},'ASCII natural decimal; no trim or sign',['InvalidInteger','ArithmeticOverflow']),
 sort_by:native([list('Any'),'Text'],list('Any'),(a,k)=>{for(const x of a)if(!x||typeof x!=='object'||!Object.hasOwn(x,k)||typeof x[k]!=='string')throw new Fault('InputShape','sort_by');return [...a].sort((x,y)=>compare(x[k],y[k]))},'Stable Unicode scalar-key sort'),
 csv:native(['Text'],list(list('Text')),csv,'Pinned UTF-8-decoded CSV dialect; 1MiB, 10000 rows plus header',['MalformedCSV','FileTooLarge','TooManyRows']),
 encode:native(['Any'],'Text',json,'Deterministic sorted-key JSON output; Unicode scalar key order'),
 emit:{...native(['Text','Any'],'Bool',()=>true,'Queue a typed capability intent; grant and payload checked before dispatch'),fx:['dynamic']}
};
Object.setPrototypeOf(natives,null);
const special=new Set(['lit','list','rec','with','if','map','filter','fold']);
function children(e){if(!Array.isArray(e)||e[0]==='lit')return [];if(e[0]==='rec')return e.filter((_,i)=>i>0&&i%2===0);if(e[0]==='with')return [e[1],...e.filter((_,i)=>i>1&&i%2===1)];return e.slice(1)}
function walk(e,f){if(!Array.isArray(e))return;f(e);children(e).forEach(x=>walk(x,f))}
function lookup(path,env){let v=env;for(const k of path.split('.')){if(!v||typeof v!=='object'||!Object.hasOwn(v,k))throw new Fault('Unbound',path);v=v[k]}return v}
export function compile(sources){const roots=sources.map(parse),rmap=new Map();for(const r of roots){if(rmap.has(r.name))throw new Fault('DuplicateRoot',r.name);rmap.set(r.name,r)}const types=Object.create(null),consts=Object.create(null),nodes=Object.create(null),ordered=[],seen=new Set(),active=new Set();
 const visit=r=>{if(active.has(r.name))throw new Fault('DependencyCycle',r.name);if(seen.has(r.name))return;active.add(r.name);for(const u of r.uses){if(!rmap.has(u))throw new Fault('MissingRoot',u);visit(rmap.get(u))}active.delete(r.name);seen.add(r.name);ordered.push(r);};roots.forEach(visit);
 for(const r of ordered)for(const [target,source] of [[types,r.types],[consts,r.consts],[nodes,r.nodes]])for(const [k,v] of Object.entries(source)){if(Object.hasOwn(target,k)||Object.hasOwn(natives,k))throw new Fault('DuplicateDefinition',k);target[k]=v;if(target===nodes)v.root=r.name}
 const constOwner=Object.fromEntries(roots.flatMap(r=>Object.keys(r.consts).map(k=>[k,r.name])));const typeOwner=Object.fromEntries(roots.flatMap(r=>Object.keys(r.types).map(k=>[k,r.name])));const reachable=new Map();const closure=name=>{if(reachable.has(name))return reachable.get(name);const set=new Set([name]);for(const u of rmap.get(name).uses)for(const v of closure(u))set.add(v);reachable.set(name,set);return set};roots.forEach(r=>closure(r.name));
 const fxMemo=Object.create(null),depMemo=Object.create(null),stack=new Set();
 const analyze=name=>{if(depMemo[name])return;if(stack.has(name))throw new Fault('DependencyCycle',name);stack.add(name);const n=nodes[name],refs=new Set(),fx=new Set();
 if(!n.output||!Object.hasOwn(n,'out')||new Set(n.args).size!==n.args.length||Object.keys(n.input).length!==n.args.length||n.args.some(k=>!Object.hasOwn(n.input,k)))throw new Fault('MissingSignature',name);
 if(n.args.some(k=>Object.hasOwn(consts,k)||k==='out'))throw new Fault('DuplicateBinding',name);const baseBindings=new Set([...Object.keys(consts).filter(k=>reachable.get(n.root).has(constOwner[k])),...n.args]);const bindings=new Set(baseBindings);
 const checkRefs=(e,scope)=>{if(typeof e==='string'&&!scope.has(e.split('.')[0]))throw new Fault('UnknownBinding',name+':'+e);for(const child of children(e))checkRefs(child,scope)};
 const checkTypeImports=t=>{if(typeof t==='string'){if(typeOwner[t]&&!reachable.get(n.root).has(typeOwner[t]))throw new Fault('MissingImport',t);return}if(t?.list)checkTypeImports(t.list);if(t?.fields)Object.values(t.fields).forEach(checkTypeImports)};Object.values(n.input).forEach(checkTypeImports);checkTypeImports(n.output);
 n.pre.forEach(p=>checkRefs(p.expr,baseBindings));n.post.forEach(p=>checkRefs(p,new Set([...baseBindings,'out'])));n.inv.forEach(p=>checkRefs(p,new Set([...baseBindings,'out'])));let executionScope=new Set(baseBindings);for(const b of n.body){checkRefs(b.expr,executionScope);executionScope.add(b.name)}checkRefs(n.out,executionScope);for(const b of n.body){if(bindings.has(b.name)||b.name==='out')throw new Fault('DuplicateBinding',b.name);bindings.add(b.name)}
 const scan=(e,contract=false)=>{walk(e,x=>{const op=x[0];if(op==='if'&&x.length!==4)throw new Fault('Arity',op);if(natives[op]&&x.length-1!==natives[op].input.length)throw new Fault('Arity',op);if(nodes[op]&&x.length-1!==nodes[op].args.length)throw new Fault('Arity',op);if(!special.has(op)&&!natives[op]&&!nodes[op])throw new Fault('UnknownNative',op);let dep=nodes[op]?op:null;
 if(['map','filter','fold'].includes(op)){if(!Array.isArray(x[1])||x[1][0]!=='lit'||typeof x[1][1]!=='string'||!nodes[x[1][1]])throw new Fault('StaticReferenceRequired');dep=x[1][1];if(x.length-2!==nodes[dep].args.length)throw new Fault('Arity',op+':'+dep)}
 if(dep){if(!reachable.get(n.root).has(nodes[dep].root))throw new Fault('MissingImport',dep);refs.add(dep);analyze(dep);for(const f of fxMemo[dep]){if(contract)throw new Fault('ContractEffect',name);fx.add(f)}}
 if(op==='emit'){if(!Array.isArray(x[1])||x[1][0]!=='lit'||typeof x[1][1]!=='string')throw new Fault('StaticCapabilityRequired');if(contract)throw new Fault('ContractEffect',name);fx.add(x[1][1]);}})};
 n.pre.forEach(p=>scan(p.expr,true));n.post.forEach(e=>scan(e,true));n.inv.forEach(e=>scan(e,true));n.body.forEach(b=>scan(b.expr));scan(n.out);
 if([...fx].some(f=>!n.fx.includes(f)))throw new Fault('EffectCeiling',name);
 const ld=Object.create(null),deps=e=>{if(typeof e==='string'){let h=e.split('.')[0];return new Set(n.args.includes(h)?[h]:(ld[h]??[]))}let d=new Set();children(e).forEach(x=>deps(x).forEach(v=>d.add(v)));return d};
 for(const b of n.body)ld[b.name]=deps(b.expr);const used=new Set([...deps(n.out),...n.pre.flatMap(p=>[...deps(p.expr)])]);
 for(const b of n.body){let effect=false;walk(b.expr,x=>{if(x[0]==='emit'||(nodes[x[0]]&&fxMemo[x[0]]?.size))effect=true;else if(['map','filter','fold'].includes(x[0])&&fxMemo[x[1]?.[1]]?.size)effect=true});if(effect)deps(b.expr).forEach(v=>used.add(v))}
 for(const a of n.args)if(!used.has(a))throw new Fault('UnusedInput',name+'.'+a);n.dependencies=[...refs].sort();stack.delete(name);depMemo[name]=true;fxMemo[name]=fx;};
 Object.keys(nodes).forEach(analyze);return {roots,types,consts,nodes};}
export class Runtime{
 constructor(graph,profile,{observe}={}){this.graph=graph;this.profile=profile;this.observe=observe;this.operations=0;this.shapeCache=new WeakMap();this.validateTypes();for(const op of profile.natives??[])if(!Object.hasOwn(natives,op))throw new Fault('UnknownNative',op);for(const n of Object.values(graph.nodes))for(const e of [...n.pre.map(p=>p.expr),...n.post,...n.inv,...n.body.map(b=>b.expr),n.out])walk(e,x=>{if(natives[x[0]]&&!profile.natives.includes(x[0]))throw new Fault('UnknownNative',x[0])});}
 validateTypes(){const check=(t,path=[])=>{if(typeof t==='string'){if(['Any','Int','Text','Bool'].includes(t))return;if(path.includes(t)||!this.graph.types[t])throw new Fault('TypeDefinition',t);return check(this.graph.types[t],[...path,t])}if(t?.list)return check(t.list,path);if(t?.fields){for(const v of Object.values(t.fields))check(v,path);return}if(t?.enum){t.enum.forEach(x=>value(x));return}throw new Fault('TypeDefinition')};for(const n of Object.values(this.graph.nodes)){Object.values(n.input).forEach(t=>check(t));check(n.output)}}
 run(name,args=[]){this.operations=0;this.shapeCache=new WeakMap();const ctx={pure:false,effects:[],depth:0};try{value(args);const out=this.call(name,args,ctx);this.validateEffects(ctx.effects);return {out,effects:ctx.effects}}catch(e){ctx.effects.length=0;throw e}}
 matches(v,t){if(!v||typeof v!=='object')return shape(v,t,this.graph.types);let cache=this.shapeCache.get(v);if(!cache){cache=new Map();this.shapeCache.set(v,cache)}if(cache.has(t))return cache.get(t);const valid=shape(v,t,this.graph.types);cache.set(t,valid);return valid;}
 validateEffects(es){for(const e of es){const c=this.profile.capabilities?.[e.capability];if(!this.profile.grants?.includes(e.capability)||!c)throw new Fault('CapabilityDenied',e.capability);if(!this.matches(e.payload,c))throw new Fault('EffectPayload',e.capability)}}
 contract(e,env,ctx){try{const v=this.eval(e,env,{...ctx,pure:true});if(typeof v!=='boolean')throw new Fault('ContractBoolean');return v}catch(e){throw new Fault('ContractEvaluationFault',e.code??e.message)}}
 call(name,args,ctx){if(++ctx.depth>128)throw new Fault('ResourceLimit','depth');const n=this.graph.nodes[name];if(!n)throw new Fault('UnknownNode',name);try{
 if(args.length!==n.args.length||args.some((v,i)=>!this.matches(v,n.input[n.args[i]])))throw new Fault('InputShape',name);
 const env=Object.assign(Object.create(null),this.graph.consts);n.args.forEach((k,i)=>env[k]=args[i]);for(const p of n.pre)if(!this.contract(p.expr,env,ctx))throw new Refusal(p.code,name);
 for(const b of n.body)env[b.name]=this.eval(b.expr,env,ctx);const out=this.eval(n.out,env,ctx);value(out);if(!this.matches(out,n.output))throw new Fault('ResultShape',name);
 const cenv=Object.assign(Object.create(null),this.graph.consts,Object.fromEntries(n.args.map((k,i)=>[k,args[i]])),{out});for(const p of [...n.post,...n.inv])if(!this.contract(p,cenv,ctx))throw new Fault('ContractViolation',name);
 this.observe?.(name,args,out);return out;
 }catch(e){if(e instanceof Refusal&&e.origin!==name&&!n.raises.includes(e.code))throw new Fault('UndeclaredRefusal',name+':'+e.code);throw e}finally{ctx.depth--}}
 eval(e,env,ctx){if(++this.operations>(this.profile.maxOperations??2000000))throw new Fault('ResourceLimit','operations');if(typeof e==='string')return lookup(e,env);if(typeof e==='number'||typeof e==='boolean')return e;if(!Array.isArray(e))throw new Fault('Expression');const [op,...a]=e;
 if(op==='lit')return a[0];if(op==='if'){const b=this.eval(a[0],env,ctx);if(typeof b!=='boolean')throw new Fault('InputShape','if');return this.eval(b?a[1]:a[2],env,ctx)}
 if(op==='list')return a.map(x=>this.eval(x,env,ctx));if(op==='rec'||op==='with'){let r=Object.create(null),i=0;if(op==='with'){const b=this.eval(a[0],env,ctx);if(!b||typeof b!=='object'||Array.isArray(b))throw new Fault('InputShape','with');Object.assign(r,b);i=1}for(;i<a.length;i+=2){if(typeof a[i]!=='string')throw new Fault('RecordKey');r[a[i]]=this.eval(a[i+1],env,ctx)}return r}
 if(['map','filter','fold'].includes(op)){const name=a[0][1],xs=this.eval(a[1],env,ctx);if(!Array.isArray(xs))throw new Fault('InputShape',op);const tail=a.slice(2).map(x=>this.eval(x,env,ctx));if(op==='fold'){let acc=tail[0];for(const x of xs)acc=this.call(name,[acc,x,...tail.slice(1)],ctx);return acc}let out=[];for(const x of xs){let y=this.call(name,[x,...tail],ctx);if(op==='map')out.push(y);else {if(typeof y!=='boolean')throw new Fault('InputShape','filter result');if(y)out.push(x)}}return out}
 const args=a.map(x=>this.eval(x,env,ctx));if(this.graph.nodes[op])return this.call(op,args,ctx);const n=natives[op];if(!n||!this.profile.natives.includes(op))throw new Fault('UnknownNative',op);if(args.length!==n.input.length||args.some((v,i)=>!this.matches(v,n.input[i])))throw new Fault('InputShape',op);
 if(op==='emit'){if(ctx.pure)throw new Fault('EffectNotAllowed');ctx.effects.push({capability:args[0],payload:args[1]});return true}
 let out;try{out=n.f(...args)}catch(e){if(e instanceof Refusal)e.origin=op;throw e}value(out);if(!this.matches(out,n.output))throw new Fault('NativeResultShape',op);return out;}
}
