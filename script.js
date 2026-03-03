// LET'S FISHING v5.0 — Big Islands, Island Fish, Minimap
// ============================================================

// ═══ CORE STATE ═══
let isFishing=false,hookInWater=false,fishBiting=false;
let castAnimation=0,castingNow=false,castReleased=false,castingPose=false;
let gameStarted=false,fishingTimer=0,biteTime=0;
let freezePlayer=false,freezeInput=false,pulling=false;
let nearSeller=false,gamePaused=false;

// ═══ SWIM ═══
let isSwimming=false,swimAnim=0,swimCycle=0;

// ═══ JETSKI ═══
let onJetski=false,jetskiSpeed=0,nearJetski=false,jetskiOwned=false;
let jetskiSpawned=false,nearHarbour=false;
const jetskiMaxSpeed=0.45;
const HARBOUR_POS=new THREE.Vector3(70,0,20);
const jetskiSpawnPos=new THREE.Vector3(70,0.1,28);

// ═══ TENSION ═══
let tensionActive=false,tensionVal=50,zoneMin=42,zoneMax=58;
let tensionFishSpeed=0,tensionDir=1,tensionReeling=false;
let tensionProgress=0,tensionDifficulty=1,tensionTimeout=0,pendingFish=null;

// ═══ INVENTORY ═══
const activeTab={current:'rods'};
let heldFishIndex=-1;

// ═══ LEVEL/XP ═══
let playerLevel=1,playerXP=0;
const xpThresholds=[0,100,250,450,700,1000,1400,1900,2500,3200,4000];
const levelTitles=["Beginner","Novice","Apprentice","Fisher","Expert","Master","Grand Master","Legend","Mythic","Champion","GOAT"];

// ═══ WEATHER ═══
const weatherTypes=[
  {name:"Sunny",   icon:"☀️", speedMult:1,   luckMult:1,   skyColor:0x87ceeb,fogColor:0x87ceeb},
  {name:"Windy",   icon:"🌬️",speedMult:1.8, luckMult:1,   skyColor:0x9db8cc,fogColor:0xaac0cc},
  {name:"Cloudy",  icon:"☁️", speedMult:1,   luckMult:1.4, skyColor:0x7a8a96,fogColor:0x8a9aa6},
  {name:"Storming",icon:"⛈️",speedMult:1.5, luckMult:1.6, skyColor:0x3a4a56,fogColor:0x4a5a66},
  {name:"Foggy",   icon:"🌫️",speedMult:0.9, luckMult:1.2, skyColor:0xcccccc,fogColor:0xbbbbbb},
];
let currentWeather=weatherTypes[0];
let weatherTimer=0,weatherChangeCooldown=300;

// ═══ ISLAND TRACKING ═══
let currentIsland="main";

// ═══ FISH DATABASE PER ISLAND ═══
const fishDB={
  main:[
    {name:"Ikan Kecil",    rarity:"Common",   price:10,  xp:5,   color:"#b0c4de",emoji:"🐟",diff:0.5,island:"Main Island"},
    {name:"Ikan Bandeng",  rarity:"Common",   price:12,  xp:6,   color:"#c8d8e8",emoji:"🐡",diff:0.5,island:"Main Island"},
    {name:"Ikan Tuna",     rarity:"Uncommon", price:25,  xp:12,  color:"#5dade2",emoji:"🐠",diff:0.8,island:"Main Island"},
    {name:"Ikan Lele",     rarity:"Uncommon", price:20,  xp:10,  color:"#8B7355",emoji:"🐟",diff:0.7,island:"Main Island"},
    {name:"Ikan Gurame",   rarity:"Uncommon", price:30,  xp:14,  color:"#ffd700",emoji:"🐠",diff:0.9,island:"Main Island"},
    {name:"Ikan Salmon",   rarity:"Rare",     price:60,  xp:25,  color:"#ff7f50",emoji:"🐡",diff:1.2,island:"Main Island"},
    {name:"Ikan Koi",      rarity:"Rare",     price:75,  xp:30,  color:"#FF6B35",emoji:"🐠",diff:1.3,island:"Main Island"},
    {name:"Ikan Mas",      rarity:"Rare",     price:80,  xp:32,  color:"#FFD700",emoji:"🐡",diff:1.1,island:"Main Island"},
    {name:"Kerang Mutiara",rarity:"Epic",     price:180, xp:70,  color:"#f0e6ff",emoji:"🦪",diff:1.7,island:"Main Island"},
    {name:"Old Boot",      rarity:"Junk",     price:1,   xp:1,   color:"#888888",emoji:"👟",diff:0.2,island:"Main Island"},
  ],
  mystic:[
    {name:"Ikan Cahaya",   rarity:"Common",   price:18,  xp:8,   color:"#aaffee",emoji:"✨",diff:0.6,island:"Mystic Isle"},
    {name:"Ikan Hantu",    rarity:"Common",   price:15,  xp:7,   color:"#dddddd",emoji:"👻",diff:0.5,island:"Mystic Isle"},
    {name:"Moonfish",      rarity:"Uncommon", price:45,  xp:18,  color:"#c8aaff",emoji:"🌙",diff:0.9,island:"Mystic Isle"},
    {name:"Starfish",      rarity:"Uncommon", price:40,  xp:16,  color:"#ffaaff",emoji:"⭐",diff:0.9,island:"Mystic Isle"},
    {name:"Ikan Peri",     rarity:"Rare",     price:100, xp:40,  color:"#ff88cc",emoji:"🧚",diff:1.4,island:"Mystic Isle"},
    {name:"Rainbow Fish",  rarity:"Rare",     price:95,  xp:38,  color:"#ff69b4",emoji:"🌸",diff:1.3,island:"Mystic Isle"},
    {name:"Aurora Fish",   rarity:"Epic",     price:220, xp:85,  color:"#00ffcc",emoji:"🌈",diff:1.9,island:"Mystic Isle"},
    {name:"Mystic Koi",    rarity:"Epic",     price:280, xp:100, color:"#8800ff",emoji:"🔮",diff:2.0,island:"Mystic Isle"},
    {name:"Crystal Eel",   rarity:"Legendary",price:600, xp:220, color:"#00ffff",emoji:"💎",diff:2.6,island:"Mystic Isle"},
    {name:"Spirit Fish",   rarity:"Legendary",price:900, xp:350, color:"#ffffff",emoji:"🌟",diff:3.0,island:"Mystic Isle"},
  ],
  volcano:[
    {name:"Ikan Bara",     rarity:"Common",   price:20,  xp:9,   color:"#ff6600",emoji:"🔥",diff:0.7,island:"Volcano Isle"},
    {name:"Ikan Abu",      rarity:"Common",   price:15,  xp:7,   color:"#999999",emoji:"💨",diff:0.6,island:"Volcano Isle"},
    {name:"Lavafish",      rarity:"Uncommon", price:50,  xp:20,  color:"#ff4400",emoji:"🌋",diff:1.0,island:"Volcano Isle"},
    {name:"Ikan Besi",     rarity:"Uncommon", price:35,  xp:15,  color:"#888888",emoji:"⚙️",diff:0.9,island:"Volcano Isle"},
    {name:"Ikan Magma",    rarity:"Rare",     price:95,  xp:38,  color:"#ff2200",emoji:"💥",diff:1.5,island:"Volcano Isle"},
    {name:"Ikan Obsidian", rarity:"Rare",     price:110, xp:42,  color:"#333333",emoji:"🖤",diff:1.6,island:"Volcano Isle"},
    {name:"Ikan Hiu",      rarity:"Epic",     price:150, xp:60,  color:"#708090",emoji:"🦈",diff:2.0,island:"Volcano Isle"},
    {name:"Golden Fish",   rarity:"Epic",     price:200, xp:80,  color:"#f1c40f",emoji:"✨",diff:1.8,island:"Volcano Isle"},
    {name:"Dragon Fish",   rarity:"Legendary",price:800, xp:300, color:"#ff4444",emoji:"🐉",diff:3.0,island:"Volcano Isle"},
    {name:"Inferno King",  rarity:"Legendary",price:1200,xp:450, color:"#ff0000",emoji:"👑",diff:3.5,island:"Volcano Isle"},
  ],
  crystal:[
    {name:"Ikan Salju",    rarity:"Common",   price:22,  xp:10,  color:"#e8f8ff",emoji:"❄️",diff:0.6,island:"Crystal Isle"},
    {name:"Ikan Putih",    rarity:"Common",   price:18,  xp:8,   color:"#ffffff",emoji:"🤍",diff:0.5,island:"Crystal Isle"},
    {name:"Ikan Es",       rarity:"Uncommon", price:55,  xp:22,  color:"#aaddff",emoji:"🧊",diff:0.9,island:"Crystal Isle"},
    {name:"Ikan Pari",     rarity:"Uncommon", price:50,  xp:20,  color:"#9b59b6",emoji:"🦑",diff:0.9,island:"Crystal Isle"},
    {name:"Ikan Kristal",  rarity:"Rare",     price:120, xp:45,  color:"#88ffff",emoji:"💠",diff:1.4,island:"Crystal Isle"},
    {name:"Ikan Berlian",  rarity:"Rare",     price:130, xp:50,  color:"#ccffff",emoji:"💎",diff:1.5,island:"Crystal Isle"},
    {name:"Ikan Safir",    rarity:"Epic",     price:260, xp:95,  color:"#0066ff",emoji:"🔷",diff:1.9,island:"Crystal Isle"},
    {name:"Ikan Zamrud",   rarity:"Epic",     price:300, xp:110, color:"#00ff88",emoji:"🟢",diff:2.1,island:"Crystal Isle"},
    {name:"Crystal Fish",  rarity:"Legendary",price:1000,xp:400, color:"#00ffff",emoji:"🌊",diff:3.5,island:"Crystal Isle"},
    {name:"Frost Dragon",  rarity:"Legendary",price:1500,xp:500, color:"#eeffff",emoji:"🐲",diff:4.0,island:"Crystal Isle"},
  ],
  aurora:[
    {name:"Ikan Fajar",    rarity:"Common",   price:25,  xp:11,  color:"#ffcc88",emoji:"🌅",diff:0.7,island:"Aurora Isle"},
    {name:"Ikan Senja",    rarity:"Common",   price:28,  xp:12,  color:"#ff88aa",emoji:"🌇",diff:0.7,island:"Aurora Isle"},
    {name:"Aurora Eel",    rarity:"Uncommon", price:70,  xp:28,  color:"#88ffaa",emoji:"🌌",diff:1.1,island:"Aurora Isle"},
    {name:"Ikan Nebula",   rarity:"Uncommon", price:65,  xp:26,  color:"#aa44ff",emoji:"🌠",diff:1.0,island:"Aurora Isle"},
    {name:"Ikan Galaksi",  rarity:"Rare",     price:150, xp:58,  color:"#4400ff",emoji:"🔵",diff:1.7,island:"Aurora Isle"},
    {name:"Treasure Chest",rarity:"Rare",     price:140, xp:55,  color:"#DAA520",emoji:"📦",diff:1.6,island:"Aurora Isle"},
    {name:"Ikan Komet",    rarity:"Epic",     price:380, xp:140, color:"#ffff00",emoji:"☄️",diff:2.2,island:"Aurora Isle"},
    {name:"Mythic Koi",    rarity:"Epic",     price:420, xp:155, color:"#ff00ff",emoji:"🌟",diff:2.3,island:"Aurora Isle"},
    {name:"God Fish",      rarity:"Legendary",price:2000,xp:800, color:"#ffffaa",emoji:"⚡",diff:4.5,island:"Aurora Isle"},
    {name:"Cosmic Whale",  rarity:"Legendary",price:3000,xp:1000,color:"#0044ff",emoji:"🐋",diff:5.0,island:"Aurora Isle"},
  ],
};
const fishTypes=Object.values(fishDB).flat();

