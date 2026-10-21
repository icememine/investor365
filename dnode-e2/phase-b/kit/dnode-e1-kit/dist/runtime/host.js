import {Fault,canon} from './engine.js';
// Generic session transaction boundary. App transitions are invoked inside the lock.
export class SessionStore {
 constructor(key='dnode-e1-session'){this.key=key}
 async transaction(fn){if(!navigator.locks)throw new Fault('HostUnsupported','Web Locks required');return navigator.locks.request(this.key,async()=>{const raw=localStorage.getItem(this.key);const store=raw?JSON.parse(raw):{state:null,bank:{},mode:'accept'};const result=await fn(store);localStorage.setItem(this.key,JSON.stringify(store));return result})}
}
export function simulatedBank(effect,store){const p=effect.payload;store.bank??={};
 if(effect.capability==='payment.charge'){if(typeof p.id!=='string'||!Number.isSafeInteger(p.amount)||p.amount<=0)throw new Fault('EffectPayload');const previous=Object.hasOwn(store.bank,p.id)?store.bank[p.id]:undefined;if(previous&&previous.amount!==p.amount)throw new Fault('IntentConflict');const entry=previous??{amount:p.amount,status:store.mode==='decline'?'declined':'confirmed'};Object.defineProperty(store.bank,p.id,{value:entry,enumerable:true,writable:true,configurable:true});return store.mode==='lost'?'unknown':entry.status}
 if(effect.capability==='payment.inquire'){if(store.mode==='unavailable')return 'unknown';return Object.hasOwn(store.bank,p.id)?store.bank[p.id].status:'unknown'}throw new Fault('CapabilityDenied');}
export async function dispatch(runtime,effects,handler){runtime.validateEffects(effects);const results=[];for(const e of effects){runtime.validateEffects([e]);results.push(await handler(e))}return results}
export function stableEqual(a,b){return canon(a)===canon(b)}
