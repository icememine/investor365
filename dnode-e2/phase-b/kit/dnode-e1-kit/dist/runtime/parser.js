// DNode E1 text surface: prefix expressions, quoted data strings, balanced continuation.
export function tokens(s) {
 const out=[]; let i=0;
 while(i<s.length){if(/\s/.test(s[i])){i++;continue} if(s[i]===';') {while(i<s.length&&s[i]!=='\n')i++;continue}
 if('(){}[]'.includes(s[i])){out.push(s[i++]);continue}
 if(s[i]==='"'){let j=i+1;while(j<s.length){if(s[j]==='\\'){j+=2;continue}if(s[j++]==='"')break}const raw=s.slice(i,j);out.push({text:JSON.parse(raw)});i=j;continue}
 let j=i;while(j<s.length&&!/[\s(){}\[\];]/.test(s[j]))j++;out.push(s.slice(i,j));i=j;
 }return out;
}
export function expression(s,data=false){let ts=tokens(s),i=0;
 const read=(literal=false)=>{const t=ts[i++];if(t===undefined)throw Error('Parse: incomplete expression');if(typeof t==='object')return literal?t.text:['lit',t.text];
 if(t==='('){if(literal)throw Error('Parse: computation in data');const op=ts[i++];if(typeof op!=='string')throw Error('Parse: operation');const a=[];while(ts[i]!==')'){if(i>=ts.length)throw Error('Parse: unclosed call');a.push(read())}i++;return [op,...a]}
 if(t==='['){const a=[];while(ts[i]!==']'){if(i>=ts.length)throw Error('Parse: unclosed list');a.push(read(literal))}i++;return literal?a:['list',...a]}
 if(t==='{'){const pairs=[],obj=Object.create(null),seen=new Set();while(ts[i]!=='}'){if(i>=ts.length)throw Error('Parse: unclosed record');let k=ts[i++];k=typeof k==='object'?k.text:k;if(typeof k!=='string'||seen.has(k))throw Error('Parse: duplicate/bad key');seen.add(k);const v=read(literal);pairs.push(k,v);obj[k]=v}i++;return literal?obj:['rec',...pairs]}
 if([')',']','}'].includes(t))throw Error('Parse: unexpected delimiter');if(t==='true'||t==='false')return t==='true';if(/^-?\d+$/.test(t)){const n=Number(t);if(!Number.isSafeInteger(n))throw Error('Parse: integer outside I');return n===0?0:n}if(literal)throw Error('Parse: quote data strings: '+t);return t};
 const v=read(data);if(i!==ts.length)throw Error('Parse: trailing tokens');return v;
}
function statements(src){const out=[];let buf='',stack=[],str=false,esc=false;
 for(const raw of src.split('\n')){const line=raw.trim();if(!buf&&(line===''||line.startsWith(';')))continue;buf+=(buf?'\n':'')+line;
 for(let j=0;j<line.length;j++){let c=line[j];if(str){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')str=false;continue}if(c===';')break;if(c==='"'){str=true;continue}if('([{'.includes(c))stack.push(c);if(')]}'.includes(c)){const o=stack.pop();if('([{'.indexOf(o)!==')]}'.indexOf(c))throw Error('Parse: mismatched delimiter')}}
 if(!str&&!stack.length){out.push(buf);buf=''}}if(buf||str||stack.length)throw Error('Parse: unbalanced continuation');return out;}
export function parse(src){let root=null,node=null;const unique=(obj,k)=>{if(Object.hasOwn(obj,k))throw Error('Parse: duplicate '+k)};
 for(const line of statements(src)){const m=line.match(/^(\S+)(?:\s+([\s\S]*))?$/),key=m[1],rest=m[2]??'';
 if(key==='root'){if(root)throw Error('Parse: one root per file');root={name:rest,uses:[],types:Object.create(null),consts:Object.create(null),nodes:Object.create(null)};continue}if(!root)throw Error('Parse: missing root');
 if(key==='use'){root.uses.push(rest);continue}if(key==='numbers'){if(rest!=='exact')throw Error('Parse: only exact');continue}
 if(key==='type'||key==='const'){let a=rest.indexOf(' '),name=rest.slice(0,a),value=rest.slice(a+1);const obj=key==='type'?root.types:root.consts;unique(obj,name);obj[name]=key==='type'?JSON.parse(value):expression(value,true);continue}
 if(key==='node'){const n=rest.match(/^([\w.]+)\s*\(([^)]*)\)$/);if(!n)throw Error('Parse: node signature');unique(root.nodes,n[1]);node={name:n[1],args:n[2].trim()?n[2].trim().split(/\s+/):[],input:{},output:null,fx:[],raises:[],pre:[],post:[],inv:[],body:[],examples:[],says:'',relation:'',domain:'',failure:'',execution:''};root.nodes[node.name]=node;continue}
 if(!node)throw Error('Parse: no node');
 if(['says','relation','domain','failure','execution'].includes(key)){node[key]=JSON.parse(rest);continue}
 if(key==='in'){node.input=JSON.parse(rest);continue}if(key==='returns'){node.output=JSON.parse(rest);continue}
 if(key==='fx'||key==='raises'){node[key]=rest==='none'?[]:rest.split(/\s+/);continue}
 if(key==='pre'){const p=rest.lastIndexOf(' ');node.pre.push({code:rest.slice(p+1),expr:expression(rest.slice(0,p))});continue}
 if(key==='post'||key==='inv'){node[key].push(expression(rest));continue}
 if(key==='let'){const p=rest.indexOf(' ');node.body.push({name:rest.slice(0,p),expr:expression(rest.slice(p+1))});continue}
 if(key==='out'){node.out=expression(rest);continue}if(key==='ex'){node.examples.push(JSON.parse(rest));continue}throw Error('Parse: unknown directive '+key);
 }if(!root)throw Error('Parse: empty');return root;
}