// ═══ BAIT ═══
const baitTypes=[
  {id:"none",  name:"No Bait",   icon:"❌",desc:"Default, no bonus.",     luckBonus:0,  speedBonus:0,  rareBonus:0,  price:0,   infinite:true},
  {id:"worm",  name:"Earthworm", icon:"🪱",desc:"+15% bite speed.",       luckBonus:0,  speedBonus:0.3,rareBonus:0,  price:5,   infinite:false},
  {id:"shrimp",name:"Shrimp",    icon:"🦐",desc:"+20% luck.",             luckBonus:0.3,speedBonus:0.2,rareBonus:0,  price:12,  infinite:false},
  {id:"squid", name:"Squid",     icon:"🦑",desc:"+Epic chance.",          luckBonus:0.5,speedBonus:0,  rareBonus:0.1,price:25,  infinite:false},
  {id:"gold",  name:"Gold Lure", icon:"✨",desc:"+Legendary!",            luckBonus:1,  speedBonus:0.3,rareBonus:0.3,price:80,  infinite:false},
  {id:"magic", name:"Magic Bait",icon:"🔮",desc:"MAX luck+speed.",        luckBonus:2,  speedBonus:0.5,rareBonus:0.5,price:200, infinite:false},
];

// ═══ RODS ═══
const rodDatabase={
  FishingRod:{name:"Wood Rod",  icon:"🪵",price:0,    luckMult:1,  speedMult:1,  color:0x8b5a2b,desc:"Starter rod."},
  LuckRod:   {name:"Luck Rod",  icon:"🍀",price:150,  luckMult:2.5,speedMult:1,  color:0xaaaaaa,desc:"More rare fish."},
  MediumRod: {name:"Medium Rod",icon:"⚡",price:500,  luckMult:3,  speedMult:2,  color:0xffd700,desc:"Faster & luckier."},
  GoldenRod: {name:"Golden Rod",icon:"✨",price:2000, luckMult:5,  speedMult:2,  color:0xFFD700,desc:"Max luck rod."},
};

// ═══ INVENTORY DATA ═══
const inventory={
  equipped:"FishingRod",rods:["FishingRod"],
  bait:{none:999,worm:0,shrimp:0,squid:0,gold:0,magic:0},
  equippedBait:"none",fish:[],fishLog:[],
};
let coins=0;

// ═══ AUDIO ═══
function safeAudio(src){
  try{const a=new Audio(src);a.volume=0.7;return a;}
  catch(e){return{play:()=>Promise.resolve(),pause:()=>{},loop:false,volume:1,currentTime:0};}
}
const castSound=safeAudio("sounds/cast.mp3");
const biteSound=safeAudio("sounds/bite.mp3");
const catchSound=safeAudio("sounds/catch.mp3");
const bgMusic=safeAudio("sounds/background_music.mp3");
bgMusic.loop=true;bgMusic.volume=0.35;bgMusic.play().catch(()=>{});

// ═══ SCENE ═══
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87ceeb);
scene.fog=new THREE.FogExp2(0x87ceeb,0.0025);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,3000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
document.body.appendChild(renderer.domElement);
const sun=new THREE.DirectionalLight(0xffffff,1.2);
sun.position.set(10,20,10);sun.castShadow=true;scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff,0.5));

const loader=new THREE.TextureLoader();
const sandTex=loader.load("images/sand.jpg");
const grassTex=loader.load("images/grass.jpg");
const waterTex=loader.load("images/water.jpg");
const floorTex=loader.load("images/floor.jpg");
const wallTex=loader.load("images/wall.jpg");
const roofTex=loader.load("images/roof.jpg");
const tableTex=loader.load("images/table.jpg");
waterTex.wrapS=waterTex.wrapT=THREE.RepeatWrapping;waterTex.repeat.set(30,30);

// ═══ WATER ═══
const water=new THREE.Mesh(
  new THREE.PlaneGeometry(4000,4000,100,100),
  new THREE.MeshStandardMaterial({map:waterTex,transparent:true,opacity:0.88,roughness:0.15,metalness:0.3})
);
water.rotation.x=-Math.PI/2;water.position.y=-1;scene.add(water);

// ═══ ISLAND DEFS ═══
const islandDefs=[
  {id:"main",   x:0,    z:0,    sandR:90, grassR:78, label:"🏝️ Main Island",  fishKey:"main"},
  {id:"mystic", x:700,  z:0,    sandR:65, grassR:55, label:"🔮 Mystic Isle",   fishKey:"mystic"},
  {id:"volcano",x:-800, z:-600, sandR:70, grassR:60, label:"🌋 Volcano Isle",  fishKey:"volcano"},
  {id:"crystal",x:300,  z:1000, sandR:62, grassR:52, label:"💎 Crystal Isle",  fishKey:"crystal"},
  {id:"aurora", x:-400, z:1200, sandR:58, grassR:48, label:"🌌 Aurora Isle",   fishKey:"aurora"},
];

// ═══ FLOATING ORBS ═══
const floatingOrbs=[];

// ═══ ISLAND BUILDER ═══
function addTree(g,tx,tz,h,trunkColor,leafColor){
  const trunk=new THREE.Mesh(
    new THREE.CylinderGeometry(0.28,0.52,h,8),
    new THREE.MeshStandardMaterial({color:trunkColor||0x8B6914})
  );
  trunk.position.set(tx,3+h/2,tz);
  g.add(trunk);
  const l1=new THREE.Mesh(
    new THREE.ConeGeometry(3.2+Math.random()*1.8,3.2,8),
    new THREE.MeshStandardMaterial({color:leafColor||0x1a7a1a})
  );
  l1.position.set(tx,3+h+1.8,tz);
  g.add(l1);
  const l2=new THREE.Mesh(
    new THREE.ConeGeometry(2+Math.random()*0.8,2.2,8),
    new THREE.MeshStandardMaterial({color:leafColor||0x1a7a1a})
  );
  l2.position.set(tx,3+h+4,tz);
  g.add(l2);
}

function buildIsland(def,options){
  const {x,z,sandR,grassR,label}=def;
  const opt=options||{};
  const g=new THREE.Group();
  g.position.set(x,-2.5,z);
  scene.add(g);

  // Sand base
  g.add(new THREE.Mesh(
    new THREE.CylinderGeometry(sandR,sandR+7,5,64),
    new THREE.MeshStandardMaterial({map:sandTex})
  ));
  // Grass layer
  g.add(Object.assign(new THREE.Mesh(
    new THREE.CylinderGeometry(grassR,grassR+4,0.7,32),
    new THREE.MeshStandardMaterial({color:opt.grassColor||0x27ae60})
  ),{position:{set:function(){}}}));
  const gr=new THREE.Mesh(
    new THREE.CylinderGeometry(grassR,grassR+4,0.7,32),
    new THREE.MeshStandardMaterial({color:opt.grassColor||0x27ae60})
  );
  gr.position.y=2.5;
  g.add(gr);
  // Inner hill
  const hill=new THREE.Mesh(
    new THREE.CylinderGeometry(grassR*0.5,grassR*0.65,2,32),
    new THREE.MeshStandardMaterial({color:opt.grassColor||0x27ae60})
  );
  hill.position.y=3.5;
  g.add(hill);

  // Trees
  const treeCount=opt.trees||8;
  for(let i=0;i<treeCount;i++){
    const angle=(i/treeCount)*Math.PI*2+Math.random()*0.6;
    const dist=grassR*0.28+Math.random()*grassR*0.48;
    const h=5.5+Math.random()*4;
    addTree(g,Math.cos(angle)*dist,Math.sin(angle)*dist,h,opt.trunkColor,opt.leafColor);
  }
  // Rocks
  const rockCount=opt.rocks||6;
  for(let i=0;i<rockCount;i++){
    const a=Math.random()*Math.PI*2;
    const d=grassR*0.18+Math.random()*grassR*0.55;
    const rock=new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.6+Math.random()*1.6,0),
      new THREE.MeshStandardMaterial({color:opt.rockColor||0x777777})
    );
    rock.position.set(Math.cos(a)*d,3.2,Math.sin(a)*d);
    rock.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
    g.add(rock);
  }
  // Sign
  const sc=document.createElement("canvas");sc.width=512;sc.height=128;
  const sx=sc.getContext("2d");
  sx.fillStyle="rgba(0,0,0,.85)";sx.fillRect(0,0,512,128);
  sx.fillStyle=opt.labelColor||"#ffffff";
  sx.font="bold 46px Arial";sx.textAlign="center";sx.textBaseline="middle";
  sx.fillText(label,256,64);
  const sign=new THREE.Mesh(
    new THREE.BoxGeometry(6.5,1.6,0.2),
    new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)})
  );
  sign.position.set(0,7.5,sandR*0.62);
  g.add(sign);

  // Special: Lava (volcano)
  if(opt.lava){
    for(let i=0;i<4;i++){
      const lp=new THREE.Mesh(
        new THREE.CylinderGeometry(1+Math.random()*2,1.2,0.6,16),
        new THREE.MeshStandardMaterial({color:0xff4500,emissive:0xff2200,emissiveIntensity:0.9})
      );
      const a=Math.random()*Math.PI*2;
      const d=Math.random()*grassR*0.38;
      lp.position.set(Math.cos(a)*d,3.5,Math.sin(a)*d);
      g.add(lp);
    }
    const volcone=new THREE.Mesh(
      new THREE.ConeGeometry(grassR*0.48,grassR*0.78,16),
      new THREE.MeshStandardMaterial({color:0x444444})
    );
    volcone.position.y=3+grassR*0.39;
    g.add(volcone);
    const lavaTop=new THREE.Mesh(
      new THREE.CylinderGeometry(3.5,5.5,2.2,16),
      new THREE.MeshStandardMaterial({color:0xff4500,emissive:0xff2200,emissiveIntensity:1})
    );
    lavaTop.position.y=3+grassR*0.78+1;
    g.add(lavaTop);
  }

  // Special: Crystals
  if(opt.crystals){
    const cc=opt.crystalColor||0x00ffff;
    for(let i=0;i<10;i++){
      const cry=new THREE.Mesh(
        new THREE.ConeGeometry(0.28+Math.random()*0.42,2.2+Math.random()*3.2,6),
        new THREE.MeshStandardMaterial({color:cc,transparent:true,opacity:0.82,emissive:cc,emissiveIntensity:0.22})
      );
      const a=Math.random()*Math.PI*2;
      const d=Math.random()*grassR*0.52;
      cry.position.set(Math.cos(a)*d,3.4+Math.random()*2.2,Math.sin(a)*d);
      g.add(cry);
    }
  }

  // Special: Aurora orbs
  if(opt.aurora){
    for(let i=0;i<6;i++){
      const orb=new THREE.Mesh(
        new THREE.SphereGeometry(0.38+Math.random()*0.32,8,8),
        new THREE.MeshStandardMaterial({color:0xaaffff,emissive:0x44ffaa,emissiveIntensity:1,transparent:true,opacity:0.72})
      );
      const a=Math.random()*Math.PI*2;
      const d=Math.random()*grassR*0.42;
      orb.position.set(x+Math.cos(a)*d,5.5+Math.random()*5,z+Math.sin(a)*d);
      orb.userData.floatOffset=Math.random()*Math.PI*2;
      scene.add(orb);
      floatingOrbs.push({mesh:orb,baseY:orb.position.y});
    }
  }
  return g;
}

