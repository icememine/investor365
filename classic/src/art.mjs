// Procedural pixel art for rooms without hand-made assets yet (placeholder until art production).
// Everything is painted once into offscreen canvases from the same room data the simulation
// collides against, so what you see always matches where you can walk.
// Pixels are 2 world units: a 1000 × 562 room is a 500 × 281 canvas drawn with smoothing off.

const C={
 night:'#0a1424',sky0:'#0f2036',sky1:'#15304a',sky2:'#1b3c55',hill:'#0d2230',star:'#cfe8e0',moon:'#e6f0d6',moonShade:'#c4d6bd',
 wall:'#1c3836',wallDark:'#132827',stone:'#56697a',stoneLight:'#7b90a0',stoneDark:'#34424f',stoneEdge:'#26313b',
 grass:'#1d3933',grassLight:'#28493f',grassDark:'#152b28',dirt:'#232f37',dirtDark:'#1a242b',flag:'#3c4c58',flagLight:'#4a5c69',
 wood:'#5b3a26',woodLight:'#7c5435',woodDark:'#3a2418',woodGap:'#1f140e',red:'#8e2b33',redDark:'#62202a',
 mint:'#a0ead4',mintSoft:'#5fb39f',bone:'#d8d6c4',iron:'#0e1a22',coat:'#3a3340',coatDark:'#28232e',
};

// Small deterministic RNG so the painted room is identical on every load.
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return[c,g];}
// Pen in world units on a 2-unit pixel grid, offset by (ox,oy) world units.
function pen(g,ox=0,oy=0){
 const P=v=>Math.round(v/2);
 const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(P(x-ox),P(y-oy),Math.max(1,P(w)),Math.max(1,P(h)));};
 const disc=(cx,cy,r,c)=>{for(let y=-r;y<=r;y+=2){const half=Math.sqrt(Math.max(0,r*r-y*y));rect(cx-half,cy+y,half*2,2,c);}};
 return{rect,disc};
}

function paintSky(g,rand){
 const {rect,disc}=pen(g);
 const bands=[C.sky0,C.sky1,C.sky2];
 for(let y=30;y<200;y+=2)for(let x=54;x<946;x+=2){const band=(y-30)/170*2.4+rand()*.5;rect(x,y,2,2,bands[Math.min(2,Math.floor(band))]);}
 for(let i=0;i<70;i++){const x=60+rand()*880,y=34+rand()*120;rect(x,y,2,2,rand()<.2?C.mint:C.star);}
 disc(300,96,40,'#16344a');disc(300,96,34,C.moon);disc(312,88,8,C.moonShade);disc(290,108,6,C.moonShade);disc(318,110,4,C.moonShade);
 // Far hills and two dead trees painted on the backdrop.
 for(let x=54;x<946;x+=2){const h=172+Math.sin(x/70)*10+Math.sin(x/23)*4;rect(x,h,2,206-h,C.hill);}
 const tree=(tx,base,scale)=>{rect(tx-4,base-70*scale,8,70*scale,C.iron);const branch=(x,y,dx,dy,n)=>{for(let i=0;i<n;i++)rect(x+dx*i,y+dy*i,4,4,C.iron);};branch(tx,base-60*scale,6,-4,6*scale);branch(tx,base-50*scale,-6,-4,5*scale);branch(tx+20*scale,base-80*scale,4,-6,3*scale);branch(tx-20*scale,base-68*scale,-4,-6,3*scale);};
 tree(150,205,1);tree(640,205,1.2);tree(530,205,.7);
}

function paintWall(g,rand){
 const {rect}=pen(g);
 // Iron fence in front of the mural, then a low stone wall.
 for(let x=60;x<940;x+=18){rect(x,172,4,40,C.iron);rect(x-2,168,8,4,C.iron);rect(x,164,4,4,C.iron);}
 rect(54,180,892,4,C.iron);rect(54,200,892,4,C.iron);
 for(let y=208,row=0;y<240;y+=10,row++)for(let x=54+(row%2)*14;x<946;x+=28){rect(x,y,26,8,rand()<.5?C.stone:C.stoneDark);rect(x,y,26,2,C.stoneLight);}
 paintFrame(g);
}

