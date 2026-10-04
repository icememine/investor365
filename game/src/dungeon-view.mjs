// Hầm Ma renderer and pointer input. Draws the dungeon simulation; never changes rules itself.
import {TILE, MAP_W, MAP_H, ENEMIES, SLOTS} from './dungeon.mjs';
import {paintDungeonFloor, paintSheetGhost, paintSkeleton, paintLanternGhost, paintMrD} from './art.mjs';

export const RARITY_COLOR={common:'#e6e9e4',magic:'#7fb6ff',rare:'#ffd36b',legendary:'#ff9d4d'};
const CANDY=['#f3889c','#a0ead4','#ffd36b','#c3a7ed'];

export function createDungeonView(canvas,ctx,{atlas,crops,zombie,neck}){
 const art={sheet:paintSheetGhost(),skeleton:paintSkeleton(),lantern:paintLanternGhost(),mrd:paintMrD()};
 const fog=document.createElement('canvas');fog.width=MAP_W;fog.height=MAP_H;const fg=fog.getContext('2d');
 const shade=document.createElement('canvas'),sg=shade.getContext('2d');
 let dg=null,floorArt=null,floorSeed=null,camera={scale:1,x:0,y:0},mouse=null,hold=false,holdTimer=0,elapsed=0,box={width:1,height:1},mobile=false;

 const toWorld=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/camera.scale+camera.x,y:(e.clientY-r.top)/camera.scale+camera.y};};
 const enemyAt=pt=>dg.live().filter(e=>Math.hypot(e.x-pt.x,e.y-20-pt.y)<e.r+18).sort((a,b)=>Math.hypot(a.x-pt.x,a.y-pt.y)-Math.hypot(b.x-pt.x,b.y-pt.y))[0];
 const dropAt=pt=>dg.drops.filter(d=>(d.kind==='item'||d.kind==='quest')&&(Math.hypot(d.x-pt.x,d.y-pt.y)<22||(d.labelBox&&pt.x>d.labelBox.x&&pt.x<d.labelBox.x+d.labelBox.w&&pt.y>d.labelBox.y&&pt.y<d.labelBox.y+d.labelBox.h))).sort((a,b)=>Math.hypot(a.x-pt.x,a.y-pt.y)-Math.hypot(b.x-pt.x,b.y-pt.y))[0];

 // Closest visible performer within range, for touch auto-aim.
 function autoAim(range){if(!dg)return null;const p=dg.p;let best=null;for(const e of dg.live()){const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<range&&(!best||d<best.d))best={d,e};}return best?{x:best.e.x,y:best.e.y-10}:null;}

 function sprite(img,crop,x,y,height,face,alpha=1,squash=1){
  const width=crop[2]/crop[3]*height;ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(x,y,width*.35,4,0,0,Math.PI*2);ctx.fill();ctx.translate(x,y);if(Math.cos(face)<-.15)ctx.scale(-1,1);ctx.scale(1,squash);ctx.drawImage(img,...crop,-width/2,-height,width,height);ctx.restore();
 }
 const full=c=>[0,0,c.width,c.height];
 function drawEnemy(e){
  const bob=Math.sin(elapsed*6+e.id)*2,a=e.state==='defeated'?Math.max(0,e.t/.8):1,lift=e.state==='defeated'?(1-a)*20:0;
  const squash=e.state==='windup'?1-Math.min(.12,(e.windupBase-e.t)*.2):1;
  if(e.type==='sheet')sprite(art.sheet,full(art.sheet),e.x,e.y-lift,46,e.face,a,squash);
  else if(e.type==='skeleton')sprite(art.skeleton,full(art.skeleton),e.x,e.y-lift,62,e.face,a,squash);
  else if(e.type==='lantern')sprite(art.lantern,full(art.lantern),e.x,e.y-14+bob-lift,42,e.face,a);
  else if(e.type==='zombie')sprite(zombie,[0,0,42,82],e.x,e.y-lift,96,e.face,a,squash);
  else if(e.type==='vampire')sprite(atlas,crops[3],e.x,e.y-lift,100,e.face,a,squash);
  else if(e.type==='neck')sprite(neck,[0,0,44,114],e.x,e.y-10+bob-lift,118,e.face,a);
  if(e.flash>0){ctx.save();ctx.globalAlpha=.5;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(e.x,e.y-e.r*2,e.r*1.2,e.r*2,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(e.stun>0&&e.state!=='defeated'){ctx.fillStyle='#ffe5ad';for(let i=0;i<3;i++){const t=elapsed*4+i*2.1;ctx.fillRect(e.x+Math.cos(t)*12-1.5,e.y-60+Math.sin(t)*4,3,3);}}
 }
 function telegraphs(){
  for(const e of dg.live()){
   if(e.type==='zombie'&&e.state==='windup'){const k=1-e.t/e.windupBase;ring(e.x,e.y,e.range,'#f3889c',2);ctx.fillStyle=`rgba(243,136,156,${.12+.2*k})`;ctx.beginPath();ctx.arc(e.x,e.y,e.range*k,0,Math.PI*2);ctx.fill();}
   else if(e.type==='vampire'&&e.state==='aim'){ctx.save();ctx.strokeStyle='#f3889cb0';ctx.lineWidth=e.r*2;ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(e.dashA)*280,e.y+Math.sin(e.dashA)*280);ctx.stroke();ctx.restore();}
   else if(e.state==='windup'&&!ENEMIES[e.type].ranged){ctx.save();ctx.fillStyle='#f3889c55';ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,e.range+14,e.face-.7,e.face+.7);ctx.closePath();ctx.fill();ctx.restore();}
   else if(e.state==='windup'){ring(e.x,e.y-34,10+(e.windupBase-e.t)*20,'#a0ead4',2);}
  }
  for(const m of dg.marks){const k=Math.max(0,m.t);ctx.fillStyle=`rgba(0,0,0,${.5-.3*Math.min(1,k)})`;ctx.beginPath();ctx.ellipse(m.x,m.y,40,13,0,0,Math.PI*2);ctx.fill();ring(m.x,m.y,46,'#f3889c',2);ring(m.x,m.y,46*Math.min(1,k),'#f3889c80',1);}
 }
 function ring(x,y,r,color,w=1.5){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke();}
 function label(x,y,text,color,bg='#07131de6'){ctx.font='11px system-ui';ctx.textAlign='center';const w=ctx.measureText(text).width+12;ctx.fillStyle=bg;ctx.fillRect(x-w/2,y-13,w,17);ctx.fillStyle=color;ctx.fillText(text,x,y);return{x:x-w/2,y:y-13,w,h:17};}
 function drops(){
  for(const d of dg.drops){
   if(d.kind==='gold'){ctx.fillStyle='#e7c083';ctx.beginPath();ctx.arc(d.x,d.y-3,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(d.x+5,d.y,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff2c2';ctx.fillRect(d.x-1,d.y-5,2,2);}
   else if(d.kind==='potion'){if(d.potion==='bread'){ctx.fillStyle='#f4ead2';ctx.beginPath();ctx.ellipse(d.x,d.y-4,7,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d8c39a';ctx.fillRect(d.x-3,d.y-8,6,2);}else{ctx.fillStyle='#2e3f63';ctx.fillRect(d.x-3,d.y-12,6,12);ctx.fillStyle='#e7c083';ctx.fillRect(d.x-3,d.y-12,6,4);}}
   else if(d.kind==='quest'){const col=d.quest==='stamp'?'#f3889c':'#ffd36b',bob=Math.sin(elapsed*3)*2;ctx.save();ctx.globalAlpha=.3+.15*Math.sin(elapsed*3);ctx.fillStyle=col;ctx.fillRect(d.x-3,d.y-90,6,90);ctx.restore();
    if(d.quest==='stamp'){ctx.fillStyle='#5b3a26';ctx.fillRect(d.x-3,d.y-22+bob,6,10);ctx.fillStyle='#7c5435';ctx.beginPath();ctx.arc(d.x,d.y-24+bob,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c23b3b';ctx.fillRect(d.x-8,d.y-12+bob,16,7);ctx.fillStyle='#f3889c';ctx.fillRect(d.x-8,d.y-12+bob,16,2);}
    else{ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(d.x-6,d.y-14+bob,5,0,Math.PI*2);ctx.stroke();ctx.fillStyle=col;ctx.fillRect(d.x-1,d.y-15+bob,13,3);ctx.fillRect(d.x+8,d.y-13+bob,2,5);ctx.fillRect(d.x+4,d.y-13+bob,2,4);}}
   else{const col=RARITY_COLOR[d.item.rarity];ctx.save();ctx.globalAlpha=.25+.1*Math.sin(elapsed*3);ctx.fillStyle=col;ctx.fillRect(d.x-2,d.y-60,4,60);ctx.restore();ctx.fillStyle=col;ctx.fillRect(d.x-6,d.y-6,12,8);ctx.fillStyle='#07131d';ctx.fillRect(d.x-4,d.y-4,8,4);}
  }
 }
 function fixtures(){
  const f=dg.floor,s=f.stairs,u=f.exitUp;
  ctx.fillStyle='#05090f';ctx.fillRect(s.x-22,s.y-18,44,36);for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#1b2733':'#24323f';ctx.fillRect(s.x-20+i*3,s.y-16+i*8,40-i*6,6);}
  ctx.strokeStyle=dg.stairsLocked?'#f3889c':'#a0ead4';ctx.lineWidth=2;ctx.strokeRect(s.x-22,s.y-18,44,36);
  if(dg.stairsLocked){ctx.fillStyle='#f3889c';ctx.fillRect(s.x-5,s.y-4,10,8);ctx.strokeStyle='#f3889c';ctx.beginPath();ctx.arc(s.x,s.y-5,4,Math.PI,0);ctx.stroke();}
  ctx.fillStyle='#5b3a26';for(let i=0;i<5;i++)ctx.fillRect(u.x-10,u.y-34+i*8,20,2);ctx.fillRect(u.x-12,u.y-36,3,40);ctx.fillRect(u.x+9,u.y-36,3,40);
  if(f.door&&!f.doorOpen){for(const i of f.door.tiles){const x=(i%MAP_W)*TILE,y=Math.floor(i/MAP_W)*TILE;ctx.fillStyle='#3a2418';ctx.fillRect(x,y,TILE,TILE);ctx.fillStyle='#7c5435';ctx.fillRect(x+3,y+3,TILE-6,TILE-6);ctx.fillStyle='#5b3a26';ctx.fillRect(x+TILE/2-1,y+3,2,TILE-6);ctx.fillStyle='#b08a4a';ctx.fillRect(x+3,y+8,TILE-6,3);ctx.fillRect(x+3,y+TILE-11,TILE-6,3);}
   const k=f.door;ctx.fillStyle='#ffd36b';ctx.fillRect(k.x-6,k.y-4,12,10);ctx.strokeStyle='#ffd36b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(k.x,k.y-5,4,Math.PI,0);ctx.stroke();ctx.fillStyle='#3a2418';ctx.fillRect(k.x-1,k.y-1,2,4);}
  if(dg.vendor){const v=dg.vendor;ctx.fillStyle='#3a2418';ctx.fillRect(v.x-30,v.y-92,3,86);ctx.fillRect(v.x+27,v.y-92,3,86);ctx.fillStyle='#c23b3b';ctx.fillRect(v.x-34,v.y-98,68,10);ctx.fillStyle='#f4f1e6';for(let i=0;i<8;i+=2)ctx.fillRect(v.x-34+i*8.5,v.y-98,8.5,10);}
 }
 function projectiles(){for(const q of dg.projectiles){if(q.kind==='candy'){ctx.fillStyle=CANDY[q.hue];ctx.beginPath();ctx.arc(q.x,q.y,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(q.x-1,q.y-3,2,2);}else if(q.kind==='orb'){ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#a0ead4';ctx.beginPath();ctx.arc(q.x,q.y,11,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle='#e9fff6';ctx.beginPath();ctx.arc(q.x,q.y,5,0,Math.PI*2);ctx.fill();}else{const a=Math.atan2(q.vy,q.vx),w=Math.sin(elapsed*20)*4;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(a);ctx.fillStyle='#2a1f33';ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,-6-w);ctx.lineTo(-2,0);ctx.lineTo(-4,6+w);ctx.closePath();ctx.fill();ctx.restore();}}}
 function effects(){for(const fx of dg.effects){const k=(fx.until-dg.time)/(fx.strong?.5:.3);if(fx.kind==='cone'){ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(fx.x,fx.y-20,4,fx.x,fx.y-20,fx.range);g.addColorStop(0,`rgba(235,255,225,${(fx.strong?.7:.5)*Math.min(1,k)})`);g.addColorStop(1,'rgba(200,255,225,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(fx.x,fx.y-20);ctx.arc(fx.x,fx.y-20,fx.range,fx.face-fx.spread,fx.face+fx.spread);ctx.closePath();ctx.fill();ctx.restore();}else{ctx.save();ctx.globalAlpha=Math.min(1,k);ring(fx.x,fx.y,fx.r*(1.1-k*.1),fx.color,3);ctx.restore();}}}
 function lighting(){
  // Unexplored tiles are black; explored ones stay dimly visible; the player's light reveals the rest.
  const img=fg.createImageData(MAP_W,MAP_H);for(let i=0;i<MAP_W*MAP_H;i++){img.data[i*4+3]=dg.explored[i]?0:255;}fg.putImageData(img,0,0);
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(fog,0,0,MAP_W*TILE,MAP_H*TILE);ctx.restore();
  const dpr=Math.min(window.devicePixelRatio||1,2);if(shade.width!==canvas.width||shade.height!==canvas.height){shade.width=canvas.width;shade.height=canvas.height;}
  sg.setTransform(1,0,0,1,0,0);sg.globalCompositeOperation='source-over';sg.clearRect(0,0,shade.width,shade.height);sg.fillStyle='rgba(3,8,16,.78)';sg.fillRect(0,0,shade.width,shade.height);
  sg.globalCompositeOperation='destination-out';const p=dg.p,s=camera.scale*dpr,px=(p.x-camera.x)*s,py=(p.y-20-camera.y)*s,radius=250*s;
  const g=sg.createRadialGradient(px,py,radius*.35,px,py,radius);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');sg.fillStyle=g;sg.fillRect(0,0,shade.width,shade.height);
  for(const fx of dg.effects)if(fx.kind==='cone'){const fx0=(fx.x-camera.x)*s,fy0=(fx.y-20-camera.y)*s;sg.fillStyle='rgba(0,0,0,.8)';sg.beginPath();sg.moveTo(fx0,fy0);sg.arc(fx0,fy0,fx.range*s,fx.face-fx.spread,fx.face+fx.spread);sg.closePath();sg.fill();}
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(shade,0,0);ctx.restore();
 }
 function overlays(){
  for(const e of dg.live()){if(!e.aggro&&!e.elite&&!e.boss)continue;const w=e.boss?0:30,y=e.y-(e.type==='sheet'?54:e.type==='lantern'?66:e.type==='skeleton'?70:0);if(!e.boss){ctx.fillStyle='#0a1520';ctx.fillRect(e.x-w/2,y,w,4);ctx.fillStyle=e.elite?'#7fb6ff':'#a0ead4';ctx.fillRect(e.x-w/2,y,w*e.hp/e.maxHp,4);}if(e.elite)label(e.x,y-6,e.name,'#7fb6ff');}
  for(const c of dg.companions){if(c.state==='away')continue;const max=dg.companionMax(),y=c.y-74;label(c.x,y-6,c.name,'#cfe8ff','#07131db0');if(c.courage<max){ctx.fillStyle='#0a1520';ctx.fillRect(c.x-14,y,28,3);ctx.fillStyle='#f3889c';ctx.fillRect(c.x-14,y,28*Math.max(0,c.courage)/max,3);}}
  for(const d of dg.drops)if(d.kind==='item'){d.labelBox=label(d.x,d.y-16,d.item.name,RARITY_COLOR[d.item.rarity]);}else if(d.kind==='quest')label(d.x,d.y-34,d.quest==='stamp'?`Con dấu tầng ${dg.depth}`:'Chìa khóa đồng',d.quest==='stamp'?'#f3889c':'#ffd36b');
  for(const f of dg.floaters){const k=1-(f.until-dg.time)/(f.life||1.1);ctx.font=`bold ${f.size}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#061421';const rise=f.life>2?8:24;ctx.fillText(f.text,f.x+1,f.y-k*rise+1);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y-k*rise);}
  const n=dg.nearby();if(n)label(dg.p.x,dg.p.y-86,(mobile?'':'E · ')+n.label,'#ffe5ad');
 }
 function hud(){
  const dpr=Math.min(window.devicePixelRatio||1,2);ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  // Boss bar.
  const boss=dg.live().find(e=>e.boss&&e.aggro);
  if(boss){const w=Math.min(420,box.width-40),x=(box.width-w)/2,y=12;ctx.fillStyle='#07131de6';ctx.fillRect(x-2,y-2,w+4,24);ctx.fillStyle='#3a1820';ctx.fillRect(x,y,w,20);ctx.fillStyle='#c23b5a';ctx.fillRect(x,y,w*boss.hp/boss.maxHp,20);ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(`${boss.name} · bình tĩnh ${Math.ceil(boss.hp)}/${boss.maxHp}`,box.width/2,y+14);}
  // Minimap of explored tiles.
  const s=mobile?1.6:2.4,mw=MAP_W*s,mh=MAP_H*s,mx=box.width-mw-10,my=boss?50:30;
  ctx.fillStyle='#03070dcc';ctx.fillRect(mx-3,my-3,mw+6,mh+6);
  for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){const i=y*MAP_W+x;if(dg.explored[i]&&dg.floor.tiles[i]){ctx.fillStyle='#2b4a58';ctx.fillRect(mx+x*s,my+y*s,s,s);}}
  const st=dg.floor.stairs,sx=Math.floor(st.x/TILE),sy=Math.floor(st.y/TILE);if(dg.explored[sy*MAP_W+sx]){ctx.fillStyle=dg.stairsLocked?'#f3889c':'#a0ead4';ctx.fillRect(mx+sx*s-2,my+sy*s-2,s+4,s+4);}
  const seen=pt=>dg.explored[Math.floor(pt.y/TILE)*MAP_W+Math.floor(pt.x/TILE)];
  for(const d of dg.drops)if(d.kind==='quest'&&seen(d)){ctx.fillStyle=d.quest==='stamp'?'#f3889c':'#ffd36b';ctx.fillRect(mx+d.x/TILE*s-2,my+d.y/TILE*s-2,4,4);}
  const door=dg.floor.door;if(door&&!dg.floor.doorOpen&&seen(door)){ctx.strokeStyle='#ffd36b';ctx.lineWidth=1;ctx.strokeRect(mx+door.x/TILE*s-3,my+door.y/TILE*s-3,6,6);}
  for(const e of dg.live())if(e.aggro){ctx.fillStyle='#f3889c';ctx.fillRect(mx+e.x/TILE*s-1,my+e.y/TILE*s-1,2,2);}
  ctx.fillStyle='#ffe5ad';ctx.fillRect(mx+dg.p.x/TILE*s-2,my+dg.p.y/TILE*s-2,4,4);
  ctx.font='10px system-ui';ctx.textAlign='right';ctx.fillStyle='#b8d6d6';ctx.fillText(`TẦNG ${dg.depth} · ${dg.floor.theme.name.toUpperCase()}`,mx+mw,my+mh+14);
  if(dg.p.hurt>0){const g=ctx.createRadialGradient(box.width/2,box.height/2,box.height*.3,box.width/2,box.height/2,box.width*.7);g.addColorStop(0,'rgba(243,136,156,0)');g.addColorStop(1,`rgba(243,136,156,${dg.p.hurt*1.4})`);ctx.fillStyle=g;ctx.fillRect(0,0,box.width,box.height);}
  ctx.restore();
 }

 return{
  attach(d){dg=d;floorSeed=null;hold=false;},
  detach(){dg=null;hold=false;},
  autoAim,
  get mouse(){return mouse;},
  step(dt){elapsed+=dt;if(hold&&mouse&&dg){holdTimer-=dt;if(holdTimer<=0){holdTimer=.18;if(!dg.p.target&&!dg.p.pickTarget)dg.moveTo(mouse.x,mouse.y);}}},
  pointerDown(e){
   if(!dg)return;mouse=toWorld(e);
   if(e.button===2){dg.cast('candy',mouse);return;}
   const enemy=enemyAt(mouse);if(enemy){dg.attackTarget(enemy.id);return;}
   const drop=dropAt(mouse);if(drop){dg.pickUp(drop.id);return;}
   dg.moveTo(mouse.x,mouse.y);if(e.pointerType==='mouse'){hold=true;holdTimer=.18;}
  },
  pointerMove(e){if(dg)mouse=toWorld(e);},
  pointerUp(){hold=false;},
  draw(dt){
   box=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2),cw=Math.round(box.width*dpr),ch=Math.round(box.height*dpr);
   if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
   mobile=matchMedia('(pointer:coarse), (max-width:900px)').matches;
   if(!dg)return;
   const artKey=dg.floor.seed+':'+dg.floor.doorOpen;if(floorSeed!==artKey){floorArt=paintDungeonFloor(dg.floor,MAP_W,MAP_H,TILE);floorSeed=artKey;}
   // About 26 tiles across on desktop, 15 on a phone in portrait.
   const target=mobile&&box.width<box.height*1.3?480:Math.min(840,Math.max(560,box.width*.75)),scale=box.width/target;
   const vw=box.width/scale,vh=box.height/scale;camera={scale,x:dg.p.x-vw/2,y:dg.p.y-20-vh/2};
   ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#03070d';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.setTransform(scale*dpr,0,0,scale*dpr,-camera.x*scale*dpr,-camera.y*scale*dpr);ctx.imageSmoothingEnabled=false;
   ctx.drawImage(floorArt,0,0,MAP_W*TILE,MAP_H*TILE);
   fixtures();drops();telegraphs();effects();
   const p=dg.p,actors=[...dg.enemies.map(e=>({y:e.y,e})),...dg.companions.filter(c=>c.state!=='away').map(c=>({y:c.y,c})),{y:p.y,p:true}];if(dg.vendor)actors.push({y:dg.vendor.y,v:true});actors.sort((a,b)=>a.y-b.y);
   for(const a of actors){if(a.c){const c=a.c,bob=c.moving?Math.sin(elapsed*13+c.sprite)*1.6:0;sprite(atlas,crops[c.sprite],c.x,c.y+bob,62,c.face,c.hurt>0?.6:1);continue;}if(a.e)drawEnemy(a.e);else if(a.v){const v=dg.vendor;sprite(art.mrd,full(art.mrd),v.x,v.y-10,70,Math.PI);ctx.fillStyle='#5b3a26';ctx.fillRect(v.x-30,v.y-30,60,30);ctx.fillStyle='#7c5435';ctx.fillRect(v.x-30,v.y-32,60,5);ctx.fillStyle='#e7c083';ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillText('BÁNH BAO · PIN',v.x,v.y-12);}else sprite(atlas,crops[0],p.x,p.y,68,p.face,p.dash>0?.55:1);}
   projectiles();lighting();overlays();hud();
  },
 };
}

// HTML for the bag and shop dialogs. The app wires the buttons by their data attributes.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function itemCard(item,actions=''){if(!item)return'<div class="item empty">Trống</div>';return`<div class="item" style="--rarity:${RARITY_COLOR[item.rarity]}"><b>${esc(item.name)}</b><small>${esc(SLOTS[item.slot].label)} · ${esc(item.rarityName)} · cấp ${item.ilvl}</small><span>${esc(describeStat(item))}</span>${item.affixes.map(a=>`<span>${esc(a)}</span>`).join('')}${actions}</div>`;}
function describeStat(item){const b=item.base;return item.slot==='torch'?`${b.dmg} sát thương`:item.slot==='coat'?`${b.armor} giáp`:item.slot==='charm'?`+${b.battery} pin tối đa`:`+${b.speed}% tốc chạy`;}
export function bagHtml(dg){
 const d=dg.derived;
 return`<span class="eyebrow">TÚI ĐỒ · CẤP ${dg.p.level}</span><h2>Đồ nghề đi hầm</h2>
 <p class="stats-line">Sát thương ${Math.round(d.damage)} · Chí mạng ${Math.round(d.crit*100)}% · Giáp ${d.armor} · Can đảm ${d.maxCourage} · Pin ${d.maxBattery} · Tốc ${Math.round(d.speed)}</p>
 <div class="items">${Object.keys(SLOTS).map(k=>itemCard(dg.equipped[k])).join('')}</div>
 <h3>Bạn đồng hành</h3><div class="items">${dg.companions.map(c=>`<div class="item" style="--rarity:#cfe8ff"><b>${c.name}</b><small>${c.id==='na'?'Ném kẹo · cổ vũ khi bạn sợ':'Rọi điện thoại · đánh hơi con dấu, chìa khóa'}</small><span>Tin tưởng ${Math.round(c.trust)}/100</span><span>${c.state==='away'?`Đang nghỉ ngoài cửa (${Math.ceil(c.awayT)} giây)`:`Can đảm ${Math.max(0,Math.round(c.courage))}/${dg.companionMax()}`}</span></div>`).join('')}</div>
 <h3>Trong túi (${dg.inventory.length}/16)</h3>
 <div class="items">${dg.inventory.map((it,i)=>itemCard(it,`<div class="item-actions"><button data-equip="${i}">Trang bị</button><button data-drop="${i}">Vứt</button></div>`)).join('')||'<p>Túi trống. Hạ màn diễn viên để nhặt đồ.</p>'}</div>
 <div class="dialog-actions"><button id="resume">Quay lại hầm</button></div>`;
}
export function shopHtml(dg){
 return`<span class="eyebrow">QUẦY MR. D</span><h2>Bánh bao, pin, mua đồ cũ</h2><p>Bạn có ${dg.p.gold} xu.</p>
 <div class="dialog-actions"><button data-buy="bread" ${dg.p.gold<20?'disabled':''}>Mua bánh bao (+can đảm) · 20 xu · đang có ${dg.potions.bread}</button><button data-buy="battery" ${dg.p.gold<20?'disabled':''}>Mua pin AA (+pin) · 20 xu · đang có ${dg.potions.battery}</button></div>
 <h3>Bán đồ trong túi</h3><div class="items">${dg.inventory.map((it,i)=>itemCard(it,`<div class="item-actions"><button data-sell="${i}">Bán · ${it.value} xu</button></div>`)).join('')||'<p>Không có gì để bán.</p>'}</div>
 <div class="dialog-actions"><button id="resume">Quay lại hầm</button></div>`;
}
