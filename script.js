// ============================================================
// LET'S FISHING v4.1 — Fixed swim anim, harbour floor, landscape
// ============================================================

// ═══════ CORE STATE ═══════
let isFishing=false,hookInWater=false,fishBiting=false;
let castAnimation=0,castingNow=false,castReleased=false,castingPose=false;
let gameStarted=false,fishingTimer=0,biteTime=0;
let freezePlayer=false,freezeInput=false,pulling=false;
let nearSeller=false,gamePaused=false;

// ═══════ SWIM STATE ═══════
let isSwimming=false,swimAnim=0,swimCycle=0;

// ═══════ JETSKI STATE ═══════
let onJetski=false,jetskiSpeed=0,nearJetski=false,jetskiOwned=false;
let jetskiSpawned=false,nearHarbour=false;
let jetskiPassenger=null;
const jetskiMaxSpeed=0.45;
const HARBOUR_POS=new THREE.Vector3(50,0,15);
const jetskiSpawnPos=new THREE.Vector3(50,0.1,22);

// ═══════ TENSION BAR SYSTEM ═══════
let tensionActive=false,tensionVal=50,zoneMin=35,zoneMax=65;
let tensionFishSpeed=0,tensionDir=1,tensionReeling=false;
let tensionProgress=0,tensionDifficulty=1,tensionTimeout=0,pendingFish=null;

// ═══════ INVENTORY SYSTEM ═══════
const activeTab={current:'rods'};
let heldFishIndex=-1;

// ═══════ LEVEL / XP ═══════
let playerLevel=1,playerXP=0;
const xpThresholds=[0,100,250,450,700,1000,1400,1900,2500,3200,4000];
const levelTitles=["Beginner","Novice","Apprentice","Fisher","Expert","Master","Grand Master","Legend","Mythic","Champion","GOAT"];

// ═══════ WEATHER ═══════
const weatherTypes=[
  {name:"Sunny",   icon:"☀️", speedMult:1,   luckMult:1,   skyColor:0x87ceeb,fogColor:0x87ceeb},
  {name:"Windy",   icon:"🌬️",speedMult:1.8, luckMult:1,   skyColor:0x9db8cc,fogColor:0xaac0cc},
  {name:"Cloudy",  icon:"☁️", speedMult:1,   luckMult:1.4, skyColor:0x7a8a96,fogColor:0x8a9aa6},
  {name:"Storming",icon:"⛈️",speedMult:1.5, luckMult:1.6, skyColor:0x3a4a56,fogColor:0x4a5a66},
  {name:"Foggy",   icon:"🌫️",speedMult:0.9, luckMult:1.2, skyColor:0xcccccc,fogColor:0xbbbbbb},
];
let currentWeather=weatherTypes[0];
let weatherTimer=0,weatherChangeCooldown=300;

// ═══════ FISH DATABASE ═══════
const fishTypes=[
  {name:"Ikan Kecil",    rarity:"Common",   price:10,  xp:5,   color:"#b0c4de",emoji:"🐟",diff:0.5},
  {name:"Ikan Tuna",     rarity:"Uncommon", price:25,  xp:12,  color:"#5dade2",emoji:"🐠",diff:0.8},
  {name:"Ikan Salmon",   rarity:"Rare",     price:60,  xp:25,  color:"#ff7f50",emoji:"🐡",diff:1.2},
  {name:"Ikan Lele",     rarity:"Uncommon", price:20,  xp:10,  color:"#8B7355",emoji:"🐟",diff:0.7},
  {name:"Ikan Koi",      rarity:"Rare",     price:75,  xp:30,  color:"#FF6B35",emoji:"🐠",diff:1.3},
  {name:"Ikan Hiu",      rarity:"Epic",     price:150, xp:60,  color:"#708090",emoji:"🦈",diff:2.0},
  {name:"Golden Fish",   rarity:"Epic",     price:200, xp:80,  color:"#f1c40f",emoji:"✨",diff:1.8},
  {name:"Mythic Koi",    rarity:"Legendary",price:500, xp:200, color:"#ff00ff",emoji:"🌟",diff:2.5},
  {name:"Dragon Fish",   rarity:"Legendary",price:800, xp:300, color:"#ff4444",emoji:"🐉",diff:3.0},
  {name:"Crystal Fish",  rarity:"Legendary",price:1000,xp:400, color:"#00ffff",emoji:"💎",diff:3.5},
  {name:"Old Boot",      rarity:"Junk",     price:1,   xp:1,   color:"#888",   emoji:"👟",diff:0.2},
  {name:"Treasure Chest",rarity:"Epic",     price:300, xp:100, color:"#DAA520",emoji:"📦",diff:1.6},
  {name:"Ikan Pari",     rarity:"Rare",     price:90,  xp:35,  color:"#9b59b6",emoji:"🦑",diff:1.4},
  {name:"Rainbow Fish",  rarity:"Epic",     price:250, xp:90,  color:"#ff69b4",emoji:"🌈",diff:1.9},
];

// ═══════ BAIT DATABASE ═══════
const baitTypes=[
  {id:"none",   name:"No Bait",    icon:"❌",desc:"Default, no bonus.",      luckBonus:0,  speedBonus:0,  rareBonus:0,  price:0,   infinite:true},
  {id:"worm",   name:"Earthworm",  icon:"🪱",desc:"+15% bite speed.",        luckBonus:0,  speedBonus:0.3,rareBonus:0,  price:5,   infinite:false},
  {id:"shrimp", name:"Shrimp",     icon:"🦐",desc:"+20% luck, faster bite.", luckBonus:0.3,speedBonus:0.2,rareBonus:0,  price:12,  infinite:false},
  {id:"squid",  name:"Squid",      icon:"🦑",desc:"+Epic fish chance.",      luckBonus:0.5,speedBonus:0,  rareBonus:0.1,price:25,  infinite:false},
  {id:"gold",   name:"Gold Lure",  icon:"✨",desc:"+Legendary chance!",      luckBonus:1,  speedBonus:0.3,rareBonus:0.3,price:80,  infinite:false},
  {id:"magic",  name:"Magic Bait", icon:"🔮",desc:"MAX luck + speed.",       luckBonus:2,  speedBonus:0.5,rareBonus:0.5,price:200, infinite:false},
];

// ═══════ ROD DATABASE ═══════
const rodDatabase={
  FishingRod:{name:"Wood Rod",  icon:"🪵",price:0,    luckMult:1,  speedMult:1,  color:0x8b5a2b,desc:"Starter rod."},
  LuckRod:   {name:"Luck Rod",  icon:"🍀",price:150,  luckMult:2.5,speedMult:1,  color:0xaaaaaa,desc:"More rare fish."},
  MediumRod: {name:"Medium Rod",icon:"⚡",price:500,  luckMult:3,  speedMult:2,  color:0xffd700,desc:"Faster & luckier."},
  GoldenRod: {name:"Golden Rod",icon:"✨",price:2000, luckMult:5,  speedMult:2,  color:0xFFD700,desc:"Max luck rod."},
};

// ═══════ PLAYER INVENTORY DATA ═══════
const inventory={
  equipped:"FishingRod",
  rods:["FishingRod"],
  bait:{none:999,worm:0,shrimp:0,squid:0,gold:0,magic:0},
  equippedBait:"none",
  fish:[],
  fishLog:[],
};
let coins=0;

// ═══════ AUDIO ═══════
function safeAudio(src){
  try{const a=new Audio(src);a.volume=0.7;return a;}
  catch(e){return{play:()=>Promise.resolve(),pause:()=>{},loop:false,volume:1,currentTime:0};}
}
const castSound  =safeAudio("sounds/cast.mp3");
const biteSound  =safeAudio("sounds/bite.mp3");
const catchSound =safeAudio("sounds/catch.mp3");
const bgMusic    =safeAudio("sounds/background_music.mp3");
bgMusic.loop=true; bgMusic.volume=0.35; bgMusic.play().catch(()=>{});

// ═══════ SCENE ═══════
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);
scene.fog=new THREE.FogExp2(0x87ceeb,0.004);

const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,2000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
document.body.appendChild(renderer.domElement);

const sun=new THREE.DirectionalLight(0xffffff,1.2);
sun.position.set(10,20,10); sun.castShadow=true; scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff,0.5));

const loader=new THREE.TextureLoader();
const sandTex  =loader.load("images/sand.jpg");
const grassTex =loader.load("images/grass.jpg");
const waterTex =loader.load("images/water.jpg");
const floorTex =loader.load("images/floor.jpg");
const wallTex  =loader.load("images/wall.jpg");
const roofTex  =loader.load("images/roof.jpg");
const tableTex =loader.load("images/table.jpg");
waterTex.wrapS=waterTex.wrapT=THREE.RepeatWrapping; waterTex.repeat.set(20,20);

// ═══════ WATER ═══════
const water=new THREE.Mesh(
  new THREE.PlaneGeometry(2000,2000,80,80),
  new THREE.MeshStandardMaterial({map:waterTex,transparent:true,opacity:0.88,roughness:0.15,metalness:0.3})
);
water.rotation.x=-Math.PI/2; water.position.y=-1; scene.add(water);

// ═══════ ISLAND BUILDER ═══════
function buildIsland(x,z,radius,grassRadius,label,grassColor){
  const g=new THREE.Group(); g.position.set(x,-2.5,z); scene.add(g);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(radius,radius+4,4,64),new THREE.MeshStandardMaterial({map:sandTex})));
  const gr=new THREE.Mesh(new THREE.CylinderGeometry(grassRadius,grassRadius+2,0.5,32),new THREE.MeshStandardMaterial({color:grassColor||0x27ae60}));
  gr.position.y=2.3; g.add(gr);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.6,6,8),new THREE.MeshStandardMaterial({color:0x8B6914}));
  trunk.position.y=5; g.add(trunk);
  const leaves=new THREE.Mesh(new THREE.ConeGeometry(4,2.5,8),new THREE.MeshStandardMaterial({color:0x1a7a1a}));
  leaves.position.y=9.5; g.add(leaves);
  const sc=document.createElement("canvas"); sc.width=512; sc.height=128;
  const sx=sc.getContext("2d");
  sx.fillStyle="rgba(0,0,0,.75)"; sx.fillRect(0,0,512,128);
  sx.fillStyle="#fff"; sx.font="bold 50px Arial"; sx.textAlign="center"; sx.textBaseline="middle";
  sx.fillText(label,256,64);
  const sm=new THREE.Mesh(new THREE.BoxGeometry(5,1.2,0.2),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)}));
  sm.position.set(0,5,radius-0.3); g.add(sm);
  return g;
}

const mainIsland=buildIsland(0,0,50,45,"🏝️ Main Island",0x27ae60);
const island2=buildIsland(500,0,35,30,"🏝️ Mystic Isle",0x2ecc71);
const island3=buildIsland(-600,-500,30,26,"🌋 Volcano Isle",0x8B0000);
const island4=buildIsland(200,800,25,22,"💎 Crystal Isle",0x00bcd4);

function addRock(g,x,z,s){
  const r=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),new THREE.MeshStandardMaterial({color:0x777777}));
  r.position.set(x,2.5+s,z); r.rotation.set(Math.random(),Math.random(),Math.random()); g.add(r);
}
addRock(island2,8,6,1.5); addRock(island2,-6,4,1);
addRock(island3,0,0,3); addRock(island3,7,-5,1.8);
addRock(island4,-4,5,1.2); addRock(island4,5,3,0.9);

const lava=new THREE.Mesh(new THREE.CylinderGeometry(3,3,0.4,16),new THREE.MeshStandardMaterial({color:0xff4500,emissive:0xff2200,emissiveIntensity:0.9}));
lava.position.set(-600,-503,-500); scene.add(lava);

// ═══════ SHOP BUILDER ═══════
function makeShop(px,pz,label){
  const g=new THREE.Group(); g.position.set(px,0,pz); g.scale.set(1.4,1.4,1.4); scene.add(g);
  const fl=new THREE.Mesh(new THREE.BoxGeometry(10,0.6,6),new THREE.MeshStandardMaterial({map:floorTex}));
  fl.position.y=0.3; g.add(fl);
  const wm=new THREE.MeshStandardMaterial({map:wallTex});
  const bw=new THREE.Mesh(new THREE.BoxGeometry(10,7,0.4),wm); bw.position.set(0,1.5,-3); g.add(bw);
  const sL=new THREE.Mesh(new THREE.BoxGeometry(0.4,7,6),wm); sL.position.set(-4.8,1.5,0); g.add(sL);
  const sR=sL.clone(); sR.position.x=4.8; g.add(sR);
  const rm=new THREE.MeshStandardMaterial({map:roofTex});
  const rf=new THREE.Mesh(new THREE.BoxGeometry(12,0.2,8),rm); rf.position.y=5; g.add(rf);
  const rt=new THREE.Mesh(new THREE.ConeGeometry(5.5,2,4),rm); rt.rotation.y=Math.PI/4; rt.position.y=6; g.add(rt);
  const ctr=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.5,1),new THREE.MeshStandardMaterial({map:tableTex}));
  ctr.position.set(0,0.75,2.5); g.add(ctr);
  const sc=document.createElement("canvas"); sc.width=512; sc.height=256;
  const sx=sc.getContext("2d");
  sx.fillStyle="#5d4037"; sx.fillRect(0,0,512,256);
  sx.strokeStyle="#3e2723"; sx.lineWidth=10; sx.strokeRect(0,0,512,256);
  sx.fillStyle="#fff"; sx.font="bold 52px Arial"; sx.textAlign="center"; sx.textBaseline="middle";
  sx.fillText(label,256,128);
  const sg=new THREE.Mesh(new THREE.BoxGeometry(4,1,0.3),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)}));
  sg.position.set(0,8.2,2.9); g.add(sg);
  return{counter:ctr};
}

const {counter}                           = makeShop(0,  -15,"🐟 SELL FISH");
const {counter:rodShopCounter}            = makeShop(22, -15,"🎣 ROD SHOP");
const {counter:baitShopCounter}           = makeShop(-22,-15,"🪱 BAIT SHOP");
const {counter:jetskiShopCounter}         = makeShop(44, -15,"🛥️ JETSKI");

// ═══ PELABUHAN (HARBOUR) ═══
function buildHarbour(){
  const g=new THREE.Group(); g.position.set(50,0,15); scene.add(g);

  // Dock platform — ukuran dermaga sebenarnya
  const dock=new THREE.Mesh(new THREE.BoxGeometry(14,0.4,7),
    new THREE.MeshStandardMaterial({color:0x8B6914,roughness:0.9}));
  dock.position.y=0.2; g.add(dock);

  // ── FIX: Invisible collision floor ukuran SAMA dengan dock ──
  // Posisi lokal (0,0,0) = tengah group = tengah dermaga
  const colFloor=new THREE.Mesh(
    new THREE.BoxGeometry(14,0.6,7),
    new THREE.MeshStandardMaterial({visible:false})
  );
  colFloor.position.set(0,0.1,0);
  g.add(colFloor);

  // Tiang dermaga
  for(let i=-1;i<=1;i++){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,3,8),
      new THREE.MeshStandardMaterial({color:0x5C4A1E}));
    pole.position.set(i*4,-1.3,3); g.add(pole);
    const pole2=pole.clone(); pole2.position.z=-3; g.add(pole2);
  }
  // Pagar
  const rail=new THREE.Mesh(new THREE.BoxGeometry(12,0.08,0.08),
    new THREE.MeshStandardMaterial({color:0x5C4A1E}));
  rail.position.set(0,0.9,3.5); g.add(rail);
  const rail2=rail.clone(); rail2.position.z=-3.5; g.add(rail2);
  // Lampu
  for(let i=-1;i<=1;i+=2){
    const lp=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2,8),
      new THREE.MeshStandardMaterial({color:0x666}));
    lp.position.set(i*5,1.2,3); g.add(lp);
    const lb=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8),
      new THREE.MeshStandardMaterial({color:0xffff88,emissive:0xffff44,emissiveIntensity:1}));
    lb.position.set(i*5,2.3,3); g.add(lb);
  }
  // Papan nama
  const sc=document.createElement("canvas"); sc.width=256; sc.height=64;
  const sx=sc.getContext("2d");
  sx.fillStyle="rgba(0,0,0,0.8)"; sx.fillRect(0,0,256,64);
  sx.fillStyle="#fff"; sx.font="bold 28px Arial"; sx.textAlign="center"; sx.textBaseline="middle";
  sx.fillText("🚢 PELABUHAN",128,32);
  const sm=new THREE.Mesh(new THREE.BoxGeometry(5,1.2,0.1),
    new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)}));
  sm.position.set(0,2.5,0); g.add(sm);
  // Indikator area spawn
  const ind=new THREE.Mesh(new THREE.CircleGeometry(2.5,16),
    new THREE.MeshStandardMaterial({color:0x00ff88,transparent:true,opacity:0.18}));
  ind.rotation.x=-Math.PI/2; ind.position.set(0,0.42,0); g.add(ind);
  return g;
}
buildHarbour();

// ═══════ NPC BUILDER ═══════
function makeNPC(color,px,pz){
  const g=new THREE.Group(); const root=new THREE.Object3D(); g.add(root);
  const t=new THREE.Mesh(new THREE.BoxGeometry(2,2,1),new THREE.MeshStandardMaterial({color}));
  t.position.y=3; root.add(t);
  const h=new THREE.Mesh(new THREE.SphereGeometry(0.75,16,16),new THREE.MeshStandardMaterial({color:0xffd6b3}));
  h.position.y=1.9; t.add(h);
  const fc=document.createElement("canvas"); fc.width=128; fc.height=128;
  const fx=fc.getContext("2d");
  fx.fillStyle="#000"; fx.beginPath(); fx.arc(38,55,8,0,Math.PI*2); fx.arc(90,55,8,0,Math.PI*2); fx.fill();
  fx.beginPath(); fx.arc(64,80,22,0,Math.PI); fx.lineWidth=5; fx.stroke();
  const fm=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(fc),transparent:true}));
  fm.position.z=0.73; h.add(fm);
  const aL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xffd6b3}));
  aL.position.set(-1.5,0,0); t.add(aL);
  const aR=aL.clone(); aR.position.x=1.5; t.add(aR);
  const lL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0x2c3e50}));
  lL.position.set(-0.5,-2,0); t.add(lL);
  const lR=lL.clone(); lR.position.x=0.5; t.add(lR);
  g.scale.set(0.6,0.6,0.6); g.position.set(px,0,pz); scene.add(g);
  return{group:g,root};
}
const {group:npcGroup,root:npcRoot}         = makeNPC(0x3498db, 0,  -13.5);
const {group:rodNpcGroup,root:rodNpcRoot}   = makeNPC(0xe74c3c, 22, -13.5);
const {group:baitNpcGroup,root:baitNpcRoot} = makeNPC(0x27ae60,-22, -13.5);
const {group:jsNpcGroup,root:jsNpcRoot}     = makeNPC(0xf39c12, 44, -13.5);