// Room frame: top border and side walls, like the dining room.
function paintFrame(g){
 const {rect}=pen(g);
 rect(0,0,1000,30,C.night);for(let x=10;x<990;x+=30){rect(x,12,26,14,C.stoneDark);rect(x,12,26,4,C.stone);}
 for(const sx of [0,946]){rect(sx,0,54,562,C.wallDark);for(let y=30;y<540;y+=28){rect(sx+14,y,26,24,C.stoneDark);rect(sx+14,y,26,4,C.stone);}}
}

function paintArch(g){
 const {rect,disc}=pen(g);
 rect(856,150,92,92,C.stoneDark);disc(902,160,46,C.stoneDark);
 rect(866,166,72,76,'#05090f');disc(902,170,36,'#05090f');
 for(let i=0;i<5;i++){rect(870,200+i*8,64,6,i%2?C.redDark:C.red);}
 for(let a=0;a<12;a++){const t=Math.PI*(a/11),x=902-Math.cos(t)*42,y=164-Math.sin(t)*42;rect(x-5,y-5,10,10,a%2?C.stone:C.stoneLight);}
 rect(856,170,10,72,C.stone);rect(938,170,10,72,C.stone);
}

function paintLantern(g,x,y){
 const {rect,disc}=pen(g);
 for(let r=60;r>8;r-=10){g.globalAlpha=.05;disc(x,y+6,r,C.mint);}g.globalAlpha=1;
 rect(x-8,y-14,16,4,C.woodDark);rect(x-6,y-10,12,22,C.woodDark);rect(x-4,y-8,8,18,C.mint);rect(x-2,y-6,4,8,'#e9fff6');rect(x-8,y+12,16,4,C.woodDark);
}

function paintCoat(g,x){
 const {rect}=pen(g);
 rect(x-14,176,28,4,C.woodDark);rect(x-2,172,4,8,C.woodDark);
 rect(x-14,182,28,60,C.coat);rect(x-18,186,8,46,C.coat);rect(x+10,186,8,46,C.coat);
 rect(x-8,182,16,10,C.coatDark);rect(x-2,192,4,46,C.coatDark);rect(x-12,238,24,6,C.coatDark);
 rect(x-14,214,6,4,C.wood);rect(x+8,214,6,4,C.wood);
}

function paintFloor(g,rand,room){
 const {rect}=pen(g);
 for(let y=240;y<522;y+=2)for(let x=54;x<946;x+=2){const r=rand();rect(x,y,2,2,r<.55?C.grass:r<.75?C.dirt:r<.92?C.grassDark:C.grassLight);}
 // Back edge of the floor reads as a shadow under the wall.
 for(let x=54;x<946;x+=2)rect(x,240,2,6,C.dirtDark);
 // Flagstone path from the entrance to the arch.
 const path=[[90,495],[200,385],[330,335],[450,312],[620,330],[660,350],[760,330],[850,292],[902,262]];
 for(let i=0;i<path.length-1;i++){const [ax,ay]=path[i],[bx,by]=path[i+1],n=Math.ceil(Math.hypot(bx-ax,by-ay)/26);for(let k=0;k<n;k++){const x=ax+(bx-ax)*k/n+rand()*6-3,y=ay+(by-ay)*k/n+rand()*6-3;rect(x-10,y-6,20,12,C.flag);rect(x-10,y-6,20,2,C.flagLight);rect(x+8,y-4,2,10,C.stoneEdge);}}
 // Grass tufts, bones and leaves.
 for(let i=0;i<90;i++){const x=60+rand()*880,y=250+rand()*265;rect(x,y,2,4,C.grassLight);rect(x+2,y-2,2,6,C.grassLight);}
 for(let i=0;i<10;i++){const x=80+rand()*840,y=270+rand()*240;rect(x,y,8,2,C.bone);rect(x-2,y-2,2,6,C.bone);rect(x+8,y-2,2,6,C.bone);}
 // Loose boards: alternating planks with dark gaps and nail heads.
 for(const b of room.creaky){for(let y=b.y,i=0;y<b.y+b.h;y+=12,i++){const shift=(i%3)*6;rect(b.x+shift,y,b.w-12,10,i%2?C.wood:C.woodLight);rect(b.x+shift,y+10,b.w-12,2,C.woodGap);for(let x=b.x+shift+12;x<b.x+shift+b.w-12;x+=48){rect(x,y+4,2,2,C.bone);}rect(b.x+shift+b.w*.4,y+2,16,2,C.woodDark);}}
 // Bottom wall with the entrance gap on the left.
 rect(54,522,892,40,C.night);for(let x=140;x<946;x+=30){rect(x,524,26,16,C.stoneDark);rect(x,524,26,4,C.stone);}
 rect(54,522,86,40,'#05090f');rect(64,520,66,10,C.red);rect(64,528,66,4,C.redDark);
}