// Build all islands
buildIsland(islandDefs[0],{trees:14,rocks:10,grassColor:0x27ae60,trunkColor:0x8B6914,leafColor:0x1a8a1a});
buildIsland(islandDefs[1],{trees:9,rocks:6,grassColor:0x2d1b69,trunkColor:0x9b59b6,leafColor:0x6600cc,crystals:true,crystalColor:0xcc88ff,labelColor:"#cc88ff"});
buildIsland(islandDefs[2],{trees:7,rocks:14,grassColor:0x8B0000,trunkColor:0x444444,leafColor:0x556b2f,lava:true,rockColor:0x555555,labelColor:"#ff4444"});
buildIsland(islandDefs[3],{trees:8,rocks:7,grassColor:0x006080,trunkColor:0x5599aa,leafColor:0x00aacc,crystals:true,crystalColor:0x00ffff,labelColor:"#00ffff"});
buildIsland(islandDefs[4],{trees:9,rocks:5,grassColor:0x1a1a4a,trunkColor:0x334466,leafColor:0x003366,aurora:true,labelColor:"#aaffee"});

// ═══ SHOP BUILDER ═══
function makeShop(px,pz,label){
  const g=new THREE.Group();g.position.set(px,0,pz);g.scale.set(1.6,1.6,1.6);scene.add(g);
  const fl=new THREE.Mesh(new THREE.BoxGeometry(10,0.6,6),new THREE.MeshStandardMaterial({map:floorTex}));
  fl.position.y=0.3;g.add(fl);
  const wm=new THREE.MeshStandardMaterial({map:wallTex});
  const bw=new THREE.Mesh(new THREE.BoxGeometry(10,7,0.4),wm);bw.position.set(0,1.5,-3);g.add(bw);
  const sL=new THREE.Mesh(new THREE.BoxGeometry(0.4,7,6),wm);sL.position.set(-4.8,1.5,0);g.add(sL);
  const sR=sL.clone();sR.position.x=4.8;g.add(sR);
  const rm=new THREE.MeshStandardMaterial({map:roofTex});
  const rf=new THREE.Mesh(new THREE.BoxGeometry(12,0.2,8),rm);rf.position.y=5;g.add(rf);
  const rt=new THREE.Mesh(new THREE.ConeGeometry(5.5,2,4),rm);rt.rotation.y=Math.PI/4;rt.position.y=6;g.add(rt);
  const ctr=new THREE.Mesh(new THREE.BoxGeometry(9.2,1.5,1),new THREE.MeshStandardMaterial({map:tableTex}));
  ctr.position.set(0,0.75,2.5);g.add(ctr);
  const sc=document.createElement("canvas");sc.width=512;sc.height=256;
  const sx=sc.getContext("2d");
  sx.fillStyle="#5d4037";sx.fillRect(0,0,512,256);
  sx.strokeStyle="#3e2723";sx.lineWidth=10;sx.strokeRect(0,0,512,256);
  sx.fillStyle="#fff";sx.font="bold 52px Arial";sx.textAlign="center";sx.textBaseline="middle";
  sx.fillText(label,256,128);
  const sg=new THREE.Mesh(new THREE.BoxGeometry(4,1,0.3),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)}));
  sg.position.set(0,8.2,2.9);g.add(sg);
  return{counter:ctr};
}
const {counter}=makeShop(0,-25,"🐟 SELL FISH");
const {counter:rodShopCounter}=makeShop(30,-25,"🎣 ROD SHOP");
const {counter:baitShopCounter}=makeShop(-30,-25,"🪱 BAIT SHOP");
const {counter:jetskiShopCounter}=makeShop(60,-25,"🛥️ JETSKI");

// ═══ HARBOUR ═══
function buildHarbour(){
  const g=new THREE.Group();g.position.set(70,0,20);scene.add(g);
  const dock=new THREE.Mesh(new THREE.BoxGeometry(18,0.4,9),new THREE.MeshStandardMaterial({color:0x8B6914,roughness:0.9}));
  dock.position.y=0.2;g.add(dock);
  const col=new THREE.Mesh(new THREE.BoxGeometry(18,0.6,9),new THREE.MeshStandardMaterial({visible:false}));
  col.position.set(0,0.1,0);g.add(col);
  for(let i=-1;i<=1;i++){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,3.5,8),new THREE.MeshStandardMaterial({color:0x5C4A1E}));
    pole.position.set(i*5,-1.5,4);g.add(pole);
    const p2=pole.clone();p2.position.z=-4;g.add(p2);
  }
  const rail=new THREE.Mesh(new THREE.BoxGeometry(14,0.1,0.1),new THREE.MeshStandardMaterial({color:0x5C4A1E}));
  rail.position.set(0,1,4.5);g.add(rail);
  const r2=rail.clone();r2.position.z=-4.5;g.add(r2);
  for(let i=-1;i<=1;i+=2){
    const lp=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,2.5,8),new THREE.MeshStandardMaterial({color:0x666666}));
    lp.position.set(i*6,1.5,4);g.add(lp);
    const lb=new THREE.Mesh(new THREE.SphereGeometry(0.25,8,8),new THREE.MeshStandardMaterial({color:0xffff88,emissive:0xffff44,emissiveIntensity:1}));
    lb.position.set(i*6,2.8,4);g.add(lb);
  }
  const sc=document.createElement("canvas");sc.width=256;sc.height=64;
  const sx=sc.getContext("2d");
  sx.fillStyle="rgba(0,0,0,0.8)";sx.fillRect(0,0,256,64);
  sx.fillStyle="#fff";sx.font="bold 28px Arial";sx.textAlign="center";sx.textBaseline="middle";
  sx.fillText("🚢 PELABUHAN",128,32);
  const sm=new THREE.Mesh(new THREE.BoxGeometry(6,1.4,0.1),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)}));
  sm.position.set(0,3,0);g.add(sm);
  const ind=new THREE.Mesh(new THREE.CircleGeometry(3,16),new THREE.MeshStandardMaterial({color:0x00ff88,transparent:true,opacity:0.18}));
  ind.rotation.x=-Math.PI/2;ind.position.set(0,0.5,0);g.add(ind);
}
buildHarbour();

// ═══ NPC ═══
function makeNPC(color,px,pz){
  const g=new THREE.Group();const root=new THREE.Object3D();g.add(root);
  const t=new THREE.Mesh(new THREE.BoxGeometry(2,2,1),new THREE.MeshStandardMaterial({color}));
  t.position.y=3;root.add(t);
  const h=new THREE.Mesh(new THREE.SphereGeometry(0.75,16,16),new THREE.MeshStandardMaterial({color:0xffd6b3}));
  h.position.y=1.9;t.add(h);
  const fc=document.createElement("canvas");fc.width=128;fc.height=128;
  const fx=fc.getContext("2d");
  fx.fillStyle="#000";fx.beginPath();fx.arc(38,55,8,0,Math.PI*2);fx.arc(90,55,8,0,Math.PI*2);fx.fill();
  fx.beginPath();fx.arc(64,80,22,0,Math.PI);fx.lineWidth=5;fx.stroke();
  const fm=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(fc),transparent:true}));
  fm.position.z=0.73;h.add(fm);
  const aL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xffd6b3}));
  aL.position.set(-1.5,0,0);t.add(aL);
  const aR=aL.clone();aR.position.x=1.5;t.add(aR);
  const lL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0x2c3e50}));
  lL.position.set(-0.5,-2,0);t.add(lL);
  const lR=lL.clone();lR.position.x=0.5;t.add(lR);
  g.scale.set(0.6,0.6,0.6);g.position.set(px,0,pz);scene.add(g);
  return{group:g,root};
}
const {group:npcGroup,root:npcRoot}=makeNPC(0x3498db,0,-22);
const {group:rodNpcGroup,root:rodNpcRoot}=makeNPC(0xe74c3c,30,-22);
const {group:baitNpcGroup,root:baitNpcRoot}=makeNPC(0x27ae60,-30,-22);
const {group:jsNpcGroup,root:jsNpcRoot}=makeNPC(0xf39c12,60,-22);