// ═══════ PLAYER ═══════
const player=new THREE.Group(); scene.add(player);
const playerRoot=new THREE.Object3D(); player.add(playerRoot);
const torso=new THREE.Mesh(new THREE.BoxGeometry(2,2,1),new THREE.MeshStandardMaterial({color:0x2ecc71}));
torso.position.y=3; torso.castShadow=true; playerRoot.add(torso);
const backHolder=new THREE.Object3D(); backHolder.position.set(0,0.5,-0.7); torso.add(backHolder);
const head=new THREE.Mesh(new THREE.SphereGeometry(0.75,32,32),new THREE.MeshStandardMaterial({color:0xffd6b3,roughness:0.6}));
head.scale.y=1.05; head.position.y=1.9; head.castShadow=true; torso.add(head);
const faceC=document.createElement("canvas"); faceC.width=256; faceC.height=256;
const fctx=faceC.getContext("2d");
fctx.fillStyle="#000"; fctx.beginPath(); fctx.arc(80,110,12,0,Math.PI*2); fctx.arc(176,110,12,0,Math.PI*2); fctx.fill();
fctx.beginPath(); fctx.arc(128,160,40,0,Math.PI); fctx.lineWidth=6; fctx.stroke();
const face=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(faceC),transparent:true}));
face.position.z=0.73; head.add(face);
const armL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xffd6b3}));
armL.position.set(-1.5,0,0); torso.add(armL);
const armR=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xffd6b3}));
armR.position.set(1.5,0,0); torso.add(armR);
const handGrip=new THREE.Object3D(); handGrip.position.set(0,-1,0.75); armR.add(handGrip);
const rodPivot=new THREE.Object3D(); handGrip.add(rodPivot);
const legL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0x333}));
legL.position.set(-0.5,-2,0); torso.add(legL);
const legR=legL.clone(); legR.position.x=0.5; torso.add(legR);
player.scale.set(0.8,0.8,0.8); player.position.set(0,0,-8);

// ═══════ HELD FISH MESH ═══════
const heldFishMesh=new THREE.Mesh(
  new THREE.SphereGeometry(0.28,10,6),
  new THREE.MeshStandardMaterial({color:0x5dade2,emissive:0x112244,emissiveIntensity:0.3})
);
heldFishMesh.scale.z=1.8;
const leftHandAnchor=new THREE.Object3D();
leftHandAnchor.position.set(0,-1.1,0);
armL.add(leftHandAnchor);
leftHandAnchor.add(heldFishMesh);
heldFishMesh.visible=false;

// ═══════ ROD MESH ═══════
const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.06,2),new THREE.MeshStandardMaterial({color:0x8b5a2b}));
const rodTip=new THREE.Object3D(); rodTip.position.set(0,1,0); rod.add(rodTip);
backHolder.add(rod); rod.position.set(0,0,0); rod.rotation.set(0,Math.PI,0.5);

// ═══════ HOOK & LINE ═══════
const hook=new THREE.Mesh(new THREE.SphereGeometry(0.12,10,10),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x4444ff,emissiveIntensity:0.3}));
hook.visible=false; scene.add(hook);
const fishingLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xffffff,opacity:0.7,transparent:true}));
scene.add(fishingLine);

// ═══════ JETSKI ═══════
const jetski=new THREE.Group();
const hull=new THREE.Mesh(new THREE.BoxGeometry(3,0.8,1.4),new THREE.MeshStandardMaterial({color:0xe74c3c,metalness:0.4,roughness:0.3}));
jetski.add(hull);
const nose=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.2,8),new THREE.MeshStandardMaterial({color:0xc0392b}));
nose.rotation.z=-Math.PI/2; nose.position.set(2,0.1,0); jetski.add(nose);
const shield=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.6,1.2),new THREE.MeshStandardMaterial({color:0x00aaff,transparent:true,opacity:0.5}));
shield.position.set(0.5,0.7,0); jetski.add(shield);
const seat=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.3,1),new THREE.MeshStandardMaterial({color:0x222}));
seat.position.set(-0.3,0.55,0); jetski.add(seat);
const hbar=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.4,8),new THREE.MeshStandardMaterial({color:0x888}));
hbar.rotation.x=Math.PI/2; hbar.position.set(0.6,0.9,0); jetski.add(hbar);
const passengerSeat=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.3,1),new THREE.MeshStandardMaterial({color:0x333}));
passengerSeat.position.set(-1.4,0.55,0); jetski.add(passengerSeat);
jetski.position.copy(jetskiSpawnPos); jetski.visible=false; scene.add(jetski);

// Wake particles
const wakeParticles=[];
for(let i=0;i<25;i++){
  const p=new THREE.Mesh(new THREE.SphereGeometry(0.18,6,6),new THREE.MeshStandardMaterial({color:0xaaddff,transparent:true,opacity:0.6}));
  p.visible=false; scene.add(p);
  wakeParticles.push({mesh:p,life:0,active:false});
}

// Swim bubbles
const bubbles=[];
for(let i=0;i<20;i++){
  const b=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),new THREE.MeshStandardMaterial({color:0xaaddff,transparent:true,opacity:0.5}));
  b.visible=false; scene.add(b);
  bubbles.push({mesh:b,life:0,active:false,vel:new THREE.Vector3()});
}

// Underwater overlay
const uwDiv=document.createElement("div");
Object.assign(uwDiv.style,{position:"fixed",inset:"0",background:"rgba(0,80,160,0.22)",pointerEvents:"none",zIndex:"5",display:"none",backdropFilter:"blur(1px)"});
document.body.appendChild(uwDiv);

// ═══════ CAMERA ═══════
let camYaw=0,camPitch=0.3,camTouchId=null,lastX=0,lastY=0;
renderer.domElement.addEventListener("touchstart",e=>{
  const t=e.changedTouches[0];
  if(t.clientX>window.innerWidth/2){camTouchId=t.identifier;lastX=t.clientX;lastY=t.clientY;}
},{passive:true});
renderer.domElement.addEventListener("touchmove",e=>{
  const t=[...e.touches].find(t=>t.identifier===camTouchId); if(!t)return;
  camYaw-=(t.clientX-lastX)*0.007; camPitch-=(t.clientY-lastY)*0.007;
  camPitch=THREE.MathUtils.clamp(camPitch,0.05,1.4);
  lastX=t.clientX; lastY=t.clientY;
},{passive:true});
renderer.domElement.addEventListener("touchend",e=>{
  if([...e.changedTouches].find(t=>t.identifier===camTouchId))camTouchId=null;
},{passive:true});

// ═══════ JOYSTICK ═══════
const joy=document.getElementById("joystick"),stick=document.getElementById("stick");
let joyX=0,joyY=0,joyTouchId=null;
joy.addEventListener("touchstart",e=>{
  e.preventDefault();
  const t=e.changedTouches[0];
  if(t.clientX<window.innerWidth/2)joyTouchId=t.identifier;
},{passive:false});
joy.addEventListener("touchmove",e=>{
  e.preventDefault();
  const t=[...e.touches].find(t=>t.identifier===joyTouchId); if(!t)return;
  const r=joy.getBoundingClientRect(),x=t.clientX-r.left-60,y=t.clientY-r.top-60;
  const d=Math.min(40,Math.hypot(x,y)),a=Math.atan2(y,x);
  joyX=Math.cos(a)*(d/40); joyY=Math.sin(a)*(d/40);
  stick.style.left=(35+joyX*30)+"px"; stick.style.top=(35+joyY*30)+"px";
},{passive:false});
joy.addEventListener("touchend",e=>{
  if([...e.changedTouches].find(t=>t.identifier===joyTouchId)){
    joyTouchId=null;joyX=0;joyY=0;stick.style.left="35px";stick.style.top="35px";
  }
},{passive:true});
const keys={};
window.addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;});
window.addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false;});
let walkAnim=0;

// ═══════ ISLAND CHECK ═══════
function checkOnLand(){
  const px=player.position.x,pz=player.position.z;
  // Radius mencakup seluruh pulau termasuk area pasir di tepi
  // Main island: grass radius=45, sand radius=50, +4 base → total ~56
  if(px*px+pz*pz<56*56)return true;
  // Mystic Isle: radius=35, +4 → ~41
  if((px-500)**2+pz**2<41*41)return true;
  // Volcano Isle: radius=30, +4 → ~36
  if((px+600)**2+(pz+500)**2<36*36)return true;
  // Crystal Isle: radius=25, +4 → ~31
  if((px-200)**2+(pz-800)**2<31*31)return true;
  // Pelabuhan dock
  if((px-50)**2+(pz-15)**2<8*8)return true;
  return false;
}

// Cek apakah player bisa memancing (harus di tepi pulau, bukan tengah)
// Memancing hanya bisa jika di zona pasir (antara grass radius dan sand radius)
function canFishFromHere(){
  const px=player.position.x,pz=player.position.z;
  // Zona pasir = antara grassRadius dan sandRadius+4 dari pusat pulau
  // Main island: boleh mancing jika 43 < dist < 58 (zona tepi pasir)
  const d0=Math.sqrt(px*px+pz*pz);
  if(d0>43&&d0<60)return true;
  // Mystic Isle
  const d1=Math.sqrt((px-500)**2+pz**2);
  if(d1>28&&d1<43)return true;
  // Volcano Isle
  const d2=Math.sqrt((px+600)**2+(pz+500)**2);
  if(d2>24&&d2<38)return true;
  // Crystal Isle
  const d3=Math.sqrt((px-200)**2+(pz-800)**2);
  if(d3>20&&d3<33)return true;
  // Di air (bukan daratan sama sekali) juga bisa → tapi kita sudah cegah swimming
  if(!checkOnLand())return true;
  return false;
}

// ═══════ FIX: SWIM ANIMATION ═══════
// Animasi berenang yang natural — tidak twitch/aneh
function updateSwimAnim(dt, moving){
  // Naikkan cycle lebih lambat supaya smooth
  swimCycle += dt * (moving ? 1.8 : 0.8);

  // Badan condong ke depan
  torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, -0.55, 0.08);
  torso.position.y  = THREE.MathUtils.lerp(torso.position.y, 2.4, 0.08);
  torso.rotation.z  = Math.sin(swimCycle * 0.5) * 0.12; // body roll halus

  // Kepala sedikit tegak supaya "napas"
  head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -0.15, 0.08);
  head.rotation.z = 0;

  // Lengan — gerakan crawl bergantian, amplitudo dikecilkan
  armL.rotation.x = Math.sin(swimCycle) * 1.0;
  armL.rotation.z = Math.cos(swimCycle) * 0.3 - 0.2;
  armR.rotation.x = Math.sin(swimCycle + Math.PI) * 1.0;
  armR.rotation.z = -(Math.cos(swimCycle + Math.PI) * 0.3) + 0.2;

  // Kaki — flutter kick kecil
  legL.rotation.x = Math.sin(swimCycle * 2) * 0.25;
  legR.rotation.x = Math.sin(swimCycle * 2 + Math.PI) * 0.25;
  legL.rotation.z = 0; legR.rotation.z = 0;
}

function resetBodyPose(){
  torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0, 0.12);
  torso.rotation.z = THREE.MathUtils.lerp(torso.rotation.z, 0, 0.12);
  torso.position.y = THREE.MathUtils.lerp(torso.position.y, 3, 0.12);
  head.rotation.x  = THREE.MathUtils.lerp(head.rotation.x, 0, 0.12);
  head.rotation.z  = THREE.MathUtils.lerp(head.rotation.z, 0, 0.12);
}

// ═══════ PLAYER MOVEMENT ═══════
function movePlayer(dt){
  if(onJetski)return;
  let mX=joyX,mY=joyY;
  if(keys["w"]||keys["arrowup"])mY=-1;
  if(keys["s"]||keys["arrowdown"])mY=1;
  if(keys["a"]||keys["arrowleft"])mX=-1;
  if(keys["d"]||keys["arrowright"])mX=1;

  const fwd=new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y=0; fwd.normalize();
  const rgt=new THREE.Vector3(); rgt.crossVectors(fwd,camera.up).normalize();
  const dir=new THREE.Vector3(); dir.addScaledVector(fwd,-mY); dir.addScaledVector(rgt,mX);

  if(dir.lengthSq()>0.0001){
    const ta=Math.atan2(dir.x,dir.z);
    let diff=ta-player.rotation.y; diff=Math.atan2(Math.sin(diff),Math.cos(diff));
    player.rotation.y+=diff*0.12;
  }

  const spd=isSwimming?0.07:0.11;
  if(!freezePlayer) player.position.addScaledVector(dir,spd);

  if(isSwimming){
    player.position.y=THREE.MathUtils.lerp(player.position.y,-1.8,0.1);
  } else {
    player.position.y=THREE.MathUtils.lerp(player.position.y,0,0.15);
  }

  const moving=dir.lengthSq()>0.001&&!freezeInput&&!isFishing;

  if(isSwimming){
    uwDiv.style.display="block";
    updateSwimAnim(dt,moving);
    if(moving&&Math.random()<0.08){
      for(const b of bubbles){
        if(!b.active){
          b.active=true;b.life=1;b.mesh.visible=true;
          b.mesh.position.copy(player.position); b.mesh.position.y+=0.5;
          b.vel.set((Math.random()-.5)*0.06,0.04+Math.random()*0.04,(Math.random()-.5)*0.06);
          break;
        }
      }
    }
  } else {
    uwDiv.style.display="none";
    resetBodyPose();
    if(moving){walkAnim+=0.18;}
    const sw=Math.sin(walkAnim);
    if(moving&&!castingPose&&!isFishing){
      legL.rotation.x=sw*0.8; legR.rotation.x=-sw*0.8;
      armL.rotation.x=-sw*0.5; armL.rotation.z=0;
      armR.rotation.z=-0.2;
      if(!isFishing)armR.rotation.x=sw*0.5;
      torso.position.y=3+Math.abs(sw)*0.08;
    } else if(!isSwimming&&!isFishing&&!castingPose){
      legL.rotation.x=THREE.MathUtils.lerp(legL.rotation.x,0,0.15);
      legR.rotation.x=THREE.MathUtils.lerp(legR.rotation.x,0,0.15);
      armL.rotation.x=THREE.MathUtils.lerp(armL.rotation.x,0,0.15);
      armR.rotation.x=THREE.MathUtils.lerp(armR.rotation.x,0,0.15);
      walkAnim*=0.9;
    }
  }

  const onLand=checkOnLand();
  if(!onLand&&!isSwimming){isSwimming=true;showMessage("🌊 Swimming!");}
  if(onLand&&isSwimming){isSwimming=false;swimCycle=0;}
}

function updateCamera(){
  // Selalu pakai world position supaya benar saat player di-parent ke jetski
  const worldPos=new THREE.Vector3();
  player.getWorldPosition(worldPos);
  const tgt=worldPos.clone(); tgt.y+=3.3;
  const dist=onJetski?10:8;
  const des=new THREE.Vector3(
    tgt.x-Math.sin(camYaw)*dist,
    tgt.y+camPitch*4,
    tgt.z-Math.cos(camYaw)*dist
  );
  camera.position.lerp(des,0.18);
  camera.lookAt(tgt);
}

function animateWater(time){
  const pos=water.geometry.attributes.position;
  for(let i=0;i<pos.count;i+=4)pos.setZ(i,Math.sin(i*0.3+time*0.0015)*0.15);
  pos.needsUpdate=true;
}

// ═══════ JETSKI ═══════
function mountJetski(){
  if(!jetskiOwned){showMessage("🛥️ Beli Jetski dari Jetski Shop!");return;}
  if(!jetskiSpawned){showMessage("🛥️ Spawn jetski dulu di Pelabuhan!");return;}
  onJetski=true;isSwimming=false;uwDiv.style.display="none";
  scene.remove(player);
  jetski.add(player);
  player.position.set(-0.3,0.75,0);
  player.rotation.set(0,0,0);
  torso.rotation.x=0.05;
  legL.rotation.x=1.4; legR.rotation.x=1.4;
  legL.rotation.z=0.15; legR.rotation.z=-0.15;
  armL.rotation.x=-0.5; armR.rotation.x=-0.5;
  armL.rotation.z=0.4;  armR.rotation.z=-0.4;
  document.getElementById("jetskiUI").style.display="block";
  if(window.MP&&window.MP.isActive())window.MP.sendEvent("mountJetski",{});
  showMessage("🛥️ Naik! [WASD] kemudi · [E] turun");
}
function dismountJetski(){
  onJetski=false;jetskiSpeed=0;
  if(player.parent===jetski){
    jetski.remove(player);
    scene.add(player);
    player.position.set(jetski.position.x+3,0,jetski.position.z);
    player.rotation.set(0,0,0);
  }
  torso.rotation.x=0;
  legL.rotation.x=0; legR.rotation.x=0;
  legL.rotation.z=0; legR.rotation.z=0;
  armL.rotation.x=0; armR.rotation.x=0;
  armL.rotation.z=0; armR.rotation.z=0;
  document.getElementById("jetskiUI").style.display="none";
  if(window.MP&&window.MP.isActive())window.MP.sendEvent("dismountJetski",{});
  showMessage("Turun dari jetski.");
}
function spawnJetski(){
  if(!jetskiOwned){showMessage("🛥️ Beli Jetski dulu!");return;}
  jetskiSpawned=true;
  jetski.position.set(jetskiSpawnPos.x,jetskiSpawnPos.y,jetskiSpawnPos.z);
  jetski.visible=true; jetski.rotation.set(0,0,0);
  showMessage("🛥️ Jetski di-spawn di Pelabuhan!");
}
function despawnJetski(){
  if(onJetski)dismountJetski();
  jetskiSpawned=false; jetski.visible=false;
  showMessage("🛥️ Jetski di-despawn.");
}
function updateJetski(){
  if(!onJetski)return;
  let mX=joyX,mY=joyY;
  if(keys["w"]||keys["arrowup"])mY=-1;
  if(keys["s"]||keys["arrowdown"])mY=1;
  if(keys["a"]||keys["arrowleft"])mX=-1;
  if(keys["d"]||keys["arrowright"])mX=1;
  if(Math.abs(mX)>0.1)jetski.rotation.y-=mX*0.04;
  if(mY<-0.1)jetskiSpeed=Math.min(jetskiSpeed+0.012,jetskiMaxSpeed);
  else if(mY>0.1)jetskiSpeed=Math.max(jetskiSpeed-0.01,-jetskiMaxSpeed*0.3);
  else jetskiSpeed*=0.92;
  jetski.position.x+=Math.sin(jetski.rotation.y)*jetskiSpeed;
  jetski.position.z+=Math.cos(jetski.rotation.y)*jetskiSpeed;
  jetski.position.y=0.1+Math.sin(Date.now()*0.002)*0.08;
  jetski.rotation.x=jetskiSpeed*0.18; jetski.rotation.z=-mX*0.07;
  armL.rotation.z=0.4+mX*0.15; armR.rotation.z=-0.4+mX*0.15;
  torso.rotation.z=mX*-0.05;
  document.getElementById("jetskiSpeed").textContent=Math.abs(Math.round(jetskiSpeed*240))+" km/h";
  if(Math.abs(jetskiSpeed)>0.05&&Math.random()<0.4){
    for(const p of wakeParticles){
      if(!p.active){
        p.active=true;p.life=1;p.mesh.visible=true;
        const s=(Math.random()-.5)*1.2;
        p.mesh.position.set(
          jetski.position.x-Math.sin(jetski.rotation.y)*2+Math.cos(jetski.rotation.y)*s,
          -0.85,
          jetski.position.z-Math.cos(jetski.rotation.y)*2-Math.sin(jetski.rotation.y)*s
        );
        break;
      }
    }
  }
}
function updateWake(dt){
  for(const p of wakeParticles){
    if(!p.active)continue;
    p.life-=dt*1.5; if(p.life<=0){p.active=false;p.mesh.visible=false;continue;}
    p.mesh.position.y=-0.9+p.life*0.3;
    p.mesh.material.opacity=p.life*0.45;
    p.mesh.scale.setScalar(1+(1-p.life)*2);
  }
}
function updateBubbles(dt){
  for(const b of bubbles){
    if(!b.active)continue;
    b.life-=dt*0.9; if(b.life<=0){b.active=false;b.mesh.visible=false;continue;}
    b.mesh.position.add(b.vel);
    b.mesh.material.opacity=b.life*0.5; b.mesh.scale.setScalar(b.life);
  }
}