function paintCrypt(g,b){
 const {rect}=pen(g,b.x-10,b.y-50);
 rect(b.x,b.y-12,b.w,44,C.stoneLight);rect(b.x,b.y-12,b.w,4,'#9db0bd');rect(b.x,b.y+30,b.w,b.h-28,C.stone);rect(b.x,b.y+b.h,b.w,4,C.stoneEdge);
 rect(b.x+b.w-8,b.y-8,8,b.h+8,C.stoneDark);
 rect(b.x+b.w/2-3,b.y-6,6,30,C.stoneDark);rect(b.x+b.w/2-14,b.y+2,28,6,C.stoneDark);
 // Glowing crack where the lid has slipped.
 const cx=b.x+30;for(let i=0;i<8;i++)rect(cx+i*6,b.y+30+(i%2)*2,6,2,C.mint);for(let r=0;r<3;r++){g.globalAlpha=.15;rect(cx-6,b.y+26-r*2,60,6+r*4,C.mint);}g.globalAlpha=1;
 for(const [x,y] of [[b.x-6,b.y+b.h-10],[b.x+b.w+2,b.y+b.h-14]]){rect(x,y,6,12,C.bone);rect(x+2,y-6,2,4,C.mint);}
}

function paintGrave(g,b,rand){
 const {rect,disc}=pen(g,b.x-10,b.y-50);
 const left=b.x+4,w=b.w-8,top=b.y-38;
 rect(b.x-2,b.y+6,b.w+4,b.h-4,C.dirtDark);rect(b.x,b.y+4,b.w,4,C.grassDark);
 rect(left,top+12,w,b.h+14,C.stone);disc(left+w/2,top+12,w/2,C.stone);
 rect(left,top+12,4,b.h+14,C.stoneLight);rect(left+w-4,top+12,4,b.h+14,C.stoneDark);
 rect(left+w/2-2,top+8,4,20,C.stoneEdge);rect(left+w/2-8,top+14,16,4,C.stoneEdge);
 rect(left+6,top+34,w-12,2,C.stoneEdge);
 if(rand()<.6)rect(left+w-10,top+4,6,8,C.grassLight);
}

function paintBench(g,b){
 const {rect,disc}=pen(g,b.x-10,b.y-50);
 for(let r=70;r>10;r-=10){g.globalAlpha=.06;disc(b.x+b.w/2,b.y+b.h,r,C.mint);}g.globalAlpha=1;
 rect(b.x,b.y-20,b.w,8,C.woodLight);rect(b.x,b.y-12,b.w,4,C.woodDark);
 rect(b.x,b.y-6,b.w,16,C.red);rect(b.x,b.y-6,b.w,4,'#b03a44');rect(b.x,b.y+10,b.w,6,C.woodDark);
 for(const x of [b.x+4,b.x+b.w-10])rect(x,b.y+14,6,b.h-14,C.woodDark);
 // Lamp post that makes this the safe, lit corner.
 rect(b.x+b.w-4,b.y-46,4,40,C.stoneDark);rect(b.x+b.w-10,b.y-52,16,8,C.stoneDark);rect(b.x+b.w-8,b.y-50,12,4,C.mint);
}

function paintCoffin(g,b){
 const {rect}=pen(g,b.x-10,b.y-50);
 const top=b.y-34,h=b.h+34;
 for(let y=0;y<h;y+=2){const t=y/h,inset=t<.25?(.25-t)*40:(t-.25)*14;rect(b.x+inset,top+y,b.w-inset*2,2,y%8<2?C.woodDark:C.wood);}
 rect(b.x+b.w/2-2,top+20,4,28,C.woodLight);rect(b.x+b.w/2-10,top+28,20,4,C.woodLight);
 rect(b.x+b.w-12,top+10,2,h-16,C.mintSoft);
 rect(b.x+4,b.y+b.h-2,b.w-8,4,C.woodGap);
}

// ---- Hành lang Ma Cổ Dài
const K={paper:'#173533',paperDark:'#122a29',paperLight:'#21463f',brass:'#b08a4a',brassLight:'#d8b26a',plank:'#26303c',plankLight:'#2d3a48',plankGap:'#161c24',carpet:'#7a2630',carpetDark:'#5a1c25',glass:'#24435a',glassLight:'#3b6580',neck:'#d9cfc4'};