// ═══ PLAYER ═══
const player=new THREE.Group();scene.add(player);
const playerRoot=new THREE.Object3D();player.add(playerRoot);
const torso=new THREE.Mesh(new THREE.BoxGeometry(2,2,1),new THREE.MeshStandardMaterial({color:0x2ecc71}));
torso.position.y=3;torso.castShadow=true;playerRoot.add(torso);
const backHolder=new THREE.Object3D();backHolder.position.set(0,0.5,-0.7);torso.add(backHolder);
const head=new THREE.Mesh(new THREE.SphereGeometry(0.75,32,32),new THREE.MeshStandardMaterial({color:0xffd6b3,roughness:0.6}));
head.scale.y=1.05;head.position.y=1.9;head.castShadow=true;torso.add(head);
const faceC=document.createElement("canvas");faceC.width=256;faceC.height=256;
const fctx=faceC.getContext("2d");
fctx.fillStyle="#000";fctx.beginPath();fctx.arc(80,110,12,0,Math.PI*2);fctx.arc(176,110,12,0,Math.PI*2);fctx.fill();
fctx.beginPath();fctx.arc(128,160,40,0,Math.PI);fctx.lineWidth=6;fctx.stroke();
const face=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(faceC),transparent:true}));
face.position.z=0.73;head.add(face);
const armL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xffd6b3}));
armL.position.set(-1.5,0,0);torso.add(armL);
const armR=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xffd6b3}));
armR.position.set(1.5,0,0);torso.add(armR);
const handGrip=new THREE.Object3D();handGrip.position.set(0,-1,0.75);armR.add(handGrip);
const rodPivot=new THREE.Object3D();handGrip.add(rodPivot);
const legL=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0x333333}));
legL.position.set(-0.5,-2,0);torso.add(legL);
const legR=legL.clone();legR.position.x=0.5;torso.add(legR);
player.scale.set(0.8,0.8,0.8);player.position.set(0,0,-12);

// HELD FISH
const heldFishMesh=new THREE.Mesh(new THREE.SphereGeometry(0.28,10,6),new THREE.MeshStandardMaterial({color:0x5dade2,emissive:0x112244,emissiveIntensity:0.3}));
heldFishMesh.scale.z=1.8;
const leftHandAnchor=new THREE.Object3D();leftHandAnchor.position.set(0,-1.1,0);
armL.add(leftHandAnchor);leftHandAnchor.add(heldFishMesh);heldFishMesh.visible=false;

// ROD MESH
const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.06,2),new THREE.MeshStandardMaterial({color:0x8b5a2b}));
const rodTip=new THREE.Object3D();rodTip.position.set(0,1,0);rod.add(rodTip);
backHolder.add(rod);rod.position.set(0,0,0);rod.rotation.set(0,Math.PI,0.5);

// HOOK & LINE
const hook=new THREE.Mesh(new THREE.SphereGeometry(0.12,10,10),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x4444ff,emissiveIntensity:0.3}));
hook.visible=false;scene.add(hook);
const fishingLine=new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),
  new THREE.LineBasicMaterial({color:0xffffff,opacity:0.7,transparent:true})
);
scene.add(fishingLine);

// JETSKI
const jetski=new THREE.Group();
const hull=new THREE.Mesh(new THREE.BoxGeometry(3,0.8,1.4),new THREE.MeshStandardMaterial({color:0xe74c3c,metalness:0.4,roughness:0.3}));
jetski.add(hull);
const nose=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.2,8),new THREE.MeshStandardMaterial({color:0xc0392b}));
nose.rotation.z=-Math.PI/2;nose.position.set(2,0.1,0);jetski.add(nose);
const shield=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.6,1.2),new THREE.MeshStandardMaterial({color:0x00aaff,transparent:true,opacity:0.5}));
shield.position.set(0.5,0.7,0);jetski.add(shield);
const jseat=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.3,1),new THREE.MeshStandardMaterial({color:0x222222}));
jseat.position.set(-0.3,0.55,0);jetski.add(jseat);
const hbar=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.4,8),new THREE.MeshStandardMaterial({color:0x888888}));
hbar.rotation.x=Math.PI/2;hbar.position.set(0.6,0.9,0);jetski.add(hbar);
jetski.position.copy(jetskiSpawnPos);jetski.visible=false;scene.add(jetski);

// WAKE PARTICLES
const wakeParticles=[];
for(let i=0;i<25;i++){
  const p=new THREE.Mesh(new THREE.SphereGeometry(0.18,6,6),new THREE.MeshStandardMaterial({color:0xaaddff,transparent:true,opacity:0.6}));
  p.visible=false;scene.add(p);wakeParticles.push({mesh:p,life:0,active:false});
}

// BUBBLES
const bubbles=[];
for(let i=0;i<20;i++){
  const b=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),new THREE.MeshStandardMaterial({color:0xaaddff,transparent:true,opacity:0.5}));
  b.visible=false;scene.add(b);
  bubbles.push({mesh:b,life:0,active:false,vel:new THREE.Vector3()});
}

// UNDERWATER OVERLAY
const uwDiv=document.createElement("div");
Object.assign(uwDiv.style,{position:"fixed",inset:"0",background:"rgba(0,80,160,0.22)",pointerEvents:"none",zIndex:"5",display:"none",backdropFilter:"blur(1px)"});
document.body.appendChild(uwDiv);

// ═══ MINIMAP ═══
(function(){
  const wrap=document.createElement("div");
  wrap.id="minimap";
  Object.assign(wrap.style,{
    position:"fixed",right:"12px",top:"108px",width:"130px",height:"130px",
    background:"rgba(0,10,30,0.85)",border:"2px solid rgba(100,200,255,0.4)",
    borderRadius:"50%",overflow:"hidden",zIndex:"20",pointerEvents:"none",
    boxShadow:"0 0 18px rgba(0,100,255,0.35)"
  });
  const cv=document.createElement("canvas");cv.id="minimapCanvas";cv.width=130;cv.height=130;
  wrap.appendChild(cv);
  const dot=document.createElement("div");dot.id="minimapDot";
  Object.assign(dot.style,{
    position:"absolute",width:"9px",height:"9px",background:"#2ecc71",borderRadius:"50%",
    border:"1.5px solid #fff",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
    zIndex:"2",boxShadow:"0 0 7px #2ecc71"
  });
  wrap.appendChild(dot);
  document.body.appendChild(wrap);
  const lbl=document.createElement("div");lbl.id="minimapLabel";
  Object.assign(lbl.style,{
    position:"fixed",right:"12px",top:"246px",color:"#7ecfff",fontSize:"10px",
    textAlign:"center",width:"130px",background:"rgba(0,0,0,0.62)",borderRadius:"6px",
    padding:"2px 4px",zIndex:"20",pointerEvents:"none"
  });
  document.body.appendChild(lbl);
})();

function updateMinimap(){
  const cv=document.getElementById("minimapCanvas");if(!cv)return;
  const ctx=cv.getContext("2d"),W=cv.width,H=cv.height;
  ctx.clearRect(0,0,W,H);
  const px=player.position.x,pz=player.position.z,SC=750;
  const col={main:"#27ae60",mystic:"#9b59b6",volcano:"#e74c3c",crystal:"#00bcd4",aurora:"#4455bb"};
  islandDefs.forEach(isl=>{
    const sx=(isl.x-px)/SC*W+W/2;
    const sy=(isl.z-pz)/SC*H+H/2;
    const sr=Math.max(isl.sandR/SC*W,5);
    ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);
    ctx.fillStyle=col[isl.id]||"#27ae60";ctx.globalAlpha=0.75;ctx.fill();ctx.globalAlpha=1;
  });
  const lbl=document.getElementById("minimapLabel");
  const idef=islandDefs.find(i=>i.id===currentIsland);
  if(lbl&&idef)lbl.textContent="📍 "+idef.label.replace(/[^\x00-\x7F]/g,"").trim();
}

// ═══ FISH PANEL ═══
(function(){
  const p=document.createElement("div");p.id="islandFishPanel";
  Object.assign(p.style,{
    position:"fixed",left:"12px",top:"108px",background:"rgba(0,10,30,0.92)",
    border:"1px solid rgba(100,200,255,0.3)",borderRadius:"12px",padding:"10px 12px",
    zIndex:"20",display:"none",minWidth:"162px",maxWidth:"198px",
    color:"#fff",fontSize:"11px",backdropFilter:"blur(6px)"
  });
  p.innerHTML='<div id="fishPanelTitle" style="color:#7ecfff;font-weight:bold;margin-bottom:6px;font-size:12px"></div><div id="fishPanelList"></div>';
  document.body.appendChild(p);
})();

function updateIslandFishPanel(){
  const panel=document.getElementById("islandFishPanel");
  const title=document.getElementById("fishPanelTitle");
  const list=document.getElementById("fishPanelList");
  if(!panel||!title||!list)return;
  const idef=islandDefs.find(i=>i.id===currentIsland);
  if(!idef){panel.style.display="none";return;}
  panel.style.display="block";
  title.textContent="🐟 "+idef.label;
  const fishes=fishDB[idef.fishKey]||[];
  const rc={Common:"#aaaaaa",Uncommon:"#2ecc71",Rare:"#3498db",Epic:"#9b59b6",Legendary:"#f39c12",Junk:"#666666"};
  list.innerHTML=fishes.map(f=>
    `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
      <span>${f.emoji}</span>
      <span style="color:${rc[f.rarity]};font-size:10px">${f.name}</span>
      <span style="color:#f1c40f;font-size:10px;margin-left:auto">💰${f.price}</span>
    </div>`
  ).join("");
}

// ═══ CAMERA ═══
let camYaw=0,camPitch=0.3,camTouchId=null,lastX=0,lastY=0;
renderer.domElement.addEventListener("touchstart",e=>{
  const t=e.changedTouches[0];
  if(t.clientX>window.innerWidth/2){camTouchId=t.identifier;lastX=t.clientX;lastY=t.clientY;}
},{passive:true});
renderer.domElement.addEventListener("touchmove",e=>{
  const t=[...e.touches].find(t=>t.identifier===camTouchId);if(!t)return;
  camYaw-=(t.clientX-lastX)*0.007;camPitch-=(t.clientY-lastY)*0.007;
  camPitch=THREE.MathUtils.clamp(camPitch,0.05,1.4);
  lastX=t.clientX;lastY=t.clientY;
},{passive:true});
renderer.domElement.addEventListener("touchend",e=>{
  if([...e.changedTouches].find(t=>t.identifier===camTouchId))camTouchId=null;
},{passive:true});