// ═══════ TENSION BAR FISHING ═══════
function startCastAnimation(){
  if(castingNow||isFishing)return;
  if(!inventory.equipped){showMessage("Equip a rod first!");return;}
  if(isSwimming){showMessage("❌ Can't fish while swimming!");return;}
  if(onJetski){showMessage("❌ Dismount first! [E]");return;}
  if(!canFishFromHere()){showMessage("❌ Pergi ke tepi pantai untuk memancing!");return;}
  castingNow=true;castAnimation=0;castReleased=false;
}
function updateCastAnimation(){
  if(!castingNow)return;
  castAnimation+=0.05;
  if(castAnimation<0.4){castingPose=true;armR.rotation.x=-1.6;rodPivot.rotation.x=-0.6;}
  else if(castAnimation<0.7){armR.rotation.x+=0.25;rodPivot.rotation.x+=0.25;}
  else if(castAnimation>=0.7&&!castReleased){castReleased=true;castLineSimple();}
  if(castAnimation>=1){castingNow=false;castingPose=false;armR.rotation.x=-0.6;rodPivot.rotation.x=0;}
}
function castLineSimple(){
  if(isFishing)return;
  hook.userData={velocity:new THREE.Vector3()};
  isFishing=true;hookInWater=false;fishBiting=false;fishingTimer=0;
  castSound.play().catch(()=>{});
  const sp=new THREE.Vector3(); rodTip.getWorldPosition(sp);
  hook.position.copy(sp); hook.visible=true;
  const fw=new THREE.Vector3(0,0,1).applyQuaternion(player.quaternion); fw.y+=0.35;
  hook.userData.velocity=fw.multiplyScalar(0.28);
  const rd=rodDatabase[inventory.equipped]||rodDatabase.FishingRod;
  const bd=baitTypes.find(b=>b.id===inventory.equippedBait)||baitTypes[0];
  const sm=(rd.speedMult||1)*currentWeather.speedMult*(1+bd.speedBonus);
  biteTime=(Math.random()*4+2)/sm;
}
function updateFishingWait(){
  if(!inventory.equipped||!hook.visible)return;
  if(!hookInWater){
    hook.position.add(hook.userData.velocity);
    hook.userData.velocity.y-=0.012;
    if(hook.position.y<=-1){hook.position.y=-1;hookInWater=true;fishingTimer=0;}
  }
  if(hookInWater&&!fishBiting&&!tensionActive){
    fishingTimer+=0.016;
    if(fishingTimer>=biteTime){pendingFish=getRandomFish();startTension(pendingFish);}
  }
  if(fishBiting&&!tensionActive)armR.rotation.z=Math.sin(Date.now()*0.02)*0.2;
}
function startTension(fish){
  fishBiting=true;tensionActive=true;
  tensionVal=50;tensionProgress=0;tensionReeling=false;
  tensionDifficulty=fish.diff||1;
  tensionFishSpeed=0.4*tensionDifficulty;
  tensionDir=Math.random()<0.5?1:-1;
  tensionTimeout=15;freezePlayer=true;
  const zoneWidth=Math.max(12,30-tensionDifficulty*5);
  zoneMin=50-zoneWidth/2; zoneMax=50+zoneWidth/2;
  document.getElementById("biteIcon").style.display="block";
  biteSound.play().catch(()=>{});
  setTimeout(()=>{
    document.getElementById("biteIcon").style.display="none";
    document.getElementById("tensionContainer").style.display="flex";
    updateTensionUI();
  },500);
}
function updateTensionSystem(dt){
  if(!tensionActive)return;
  tensionTimeout-=dt;
  if(tensionTimeout<=0){loseFish();return;}
  tensionFishSpeed+=((Math.random()-.5)*0.08)*tensionDifficulty;
  tensionFishSpeed=THREE.MathUtils.clamp(tensionFishSpeed,-1.2*tensionDifficulty,1.2*tensionDifficulty);
  if(Math.random()<0.02)tensionDir*=-1;
  tensionVal+=tensionFishSpeed*tensionDir*dt*60;
  tensionVal=THREE.MathUtils.clamp(tensionVal,0,100);
  if(tensionVal<=0||tensionVal>=100)tensionDir*=-1;
  const inZone=tensionVal>=zoneMin&&tensionVal<=zoneMax;
  if(tensionReeling&&inZone)tensionProgress+=dt*18/tensionDifficulty;
  else if(tensionReeling&&!inZone)tensionProgress-=dt*12;
  else if(!tensionReeling&&inZone)tensionProgress-=dt*6;
  tensionProgress=THREE.MathUtils.clamp(tensionProgress,0,100);
  if(tensionProgress>=100){catchFish();return;}
  updateTensionUI();
  if(tensionReeling)armR.rotation.x=Math.sin(Date.now()*0.03)*0.3-0.8;
  else armR.rotation.x=THREE.MathUtils.lerp(armR.rotation.x,-0.6,0.1);
}
function updateTensionUI(){
  const bar=document.getElementById("tensionBar");
  const zone=document.getElementById("tensionZone");
  const ind=document.getElementById("tensionIndicator");
  const prompt=document.getElementById("catchPrompt");
  bar.style.width=tensionProgress+"%";
  const inZone=tensionVal>=zoneMin&&tensionVal<=zoneMax;
  bar.style.background=tensionProgress>70?"linear-gradient(90deg,#27ae60,#2ecc71)":tensionProgress>30?"linear-gradient(90deg,#f39c12,#f1c40f)":"linear-gradient(90deg,#e74c3c,#c0392b)";
  zone.style.left=zoneMin+"%"; zone.style.width=(zoneMax-zoneMin)+"%";
  zone.style.background=inZone?"rgba(46,204,113,0.35)":"rgba(231,76,60,0.25)";
  ind.style.left=tensionVal+"%";
  ind.style.background=inZone?"#2ecc71":"#e74c3c";
  ind.style.boxShadow=inZone?"0 0 10px #2ecc71":"0 0 8px #e74c3c";
  prompt.style.display=inZone?"block":"none";
  document.getElementById("tensionLabel").textContent=inZone?"✅ IN ZONE — REEL IN!":"⚠️ Get fish in the zone!";
}
function catchFish(){
  tensionActive=false;fishBiting=false;isFishing=false;
  document.getElementById("tensionContainer").style.display="none";
  if(!pendingFish){stopFishingAll();return;}
  if(inventory.equippedBait!=="none"){
    inventory.bait[inventory.equippedBait]=Math.max(0,inventory.bait[inventory.equippedBait]-1);
    if(inventory.bait[inventory.equippedBait]===0){inventory.equippedBait="none";showMessage("🪱 Bait used up!");}
  }
  const cf={...pendingFish,id:Date.now()+Math.random()};
  inventory.fish.push(cf);
  inventory.fishLog.unshift({...cf,time:new Date().toLocaleTimeString()});
  if(inventory.fishLog.length>50)inventory.fishLog.pop();
  showFishNotification(cf);gainXP(cf.xp);
  catchSound.play().catch(()=>{});
  stopFishingAll();pendingFish=null;
}
function loseFish(){
  tensionActive=false;fishBiting=false;
  document.getElementById("tensionContainer").style.display="none";
  stopFishingAll();pendingFish=null;
  showMessage("🐟 The fish got away!");
}
function stopFishingAll(){
  isFishing=false;castingPose=false;castingNow=false;
  fishBiting=false;hookInWater=false;freezeInput=false;freezePlayer=false;
  fishingTimer=0;biteTime=0;hook.visible=false;
  hook.userData={velocity:new THREE.Vector3()};
  document.getElementById("biteIcon").style.display="none";
  document.getElementById("tensionContainer").style.display="none";
  tensionActive=false;tensionReeling=false;
  armR.rotation.set(-0.6,0,-0.2);armL.rotation.set(0,0,0);rodPivot.rotation.set(0,0,0);
  fishingLine.visible=false;
}
function updateFishingLine(){
  if(!hook.visible){fishingLine.visible=false;return;}
  fishingLine.visible=true;
  const s=new THREE.Vector3(); rodTip.getWorldPosition(s);
  fishingLine.geometry.setFromPoints([s,hook.position.clone()]);
}

document.getElementById("reelBtn").addEventListener("pointerdown",e=>{e.stopPropagation();tensionReeling=true;});
document.getElementById("reelBtn").addEventListener("pointerup",()=>tensionReeling=false);
document.getElementById("reelBtn").addEventListener("touchstart",e=>{e.stopPropagation();tensionReeling=true;},{passive:true});
document.getElementById("reelBtn").addEventListener("touchend",()=>tensionReeling=false);

// ═══════ FISH RANDOMIZER ═══════
function getRandomFish(){
  const rd=rodDatabase[inventory.equipped]||rodDatabase.FishingRod;
  const bd=baitTypes.find(b=>b.id===inventory.equippedBait)||baitTypes[0];
  const luck=(rd.luckMult||1)*currentWeather.luckMult*(1+playerLevel*0.025)*(1+bd.luckBonus);
  const rareB=bd.rareBonus||0;
  const r=Math.random()/(luck*(1+rareB));
  if(r<0.015)return fishTypes[9];
  if(r<0.04) return fishTypes[8];
  if(r<0.08) return fishTypes[7];
  if(r<0.12) return fishTypes[13];
  if(r<0.17) return fishTypes[6];
  if(r<0.23) return fishTypes[11];
  if(r<0.31) return fishTypes[5];
  if(r<0.40) return fishTypes[12];
  if(r<0.49) return fishTypes[4];
  if(r<0.57) return fishTypes[2];
  if(r<0.66) return fishTypes[1];
  if(r<0.73) return fishTypes[3];
  if(r<0.77) return fishTypes[10];
  return fishTypes[0];
}

// ═══════ INVENTORY UI ═══════
let inventoryOpen=false;
function toggleInventory(){
  inventoryOpen=!inventoryOpen;
  document.getElementById("inventoryUI").style.display=inventoryOpen?"flex":"none";
  if(inventoryOpen){freezeInput=true;renderTab(activeTab.current);}
  else freezeInput=false;
}
function switchTab(tab){
  activeTab.current=tab;
  document.querySelectorAll(".invTab").forEach((el,i)=>{
    const tabs=["rods","bait","fish"];
    el.classList.toggle("active",tabs[i]===tab);
  });
  renderTab(tab);
}
function renderTab(tab){
  const content=document.getElementById("invContent");
  if(tab==="rods")renderRodsTab(content);
  else if(tab==="bait")renderBaitTab(content);
  else renderFishTab(content);
}
function renderRodsTab(el){
  const allRods=[
    {id:"FishingRod",...rodDatabase.FishingRod},
    {id:"LuckRod",  ...rodDatabase.LuckRod},
    {id:"MediumRod",...rodDatabase.MediumRod},
    {id:"GoldenRod",...rodDatabase.GoldenRod},
  ];
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:12px;">Tap to equip. Buy unowned rods below.</div>`
    +allRods.map(r=>{
      const owned=inventory.rods.includes(r.id);
      const eq=inventory.equipped===r.id;
      return`<div class="rodRow${eq?" equipped":""}" onclick="${owned?`equipRod('${r.id}')`:`buyRod('${r.id}')`}">
        <div class="rodIcon">${r.icon}</div>
        <div class="rodInfo">
          <h4>${r.name} ${eq?"<span style='color:#f1c40f'>✓ Equipped</span>":""}</h4>
          <p>${r.desc}</p>
          <div class="rodStats">⚡${r.speedMult}x &nbsp;🍀${r.luckMult}x${!owned?" &nbsp;💰"+r.price:""}</div>
        </div>
        <button class="rodEquipBtn ${eq?"eq":"neq"}">${eq?"Equipped":owned?"Equip":"Buy 💰"+r.price}</button>
      </div>`;
    }).join("");
}
function renderBaitTab(el){
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:12px;">Tap to select bait.</div><div class="baitGrid">`
    +baitTypes.map(b=>{
      const count=b.infinite?"∞":inventory.bait[b.id]||0;
      const eq=inventory.equippedBait===b.id;
      return`<div class="baitCard${eq?" selected":""}" onclick="selectBait('${b.id}')">
        <div class="baitIcon">${b.icon}</div>
        <h4>${b.name}</h4><p>${b.desc}</p>
        <div class="baitCount">×${count}</div>
        ${b.id!=="none"&&count===0?`<button class="buyRodBtn" style="margin-top:6px" onclick="event.stopPropagation();buyBait('${b.id}')">Buy 💰${b.price}</button>`:""}
      </div>`;
    }).join("")+"</div>";
}
function renderFishTab(el){
  if(inventory.fish.length===0){
    el.innerHTML=`<div style="text-align:center;color:#aaa;padding:40px;font-size:14px;">🐟 No fish!<br><span style="font-size:12px">Go catch some.</span></div>`;
    return;
  }
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:10px;">${inventory.fish.length} fish</div><div class="fishBagGrid">`
    +inventory.fish.map((f,i)=>`
      <div class="fishCard${heldFishIndex===i?" holding":""}">
        <div class="fishIcon">${f.emoji}</div>
        <h4>${f.name}</h4>
        <div class="fishRar rarity-${f.rarity}">${f.rarity}</div>
        <div class="fishPrice">💰${f.price}</div>
        <button class="holdBtn ${heldFishIndex===i?"unhold":"hold"}" onclick="toggleHoldFish(${i})">${heldFishIndex===i?"Put down":"Hold 🤚"}</button>
      </div>`).join("")
    +`</div><button id="invSellAllBtn" onclick="sellAllFish()">💰 Sell All (+💰${inventory.fish.reduce((s,f)=>s+f.price,0)})</button>`;
}

function equipRod(name){
  if(!inventory.rods.includes(name)){showMessage("You don't own this rod!");return;}
  inventory.equipped=name;
  inventory._lastSelected=name;
  if(rod.parent)rod.parent.remove(rod);
  rodPivot.add(rod); rod.position.set(0,0,0); rod.rotation.set(Math.PI/2,0,0);
  armR.rotation.x=-0.6;armR.rotation.z=-0.2;
  rod.material.color.setHex(rodDatabase[name]?.color||0x8b5a2b);
  showMessage("🎣 Equipped: "+rodDatabase[name].name);
  updateHotbarSlot();
  if(inventoryOpen)renderTab("rods");
}
function selectBait(id){
  const bd=baitTypes.find(b=>b.id===id); if(!bd)return;
  if(!bd.infinite&&(inventory.bait[id]||0)===0){showMessage("Buy this bait first!");return;}
  inventory.equippedBait=id;
  showMessage(bd.icon+" Bait: "+bd.name);
  renderTab("bait");
}
function buyBait(id){
  const bd=baitTypes.find(b=>b.id===id); if(!bd)return;
  const qty=10,cost=bd.price*qty;
  if(coins<cost){showMessage("Need 💰"+cost+" for 10x "+bd.name);return;}
  coins-=cost; inventory.bait[id]=(inventory.bait[id]||0)+qty;
  document.getElementById("coinUI").textContent="💰 "+coins;
  showMessage("✅ Bought 10x "+bd.name+"!");
  renderTab("bait"); saveProgress();
}
function toggleHoldFish(i){
  if(heldFishIndex===i){
    heldFishIndex=-1;heldFishMesh.visible=false;
    document.getElementById("heldFishHUD").style.display="none";
  } else {
    heldFishIndex=i;
    const f=inventory.fish[i];
    heldFishMesh.material.color.set(f.color||"#5dade2");
    heldFishMesh.visible=true;
    document.getElementById("heldFishHUD").style.display="block";
    document.getElementById("heldFishHUD").textContent=f.emoji+" Holding: "+f.name;
  }
  renderTab("fish");
}

// ═══════ SELL / BUY ═══════
function sellFish(){if(inventory.fish.length===0){showMessage("🚫 No fish!");return;}sellAllFish();}
function sellAllFish(){
  let total=0; inventory.fish.forEach(f=>total+=f.price);
  coins+=total; inventory.fish=[];heldFishIndex=-1;heldFishMesh.visible=false;
  document.getElementById("coinUI").textContent="💰 "+coins;
  document.getElementById("heldFishHUD").style.display="none";
  showMessage("🐟 Sold all! +💰"+total);
  if(inventoryOpen)renderTab("fish");
  saveProgress();
}
function buyRod(name){
  if(inventory.rods.includes(name)){showMessage("Already owned!");return;}
  const rd=rodDatabase[name]; if(!rd)return;
  if(coins<rd.price){showMessage("❌ Need 💰"+rd.price);return;}
  coins-=rd.price;inventory.rods.push(name);
  document.getElementById("coinUI").textContent="💰 "+coins;
  showMessage("✅ "+rd.name+" purchased!");renderTab("rods");saveProgress();
}
function buyJetski(){
  if(jetskiOwned){showMessage("Already own Jetski!");return;}
  if(coins<1500){showMessage("❌ Need 💰1500");return;}
  coins-=1500;jetskiOwned=true;
  document.getElementById("coinUI").textContent="💰 "+coins;
  showMessage("🛥️ Jetski purchased!");
  const btn=document.getElementById("buyJetskiBtn");
  if(btn){btn.textContent="✓ Owned";btn.disabled=true;}
  saveProgress();
}
function closeJetskiShop(){document.getElementById("jetskiShopUI").style.display="none";freezeInput=false;}

// ═══════ NOTIFICATIONS ═══════
function showFishNotification(fish){
  const el=document.getElementById("fishNotify");
  el.style.display="block";el.style.color=fish.color;
  el.textContent=fish.emoji+" "+fish.name+" ("+fish.rarity+") +💰"+fish.price;
  clearTimeout(el._t);el._t=setTimeout(()=>el.style.display="none",2800);
}
function showEventNotification(text){
  const el=document.getElementById("eventNotify");
  el.style.display="block";el.textContent=text;
  clearTimeout(el._t);el._t=setTimeout(()=>el.style.display="none",4000);
}
function showMessage(text){
  const m=document.createElement("div");m.textContent=text;
  Object.assign(m.style,{position:"fixed",top:"20%",left:"50%",transform:"translateX(-50%)",
    background:"rgba(0,0,0,.85)",color:"#fff",padding:"11px 22px",borderRadius:"12px",
    fontFamily:"Arial",zIndex:"9999",fontSize:"14px",whiteSpace:"nowrap",
    boxShadow:"0 4px 16px rgba(0,0,0,.5)"});
  document.body.appendChild(m);setTimeout(()=>m.remove(),2200);
}