function paintCorridorBackdrop(g,rand,room){
 const {rect,disc}=pen(g);
 // Damask wallpaper above a wooden wainscot.
 rect(54,30,892,210,K.paper);
 for(let y=46,row=0;y<236;y+=28,row++)for(let x=60+(row%2)*12;x<946;x+=24){rect(x,y,4,4,K.paperLight);rect(x-4,y+4,12,2,K.paperLight);rect(x,y+6,4,4,K.paperLight);rect(x+2,y+14,2,2,K.paperDark);}
 for(let x=54;x<946;x+=48)rect(x,30,2,206,K.paperDark);
 rect(54,30,892,12,C.woodDark);rect(54,40,892,2,C.woodLight);
 // Ceiling rail the head rides on, with pulley wheels.
 rect(54,50,892,6,C.iron);rect(54,50,892,2,C.stoneDark);
 for(let x=120;x<940;x+=140){disc(x,53,7,C.stone);disc(x,53,3,C.iron);}
 rect(54,236,892,64,C.wood);rect(54,236,892,6,C.woodLight);
 for(let x=64;x<940;x+=70){rect(x,250,58,40,C.woodDark);rect(x+2,252,54,36,C.wood);}
 // Portraits; the middle one is missing its head.
 const frame=(x,y,w,h)=>{rect(x-4,y-4,w+8,h+8,K.brass);rect(x-4,y-4,w+8,2,K.brassLight);rect(x,y,w,h,'#22202c');};
 frame(130,98,60,78);rect(146,140,28,36,'#3a4a5a');disc(160,128,10,'#c9b9a6');rect(150,118,20,6,'#1b1720');
 frame(330,94,60,82);rect(346,140,28,36,'#4a3a4e');rect(357,94,6,48,K.neck);
 frame(690,98,60,78);rect(706,140,28,36,'#2f4a44');disc(720,128,10,'#c9b9a6');rect(712,124,4,2,'#1b1720');rect(724,124,4,2,'#1b1720');
 paintLantern(g,250,150);paintLantern(g,420,150);
 // Alcove (hiding spot).
 rect(612,200,56,100,C.stoneDark);disc(640,204,28,C.stoneDark);rect(618,206,44,94,'#060b12');disc(640,208,22,'#060b12');rect(636,282,8,10,C.bone);rect(638,276,4,4,C.mint);
 // Mirror at the end: the reflection still has a long neck in it.
 rect(826,144,68,154,C.stoneLight);rect(830,148,60,146,K.glass);
 for(let i=0;i<10;i++)rect(836+i*4,284-i*12,6,6,K.glassLight);
 rect(858,148,5,70,'#3a5a70');disc(860,226,9,'#3a5a70');rect(852,236,16,40,'#2e4a5e');
 // Pulley box with two ropes running up to the rail.
 rect(492,56,3,172,'#c8b48a');rect(507,56,3,172,'#c8b48a');
 rect(468,226,64,66,C.woodDark);rect(472,230,56,58,C.wood);disc(500,256,16,C.stone);disc(500,256,6,C.iron);rect(522,262,14,4,C.iron);rect(534,252,4,14,C.red);
 // Floorboards, then a carpet runner along the lower lane.
 for(let y=300,i=0;y<480;y+=12,i++){rect(54,y,892,10,i%2?K.plank:K.plankLight);rect(54,y+10,892,2,K.plankGap);for(let x=54+((i*37)%120);x<946;x+=120+((i*13)%60))rect(x,y,2,10,K.plankGap);}
 for(let x=54;x<946;x+=2)rect(x,300,2,6,K.plankGap);
 rect(54,410,892,56,K.carpet);rect(54,410,892,4,K.brass);rect(54,462,892,4,K.brass);
 for(let x=80;x<940;x+=40){rect(x,434,8,8,K.carpetDark);rect(x+2,436,4,4,K.brass);}
 // Bottom wall: staff doors (cửa hậu), the radio on its ledge.
 rect(54,480,892,82,C.night);rect(54,480,892,16,C.woodDark);rect(54,480,892,4,C.woodLight);
 for(const dx of [205,765]){rect(dx,480,50,24,'#05090f');rect(dx+12,484,26,8,C.brass);rect(dx+16,486,18,4,C.woodDark);}
 rect(410,470,20,12,C.stoneDark);rect(412,472,10,6,C.mint);rect(426,458,2,14,C.iron);
 // Left emergency exit and the lit door at the far right.
 rect(0,404,54,72,'#05090f');rect(10,392,34,10,'#2f7a5c');rect(16,394,22,6,C.mint);
 rect(946,356,54,88,'#3b2c1c');rect(950,360,46,80,'#e7c083');for(let r=90;r>10;r-=16){g.globalAlpha=.05;disc(946,400,r,'#e7c083');}g.globalAlpha=1;
}