// ═══ JOYSTICK ═══
const joy=document.getElementById("joystick"),stick=document.getElementById("stick");
let joyX=0,joyY=0,joyTouchId=null;
joy.addEventListener("touchstart",e=>{
  e.preventDefault();const t=e.changedTouches[0];
  if(t.clientX<window.innerWidth/2)joyTouchId=t.identifier;
},{passive:false});
joy.addEventListener("touchmove",e=>{
  e.preventDefault();
  const t=[...e.touches].find(t=>t.identifier===joyTouchId);if(!t)return;
  const r=joy.getBoundingClientRect(),x=t.clientX-r.left-60,y=t.clientY-r.top-60;
  const d=Math.min(40,Math.hypot(x,y)),a=Math.atan2(y,x);
  joyX=Math.cos(a)*(d/40);joyY=Math.sin(a)*(d/40);
  stick.style.left=(35+joyX*30)+"px";stick.style.top=(35+joyY*30)+"px";
},{passive:false});
joy.addEventListener("touchend",e=>{
  if([...e.changedTouches].find(t=>t.identifier===joyTouchId)){
    joyTouchId=null;joyX=0;joyY=0;stick.style.left="35px";stick.style.top="35px";
  }
},{passive:true});
const keys={};
window.addEventListener("keydown",e=>{if(e.key)keys[e.key.toLowerCase()]=true;});
window.addEventListener("keyup",e=>{if(e.key)keys[e.key.toLowerCase()]=false;});
let walkAnim=0;

// ═══ ISLAND CHECK ═══
function getPlayerIsland(){
  const px=player.position.x,pz=player.position.z;
  for(const isl of islandDefs){
    if((px-isl.x)**2+(pz-isl.z)**2<isl.sandR*isl.sandR)return isl.id;
  }
  return null;
}
function checkOnLand(){
  const px=player.position.x,pz=player.position.z;
  for(const isl of islandDefs){
    if((px-isl.x)**2+(pz-isl.z)**2<isl.sandR*isl.sandR)return true;
  }
  if((px-70)**2+(pz-20)**2<144)return true;
  return false;
}
function canFishFromHere(){
  const px=player.position.x,pz=player.position.z;
  for(const isl of islandDefs){
    const d=Math.sqrt((px-isl.x)**2+(pz-isl.z)**2);
    if(d>isl.grassR*0.88&&d<isl.sandR+12)return true;
  }
  if(!checkOnLand())return true;
  return false;
}

// ═══ SWIM ANIMATION ═══
function updateSwimAnim(dt,moving){
  swimCycle+=dt*(moving?1.8:0.8);
  torso.rotation.x=THREE.MathUtils.lerp(torso.rotation.x,-0.55,0.08);
  torso.position.y=THREE.MathUtils.lerp(torso.position.y,2.4,0.08);
  torso.rotation.z=Math.sin(swimCycle*0.5)*0.12;
  head.rotation.x=THREE.MathUtils.lerp(head.rotation.x,-0.15,0.08);
  head.rotation.z=0;
  armL.rotation.x=Math.sin(swimCycle)*1.0;
  armL.rotation.z=Math.cos(swimCycle)*0.3-0.2;
  armR.rotation.x=Math.sin(swimCycle+Math.PI)*1.0;
  armR.rotation.z=-(Math.cos(swimCycle+Math.PI)*0.3)+0.2;
  legL.rotation.x=Math.sin(swimCycle*2)*0.25;
  legR.rotation.x=Math.sin(swimCycle*2+Math.PI)*0.25;
  legL.rotation.z=0;legR.rotation.z=0;
}
function resetBodyPose(){
  torso.rotation.x=THREE.MathUtils.lerp(torso.rotation.x,0,0.12);
  torso.rotation.z=THREE.MathUtils.lerp(torso.rotation.z,0,0.12);
  torso.position.y=THREE.MathUtils.lerp(torso.position.y,3,0.12);
  head.rotation.x=THREE.MathUtils.lerp(head.rotation.x,0,0.12);
  head.rotation.z=THREE.MathUtils.lerp(head.rotation.z,0,0.12);
}

// ═══ PLAYER MOVEMENT ═══
function movePlayer(dt){
  if(onJetski)return;
  let mX=joyX,mY=joyY;
  if(keys["w"]||keys["arrowup"])mY=-1;
  if(keys["s"]||keys["arrowdown"])mY=1;
  if(keys["a"]||keys["arrowleft"])mX=-1;
  if(keys["d"]||keys["arrowright"])mX=1;
  const fwd=new THREE.Vector3();camera.getWorldDirection(fwd);fwd.y=0;fwd.normalize();
  const rgt=new THREE.Vector3();rgt.crossVectors(fwd,camera.up).normalize();
  const dir=new THREE.Vector3();dir.addScaledVector(fwd,-mY);dir.addScaledVector(rgt,mX);
  if(dir.lengthSq()>0.0001){
    const ta=Math.atan2(dir.x,dir.z);
    let diff=ta-player.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));
    player.rotation.y+=diff*0.12;
  }
  const spd=isSwimming?0.07:0.13;
  if(!freezePlayer)player.position.addScaledVector(dir,spd);
  if(isSwimming)player.position.y=THREE.MathUtils.lerp(player.position.y,-1.8,0.1);
  else player.position.y=THREE.MathUtils.lerp(player.position.y,0,0.15);
  const moving=dir.lengthSq()>0.001&&!freezeInput&&!isFishing;
  if(isSwimming){
    uwDiv.style.display="block";
    updateSwimAnim(dt,moving);
    if(moving&&Math.random()<0.08){
      for(const b of bubbles){
        if(!b.active){
          b.active=true;b.life=1;b.mesh.visible=true;
          b.mesh.position.copy(player.position);b.mesh.position.y+=0.5;
          b.vel.set((Math.random()-.5)*0.06,0.04+Math.random()*0.04,(Math.random()-.5)*0.06);
          break;
        }
      }
    }
  } else {
    uwDiv.style.display="none";
    resetBodyPose();
    if(moving)walkAnim+=0.18;
    const sw=Math.sin(walkAnim);
    if(moving&&!castingPose&&!isFishing){
      legL.rotation.x=sw*0.8;legR.rotation.x=-sw*0.8;
      armL.rotation.x=-sw*0.5;armL.rotation.z=0;armR.rotation.z=-0.2;
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
  // Track island change
  const newIsland=getPlayerIsland()||"main";
  if(newIsland!==currentIsland){
    currentIsland=newIsland;
    const idef=islandDefs.find(i=>i.id===currentIsland);
    if(idef){
      const pool=fishDB[idef.fishKey]||[];
      const legs=pool.filter(f=>f.rarity==="Legendary");
      const preview=legs.length>0?legs.map(f=>f.emoji).join(" "):pool.slice(0,4).map(f=>f.emoji).join(" ");
      showEventNotification("🏝️ Arrived at "+idef.label+"! Fish here: "+preview);
    }
    updateIslandFishPanel();
  }
}

function updateCamera(){
  const worldPos=new THREE.Vector3();player.getWorldPosition(worldPos);
  const tgt=worldPos.clone();tgt.y+=3.3;
  const dist=onJetski?12:9;
  const des=new THREE.Vector3(tgt.x-Math.sin(camYaw)*dist,tgt.y+camPitch*4.5,tgt.z-Math.cos(camYaw)*dist);
  camera.position.lerp(des,0.18);camera.lookAt(tgt);
}

function animateWater(time){
  const pos=water.geometry.attributes.position;
  for(let i=0;i<pos.count;i+=4)pos.setZ(i,Math.sin(i*0.3+time*0.0015)*0.18);
  pos.needsUpdate=true;
}

function updateFloatingOrbs(time){
  floatingOrbs.forEach(o=>{
    o.mesh.position.y=o.baseY+Math.sin(time*0.001+(o.mesh.userData.floatOffset||0))*0.85;
  });
}

// ═══ JETSKI ═══
function mountJetski(){
  if(!jetskiOwned){showMessage("🛥️ Beli Jetski dari Jetski Shop!");return;}
  if(!jetskiSpawned){showMessage("🛥️ Spawn jetski dulu di Pelabuhan!");return;}
  onJetski=true;isSwimming=false;uwDiv.style.display="none";
  scene.remove(player);jetski.add(player);
  player.position.set(-0.3,0.75,0);player.rotation.set(0,0,0);
  torso.rotation.x=0.05;legL.rotation.x=1.4;legR.rotation.x=1.4;
  legL.rotation.z=0.15;legR.rotation.z=-0.15;
  armL.rotation.x=-0.5;armR.rotation.x=-0.5;armL.rotation.z=0.4;armR.rotation.z=-0.4;
  document.getElementById("jetskiUI").style.display="block";
  if(window.MP&&window.MP.isActive())window.MP.sendEvent("mountJetski",{});
  showMessage("🛥️ Naik! [WASD] kemudi · [E] turun");
}
function dismountJetski(){
  onJetski=false;jetskiSpeed=0;
  if(player.parent===jetski){jetski.remove(player);scene.add(player);player.position.set(jetski.position.x+3,0,jetski.position.z);player.rotation.set(0,0,0);}
  torso.rotation.x=0;legL.rotation.x=0;legR.rotation.x=0;legL.rotation.z=0;legR.rotation.z=0;
  armL.rotation.x=0;armR.rotation.x=0;armL.rotation.z=0;armR.rotation.z=0;
  document.getElementById("jetskiUI").style.display="none";
  if(window.MP&&window.MP.isActive())window.MP.sendEvent("dismountJetski",{});
  showMessage("Turun dari jetski.");
}
function spawnJetski(){
  if(!jetskiOwned){showMessage("🛥️ Beli Jetski dulu!");return;}
  jetskiSpawned=true;jetski.position.set(70,0.1,28);jetski.visible=true;jetski.rotation.set(0,0,0);
  showMessage("🛥️ Jetski di-spawn di Pelabuhan!");
}
function despawnJetski(){
  if(onJetski)dismountJetski();jetskiSpawned=false;jetski.visible=false;showMessage("🛥️ Jetski di-despawn.");
}
function updateJetski(){
  if(!onJetski)return;
  let mX=joyX,mY=joyY;
  if(keys["w"]||keys["arrowup"])mY=-1;if(keys["s"]||keys["arrowdown"])mY=1;
  if(keys["a"]||keys["arrowleft"])mX=-1;if(keys["d"]||keys["arrowright"])mX=1;
  if(Math.abs(mX)>0.1)jetski.rotation.y-=mX*0.04;
  if(mY<-0.1)jetskiSpeed=Math.min(jetskiSpeed+0.012,jetskiMaxSpeed);
  else if(mY>0.1)jetskiSpeed=Math.max(jetskiSpeed-0.01,-jetskiMaxSpeed*0.3);
  else jetskiSpeed*=0.92;
  jetski.position.x+=Math.sin(jetski.rotation.y)*jetskiSpeed;
  jetski.position.z+=Math.cos(jetski.rotation.y)*jetskiSpeed;
  jetski.position.y=0.1+Math.sin(Date.now()*0.002)*0.08;
  jetski.rotation.x=jetskiSpeed*0.18;jetski.rotation.z=-mX*0.07;
  armL.rotation.z=0.4+mX*0.15;armR.rotation.z=-0.4+mX*0.15;torso.rotation.z=mX*-0.05;
  document.getElementById("jetskiSpeed").textContent=Math.abs(Math.round(jetskiSpeed*240))+" km/h";
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
    p.life-=dt*1.5;if(p.life<=0){p.active=false;p.mesh.visible=false;continue;}
    p.mesh.position.y=-0.9+p.life*0.3;p.mesh.material.opacity=p.life*0.45;p.mesh.scale.setScalar(1+(1-p.life)*2);
  }
}
function updateBubbles(dt){
  for(const b of bubbles){
    if(!b.active)continue;
    b.life-=dt*0.9;if(b.life<=0){b.active=false;b.mesh.visible=false;continue;}
    b.mesh.position.add(b.vel);b.mesh.material.opacity=b.life*0.5;b.mesh.scale.setScalar(b.life);
  }
}