// ═══════ LEVEL / XP ═══════
function gainXP(amt){
  playerXP+=amt;
  const el=document.getElementById("xpNotify");
  el.textContent="+"+amt+" XP!";el.style.display="block";
  el.style.animation="none";void el.offsetWidth;el.style.animation="xpFloat 1.2s ease-out forwards";
  setTimeout(()=>el.style.display="none",1300);
  checkLevelUp();updateLevelUI();
}
function checkLevelUp(){
  while(playerLevel<xpThresholds.length&&playerXP>=xpThresholds[playerLevel]){
    playerLevel++;
    showMessage("🎉 LEVEL UP! Lv."+playerLevel+" — "+levelTitles[Math.min(playerLevel-1,levelTitles.length-1)]);
  }
}
function updateLevelUI(){
  const lv=Math.min(playerLevel,xpThresholds.length-1);
  const nx=xpThresholds[lv]||xpThresholds[xpThresholds.length-1];
  const pv=xpThresholds[lv-1]||0;
  document.getElementById("levelNum").textContent=playerLevel;
  document.getElementById("levelTitle").textContent=levelTitles[Math.min(playerLevel-1,levelTitles.length-1)];
  document.getElementById("xpBar").style.width=Math.min(100,((playerXP-pv)/(nx-pv))*100)+"%";
  document.getElementById("xpText").textContent=playerXP+"/"+nx+" XP";
}

// ═══════ WEATHER ═══════
function setWeather(w){
  currentWeather=w;
  scene.background=new THREE.Color(w.skyColor);
  scene.fog.color=new THREE.Color(w.fogColor);
  document.getElementById("weatherUI").textContent=w.icon+" "+w.name;
  sun.intensity=w.name==="Storming"?0.4:w.name==="Foggy"?0.6:1.2;
  showEventNotification(w.icon+" "+w.name+" | Speed:"+w.speedMult+"x Luck:"+w.luckMult+"x");
  if(window.MP&&window.MP.isActive()&&localStorage.getItem("playerName")==="Varz444"){
    window.MP.syncWeather(w.name);
  }
}
function updateWeather(dt){
  weatherTimer+=dt;
  if(weatherTimer>=weatherChangeCooldown){
    weatherTimer=0;weatherChangeCooldown=200+Math.random()*200;
    const nx=weatherTypes[Math.floor(Math.random()*weatherTypes.length)];
    if(nx.name!==currentWeather.name)setWeather(nx);
  }
}

// ═══════ NPC INTERACTION ═══════
function updateNPCInteraction(){
  const fishPos=new THREE.Vector3(),rodPos=new THREE.Vector3(),baitPos=new THREE.Vector3(),jsPos=new THREE.Vector3();
  counter.getWorldPosition(fishPos);
  rodShopCounter.getWorldPosition(rodPos);
  baitShopCounter.getWorldPosition(baitPos);
  jetskiShopCounter.getWorldPosition(jsPos);

  // World pos player (support saat parented ke jetski)
  const playerWorldPos=new THREE.Vector3();
  player.getWorldPosition(playerWorldPos);

  const sellBtn=document.getElementById("sellBtn");
  const rodBtn=document.getElementById("openRodShopBtn");
  const baitBtn=document.getElementById("openJetskiShopBtn");
  const mountBtn=document.getElementById("mountJetskiBtn");
  const harbBtn=document.getElementById("harbourBtn");

  // Sell fish
  if(playerWorldPos.distanceTo(fishPos)<8){
    nearSeller=true;sellBtn.style.display="block";
    const v=fishPos.clone().project(camera);
    sellBtn.style.left=((v.x+1)/2*window.innerWidth-sellBtn.offsetWidth/2)+"px";
    sellBtn.style.top=((-v.y+1)/2*window.innerHeight-55)+"px";
  } else{nearSeller=false;sellBtn.style.display="none";}

  // Rod shop
  if(playerWorldPos.distanceTo(rodPos)<8){
    rodBtn.style.display="block";
    const v=rodPos.clone().project(camera);
    rodBtn.style.left=((v.x*.5+.5)*window.innerWidth)+"px";
    rodBtn.style.top=((-v.y*.5+.5)*window.innerHeight)+"px";
  } else rodBtn.style.display="none";

  // Bait / jetski shop
  if(playerWorldPos.distanceTo(baitPos)<8||playerWorldPos.distanceTo(jsPos)<8){
    baitBtn.style.display="block";
  } else baitBtn.style.display="none";

  // Jetski mount
  const distToJetski=playerWorldPos.distanceTo(jetski.position);
  nearJetski=jetskiSpawned&&distToJetski<5;
  nearHarbour=playerWorldPos.distanceTo(HARBOUR_POS)<9;

  // Harbour button
  if(harbBtn){
    if(nearHarbour&&jetskiOwned&&!onJetski){
      harbBtn.style.display="block";
      harbBtn.textContent=jetskiSpawned?"🛥️ Despawn Jetski":"🛥️ Spawn Jetski";
      harbBtn.onclick=jetskiSpawned?despawnJetski:spawnJetski;
    } else if(!onJetski){
      harbBtn.style.display="none";
    }
  }

  // Mount button
  if(nearJetski&&!onJetski&&jetskiOwned){
    mountBtn.style.display="block";
    const p=jetski.position.clone();p.y+=2;p.project(camera);
    mountBtn.style.left=((p.x*.5+.5)*window.innerWidth-mountBtn.offsetWidth/2)+"px";
    mountBtn.style.top=((-p.y*.5+.5)*window.innerHeight)+"px";
    mountBtn.textContent="🛥️ Naik [E]";
  } else if(onJetski){
    mountBtn.textContent="🛥️ Turun [E]";mountBtn.style.display="block";
    mountBtn.style.left="50%";mountBtn.style.top="auto";mountBtn.style.bottom="180px";
    mountBtn.style.transform="translateX(-50%)";
  } else{
    mountBtn.style.display="none";
  }

  // Hint
  const hint=document.getElementById("interactHint");
  if(nearHarbour&&jetskiOwned&&!onJetski)hint.textContent=jetskiSpawned?"🛥️ [E] Despawn Jetski":"🛥️ [E] Spawn Jetski";
  else if(nearJetski&&!onJetski)hint.textContent="🛥️ Tekan [E] naik jetski";
  else if(playerWorldPos.distanceTo(fishPos)<8)hint.textContent="🐟 Sell Shop — tekan Sell";
  else if(playerWorldPos.distanceTo(rodPos)<8)hint.textContent="🎣 Rod Shop [E]";
  else if(playerWorldPos.distanceTo(baitPos)<8)hint.textContent="🪱 Bait / Jetski Shop";
  else{hint.textContent="";hint.style.display="none";return;}
  hint.style.display="block";
}

// ═══════ NPC ANIMATION ═══════
function animateNPCs(time){
  npcRoot.rotation.y=Math.sin(time*.002)*.1;
  rodNpcRoot.rotation.y=Math.sin(time*.0022+1)*.1;
  baitNpcRoot.rotation.y=Math.sin(time*.0018+2)*.1;
  jsNpcRoot.rotation.y=Math.sin(time*.002+3)*.1;
  const pp=new THREE.Vector3(); player.getWorldPosition(pp);
  npcGroup.lookAt(pp.x,npcGroup.position.y,pp.z);
  rodNpcGroup.lookAt(pp.x,rodNpcGroup.position.y,pp.z);
  baitNpcGroup.lookAt(pp.x,baitNpcGroup.position.y,pp.z);
  jsNpcGroup.lookAt(pp.x,jsNpcGroup.position.y,pp.z);
}

// ═══════ SAVE / LOAD ═══════
function saveProgress(){
  const d={coins,playerXP,playerLevel,fishLog:inventory.fishLog,rods:inventory.rods,equipped:inventory.equipped,bait:inventory.bait,equippedBait:inventory.equippedBait,fish:inventory.fish,jetskiOwned,weather:currentWeather.name};
  try{localStorage.setItem("fishingSave_v4",JSON.stringify(d));showMessage("💾 Saved!");}catch(e){}
}
function loadGameProgress(){
  try{
    const d=JSON.parse(localStorage.getItem("fishingSave_v4"));if(!d)return;
    coins=d.coins||0;playerXP=d.playerXP||0;playerLevel=d.playerLevel||1;
    inventory.fishLog=d.fishLog||[];inventory.rods=d.rods||["FishingRod"];
    inventory.equipped=d.equipped||"FishingRod";
    inventory.bait=d.bait||{none:999,worm:0,shrimp:0,squid:0,gold:0,magic:0};
    inventory.equippedBait=d.equippedBait||"none";
    inventory.fish=d.fish||[];
    jetskiOwned=d.jetskiOwned||false;
    if(d.weather){const w=weatherTypes.find(x=>x.name===d.weather);if(w)setWeather(w);}
    document.getElementById("coinUI").textContent="💰 "+coins;
    updateLevelUI();
    if(inventory.equipped)equipRod(inventory.equipped);
    if(jetskiOwned){const btn=document.getElementById("buyJetskiBtn");if(btn){btn.textContent="✓ Owned";btn.disabled=true;}}
  }catch(e){}
}
function setShirt(c){torso.material.color.set(c);}

// ═══════ UI EVENTS ═══════
document.getElementById("shirtColor").addEventListener("input",e=>setShirt(e.target.value));
document.getElementById("saveCustom").addEventListener("click",()=>{localStorage.setItem("playerShirt",document.getElementById("shirtColor").value);saveProgress();document.getElementById("customUI").style.display="none";});
document.getElementById("closeCustomBtn").addEventListener("click",()=>document.getElementById("customUI").style.display="none");
document.getElementById("openMenuBtn").addEventListener("click",()=>{const m=document.getElementById("menuUI");m.style.display=m.style.display==="flex"?"none":"flex";gamePaused=m.style.display==="flex";});
document.getElementById("resumeBtn").addEventListener("click",()=>{document.getElementById("menuUI").style.display="none";gamePaused=false;});
document.getElementById("settingsBtn").addEventListener("click",()=>{document.getElementById("menuUI").style.display="none";document.getElementById("customUI").style.display="block";});
document.getElementById("saveBtn").addEventListener("click",saveProgress);
document.getElementById("quitBtn").addEventListener("click",()=>location.reload());
document.getElementById("sellBtn").addEventListener("click",()=>{if(nearSeller)sellFish();});
document.getElementById("mountJetskiBtn").addEventListener("click",()=>{if(onJetski)dismountJetski();else if(nearJetski)mountJetski();});
document.getElementById("openRodShopBtn").addEventListener("click",()=>{toggleInventory();if(inventoryOpen)switchTab("rods");});
document.getElementById("openJetskiShopBtn").addEventListener("click",()=>{
  const baitPos=new THREE.Vector3();baitShopCounter.getWorldPosition(baitPos);
  const _pwp=new THREE.Vector3();player.getWorldPosition(_pwp);
  if(_pwp.distanceTo(baitPos)<8){toggleInventory();if(inventoryOpen)switchTab("bait");}
  else{document.getElementById("jetskiShopUI").style.display="flex";freezeInput=true;}
});

// ═══════ INPUT ═══════
window.addEventListener("pointerdown",e=>{
  if(e.target.id==="reelBtn")return;
  pulling=true;
  if(tensionActive)return;
  if(fishBiting)return;
  if(freezeInput||gamePaused)return;
  const openUIs=["menuUI","inventoryUI","jetskiShopUI"];
  if(openUIs.some(id=>{const el=document.getElementById(id);return el&&el.style.display==="flex";}))return;
  if(inventory.equipped)startCastAnimation();
});
window.addEventListener("pointerup",()=>pulling=false);

window.addEventListener("keydown",e=>{
  if(!gameStarted)return;
  const k=e.key.toLowerCase();
  if(k==="escape"){const m=document.getElementById("menuUI");m.style.display=m.style.display==="flex"?"none":"flex";gamePaused=m.style.display==="flex";}
  if(k===" "||k==="f"){
    if(tensionActive){tensionReeling=true;return;}
    if(inventory.equipped&&!onJetski)startCastAnimation();
  }
  if(k==="e"){
    if(onJetski){dismountJetski();return;}
    if(nearHarbour&&jetskiOwned){jetskiSpawned?despawnJetski():spawnJetski();return;}
    if(nearJetski&&jetskiSpawned){mountJetski();return;}
  }
  if(k==="i")toggleInventory();
  if(k==="1")equipRod("FishingRod");
  if(k==="2")equipRod("LuckRod");
  if(k==="3")equipRod("MediumRod");
  if(k==="4")equipRod("GoldenRod");
});
window.addEventListener("keyup",e=>{if(e.key===" ")tensionReeling=false;});

document.getElementById("slot1").addEventListener("click",()=>{
  const slot=document.getElementById("slot1");
  if(inventory.equipped){
    unequipRod();slot.classList.remove("active");slot.textContent="🎣";
  } else {
    const rodToEquip=inventory._lastSelected||"FishingRod";
    const validRod=inventory.rods.includes(rodToEquip)?rodToEquip:"FishingRod";
    equipRod(validRod);slot.classList.add("active");
  }
});
function updateHotbarSlot(){
  const slot=document.getElementById("slot1"); if(!slot)return;
  const rd=rodDatabase[inventory.equipped];
  if(rd){slot.textContent=rd.icon;slot.title=rd.name;slot.classList.add("active");}
  else{slot.textContent="🎣";slot.title="Rod";slot.classList.remove("active");}
}
function unequipRod(){
  stopFishingAll();inventory.equipped=null;
  if(rod.parent)rod.parent.remove(rod);
  backHolder.add(rod);rod.position.set(0,0,0);rod.rotation.set(0,Math.PI,0.5);
  rod.material.color.setHex(0x8b5a2b);
  armR.rotation.set(0,0,0);armL.rotation.set(0,0,0);
}

// ═══════ LOADING ═══════
let loadProgress=0;
function simulateLoading(){
  if(loadProgress>=100){document.getElementById("loadingScreen").style.display="none";return;}
  loadProgress+=Math.random()*5;if(loadProgress>100)loadProgress=100;
  document.getElementById("loadingBar").style.width=loadProgress+"%";
  document.getElementById("loadingText").textContent="Loading... "+Math.floor(loadProgress)+"%";
  setTimeout(simulateLoading,80);
}
simulateLoading();

// ═══════ MAIN LOOP ═══════
let lastTime=0;
function animate(time){
  requestAnimationFrame(animate);
  if(gamePaused)return;
  const dt=Math.min((time-lastTime)/1000,.1);lastTime=time;
  if(onJetski)updateJetski();else movePlayer(dt);
  updateCastAnimation();
  updateCamera();
  animateWater(time);
  updateFishingWait();
  updateFishingLine();
  updateTensionSystem(dt);
  animateNPCs(time);
  updateNPCInteraction();
  updateWeather(dt);
  updateWake(dt);
  updateBubbles(dt);
  updateMultiplayerFrame(dt);
  lava.material.emissiveIntensity=0.6+Math.sin(time*.005)*.4;
  renderer.render(scene,camera);
}

// ═══════ INIT ═══════
window.addEventListener("load",()=>{
  loadGameProgress();
  const ss=localStorage.getItem("playerShirt");if(ss)setShirt(ss);
  updateLevelUI();
  if(!inventory.equipped){backHolder.add(rod);rod.position.set(0,0,0);rod.rotation.set(0,Math.PI,0.5);}
});
setTimeout(()=>{gameStarted=true;},1500);
animate(0);

// FIX landscape: hanya lock kalau support, jangan paksa
(async()=>{
  try{
    if(screen.orientation&&screen.orientation.lock){
      await screen.orientation.lock("landscape");
    }
  }catch(e){
    // Tidak semua device support — abaikan error
  }
})();

window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
document.addEventListener("gesturestart",e=>e.preventDefault(),{passive:false});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});

// ═══════ MULTIPLAYER ═══════
function updateMultiplayerFrame(dt){
  if(window.MP&&typeof window.MP.update==="function")window.MP.update(dt);
}

// Expose ke window
window.scene       =scene;
window.camera      =camera;
window.player      =player;
window.hook        =hook;
window.rodDatabase =rodDatabase;
window.inventory   =inventory;
Object.defineProperty(window,'isFishing', {get:()=>isFishing, set:v=>{isFishing=v;}});
Object.defineProperty(window,'isSwimming',{get:()=>isSwimming,set:v=>{isSwimming=v;}});
Object.defineProperty(window,'onJetski',  {get:()=>onJetski,  set:v=>{onJetski=v;}});
Object.defineProperty(window,'freezeInput',{get:()=>freezeInput,set:v=>{freezeInput=v;}});
window.OWNER_NAME_FOR_SYNC="Varz444";
window.weatherTypes=weatherTypes;
window.fishTypes   =fishTypes;
window.setWeather  =setWeather;
window.gainXP      =gainXP;
window.checkLevelUp=checkLevelUp;
window.updateLevelUI=updateLevelUI;
window.xpThresholds=xpThresholds;
Object.defineProperty(window,'coins',      {get:()=>coins,      set:v=>{coins=v;}});
Object.defineProperty(window,'playerXP',   {get:()=>playerXP,   set:v=>{playerXP=v;}});
Object.defineProperty(window,'playerLevel',{get:()=>playerLevel, set:v=>{playerLevel=v;}});
  {name:"Ikan Tuna",     rarity:"Uncommon", price:25,  xp:12,  color:"#5dade2",emoji:"🐠",diff:0.8},
  {name:"Ikan Salmon",   rarity:"Rare",     price:60,  xp:25,  color:"#ff7f50",emoji:"🐡",diff:1.2},
  {name:"Ikan Lele",     rarity:"Uncommon", price:20,  xp:10,  color:"#8B7355",emoji:"🐟",diff:0.7},
  {name:"Ikan Koi",      rarity:"Rare",     price:75,  xp:30,  color:"#FF6B35",emoji:"🐠",diff:1.3},
  {name:"Ikan Hiu",      rarity:"Epic",     price:150, xp:60,  color:"#708090",emoji:"🦈",diff:2.0},
  {name:"Golden Fish",   rarity:"Epic",     price:200, xp:80,  color:"#f1c40f",emoji:"✨",diff:1.8},
  {name:"Mythic Koi",    rarity:"Legendary",price:500, xp:200, color:"#ff00ff",emoji:"🌟",diff:2.5},
  {name:"Dragon Fish",   rarity:"Legendary",price:800, xp:300, color:"#ff4444",emoji:"🐉",diff:3.0},
  {name:"Crystal Fish",  rarity:"Legendary",price:1000,xp:400, color:"#00ffff",emoji:"💎",diff:3.5},
  {name:"Old Boot",      rarity:"Junk",     price:1,   xp:1,   color:"#888",   emoji:"👟",diff:0.2},
  {name:"Treasure Chest",rarity:"Epic",     price:300, xp:100, color:"#DAA520",emoji:"📦",diff:1.6},
  {name:"Ikan Pari",     rarity:"Rare",     price:90,  xp:35,  color:"#9b59b6",emoji:"🦑",diff:1.4},
  {name:"Rainbow Fish",  rarity:"Epic",     price:250, xp:90,  color:"#ff69b4",emoji:"🌈",diff:1.9},
];

// ═══ FISH PHOTO SYSTEM ═══
const fishPhotos={}; // {fishName: dataURL}

// Load foto dari localStorage saat startup
function loadFishPhotos(){
  try{
    const saved=JSON.parse(localStorage.getItem("fishPhotos_v1")||"{}");
    Object.assign(fishPhotos,saved);
  }catch(e){}
}
loadFishPhotos();