function paintRail(g,b){
 const {rect}=pen(g,b.x-10,b.y-50);
 rect(b.x,b.y+6,b.w,6,'#0008');
 for(let x=b.x;x<=b.x+b.w-4;x+=30)rect(x,b.y-24,4,32,K.brass);
 rect(b.x-2,b.y-28,b.w+4,6,K.brass);rect(b.x-2,b.y-28,b.w+4,2,K.brassLight);
}

// Ma Cổ Dài: white áo dài, long hair, a neck far too long. 42 × 112 art pixels plus outline.
export function paintLongNeck(){
 const [c,g]=canvas(44,114);
 const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x+1,y+1,w,h);};
 const hair='#16121a',skin='#e3d6c8',skinShade='#c3b3a3',dress='#e8ecef',dressShade='#c3cbd3',pants='#1e2430';
 r(8,10,5,44,hair);r(29,10,5,44,hair);
 r(11,2,20,6,hair);r(9,5,24,10,hair);
 r(13,9,16,18,skin);r(12,12,18,12,skin);r(26,12,3,12,skinShade);
 r(12,8,18,4,hair);r(13,12,2,5,hair);r(27,12,2,7,hair);r(20,11,2,3,hair);
 r(15,16,4,2,'#1a1418');r(23,16,4,2,'#1a1418');r(16,16,1,1,'#ffffff');r(24,16,1,1,'#ffffff');r(15,19,4,1,skinShade);r(23,19,4,1,skinShade);
 r(19,22,4,2,'#b0303c');
 r(18,27,6,30,skin);r(22,27,2,30,skinShade);for(const y of [34,41,48])r(18,y,6,1,skinShade);
 r(16,56,10,3,dress);
 r(11,58,20,22,dress);r(27,59,4,20,dressShade);r(7,59,5,20,dress);r(30,59,5,20,dressShade);r(7,79,5,4,skin);r(30,79,5,4,skinShade);
 r(22,60,1,1,'#9aa6b0');r(24,62,1,1,'#9aa6b0');r(26,64,1,1,'#9aa6b0');
 r(12,80,8,26,pants);r(22,80,8,26,pants);r(15,80,12,22,'#eef1f3');r(25,80,2,22,dressShade);
 r(12,105,8,3,C.wood);r(22,105,8,3,C.wood);
 const img=g.getImageData(0,0,44,114),d=img.data,solid=i=>d[i*4+3]>0,out=[];
 for(let y=0;y<114;y++)for(let x=0;x<44;x++){const i=y*44+x;if(solid(i))continue;if((x>0&&solid(i-1))||(x<43&&solid(i+1))||(y>0&&solid(i-44))||(y<113&&solid(i+44)))out.push(i);}
 for(const i of out){d[i*4]=18;d[i*4+1]=13;d[i*4+2]=20;d[i*4+3]=255;}
 g.putImageData(img,0,0);
 return c;
}

const PROPS={crypt:paintCrypt,grave:paintGrave,bench:paintBench,coffin:paintCoffin,rail:paintRail};

// Returns the backdrop plus one depth-sorted prop per collider block.
export function paintRoom(room){
 const rand=rng(20011031);
 const [bg,g]=canvas(500,281);
 g.fillStyle=C.night;g.fillRect(0,0,500,281);
 if(room.art==='corridor'){paintFrame(g);paintCorridorBackdrop(g,rand,room);}
 else{paintSky(g,rand);paintWall(g,rand);paintArch(g);paintFloor(g,rand,room);paintLantern(g,120,150);paintLantern(g,760,150);const coat=room.spots.find(s=>s.kind==='hide');if(coat)paintCoat(g,coat.x);}
 // Soft vignette toward the corners.
 const v=g.createRadialGradient(250,150,80,250,150,320);v.addColorStop(0,'#0000');v.addColorStop(1,'#020812a0');g.fillStyle=v;g.fillRect(0,0,500,281);
 const props=room.blocks.filter(b=>PROPS[b.art]).map(b=>{const w=b.w+20,h=b.h+56,[c,pg]=canvas(Math.ceil(w/2),Math.ceil(h/2));PROPS[b.art](pg,b,rand);return{canvas:c,x:b.x-10,y:b.y-50,w,h,sortY:b.y+b.h-6};});
 return{background:bg,props};
}