// ═══ FISHING ═══
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
  const sp=new THREE.Vector3();rodTip.getWorldPosition(sp);
  hook.position.copy(sp);hook.visible=true;
  const fw=new THREE.Vector3(0,0,1).applyQuaternion(player.quaternion);fw.y+=0.35;
  hook.userData.velocity=fw.multiplyScalar(0.28);
  const rd=rodDatabase[inventory.equipped]||rodDatabase.FishingRod;
  const bd=baitTypes.find(b=>b.id===inventory.equippedBait)||baitTypes[0];
  const sm=(rd.speedMult||1)*currentWeather.speedMult*(1+bd.speedBonus);
  biteTime=(Math.random()*4+2)/sm;
}
function updateFishingWait(){
  if(!inventory.equipped||!hook.visible)return;
  if(!hookInWater){
    hook.position.add(hook.userData.velocity);hook.userData.velocity.y-=0.012;
    if(hook.position.y<=-1){hook.position.y=-1;hookInWater=true;fishingTimer=0;}
  }
  if(hookInWater&&!fishBiting&&!tensionActive){
    fishingTimer+=0.016;
    if(fishingTimer>=biteTime){pendingFish=getRandomFish();startTension(pendingFish);}
  }
  if(fishBiting&&!tensionActive)armR.rotation.z=Math.sin(Date.now()*0.02)*0.2;
}

// ═══ TENSION BAR ═══
const RARITY_FISH_SPEED={Junk:0.18,Common:0.25,Uncommon:0.38,Rare:0.55,Epic:0.75,Legendary:1.0};

function startTension(fish){
  fishBiting=true;tensionActive=true;
  tensionVal=50;zoneMin=42;zoneMax=58;
  tensionProgress=0;tensionReeling=false;
  tensionDifficulty=fish.diff||1;tensionFishSpeed=0;
  tensionDir=Math.random()<0.5?1:-1;tensionTimeout=20;freezePlayer=true;pendingFish=fish;
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
  tensionTimeout-=dt;if(tensionTimeout<=0){loseFish();return;}
  const zoneSpeed=35,zoneWidth=zoneMax-zoneMin;
  if(tensionReeling){zoneMin+=zoneSpeed*dt;zoneMax+=zoneSpeed*dt;}
  else{zoneMin-=zoneSpeed*dt;zoneMax-=zoneSpeed*dt;}
  if(zoneMin<0){zoneMin=0;zoneMax=zoneWidth;}
  if(zoneMax>100){zoneMax=100;zoneMin=100-zoneWidth;}
  const fishSpd=RARITY_FISH_SPEED[pendingFish?.rarity||"Common"]||0.3;
  tensionFishSpeed+=(Math.random()-0.5)*0.12*tensionDifficulty;
  tensionFishSpeed=THREE.MathUtils.clamp(tensionFishSpeed,-fishSpd*1.2,fishSpd*1.2);
  const flipChance={Junk:0.008,Common:0.012,Uncommon:0.018,Rare:0.025,Epic:0.035,Legendary:0.05};
  if(Math.random()<(flipChance[pendingFish?.rarity||"Common"]||0.02))tensionDir*=-1;
  tensionVal+=tensionFishSpeed*tensionDir*dt*60;
  tensionVal=THREE.MathUtils.clamp(tensionVal,0,100);
  if(tensionVal<=0||tensionVal>=100)tensionDir*=-1;
  const inZone=tensionVal>=zoneMin&&tensionVal<=zoneMax;
  if(inZone)tensionProgress+=dt*18;else tensionProgress-=dt*12;
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
  const label=document.getElementById("tensionLabel");
  bar.style.width=tensionProgress+"%";
  bar.style.background=tensionProgress>70?"linear-gradient(90deg,#27ae60,#2ecc71)":tensionProgress>35?"linear-gradient(90deg,#f39c12,#f1c40f)":"linear-gradient(90deg,#e74c3c,#c0392b)";
  const inZone=tensionVal>=zoneMin&&tensionVal<=zoneMax;
  zone.style.left=zoneMin+"%";zone.style.width=(zoneMax-zoneMin)+"%";
  zone.style.background=inZone?"rgba(46,204,113,0.5)":"rgba(46,204,113,0.25)";
  zone.style.border="2px solid "+(inZone?"#2ecc71":"rgba(46,204,113,0.4)");
  zone.style.borderRadius="4px";zone.style.transition="none";
  ind.style.left=tensionVal+"%";
  ind.style.background=inZone?"#fff":"#e74c3c";
  ind.style.boxShadow=inZone?"0 0 10px #2ecc71":"0 0 8px #e74c3c";
  const rEmoji={Junk:"👟",Common:"🐟",Uncommon:"🐠",Rare:"🐡",Epic:"🦈",Legendary:"🌟"};
  const rarity=pendingFish?.rarity||"Common";
  if(inZone){
    label.textContent=(rEmoji[rarity]||"🐟")+" Ikan dalam zona! Pertahankan!";
    label.style.color="#2ecc71";
  } else {
    label.textContent=tensionVal<zoneMin?"⬅️ Lepas tombol! Kejar ikan!":"➡️ Tahan tombol! Kejar ikan!";
    label.style.color="#e74c3c";
  }
  prompt.style.display=inZone?"block":"none";
  if(inZone)prompt.textContent="✅ Bagus! Pertahankan!";
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
  stopFishingAll();pendingFish=null;showMessage("🐟 The fish got away!");
}
function stopFishingAll(){
  isFishing=false;castingPose=false;castingNow=false;fishBiting=false;hookInWater=false;
  freezeInput=false;freezePlayer=false;fishingTimer=0;biteTime=0;hook.visible=false;
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
  const s=new THREE.Vector3();rodTip.getWorldPosition(s);
  fishingLine.geometry.setFromPoints([s,hook.position.clone()]);
}

document.getElementById("reelBtn").addEventListener("pointerdown",e=>{
  e.stopPropagation();tensionReeling=true;
  document.getElementById("reelBtn").style.background="linear-gradient(135deg,#27ae60,#2ecc71)";
});
document.getElementById("reelBtn").addEventListener("pointerup",()=>{
  tensionReeling=false;document.getElementById("reelBtn").style.background="linear-gradient(135deg,#e74c3c,#c0392b)";
});
document.getElementById("reelBtn").addEventListener("touchstart",e=>{
  e.stopPropagation();tensionReeling=true;
  document.getElementById("reelBtn").style.background="linear-gradient(135deg,#27ae60,#2ecc71)";
},{passive:true});
document.getElementById("reelBtn").addEventListener("touchend",()=>{
  tensionReeling=false;document.getElementById("reelBtn").style.background="linear-gradient(135deg,#e74c3c,#c0392b)";
});

// ═══ FISH RANDOMIZER — ISLAND SPECIFIC ═══
function getRandomFish(){
  const rd=rodDatabase[inventory.equipped]||rodDatabase.FishingRod;
  const bd=baitTypes.find(b=>b.id===inventory.equippedBait)||baitTypes[0];
  const luck=(rd.luckMult||1)*currentWeather.luckMult*(1+playerLevel*0.025)*(1+bd.luckBonus);
  const rareB=bd.rareBonus||0;
  const pool=fishDB[currentIsland]||fishDB.main;
  const weights={Junk:0.08,Common:0.35,Uncommon:0.28,Rare:0.16,Epic:0.09,Legendary:0.04};
  let total=pool.reduce((s,f)=>{
    let w=(weights[f.rarity]||0.1)*(1+rareB);
    if(f.rarity==="Legendary"||f.rarity==="Epic")w*=luck;
    return s+w;
  },0);
  let r=Math.random()*total;
  for(const f of pool){
    let w=(weights[f.rarity]||0.1)*(1+rareB);
    if(f.rarity==="Legendary"||f.rarity==="Epic")w*=luck;
    r-=w;if(r<=0)return f;
  }
  return pool[0];
}