function saveFishPhotos(){
  try{localStorage.setItem("fishPhotos_v1",JSON.stringify(fishPhotos));}catch(e){}
}

// Buka dialog upload foto untuk ikan tertentu
function uploadFishPhoto(fishName){
  const input=document.createElement("input");
  input.type="file"; input.accept="image/*";
  input.onchange=e=>{
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      fishPhotos[fishName]=ev.target.result;
      saveFishPhotos();
      showMessage("📸 Foto "+fishName+" disimpan!");
      if(inventoryOpen)renderTab("fish");
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function getFishPhotoEl(fishName,size=48){
  if(fishPhotos[fishName]){
    return`<img src="${fishPhotos[fishName]}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:8px;border:2px solid #fff3;">`;
  }
  return`<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border-radius:8px;font-size:${size*0.5}px;">${fishTypes.find(f=>f.name===fishName)?.emoji||"🐟"}</div>`;
}

// ═══════ BAIT DATABASE ═══════
const baitTypes=[
  {id:"none",   name:"No Bait",    icon:"❌",desc:"Default, no bonus.",      luckBonus:0,  speedBonus:0,  rareBonus:0,  price:0,   infinite:true},
  {id:"worm",   name:"Earthworm",  icon:"🪱",desc:"+15% bite speed.",        luckBonus:0,  speedBonus:0.3,rareBonus:0,  price:5,   infinite:false},
  {id:"shrimp", name:"Shrimp",     icon:"🦐",desc:"+20% luck, faster bite.", luckBonus:0.3,speedBonus:0.2,rareBonus:0,  price:12,  infinite:false},
  {id:"squid",  name:"Squid",      icon:"🦑",desc:"+Epic fish chance.",      luckBonus:0.5,speedBonus:0,  rareBonus:0.1,price:25,  infinite:false},
  {id:"gold",   name:"Gold Lure",  icon:"✨",desc:"+Legendary chance!",      luckBonus:1,  speedBonus:0.3,rareBonus:0.3,price:80,  infinite:false},
  {id:"magic",  name:"Magic Bait", icon:"🔮",desc:"MAX luck + speed.",       luckBonus:2,  speedBonus:0.5,rareBonus:0.5,price:200, infinite:false},
];

// ═══════ ROD DATABASE ═══════
const rodDatabase={
  FishingRod:{name:"Wood Rod",  icon:"🪵",price:0,    luckMult:1,  speedMult:1,  color:0x8b5a2b,desc:"Starter rod."},
  LuckRod:   {name:"Luck Rod",  icon:"🍀",price:150,  luckMult:2.5,speedMult:1,  color:0xaaaaaa,desc:"More rare fish."},
  MediumRod: {name:"Medium Rod",icon:"⚡",price:500,  luckMult:3,  speedMult:2,  color:0xffd700,desc:"Faster & luckier."},
  GoldenRod: {name:"Golden Rod",icon:"✨",price:2000, luckMult:5,  speedMult:2,  color:0xFFD700,desc:"Max luck rod."},
};

// ═══════ PLAYER INVENTORY DATA ═══════
const inventory={
  equipped:"FishingRod",
  rods:["FishingRod"],
  bait:{none:999,worm:0,shrimp:0,squid:0,gold:0,magic:0},
  equippedBait:"none",
  fish:[],       // [{...fishType, id:uid}]
  fishLog:[],
};
let coins=0;

// ═══════ AUDIO ═══════
function safeAudio(src){
  try{const a=new Audio(src);a.volume=0.7;return a;}
  catch(e){return{play:()=>Promise.resolve(),pause:()=>{},loop:false,volume:1,currentTime:0};}
}
const castSound  =safeAudio("sounds/cast.mp3");
const biteSound  =safeAudio("sounds/bite.mp3");
const catchSound =safeAudio("sounds/catch.mp3");
const bgMusic    =safeAudio("sounds/background_music.mp3");
bgMusic.loop=true; bgMusic.volume=0.35; bgMusic.play().catch(()=>{});

// ═══════ SCENE ═══════
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);
scene.fog=new THREE.FogExp2(0x87ceeb,0.004);

const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,2000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
document.body.appendChild(renderer.domElement);

const sun=new THREE.DirectionalLight(0xffffff,1.2);
sun.position.set(10,20,10); sun.castShadow=true; scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff,0.5));

const loader=new THREE.TextureLoader();
const sandTex  =loader.load("images/sand.jpg");
const grassTex =loader.load("images/grass.jpg");
const waterTex =loader.load("images/water.jpg");
const floorTex =loader.load("images/floor.jpg");
const wallTex  =loader.load("images/wall.jpg");
const roofTex  =loader.load("images/roof.jpg");
const tableTex =loader.load("images/table.jpg");
waterTex.wrapS=waterTex.wrapT=THREE.RepeatWrapping; waterTex.repeat.set(20,20);

// ═══════ WATER ═══════
const water=new THREE.Mesh(
  new THREE.PlaneGeometry(2000,2000,80,80),
  new THREE.MeshStandardMaterial({map:waterTex,transparent:true,opacity:0.88,roughness:0.15,metalness:0.3})
);
water.rotation.x=-Math.PI/2; water.position.y=-1; scene.add(water);

// ═══════ ISLAND BUILDER ═══════
function buildIsland(x,z,radius,grassRadius,label,grassColor,noTree){
  const g=new THREE.Group(); g.position.set(x,-2.5,z); scene.add(g);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(radius,radius+4,4,64),new THREE.MeshStandardMaterial({map:sandTex})));
  const gr=new THREE.Mesh(new THREE.CylinderGeometry(grassRadius,grassRadius+2,0.5,32),new THREE.MeshStandardMaterial({color:grassColor||0x27ae60}));
  gr.position.y=2.3; g.add(gr);
  // Palm tree — skip kalau noTree=true
  if(!noTree){
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.6,6,8),new THREE.MeshStandardMaterial({color:0x8B6914}));
    trunk.position.y=5; g.add(trunk);
    const leaves=new THREE.Mesh(new THREE.ConeGeometry(4,2.5,8),new THREE.MeshStandardMaterial({color:0x1a7a1a}));
    leaves.position.y=9.5; g.add(leaves);
  }
  return g;
}

// MAIN ISLAND
const mainIsland=buildIsland(0,0,50,45,"🏝️ Main Island",0x27ae60);

// DISTANT ISLANDS
const island2=buildIsland(500,  0,   35,30,"🏝️ Mystic Isle",  0x2ecc71);
const island3=buildIsland(-600,-500, 30,26,"🌋 Volcano Isle",  0x8B0000, true); // noTree=true
const island4=buildIsland(200,  800, 25,22,"💎 Crystal Isle",  0x00bcd4);

// Rocks
function addRock(g,x,z,s){
  const r=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),new THREE.MeshStandardMaterial({color:0x777777}));
  r.position.set(x,2.5+s,z); r.rotation.set(Math.random(),Math.random(),Math.random()); g.add(r);
}
addRock(island2,8,6,1.5); addRock(island2,-6,4,1);
addRock(island3,0,0,3); addRock(island3,7,-5,1.8);
addRock(island4,-4,5,1.2); addRock(island4,5,3,0.9);

// ═══ GUNUNG VOLCANO di island3 ═══
function buildVolcano(parentGroup){
  // Badan gunung — cone besar
  const body=new THREE.Mesh(
    new THREE.ConeGeometry(18,22,16),
    new THREE.MeshStandardMaterial({color:0x4a2800,roughness:1})
  );
  body.position.set(0,13.5,0); parentGroup.add(body);

  // Puncak kawah — kerucut terpotong (frustrumGeometry simulasi dengan 2 cone)
  const crater=new THREE.Mesh(
    new THREE.CylinderGeometry(4,8,5,16),
    new THREE.MeshStandardMaterial({color:0x333333,roughness:1})
  );
  crater.position.set(0,26,0); parentGroup.add(crater);

  // Lava di dalam kawah
  const lavaPool=new THREE.Mesh(
    new THREE.CylinderGeometry(3.5,3.5,0.5,16),
    new THREE.MeshStandardMaterial({color:0xff4500,emissive:0xff2200,emissiveIntensity:1.2})
  );
  lavaPool.position.set(0,28.6,0); parentGroup.add(lavaPool);

  // Batu-batu di sisi gunung
  for(let i=0;i<8;i++){
    const angle=(i/8)*Math.PI*2;
    const dist=10+Math.random()*5;
    const rock=new THREE.Mesh(
      new THREE.DodecahedronGeometry(1+Math.random()*1.5,0),
      new THREE.MeshStandardMaterial({color:0x3a3a3a,roughness:1})
    );
    rock.position.set(Math.cos(angle)*dist,3+Math.random()*4,Math.sin(angle)*dist);
    rock.rotation.set(Math.random(),Math.random(),Math.random());
    parentGroup.add(rock);
  }

  // Asap/partikel kawah (visual static — mesh putih transparan)
  for(let i=0;i<5;i++){
    const smoke=new THREE.Mesh(
      new THREE.SphereGeometry(1.5+i*0.5,8,8),
      new THREE.MeshStandardMaterial({color:0xaaaaaa,transparent:true,opacity:0.12-i*0.018})
    );
    smoke.position.set((Math.random()-.5)*2,30+i*3,(Math.random()-.5)*2);
    parentGroup.add(smoke);
  }

  return lavaPool; // return supaya bisa dianimasikan
}
const volcanoLava=buildVolcano(island3);

// Sign pulau (dibuat terpisah, ditaruh di tepi island)
function addIslandSign(g,label,radius){
  const sc=document.createElement("canvas"); sc.width=512; sc.height=128;
  const sx=sc.getContext("2d");
  sx.fillStyle="rgba(0,0,0,.8)"; sx.fillRect(0,0,512,128);
  sx.fillStyle="#fff"; sx.font="bold 48px Arial"; sx.textAlign="center"; sx.textBaseline="middle";
  sx.fillText(label,256,64);
  const sm=new THREE.Mesh(
    new THREE.BoxGeometry(5,1.2,0.2),
    new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)})
  );
  // Tiang sign
  const pole=new THREE.Mesh(
    new THREE.CylinderGeometry(0.1,0.1,3,8),
    new THREE.MeshStandardMaterial({color:0x8B6914})
  );
  pole.position.set(0,4,radius-0.5); g.add(pole);
  sm.position.set(0,5.8,radius-0.3); g.add(sm);
}
addIslandSign(mainIsland,"🏝️ Main Island",45);
addIslandSign(island2,"🏝️ Mystic Isle",29);
addIslandSign(island3,"🌋 Volcano Isle",25);
addIslandSign(island4,"💎 Crystal Isle",21);

// ═══════ SHOP BUILDER ═══════
function buildShop(px,pz,label){
  const g=new THREE.Group(); g.position.set(px,0,pz); g.scale.set(1.4,1.4,1.4); scene.add(g);
  const fl=new THREE.Mesh(new THREE.BoxGeometry(10,0.6,6),new THREE.MeshStandardMaterial({map:floorTex}));
  fl.position.y=0.3; g.add(fl);
  const wm=new THREE.MeshStandardMaterial({map:wallTex});
  // wall y=3.6 so bottom = 3.6-3.5=0.1 → walls start from ground
  [new THREE.Mesh(new THREE.BoxGeometry(10,7,0.4),wm),
   new THREE.Mesh(new THREE.BoxGeometry(0.4,7,6),wm),
   new THREE.Mesh(new THREE.BoxGeometry(0.4,7,6),wm)].forEach((m,i)=>{
    if(i===0)m.position.set(0,3.6,-3);
    else if(i===1)m.position.set(-4.8,3.6,0);
    else m.position.set(4.8,3.6,0);
    g.add(m);
  });
  const rm=new THREE.MeshStandardMaterial({map:roofTex});
  const rf=new THREE.Mesh(new THREE.BoxGeometry(12,0.2,8),rm); rf.position.y=7.1; g.add(rf);
  const rt=new THREE.Mesh(new THREE.ConeGeometry(5.5,2,4),rm); rt.rotation.y=Math.PI/4; rt.position.y=8.1; g.add(rt);
  const ctr=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.5,1),new THREE.MeshStandardMaterial({map:tableTex}));
  ctr.position.set(0,0.75,2.5); g.add(ctr);
  const sc=document.createElement("canvas"); sc.width=512; sc.height=256;
  const sx=sc.getContext("2d");
  sx.fillStyle="#5d4037"; sx.fillRect(0,0,512,256);
  sx.strokeStyle="#3e2723"; sx.lineWidth=12; sx.strokeRect(0,0,512,256);
  sx.fillStyle="#fff"; sx.font="bold 58px Arial"; sx.textAlign="center"; sx.textBaseline="middle";
  sx.fillText(label,256,128);
  const sg=new THREE.Mesh(new THREE.BoxGeometry(4,1,0.3),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)}));
  sg.position.set(0,6.2,2.9); g.add(sg);
  return{shop:g,counter:ctr};
}

// Fix buildShop floor (quick patch)
function makeShop(px,pz,label){
  const g=new THREE.Group(); g.position.set(px,0,pz); g.scale.set(1.4,1.4,1.4); scene.add(g);
  const fl=new THREE.Mesh(new THREE.BoxGeometry(10,0.6,6),new THREE.MeshStandardMaterial({map:floorTex}));
  fl.position.y=0.3; g.add(fl);
  const wm=new THREE.MeshStandardMaterial({map:wallTex});
  const bw=new THREE.Mesh(new THREE.BoxGeometry(10,7,0.4),wm); bw.position.set(0,1.5,-3); g.add(bw);
  const sL=new THREE.Mesh(new THREE.BoxGeometry(0.4,7,6),wm); sL.position.set(-4.8,1.5,0); g.add(sL);
  const sR=sL.clone(); sR.position.x=4.8; g.add(sR);
  const rm=new THREE.MeshStandardMaterial({map:roofTex});
  const rf=new THREE.Mesh(new THREE.BoxGeometry(12,0.2,8),rm); rf.position.y=5; g.add(rf);
  const rt=new THREE.Mesh(new THREE.ConeGeometry(5.5,2,4),rm); rt.rotation.y=Math.PI/4; rt.position.y=6; g.add(rt);
  const ctr=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.5,1),new THREE.MeshStandardMaterial({map:tableTex}));
  ctr.position.set(0,0.75,2.5); g.add(ctr);
  const sc=document.createElement("canvas"); sc.width=512; sc.height=256;
  const sx=sc.getContext("2d");
  sx.fillStyle="#5d4037"; sx.fillRect(0,0,512,256);
  sx.strokeStyle="#3e2723"; sx.lineWidth=10; sx.strokeRect(0,0,512,256);
  sx.fillStyle="#fff"; sx.font="bold 52px Arial"; sx.textAlign="center"; sx.textBaseline="middle";
  sx.fillText(label,256,128);
  const sg=new THREE.Mesh(new THREE.BoxGeometry(4,1,0.3),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)}));
  sg.position.set(0,8.2,2.9); g.add(sg);
  return{counter:ctr};
}

const {counter}         = makeShop(0,  -15,"🐟 SELL FISH");
const {counter:rodShopCounter}    = makeShop(22, -15,"🎣 ROD SHOP");
const {counter:baitShopCounter}   = makeShop(-22,-15,"🪱 BAIT SHOP");
const {counter:jetskiShopCounter} = makeShop(44, -15,"🛥️ JETSKI");

// ═══ PELABUHAN (HARBOUR) ═══
function buildHarbour(){
  const g=new THREE.Group(); g.position.set(50,0,15); scene.add(g);
  // Dermaga / dock platform
  const dock=new THREE.Mesh(new THREE.BoxGeometry(17,0.4,8),
    new THREE.MeshStandardMaterial({color:0x8B6914,roughness:0.9}));
  dock.position.y=0.2; g.add(dock);
  // Tiang-tiang dermaga
  for(let i=-1;i<=1;i++){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,3,8),
      new THREE.MeshStandardMaterial({color:0x5C4A1E}));
    pole.position.set(i*4,-1.3,4); g.add(pole);
    const pole2=pole.clone(); pole2.position.set(i*4,-1.3,-4); g.add(pole2);
  }
  // Pagar dermaga
  const rail=new THREE.Mesh(new THREE.BoxGeometry(14,0.08,0.08),
    new THREE.MeshStandardMaterial({color:0x5C4A1E}));
  rail.position.set(0,0.9,4); g.add(rail);
  const rail2=rail.clone(); rail2.position.set(0,0.9,-4); g.add(rail2);
  // Lampu dermaga
  for(let i=-1;i<=1;i+=2){
    const lp=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2,8),
      new THREE.MeshStandardMaterial({color:0x666}));
    lp.position.set(i*6,1.2,3.5); g.add(lp);
    const lb=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8),
      new THREE.MeshStandardMaterial({color:0xffff88,emissive:0xffff44,emissiveIntensity:1}));
    lb.position.set(i*6,2.3,3.5); g.add(lb);
  }
  // Tombol spawn/despawn area indicator
  const indicator=new THREE.Mesh(new THREE.CircleGeometry(3,16),
    new THREE.MeshStandardMaterial({color:0x00ff88,transparent:true,opacity:0.15}));
  indicator.rotation.x=-Math.PI/2; indicator.position.set(0,0.22,5); g.add(indicator);
  // Invisible collision floor supaya bisa diinjak
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.4, 7),
    new THREE.MeshStandardMaterial({ visible: false })
  );
  floor.position.set(0,0.2,0);
  g.add(floor);
  return g;
}
buildHarbour();

// ═══════ NPC BUILDER ═══════
function makeNPC(color,px,pz){
  const g=new THREE.Group(); const root=new THREE.Object3D(); g.add(root);
  const t=new THREE.Mesh(new THREE.BoxGeometry(2,2,1),new THREE.MeshStandardMaterial({color}));
  t.position.y=3; root.add(t);
  const h=new THREE.Mesh(new THREE.SphereGeometry(0.75,16,16),new THREE.MeshStandardMaterial({color:0xffd6b3}));
  h.position.y=1.9; t.add(h);
  const fc=document.createElement("canvas"); fc.width=128; fc.height=128;
  const fx=fc.getContext("2d");
  fx.fillStyle="#000"; fx.beginPath(); fx.arc(38,55,8,0,Math.PI*2); fx.arc(90,55,8,0,Math.PI*2); fx.fill();
  fx.beginPath(); fx.arc(64,80,22,0,Math.PI); fx.lineWidth=5; fx.stroke();
  const fm=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(fc),transparent:true}));
  fm.position.z=0.73; h.add(fm);
  const aL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xffd6b3}));
  aL.position.set(-1.5,0,0); t.add(aL);
  const aR=aL.clone(); aR.position.x=1.5; t.add(aR);
  const lL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0x2c3e50}));
  lL.position.set(-0.5,-2,0); t.add(lL);
  const lR=lL.clone(); lR.position.x=0.5; t.add(lR);
  g.scale.set(0.6,0.6,0.6); g.position.set(px,0,pz); scene.add(g);
  return{group:g,root};
}
const {group:npcGroup,root:npcRoot}         = makeNPC(0x3498db, 0,  -13.5);
const {group:rodNpcGroup,root:rodNpcRoot}   = makeNPC(0xe74c3c, 22, -13.5);
const {group:baitNpcGroup,root:baitNpcRoot} = makeNPC(0x27ae60,-22, -13.5);
const {group:jsNpcGroup,root:jsNpcRoot}     = makeNPC(0xf39c12, 44, -13.5);