// Xác Sống, front-facing, 40 × 80 art pixels, with a dark outline pass.
export function paintZombie(){
 const [c,g]=canvas(42,82);
 const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x+1,y+1,w,h);};
 const skin='#8fb39a',skinShade='#6e927e',hair='#2b2f3a',hairLight='#434a5c',shirt='#d9dccf',shirtShade='#a9ad9f',tie='#8e2b33',pants='#2e3f63',pantsShade='#22304d',shoe='#3b2a22';
 r(9,3,22,8,hair);r(8,6,2,7,hair);r(30,6,2,7,hair);r(12,1,4,3,hair);r(20,0,5,3,hair);r(26,2,3,2,hair);r(14,4,6,1,hairLight);
 r(10,9,20,21,skin);r(9,11,22,16,skin);r(27,11,3,16,skinShade);r(7,16,2,5,skinShade);r(31,16,2,5,skinShade);
 r(9,9,22,3,hair);r(11,12,3,2,hair);r(17,12,2,3,hair);r(24,12,3,2,hair);
 r(13,17,5,4,'#f4f1d0');r(15,18,2,2,'#c23b3b');r(22,17,5,4,'#f4f1d0');r(23,18,2,2,'#c23b3b');r(13,21,5,1,skinShade);r(22,21,5,1,skinShade);
 r(23,24,6,1,'#3a2a30');r(24,23,1,3,'#3a2a30');r(26,23,1,3,'#3a2a30');r(28,23,1,3,'#3a2a30');
 r(16,26,8,2,'#3a1e22');r(17,26,1,1,'#f4f1d0');r(21,26,1,1,'#f4f1d0');
 r(17,30,6,3,skinShade);
 r(10,32,20,17,shirt);r(14,32,4,3,shirtShade);r(22,32,4,3,shirtShade);r(19,33,2,9,tie);r(26,33,4,16,shirtShade);r(12,40,3,3,'#7d8a6a');
 for(let x=10;x<30;x+=3)r(x,48,2,1,shirtShade);
 r(6,33,5,9,shirt);r(29,33,5,9,shirtShade);r(5,42,5,8,skin);r(30,42,5,8,skinShade);r(30,44,5,2,'#e8e2c8');
 r(4,49,6,4,skin);r(30,49,6,4,skinShade);r(4,53,1,2,skin);r(6,53,1,2,skin);r(8,53,1,2,skin);r(31,53,1,2,skinShade);r(33,53,1,2,skinShade);r(35,53,1,2,skinShade);
 r(10,49,20,2,shoe);
 r(11,51,8,20,pants);r(21,51,8,20,pants);r(17,51,2,20,pantsShade);r(27,51,2,20,pantsShade);r(13,60,4,3,skin);r(23,66,3,2,skinShade);
 r(11,70,3,1,pantsShade);r(16,70,3,1,pantsShade);r(22,70,4,1,pantsShade);
 r(13,71,4,2,skinShade);r(23,71,4,2,skinShade);
 r(10,73,9,5,shoe);r(21,73,9,5,shoe);r(11,76,2,2,skin);r(10,73,9,1,'#5a4033');r(21,73,9,1,'#5a4033');
 // Outline: darken transparent pixels that touch the figure.
 const img=g.getImageData(0,0,42,82),d=img.data,solid=i=>d[i*4+3]>0,out=[];
 for(let y=0;y<82;y++)for(let x=0;x<42;x++){const i=y*42+x;if(solid(i))continue;if((x>0&&solid(i-1))||(x<41&&solid(i+1))||(y>0&&solid(i-42))||(y<81&&solid(i+42)))out.push(i);}
 for(const i of out){d[i*4]=18;d[i*4+1]=13;d[i*4+2]=20;d[i*4+3]=255;}
 g.putImageData(img,0,0);
 return c;
}