// ═══ INVENTORY UI ═══
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
    const tabs=["rods","bait","fish"];el.classList.toggle("active",tabs[i]===tab);
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
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:12px;">Tap to equip.</div>`
    +allRods.map(r=>{
      const owned=inventory.rods.includes(r.id),eq=inventory.equipped===r.id;
      return`<div class="rodRow${eq?" equipped":""}" onclick="${owned?`equipRod('${r.id}')`:`buyRod('${r.id}')`}">
        <div class="rodIcon">${r.icon}</div>
        <div class="rodInfo"><h4>${r.name}${eq?" <span style='color:#f1c40f'>✓</span>":""}</h4>
        <p>${r.desc}</p><div class="rodStats">⚡${r.speedMult}x 🍀${r.luckMult}x${!owned?" 💰"+r.price:""}</div></div>
        <button class="rodEquipBtn ${eq?"eq":"neq"}">${eq?"Equipped":owned?"Equip":"Buy 💰"+r.price}</button>
      </div>`;
    }).join("");
}
function renderBaitTab(el){
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:12px;">Tap to select.</div><div class="baitGrid">`
    +baitTypes.map(b=>{
      const count=b.infinite?"∞":inventory.bait[b.id]||0,eq=inventory.equippedBait===b.id;
      return`<div class="baitCard${eq?" selected":""}" onclick="selectBait('${b.id}')">
        <div class="baitIcon">${b.icon}</div><h4>${b.name}</h4><p>${b.desc}</p>
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
  const rc={Common:"#aaa",Uncommon:"#2ecc71",Rare:"#3498db",Epic:"#9b59b6",Legendary:"#f39c12",Junk:"#666"};
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:10px;">${inventory.fish.length} fish</div><div class="fishBagGrid">`
    +inventory.fish.map((f,i)=>`
      <div class="fishCard${heldFishIndex===i?" holding":""}">
        <div class="fishIcon">${f.emoji}</div><h4>${f.name}</h4>
        <div style="color:${rc[f.rarity]||"#aaa"};font-size:10px">${f.rarity}</div>
        <div style="font-size:9px;color:#7ecfff">${f.island||""}</div>
        <div class="fishPrice">💰${f.price}</div>
        <button class="holdBtn ${heldFishIndex===i?"unhold":"hold"}" onclick="toggleHoldFish(${i})">${heldFishIndex===i?"Put down":"Hold 🤚"}</button>
      </div>`).join("")
    +`</div><button id="invSellAllBtn" onclick="sellAllFish()">💰 Sell All (+💰${inventory.fish.reduce((s,f)=>s+f.price,0)})</button>`;
}

function equipRod(name){
  if(!inventory.rods.includes(name)){showMessage("You don't own this rod!");return;}
  inventory.equipped=name;inventory._lastSelected=name;
  if(rod.parent)rod.parent.remove(rod);
  rodPivot.add(rod);rod.position.set(0,0,0);rod.rotation.set(Math.PI/2,0,0);
  armR.rotation.x=-0.6;armR.rotation.z=-0.2;
  rod.material.color.setHex(rodDatabase[name]?.color||0x8b5a2b);
  showMessage("🎣 Equipped: "+rodDatabase[name].name);
  updateHotbarSlot();if(inventoryOpen)renderTab("rods");
}
function selectBait(id){
  const bd=baitTypes.find(b=>b.id===id);if(!bd)return;
  if(!bd.infinite&&(inventory.bait[id]||0)===0){showMessage("Buy this bait first!");return;}
  inventory.equippedBait=id;showMessage(bd.icon+" Bait: "+bd.name);renderTab("bait");
}
function buyBait(id){
  const bd=baitTypes.find(b=>b.id===id);if(!bd)return;
  const qty=10,cost=bd.price*qty;
  if(coins<cost){showMessage("Need 💰"+cost+" for 10x "+bd.name);return;}
  coins-=cost;inventory.bait[id]=(inventory.bait[id]||0)+qty;
  document.getElementById("coinUI").textContent="💰 "+coins;
  showMessage("✅ Bought 10x "+bd.name+"!");renderTab("bait");saveProgress();
}
function toggleHoldFish(i){
  if(heldFishIndex===i){
    heldFishIndex=-1;heldFishMesh.visible=false;document.getElementById("heldFishHUD").style.display="none";
  } else {
    heldFishIndex=i;const f=inventory.fish[i];
    heldFishMesh.material.color.set(f.color||"#5dade2");heldFishMesh.visible=true;
    document.getElementById("heldFishHUD").style.display="block";
    document.getElementById("heldFishHUD").textContent=f.emoji+" Holding: "+f.name;
  }
  renderTab("fish");
}

// ═══ SELL/BUY ═══
function sellFish(){if(inventory.fish.length===0){showMessage("🚫 No fish!");return;}sellAllFish();}
function sellAllFish(){
  let total=0;inventory.fish.forEach(f=>total+=f.price);
  coins+=total;inventory.fish=[];heldFishIndex=-1;heldFishMesh.visible=false;
  document.getElementById("coinUI").textContent="💰 "+coins;
  document.getElementById("heldFishHUD").style.display="none";
  showMessage("🐟 Sold all! +💰"+total);
  if(inventoryOpen)renderTab("fish");saveProgress();
}
function buyRod(name){
  if(inventory.rods.includes(name)){showMessage("Already owned!");return;}
  const rd=rodDatabase[name];if(!rd)return;
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

// ═══ NOTIFICATIONS ═══
function showFishNotification(fish){
  const el=document.getElementById("fishNotify");
  el.style.display="block";el.style.color=fish.color;
  el.textContent=fish.emoji+" "+fish.name+" ("+fish.rarity+") 🏝️"+(fish.island||"")+" +💰"+fish.price;
  clearTimeout(el._t);el._t=setTimeout(()=>el.style.display="none",3000);
}
function showEventNotification(text){
  const el=document.getElementById("eventNotify");
  el.style.display="block";el.textContent=text;
  clearTimeout(el._t);el._t=setTimeout(()=>el.style.display="none",4500);
}
function showMessage(text){
  const m=document.createElement("div");m.textContent=text;
  Object.assign(m.style,{position:"fixed",top:"20%",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.85)",color:"#fff",padding:"11px 22px",borderRadius:"12px",fontFamily:"Arial",zIndex:"9999",fontSize:"14px",whiteSpace:"nowrap",boxShadow:"0 4px 16px rgba(0,0,0,.5)"});
  document.body.appendChild(m);setTimeout(()=>m.remove(),2200);
}

// ═══ LEVEL/XP ═══
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
    playerLevel++;showMessage("🎉 LEVEL UP! Lv."+playerLevel+" — "+levelTitles[Math.min(playerLevel-1,levelTitles.length-1)]);
  }
}
function updateLevelUI(){
  const lv=Math.min(playerLevel,xpThresholds.length-1);
  const nx=xpThresholds[lv]||xpThresholds[xpThresholds.length-1],pv=xpThresholds[lv-1]||0;
  document.getElementById("levelNum").textContent=playerLevel;
  document.getElementById("levelTitle").textContent=levelTitles[Math.min(playerLevel-1,levelTitles.length-1)];
  document.getElementById("xpBar").style.width=Math.min(100,((playerXP-pv)/(nx-pv))*100)+"%";
  document.getElementById("xpText").textContent=playerXP+"/"+nx+" XP";
}

// ═══ WEATHER ═══
function setWeather(w){
  currentWeather=w;scene.background=new THREE.Color(w.skyColor);scene.fog.color=new THREE.Color(w.fogColor);
  document.getElementById("weatherUI").textContent=w.icon+" "+w.name;
  sun.intensity=w.name==="Storming"?0.4:w.name==="Foggy"?0.6:1.2;
  showEventNotification(w.icon+" "+w.name+" | Speed:"+w.speedMult+"x Luck:"+w.luckMult+"x");
  if(window.MP&&window.MP.isActive()&&localStorage.getItem("playerName")==="Varz444")window.MP.syncWeather(w.name);
}
function updateWeather(dt){
  weatherTimer+=dt;
  if(weatherTimer>=weatherChangeCooldown){
    weatherTimer=0;weatherChangeCooldown=200+Math.random()*200;
    const nx=weatherTypes[Math.floor(Math.random()*weatherTypes.length)];
    if(nx.name!==currentWeather.name)setWeather(nx);
  }
}

// ═══ NPC INTERACTION ═══
function updateNPCInteraction(){
  const fishPos=new THREE.Vector3(),rodPos=new THREE.Vector3(),baitPos=new THREE.Vector3(),jsPos=new THREE.Vector3();
  counter.getWorldPosition(fishPos);rodShopCounter.getWorldPosition(rodPos);
  baitShopCounter.getWorldPosition(baitPos);jetskiShopCounter.getWorldPosition(jsPos);
  const pwp=new THREE.Vector3();player.getWorldPosition(pwp);
  const sellBtn=document.getElementById("sellBtn"),rodBtn=document.getElementById("openRodShopBtn");
  const baitBtn=document.getElementById("openJetskiShopBtn"),mountBtn=document.getElementById("mountJetskiBtn");
  const harbBtn=document.getElementById("harbourBtn");
  if(pwp.distanceTo(fishPos)<12){
    nearSeller=true;sellBtn.style.display="block";
    const v=fishPos.clone().project(camera);
    sellBtn.style.left=((v.x+1)/2*window.innerWidth-sellBtn.offsetWidth/2)+"px";
    sellBtn.style.top=((-v.y+1)/2*window.innerHeight-55)+"px";
  } else{nearSeller=false;sellBtn.style.display="none";}
  if(pwp.distanceTo(rodPos)<12){
    rodBtn.style.display="block";
    const v=rodPos.clone().project(camera);
    rodBtn.style.left=((v.x*.5+.5)*window.innerWidth)+"px";
    rodBtn.style.top=((-v.y*.5+.5)*window.innerHeight)+"px";
  } else rodBtn.style.display="none";
  if(pwp.distanceTo(baitPos)<12||pwp.distanceTo(jsPos)<12)baitBtn.style.display="block";
  else baitBtn.style.display="none";
  const distToJetski=pwp.distanceTo(jetski.position);
  nearJetski=jetskiSpawned&&distToJetski<7;
  nearHarbour=pwp.distanceTo(HARBOUR_POS)<15;
  if(harbBtn){
    if(nearHarbour&&jetskiOwned&&!onJetski){
      harbBtn.style.display="block";
      harbBtn.textContent=jetskiSpawned?"🛥️ Despawn Jetski":"🛥️ Spawn Jetski";
      harbBtn.onclick=jetskiSpawned?despawnJetski:spawnJetski;
    } else if(!onJetski)harbBtn.style.display="none";
  }
  if(nearJetski&&!onJetski&&jetskiOwned){
    mountBtn.style.display="block";
    const p=jetski.position.clone();p.y+=2;p.project(camera);
    mountBtn.style.left=((p.x*.5+.5)*window.innerWidth-mountBtn.offsetWidth/2)+"px";
    mountBtn.style.top=((-p.y*.5+.5)*window.innerHeight)+"px";mountBtn.textContent="🛥️ Naik [E]";
  } else if(onJetski){
    mountBtn.textContent="🛥️ Turun [E]";mountBtn.style.display="block";
    mountBtn.style.left="50%";mountBtn.style.top="auto";mountBtn.style.bottom="180px";mountBtn.style.transform="translateX(-50%)";
  } else mountBtn.style.display="none";
  const hint=document.getElementById("interactHint");
  if(nearHarbour&&jetskiOwned&&!onJetski)hint.textContent=jetskiSpawned?"🛥️ [E] Despawn Jetski":"🛥️ [E] Spawn Jetski";
  else if(nearJetski&&!onJetski)hint.textContent="🛥️ Tekan [E] naik jetski";
  else if(pwp.distanceTo(fishPos)<12)hint.textContent="🐟 Sell Shop — tekan Sell";
  else if(pwp.distanceTo(rodPos)<12)hint.textContent="🎣 Rod Shop [E]";
  else if(pwp.distanceTo(baitPos)<12)hint.textContent="🪱 Baits Shop";
  else{hint.textContent="";hint.style.display="none";return;}
  hint.style.display="block";
}

// ═══ NPC ANIMATION ═══
function animateNPCs(time){
  npcRoot.rotation.y=Math.sin(time*.002)*.1;
  rodNpcRoot.rotation.y=Math.sin(time*.0022+1)*.1;
  baitNpcRoot.rotation.y=Math.sin(time*.0018+2)*.1;
  jsNpcRoot.rotation.y=Math.sin(time*.002+3)*.1;
  const pp=new THREE.Vector3();player.getWorldPosition(pp);
  npcGroup.lookAt(pp.x,npcGroup.position.y,pp.z);
  rodNpcGroup.lookAt(pp.x,rodNpcGroup.position.y,pp.z);
  baitNpcGroup.lookAt(pp.x,baitNpcGroup.position.y,pp.z);
  jsNpcGroup.lookAt(pp.x,jsNpcGroup.position.y,pp.z);
}

// ═══ SAVE/LOAD ═══
function saveProgress(){
  const d={coins,playerXP,playerLevel,fishLog:inventory.fishLog,rods:inventory.rods,equipped:inventory.equipped,bait:inventory.bait,equippedBait:inventory.equippedBait,fish:inventory.fish,jetskiOwned,weather:currentWeather.name};
  try{localStorage.setItem("fishingSave_v5",JSON.stringify(d));showMessage("💾 Saved!");}catch(e){}
}
function loadGameProgress(){
  try{
    const d=JSON.parse(localStorage.getItem("fishingSave_v5")||localStorage.getItem("fishingSave_v4"));
    if(!d)return;
    coins=d.coins||0;playerXP=d.playerXP||0;playerLevel=d.playerLevel||1;
    inventory.fishLog=d.fishLog||[];inventory.rods=d.rods||["FishingRod"];
    inventory.equipped=d.equipped||"FishingRod";
    inventory.bait=d.bait||{none:999,worm:0,shrimp:0,squid:0,gold:0,magic:0};
    inventory.equippedBait=d.equippedBait||"none";inventory.fish=d.fish||[];
    jetskiOwned=d.jetskiOwned||false;
    if(d.weather){const w=weatherTypes.find(x=>x.name===d.weather);if(w)setWeather(w);}
    document.getElementById("coinUI").textContent="💰 "+coins;
    updateLevelUI();if(inventory.equipped)equipRod(inventory.equipped);
    if(jetskiOwned){const btn=document.getElementById("buyJetskiBtn");if(btn){btn.textContent="✓ Owned";btn.disabled=true;}}
  }catch(e){}
}
function setShirt(c){torso.material.color.set(c);}

// ═══ UI EVENTS ═══
document.getElementById("shirtColor").addEventListener("input",e=>setShirt(e.target.value));
document.getElementById("saveCustom").addEventListener("click",()=>{localStorage.setItem("playerShirt",document.getElementById("shirtColor").value);saveProgress();document.getElementById("customUI").style.display="none";});
document.getElementById("closeCustomBtn").addEventListener("click",()=>document.getElementById("customUI").style.display="none");
document.getElementById("openMenuBtn").addEventListener("click",()=>{const m=document.getElementById("menuUI");m.style.display=m.style.display==="flex"?"none":"flex";gamePaused=m.style.display==="flex";});
document.getElementById("resumeBtn").addEventListener("click",()=>{document.getElementById("menuUI").style.display="none";gamePaused=false;});
document.getElementById("settingsBtn").addEventListener("click",()=>{document.getElementById("menuUI").style.display="none";document.getElementById("customUI").style.display="block";});
document.getElementById("saveBtn").addEventListener("click",saveProgress);
document.getElementById("quitBtn").addEventListener("click",()=>{if(confirm("Keluar dari game? Progress akan disimpan.")){saveProgress();location.reload();}});
document.getElementById("sellBtn").addEventListener("click",()=>{if(nearSeller)sellFish();});
document.getElementById("mountJetskiBtn").addEventListener("click",()=>{if(onJetski)dismountJetski();else if(nearJetski)mountJetski();});
document.getElementById("openRodShopBtn").addEventListener("click",()=>{toggleInventory();if(inventoryOpen)switchTab("rods");});
document.getElementById("openJetskiShopBtn").addEventListener("click",()=>{
  const bp=new THREE.Vector3();baitShopCounter.getWorldPosition(bp);
  const pp=new THREE.Vector3();player.getWorldPosition(pp);
  if(pp.distanceTo(bp)<12){toggleInventory();if(inventoryOpen)switchTab("bait");}
  else{document.getElementById("jetskiShopUI").style.display="flex";freezeInput=true;}
});

// ═══ INPUT ═══
window.addEventListener("pointerdown",e=>{
  if(e.target.id==="reelBtn")return;
  pulling=true;if(!gameStarted)return;if(tensionActive)return;if(fishBiting)return;
  if(freezeInput||gamePaused)return;
  const openUIs=["menuUI","inventoryUI","jetskiShopUI","settingsMenu"];
  if(openUIs.some(id=>{const el=document.getElementById(id);return el&&(el.style.display==="flex"||el.classList.contains("show"));}))return;
  if(inventory.equipped)startCastAnimation();
});
window.addEventListener("pointerup",()=>pulling=false);
window.addEventListener("keydown",e=>{
  if(!gameStarted)return;if(!e.key)return;
  const k=e.key.toLowerCase();
  if(k==="escape"){const m=document.getElementById("menuUI");m.style.display=m.style.display==="flex"?"none":"flex";gamePaused=m.style.display==="flex";}
  if(k===" "||k==="f"){if(tensionActive){tensionReeling=true;return;}if(inventory.equipped&&!onJetski)startCastAnimation();}
  if(k==="e"){
    if(onJetski){dismountJetski();return;}
    if(nearHarbour&&jetskiOwned){jetskiSpawned?despawnJetski():spawnJetski();return;}
    if(nearJetski&&jetskiSpawned){mountJetski();return;}
  }
  if(k==="i")toggleInventory();
  if(k==="m"){const fp=document.getElementById("islandFishPanel");if(fp)fp.style.display=fp.style.display==="none"?"block":"none";}
  if(k==="1")equipRod("FishingRod");if(k==="2")equipRod("LuckRod");
  if(k==="3")equipRod("MediumRod");if(k==="4")equipRod("GoldenRod");
});
window.addEventListener("keyup",e=>{if(e.key===" ")tensionReeling=false;});

document.getElementById("slot1").addEventListener("click",()=>{
  const slot=document.getElementById("slot1");
  if(inventory.equipped){unequipRod();slot.classList.remove("active");slot.textContent="🎣";}
  else{const n=inventory._lastSelected||"FishingRod";equipRod(inventory.rods.includes(n)?n:"FishingRod");slot.classList.add("active");}
});
function updateHotbarSlot(){
  const slot=document.getElementById("slot1");if(!slot)return;
  const rd=rodDatabase[inventory.equipped];
  if(rd){slot.textContent=rd.icon;slot.title=rd.name;slot.classList.add("active");}
  else{slot.textContent="🎣";slot.title="Rod";slot.classList.remove("active");}
}
function unequipRod(){
  stopFishingAll();inventory.equipped=null;
  if(rod.parent)rod.parent.remove(rod);
  backHolder.add(rod);rod.position.set(0,0,0);rod.rotation.set(0,Math.PI,0.5);
  rod.material.color.setHex(0x8b5a2b);armR.rotation.set(0,0,0);armL.rotation.set(0,0,0);
}

// ═══ LOADING ═══
let loadProgress=0;
function simulateLoading(){
  if(loadProgress>=100){document.getElementById("loadingScreen").style.display="none";startGameDirect();return;}
  loadProgress+=Math.random()*5;if(loadProgress>100)loadProgress=100;
  document.getElementById("loadingBar").style.width=loadProgress+"%";
  document.getElementById("loadingText").textContent="Loading... "+Math.floor(loadProgress)+"%";
  setTimeout(simulateLoading,80);
}
function startGameDirect(){
  loadGameProgress();gameStarted=true;
  if(!inventory.equipped)equipRod("FishingRod");
  updateIslandFishPanel();
  showMessage("🎣 Selamat datang! [M] Fish Guide  [I] Inventory");
}
simulateLoading();

// ═══ MAIN LOOP ═══
let lastTime=0;
function animate(time){
  requestAnimationFrame(animate);if(gamePaused)return;
  const dt=Math.min((time-lastTime)/1000,.1);lastTime=time;
  if(gameStarted){
    if(onJetski)updateJetski();else movePlayer(dt);
    updateCastAnimation();updateFishingWait();updateFishingLine();
    updateTensionSystem(dt);animateNPCs(time);updateNPCInteraction();
    updateWeather(dt);updateWake(dt);updateBubbles(dt);
    updateMinimap();updateFloatingOrbs(time);updateMultiplayerFrame(dt);
  }
  updateCamera();animateWater(time);renderer.render(scene,camera);
}
window.addEventListener("load",()=>{
  const ss=localStorage.getItem("playerShirt");if(ss)setShirt(ss);updateLevelUI();
});
animate(0);

(async()=>{
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock("landscape");}catch(e){}
})();
window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
document.addEventListener("gesturestart",e=>e.preventDefault(),{passive:false});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});