// ═══════ PLAYER ═══════
const player=new THREE.Group(); scene.add(player);
const playerRoot=new THREE.Object3D(); player.add(playerRoot);
const torso=new THREE.Mesh(new THREE.BoxGeometry(2,2,1),new THREE.MeshStandardMaterial({color:0x2ecc71}));
torso.position.y=3; torso.castShadow=true; playerRoot.add(torso);
const backHolder=new THREE.Object3D(); backHolder.position.set(0,0.5,-0.7); torso.add(backHolder);
const head=new THREE.Mesh(new THREE.SphereGeometry(0.75,32,32),new THREE.MeshStandardMaterial({color:0xffd6b3,roughness:0.6}));
head.scale.y=1.05; head.position.y=1.9; head.castShadow=true; torso.add(head);
const faceC=document.createElement("canvas"); faceC.width=256; faceC.height=256;
const fctx=faceC.getContext("2d");
fctx.fillStyle="#000"; fctx.beginPath(); fctx.arc(80,110,12,0,Math.PI*2); fctx.arc(176,110,12,0,Math.PI*2); fctx.fill();
fctx.beginPath(); fctx.arc(128,160,40,0,Math.PI); fctx.lineWidth=6; fctx.stroke();
const face=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(faceC),transparent:true}));
face.position.z=0.73; head.add(face);
const armL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xffd6b3}));
armL.position.set(-1.5,0,0); torso.add(armL);
const armR=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xffd6b3}));
armR.position.set(1.5,0,0); torso.add(armR);
const handGrip=new THREE.Object3D(); handGrip.position.set(0,-1,0.75); armR.add(handGrip);
const rodPivot=new THREE.Object3D(); handGrip.add(rodPivot);
const legL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0x333}));
legL.position.set(-0.5,-2,0); torso.add(legL);
const legR=legL.clone(); legR.position.x=0.5; torso.add(legR);
player.scale.set(0.8,0.8,0.8); player.position.set(0,0,-8);

// ═══════ HELD FISH MESH (in hand) ═══════
const heldFishMesh=new THREE.Mesh(
  new THREE.SphereGeometry(0.28,10,6),
  new THREE.MeshStandardMaterial({color:0x5dade2,emissive:0x112244,emissiveIntensity:0.3})
);
heldFishMesh.scale.z=1.8;
// attach to left hand
const leftHandAnchor=new THREE.Object3D();
leftHandAnchor.position.set(0,-1.1,0);
armL.add(leftHandAnchor);
leftHandAnchor.add(heldFishMesh);
heldFishMesh.visible=false;

// ═══════ ROD MESH ═══════
const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.06,2),new THREE.MeshStandardMaterial({color:0x8b5a2b}));
const rodTip=new THREE.Object3D(); rodTip.position.set(0,1,0); rod.add(rodTip);
backHolder.add(rod); rod.position.set(0,0,0); rod.rotation.set(0,Math.PI,0.5);

// ═══════ HOOK & LINE ═══════
const hook=new THREE.Mesh(new THREE.SphereGeometry(0.12,10,10),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x4444ff,emissiveIntensity:0.3}));
hook.visible=false; scene.add(hook);
const fishingLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xffffff,opacity:0.7,transparent:true}));
scene.add(fishingLine);

// ═══════ JETSKI ═══════
const jetski=new THREE.Group();
const hull=new THREE.Mesh(new THREE.BoxGeometry(3,0.8,1.4),new THREE.MeshStandardMaterial({color:0xe74c3c,metalness:0.4,roughness:0.3}));
jetski.add(hull);
const nose=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.2,8),new THREE.MeshStandardMaterial({color:0xc0392b}));
nose.rotation.z=-Math.PI/2; nose.position.set(2,0.1,0); jetski.add(nose);
const shield=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.6,1.2),new THREE.MeshStandardMaterial({color:0x00aaff,transparent:true,opacity:0.5}));
shield.position.set(0.5,0.7,0); jetski.add(shield);
const seat=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.3,1),new THREE.MeshStandardMaterial({color:0x222}));
seat.position.set(-0.3,0.55,0); jetski.add(seat);
const hbar=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.4,8),new THREE.MeshStandardMaterial({color:0x888}));
hbar.rotation.x=Math.PI/2; hbar.position.set(0.6,0.9,0); jetski.add(hbar);
// Passenger seat (kursi belakang untuk penumpang ke-2)
const passengerSeat=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.3,1),new THREE.MeshStandardMaterial({color:0x333}));
passengerSeat.position.set(-1.4,0.55,0); jetski.add(passengerSeat);
jetski.position.copy(jetskiSpawnPos); jetski.visible=false; scene.add(jetski); // hidden until spawned

// Wake particles
const wakeParticles=[];
for(let i=0;i<25;i++){
  const p=new THREE.Mesh(new THREE.SphereGeometry(0.18,6,6),new THREE.MeshStandardMaterial({color:0xaaddff,transparent:true,opacity:0.6}));
  p.visible=false; scene.add(p);
  wakeParticles.push({mesh:p,life:0,active:false});
}

// Swim bubbles
const bubbles=[];
for(let i=0;i<20;i++){
  const b=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),new THREE.MeshStandardMaterial({color:0xaaddff,transparent:true,opacity:0.5}));
  b.visible=false; scene.add(b);
  bubbles.push({mesh:b,life:0,active:false,vel:new THREE.Vector3()});
}

// Underwater overlay
const uwDiv=document.createElement("div");
Object.assign(uwDiv.style,{position:"fixed",inset:"0",background:"rgba(0,80,160,0.22)",pointerEvents:"none",zIndex:"5",display:"none",backdropFilter:"blur(1px)"});
document.body.appendChild(uwDiv);

// ═══════ CAMERA ═══════
let camYaw=0,camPitch=0.3,camTouchId=null,lastX=0,lastY=0;
renderer.domElement.addEventListener("touchstart",e=>{
  const t=e.changedTouches[0];
  if(t.clientX>window.innerWidth/2){camTouchId=t.identifier;lastX=t.clientX;lastY=t.clientY;}
});
renderer.domElement.addEventListener("touchmove",e=>{
  const t=[...e.touches].find(t=>t.identifier===camTouchId); if(!t)return;
  camYaw-=(t.clientX-lastX)*0.007; camPitch-=(t.clientY-lastY)*0.007;
  camPitch=THREE.MathUtils.clamp(camPitch,0.05,1.4);
  lastX=t.clientX; lastY=t.clientY;
});
renderer.domElement.addEventListener("touchend",e=>{
  if([...e.changedTouches].find(t=>t.identifier===camTouchId))camTouchId=null;
});

// ═══════ JOYSTICK ═══════
const joy=document.getElementById("joystick"),stick=document.getElementById("stick");
let joyX=0,joyY=0,joyTouchId=null;
joy.addEventListener("touchstart",e=>{const t=e.changedTouches[0];if(t.clientX<window.innerWidth/2)joyTouchId=t.identifier;});
joy.addEventListener("touchmove",e=>{
  const t=[...e.touches].find(t=>t.identifier===joyTouchId); if(!t)return;
  const r=joy.getBoundingClientRect(),x=t.clientX-r.left-60,y=t.clientY-r.top-60;
  const d=Math.min(40,Math.hypot(x,y)),a=Math.atan2(y,x);
  joyX=Math.cos(a)*(d/40); joyY=Math.sin(a)*(d/40);
  stick.style.left=(35+joyX*30)+"px"; stick.style.top=(35+joyY*30)+"px";
});
joy.addEventListener("touchend",e=>{
  if([...e.changedTouches].find(t=>t.identifier===joyTouchId)){
    joyTouchId=null;joyX=0;joyY=0;stick.style.left="35px";stick.style.top="35px";
  }
});
const keys={};
window.addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;});
window.addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false;});
let walkAnim=0;

// ═══════ ISLAND CHECK ═══════
function checkOnLand(){
  const px=player.position.x,pz=player.position.z;
  if(px*px+pz*pz<48*48)return true;
  if((px-500)**2+pz**2<34*34)return true;
  if((px+600)**2+(pz+500)**2<30*30)return true;
  if((px-200)**2+(pz-800)**2<25*25)return true;
// Pelabuhan — radius 7 sesuai ukuran dock (14x7)
  if((px-50)**2+(pz-15)**2<7*7)return true;
  return false;
}

// ═══════ SWIM ANIMATION (freestyle crawl) ═══════
function updateSwimAnim(dt, moving){
  // Lebih lambat supaya tidak twitch
  swimCycle += dt * (moving ? 1.5 : 0.6);

  torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, -0.5, 0.07);
  torso.position.y  = THREE.MathUtils.lerp(torso.position.y, 2.5, 0.07);
  torso.rotation.z  = Math.sin(swimCycle * 0.5) * 0.1;

  head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -0.1, 0.07);
  head.rotation.z = 0;

  // Lengan crawl — amplitudo dikecilkan biar tidak "terbang"
  armL.rotation.x = Math.sin(swimCycle) * 0.9;
  armL.rotation.z = Math.cos(swimCycle) * 0.25 - 0.2;
  armR.rotation.x = Math.sin(swimCycle + Math.PI) * 0.9;
  armR.rotation.z = -(Math.cos(swimCycle + Math.PI) * 0.25) + 0.2;

  // Flutter kick kaki
  legL.rotation.x = Math.sin(swimCycle * 2) * 0.2;
  legR.rotation.x = Math.sin(swimCycle * 2 + Math.PI) * 0.2;
  legL.rotation.z = 0; legR.rotation.z = 0;
}

function resetBodyPose(){
  torso.rotation.x=THREE.MathUtils.lerp(torso.rotation.x,0,0.12);
  torso.rotation.z=THREE.MathUtils.lerp(torso.rotation.z,0,0.12);
  torso.position.y=THREE.MathUtils.lerp(torso.position.y,3,0.12);
  head.rotation.x=THREE.MathUtils.lerp(head.rotation.x,0,0.12);
  head.rotation.z=THREE.MathUtils.lerp(head.rotation.z,0,0.12);
}

// ═══════ PLAYER MOVEMENT ═══════
function movePlayer(dt){
  if(onJetski)return;
  let mX=joyX,mY=joyY;
  if(keys["w"]||keys["arrowup"])mY=-1;
  if(keys["s"]||keys["arrowdown"])mY=1;
  if(keys["a"]||keys["arrowleft"])mX=-1;
  if(keys["d"]||keys["arrowright"])mX=1;

  const fwd=new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y=0; fwd.normalize();
  const rgt=new THREE.Vector3(); rgt.crossVectors(fwd,camera.up).normalize();
  const dir=new THREE.Vector3(); dir.addScaledVector(fwd,-mY); dir.addScaledVector(rgt,mX);

  if(dir.lengthSq()>0.0001){
    const ta=Math.atan2(dir.x,dir.z);
    let diff=ta-player.rotation.y; diff=Math.atan2(Math.sin(diff),Math.cos(diff));
    player.rotation.y+=diff*0.12;
  }

  const spd=isSwimming?0.07:0.11;
  if(!freezePlayer) player.position.addScaledVector(dir,spd);

  // Vertical
  if(isSwimming){
    player.position.y=THREE.MathUtils.lerp(player.position.y,-2.2,0.1); // di bawah permukaan air (y=0)
  } else {
    player.position.y=THREE.MathUtils.lerp(player.position.y,0,0.15);
  }

  const moving=dir.lengthSq()>0.001&&!freezeInput&&!isFishing;

  if(isSwimming){
    uwDiv.style.display="block";
    updateSwimAnim(dt,moving);
    // spawn bubbles occasionally
    if(moving&&Math.random()<0.08){
      for(const b of bubbles){
        if(!b.active){
          b.active=true;b.life=1;b.mesh.visible=true;
          b.mesh.position.copy(player.position);
          b.mesh.position.y+=0.5;
          b.vel.set((Math.random()-.5)*0.06,0.04+Math.random()*0.04,(Math.random()-.5)*0.06);
          break;
        }
      }
    }
  } else {
    uwDiv.style.display="none";
    resetBodyPose();
    if(moving){ walkAnim+=0.18; }
    const sw=Math.sin(walkAnim);
    if(moving&&!castingPose&&!isFishing){
      legL.rotation.x=sw*0.8; legR.rotation.x=-sw*0.8;
      armL.rotation.x=-sw*0.5; armL.rotation.z=0;
      armR.rotation.z=-0.2;
      if(!isFishing)armR.rotation.x=sw*0.5;
      torso.position.y=3+Math.abs(sw)*0.08;
    } else if(!isSwimming&&!isFishing&&!castingPose){
      legL.rotation.x=THREE.MathUtils.lerp(legL.rotation.x,0,0.15);
      legR.rotation.x=THREE.MathUtils.lerp(legR.rotation.x,0,0.15);
      armL.rotation.x=THREE.MathUtils.lerp(armL.rotation.x,0,0.15);
      armR.rotation.x=THREE.MathUtils.lerp(armR.rotation.x,0,0.15);
      walkAnim*=0.9;
    }
  }

  // Water detection
  const onLand=checkOnLand();
  if(!onLand&&!isSwimming){isSwimming=true;showMessage("🌊 Swimming!");}
  if(onLand&&isSwimming){isSwimming=false;swimCycle=0;}
}

function updateCamera(){
  const tgt=player.position.clone(); tgt.y+=3.3;
  const dist=onJetski?12:8;
  const des=new THREE.Vector3(tgt.x-Math.sin(camYaw)*dist,tgt.y+camPitch*4,tgt.z-Math.cos(camYaw)*dist);
  camera.position.lerp(des,0.18); camera.lookAt(tgt);
}

function animateWater(time){
  const pos=water.geometry.attributes.position;
  for(let i=0;i<pos.count;i+=4)pos.setZ(i,Math.sin(i*0.3+time*0.0015)*0.15);
  pos.needsUpdate=true;
}

// ═══════ JETSKI ═══════
function mountJetski(){
  if(!jetskiOwned){showMessage("🛥️ Beli Jetski dari Jetski Shop!");return;}
  if(!jetskiSpawned){showMessage("🛥️ Spawn jetski dulu di Pelabuhan!");return;}
  onJetski=true;isSwimming=false;uwDiv.style.display="none";
  // Parent player ke jetski supaya ikut bergerak
  scene.remove(player);
  jetski.add(player);
  player.position.set(-0.3, 0.75, 0); // duduk di kursi jetski
  player.rotation.set(0, 0, 0);
  // Pose duduk
  torso.rotation.x=0.05;
  legL.rotation.x=1.4; legR.rotation.x=1.4;
  legL.rotation.z=0.15; legR.rotation.z=-0.15;
  armL.rotation.x=-0.5; armR.rotation.x=-0.5;
  armL.rotation.z=0.4;  armR.rotation.z=-0.4;
  document.getElementById("jetskiUI").style.display="block";
  if(window.MP&&window.MP.isActive())window.MP.sendEvent("mountJetski",{});
  showMessage("🛥️ Naik! [WASD] kemudi · [E] turun");
}
function dismountJetski(){
  onJetski=false;jetskiSpeed=0;
  // Un-parent player dari jetski, kembalikan ke scene
  if(player.parent===jetski){
    const worldPos=new THREE.Vector3();
    jetski.localToWorld(worldPos.set(-0.3,0.75,0));
    jetski.remove(player);
    scene.add(player);
    player.position.set(jetski.position.x+3,0,jetski.position.z);
    player.rotation.set(0,0,0);
  }
  // Reset pose berdiri
  torso.rotation.x=0;
  legL.rotation.x=0; legR.rotation.x=0;
  legL.rotation.z=0; legR.rotation.z=0;
  armL.rotation.x=0; armR.rotation.x=0;
  armL.rotation.z=0; armR.rotation.z=0;
  document.getElementById("jetskiUI").style.display="none";
  if(window.MP&&window.MP.isActive())window.MP.sendEvent("dismountJetski",{});
  showMessage("Turun dari jetski.");
}
function spawnJetski(){
  if(!jetskiOwned){showMessage("🛥️ Beli Jetski dulu!");return;}
  jetskiSpawned=true;
  jetski.position.set(jetskiSpawnPos.x,jetskiSpawnPos.y,jetskiSpawnPos.z);
  jetski.visible=true;
  jetski.rotation.set(0,0,0);  // ← pastikan ini ada, x=0 bukan miring
  showMessage("🛥️ Jetski di-spawn di Pelabuhan!");
}
function despawnJetski(){
  if(onJetski)dismountJetski();
  jetskiSpawned=false;
  jetski.visible=false;
  showMessage("🛥️ Jetski di-despawn.");
}
function updateJetski(){
  if(!onJetski)return;
  let mX=joyX,mY=joyY;
  if(keys["w"]||keys["arrowup"])mY=-1;
  if(keys["s"]||keys["arrowdown"])mY=1;
  if(keys["a"]||keys["arrowleft"])mX=-1;
  if(keys["d"]||keys["arrowright"])mX=1;
  if(Math.abs(mX)>0.1)jetski.rotation.y-=mX*0.04;
  if(mY<-0.1)jetskiSpeed=Math.min(jetskiSpeed+0.012,jetskiMaxSpeed);
  else if(mY>0.1)jetskiSpeed=Math.max(jetskiSpeed-0.01,-jetskiMaxSpeed*0.3);
  else jetskiSpeed*=0.92;
  jetski.position.x+=Math.sin(jetski.rotation.y)*jetskiSpeed;
  jetski.position.z+=Math.cos(jetski.rotation.y)*jetskiSpeed;
  jetski.position.y=0.1+Math.sin(Date.now()*0.002)*0.08;
  jetski.rotation.x=jetskiSpeed*0.18; jetski.rotation.z=-mX*0.07;
  // Tangan gerak ikut setir saat belok
  armL.rotation.z=0.4+mX*0.15; armR.rotation.z=-0.4+mX*0.15;
  torso.rotation.z=mX*-0.05;
  document.getElementById("jetskiSpeed").textContent=Math.abs(Math.round(jetskiSpeed*240))+" km/h";
  // wake
  if(Math.abs(jetskiSpeed)>0.05&&Math.random()<0.4){
    for(const p of wakeParticles){
      if(!p.active){
        p.active=true;p.life=1;p.mesh.visible=true;
        const s=(Math.random()-.5)*1.2;
        p.mesh.position.set(jetski.position.x-Math.sin(jetski.rotation.y)*2+Math.cos(jetski.rotation.y)*s,-0.85,jetski.position.z-Math.cos(jetski.rotation.y)*2-Math.sin(jetski.rotation.y)*s);
        break;
      }
    }
  }
}
function updateWake(dt){
  for(const p of wakeParticles){
    if(!p.active)continue;
    p.life-=dt*1.5; if(p.life<=0){p.active=false;p.mesh.visible=false;continue;}
    p.mesh.position.y=-0.9+p.life*0.3;
    p.mesh.material.opacity=p.life*0.45;
    p.mesh.scale.setScalar(1+(1-p.life)*2);
  }
}
function updateBubbles(dt){
  for(const b of bubbles){
    if(!b.active)continue;
    b.life-=dt*0.9; if(b.life<=0){b.active=false;b.mesh.visible=false;continue;}
    b.mesh.position.add(b.vel);
    b.mesh.material.opacity=b.life*0.5; b.mesh.scale.setScalar(b.life);
  }
}

// ═══════ TENSION BAR FISHING SYSTEM ═══════
function startCastAnimation(){
  if(castingNow||isFishing)return;
  if(!inventory.equipped){showMessage("Equip a rod first!");return;}
  if(isSwimming){showMessage("❌ Can't fish while swimming!");return;}
  if(onJetski){showMessage("❌ Dismount first! [E]");return;}
  // Tambah ini — hanya bisa mancing di air:
  if(checkOnLand()){showMessage("❌ Tidak bisa memancing didaratan!");return;}
  castingNow=true;castAnimation=0;castReleased=false;
}

function updateCastAnimation(){
  if(!castingNow)return;
  castAnimation+=0.05;
  if(castAnimation<0.4){castingPose=true;armR.rotation.x=-1.6;rodPivot.rotation.x=-0.6;}
  else if(castAnimation<0.7){armR.rotation.x+=0.25;rodPivot.rotation.x+=0.25;}
  else if(castAnimation>=0.7&&!castReleased){castReleased=true;castLineSimple();}
  if(castAnimation>=1){castingNow=false;castingPose=false;armR.rotation.x=-0.6;rodPivot.rotation.x=0;}
}

function castLineSimple(){
  if(isFishing)return;
  hook.userData={velocity:new THREE.Vector3()};
  isFishing=true;hookInWater=false;fishBiting=false;fishingTimer=0;
  castSound.play().catch(()=>{});
  const sp=new THREE.Vector3(); rodTip.getWorldPosition(sp);
  hook.position.copy(sp); hook.visible=true;
  const fw=new THREE.Vector3(0,0,1).applyQuaternion(player.quaternion); fw.y+=0.35;
  hook.userData.velocity=fw.multiplyScalar(0.28);
  const rd=rodDatabase[inventory.equipped]||rodDatabase.FishingRod;
  const bd=baitTypes.find(b=>b.id===inventory.equippedBait)||baitTypes[0];
  const sm=(rd.speedMult||1)*currentWeather.speedMult*(1+bd.speedBonus);
  biteTime=(Math.random()*4+2)/sm;
}

function updateFishingWait(){
  if(!inventory.equipped||!hook.visible)return;
  if(!hookInWater){
    hook.position.add(hook.userData.velocity);
    hook.userData.velocity.y-=0.012;
    if(hook.position.y<=0){hook.position.y=0;hookInWater=true;fishingTimer=0;}
  }
  if(hookInWater&&!fishBiting&&!tensionActive){
    fishingTimer+=0.016;
    if(fishingTimer>=biteTime){
      // Determine fish now, start tension
      pendingFish=getRandomFish();
      startTension(pendingFish);
    }
  }
  if(fishBiting&&!tensionActive) armR.rotation.z=Math.sin(Date.now()*0.02)*0.2;
}

function startTension(fish){
  fishBiting=true;tensionActive=true;
  tensionVal=50;tensionProgress=0;tensionReeling=false;
  tensionDifficulty=fish.diff||1;
  tensionFishSpeed=0.4*tensionDifficulty;
  tensionDir=Math.random()<0.5?1:-1;
  tensionTimeout=15; // seconds before fish escapes
  freezePlayer=true;

  // Set zone width based on difficulty
  const zoneWidth=Math.max(12,30-tensionDifficulty*5);
  zoneMin=50-zoneWidth/2; zoneMax=50+zoneWidth/2;

  document.getElementById("biteIcon").style.display="block";
  biteSound.play().catch(()=>{});

  setTimeout(()=>{
    document.getElementById("biteIcon").style.display="none";
    document.getElementById("tensionContainer").style.display="flex";
    updateTensionUI();
  },500);
}

function updateTensionSystem(dt){
  if(!tensionActive)return;
  tensionTimeout-=dt;
  if(tensionTimeout<=0){loseFish();return;}

  // Fish movement — oscillates, changes dir randomly
  tensionFishSpeed+=((Math.random()-.5)*0.08)*tensionDifficulty;
  tensionFishSpeed=THREE.MathUtils.clamp(tensionFishSpeed,-1.2*tensionDifficulty,1.2*tensionDifficulty);
  if(Math.random()<0.02)tensionDir*=-1;
  tensionVal+=tensionFishSpeed*tensionDir*dt*60;
  tensionVal=THREE.MathUtils.clamp(tensionVal,0,100);
  if(tensionVal<=0||tensionVal>=100){tensionDir*=-1;}

  // Is indicator in zone?
  const inZone=tensionVal>=zoneMin&&tensionVal<=zoneMax;

  // Reeling: hold the reel button  
  if(tensionReeling&&inZone){
    tensionProgress+=dt*18/tensionDifficulty;
  } else if(tensionReeling&&!inZone){
    tensionProgress-=dt*12; // penalty
  } else if(!tensionReeling&&inZone){
    tensionProgress-=dt*6; // slight drain if not reeling in zone
  }
  tensionProgress=THREE.MathUtils.clamp(tensionProgress,0,100);

  if(tensionProgress>=100){catchFish();return;}

  updateTensionUI();

  // Arm animation
  if(tensionReeling){ armR.rotation.x=Math.sin(Date.now()*0.03)*0.3-0.8; }
  else { armR.rotation.x=THREE.MathUtils.lerp(armR.rotation.x,-0.6,0.1); }
}

function updateTensionUI(){
  const bar=document.getElementById("tensionBar");
  const zone=document.getElementById("tensionZone");
  const ind=document.getElementById("tensionIndicator");
  const prompt=document.getElementById("catchPrompt");
  const track=document.getElementById("tensionTrack");
  const trackW=track.offsetWidth||260;

  // Progress fills the bar (green = progress)
  bar.style.width=tensionProgress+"%";
  const inZone=tensionVal>=zoneMin&&tensionVal<=zoneMax;
  bar.style.background=tensionProgress>70?"linear-gradient(90deg,#27ae60,#2ecc71)":tensionProgress>30?"linear-gradient(90deg,#f39c12,#f1c40f)":"linear-gradient(90deg,#e74c3c,#c0392b)";

  // Zone highlight
  zone.style.left=(zoneMin)+"%";
  zone.style.width=(zoneMax-zoneMin)+"%";
  zone.style.background=inZone?"rgba(46,204,113,0.35)":"rgba(231,76,60,0.25)";

  // Indicator (fish position)
  ind.style.left=tensionVal+"%";
  ind.style.background=inZone?"#2ecc71":"#e74c3c";
  ind.style.boxShadow=inZone?"0 0 10px #2ecc71":"0 0 8px #e74c3c";

  prompt.style.display=inZone?"block":"none";
  document.getElementById("tensionLabel").textContent=inZone?"✅ IN ZONE — REEL IN!":"⚠️ Get fish in the zone!";
}

function catchFish(){
  tensionActive=false;fishBiting=false;isFishing=false;
  document.getElementById("tensionContainer").style.display="none";
  if(!pendingFish){stopFishingAll();return;}
  // consume bait
  if(inventory.equippedBait!=="none"){
    inventory.bait[inventory.equippedBait]=Math.max(0,inventory.bait[inventory.equippedBait]-1);
    if(inventory.bait[inventory.equippedBait]===0){
      inventory.equippedBait="none";showMessage("🪱 Bait used up!");
    }
  }
  const cf={...pendingFish,id:Date.now()+Math.random()};
  inventory.fish.push(cf);
  inventory.fishLog.unshift({...cf,time:new Date().toLocaleTimeString()});
  if(inventory.fishLog.length>50)inventory.fishLog.pop();
  showFishNotification(cf);gainXP(cf.xp);
  catchSound.play().catch(()=>{});
  stopFishingAll();pendingFish=null;
}

function loseFish(){
  tensionActive=false;fishBiting=false;
  document.getElementById("tensionContainer").style.display="none";
  stopFishingAll();pendingFish=null;
  showMessage("🐟 The fish got away!");
}

function stopFishingAll(){
  isFishing=false;castingPose=false;castingNow=false;
  fishBiting=false;hookInWater=false;freezeInput=false;freezePlayer=false;
  fishingTimer=0;biteTime=0;hook.visible=false;
  hook.userData={velocity:new THREE.Vector3()};
  document.getElementById("biteIcon").style.display="none";
  document.getElementById("tensionContainer").style.display="none";
  tensionActive=false;tensionReeling=false;
  armR.rotation.set(-0.6,0,-0.2);armL.rotation.set(0,0,0);rodPivot.rotation.set(0,0,0);
  fishingLine.visible=false;
}

function updateFishingLine(){
  if(!hook.visible){fishingLine.visible=false;return;}
  fishingLine.visible=true;
  const s=new THREE.Vector3(); rodTip.getWorldPosition(s);
  fishingLine.geometry.setFromPoints([s,hook.position.clone()]);
}

// Reel button events
document.getElementById("reelBtn").addEventListener("pointerdown",e=>{e.stopPropagation();tensionReeling=true;});
document.getElementById("reelBtn").addEventListener("pointerup",()=>tensionReeling=false);
document.getElementById("reelBtn").addEventListener("touchstart",e=>{e.stopPropagation();tensionReeling=true;},{passive:true});
document.getElementById("reelBtn").addEventListener("touchend",()=>tensionReeling=false);

// ═══════ FISH RANDOMIZER ═══════
function getRandomFish(){
  const rd=rodDatabase[inventory.equipped]||rodDatabase.FishingRod;
  const bd=baitTypes.find(b=>b.id===inventory.equippedBait)||baitTypes[0];
  const luck=(rd.luckMult||1)*currentWeather.luckMult*(1+playerLevel*0.025)*(1+bd.luckBonus);
  const rareB=bd.rareBonus||0;
  const r=Math.random()/(luck*(1+rareB));
  if(r<0.015)return fishTypes[9];   // Crystal
  if(r<0.04) return fishTypes[8];   // Dragon
  if(r<0.08) return fishTypes[7];   // Mythic
  if(r<0.12) return fishTypes[13];  // Rainbow
  if(r<0.17) return fishTypes[6];   // Golden
  if(r<0.23) return fishTypes[11];  // Chest
  if(r<0.31) return fishTypes[5];   // Hiu
  if(r<0.40) return fishTypes[12];  // Pari
  if(r<0.49) return fishTypes[4];   // Koi
  if(r<0.57) return fishTypes[2];   // Salmon
  if(r<0.66) return fishTypes[1];   // Tuna
  if(r<0.73) return fishTypes[3];   // Lele
  if(r<0.77) return fishTypes[10];  // Boot
  return fishTypes[0];
}

// ═══════ INVENTORY UI ═══════
let inventoryOpen=false;
function toggleInventory(){
  inventoryOpen=!inventoryOpen;
  document.getElementById("inventoryUI").style.display=inventoryOpen?"flex":"none";
  if(inventoryOpen){freezeInput=true;renderTab(activeTab.current);}
  else freezeInput=false;
}

function switchTab(tab){
  activeTab.current=tab;
  document.querySelectorAll(".invTab").forEach((el,i)=>{
    const tabs=["rods","bait","fish"];
    el.classList.toggle("active",tabs[i]===tab);
  });
  renderTab(tab);
}

function renderTab(tab){
  const content=document.getElementById("invContent");
  if(tab==="rods") renderRodsTab(content);
  else if(tab==="bait") renderBaitTab(content);
  else renderFishTab(content);
}

function renderRodsTab(el){
  // All rods: owned + shop ones
  const allRods=[
    {id:"FishingRod",...rodDatabase.FishingRod},
    {id:"LuckRod",  ...rodDatabase.LuckRod},
    {id:"MediumRod",...rodDatabase.MediumRod},
    {id:"GoldenRod",...rodDatabase.GoldenRod},
  ];
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:12px;">Tap to equip. Buy unowned rods below.</div>`
    +allRods.map(r=>{
      const owned=inventory.rods.includes(r.id);
      const eq=inventory.equipped===r.id;
      return`<div class="rodRow${eq?" equipped":""}" onclick="${owned?`equipRod('${r.id}')`:`buyRod('${r.id}')`}">
        <div class="rodIcon">${r.icon}</div>
        <div class="rodInfo">
          <h4>${r.name} ${eq?"<span style='color:#f1c40f'>✓ Equipped</span>":""}</h4>
          <p>${r.desc}</p>
          <div class="rodStats">⚡${r.speedMult}x &nbsp;🍀${r.luckMult}x${!owned?" &nbsp;💰"+r.price:""}</div>
        </div>
        <button class="rodEquipBtn ${eq?"eq":"neq"}">${eq?"Equipped":owned?"Equip":"Buy 💰"+r.price}</button>
      </div>`;
    }).join("");
}

function renderBaitTab(el){
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:12px;">Tap to select bait. Buy more at the Bait Shop.</div>
  <div class="baitGrid">`
    +baitTypes.map(b=>{
      const count=b.infinite?b.id==="none"?"∞":"∞":inventory.bait[b.id]||0;
      const eq=inventory.equippedBait===b.id;
      return`<div class="baitCard${eq?" selected":""}" onclick="selectBait('${b.id}')">
        <div class="baitIcon">${b.icon}</div>
        <h4>${b.name}</h4>
        <p>${b.desc}</p>
        <div class="baitCount">×${count}</div>
        ${b.id!=="none"&&count===0?`<button class="buyRodBtn" style="margin-top:6px" onclick="event.stopPropagation();buyBait('${b.id}')">Buy 💰${b.price}</button>`:""}
      </div>`;
    }).join("")
  +"</div>";
}

function renderFishTab(el){
  if(inventory.fish.length===0){
    el.innerHTML=`<div style="text-align:center;color:#aaa;padding:40px;">🐟 No fish!</div>`;
    return;
  }
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:10px;">${inventory.fish.length} fish</div>
  <div class="fishBagGrid">`
  +inventory.fish.map((f,i)=>{
    // Ambil canvas dari cache tekstur
    const tex = getFishTexture(f.name);
    const imgSrc = tex.image.toDataURL();
    return`<div class="fishCard${heldFishIndex===i?" holding":""}">
      <img src="${imgSrc}" style="width:100%;height:52px;object-fit:cover;border-radius:8px;margin-bottom:4px;">
      <h4>${f.name}</h4>
      <div class="fishRar rarity-${f.rarity}">${f.rarity}</div>
      <div class="fishPrice">💰${f.price}</div>
      <button class="holdBtn ${heldFishIndex===i?"unhold":"hold"}" onclick="toggleHoldFish(${i})">${heldFishIndex===i?"Put down":"Hold 🤚"}</button>
    </div>`;
  }).join("")
  +`</div>
  <button id="invSellAllBtn" onclick="sellAllFish()">💰 Sell All (+💰${inventory.fish.reduce((s,f)=>s+f.price,0)})</button>`;
}
function equipRod(name){
  if(!inventory.rods.includes(name)){showMessage("You don't own this rod!");return;}
  inventory.equipped=name;
  inventory._lastSelected=name; // simpan pilihan terakhir untuk hotbar
  if(rod.parent)rod.parent.remove(rod);
  rodPivot.add(rod); rod.position.set(0,0,0); rod.rotation.set(Math.PI/2,0,0);
  armR.rotation.x=-0.6;armR.rotation.z=-0.2;
  rod.material.color.setHex(rodDatabase[name]?.color||0x8b5a2b);
  showMessage("🎣 Equipped: "+rodDatabase[name].name);
  updateHotbarSlot(); // update icon hotbar
  if(inventoryOpen)renderTab("rods");
}

function selectBait(id){
  const bd=baitTypes.find(b=>b.id===id);
  if(!bd)return;
  if(!bd.infinite&&(inventory.bait[id]||0)===0){showMessage("Buy this bait first!");return;}
  inventory.equippedBait=id;
  showMessage(bd.icon+" Bait: "+bd.name);
  renderTab("bait");
}

function buyBait(id){
  const bd=baitTypes.find(b=>b.id===id); if(!bd)return;
  // Buy 10 at once
  const qty=10,cost=bd.price*qty;
  if(coins<cost){showMessage("Need 💰"+cost+" for 10x "+bd.name);return;}
  coins-=cost; inventory.bait[id]=(inventory.bait[id]||0)+qty;
  document.getElementById("coinUI").textContent="💰 "+coins;
  showMessage("✅ Bought 10x "+bd.name+"!");
  renderTab("bait"); saveProgress();
}

function toggleHoldFish(i){
  if(heldFishIndex===i){
    // put down
    heldFishIndex=-1;heldFishMesh.visible=false;
    document.getElementById("heldFishHUD").style.display="none";
  } else {
    heldFishIndex=i;
    const f=inventory.fish[i];
    // change mesh color to fish color
    heldFishMesh.material.color.set(f.color||"#5dade2");
    heldFishMesh.visible=true;
    document.getElementById("heldFishHUD").style.display="block";
    document.getElementById("heldFishHUD").textContent=f.emoji+" Holding: "+f.name;
  }
  renderTab("fish");
}

// ═══════ SELL / BUY ═══════
function sellFish(){
  if(inventory.fish.length===0){showMessage("🚫 No fish!");return;}
  sellAllFish();
}
function sellAllFish(){
  let total=0; inventory.fish.forEach(f=>total+=f.price);
  coins+=total; inventory.fish=[];heldFishIndex=-1;heldFishMesh.visible=false;
  document.getElementById("coinUI").textContent="💰 "+coins;
  document.getElementById("heldFishHUD").style.display="none";
  showMessage("🐟 Sold all! +💰"+total);
  if(inventoryOpen)renderTab("fish");
  saveProgress();
}

function buyRod(name){
  if(inventory.rods.includes(name)){showMessage("Already owned!");return;}
  const rd=rodDatabase[name]; if(!rd)return;
  if(coins<rd.price){showMessage("❌ Need 💰"+rd.price);return;}
  coins-=rd.price;inventory.rods.push(name);
  document.getElementById("coinUI").textContent="💰 "+coins;
  showMessage("✅ "+rd.name+" purchased!");renderTab("rods");saveProgress();
}

function buyJetski(){
  if(jetskiOwned){showMessage("Already own Jetski!");return;}
  if(coins<1500){showMessage("❌ Need 💰1500");return;}
  coins-=1500;jetskiOwned=true;
  document.getElementById("coinUI").textContent="💰 "+coins;
  showMessage("🛥️ Jetski purchased!");
  const btn=document.getElementById("buyJetskiBtn");
  if(btn){btn.textContent="✓ Owned";btn.disabled=true;}
  saveProgress();
}
function closeJetskiShop(){document.getElementById("jetskiShopUI").style.display="none";freezeInput=false;}

// ═══════ NOTIFICATIONS ═══════
function showFishNotification(fish){
  const el=document.getElementById("fishNotify");
  el.style.display="block";
  el.style.color=fish.color;
  // Tampilkan foto kalau ada
  const photoHtml=fishPhotos[fish.name]
    ?`<img src="${fishPhotos[fish.name]}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:6px;">`
    :fish.emoji+" ";
  el.innerHTML=photoHtml+fish.name+" ("+fish.rarity+") +💰"+fish.price;
  clearTimeout(el._t);el._t=setTimeout(()=>el.style.display="none",2800);
}
function showEventNotification(text){
  const el=document.getElementById("eventNotify");
  el.style.display="block";el.textContent=text;
  clearTimeout(el._t);el._t=setTimeout(()=>el.style.display="none",4000);
}
function showMessage(text){
  const m=document.createElement("div");m.textContent=text;
  Object.assign(m.style,{position:"fixed",top:"20%",left:"50%",transform:"translateX(-50%)",
    background:"rgba(0,0,0,.85)",color:"#fff",padding:"11px 22px",borderRadius:"12px",
    fontFamily:"Arial",zIndex:"9999",fontSize:"14px",whiteSpace:"nowrap",
    boxShadow:"0 4px 16px rgba(0,0,0,.5)"});
  document.body.appendChild(m);setTimeout(()=>m.remove(),2200);
}