// ═══ MULTIPLAYER ═══
function updateMultiplayerFrame(dt){if(window.MP&&typeof window.MP.update==="function")window.MP.update(dt);}

// ═══ WINDOW EXPOSE ═══
window.scene=scene;window.camera=camera;window.player=player;window.hook=hook;
window.rodDatabase=rodDatabase;window.inventory=inventory;
Object.defineProperty(window,"isFishing",{get:()=>isFishing,set:v=>{isFishing=v;}});
Object.defineProperty(window,"isSwimming",{get:()=>isSwimming,set:v=>{isSwimming=v;}});
Object.defineProperty(window,"onJetski",{get:()=>onJetski,set:v=>{onJetski=v;}});
Object.defineProperty(window,"freezeInput",{get:()=>freezeInput,set:v=>{freezeInput=v;}});
window.OWNER_NAME_FOR_SYNC="Varz444";
window.weatherTypes=weatherTypes;window.fishTypes=fishTypes;window.setWeather=setWeather;
window.gainXP=gainXP;window.checkLevelUp=checkLevelUp;window.updateLevelUI=updateLevelUI;
window.xpThresholds=xpThresholds;window.renderTab=renderTab;
Object.defineProperty(window,"coins",{get:()=>coins,set:v=>{coins=v;}});
Object.defineProperty(window,"playerXP",{get:()=>playerXP,set:v=>{playerXP=v;}});
Object.defineProperty(window,"playerLevel",{get:()=>playerLevel,set:v=>{playerLevel=v;}});