// ═══════ LEVEL / XP ═══════
function gainXP(amt){
  playerXP+=amt;
  const el=document.getElementById("xpNotify");
  el.textContent="+"+amt+" XP!";el.style.display="block";
  el.style.animation="none";void el.offsetWidth;el.style.animation="xpFloat 1.2s ease-out forwards";
  setTimeout(()=>el.style.display="none",1300);
  checkLevelUp();updateLevelUI();
}
function checkLevelUp(){
  while(playerLevel<xpThresholds.length&&playerXP>=xpThresholds[playerLevel]){
    playerLevel++;
    showMessage("🎉 LEVEL UP! Lv."+playerLevel+" — "+levelTitles[Math.min(playerLevel-1,levelTitles.length-1)]);
  }
}
function updateLevelUI(){
  const lv=Math.min(playerLevel,xpThresholds.length-1);
  const nx=xpThresholds[lv]||xpThresholds[xpThresholds.length-1];
  const pv=xpThresholds[lv-1]||0;
  document.getElementById("levelNum").textContent=playerLevel;
  document.getElementById("levelTitle").textContent=levelTitles[Math.min(playerLevel-1,levelTitles.length-1)];
  document.getElementById("xpBar").style.width=Math.min(100,((playerXP-pv)/(nx-pv))*100)+"%";
  document.getElementById("xpText").textContent=playerXP+"/"+nx+" XP";
}

// ═══════ WEATHER ═══════
function setWeather(w){
  currentWeather=w;scene.background=new THREE.Color(w.skyColor);
  // Sync cuaca ke semua player via Firebase (hanya jika owner)
  if(window.MP&&window.MP.isActive()&&localStorage.getItem("playerName")==="Varz444"){
    window.MP.syncWeather(w.name);
  }
  scene.fog.color=new THREE.Color(w.fogColor);
  document.getElementById("weatherUI").textContent=w.icon+" "+w.name;
  sun.intensity=w.name==="Storming"?0.4:w.name==="Foggy"?0.6:1.2;
  showEventNotification(w.icon+" "+w.name+" | Speed:"+w.speedMult+"x Luck:"+w.luckMult+"x");
}
function updateWeather(dt){
  weatherTimer+=dt;
  if(weatherTimer>=weatherChangeCooldown){
    weatherTimer=0;weatherChangeCooldown=200+Math.random()*200;
    const nx=weatherTypes[Math.floor(Math.random()*weatherTypes.length)];
    if(nx.name!==currentWeather.name){
      setWeather(nx);
      // Sync cuaca ke semua player via Firebase
      if(window.MP&&window.MP.isActive())window.MP.sendEvent("weather",{name:nx.name});
    }
  }
}

// ═══════ NPC INTERACTION ═══════
function updateNPCInteraction(){
  const fishPos=new THREE.Vector3(),rodPos=new THREE.Vector3(),baitPos=new THREE.Vector3(),jsPos=new THREE.Vector3();
  counter.getWorldPosition(fishPos);
  rodShopCounter.getWorldPosition(rodPos);
  baitShopCounter.getWorldPosition(baitPos);
  jetskiShopCounter.getWorldPosition(jsPos);

  // Hitung world position player (support saat parent ke jetski)
  const playerWorldPos = new THREE.Vector3();
  player.getWorldPosition(playerWorldPos);

  const distJs = playerWorldPos.distanceTo(jetskiSpawnPos);

  const sellBtn = document.getElementById("sellBtn");
  const rodBtn=document.getElementById("openRodShopBtn");
  const baitBtn=document.getElementById("openJetskiShopBtn"); // reusing this button for bait
  const mountBtn=document.getElementById("mountJetskiBtn");
  const harbBtn=document.getElementById("harbourBtn");
  
  // Sell fish
  if(playerWorldPos.distanceTo(fishPos)<8){
    nearSeller=true;sellBtn.style.display="block";
    const v=fishPos.clone().project(camera);
    sellBtn.style.left=((v.x+1)/2*window.innerWidth-sellBtn.offsetWidth/2)+"px";
    sellBtn.style.top=((-v.y+1)/2*window.innerHeight-55)+"px";
  } else{nearSeller=false;sellBtn.style.display="none";}

  // Rod shop
  if(playerWorldPos.distanceTo(rodPos)<8){
    rodBtn.style.display="block";
    const v=rodPos.clone().project(camera); rodPos.y+=1.5; rodPos.project(camera);
    rodBtn.style.left=((rodPos.x*.5+.5)*window.innerWidth)+"px";
    rodBtn.style.top=((-rodPos.y*.5+.5)*window.innerHeight)+"px";
  } else rodBtn.style.display="none";

  // Bait / jetski shop
  if(playerWorldPos.distanceTo(baitPos)<8||playerWorldPos.distanceTo(jsPos)<8){
    baitBtn.style.display="block";
  } else baitBtn.style.display="none";

  // Mount — hanya muncul saat dekat jetski yang sudah di-spawn
  const distToJetski=playerWorldPos.distanceTo(jetski.position);
  nearJetski=jetskiSpawned&&distToJetski<5;
  nearHarbour=playerWorldPos.distanceTo(HARBOUR_POS)<8;

  // Harbour spawn button
  if(harbBtn){
    // Sembunyikan tombol harbour SAAT naik jetski
    if(onJetski){
      harbBtn.style.display="none";
    } else if(nearHarbour&&jetskiOwned){
      harbBtn.style.display="block";
      harbBtn.textContent=jetskiSpawned?"🛥️ Despawn Jetski":"🛥️ Spawn Jetski";
      harbBtn.onclick=jetskiSpawned?despawnJetski:spawnJetski;
    } else {
      harbBtn.style.display="none";
    }
  }

  if(nearJetski&&!onJetski&&jetskiOwned){
    mountBtn.style.display="block";
    const p=jetski.position.clone();p.y+=2;p.project(camera);
    mountBtn.style.left=((p.x*.5+.5)*window.innerWidth-mountBtn.offsetWidth/2)+"px";
    mountBtn.style.top=((-p.y*.5+.5)*window.innerHeight)+"px";
    mountBtn.textContent="🛥️ Naik [E]";
  } else if(onJetski){
    mountBtn.textContent="🛥️ Turun [E]";mountBtn.style.display="block";
    mountBtn.style.left="50%"; mountBtn.style.top="auto"; mountBtn.style.bottom="180px";
    mountBtn.style.transform="translateX(-50%)";
  } else{mountBtn.style.display="none";}

  // Hint
  const hint=document.getElementById("interactHint");
  if(playerWorldPos.distanceTo(fishPos)<8)hint.textContent="🐟 Near Sell Shop — press Sell";
  else if(playerWorldPos.distanceTo(rodPos)<8)hint.textContent="🎣 Rod Shop nearby [E]";
  else if(playerWorldPos.distanceTo(baitPos)<8)hint.textContent="🪱 Bait Shop / Jetski Shop";
  else if(nearJetski&&!onJetski)hint.textContent="🛥️ Tekan [E] naik jetski";
  else if(nearHarbour&&jetskiOwned&&!onJetski)hint.textContent=jetskiSpawned?"🛥️ [E] Despawn Jetski":"🛥️ [E] Spawn Jetski di Pelabuhan";
  else{hint.textContent="";hint.style.display="none";return;}
  hint.style.display="block";
}

// ═══════ NPC ANIMATION ═══════
function animateNPCs(time){
  npcRoot.rotation.y=Math.sin(time*.002)*.1;
  rodNpcRoot.rotation.y=Math.sin(time*.0022+1)*.1;
  baitNpcRoot.rotation.y=Math.sin(time*.0018+2)*.1;
  jsNpcRoot.rotation.y=Math.sin(time*.002+3)*.1;
  npcGroup.lookAt(player.position.x,npcGroup.position.y,player.position.z);
  rodNpcGroup.lookAt(player.position.x,rodNpcGroup.position.y,player.position.z);
  baitNpcGroup.lookAt(player.position.x,baitNpcGroup.position.y,player.position.z);
  jsNpcGroup.lookAt(player.position.x,jsNpcGroup.position.y,player.position.z);
}

// ═══════ SAVE / LOAD ═══════
function saveProgress(){
  const d={coins,playerXP,playerLevel,fishLog:inventory.fishLog,rods:inventory.rods,equipped:inventory.equipped,bait:inventory.bait,equippedBait:inventory.equippedBait,fish:inventory.fish,jetskiOwned,weather:currentWeather.name};
  try{localStorage.setItem("fishingSave_v4",JSON.stringify(d));showMessage("💾 Saved!");}catch(e){}
}
function loadGameProgress(){
  try{
    const d=JSON.parse(localStorage.getItem("fishingSave_v4"));if(!d)return;
    coins=d.coins||0;playerXP=d.playerXP||0;playerLevel=d.playerLevel||1;
    inventory.fishLog=d.fishLog||[];inventory.rods=d.rods||["FishingRod"];
    inventory.equipped=d.equipped||"FishingRod";
    inventory.bait=d.bait||{none:999,worm:0,shrimp:0,squid:0,gold:0,magic:0};
    inventory.equippedBait=d.equippedBait||"none";
    inventory.fish=d.fish||[];
    jetskiOwned=d.jetskiOwned||false;
    if(d.weather){const w=weatherTypes.find(x=>x.name===d.weather);if(w)setWeather(w);}
    document.getElementById("coinUI").textContent="💰 "+coins;
    updateLevelUI();
    if(inventory.equipped)equipRod(inventory.equipped);
    if(jetskiOwned){const btn=document.getElementById("buyJetskiBtn");if(btn){btn.textContent="✓ Owned";btn.disabled=true;}}
  }catch(e){}
}
function setShirt(c){torso.material.color.set(c);}

// ═══════ UI EVENTS ═══════
document.getElementById("shirtColor").addEventListener("input",e=>setShirt(e.target.value));
document.getElementById("saveCustom").addEventListener("click",()=>{localStorage.setItem("playerShirt",document.getElementById("shirtColor").value);saveProgress();document.getElementById("customUI").style.display="none";});
document.getElementById("closeCustomBtn").addEventListener("click",()=>document.getElementById("customUI").style.display="none");
document.getElementById("openMenuBtn").addEventListener("click",()=>{const m=document.getElementById("menuUI");m.style.display=m.style.display==="flex"?"none":"flex";gamePaused=m.style.display==="flex";});
document.getElementById("resumeBtn").addEventListener("click",()=>{document.getElementById("menuUI").style.display="none";gamePaused=false;});
document.getElementById("settingsBtn").addEventListener("click",()=>{document.getElementById("menuUI").style.display="none";document.getElementById("customUI").style.display="block";});
document.getElementById("saveBtn").addEventListener("click",saveProgress);
document.getElementById("quitBtn").addEventListener("click",()=>location.reload());
document.getElementById("sellBtn").addEventListener("click",()=>{if(nearSeller)sellFish();});
document.getElementById("mountJetskiBtn").addEventListener("click",()=>{if(onJetski)dismountJetski();else if(nearJetski)mountJetski();});
document.getElementById("openRodShopBtn").addEventListener("click",()=>{toggleInventory();if(inventoryOpen)switchTab("rods");});
document.getElementById("openJetskiShopBtn").addEventListener("click",()=>{
  const baitPos=new THREE.Vector3();baitShopCounter.getWorldPosition(baitPos);
  const _pwp=new THREE.Vector3();player.getWorldPosition(_pwp);
  if(_pwp.distanceTo(baitPos)<8){toggleInventory();if(inventoryOpen)switchTab("bait");}
  else{document.getElementById("jetskiShopUI").style.display="flex";freezeInput=true;}
});

// ═══════ INPUT ═══════
window.addEventListener("pointerdown",e=>{
  if(e.target.id==="reelBtn")return;
  pulling=true;
  if(tensionActive)return; // handled by reel btn
  if(fishBiting){return;} // wait for tension
  if(freezeInput||gamePaused)return;
  const openUIs=["menuUI","inventoryUI","jetskiShopUI"];
  if(openUIs.some(id=>{const el=document.getElementById(id);return el&&el.style.display!=="none"&&el.style.display==="flex";}))return;
  if(inventory.equipped)startCastAnimation();
});
window.addEventListener("pointerup",()=>pulling=false);

window.addEventListener("keydown",e=>{
  if(!gameStarted)return;
  const k=e.key.toLowerCase();
  if(k==="escape"){const m=document.getElementById("menuUI");m.style.display=m.style.display==="flex"?"none":"flex";gamePaused=m.style.display==="flex";}
  if(k===" "||k==="f"){
    if(tensionActive){tensionReeling=true;return;}
    if(inventory.equipped&&!onJetski)startCastAnimation();
  }
  if(k==="e"){if(onJetski){dismountJetski();return;}if(nearJetski&&jetskiSpawned){mountJetski();return;}if(nearHarbour&&jetskiOwned){jetskiSpawned?despawnJetski():spawnJetski();return;}}
  if(k==="i")toggleInventory();
  if(k==="1")equipRod("FishingRod");
  if(k==="2")equipRod("LuckRod");
  if(k==="3")equipRod("MediumRod");
  if(k==="4")equipRod("GoldenRod");
});
window.addEventListener("keyup",e=>{if(e.key===" ")tensionReeling=false;});

// Hotbar slot1 — pakai rod yang sedang di-equip di inventory
document.getElementById("slot1").addEventListener("click",()=>{
  const slot=document.getElementById("slot1");
  if(inventory.equipped){
    unequipRod();
    slot.classList.remove("active");
    slot.textContent="🎣";
  } else {
    const rodToEquip=inventory._lastSelected||"FishingRod";
    const validRod=inventory.rods.includes(rodToEquip)?rodToEquip:"FishingRod";
    equipRod(validRod);
    slot.classList.add("active");
  }
});

// Update icon hotbar sesuai rod yang di-equip
function updateHotbarSlot(){
  const slot=document.getElementById("slot1");
  if(!slot)return;
  const rd=rodDatabase[inventory.equipped];
  if(rd){
    slot.textContent=rd.icon;
    slot.title=rd.name;
    slot.classList.add("active");
  } else {
    slot.textContent="🎣";
    slot.title="Rod";
    slot.classList.remove("active");
  }
}
function unequipRod(){
  stopFishingAll();inventory.equipped=null;
  if(rod.parent)rod.parent.remove(rod);
  backHolder.add(rod);rod.position.set(0,0,0);rod.rotation.set(0,Math.PI,0.5);
  rod.material.color.setHex(0x8b5a2b);
  armR.rotation.set(0,0,0);armL.rotation.set(0,0,0);
}

// ═══════ LOADING ═══════
let loadProgress=0;
function simulateLoading(){
  if(loadProgress>=100){document.getElementById("loadingScreen").style.display="none";return;}
  loadProgress+=Math.random()*5;if(loadProgress>100)loadProgress=100;
  document.getElementById("loadingBar").style.width=loadProgress+"%";
  document.getElementById("loadingText").textContent="Loading... "+Math.floor(loadProgress)+"%";
  setTimeout(simulateLoading,80);
}
simulateLoading();
// Dengan ini (tidak error kalau tidak support):
function forceLandscape(){
  if(screen.orientation && typeof screen.orientation.lock === "function"){
    screen.orientation.lock("landscape").catch(()=>{});
  }
}

function toggleFullscreen(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{});
    document.getElementById("fullscreenBtn").textContent="⛷";
  } else {
    document.exitFullscreen();
    document.getElementById("fullscreenBtn").textContent="⛶";
  }
}
// Update icon saat fullscreen berubah (misal tekan Escape)
document.addEventListener("fullscreenchange",()=>{
  const btn=document.getElementById("fullscreenBtn");
  if(btn)btn.textContent=document.fullscreenElement?"⛷":"⛶";
});
  
// ═══════ MAIN LOOP ═══════
let lastTime=0;
function animate(time){
  requestAnimationFrame(animate);
  if(gamePaused)return;
  const dt=Math.min((time-lastTime)/1000,.1);lastTime=time;
  if(onJetski)updateJetski();else movePlayer(dt);
  updateCastAnimation();
  updateCamera();
  animateWater(time);
  updateFishingWait();
  updateFishingLine();
  updateTensionSystem(dt);
  animateNPCs(time);
  updateNPCInteraction();
  updateWeather(dt);
  updateWake(dt);
  updateBubbles(dt);
  updateMultiplayerFrame(dt);
  volcanoLava.material.emissiveIntensity=0.7+Math.sin(time*.003)*.5;
  renderer.render(scene,camera);
}

// ═══════ INIT ═══════
window.addEventListener("load",()=>{
  loadGameProgress();
  const ss=localStorage.getItem("playerShirt");if(ss)setShirt(ss);
  updateLevelUI();
  preloadAllFishTextures();
  if(!inventory.equipped){
    backHolder.add(rod);rod.position.set(0,0,0);rod.rotation.set(0,Math.PI,0.5);
  }
});
setTimeout(()=>{gameStarted=true;},1500);
animate(0);
forceLandscape();
window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
document.addEventListener("gesturestart",e=>e.preventDefault());
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});


// ═══════ MULTIPLAYER HOOK INTO MAIN LOOP ═══════
function updateMultiplayerFrame(dt) {
  if (window.MP && typeof window.MP.update === "function") {
    window.MP.update(dt);
  }
}

// ── Expose game state to window (for multiplayer.js) ──
window.scene       = scene;
window.camera      = camera;
window.player      = player;
window.hook        = hook;
window.rodDatabase = rodDatabase;
window.inventory   = inventory;
Object.defineProperty(window,'isFishing', {get:()=>isFishing, set:v=>{isFishing=v;}});
Object.defineProperty(window,'isSwimming',{get:()=>isSwimming,set:v=>{isSwimming=v;}});
Object.defineProperty(window,'onJetski',  {get:()=>onJetski,  set:v=>{onJetski=v;}});
Object.defineProperty(window,'freezeInput',{get:()=>freezeInput,set:v=>{freezeInput=v;}});

// Expose weather sync to MP
window.OWNER_NAME_FOR_SYNC = "Varz444"; // harus sama dengan OWNER_NAME di multiplayer.js

// Expose extra globals for owner panel & multiplayer
window.weatherTypes = weatherTypes;
window.fishTypes = fishTypes;
window.setWeather   = setWeather;
window.gainXP       = gainXP;
window.fishTypes    = fishTypes;
window.checkLevelUp = checkLevelUp;
window.updateLevelUI= updateLevelUI;
window.xpThresholds = xpThresholds;
Object.defineProperty(window,'coins',      {get:()=>coins,       set:v=>{coins=v;}});
Object.defineProperty(window,'playerXP',   {get:()=>playerXP,    set:v=>{playerXP=v;}});
Object.defineProperty(window,'playerLevel',{get:()=>playerLevel,  set:v=>{playerLevel=v;}});
