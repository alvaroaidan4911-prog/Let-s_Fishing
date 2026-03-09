// ── Proximity Fish Gift System ──
var _proximityGiftCooldown = 0;
function checkProximityGift(dt) {
  if (_proximityGiftCooldown > 0) { _proximityGiftCooldown -= dt; return; }
  if (heldFishIndex < 0) {
    // Hapus tombol gift jika tidak memegang ikan
    var existing = document.getElementById("proximityGiftBtn");
    if (existing) existing.remove();
    return;
  }
  const fish = inventory.fish[heldFishIndex];
  if (!fish) return;
  const others = window.otherPlayers || {};
  let nearest = null, nearestDist = Infinity, nearestName = "";
  Object.entries(others).forEach(function([id, op]) {
    if (!op.meshes || !op.meshes.body) return;
    const dist = player.position.distanceTo(op.meshes.body.position);
    if (dist < 4.5 && dist < nearestDist) {
      nearestDist = dist;
      nearest = id;
      nearestName = (op.latestData && op.latestData.name) || "Player";
    }
  });
  var btn = document.getElementById("proximityGiftBtn");
  if (nearest) {
    if (!btn) {
      btn = document.createElement("div");
      btn.id = "proximityGiftBtn";
      Object.assign(btn.style, {
        position:"fixed", bottom:"80px", left:"50%",
        transform:"translateX(-50%)",
        background:"linear-gradient(135deg,#8e44ad,#6c3483)",
        border:"2px solid rgba(200,150,255,0.5)",
        color:"#fff", padding:"10px 20px", borderRadius:"14px",
        fontSize:"14px", fontWeight:"bold", zIndex:"200",
        cursor:"pointer", whiteSpace:"nowrap",
        boxShadow:"0 4px 16px rgba(142,68,173,0.5)",
        touchAction:"manipulation"
      });
      btn.addEventListener("click", function() {
        var tgt = btn._targetId, tname = btn._targetName;
        if (!tgt) return;
        var f = inventory.fish[heldFishIndex];
        if (!f) return;
        // Gift via MP if connected
        if (window.MP && window.MP.isActive() && window.ownerGiftFish) {
          window.ownerGiftFish(tgt, tname, f.name);
        } else {
          showMessage("⚠️ Harus online untuk gift ikan!");
          return;
        }
        // Remove from inventory
        inventory.fish.splice(heldFishIndex, 1);
        heldFishIndex = -1;
        heldFishGroup.visible = false;
        document.getElementById("heldFishHUD").style.display = "none";
        btn.remove();
        _proximityGiftCooldown = 2;
      });
      document.body.appendChild(btn);
    }
    btn._targetId = nearest;
    btn._targetName = nearestName;
    btn.textContent = "🎁 Gift " + fish.emoji + " " + fish.name + " ke " + nearestName;
    btn.style.display = "block";
  } else {
    if (btn) btn.style.display = "none";
  }
}

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
// Harbour positions: one per island (at sand edge)
const HARBOUR_DEFS=[
  {id:"main",    x:0,    z:85,   spawnX:0,    spawnZ:95,   label:"🚢 Pelabuhan Utama"},
  {id:"mystic",  x:700,  z:57,   spawnX:700,  spawnZ:68,   label:"🔮 Dermaga Mystic"},
  {id:"volcano", x:-800, z:-538, spawnX:-800, spawnZ:-528, label:"🌋 Dermaga Volcano"},
  {id:"crystal", x:300,  z:1054, spawnX:300,  spawnZ:1065, label:"💎 Dermaga Crystal"},
  {id:"aurora",  x:-400, z:1250, spawnX:-400, spawnZ:1260, label:"🌌 Dermaga Aurora"},
  {id:"abyss",   x:1200, z:652,  spawnX:1200, spawnZ:662,  label:"🌊 Dermaga Abyss"},
  {id:"sky",     x:0,    z:-1348,spawnX:0,    spawnZ:-1338,label:"⚡ Dermaga Sky"},
];
const HARBOUR_POS=new THREE.Vector3(0,0,163);
const jetskiSpawnPos=new THREE.Vector3(0,0.1,188);
let currentHarbourId="main";

// ═══ TENSION ═══
let tensionActive=false,tensionVal=50,zoneMin=42,zoneMax=58;
let tensionFishSpeed=0,tensionDir=1,tensionReeling=false;
let tensionProgress=0,tensionDifficulty=1,tensionTimeout=0,pendingFish=null,tensionGrace=0;

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
// ═══ FISH DATABASE — 15 IKAN PER PULAU, SEMUA RARITY ═══
const fishDB={
  main:[
    // Junk (1)
    {name:"Kaleng Berkarat", rarity:"Junk",     price:1,   xp:1,   color:"#888888",emoji:"🥫",diff:0.2,island:"Main Island"},
    // Common (4)
    {name:"Ikan Kecil",      rarity:"Common",   price:10,  xp:5,   color:"#b0c4de",emoji:"🐟",diff:0.4,island:"Main Island"},
    {name:"Ikan Bandeng",    rarity:"Common",   price:12,  xp:6,   color:"#c8d8e8",emoji:"🐡",diff:0.5,island:"Main Island"},
    {name:"Ikan Nila",       rarity:"Common",   price:14,  xp:7,   color:"#7ec8e3",emoji:"🐟",diff:0.5,island:"Main Island"},
    {name:"Ikan Mujair",     rarity:"Common",   price:11,  xp:5,   color:"#a8c8a8",emoji:"🐠",diff:0.4,island:"Main Island"},
    // Uncommon (4)
    {name:"Ikan Tuna",       rarity:"Uncommon", price:25,  xp:12,  color:"#5dade2",emoji:"🐠",diff:0.8,island:"Main Island"},
    {name:"Ikan Lele",       rarity:"Uncommon", price:20,  xp:10,  color:"#8B7355",emoji:"🐟",diff:0.7,island:"Main Island"},
    {name:"Ikan Gurame",     rarity:"Uncommon", price:30,  xp:14,  color:"#ffd700",emoji:"🐠",diff:0.9,island:"Main Island"},
    {name:"Ikan Bawal",      rarity:"Uncommon", price:28,  xp:13,  color:"#ccbbaa",emoji:"🐡",diff:0.8,island:"Main Island"},
    // Rare (3)
    {name:"Ikan Salmon",     rarity:"Rare",     price:60,  xp:25,  color:"#ff7f50",emoji:"🐡",diff:1.2,island:"Main Island"},
    {name:"Ikan Koi",        rarity:"Rare",     price:75,  xp:30,  color:"#FF6B35",emoji:"🐠",diff:1.3,island:"Main Island"},
    {name:"Ikan Mas",        rarity:"Rare",     price:80,  xp:32,  color:"#FFD700",emoji:"🐡",diff:1.1,island:"Main Island"},
    // Epic (2)
    {name:"Kerang Mutiara",  rarity:"Epic",     price:180, xp:70,  color:"#f0e6ff",emoji:"🦪",diff:1.7,island:"Main Island"},
    {name:"Ikan Arwana",     rarity:"Epic",     price:220, xp:85,  color:"#C0A020",emoji:"🐟",diff:1.8,island:"Main Island"},
    // Legendary (1)
    {name:"Raja Laut",       rarity:"Legendary",price:500, xp:200, color:"#ffd700",emoji:"👑",diff:2.5,island:"Main Island"},
  ],
  mystic:[
    // Junk (1)
    {name:"Tongkat Sihir",   rarity:"Junk",     price:2,   xp:1,   color:"#cc88ff",emoji:"🪄",diff:0.3,island:"Mystic Isle"},
    // Common (4)
    {name:"Ikan Cahaya",     rarity:"Common",   price:18,  xp:8,   color:"#aaffee",emoji:"✨",diff:0.6,island:"Mystic Isle"},
    {name:"Ikan Hantu",      rarity:"Common",   price:15,  xp:7,   color:"#dddddd",emoji:"👻",diff:0.5,island:"Mystic Isle"},
    {name:"Ikan Biru Langit",rarity:"Common",   price:17,  xp:8,   color:"#88aaff",emoji:"💫",diff:0.6,island:"Mystic Isle"},
    {name:"Ikan Kunang",     rarity:"Common",   price:16,  xp:7,   color:"#ffff88",emoji:"🌟",diff:0.5,island:"Mystic Isle"},
    // Uncommon (4)
    {name:"Moonfish",        rarity:"Uncommon", price:45,  xp:18,  color:"#c8aaff",emoji:"🌙",diff:0.9,island:"Mystic Isle"},
    {name:"Starfish",        rarity:"Uncommon", price:40,  xp:16,  color:"#ffaaff",emoji:"⭐",diff:0.9,island:"Mystic Isle"},
    {name:"Ikan Bayangan",   rarity:"Uncommon", price:42,  xp:17,  color:"#9988cc",emoji:"🌫️",diff:1.0,island:"Mystic Isle"},
    {name:"Ikan Ilusi",      rarity:"Uncommon", price:38,  xp:15,  color:"#ffccee",emoji:"🎭",diff:0.9,island:"Mystic Isle"},
    // Rare (3)
    {name:"Ikan Peri",       rarity:"Rare",     price:100, xp:40,  color:"#ff88cc",emoji:"🧚",diff:1.4,island:"Mystic Isle"},
    {name:"Rainbow Fish",    rarity:"Rare",     price:95,  xp:38,  color:"#ff69b4",emoji:"🌈",diff:1.3,island:"Mystic Isle"},
    {name:"Ikan Kristal Biru",rarity:"Rare",    price:110, xp:42,  color:"#44ddff",emoji:"💠",diff:1.4,island:"Mystic Isle"},
    // Epic (2)
    {name:"Aurora Fish",     rarity:"Epic",     price:220, xp:85,  color:"#00ffcc",emoji:"🌌",diff:1.9,island:"Mystic Isle"},
    {name:"Mystic Koi",      rarity:"Epic",     price:280, xp:100, color:"#8800ff",emoji:"🔮",diff:2.0,island:"Mystic Isle"},
    // Legendary (1)
    {name:"Spirit Fish",     rarity:"Legendary",price:900, xp:350, color:"#ffffff",emoji:"👁️",diff:3.0,island:"Mystic Isle"},
  ],
  volcano:[
    // Junk (1)
    {name:"Batu Gosong",     rarity:"Junk",     price:1,   xp:1,   color:"#555555",emoji:"🪨",diff:0.2,island:"Volcano Isle"},
    // Common (4)
    {name:"Ikan Bara",       rarity:"Common",   price:20,  xp:9,   color:"#ff6600",emoji:"🔥",diff:0.7,island:"Volcano Isle"},
    {name:"Ikan Abu",        rarity:"Common",   price:15,  xp:7,   color:"#999999",emoji:"💨",diff:0.6,island:"Volcano Isle"},
    {name:"Ikan Merah",      rarity:"Common",   price:18,  xp:8,   color:"#ff4444",emoji:"🐟",diff:0.7,island:"Volcano Isle"},
    {name:"Ikan Tembaga",    rarity:"Common",   price:22,  xp:9,   color:"#b87333",emoji:"🐠",diff:0.7,island:"Volcano Isle"},
    // Uncommon (4)
    {name:"Lavafish",        rarity:"Uncommon", price:50,  xp:20,  color:"#ff4400",emoji:"🌋",diff:1.0,island:"Volcano Isle"},
    {name:"Ikan Besi",       rarity:"Uncommon", price:35,  xp:15,  color:"#888888",emoji:"⚙️",diff:0.9,island:"Volcano Isle"},
    {name:"Ikan Belerang",   rarity:"Uncommon", price:45,  xp:18,  color:"#ccaa00",emoji:"☁️",diff:1.0,island:"Volcano Isle"},
    {name:"Ikan Kerak",      rarity:"Uncommon", price:40,  xp:16,  color:"#8B4513",emoji:"🏔️",diff:0.9,island:"Volcano Isle"},
    // Rare (3)
    {name:"Ikan Magma",      rarity:"Rare",     price:95,  xp:38,  color:"#ff2200",emoji:"💥",diff:1.5,island:"Volcano Isle"},
    {name:"Ikan Obsidian",   rarity:"Rare",     price:110, xp:42,  color:"#333333",emoji:"🖤",diff:1.6,island:"Volcano Isle"},
    {name:"Salamander Api",  rarity:"Rare",     price:105, xp:40,  color:"#ff6600",emoji:"🦎",diff:1.5,island:"Volcano Isle"},
    // Epic (2)
    {name:"Ikan Hiu",        rarity:"Epic",     price:150, xp:60,  color:"#708090",emoji:"🦈",diff:2.0,island:"Volcano Isle"},
    {name:"Phoenix Fish",    rarity:"Epic",     price:250, xp:95,  color:"#ff8800",emoji:"🦅",diff:2.1,island:"Volcano Isle"},
    // Legendary (1)
    {name:"Dragon Fish",     rarity:"Legendary",price:1200,xp:450, color:"#ff0000",emoji:"🐉",diff:3.5,island:"Volcano Isle"},
  ],
  crystal:[
    // Junk (1)
    {name:"Bongkahan Es",    rarity:"Junk",     price:1,   xp:1,   color:"#ddeeff",emoji:"🧊",diff:0.3,island:"Crystal Isle"},
    // Common (4)
    {name:"Ikan Salju",      rarity:"Common",   price:22,  xp:10,  color:"#e8f8ff",emoji:"❄️",diff:0.6,island:"Crystal Isle"},
    {name:"Ikan Putih",      rarity:"Common",   price:18,  xp:8,   color:"#f0f0f0",emoji:"🤍",diff:0.5,island:"Crystal Isle"},
    {name:"Ikan Beku",       rarity:"Common",   price:20,  xp:9,   color:"#cceeFF",emoji:"🐟",diff:0.6,island:"Crystal Isle"},
    {name:"Ikan Kabut",      rarity:"Common",   price:19,  xp:8,   color:"#ddddee",emoji:"🌨️",diff:0.5,island:"Crystal Isle"},
    // Uncommon (4)
    {name:"Ikan Es",         rarity:"Uncommon", price:55,  xp:22,  color:"#aaddff",emoji:"💧",diff:0.9,island:"Crystal Isle"},
    {name:"Ikan Pari",       rarity:"Uncommon", price:50,  xp:20,  color:"#9b59b6",emoji:"🦑",diff:0.9,island:"Crystal Isle"},
    {name:"Ikan Permafrost",  rarity:"Uncommon", price:52,  xp:21,  color:"#bbccff",emoji:"🌀",diff:1.0,island:"Crystal Isle"},
    {name:"Ikan Glasier",    rarity:"Uncommon", price:48,  xp:19,  color:"#99ddff",emoji:"🏔️",diff:0.9,island:"Crystal Isle"},
    // Rare (3)
    {name:"Ikan Kristal",    rarity:"Rare",     price:120, xp:45,  color:"#88ffff",emoji:"💠",diff:1.4,island:"Crystal Isle"},
    {name:"Ikan Berlian",    rarity:"Rare",     price:130, xp:50,  color:"#ccffff",emoji:"💎",diff:1.5,island:"Crystal Isle"},
    {name:"Ikan Safir",      rarity:"Rare",     price:125, xp:47,  color:"#0066ff",emoji:"🔷",diff:1.4,island:"Crystal Isle"},
    // Epic (2)
    {name:"Ikan Zamrud",     rarity:"Epic",     price:300, xp:110, color:"#00ff88",emoji:"🟢",diff:2.1,island:"Crystal Isle"},
    {name:"Ice Serpent",     rarity:"Epic",     price:320, xp:120, color:"#aaffff",emoji:"🐍",diff:2.2,island:"Crystal Isle"},
    // Legendary (1)
    {name:"Frost Dragon",    rarity:"Legendary",price:1500,xp:500, color:"#eeffff",emoji:"🐲",diff:4.0,island:"Crystal Isle"},
  ],
  aurora:[
    // Junk (1)
    {name:"Sampah Antariksa", rarity:"Junk",    price:2,   xp:1,   color:"#555577",emoji:"🛸",diff:0.3,island:"Aurora Isle"},
    // Common (4)
    {name:"Ikan Fajar",      rarity:"Common",   price:25,  xp:11,  color:"#ffcc88",emoji:"🌅",diff:0.7,island:"Aurora Isle"},
    {name:"Ikan Senja",      rarity:"Common",   price:28,  xp:12,  color:"#ff88aa",emoji:"🌇",diff:0.7,island:"Aurora Isle"},
    {name:"Ikan Bintang",    rarity:"Common",   price:26,  xp:11,  color:"#ffffaa",emoji:"⭐",diff:0.7,island:"Aurora Isle"},
    {name:"Ikan Langit",     rarity:"Common",   price:24,  xp:10,  color:"#aaccff",emoji:"🌠",diff:0.6,island:"Aurora Isle"},
    // Uncommon (4)
    {name:"Aurora Eel",      rarity:"Uncommon", price:70,  xp:28,  color:"#88ffaa",emoji:"🌌",diff:1.1,island:"Aurora Isle"},
    {name:"Ikan Nebula",     rarity:"Uncommon", price:65,  xp:26,  color:"#aa44ff",emoji:"💫",diff:1.0,island:"Aurora Isle"},
    {name:"Ikan Quasar",     rarity:"Uncommon", price:72,  xp:29,  color:"#ff44aa",emoji:"🌀",diff:1.1,island:"Aurora Isle"},
    {name:"Ikan Pulsar",     rarity:"Uncommon", price:68,  xp:27,  color:"#44ffff",emoji:"📡",diff:1.0,island:"Aurora Isle"},
    // Rare (3)
    {name:"Ikan Galaksi",    rarity:"Rare",     price:150, xp:58,  color:"#4400ff",emoji:"🔵",diff:1.7,island:"Aurora Isle"},
    {name:"Treasure Chest",  rarity:"Rare",     price:140, xp:55,  color:"#DAA520",emoji:"📦",diff:1.6,island:"Aurora Isle"},
    {name:"Ikan Meteor",     rarity:"Rare",     price:160, xp:60,  color:"#ff8844",emoji:"☄️",diff:1.7,island:"Aurora Isle"},
    // Epic (2)
    {name:"Ikan Komet",      rarity:"Epic",     price:380, xp:140, color:"#ffff00",emoji:"🌟",diff:2.2,island:"Aurora Isle"},
    {name:"Mythic Koi",      rarity:"Epic",     price:420, xp:155, color:"#ff00ff",emoji:"🔮",diff:2.3,island:"Aurora Isle"},
    // Legendary (1)
    {name:"Cosmic Whale",    rarity:"Legendary",price:3000,xp:1000,color:"#0044ff",emoji:"🐋",diff:5.0,island:"Aurora Isle"},
  ],
  abyss:[
    {name:"Remah Kerang",     rarity:"Junk",     price:1,   xp:1,   color:"#223344",emoji:"🪸", diff:0.3,island:"Abyss Isle"},
    {name:"Ikan Jurang",      rarity:"Common",   price:32,  xp:14,  color:"#001133",emoji:"🐟", diff:0.8,island:"Abyss Isle"},
    {name:"Ikan Gelap",       rarity:"Common",   price:30,  xp:13,  color:"#112244",emoji:"🐠", diff:0.7,island:"Abyss Isle"},
    {name:"Ikan Abyssal",     rarity:"Common",   price:35,  xp:15,  color:"#003366",emoji:"🐡", diff:0.8,island:"Abyss Isle"},
    {name:"Ikan Malam",       rarity:"Common",   price:28,  xp:12,  color:"#221133",emoji:"🌑", diff:0.7,island:"Abyss Isle"},
    {name:"Ikan Cumi Raksasa",rarity:"Uncommon", price:80,  xp:32,  color:"#440088",emoji:"🦑", diff:1.2,island:"Abyss Isle"},
    {name:"Ikan Angler",      rarity:"Uncommon", price:90,  xp:36,  color:"#001155",emoji:"🐟", diff:1.2,island:"Abyss Isle"},
    {name:"Ikan Vantablack",  rarity:"Uncommon", price:85,  xp:34,  color:"#000011",emoji:"⚫", diff:1.3,island:"Abyss Isle"},
    {name:"Ikan Phantom",     rarity:"Uncommon", price:88,  xp:35,  color:"#220044",emoji:"👁️",diff:1.2,island:"Abyss Isle"},
    {name:"Ikan Void",        rarity:"Rare",     price:200, xp:75,  color:"#110022",emoji:"🌀", diff:1.9,island:"Abyss Isle"},
    {name:"Ikan Abyss",       rarity:"Rare",     price:220, xp:80,  color:"#0000aa",emoji:"💜", diff:2.0,island:"Abyss Isle"},
    {name:"Leviathan Jr",     rarity:"Rare",     price:240, xp:85,  color:"#003399",emoji:"🦕", diff:2.0,island:"Abyss Isle"},
    {name:"Ikan Shadow",      rarity:"Epic",     price:500, xp:180, color:"#110033",emoji:"👤", diff:2.6,island:"Abyss Isle"},
    {name:"Kraken Jr",        rarity:"Epic",     price:550, xp:200, color:"#440066",emoji:"🐙", diff:2.7,island:"Abyss Isle"},
    {name:"Leviathan",        rarity:"Legendary",price:5000,xp:1500,color:"#000066",emoji:"🌊", diff:6.0,island:"Abyss Isle"},
  ],
  sky:[
    {name:"Bulu Awan",        rarity:"Junk",     price:1,   xp:1,   color:"#eeeeff",emoji:"☁️", diff:0.2,island:"Sky Isle"},
    {name:"Ikan Awan",        rarity:"Common",   price:38,  xp:16,  color:"#ddeeff",emoji:"🌤️",diff:0.8,island:"Sky Isle"},
    {name:"Ikan Angin",       rarity:"Common",   price:35,  xp:15,  color:"#aaccff",emoji:"💨", diff:0.7,island:"Sky Isle"},
    {name:"Ikan Langit Biru", rarity:"Common",   price:40,  xp:17,  color:"#88bbff",emoji:"🔵", diff:0.8,island:"Sky Isle"},
    {name:"Ikan Petir",       rarity:"Common",   price:36,  xp:15,  color:"#ffff44",emoji:"⚡", diff:0.8,island:"Sky Isle"},
    {name:"Ikan Cirrus",      rarity:"Uncommon", price:100, xp:40,  color:"#ccddff",emoji:"🌥️",diff:1.3,island:"Sky Isle"},
    {name:"Ikan Stratosfer",  rarity:"Uncommon", price:110, xp:44,  color:"#aabbee",emoji:"🌈", diff:1.3,island:"Sky Isle"},
    {name:"Ikan Nimbus",      rarity:"Uncommon", price:105, xp:42,  color:"#8899cc",emoji:"🌩️",diff:1.4,island:"Sky Isle"},
    {name:"Ikan Zephyr",      rarity:"Uncommon", price:108, xp:43,  color:"#99aadd",emoji:"🌬️",diff:1.3,island:"Sky Isle"},
    {name:"Ikan Tornado",     rarity:"Rare",     price:280, xp:100, color:"#778899",emoji:"🌪️",diff:2.1,island:"Sky Isle"},
    {name:"Ikan Ionosfer",    rarity:"Rare",     price:300, xp:110, color:"#5566aa",emoji:"🔹", diff:2.2,island:"Sky Isle"},
    {name:"Storm Rider",      rarity:"Rare",     price:320, xp:115, color:"#334488",emoji:"⛈️", diff:2.2,island:"Sky Isle"},
    {name:"Ikan Celestial",   rarity:"Epic",     price:700, xp:250, color:"#bbccff",emoji:"✨", diff:2.8,island:"Sky Isle"},
    {name:"Phoenix Koi",      rarity:"Epic",     price:750, xp:270, color:"#ff8833",emoji:"🦅", diff:2.9,island:"Sky Isle"},
    {name:"Sky God",          rarity:"Legendary",price:8000,xp:2500,color:"#ffffff",emoji:"⚡", diff:7.0,island:"Sky Isle"},
  ],
};
const fishTypes=Object.values(fishDB).flat();

// ═══ FISH INDEX SYSTEM ═══
let unlockedFish=new Set(JSON.parse(localStorage.getItem("unlockedFish_v5")||"[]"));
let fishIndexOpen=false;
let fishIndexTab="main";

function unlockFishEntry(fishName){
  if(!unlockedFish.has(fishName)){
    unlockedFish.add(fishName);
    try{localStorage.setItem("unlockedFish_v5",JSON.stringify([...unlockedFish]));}catch(e){}
  }
}

// Build Fish Index UI
(function buildFishIndex(){
  // Button
  const btn=document.createElement("button");
  btn.id="fishIndexBtn";
  btn.textContent="📖";
  btn.title="Fish Index";
  Object.assign(btn.style,{
    position:"fixed",top:"8px",left:"calc(50% + 125px)",transition:"all 0.3s",
    width:"40px",height:"40px",borderRadius:"50%",
    background:"linear-gradient(135deg,#1a6fa8,#0d4f7a)",
    border:"2px solid rgba(100,200,255,0.5)",
    color:"#fff",fontSize:"18px",cursor:"pointer",
    zIndex:"25",boxShadow:"0 4px 12px rgba(0,0,0,0.4)",
    transition:"transform 0.1s"
  });
  btn.onmouseenter=()=>btn.style.transform="scale(1.1)";
  btn.onmouseleave=()=>btn.style.transform="scale(1)";
  btn.onclick=toggleFishIndex;
  document.body.appendChild(btn);

  // Panel
  const panel=document.createElement("div");
  panel.id="fishIndexPanel";
  Object.assign(panel.style,{
    position:"fixed",top:"50%",left:"50%",
    transform:"translate(-50%,-50%)",
    width:"min(680px,96vw)",height:"min(520px,88vh)",
    background:"linear-gradient(160deg,#0a1a2e,#0d2540)",
    border:"2px solid rgba(100,200,255,0.35)",
    borderRadius:"18px",zIndex:"999",
    display:"none",flexDirection:"column",
    overflow:"hidden",
    boxShadow:"0 8px 40px rgba(0,0,0,0.7)",
    fontFamily:"Arial, sans-serif"
  });

  // Header
  panel.innerHTML=`
  <div style="padding:14px 18px 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
    <div>
      <div style="color:#fff;font-size:18px;font-weight:bold">📖 Fish Index</div>
      <div id="fishIndexProgress" style="color:#7ecfff;font-size:11px;margin-top:2px"></div>
    </div>
    <button onclick="toggleFishIndex()" style="background:none;border:none;color:#aaa;font-size:22px;cursor:pointer;padding:4px 8px">✕</button>
  </div>

  <div id="fishIndexTabs" style="display:flex;gap:6px;padding:10px 18px 0;flex-shrink:0;overflow-x:auto"></div>

  <div id="fishIndexContent" style="flex:1;overflow-y:auto;padding:12px 18px 18px;
    scrollbar-width:thin;scrollbar-color:#1a6fa8 #0a1a2e"></div>
  `;
  document.body.appendChild(panel);
})();

function toggleFishIndex(){
  fishIndexOpen=!fishIndexOpen;
  const panel=document.getElementById("fishIndexPanel");
  panel.style.display=fishIndexOpen?"flex":"none";
  if(fishIndexOpen){freezeInput=true;renderFishIndex(fishIndexTab);}
  else freezeInput=false;
}

function renderFishIndexTabs(){
  const tabs=document.getElementById("fishIndexTabs");if(!tabs)return;
  const islandInfo=[
    {key:"main",   label:"🏝️ Main",    color:"#27ae60"},
    {key:"mystic", label:"🔮 Mystic",  color:"#9b59b6"},
    {key:"volcano",label:"🌋 Volcano", color:"#e74c3c"},
    {key:"crystal",label:"💎 Crystal", color:"#00bcd4"},
    {key:"aurora", label:"🌌 Aurora",  color:"#4455bb"},
    {key:"abyss",  label:"🌊 Abyss",   color:"#0055cc"},
    {key:"sky",    label:"⚡ Sky",      color:"#aaccff"},
    {key:"all",    label:"📋 All",     color:"#f39c12"},
  ];
  tabs.innerHTML=islandInfo.map(t=>{
    const pool=t.key==="all"?fishTypes:(fishDB[t.key]||[]);
    const unlocked=pool.filter(f=>unlockedFish.has(f.name)).length;
    const active=fishIndexTab===t.key;
    return `<button onclick="renderFishIndex('${t.key}')" style="
      padding:6px 14px;border-radius:20px;border:2px solid ${t.color};
      background:${active?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)"};
      color:${active?"#fff":"#aaa"};font-size:11px;cursor:pointer;white-space:nowrap;
      font-weight:${active?"bold":"normal"};transition:all 0.15s">
      ${t.label} <span style="color:${t.color};font-size:10px">(${unlocked}/${pool.length})</span>
    </button>`;
  }).join("");
}

function renderFishIndex(tabKey){
  fishIndexTab=tabKey;
  renderFishIndexTabs();
  const content=document.getElementById("fishIndexContent");if(!content)return;

  const rarityOrder=["Junk","Common","Uncommon","Rare","Epic","Legendary"];
  const rarityColors={Junk:"#888888",Common:"#cccccc",Uncommon:"#2ecc71",Rare:"#3498db",Epic:"#9b59b6",Legendary:"#f39c12"};
  const rarityBg={Junk:"rgba(80,80,80,0.3)",Common:"rgba(100,100,100,0.25)",Uncommon:"rgba(46,204,113,0.15)",Rare:"rgba(52,152,219,0.18)",Epic:"rgba(155,89,182,0.2)",Legendary:"rgba(243,156,18,0.22)"};
  const rarityGlow={Junk:"none",Common:"none",Uncommon:"none",Rare:"none",Epic:"0 0 8px rgba(155,89,182,0.4)",Legendary:"0 0 14px rgba(243,156,18,0.6)"};

  const islandInfo={
    main:{label:"🏝️ Main Island",color:"#27ae60"},
    mystic:{label:"🔮 Mystic Isle",color:"#9b59b6"},
    volcano:{label:"🌋 Volcano Isle",color:"#e74c3c"},
    crystal:{label:"💎 Crystal Isle",color:"#00bcd4"},
    aurora:{label:"🌌 Aurora Isle",color:"#4455bb"},
    abyss:{label:"🌊 Abyss Isle",color:"#0055cc"},
    sky:{label:"⚡ Sky Isle",color:"#aaccff"},
  };

  // Total progress
  const allFish=fishTypes;
  const totalUnlocked=allFish.filter(f=>unlockedFish.has(f.name)).length;
  const prog=document.getElementById("fishIndexProgress");
  if(prog)prog.textContent=`${totalUnlocked} / ${allFish.length} ditemukan (${Math.round(totalUnlocked/allFish.length*100)}%)`;

  // Get fish to display
  let islandsToShow=[];
  if(tabKey==="all"){
    islandsToShow=Object.keys(fishDB);
  } else {
    islandsToShow=[tabKey];
  }

  let html="";

  islandsToShow.forEach(islKey=>{
    const pool=fishDB[islKey]||[];
    const info=islandInfo[islKey]||{label:islKey,color:"#fff"};
    const islUnlocked=pool.filter(f=>unlockedFish.has(f.name)).length;

    if(tabKey==="all"){
      html+=`<div style="margin-bottom:6px;padding:6px 10px;background:rgba(0,0,0,0.3);border-radius:8px;display:flex;align-items:center;justify-content:space-between">
        <span style="color:${info.color};font-weight:bold;font-size:13px">${info.label}</span>
        <span style="color:#aaa;font-size:11px">${islUnlocked}/${pool.length} ikan</span>
      </div>`;
    }

    // Group by rarity
    rarityOrder.forEach(rarity=>{
      const group=pool.filter(f=>f.rarity===rarity);
      if(group.length===0)return;
      const groupUnlocked=group.filter(f=>unlockedFish.has(f.name)).length;

      html+=`<div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="height:1px;flex:1;background:${rarityColors[rarity]};opacity:0.3"></div>
          <span style="color:${rarityColors[rarity]};font-size:11px;font-weight:bold;white-space:nowrap">${rarity.toUpperCase()} (${groupUnlocked}/${group.length})</span>
          <div style="height:1px;flex:1;background:${rarityColors[rarity]};opacity:0.3"></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:6px">`;

      group.forEach(f=>{
        const found=unlockedFish.has(f.name);
        html+=`<div style="
          background:${found?rarityBg[rarity]:"rgba(20,20,30,0.6)"};
          border:1px solid ${found?rarityColors[rarity]+"55":"rgba(255,255,255,0.06)"};
          border-radius:10px;padding:8px 10px;
          box-shadow:${found?rarityGlow[rarity]:"none"};
          transition:all 0.2s;position:relative;
          opacity:${found?1:0.55}">
          <div style="font-size:22px;margin-bottom:3px">${found?f.emoji:"❓"}</div>
          <div style="color:${found?"#fff":"#666"};font-size:11px;font-weight:bold;margin-bottom:2px">${found?f.name:"???"}</div>
          ${found?`
            <div style="color:${rarityColors[rarity]};font-size:9px;margin-bottom:2px">${f.rarity}</div>
            <div style="color:#f1c40f;font-size:10px">💰 ${f.price}</div>
            <div style="color:#88ccff;font-size:9px">⚡ ${f.xp} XP</div>
          `:
          `<div style="color:#555;font-size:9px">Belum ditemukan</div>`}
          ${rarity==="Legendary"&&found?`<div style="position:absolute;top:4px;right:4px;font-size:10px">✨</div>`:""}
        </div>`;
      });

      html+=`</div></div>`;
    });

    if(tabKey==="all")html+=`<div style="height:1px;background:rgba(255,255,255,0.06);margin:8px 0 16px"></div>`;
  });

  content.innerHTML=html;
}


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
  // controlWidth: lebar zona hijau saat mancing (lebih besar = lebih mudah)
  // 16=sulit, 20=normal, 26=mudah, 32=sangat mudah
  FishingRod:{name:"Wood Rod",  icon:"🪵",price:0,    luckMult:1,  speedMult:1,  controlWidth:16, color:0x8b5a2b,desc:"Starter rod. Zona sempit."},
  LuckRod:   {name:"Luck Rod",  icon:"🍀",price:150,  luckMult:2.5,speedMult:1,  controlWidth:20, color:0xaaaaaa,desc:"Ikan langka lebih sering."},
  MediumRod: {name:"Medium Rod",icon:"⚡",price:500,  luckMult:3,  speedMult:2,  controlWidth:25, color:0xffd700,desc:"Lebih cepat & beruntung."},
  GoldenRod: {name:"Golden Rod",icon:"✨",price:2000, luckMult:5,  speedMult:2,  controlWidth:30, color:0xFFD700,desc:"Zona besar, max luck."},
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
scene.fog=new THREE.FogExp2(0x87ceeb,0.002);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,3000);
const renderer=new THREE.WebGLRenderer({antialias:window.devicePixelRatio<=1,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap; // PCFSoft→PCF: lebih cepat
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5)); // max 1.5x (dari 2x)
document.body.appendChild(renderer.domElement);

// ═══ PERFORMANCE / AUTO QUALITY SYSTEM ═══
let perfQuality="high"; // "high"|"medium"|"low"
let perfFpsSamples=[],perfLastCheck=0,perfCheckInterval=4; // check every 4s
let perfFrameCount=0,perfFrameTime=0;

const PERF_THRESHOLDS={high:{minFps:50},medium:{minFps:28},low:{minFps:0}};

function applyQuality(q){
  if(perfQuality===q)return;
  perfQuality=q;
  const labels={high:"🟢 High",medium:"🟡 Medium",low:"🔴 Low"};
  showMessage("⚙️ Kualitas grafik: "+labels[q]);
  if(q==="low"){
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled=false;
    scene.fog.density=0.003;
    starMesh&&(starMesh.visible=false);
  } else if(q==="medium"){
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.shadowMap.enabled=true;
    scene.fog.density=0.002;
    starMesh&&(starMesh.visible=true);
    starMesh&&(starMesh.material.size=1.0);
  } else {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled=true;
    scene.fog.density=0.002;
    starMesh&&(starMesh.visible=true);
    starMesh&&(starMesh.material.size=1.2);
  }
}

function updatePerformance(dt,time){
  perfFrameCount++;
  perfFrameTime+=dt;
  if(perfFrameTime<perfCheckInterval)return;
  const fps=perfFrameCount/perfFrameTime;
  perfFrameCount=0;perfFrameTime=0;
  perfFpsSamples.push(fps);
  if(perfFpsSamples.length>3)perfFpsSamples.shift();
  const avgFps=perfFpsSamples.reduce((a,b)=>a+b,0)/perfFpsSamples.length;
  // Auto degrade
  if(avgFps<35&&perfQuality!=="low")applyQuality("low");
  else if(avgFps>=35&&avgFps<55&&perfQuality==="high")applyQuality("medium");
  else if(avgFps>=55&&perfQuality!=="high")applyQuality("high");
  // Update FPS counter UI
  const el=document.getElementById("fpsCounter");
  if(el)el.textContent="FPS: "+Math.round(avgFps)+" ["+perfQuality+"]";
}

// FPS counter UI (small, bottom-left)
(function(){
  const el=document.createElement("div");
  el.id="fpsCounter";
  Object.assign(el.style,{
    position:"fixed",left:"12px",bottom:"8px",
    color:"rgba(255,255,255,0.4)",fontSize:"10px",
    fontFamily:"monospace",zIndex:"15",pointerEvents:"none"
  });
  document.body.appendChild(el);
})();
const sun=new THREE.DirectionalLight(0xffffff,1.2);
sun.position.set(80,120,60);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-400;sun.shadow.camera.right=400;
sun.shadow.camera.top=400;sun.shadow.camera.bottom=-400;
sun.shadow.camera.far=2000;sun.shadow.bias=-0.0005;
scene.add(sun);
const ambient=new THREE.AmbientLight(0xffd0a0,0.45);scene.add(ambient);

// ═══ DAY/NIGHT SYSTEM ═══
// Full cycle = 24 real minutes (1440 real seconds)
// 0.0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk, 1.0=midnight
let dayTime=0.5; // start at noon
const DAY_CYCLE_SECONDS=1440; // 24 min real time
let isNight=false;

const moonLight=new THREE.DirectionalLight(0x334466,0.0);
moonLight.position.set(-10,20,-5);scene.add(moonLight);

// Stars mesh (only visible at night)
const starGeo=new THREE.BufferGeometry();
const starVerts=[];
for(let i=0;i<2500;i++){
  const theta=Math.random()*Math.PI*2;
  const phi=Math.acos(2*Math.random()-1);
  const r=900+Math.random()*200;
  starVerts.push(Math.sin(phi)*Math.cos(theta)*r,Math.cos(phi)*r,Math.sin(phi)*Math.sin(theta)*r);
}
starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starVerts,3));
const starMesh=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:1.2,sizeAttenuation:true,transparent:true,opacity:0}));
scene.add(starMesh);

// Moon sphere
const moonMesh=new THREE.Mesh(
  new THREE.SphereGeometry(18,16,16),
  new THREE.MeshStandardMaterial({color:0xddddcc,emissive:0xbbbbaa,emissiveIntensity:0.6})
);
moonMesh.visible=false;scene.add(moonMesh);

// Sun sphere (visual)
const sunMesh=new THREE.Mesh(
  new THREE.SphereGeometry(22,16,16),
  new THREE.MeshStandardMaterial({color:0xffee88,emissive:0xffcc44,emissiveIntensity:1.2})
);
scene.add(sunMesh);

// Day/Night clock UI
const dnUI=document.createElement("div");dnUI.id="dayNightUI";
Object.assign(dnUI.style,{
  position:"fixed",top:"8px",left:"50%",transform:"translateX(-50%)",transition:"all 0.3s",
  background:"rgba(0,0,0,0.65)",border:"1px solid rgba(255,255,255,0.15)",
  borderRadius:"20px",padding:"4px 16px",color:"#fff",fontSize:"13px",
  zIndex:"25",display:"flex",alignItems:"center",gap:"8px",
  backdropFilter:"blur(6px)",pointerEvents:"none"
});
dnUI.innerHTML='<span id="dnIcon">☀️</span><span id="dnTime">12:00</span><div style="width:90px;height:6px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden"><div id="dnBar" style="height:100%;background:linear-gradient(90deg,#ffd700,#ff8800);border-radius:3px;width:50%"></div></div>';
document.body.appendChild(dnUI);

function updateDayNight(dt){
  dayTime=(dayTime+dt/DAY_CYCLE_SECONDS)%1;
  const t=dayTime;
  // Sun angle: 0=midnight bottom, 0.5=noon top
  const sunAngle=(t-0.25)*Math.PI*2;
  const sunR=800;
  sun.position.set(Math.cos(sunAngle)*sunR,Math.sin(sunAngle)*sunR,200);
  sunMesh.position.copy(sun.position).multiplyScalar(0.9);
  moonMesh.position.set(-sun.position.x*0.9,-sun.position.y*0.9,sun.position.z);

  // Sky & lighting interpolation
  let skyC,fogC,sunInt,ambInt,moonInt,starOp;
  if(t<0.2){
    // Night → dawn (0.0–0.2)
    const p=t/0.2;
    skyC=new THREE.Color(0x050510).lerp(new THREE.Color(0xff6633),p*p);
    fogC=new THREE.Color(0x020208).lerp(new THREE.Color(0xcc4422),p*p);
    sunInt=p*0.6;ambInt=0.05+p*0.3;moonInt=1-p;starOp=1-p;
  } else if(t<0.3){
    // Dawn (0.2–0.3)
    const p=(t-0.2)/0.1;
    skyC=new THREE.Color(0xff6633).lerp(new THREE.Color(0x87ceeb),p);
    fogC=new THREE.Color(0xcc4422).lerp(new THREE.Color(0x87ceeb),p);
    sunInt=0.6+p*0.6;ambInt=0.35+p*0.2;moonInt=0;starOp=0;
  } else if(t<0.7){
    // Day (0.3–0.7)
    const p=(t-0.3)/0.4;
    const noon=(p<0.5?p:1-p)*2;
    skyC=new THREE.Color(0x87ceeb).lerp(new THREE.Color(0x4db3ff),noon*0.3);
    fogC=skyC.clone();
    sunInt=1.2+noon*0.4;ambInt=0.55+noon*0.1;moonInt=0;starOp=0;
  } else if(t<0.8){
    // Dusk (0.7–0.8)
    const p=(t-0.7)/0.1;
    skyC=new THREE.Color(0x87ceeb).lerp(new THREE.Color(0xff4400),p);
    fogC=new THREE.Color(0x87ceeb).lerp(new THREE.Color(0xcc3300),p);
    sunInt=1.2-p*0.9;ambInt=0.55-p*0.45;moonInt=p*0.4;starOp=p*0.5;
  } else {
    // Night (0.8–1.0)
    const p=(t-0.8)/0.2;
    skyC=new THREE.Color(0xff4400).lerp(new THREE.Color(0x050510),p);
    fogC=new THREE.Color(0xcc3300).lerp(new THREE.Color(0x020208),p);
    sunInt=0.3-p*0.3;ambInt=0.1-p*0.05;moonInt=0.4+p*0.6;starOp=0.5+p*0.5;
  }

  // Apply to scene
  if(!currentWeather||currentWeather.name==="Sunny"||currentWeather.name==="Windy"){
    scene.background=skyC;scene.fog.color=fogC;
  }
  sun.intensity=sunInt*(currentWeather.name==="Storming"?0.35:1);
  ambient.intensity=Math.max(0.05,ambInt);
  moonLight.intensity=moonInt;
  starMesh.material.opacity=starOp;

  // Sun/moon visibility
  sunMesh.visible=sunInt>0.05;
  moonMesh.visible=moonInt>0.05;

  // Night lamps
  const newIsNight=t>0.75||t<0.25;
  if(newIsNight!==isNight){
    isNight=newIsNight;
    islandLamps.forEach(l=>{
      l.bulb.material.emissiveIntensity=isNight?3.5:0;
      l.bulb.material.opacity=isNight?1:0.9;
    });
  }

  // Clock UI
  const hours=Math.floor(t*24);
  const mins=Math.floor((t*24-hours)*60);
  const icon=t>0.25&&t<0.75?"☀️":t>0.2&&t<0.8?"🌅":"🌙";
  const dnIcon=document.getElementById("dnIcon");
  const dnTime=document.getElementById("dnTime");
  const dnBar=document.getElementById("dnBar");
  if(dnIcon)dnIcon.textContent=icon;
  if(dnTime)dnTime.textContent=String(hours).padStart(2,"0")+":"+String(mins).padStart(2,"0");
  if(dnBar){
    const dayPct=t>0.25&&t<0.75?((t-0.25)/0.5)*100:0;
    dnBar.style.width=dayPct+"%";
    dnBar.style.background=t>0.25&&t<0.75?"linear-gradient(90deg,#ffd700,#ff8800)":"linear-gradient(90deg,#334466,#668899)";
  }
}

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
  new THREE.PlaneGeometry(4000,4000,40,40),
  new THREE.MeshStandardMaterial({map:waterTex,transparent:true,opacity:0.82,roughness:0.06,metalness:0.5,color:0xaaccee})
);
water.rotation.x=-Math.PI/2;water.position.y=-1;scene.add(water);

// ═══ ISLAND DEFS ═══
const islandDefs=[
  {id:"main",   x:0,    z:0,    sandR:90,  grassR:78,  label:"🏝️ Main Island",  fishKey:"main"},
  {id:"mystic", x:700,  z:0,    sandR:65,  grassR:55,  label:"🔮 Mystic Isle",   fishKey:"mystic"},
  {id:"volcano",x:-800, z:-600, sandR:70,  grassR:60,  label:"🌋 Volcano Isle",  fishKey:"volcano"},
  {id:"crystal",x:300,  z:1000, sandR:62,  grassR:52,  label:"💎 Crystal Isle",  fishKey:"crystal"},
  {id:"aurora", x:-400, z:1200, sandR:58,  grassR:48,  label:"🌌 Aurora Isle",   fishKey:"aurora"},
  {id:"abyss",  x:1200, z:600,  sandR:68,  grassR:58,  label:"🌊 Abyss Isle",    fishKey:"abyss"},
  {id:"sky",    x:0,    z:-1400,sandR:60,  grassR:50,  label:"⚡ Sky Isle",      fishKey:"sky"},
];

// ═══ FLOATING ORBS ═══
const floatingOrbs=[];

// ═══ ISLAND BUILDER — ENHANCED ═══
const islandLamps=[];  // for day/night toggling

function addTree(g,tx,tz,h,trunkColor,leafColor){
  const trunk=new THREE.Mesh(
    new THREE.CylinderGeometry(0.28,0.52,h,8),
    new THREE.MeshStandardMaterial({color:trunkColor||0x8B6914})
  );
  trunk.position.set(tx,h/2,tz);
  g.add(trunk);
  const l1=new THREE.Mesh(
    new THREE.ConeGeometry(3.2+Math.random()*1.8,3.2,8),
    new THREE.MeshStandardMaterial({color:leafColor||0x1a7a1a})
  );
  l1.position.set(tx,h+1.8,tz);g.add(l1);
  const l2=new THREE.Mesh(
    new THREE.ConeGeometry(2+Math.random()*0.8,2.2,8),
    new THREE.MeshStandardMaterial({color:leafColor||0x1a7a1a})
  );
  l2.position.set(tx,h+4,tz);g.add(l2);
}

function addFlower(g,tx,tz,color){
  const stem=new THREE.Mesh(
    new THREE.CylinderGeometry(0.06,0.06,0.7,6),
    new THREE.MeshStandardMaterial({color:0x228b22})
  );
  stem.position.set(tx,0.35,tz);g.add(stem);
  const petal=new THREE.Mesh(
    new THREE.SphereGeometry(0.22,8,8),
    new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.08})
  );
  petal.scale.y=0.5;petal.position.set(tx,0.8,tz);g.add(petal);
}

function addBench(g,tx,tz,ry){
  const seat=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.18,0.9),new THREE.MeshStandardMaterial({color:0x8B6914}));
  seat.position.set(tx,0.65,tz);seat.rotation.y=ry;g.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.7,0.12),new THREE.MeshStandardMaterial({color:0x8B6914}));
  back.position.set(tx,1.0,tz);back.rotation.y=ry;
  back.position.x+=Math.sin(ry)*0.4;back.position.z+=Math.cos(ry)*0.4;g.add(back);
  [-0.9,0.9].forEach(dx=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.65,0.9),new THREE.MeshStandardMaterial({color:0x5C4A1E}));
    leg.position.set(tx+Math.cos(ry)*dx,0.33,tz-Math.sin(ry)*dx);leg.rotation.y=ry;g.add(leg);
  });
}

function addLamp(g,tx,tz,wx,wz,lampColor){
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,3.5,8),new THREE.MeshStandardMaterial({color:0x555555}));
  pole.position.set(tx,1.75,tz);g.add(pole);
  const head=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.22,0.55,8),new THREE.MeshStandardMaterial({color:0x444444}));
  head.position.set(tx,3.65,tz);g.add(head);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,8),new THREE.MeshStandardMaterial({
    color:lampColor||0xffeeaa, emissive:lampColor||0xffcc44, emissiveIntensity:0,
    transparent:true,opacity:0.9
  }));
  bulb.position.set(tx,3.55,tz);g.add(bulb);
  // Register for day/night
  islandLamps.push({bulb, wx:wx+tx, wz:wz+tz, color:lampColor||0xffcc44});
}

function addPathStone(g,tx,tz){
  const s=new THREE.Mesh(
    new THREE.CylinderGeometry(0.4+Math.random()*0.25,0.45,0.12,7),
    new THREE.MeshStandardMaterial({color:0xaaaaaa,roughness:0.9})
  );
  s.position.set(tx,0.06,tz);s.rotation.y=Math.random()*Math.PI;g.add(s);
}

function buildIsland(def,options){
  const {x,z,sandR,grassR,label}=def;
  const opt=options||{};
  const g=new THREE.Group();
  // Island sits so grass surface = world Y=0
  g.position.set(x,-2.5,z);
  scene.add(g);

  // Sand base — thick cylinder
  g.add(new THREE.Mesh(
    new THREE.CylinderGeometry(sandR,sandR+8,5,64),
    new THREE.MeshStandardMaterial({map:sandTex,roughness:1})
  ));
  // Grass flat layer (Y=2.5 relative = Y=0 world)
  // Grass: use texture for main island, tint for others
  const grassMat = opt.useGrassTex
    ? new THREE.MeshStandardMaterial({map:grassTex,color:opt.grassColor||0xffffff,roughness:0.95})
    : new THREE.MeshStandardMaterial({color:opt.grassColor||0x2d9e2d,roughness:0.9});
  const gr=new THREE.Mesh(new THREE.CylinderGeometry(grassR,grassR+5,0.55,48),grassMat);
  gr.position.y=2.5;g.add(gr);

  // Shoreline fringe — darker sand ring between grass and water edge
  const shore=new THREE.Mesh(
    new THREE.CylinderGeometry(grassR+5,sandR+4,0.3,48),
    new THREE.MeshStandardMaterial({color:0xdec97a,roughness:1})
  );
  shore.position.y=2.2;g.add(shore);

// Trees — only on outer half so center stays clear; avoid building exclusion zones
const treeCount=opt.trees||8;
const buildingExclusions=opt.buildingExclusions||[];
for(let i=0;i<treeCount;i++){
  let tx,tz,attempts=0;
  do{
    const angle=(i/treeCount)*Math.PI*2+(Math.random()-0.5)*0.5+Math.random()*0.3;
    const dist=grassR*0.38+Math.random()*grassR*0.52;
    tx=Math.cos(angle)*dist; tz=Math.sin(angle)*dist; attempts++;
    let blocked=false;
    for(const ex of buildingExclusions){
      if(Math.abs(tx-ex.cx)<ex.hw+2&&Math.abs(tz-ex.cz)<ex.hd+2){blocked=true;break;}
    }
    if(!blocked)break;
  }while(attempts<20);
  const h=4.5+Math.random()*4.5;
  addTree(g,tx,tz,h,opt.trunkColor,opt.leafColor);
}

  // Rocks scattered
  const rockCount=opt.rocks||5;
  for(let i=0;i<rockCount;i++){
    const a=Math.random()*Math.PI*2;
    const d=grassR*0.15+Math.random()*grassR*0.58;
    const rock=new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55+Math.random()*1.2,0),
      new THREE.MeshStandardMaterial({color:opt.rockColor||0x888888,roughness:1})
    );
    rock.position.set(Math.cos(a)*d,0.3,Math.sin(a)*d);
    rock.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
    g.add(rock);
  }

  // Flowers scattered on grass
  const flowerColors=[0xff6680,0xffdd44,0xff88cc,0x88ffcc,0xcc88ff,0xffffff];
  const flowerCount=opt.flowers||18;
  for(let i=0;i<flowerCount;i++){
    const a=Math.random()*Math.PI*2;
    const d=Math.random()*grassR*0.72;
    addFlower(g,Math.cos(a)*d,Math.sin(a)*d,flowerColors[Math.floor(Math.random()*flowerColors.length)]);
  }

  // ── Jalan aspal: 4 arah dari center ke tepi, lebar 3 unit ──
  if(opt.paths!==false){
    const roadDirs=4;
    const roadMat=new THREE.MeshStandardMaterial({color:0x444444,roughness:0.95});
    for(let p=0;p<roadDirs;p++){
      const pAngle=p*(Math.PI/2)+(opt.pathAngle||0.3);
      const roadLen=grassR*0.85;
      const segments=Math.floor(roadLen/4);
      for(let s=0;s<segments;s++){
        const pd=4+s*4;
        // Aspal lebar
        const tile=new THREE.Mesh(
          new THREE.BoxGeometry(3.2,0.08,4.5),
          roadMat
        );
        tile.position.set(Math.cos(pAngle)*pd,0.05,Math.sin(pAngle)*pd);
        tile.rotation.y=pAngle;
        g.add(tile);
        // Garis putih tengah jalan (setiap 2 tile)
        if(s%2===0){
          const line=new THREE.Mesh(
            new THREE.BoxGeometry(0.22,0.09,1.8),
            new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:0.08})
          );
          line.position.set(Math.cos(pAngle)*pd,0.07,Math.sin(pAngle)*pd);
          line.rotation.y=pAngle;
          g.add(line);
        }
      }
    }
    // Roundabout di tengah
    const rbMat=new THREE.MeshStandardMaterial({color:0x555555,roughness:0.9});
    const rb=new THREE.Mesh(new THREE.CylinderGeometry(9,9,0.1,24),rbMat);
    rb.position.y=0.06;g.add(rb);
    // Taman kecil di roundabout
    const rbGrass=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.5,0.12,20),
      new THREE.MeshStandardMaterial({color:opt.grassColor||0x2d9e2d,roughness:0.9}));
    rbGrass.position.y=0.1;g.add(rbGrass);
    // Tugu di tengah roundabout
    const tugu=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,5,8),
      new THREE.MeshStandardMaterial({color:0xcccccc,roughness:0.6}));
    tugu.position.y=2.5;g.add(tugu);
    const tugutop=new THREE.Mesh(new THREE.ConeGeometry(1.2,2,8),
      new THREE.MeshStandardMaterial({color:0xffd700,emissive:0xffaa00,emissiveIntensity:0.2}));
    tugutop.position.y=6.5;g.add(tugutop);
  }

  // ── Hills: bukit-bukit kecil tersebar di pulau ──
  const hillCount=opt.hills||6;
  const hillMat=new THREE.MeshStandardMaterial({color:opt.grassColor||0x2d9e2d,roughness:0.95});
  for(let i=0;i<hillCount;i++){
    const ha=Math.random()*Math.PI*2;
    const hd=grassR*0.25+Math.random()*grassR*0.45;
    const hr=8+Math.random()*14;
    const hh=3+Math.random()*8;
    // Bukit elipsoid
    const hill=new THREE.Mesh(
      new THREE.SphereGeometry(hr,12,8),
      hillMat
    );
    hill.scale.y=hh/hr*0.5;
    hill.position.set(Math.cos(ha)*hd,-hr*0.3,Math.sin(ha)*hd);
    g.add(hill);
    // Pohon di atas bukit
    if(Math.random()<0.6){
      const hh2=4+Math.random()*4;
      addTree(g,Math.cos(ha)*hd,Math.sin(ha)*hd,hh2,opt.trunkColor,opt.leafColor);
    }
  }

  // Benches (8 di sepanjang jalan)
  if(opt.benches!==false){
    for(let i=0;i<8;i++){
      const ba=i*(Math.PI/4)+(opt.benchAngle||0.2);
      const bd=grassR*0.22+Math.random()*grassR*0.2;
      addBench(g,Math.cos(ba)*bd,Math.sin(ba)*bd,ba+Math.PI/2);
    }
  }

  // ── Rumah-rumah sederhana di sepanjang jalan ──
  // ── Rumah besar seukuran toko (efektif ~16x11x10 unit, sama dgn shop scale 1.6×base) ──
  const houseCount=(opt.houses===0)?0:(opt.houses||(Math.floor(grassR/30)));
  const houseMats=[0xf5deb3,0xdeb887,0xffa07a,0x98fb98,0x87ceeb,0xdda0dd,0xffe4b5,0xe8d5b7];
  const roofColors=[0x8B4513,0x6B3410,0xA0522D,0x5C3317,0x704214];
  for(let i=0;i<houseCount;i++){
    const ha=(i/houseCount)*Math.PI*2+(Math.random()-0.5)*0.3;
    const hd=grassR*0.40+Math.random()*grassR*0.32;
    const hx=Math.cos(ha)*hd, hz=Math.sin(ha)*hd;
    const hcolor=houseMats[i%houseMats.length];
    const rcolor=roofColors[Math.floor(Math.random()*roofColors.length)];
    // Ukuran seukuran toko: 16 wide, 11 tall, 10 deep (world units)
    const HW=16, HH=11, HD=10;
    const hg=new THREE.Group();
    hg.position.set(hx,0,hz);
    hg.rotation.y=ha+Math.random()*0.4-0.2;
    // Lantai
    const floor=new THREE.Mesh(
      new THREE.BoxGeometry(HW+1,0.4,HD+1),
      new THREE.MeshStandardMaterial({color:0xccbbaa,roughness:1})
    );
    floor.position.y=0.2; hg.add(floor);
    // Dinding utama (depan terbuka)
    const wallMat=new THREE.MeshStandardMaterial({map:wallTex,color:hcolor,roughness:0.8});
    // Belakang
    const wb=new THREE.Mesh(new THREE.BoxGeometry(HW,HH,0.5),wallMat);
    wb.position.set(0,HH/2,-HD/2); hg.add(wb);
    // Kiri
    const wl=new THREE.Mesh(new THREE.BoxGeometry(0.5,HH,HD),wallMat);
    wl.position.set(-HW/2,HH/2,0); hg.add(wl);
    // Kanan
    const wr=wl.clone(); wr.position.x=HW/2; hg.add(wr);
    // Depan dengan celah pintu
    const wft=new THREE.Mesh(new THREE.BoxGeometry(HW,HH*0.38,0.5),wallMat);
    wft.position.set(0,HH*0.81,HD/2); hg.add(wft);
    const wfL=new THREE.Mesh(new THREE.BoxGeometry(HW*0.3,HH,0.5),wallMat);
    wfL.position.set(-HW*0.35,HH/2,HD/2); hg.add(wfL);
    const wfR=wfL.clone(); wfR.position.x=HW*0.35; hg.add(wfR);
    // Pintu kayu
    const door=new THREE.Mesh(
      new THREE.BoxGeometry(HW*0.22,HH*0.55,0.4),
      new THREE.MeshStandardMaterial({color:0x5C4A1E,roughness:0.9})
    );
    door.position.set(0,HH*0.275,HD/2+0.1); hg.add(door);
    // Ambang pintu
    const doorTop=new THREE.Mesh(
      new THREE.BoxGeometry(HW*0.28,0.5,0.5),
      new THREE.MeshStandardMaterial({color:0x3e2200})
    );
    doorTop.position.set(0,HH*0.58,HD/2); hg.add(doorTop);
    // Jendela x2 (kiri & kanan pintu)
    [-1,1].forEach(side=>{
      const win=new THREE.Mesh(
        new THREE.BoxGeometry(HW*0.18,HH*0.28,0.4),
        new THREE.MeshStandardMaterial({color:0xaaddff,emissive:0x88bbdd,emissiveIntensity:0.15,transparent:true,opacity:0.88})
      );
      win.position.set(side*HW*0.3,HH*0.58,HD/2+0.1); hg.add(win);
      // Kusen jendela
      const frame=new THREE.Mesh(
        new THREE.BoxGeometry(HW*0.21,HH*0.31,0.35),
        new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.7})
      );
      frame.position.set(side*HW*0.3,HH*0.58,HD/2); hg.add(frame);
    });
    // Atap pelana besar
    const roofMat=new THREE.MeshStandardMaterial({map:roofTex,color:rcolor,roughness:0.9});
    const roof=new THREE.Mesh(new THREE.BoxGeometry(HW+2,0.4,HD+2),roofMat);
    roof.position.y=HH+0.2; hg.add(roof);
    // Puncak atap (ridge)
    const ridgeL=new THREE.Mesh(new THREE.BoxGeometry(HW+2.5,0.35,0.4),roofMat);
    ridgeL.position.set(0,HH+4.5,0); hg.add(ridgeL);
    // Panel atap miring kiri-kanan
    [-1,1].forEach(side=>{
      const rp=new THREE.Mesh(new THREE.BoxGeometry(HW+2.5,0.3,(HD/2+1.5)),roofMat);
      rp.position.set(0,HH+2.5,side*(HD/4+0.5));
      rp.rotation.x=side*0.55;
      hg.add(rp);
    });
    // Cerobong asap
    if(Math.random()<0.5){
      const chimney=new THREE.Mesh(
        new THREE.BoxGeometry(1.8,4,1.8),
        new THREE.MeshStandardMaterial({color:0x888888,roughness:1})
      );
      chimney.position.set(HW*0.3,HH+2,0); hg.add(chimney);
    }
    g.add(hg);
  }

  // Lamps (placed around center, registered for night glow)
  if(opt.lamps!==false){
    const lampCount=opt.lampCount||4;
    for(let i=0;i<lampCount;i++){
      const la=(i/lampCount)*Math.PI*2;
      const ld=grassR*0.42;
      addLamp(g,Math.cos(la)*ld,Math.sin(la)*ld,x,z,opt.lampColor);
    }
  }

  // Island name sign (post + board)
  const postL=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.14,4,8),new THREE.MeshStandardMaterial({color:0x8B6914}));
  postL.position.set(-3.5,2,sandR*0.7);g.add(postL);
  const postR=postL.clone();postR.position.x=3.5;g.add(postR);
  const board=new THREE.Mesh(new THREE.BoxGeometry(8,1.5,0.22),new THREE.MeshStandardMaterial({color:0x5C4A1E}));
  board.position.set(0,4.2,sandR*0.7);g.add(board);
  const sc=document.createElement("canvas");sc.width=512;sc.height=96;
  const sx=sc.getContext("2d");
  sx.fillStyle=opt.signBg||"#3e2200";sx.fillRect(0,0,512,96);
  sx.strokeStyle=opt.labelColor||"#ffdd88";sx.lineWidth=5;sx.strokeRect(6,6,500,84);
  sx.fillStyle=opt.labelColor||"#ffdd88";
  sx.font="bold 48px Arial";sx.textAlign="center";sx.textBaseline="middle";
  sx.fillText(label,256,50);
  const signMesh=new THREE.Mesh(new THREE.BoxGeometry(7.8,1.4,0.12),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)}));
  signMesh.position.set(0,4.2,sandR*0.71);g.add(signMesh);

  // Special: Lava (Volcano Isle)
  if(opt.lava){
    // Volcano mountain cone
    const volcone=new THREE.Mesh(
      new THREE.ConeGeometry(grassR*0.45,grassR*0.85,16),
      new THREE.MeshStandardMaterial({color:0x3a3a3a,roughness:1})
    );
    volcone.position.y=grassR*0.425;g.add(volcone);
    // Lava cap
    const lavaCap=new THREE.Mesh(
      new THREE.CylinderGeometry(4.5,7,3,16),
      new THREE.MeshStandardMaterial({color:0xff4500,emissive:0xff3300,emissiveIntensity:1.2})
    );
    lavaCap.position.y=grassR*0.86;g.add(lavaCap);
    // Lava rivers down the cone
    for(let i=0;i<5;i++){
      const la=i*(Math.PI*2/5)+Math.random()*0.5;
      const river=new THREE.Mesh(
        new THREE.BoxGeometry(0.9,grassR*0.6,0.4),
        new THREE.MeshStandardMaterial({color:0xff5500,emissive:0xff3300,emissiveIntensity:0.8,transparent:true,opacity:0.85})
      );
      const rd=grassR*0.22;
      river.position.set(Math.cos(la)*rd,grassR*0.5,Math.sin(la)*rd);
      river.rotation.set(0.28,la,0.18);g.add(river);
    }
    // Lava pools at base
    for(let i=0;i<6;i++){
      const lp=new THREE.Mesh(
        new THREE.CylinderGeometry(1.2+Math.random()*2.2,1.4,0.35,12),
        new THREE.MeshStandardMaterial({color:0xff4500,emissive:0xff2200,emissiveIntensity:1})
      );
      const la=Math.random()*Math.PI*2,ld=Math.random()*grassR*0.35;
      lp.position.set(Math.cos(la)*ld,0.22,Math.sin(la)*ld);g.add(lp);
    }
    // Smoke pillars (dark spheres stacked)
    for(let i=0;i<3;i++){
      const sm=new THREE.Mesh(
        new THREE.SphereGeometry(1.8+i*1.2,8,8),
        new THREE.MeshStandardMaterial({color:0x222222,transparent:true,opacity:0.38-i*0.08})
      );
      sm.position.set((Math.random()-0.5)*3,grassR*0.9+i*5,(Math.random()-0.5)*3);g.add(sm);
    }
  }

  // Special: Ice Crystals (Crystal Isle)
  if(opt.crystals){
    const cc=opt.crystalColor||0x00ffff;
    for(let i=0;i<16;i++){
      const h2=2.5+Math.random()*5;
      const cry=new THREE.Mesh(
        new THREE.ConeGeometry(0.22+Math.random()*0.38,h2,6),
        new THREE.MeshStandardMaterial({color:cc,transparent:true,opacity:0.78,emissive:cc,emissiveIntensity:0.35,roughness:0,metalness:0.5})
      );
      const ca=Math.random()*Math.PI*2,cd=Math.random()*grassR*0.62;
      cry.position.set(Math.cos(ca)*cd,h2/2,Math.sin(ca)*cd);
      cry.rotation.set((Math.random()-0.5)*0.4,Math.random()*Math.PI,(Math.random()-0.5)*0.2);
      g.add(cry);
    }
    // Ice ground patches
    for(let i=0;i<8;i++){
      const ip=new THREE.Mesh(
        new THREE.CylinderGeometry(2+Math.random()*3,2.5,0.18,10),
        new THREE.MeshStandardMaterial({color:0xaaddff,transparent:true,opacity:0.55,roughness:0,metalness:0.4})
      );
      const ia=Math.random()*Math.PI*2,id=Math.random()*grassR*0.6;
      ip.position.set(Math.cos(ia)*id,0.1,Math.sin(ia)*id);g.add(ip);
    }
    // Snow mound in center
    const mound=new THREE.Mesh(
      new THREE.SphereGeometry(grassR*0.22,16,10),
      new THREE.MeshStandardMaterial({color:0xeef8ff,roughness:1})
    );
    mound.scale.y=0.38;mound.position.y=0.5;g.add(mound);
  }

  // Special: Mystic (crystals already called externally, add glowing runes on ground)
  if(opt.mystic){
    for(let i=0;i<6;i++){
      const ra=(i/6)*Math.PI*2;
      const rune=new THREE.Mesh(
        new THREE.CylinderGeometry(1.2,1.2,0.12,6),
        new THREE.MeshStandardMaterial({color:0x9b59b6,emissive:0x9b59b6,emissiveIntensity:0.9,transparent:true,opacity:0.7})
      );
      rune.position.set(Math.cos(ra)*grassR*0.3,0.08,Math.sin(ra)*grassR*0.3);g.add(rune);
    }
    // Runic circle
    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(grassR*0.28,0.28,8,48),
      new THREE.MeshStandardMaterial({color:0xcc88ff,emissive:0xaa44ff,emissiveIntensity:0.8})
    );
    ring.rotation.x=Math.PI/2;ring.position.y=0.15;g.add(ring);
  }

  // Special: Aurora orbs (floating in world space, stored for animation)
  if(opt.aurora){
    for(let i=0;i<8;i++){
      const orbColors=[0x88ffff,0xaaffcc,0xccaaff,0xffaacc];
      const oc=orbColors[i%orbColors.length];
      const orb=new THREE.Mesh(
        new THREE.SphereGeometry(0.32+Math.random()*0.38,8,8),
        new THREE.MeshStandardMaterial({color:oc,emissive:oc,emissiveIntensity:1.2,transparent:true,opacity:0.75})
      );
      const oa=Math.random()*Math.PI*2,od=Math.random()*grassR*0.5;
      orb.position.set(x+Math.cos(oa)*od,4.5+Math.random()*7,z+Math.sin(oa)*od);
      orb.userData.floatOffset=Math.random()*Math.PI*2;
      scene.add(orb);
      floatingOrbs.push({mesh:orb,baseY:orb.position.y});
    }
    // Aurora curtain pillars
    for(let i=0;i<5;i++){
      const curtain=new THREE.Mesh(
        new THREE.BoxGeometry(0.4,12,3.5),
        new THREE.MeshStandardMaterial({color:0x44ffaa,emissive:0x22ff88,emissiveIntensity:0.5,transparent:true,opacity:0.18})
      );
      const ca=(i/5)*Math.PI*2;
      curtain.position.set(x+Math.cos(ca)*grassR*0.38,6+Math.random()*6,z+Math.sin(ca)*grassR*0.38);
      curtain.rotation.y=ca;scene.add(curtain);
    }
  }
  return g;
}

// Build all islands
buildIsland(islandDefs[0],{trees:16,rocks:8,flowers:24,houses:0,useGrassTex:true,grassColor:0xaaffaa,
  trunkColor:0x8B6914,leafColor:0x1a8a1a,lampColor:0xffdd88,paths:true,benches:true,
  lamps:true,lampCount:5,labelColor:"#ffdd88",
  buildingExclusions:[
    {cx:0,  cz:-25,hw:10,hd:7},{cx:30, cz:-25,hw:10,hd:7},
    {cx:-30,cz:-25,hw:10,hd:7},{cx:60, cz:-25,hw:10,hd:7}
  ]});
buildIsland(islandDefs[1],{trees:10,rocks:5,flowers:20,houses:0,grassColor:0x2d1060,trunkColor:0x9b59b6,leafColor:0x6600cc,crystals:true,crystalColor:0xcc88ff,mystic:true,lampColor:0xcc44ff,lampCount:4,labelColor:"#cc88ff",paths:true,benches:true,lamps:true});
buildIsland(islandDefs[2],{trees:5,rocks:18,flowers:6,houses:0,grassColor:0x6a1a00,trunkColor:0x444444,leafColor:0x556b2f,lava:true,rockColor:0x444444,lampColor:0xff4400,lampCount:4,labelColor:"#ff6644",paths:false,benches:false,lamps:true});
buildIsland(islandDefs[3],{trees:7,rocks:6,flowers:8,houses:0,grassColor:0x005a70,trunkColor:0x5599aa,leafColor:0x00aacc,crystals:true,crystalColor:0x88ddff,lampColor:0x88ffff,lampCount:4,labelColor:"#88ffff",paths:true,benches:true,lamps:true});
buildIsland(islandDefs[4],{trees:8,rocks:4,flowers:30,houses:0,grassColor:0x0a0a2a,trunkColor:0x334466,leafColor:0x003366,aurora:true,lampColor:0x88ffcc,lampCount:5,labelColor:"#88ffcc",paths:true,benches:true,lamps:true,
  buildingExclusions:[{cx:0,cz:-25,hw:12,hd:8}]});
buildIsland(islandDefs[5],{trees:4,rocks:20,flowers:5,houses:0,grassColor:0x001122,trunkColor:0x002244,leafColor:0x003366,lampColor:0x0044ff,lampCount:4,labelColor:"#0088ff",paths:true,benches:true,lamps:true,
  buildingExclusions:[{cx:0,cz:-25,hw:12,hd:8}]});
buildIsland(islandDefs[6],{trees:10,rocks:3,flowers:40,houses:0,grassColor:0xaabbdd,trunkColor:0x8899bb,leafColor:0xbbccff,lampColor:0xffffff,lampCount:5,labelColor:"#ffffff",paths:true,benches:true,lamps:true,
  buildingExclusions:[{cx:0,cz:-25,hw:12,hd:8}]});

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

// ── Sell Fish + Bait shops di pulau lain ──
const {counter:mysticSellCounter}=makeShop(700,-50,"🐟 SELL FISH");
const {counter:mysticBaitCounter}=makeShop(730,-50,"🪱 BAIT SHOP");
const {counter:volcanoSellCounter}=makeShop(-800,-625,"🐟 SELL FISH");
const {counter:volcanoBaitCounter}=makeShop(-770,-625,"🪱 BAIT SHOP");
const {counter:crystalSellCounter}=makeShop(300,975,"🐟 SELL FISH");
const {counter:crystalBaitCounter}=makeShop(330,975,"🪱 BAIT SHOP");
const {counter:auroraSellCounter}=makeShop(-400,1175,"🐟 SELL FISH");
const {counter:auroraBaitCounter}=makeShop(-370,1175,"🪱 BAIT SHOP");
const {counter:abyssSellCounter}=makeShop(1200,575,"🐟 SELL FISH");
const {counter:abyssBaitCounter}=makeShop(1230,575,"🪱 BAIT SHOP");
const {counter:skySellCounter}=makeShop(0,-1425,"🐟 SELL FISH");
const {counter:skyBaitCounter}=makeShop(30,-1425,"🪱 BAIT SHOP");

const allSellCounters=[counter,mysticSellCounter,volcanoSellCounter,crystalSellCounter,auroraSellCounter,abyssSellCounter,skySellCounter];
const allBaitCounters=[baitShopCounter,mysticBaitCounter,volcanoBaitCounter,crystalBaitCounter,auroraBaitCounter,abyssBaitCounter,skyBaitCounter];

// ═══ HARBOUR ═══
function buildHarbour(hdef){
  const g=new THREE.Group();g.position.set(hdef.x,0,hdef.z);scene.add(g);
  // Main dock platform
  const dock=new THREE.Mesh(new THREE.BoxGeometry(22,0.55,12),new THREE.MeshStandardMaterial({color:0x8B6914,roughness:0.9,map:floorTex}));
  dock.position.y=0.28;g.add(dock);
  // Dock planks detail
  for(let i=-4;i<=4;i++){
    const plank=new THREE.Mesh(new THREE.BoxGeometry(22,0.08,0.7),new THREE.MeshStandardMaterial({color:0x7a5c14,roughness:1}));
    plank.position.set(0,0.56,i*1.1);g.add(plank);
  }
  // Poles
  for(let i=-1;i<=1;i++){
    const pm=new THREE.MeshStandardMaterial({color:0x5C4A1E,roughness:0.9});
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.25,5,8),pm);
    pole.position.set(i*7,-2,5.5);g.add(pole);
    const p2=pole.clone();p2.position.z=-5.5;g.add(p2);
    // Crossbrace
    const brace=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.14,11),pm);
    brace.position.set(i*7,1.5,0);g.add(brace);
  }
  // Bollards
  for(let bx=-8;bx<=8;bx+=4){
    const bol=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.35,1.1,8),new THREE.MeshStandardMaterial({color:0x444444,roughness:0.8}));
    bol.position.set(bx,0.85,5.5);g.add(bol);
    const bolt=new THREE.Mesh(new THREE.SphereGeometry(0.35,8,8),new THREE.MeshStandardMaterial({color:0x333333}));
    bolt.position.set(bx,1.4,5.5);g.add(bolt);
  }
  // Railings
  const railM=new THREE.MeshStandardMaterial({color:0x5C4A1E});
  const topRail=new THREE.Mesh(new THREE.BoxGeometry(22,0.12,0.12),railM);
  topRail.position.set(0,1.8,6);g.add(topRail);
  const tr2=topRail.clone();tr2.position.z=-6;g.add(tr2);
  for(let rx=-9;rx<=9;rx+=3){
    const vp=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.8,0.1),railM);
    vp.position.set(rx,0.9,6);g.add(vp);
    const vp2=vp.clone();vp2.position.z=-6;g.add(vp2);
  }
  // Harbour lights (stored for night)
  for(let lx=-8;lx<=8;lx+=8){
    const lpost=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,4,8),new THREE.MeshStandardMaterial({color:0x666666}));
    lpost.position.set(lx,2,-5.8);g.add(lpost);
    const lbulb=new THREE.Mesh(new THREE.SphereGeometry(0.28,8,8),new THREE.MeshStandardMaterial({
      color:0xffeeaa,emissive:0xffcc44,emissiveIntensity:0,transparent:true,opacity:0.9
    }));
    lbulb.position.set(lx,4.1,-5.8);g.add(lbulb);
    islandLamps.push({bulb:lbulb,wx:hdef.x+lx,wz:hdef.z-5.8,color:0xffcc44});
  }
  // Sign
  const sc=document.createElement("canvas");sc.width=384;sc.height=80;
  const sx=sc.getContext("2d");
  sx.fillStyle="#2c1a0a";sx.fillRect(0,0,384,80);
  sx.strokeStyle="#ffdd88";sx.lineWidth=4;sx.strokeRect(4,4,376,72);
  sx.fillStyle="#ffdd88";sx.font="bold 34px Arial";sx.textAlign="center";sx.textBaseline="middle";
  sx.fillText(hdef.label,192,42);
  const sm=new THREE.Mesh(new THREE.BoxGeometry(9,2,0.15),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(sc)}));
  sm.position.set(0,5.8,0);g.add(sm);
  // Indicator ring
  const ind=new THREE.Mesh(new THREE.TorusGeometry(5,0.22,8,32),new THREE.MeshStandardMaterial({color:0x00ff88,emissive:0x00ff88,emissiveIntensity:0.6}));
  ind.rotation.x=Math.PI/2;ind.position.set(0,0.4,0);g.add(ind);
  return g;
}
// Build all harbours
HARBOUR_DEFS.forEach(hdef=>buildHarbour(hdef));

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
// ── NPC Main Island (di depan counter setiap toko) ──
const {group:npcGroup,root:npcRoot}=makeNPC(0x3498db,0,-23);         // Sell Fish
const {group:rodNpcGroup,root:rodNpcRoot}=makeNPC(0xe74c3c,30,-23);   // Rod Shop
const {group:baitNpcGroup,root:baitNpcRoot}=makeNPC(0x27ae60,-30,-23);// Bait Shop
const {group:jsNpcGroup,root:jsNpcRoot}=makeNPC(0xf39c12,60,-23);     // Jetski

// ── NPC Mystic Isle ──
const {group:mysticSellNpc,root:mysticSellNpcR}=makeNPC(0x9b59b6,700,-48);
const {group:mysticBaitNpc,root:mysticBaitNpcR}=makeNPC(0xcc44ff,730,-48);

// ── NPC Volcano Isle ──
const {group:volcanoSellNpc,root:volcanoSellNpcR}=makeNPC(0xe74c3c,-800,-623);
const {group:volcanoBaitNpc,root:volcanoBaitNpcR}=makeNPC(0xff6600,-770,-623);

// ── NPC Crystal Isle ──
const {group:crystalSellNpc,root:crystalSellNpcR}=makeNPC(0x00bcd4,300,977);
const {group:crystalBaitNpc,root:crystalBaitNpcR}=makeNPC(0x88ffff,330,977);

// ── NPC Aurora Isle ──
const {group:auroraSellNpc,root:auroraSellNpcR}=makeNPC(0x4455bb,-400,1177);
const {group:auroraBaitNpc,root:auroraBaitNpcR}=makeNPC(0x88ffcc,-370,1177);

// ── NPC Abyss Isle ──
const {group:abyssSellNpc,root:abyssSellNpcR}=makeNPC(0x0055cc,1200,577);
const {group:abyssBaitNpc,root:abyssBaitNpcR}=makeNPC(0x0044aa,1230,577);

// ── NPC Sky Isle ──
const {group:skySellNpc,root:skySellNpcR}=makeNPC(0xaaccff,0,-1423);
const {group:skyBaitNpc,root:skyBaitNpcR}=makeNPC(0xffffff,30,-1423);

// All island NPCs for animateNPCs
const allIslandNpcs=[
  {g:mysticSellNpc,r:mysticSellNpcR},{g:mysticBaitNpc,r:mysticBaitNpcR},
  {g:volcanoSellNpc,r:volcanoSellNpcR},{g:volcanoBaitNpc,r:volcanoBaitNpcR},
  {g:crystalSellNpc,r:crystalSellNpcR},{g:crystalBaitNpc,r:crystalBaitNpcR},
  {g:auroraSellNpc,r:auroraSellNpcR},{g:auroraBaitNpc,r:auroraBaitNpcR},
  {g:abyssSellNpc,r:abyssSellNpcR},{g:abyssBaitNpc,r:abyssBaitNpcR},
  {g:skySellNpc,r:skySellNpcR},{g:skyBaitNpc,r:skyBaitNpcR},
];

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
// ── 3D Fish Model (body + tail + fin) ──
function buildFishModel(color){
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color:color||0x5dade2,emissive:0x112233,emissiveIntensity:0.25,roughness:0.4,metalness:0.3});
  // Body utama — ellipsoid
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22,12,8),mat);
  body.scale.set(1,0.6,1.8); grp.add(body);
  // Kepala
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18,10,7),mat);
  head.position.set(0,0.02,0.32); head.scale.set(0.9,0.75,0.7); grp.add(head);
  // Ekor
  const tailMat=mat.clone(); tailMat.side=THREE.DoubleSide;
  const tailGeo=new THREE.CylinderGeometry(0,0.18,0.28,6,1,true);
  const tail=new THREE.Mesh(tailGeo,tailMat);
  tail.position.set(0,0,-0.38); tail.rotation.x=Math.PI/2; grp.add(tail);
  // Sirip atas
  const finGeo=new THREE.CylinderGeometry(0,0.1,0.18,4,1,true);
  const fin=new THREE.Mesh(finGeo,tailMat);
  fin.position.set(0,0.2,0.05); fin.rotation.z=Math.PI; grp.add(fin);
  // Sirip samping kiri
  const sfinL=new THREE.Mesh(new THREE.CylinderGeometry(0,0.08,0.14,4,1,true),tailMat);
  sfinL.position.set(-0.18,0,0.08); sfinL.rotation.z=-Math.PI/2.5; grp.add(sfinL);
  // Sirip samping kanan
  const sfinR=new THREE.Mesh(new THREE.CylinderGeometry(0,0.08,0.14,4,1,true),tailMat);
  sfinR.position.set(0.18,0,0.08); sfinR.rotation.z=Math.PI/2.5; grp.add(sfinR);
  // Mata
  const eyeM=new THREE.MeshStandardMaterial({color:0x111111,emissive:0x000000});
  const eyeL=new THREE.Mesh(new THREE.SphereGeometry(0.035,6,5),eyeM);
  eyeL.position.set(-0.09,0.06,0.42); grp.add(eyeL);
  const eyeR=eyeL.clone(); eyeR.position.x=0.09; grp.add(eyeR);
  return grp;
}
// ── Junk model — kotak/benda tak jelas ──
function buildJunkModel(color){
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color:color||0x888888,roughness:0.85,metalness:0.15});
  // Badan utama — kotak tidak simetris (sampah)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.28,0.42),mat);
  grp.add(body);
  // Tonjolan kiri — benjolan acak
  const bump1 = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.16,0.2),mat);
  bump1.position.set(-0.22,0.04,0.05); bump1.rotation.y=0.3; grp.add(bump1);
  // Tonjolan atas — tutup miring
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.08,0.38),mat);
  top.position.set(0,0.18,0); top.rotation.z=0.15; grp.add(top);
  // Detail — garis p凹 (darker strip)
  const stripMat=new THREE.MeshStandardMaterial({color:0x444444,roughness:1});
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.3,0.44),stripMat);
  strip.position.set(0.1,0,0.01); grp.add(strip);
  // Tali/kabel kecil menjulur
  const ropeMat=new THREE.MeshStandardMaterial({color:0x996633,roughness:0.9});
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.25,5),ropeMat);
  rope.position.set(-0.05,0.18,0.1); rope.rotation.z=0.6; grp.add(rope);
  return grp;
}

const heldFishGroup = buildFishModel(0x5dade2);
heldFishGroup.scale.setScalar(1.1);
heldFishGroup.rotation.set(0.15,0,0.3);
const heldFishMesh = heldFishGroup;

// Junk model (terpisah, swap saat hold)
const heldJunkGroup = buildJunkModel(0x888888);
heldJunkGroup.visible = false;

// Anchor kiri (untuk ikan kecil & junk) 
const leftHandAnchor=new THREE.Object3D();leftHandAnchor.position.set(0,-1.1,0);
armL.add(leftHandAnchor);leftHandAnchor.add(heldFishGroup);leftHandAnchor.add(heldJunkGroup);
heldFishGroup.visible=false;heldJunkGroup.visible=false;

// Anchor kanan (untuk ikan besar — pose dua tangan angkat)
const rightHandAnchor=new THREE.Object3D();rightHandAnchor.position.set(0,-1.1,0);
armR.add(rightHandAnchor);
// Dummy mesh di kanan — tidak terlihat, hanya untuk sinkronisasi posisi
// Ikan besar ditempatkan di midpoint antara kedua tangan via group tersendiri
// heldFishOverhead — attach ke torso agar ikut badan
// torso.y=3, kepala di y=1.9 dari torso, jadi atas kepala = y~3.2 dari torso
const heldFishOverhead = buildFishModel(0x5dade2);
heldFishOverhead.visible = false;
heldFishOverhead.position.set(0, 3.5, 0); // tepat di atas kepala
heldFishOverhead.rotation.set(0.1, 0, 0.1);
torso.add(heldFishOverhead); // ikut torso

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
// Minimap dihapus — island info tampil di levelUI saja
// Island badge kecil di bawah levelUI
(function(){
  const badge=document.createElement("div");
  badge.id="islandBadge";
  Object.assign(badge.style,{
    position:"fixed",left:"12px",top:"98px",
    background:"rgba(0,0,0,0.62)",backdropFilter:"blur(6px)",
    border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:"9px",padding:"4px 11px",
    color:"#7ecfff",fontSize:"11px",fontWeight:"bold",
    zIndex:"20",pointerEvents:"none",
    display:"none"
  });
  document.body.appendChild(badge);
})();

function updateMinimap(){}

// ═══ FISH PANEL (removed — info ada di Fish Index [B]) ═══
function updateIslandFishPanel(){}

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
// ── JUMP SYSTEM ──
let velY=0, isGrounded=true, jumpBtnHeld=false;
const GRAVITY=-0.025, JUMP_FORCE=0.38;
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
window.addEventListener("keydown",e=>{
  if(e.key)keys[e.key.toLowerCase()]=true;
  // JUMP: Spacebar
  if(e.code==="Space"&&isGrounded&&!isSwimming&&!isFishing&&!onJetski){
    velY=JUMP_FORCE; isGrounded=false;
    // Animasi lengan saat lompat
    armL.rotation.x=-0.8; armR.rotation.x=-0.8;
    e.preventDefault();
  }
});
window.addEventListener("keyup",e=>{if(e.key)keys[e.key.toLowerCase()]=false;});

// ─── RUN BUTTON (mobile) ───
(function(){
  const btn=document.createElement("div");
  btn.id="runBtn";
  Object.assign(btn.style,{
    position:"fixed",
    left:"55px",bottom:"168px",transition:"all 0.3s",
    width:"58px",height:"58px",
    borderRadius:"50%",
    background:"linear-gradient(135deg,rgba(255,120,0,0.85),rgba(200,60,0,0.85))",
    border:"2.5px solid rgba(255,180,80,0.7)",
    color:"#fff",fontSize:"11px",fontWeight:"bold",
    display:"flex",alignItems:"center",justifyContent:"center",
    flexDirection:"column",gap:"1px",
    zIndex:"30",userSelect:"none",
    boxShadow:"0 4px 14px rgba(255,80,0,0.5)",
    touchAction:"none",cursor:"pointer"
  });
  btn.innerHTML="🏃<br>RUN";
  // Touch events
  btn.addEventListener("touchstart",e=>{e.preventDefault();runBtnHeld=true;btn.style.transform="scale(0.92)";},{passive:false});
  btn.addEventListener("touchend",e=>{e.preventDefault();runBtnHeld=false;btn.style.transform="scale(1)";},{passive:false});
  btn.addEventListener("touchcancel",()=>{runBtnHeld=false;btn.style.transform="scale(1)";});
  // Mouse (PC testing)
  btn.addEventListener("mousedown",()=>{runBtnHeld=true;});
  btn.addEventListener("mouseup",()=>{runBtnHeld=false;});

  // ── JUMP Button (mobile) ──
  const jumpBtn=document.createElement("div");
  jumpBtn.id="jumpBtn";
  jumpBtn.textContent="⬆";
  Object.assign(jumpBtn.style,{
    position:"fixed",
    right:"25px", bottom:"35px",
    width:"68px", height:"68px",
    borderRadius:"50%",
    background:"linear-gradient(135deg,#3498db,#2980b9)",
    border:"2px solid rgba(100,180,255,0.5)",
    color:"#fff", fontSize:"28px",
    display:"flex", alignItems:"center", justifyContent:"center",
    zIndex:"20", cursor:"pointer",
    boxShadow:"0 4px 12px rgba(52,152,219,0.5)",
    touchAction:"none", userSelect:"none",
    fontWeight:"bold"
  });
  jumpBtn.addEventListener("touchstart",e=>{
    e.preventDefault();
    if(isGrounded&&!isSwimming&&!isFishing&&!onJetski){
      velY=JUMP_FORCE; isGrounded=false;
      armL.rotation.x=-0.8; armR.rotation.x=-0.8;
    }
  },{passive:false});
  jumpBtn.addEventListener("mousedown",()=>{
    if(isGrounded&&!isSwimming&&!isFishing&&!onJetski){
      velY=JUMP_FORCE; isGrounded=false;
    }
  });
  document.body.appendChild(jumpBtn);
  document.body.appendChild(btn);
})();
let walkAnim=0;
let isRunning=false;
let runBtnHeld=false;

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
  for(const hd of HARBOUR_DEFS){
    if((px-hd.x)**2+(pz-hd.z)**2<196)return true;
  }
  return false;
}

// ═══ COLLISION SYSTEM ═══
// Volcano: grassR=60, cone ConeGeometry(grassR*0.45) = r27 at island center (-800,-600)
// Mystic: runic ring TorusGeometry(grassR*0.28=15.4) at (700,0)
// Crystal: snow mound SphereGeometry(grassR*0.22=11.4) at (300,1000)
// Shops: scale=1.6 → world floor 16x9.6, back wall at z=-4.8 from shop center
const collisionBoxes=[
  // ─ MAIN ISLAND: Shops (px,pz center, scale=1.6) ─
  // Back wall only — open front so player can enter
  {cx:0,   cz:-29.8, hw:8.5, hd:1.5},  // SELL FISH — back wall
  {cx:0,   cz:-20.2, hw:8.5, hd:1.5},  // SELL FISH — NOT blocking (removed)
  {cx:30,  cz:-29.8, hw:8.5, hd:1.5},  // ROD SHOP — back wall
  {cx:-30, cz:-29.8, hw:8.5, hd:1.5},  // BAIT SHOP — back wall
  {cx:60,  cz:-29.8, hw:8.5, hd:1.5},  // JETSKI — back wall
  // Side walls (left/right of each shop)
  {cx:-8.8, cz:-25, hw:1.5, hd:4.8},   // SELL FISH — left wall
  {cx:8.8,  cz:-25, hw:1.5, hd:4.8},   // SELL FISH — right wall
  {cx:21.2, cz:-25, hw:1.5, hd:4.8},   // ROD SHOP — left wall
  {cx:38.8, cz:-25, hw:1.5, hd:4.8},   // ROD SHOP — right wall
  {cx:-38.8,cz:-25, hw:1.5, hd:4.8},   // BAIT SHOP — left wall
  {cx:-21.2,cz:-25, hw:1.5, hd:4.8},   // BAIT SHOP — right wall
  {cx:51.2, cz:-25, hw:1.5, hd:4.8},   // JETSKI — left wall
  {cx:68.8, cz:-25, hw:1.5, hd:4.8},   // JETSKI — right wall

  // ─ VOLCANO ISLE center(-800,-600) grassR=60 ─
  // Volcano cone: ConeGeometry(grassR*0.45=27) — big circle blocker
  {cx:-800, cz:-600, type:"circle", r:27},
  // Extra lava rocks around base
  {cx:-820, cz:-620, type:"circle", r:5},
  {cx:-780, cz:-580, type:"circle", r:5},
  {cx:-820, cz:-580, type:"circle", r:4},
  {cx:-780, cz:-620, type:"circle", r:4},
  {cx:-800, cz:-635, type:"circle", r:5},
  {cx:-800, cz:-565, type:"circle", r:5},

  // ─ MYSTIC ISLE center(700,0) grassR=55 ─
  // Runic ring: TorusGeometry(r=15.4) — ring, not solid center
  // So block the ring itself (player can stand inside or outside)
  {cx:700, cz:0, type:"ring", r:15.4, thickness:3},
  // Crystal pillars scattered
  {cx:712, cz:12,  type:"circle", r:3},
  {cx:688, cz:-12, type:"circle", r:3},
  {cx:716, cz:-8,  type:"circle", r:2.5},
  {cx:684, cz:8,   type:"circle", r:2.5},

  // ─ CRYSTAL ISLE center(300,1000) grassR=52 ─
  // Snow mound: SphereGeometry(r=11.4, scaleY=0.38) → short hill, r=11
  {cx:300, cz:1000, type:"circle", r:11},
  // Crystal spires
  {cx:314, cz:1014, type:"circle", r:2.5},
  {cx:286, cz:986,  type:"circle", r:2.5},
  {cx:316, cz:992,  type:"circle", r:2},
  {cx:284, cz:1008, type:"circle", r:2},
  {cx:300, cz:1016, type:"circle", r:2},
  {cx:300, cz:984,  type:"circle", r:2},

  // ─ AURORA ISLE center(-400,1200) grassR=48 ─
  // No big static obstacles — only floating orbs (no collision)
];

function resolveCollisions(){
  if(onJetski||isSwimming)return;
  const pr=1.2;
  for(const b of collisionBoxes){
    const dx=player.position.x-b.cx, dz=player.position.z-b.cz;
    if(b.type==="circle"){
      const dist=Math.sqrt(dx*dx+dz*dz);
      const minDist=b.r+pr;
      if(dist<minDist&&dist>0.01){
        const f=(minDist-dist)/dist;
        player.position.x+=dx*f;
        player.position.z+=dz*f;
      }
    } else if(b.type==="ring"){
      // Block only within ring thickness
      const dist=Math.sqrt(dx*dx+dz*dz);
      const inner=b.r-b.thickness/2, outer=b.r+b.thickness/2;
      if(dist>inner-pr&&dist<outer+pr&&dist>0.01){
        // Push to nearest edge (inner or outer)
        const toInner=Math.abs(dist-(inner-pr));
        const toOuter=Math.abs(dist-(outer+pr));
        const target=toInner<toOuter?inner-pr:outer+pr;
        const f=(target-dist)/dist;
        player.position.x+=dx*f;
        player.position.z+=dz*f;
      }
    } else {
      // AABB box
      const ox=b.hw+pr-Math.abs(dx), oz=b.hd+pr-Math.abs(dz);
      if(ox>0&&oz>0){
        if(ox<oz)player.position.x+=ox*(dx<0?-1:1);
        else player.position.z+=oz*(dz<0?-1:1);
      }
    }
  }
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
  // Sprint: Shift key or run button
  isRunning=(keys["shift"]||runBtnHeld)&&!isSwimming&&!isFishing&&!freezePlayer;
  const spd=isSwimming?0.07:isRunning?0.26:0.13;
  if(!freezePlayer)player.position.addScaledVector(dir,spd);
  if(isSwimming){
    player.position.y=THREE.MathUtils.lerp(player.position.y,-1.8,0.1);
    velY=0; isGrounded=false;
  } else if(onJetski){
    velY=0; isGrounded=true;
  } else {
    // Gravity + jump physics
    const groundY=0; // ground level
    if(!isGrounded){
      velY+=GRAVITY;
      player.position.y+=velY;
      if(player.position.y<=groundY){
        player.position.y=groundY;
        velY=0; isGrounded=true;
      }
    } else {
      player.position.y=THREE.MathUtils.lerp(player.position.y,groundY,0.18);
    }
  }
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
    // Animasi lompat
    if(!isGrounded&&velY>0){
      // Naik: tangan ke atas, kaki ditekuk
      armL.rotation.x=THREE.MathUtils.lerp(armL.rotation.x,-1.2,0.2);
      armR.rotation.x=THREE.MathUtils.lerp(armR.rotation.x,-1.2,0.2);
      legL.rotation.x=THREE.MathUtils.lerp(legL.rotation.x,-0.5,0.2);
      legR.rotation.x=THREE.MathUtils.lerp(legR.rotation.x,-0.5,0.2);
    } else if(!isGrounded&&velY<0){
      // Turun: tangan melebar, kaki lurus
      armL.rotation.z=THREE.MathUtils.lerp(armL.rotation.z, 0.8,0.15);
      armR.rotation.z=THREE.MathUtils.lerp(armR.rotation.z,-0.8,0.15);
      legL.rotation.x=THREE.MathUtils.lerp(legL.rotation.x, 0.3,0.15);
      legR.rotation.x=THREE.MathUtils.lerp(legR.rotation.x, 0.3,0.15);
    } else {
      resetBodyPose();
    }
    if(moving)walkAnim+=isRunning?0.32:0.18;
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
    // ── Override arms saat memegang ikan ──
    if(heldFishIndex>=0&&!isFishing&&!isSwimming){
      const pose=window._heldFishPose||"light";
      const t=Date.now();

      if(pose==="heavy"){
        // ── IKAN BESAR: kedua tangan lurus ke atas, menopang ikan ──
        const liftBob=Math.sin(t*0.0018)*0.025;
        // Tangan kiri — lurus ke atas rapat ke kepala
        armL.rotation.x=THREE.MathUtils.lerp(armL.rotation.x,-Math.PI*0.9+liftBob,0.1);
        armL.rotation.z=THREE.MathUtils.lerp(armL.rotation.z, 0.08,0.1);
        // Tangan kanan — mirror simetris
        armR.rotation.x=THREE.MathUtils.lerp(armR.rotation.x,-Math.PI*0.9+liftBob,0.1);
        armR.rotation.z=THREE.MathUtils.lerp(armR.rotation.z,-0.08,0.1);
        // Ikan berputar pelan di atas kepala
        if(typeof heldFishOverhead!=="undefined"&&heldFishOverhead.visible){
          heldFishOverhead.rotation.y += 0.010;
        }

      } else if(pose==="light"){
        // ── IKAN KECIL: tangan kiri ke depan-atas ──
        const showBob=Math.sin(t*0.002)*0.025;
        armL.rotation.x=THREE.MathUtils.lerp(armL.rotation.x,-1.1+showBob,0.08);
        armL.rotation.z=THREE.MathUtils.lerp(armL.rotation.z, 0.22,0.08);
        // Tangan kanan sedikit ke samping (pose santai)
        armR.rotation.x=THREE.MathUtils.lerp(armR.rotation.x, 0.1,0.06);
        armR.rotation.z=THREE.MathUtils.lerp(armR.rotation.z,-0.15,0.06);

      } else if(pose==="junk"){
        // ── JUNK: tangan kiri agak turun malas ──
        const lazyBob=Math.sin(t*0.0015)*0.02;
        armL.rotation.x=THREE.MathUtils.lerp(armL.rotation.x,-0.4+lazyBob,0.07);
        armL.rotation.z=THREE.MathUtils.lerp(armL.rotation.z, 0.35,0.07);
        armR.rotation.x=THREE.MathUtils.lerp(armR.rotation.x, 0.05,0.06);
        armR.rotation.z=THREE.MathUtils.lerp(armR.rotation.z,-0.1,0.06);
      }
    }
  }
  const onLand=checkOnLand();
  if(!onLand&&!isSwimming){isSwimming=true;showMessage("🌊 Swimming!");}
  if(onLand&&isSwimming){isSwimming=false;swimCycle=0;}
  resolveCollisions();
  // Track island change
  const newIsland=getPlayerIsland()||"main";
  if(newIsland!==currentIsland){
    currentIsland=newIsland;
    const idef=islandDefs.find(i=>i.id===currentIsland);
    const ibadge=document.getElementById("islandBadge");
    if(ibadge){ibadge.textContent="📍 "+(idef&&idef.label?idef.label:"");ibadge.style.display=idef?"block":"none";}
    if(idef){
      const pool=fishDB[idef.fishKey]||[];
      const legs=pool.filter(f=>f.rarity==="Legendary");
      const preview=legs.length>0?legs.map(f=>f.emoji).join(" "):pool.slice(0,4).map(f=>f.emoji).join(" ");
      showEventNotification("🏝️ Arrived at "+idef.label+"! Fish here: "+preview);
    }
  }
}

function updateCamera(){
  const worldPos=new THREE.Vector3();player.getWorldPosition(worldPos);
  const tgt=worldPos.clone();tgt.y+=3.3;
  const dist=onJetski?12:9;
  const des=new THREE.Vector3(tgt.x-Math.sin(camYaw)*dist,tgt.y+camPitch*4.5,tgt.z-Math.cos(camYaw)*dist);
  camera.position.lerp(des,0.18);camera.lookAt(tgt);
}

let _waterFrame=0;
function animateWater(time){
  // Skip rate: low quality=4 frame, medium=3, high=2
  const skipRate=perfQuality==='low'?4:perfQuality==='medium'?3:2;
  if(++_waterFrame%skipRate!==0)return;
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
  const _hd=HARBOUR_DEFS.find(h=>h.id===currentHarbourId)||HARBOUR_DEFS[0];
  jetskiSpawned=true;jetski.position.set(_hd.spawnX,0.1,_hd.spawnZ);
  jetski.visible=true;jetski.rotation.set(0,0,0);
  showMessage("🛥️ Jetski di-spawn di "+_hd.label+"!");
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
  biteTime=((Math.random()*4+2)/sm)*(window._eventFishFrenzy?0.4:1);
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
  // Zone width berdasarkan rod yang diequip
  const equippedRod=rodDatabase[inventory.equipped]||rodDatabase.FishingRod;
  const zw=(equippedRod.controlWidth||20)/2;
  tensionVal=50;zoneMin=50-zw;zoneMax=50+zw;
  tensionProgress=25;tensionReeling=false;tensionGrace=1.5;
  tensionDifficulty=fish.diff||1;tensionFishSpeed=0;
  tensionDir=Math.random()<0.5?1:-1;tensionTimeout=20;freezePlayer=true;pendingFish=fish;
  // Tanda seru berbeda per rarity
  const biteEl = document.getElementById("biteIcon");
  const rarityBiteMap = {
    Junk:      {emoji:"❕", color:"#888888", shadow:"none",           size:"44px"},
    Common:    {emoji:"❗", color:"#dddddd", shadow:"none",           size:"52px"},
    Uncommon:  {emoji:"❗", color:"#2ecc71", shadow:"0 0 12px #2ecc71",size:"56px"},
    Rare:      {emoji:"‼️", color:"#3498db", shadow:"0 0 16px #3498db",size:"60px"},
    Epic:      {emoji:"‼️", color:"#9b59b6", shadow:"0 0 20px #9b59b6",size:"64px"},
    Legendary: {emoji:"⚡", color:"#f39c12", shadow:"0 0 28px #f39c12",size:"72px"},
  };
  const bm = rarityBiteMap[fish.rarity] || rarityBiteMap.Common;
  biteEl.textContent = bm.emoji;
  biteEl.style.color = bm.color;
  biteEl.style.fontSize = bm.size;
  biteEl.style.textShadow = bm.shadow;
  biteEl.style.filter = bm.shadow !== "none" ? "drop-shadow(" + bm.shadow + ")" : "none";
  biteEl.style.display = "block";
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
  const zoneSpeed=28,zoneWidth=zoneMax-zoneMin;
  // Zone bergerak mengikuti ikan (tensionVal) agar selalu bisa dijangkau
  const targetCenter=tensionVal;
  const currentCenter=(zoneMin+zoneMax)/2;
  const diff=targetCenter-currentCenter;
  // Zone bergerak mengejar ikan perlahan, player harus menekan reel untuk align
  if(tensionReeling){
    // Saat reel: zone bergerak ke kanan (mengejar)
    zoneMin+=zoneSpeed*dt;zoneMax+=zoneSpeed*dt;
  } else {
    // Saat tidak reel: zone mundur ke kiri
    zoneMin-=zoneSpeed*dt;zoneMax-=zoneSpeed*dt;
  }
  // Pastikan zone tidak keluar batas — balik arah jika mentok
  if(zoneMin<0){zoneMin=0;zoneMax=Math.max(zoneWidth,zoneWidth);}
  if(zoneMax>100){zoneMax=100;zoneMin=Math.min(100-zoneWidth,100-zoneWidth);}
  const fishSpd=RARITY_FISH_SPEED[(pendingFish&&pendingFish.rarity)||"Common"]||0.3;
  tensionFishSpeed+=(Math.random()-0.5)*0.12*tensionDifficulty;
  tensionFishSpeed=THREE.MathUtils.clamp(tensionFishSpeed,-fishSpd*1.2,fishSpd*1.2);
  const flipChance={Junk:0.008,Common:0.012,Uncommon:0.018,Rare:0.025,Epic:0.035,Legendary:0.05};
  if(Math.random()<(flipChance[(pendingFish&&pendingFish.rarity)||"Common"]||0.02))tensionDir*=-1;
  tensionVal+=tensionFishSpeed*tensionDir*dt*60;
  tensionVal=THREE.MathUtils.clamp(tensionVal,0,100);
  if(tensionVal<=0||tensionVal>=100)tensionDir*=-1;
  const inZone=tensionVal>=zoneMin&&tensionVal<=zoneMax;
  // Grace period: bar tidak drain di awal supaya player bisa siap
  if(tensionGrace>0){ tensionGrace-=dt; tensionProgress=THREE.MathUtils.clamp(tensionProgress,0,100); }
  else {
    if(inZone)tensionProgress+=dt*18;else tensionProgress-=dt*12;
    // Extra drain when timeout expires
    if(tensionTimeout<=0)tensionProgress-=dt*20;
  }
  tensionProgress=THREE.MathUtils.clamp(tensionProgress,0,100);
  if(tensionProgress>=100){catchFish();return;}
  // Fish only escapes when progress bar is fully drained
  if(tensionProgress<=0){loseFish();return;}
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
  const rarity=(pendingFish&&pendingFish.rarity)||"Common";
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
  // Hitung berat berdasarkan rarity (gram)
  const WEIGHT_RANGE={Junk:[20,80],Common:[80,400],Uncommon:[300,900],Rare:[700,2500],Epic:[1500,6000],Legendary:[5000,20000]};
  const wr=WEIGHT_RANGE[pendingFish.rarity]||[50,500];
  const fishWeight=+(wr[0]+Math.random()*(wr[1]-wr[0])).toFixed(1);
  const cf={...pendingFish,id:Date.now()+Math.random(),weight:fishWeight};
  // Apply double coins event
  if(window._eventDoubleCoins>1) cf.price=Math.round(cf.price*window._eventDoubleCoins);
  inventory.fish.push(cf);
  inventory.fishLog.unshift({...cf,time:new Date().toLocaleTimeString()});
  if(inventory.fishLog.length>50)inventory.fishLog.pop();
  unlockFishEntry(cf.name);showFishNotification(cf);
  // Apply double XP event inside gainXP (already hooked)
  gainXP(cf.xp);
  catchSound.play().catch(()=>{});
  // Trigger gameplay systems
  if(typeof onFishCaught==='function') onFishCaught(cf);
  // Quest: sell tracking reset on catch (track in sellAllFish)
  stopFishingAll();pendingFish=null;
}
function loseFish(){
  tensionActive=false;fishBiting=false;
  document.getElementById("tensionContainer").style.display="none";
  // Reset streak
  if(catchStreak>0){
    if(catchStreak>=5)showMessage('💔 Streak '+catchStreak+' terputus!');
    catchStreak=0;
    if(typeof updateStreakOverhead==='function')updateStreakOverhead();
  }
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
  const allRods=Object.entries(rodDatabase).map(([id,r])=>({id,...r}));
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:10px;">🎣 Beli joran langsung di <b style='color:#ffdd88'>Rod Shop</b> di Main Island.</div>`
    +allRods.map(r=>{
      const owned=inventory.rods.includes(r.id),eq=inventory.equipped===r.id;
      return`<div class="rodRow${eq?" equipped":""}"        style="opacity:${owned?1:0.45};cursor:${owned?'pointer':'default'}"        onclick="${owned?`equipRod('${r.id}')`:''}">
        <div class="rodIcon">${r.icon}</div>
        <div class="rodInfo">
          <h4>${r.name}${eq?" <span style='color:#f1c40f'>✓ Equipped</span>":""}</h4>
          <p style="font-size:10px;color:${r.questOnly?'#f1c40f':'#999'}">${r.desc}</p>
          <div class="rodStats">⚡${r.speedMult}x 🍀${r.luckMult}x</div>
        </div>
        ${owned
          ? `<button class="rodEquipBtn ${eq?'eq':'neq'}">${eq?'Equipped':'Equip'}</button>`
          : r.questOnly
            ? `<span style="color:#f1c40f;font-size:10px;text-align:center;padding:4px">🏆<br>Quest</span>`
            : `<span style="color:#666;font-size:10px;text-align:center;padding:4px">🔒<br>Rod Shop</span>`
        }
      </div>`;
    }).join("");
}
function renderBaitTab(el){
  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:10px;">🪱 Beli umpan di <b style='color:#ffdd88'>Bait Shop</b> di pulau manapun. Tap untuk pilih.</div><div class="baitGrid">`
    +baitTypes.map(b=>{
      const count=b.infinite?"∞":inventory.bait[b.id]||0,eq=inventory.equippedBait===b.id;
      const canSelect=b.infinite||(count>0);
      return`<div class="baitCard${eq?" selected":""}${!canSelect?" locked":""}"
        style="opacity:${canSelect?1:0.4};cursor:${canSelect?'pointer':'default'}"
        onclick="${canSelect?`selectBait('${b.id}')`:``}">
        <div class="baitIcon">${b.icon}</div>
        <h4>${b.name}</h4>
        <p>${b.desc}</p>
        <div class="baitCount" style="color:${count===0&&!b.infinite?'#e74c3c':'#2ecc71'}">×${count}</div>
        ${!canSelect?`<div style="font-size:9px;color:#888;margin-top:3px">🏪 Beli di Bait Shop</div>`:""}
      </div>`;
    }).join("")+"</div>";
}
function renderFishTab(el){
  if(inventory.fish.length===0){
    el.innerHTML=`<div style="text-align:center;color:#aaa;padding:40px;font-size:14px;">🐟 No fish!<br><span style="font-size:12px">Pergi mancing dulu.</span></div>`;
    return;
  }
  const rc={Common:"#aaa",Uncommon:"#2ecc71",Rare:"#3498db",Epic:"#9b59b6",Legendary:"#f39c12",Junk:"#666"};
  const totalVal=inventory.fish.reduce((s,f)=>s+f.price,0);

  // Banner info jual — beda tampilan kalau premium aktif atau tidak
  const sellBanner=premiumActive
    ? `<div style="background:rgba(243,156,18,0.1);border:1px solid rgba(243,156,18,0.4);border-radius:10px;padding:10px 14px;margin-bottom:12px">
        <div style="font-size:11px;color:#f1c40f;font-weight:bold;margin-bottom:6px">👑 PREMIUM AKTIF</div>
        <button onclick="sellAllFishRemote()" style="width:100%;padding:9px;background:linear-gradient(135deg,#f39c12,#e67e22);border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:bold;cursor:pointer">💰 Remote Sell All (+💰${totalVal})</button>
      </div>`
    : `<div style="background:rgba(46,204,113,0.07);border:1px solid rgba(46,204,113,0.25);border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#aaa;line-height:1.7">
        🏪 <b style="color:#2ecc71">Jual di Sell Fish Shop</b> — toko tersedia di semua pulau<br>
        <button onclick="showPremiumModal()" style="display:block;width:100%;margin-top:8px;padding:8px;background:linear-gradient(135deg,#f39c12,#e67e22);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:bold;cursor:pointer">👑 Aktifkan Premium — Jual dari Mana Saja</button>
      </div>`;

  el.innerHTML=`<div style="color:#aaa;font-size:12px;margin-bottom:6px;">${inventory.fish.length} ikan · nilai total: <b style="color:#f1c40f">💰${totalVal}</b></div>`
    +sellBanner
    +`<div class="fishBagGrid">`
    +inventory.fish.map((f,i)=>`
      <div class="fishCard${heldFishIndex===i?" holding":""}">
        <div class="fishIcon">${f.emoji}</div><h4>${f.name}</h4>
        <div style="color:${rc[f.rarity]||"#aaa"};font-size:10px">${f.rarity}</div>
        <div style="font-size:9px;color:#7ecfff">${f.island||""}</div>
        <div style="font-size:9px;color:#f1c40f">⚖️${f.weight?(f.weight>=1000?(f.weight/1000).toFixed(2)+"kg":f.weight+"g"):"?"}</div>
        <div class="fishPrice">💰${f.price}</div>
        <button class="holdBtn ${heldFishIndex===i?"unhold":"hold"}" onclick="toggleHoldFish(${i})">${heldFishIndex===i?"Put down":"Hold 🤚"}</button>
      </div>`).join("")
    +`</div>`;
}
function equipRod(name){
  if(!inventory.rods.includes(name)){showMessage("You don't own this rod!");return;}
  inventory.equipped=name;inventory._lastSelected=name;
  if(rod.parent)rod.parent.remove(rod);
  rodPivot.add(rod);rod.position.set(0,0,0);rod.rotation.set(Math.PI/2,0,0);
  armR.rotation.x=-0.6;armR.rotation.z=-0.2;
  rod.material.color.setHex((rodDatabase[name]&&rodDatabase[name].color)||0x8b5a2b);
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
    heldFishIndex=-1;
    heldFishGroup.visible=false;
    heldJunkGroup.visible=false;
    heldFishOverhead.visible=false;
    document.getElementById("heldFishHUD").style.display="none";
    heldFishGroup.scale.setScalar(1.1);
    heldJunkGroup.scale.setScalar(1.0);
    heldFishOverhead.scale.setScalar(1.0);
    leftHandAnchor.position.set(0,-1.1,0);
    window._heldFishPose=null;
  } else {
    heldFishIndex=i;const f=inventory.fish[i];
    const fw=f.weight||100;
    const isJunk=(f.rarity==="Junk");
    const fc=new THREE.Color(f.color||"#5dade2");

    // ── Sembunyikan semua model dulu ──
    heldFishGroup.visible=false;
    heldJunkGroup.visible=false;
    heldFishOverhead.visible=false;

    if(isJunk){
      // ── JUNK: model kotak, satu tangan lemas ke bawah-depan ──
      heldJunkGroup.traverse(function(o){
        if(o.isMesh&&o.material&&o.material.color)o.material.color.set(fc);
      });
      const junkScale=Math.max(0.6,Math.min(1.6,0.6+fw/600));
      heldJunkGroup.scale.setScalar(junkScale);
      leftHandAnchor.position.set(0,-1.2,0.5);
      heldJunkGroup.rotation.set(-0.2,0.3,0.1);
      heldJunkGroup.visible=true;
      window._heldFishPose="junk";

    } else if(fw>=1000){
      // ── IKAN BESAR: kedua tangan ke atas, ikan di overhead ──
      heldFishOverhead.traverse(function(o){
        if(o.isMesh&&o.material&&!o.material.color.equals(new THREE.Color(0x111111)))o.material.color.set(fc);
      });
      // Scale berdasarkan berat — makin berat makin besar
      // 1kg=3.0, 5kg=5.0, 10kg=6.5, 20kg=8.0
      // Scale natural: 1kg=1.8x, 5kg=2.8x, 10kg=3.5x, 20kg=4.5x
      const bigScale=Math.max(1.8, Math.min(4.5, 1.4+Math.pow(fw/1000,0.38)*2.0));
      heldFishOverhead.scale.setScalar(bigScale);
      heldFishOverhead.rotation.set(0.1, 0, 0.1);
      heldFishOverhead.visible=true;
      window._heldFishPose="heavy";

    } else {
      // ── IKAN KECIL: satu tangan ke depan tunjukin ikan ──
      heldFishGroup.traverse(function(o){
        if(o.isMesh&&o.material&&!o.material.color.equals(new THREE.Color(0x111111)))o.material.color.set(fc);
      });
      const lightScale=Math.max(0.5,Math.min(1.2, 0.45+Math.pow(fw/500,0.4)*0.7));
      heldFishGroup.scale.setScalar(lightScale);
      leftHandAnchor.position.set(0,-1.0,0.7);
      heldFishGroup.rotation.set(0.1,0,0.15);
      heldFishGroup.visible=true;
      window._heldFishPose="light";
    }
    document.getElementById("heldFishHUD").style.display="block";
    const wLabel=f.weight?(f.weight>=1000?(f.weight/1000).toFixed(2)+"kg":f.weight+"g"):"";
    document.getElementById("heldFishHUD").textContent=f.emoji+" "+f.name+(wLabel?" ("+wLabel+")":"");
  }
  renderTab("fish");
}

// ═══ SELL/BUY ═══
function sellFish(){if(inventory.fish.length===0){showMessage("🚫 No fish!");return;}sellAllFish();}
function sellAllFish(){
  const soldCount=inventory.fish.length;
  let total=0;inventory.fish.forEach(f=>total+=f.price);
  coins+=total;inventory.fish=[];heldFishIndex=-1;heldFishGroup.visible=false;heldJunkGroup.visible=false;heldFishOverhead.visible=false;window._heldFishPose=null;
  document.getElementById("coinUI").textContent="💰 "+coins;
  document.getElementById("heldFishHUD").style.display="none";
  showMessage("🐟 Sold all! +💰"+total);
  if(typeof updateQuestProgress==="function"){
    updateQuestProgress("sell",soldCount,null);
    updateQuestProgress("coins",total,null);
  }
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

// ═══ PREMIUM MODAL ═══
let premiumActive=JSON.parse(localStorage.getItem('premiumActive')||'false');
// Sync premiumActive dengan window agar bisa diubah oleh multiplayer.js
Object.defineProperty(window,'premiumActive',{
  get:()=>premiumActive,
  set:(v)=>{premiumActive=v;if(inventoryOpen)renderTab('fish');},
  configurable:true
});
function showPremiumModal(){
  freezeInput=true;
  const existing=document.getElementById('premiumModal');
  if(existing)existing.remove();
  const m=document.createElement('div');
  m.id='premiumModal';
  Object.assign(m.style,{
    position:'fixed',top:'0',left:'0',width:'100%',height:'100%',
    background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',
    justifyContent:'center',zIndex:'99999',fontFamily:'Arial'
  });
  m.innerHTML=`
    <div style="background:linear-gradient(145deg,#1a1a2e,#16213e);border:2px solid #f39c12;border-radius:18px;padding:28px;max-width:340px;width:90%;text-align:center;color:#fff">
      <div style="font-size:32px;margin-bottom:8px">👑</div>
      <h2 style="color:#f1c40f;margin:0 0 6px">PREMIUM</h2>
      <p style="color:#aaa;font-size:13px;margin:0 0 18px">Jual ikan dari mana saja tanpa perlu ke toko!</p>
      <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:14px;margin-bottom:18px;text-align:left">
        <div style="font-size:12px;color:#2ecc71;margin-bottom:8px;font-weight:bold">✅ Fitur Premium:</div>
        <div style="font-size:12px;color:#ddd;line-height:2">
          💰 Remote Sell — jual ikan langsung dari Inventory<br>
          🚀 Lebih efisien, hemat waktu<br>
          ♾️ Berlaku selamanya (satu akun)
        </div>
      </div>
      <div style="background:rgba(243,156,18,0.12);border:1px solid rgba(243,156,18,0.3);border-radius:10px;padding:12px;margin-bottom:18px">
        <div style="font-size:11px;color:#aaa;margin-bottom:4px">Harga</div>
        <div style="font-size:26px;font-weight:bold;color:#f1c40f">Rp 15.000</div>
        <div style="font-size:11px;color:#888">Bayar sekali, selamanya</div>
      </div>
      <div style="font-size:11px;color:#888;margin-bottom:16px">
        📩 Hubungi admin untuk aktivasi:<br>
        <b style="color:#aaa">Discord / WA yang tersedia</b>
      </div>
      ${premiumActive
        ? `<div style="background:rgba(46,204,113,0.15);border:1px solid #2ecc71;border-radius:10px;padding:12px;margin-bottom:14px;color:#2ecc71;font-weight:bold">✅ Premium Aktif!</div>`
        : `<button onclick="activatePremiumCode()" style="width:100%;padding:12px;background:linear-gradient(135deg,#f39c12,#e67e22);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:bold;cursor:pointer;margin-bottom:10px">🔑 Masukkan Kode Aktivasi</button>`
      }
      <button onclick="closePremiumModal()" style="width:100%;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#aaa;font-size:13px;cursor:pointer">Tutup</button>
    </div>`;
  document.body.appendChild(m);
}
function closePremiumModal(){
  const m=document.getElementById('premiumModal');
  if(m)m.remove();
  freezeInput=false;
}
function activatePremiumCode(){
  // Premium sekarang hanya bisa diaktifkan oleh Owner melalui Owner Panel
  showMessage('📩 Hubungi Owner untuk mengaktifkan Premium!');
}
function sellAllFishRemote(){
  if(!premiumActive){showPremiumModal();return;}
  if(inventory.fish.length===0){showMessage('🚫 No fish!');return;}
  let total=0;inventory.fish.forEach(f=>total+=f.price);
  coins+=total;inventory.fish=[];heldFishIndex=-1;
  heldFishGroup.visible=false;heldJunkGroup.visible=false;
  heldFishOverhead.visible=false;window._heldFishPose=null;
  document.getElementById('coinUI').textContent='💰 '+coins;
  document.getElementById('heldFishHUD').style.display='none';
  showMessage('👑 Remote Sell! +💰'+total);
  if(inventoryOpen)renderTab('fish');saveProgress();
}

// ═══════════════════════════════════════════════════════════
// 🎮 GAMEPLAY SYSTEMS — Daily Quest · Streak · Combo · Events
// ═══════════════════════════════════════════════════════════

// ─── STREAK & COMBO ────────────────────────────────────────
let catchStreak=0, catchCombo=0, comboTimer=0, comboActive=false;
let lastCatchTime=0, streakBest=parseInt(localStorage.getItem('streakBest')||'0');
const COMBO_WINDOW=15; // detik untuk combo aktif

function onFishCaught(fish){
  const now=Date.now()/1000;
  catchStreak++;
  // Combo: tangkap ikan berikutnya dalam COMBO_WINDOW detik
  if(comboActive && now-lastCatchTime<COMBO_WINDOW){
    catchCombo++;
  } else {
    catchCombo=1; comboActive=true;
  }
  lastCatchTime=now;
  comboTimer=COMBO_WINDOW;
  if(catchStreak>streakBest){
    streakBest=catchStreak;
    localStorage.setItem('streakBest',streakBest);
  }
  // Bonus koin dari combo
  const comboMult=Math.min(catchCombo,5); // max 5x
  if(catchCombo>=2){
    const bonus=Math.floor(fish.price*(comboMult-1)*0.5);
    if(bonus>0){
      coins+=bonus;
      const coinUI=document.getElementById('coinUI');
      if(coinUI)coinUI.textContent='💰 '+coins;
      showComboEffect(catchCombo,bonus);
    }
  }
  // Cek quest progress
  updateQuestProgress('catch',1,fish);
  updateQuestProgress('rarity',1,fish);
  // Cek achievements
  checkAchievements(fish);
}

function updateComboTimer(dt){
  if(!comboActive)return;
  comboTimer-=dt;
  if(comboTimer<=0){
    comboActive=false;
    catchCombo=0;
    updateComboUI();
  }
  updateComboUI();
}

// ─── STREAK OVERHEAD ───────────────────────────────────────
let _streakEl=null;
function updateStreakOverhead(){
  if(!_streakEl){
    _streakEl=document.createElement('div');
    _streakEl.id='streakOverhead';
    Object.assign(_streakEl.style,{
      position:'fixed',pointerEvents:'none',zIndex:'55',
      fontSize:'11px',fontWeight:'bold',textAlign:'center',
      textShadow:'0 1px 4px rgba(0,0,0,0.9)',
      display:'none',transition:'opacity 0.3s',
      lineHeight:'1.3'
    });
    document.body.appendChild(_streakEl);
  }
  if(catchStreak<3){_streakEl.style.display='none';return;}
  // Project player head position ke screen
  if(!window.camera||!window.player)return;
  const worldPos=new THREE.Vector3();
  player.getWorldPosition(worldPos);
  worldPos.y+=9; // di atas kepala
  const v=worldPos.clone().project(camera);
  if(v.z>1||v.z<-1){_streakEl.style.display='none';return;}
  const sx=(v.x*0.5+0.5)*window.innerWidth;
  const sy=(-v.y*0.5+0.5)*window.innerHeight;
  _streakEl.style.left=sx+'px';
  _streakEl.style.top=sy+'px';
  _streakEl.style.transform='translateX(-50%)';
  _streakEl.style.display='block';
  // Warna berdasarkan streak level
  const col=catchStreak>=20?'#f39c12':catchStreak>=10?'#e74c3c':catchStreak>=5?'#9b59b6':'#2ecc71';
  const emoji=catchStreak>=20?'🔥':catchStreak>=10?'💥':catchStreak>=5?'⚡':'✨';
  _streakEl.style.color=col;
  _streakEl.innerHTML=`${emoji} ${catchStreak} Streak`;
}

let _comboEl=null;
function updateComboUI(){
  if(!_comboEl){
    _comboEl=document.createElement('div');
    _comboEl.id='comboUI';
    Object.assign(_comboEl.style,{
      position:'fixed',bottom:'180px',right:'16px',
      background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',
      border:'1px solid rgba(255,255,255,0.15)',
      borderRadius:'12px',padding:'6px 12px',
      color:'#fff',fontSize:'12px',zIndex:'50',
      display:'none',textAlign:'right',
      transition:'opacity 0.3s'
    });
    document.body.appendChild(_comboEl);
  }
  if(!comboActive||catchCombo<2){_comboEl.style.display='none';return;}
  _comboEl.style.display='block';
  const pct=Math.max(0,comboTimer/COMBO_WINDOW);
  const comboColor=catchCombo>=5?'#f39c12':catchCombo>=3?'#9b59b6':'#2ecc71';
  _comboEl.innerHTML=`<span style="color:${comboColor};font-weight:bold;font-size:14px">🔥×${catchCombo} COMBO</span><br>
    <div style="background:rgba(255,255,255,0.15);border-radius:4px;height:3px;margin-top:3px">
      <div style="background:${comboColor};height:3px;border-radius:4px;width:${pct*100}%;transition:width 0.3s"></div>
    </div>`;
}

function showComboEffect(combo,bonus){
  const el=document.createElement('div');
  el.textContent=(combo>=5?'🔥':'⚡')+' COMBO x'+combo+' +💰'+bonus+' BONUS!';
  Object.assign(el.style,{
    position:'fixed',top:'38%',left:'50%',transform:'translateX(-50%)',
    background:'linear-gradient(135deg,rgba(243,156,18,0.9),rgba(230,126,34,0.9))',
    color:'#fff',padding:'8px 20px',borderRadius:'20px',
    fontSize:'14px',fontWeight:'bold',zIndex:'999',
    animation:'popAnim 0.4s ease',pointerEvents:'none'
  });
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2000);
}

// ─── DAILY QUEST ────────────────────────────────────────────
const QUEST_POOL=[
  {id:'catch10',   title:'Nelayan Rajin',   desc:'Tangkap 10 ikan hari ini',   type:'catch',   target:10,  reward:120,  icon:'🎣'},
  {id:'catch25',   title:'Nelayan Hebat',   desc:'Tangkap 25 ikan hari ini',   type:'catch',   target:25,  reward:300,  icon:'🎣'},
  {id:'catchRare', title:'Pemburu Langka',  desc:'Tangkap 3 ikan Rare+',       type:'rarity',  target:3,   reward:400,  icon:'💎', minRarity:'Rare'},
  {id:'catchEpic', title:'Pemburu Epik',    desc:'Tangkap 1 ikan Epic+',        type:'rarity',  target:1,   reward:500,  icon:'👑', minRarity:'Epic'},
  {id:'earn2000',  title:'Pedagang Ikan',   desc:'Kumpulkan 2000 koin hari ini',type:'coins',   target:2000,reward:150,  icon:'💰'},
  {id:'earn5000',  title:'Pengusaha Kaya',  desc:'Kumpulkan 5000 koin hari ini',type:'coins',   target:5000,reward:400,  icon:'💰'},
  {id:'combo3',    title:'Combo Master',    desc:'Capai combo x3',             type:'combo',   target:3,   reward:180,  icon:'🔥'},
  {id:'visitIsle', title:'Penjelajah',      desc:'Kunjungi 3 pulau berbeda',   type:'island',  target:3,   reward:250,  icon:'🗺️'},
  {id:'sell10',    title:'Penjual Ulung',   desc:'Jual 10 ikan di toko',       type:'sell',    target:10,  reward:100,  icon:'🏪'},
];
const RARITY_ORDER=['Junk','Common','Uncommon','Rare','Epic','Legendary'];
let _dailyQuestData=null;
let _questVisitedIslands=new Set();

function getTodayStr(){
  const d=new Date();
  return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
}

function initDailyQuest(){
  const today=getTodayStr();
  const raw=localStorage.getItem('dailyQuest_v1');
  if(raw){
    try{
      _dailyQuestData=JSON.parse(raw);
      if(_dailyQuestData.date!==today){
        _dailyQuestData=null; // reset hari baru
      }
    }catch(e){_dailyQuestData=null;}
  }
  if(!_dailyQuestData){
    // Pilih 3 quest acak untuk hari ini
    const shuffled=[...QUEST_POOL].sort(()=>Math.random()-0.5);
    _dailyQuestData={
      date:today,
      quests:shuffled.slice(0,3).map(q=>({...q,progress:0,done:false}))
    };
    saveDailyQuest();
  }
  buildQuestUI();
}

function saveDailyQuest(){
  localStorage.setItem('dailyQuest_v1',JSON.stringify(_dailyQuestData));
}

function updateQuestProgress(type,amount,fishOrData){
  if(!_dailyQuestData)return;
  let changed=false;
  _dailyQuestData.quests.forEach(q=>{
    if(q.done)return;
    let matches=false;
    if(q.type===type){
      if(type==='rarity'&&q.minRarity&&fishOrData){
        const fIdx=RARITY_ORDER.indexOf(fishOrData.rarity);
        const mIdx=RARITY_ORDER.indexOf(q.minRarity);
        matches=fIdx>=mIdx;
      } else {
        matches=true;
      }
    }
    if(type==='combo'&&q.type==='combo'){
      // Langsung set progress ke catchCombo
      if(catchCombo>=q.target){
        q.progress=q.target;
        matches=false; // already set
      }
    }
    if(matches){
      q.progress=Math.min(q.progress+amount,q.target);
    }
    if(q.progress>=q.target&&!q.done){
      q.done=true;
      coins+=q.reward;
      const coinUI=document.getElementById('coinUI');
      if(coinUI)coinUI.textContent='💰 '+coins;
      showQuestComplete(q);
      changed=true;
    } else if(matches){
      changed=true;
    }
  });
  if(changed){saveDailyQuest();refreshQuestUI();}
}

function showQuestComplete(q){
  const el=document.createElement('div');
  el.innerHTML=q.icon+' <b>Quest Selesai!</b><br>'+q.title+'<br><span style="color:#f1c40f">+💰'+q.reward+'</span>';
  Object.assign(el.style,{
    position:'fixed',top:'20%',left:'50%',transform:'translateX(-50%)',
    background:'linear-gradient(135deg,rgba(39,174,96,0.95),rgba(46,204,113,0.95))',
    color:'#fff',padding:'14px 24px',borderRadius:'16px',
    fontSize:'14px',fontWeight:'bold',zIndex:'999',
    textAlign:'center',animation:'popAnim 0.4s ease',pointerEvents:'none',
    boxShadow:'0 4px 20px rgba(46,204,113,0.4)'
  });
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),3500);
  saveProgress();
}

let _questPanelEl=null;
function buildQuestUI(){
  if(_questPanelEl)_questPanelEl.remove();
  _questPanelEl=document.createElement('div');
  _questPanelEl.id='questPanel';
  Object.assign(_questPanelEl.style,{
    position:'fixed',left:'12px',top:'50%',transform:'translateY(-50%)',
    background:'rgba(5,10,20,0.82)',backdropFilter:'blur(8px)',
    border:'1px solid rgba(255,255,255,0.12)',borderRadius:'14px',
    padding:'10px 12px',zIndex:'50',minWidth:'170px',
    display:'none'
  });
  // Toggle btn
  const fab=document.createElement('div');
  fab.id='questFab';
  fab.textContent='📋';
  fab.title='Daily Quest';
  Object.assign(fab.style,{
    position:'fixed',left:'12px',top:'50%',transform:'translateY(-50%)',
    width:'40px',height:'40px',background:'rgba(0,0,0,0.65)',
    border:'1px solid rgba(255,255,255,0.18)',borderRadius:'10px',
    display:'flex',alignItems:'center',justifyContent:'center',
    cursor:'pointer',zIndex:'60',fontSize:'18px',userSelect:'none'
  });
  fab.onclick=()=>{
    const showing=_questPanelEl.style.display!=='none';
    _questPanelEl.style.display=showing?'none':'block';
    fab.style.left=showing?'12px':'186px';
  };
  document.body.appendChild(fab);
  document.body.appendChild(_questPanelEl);
  refreshQuestUI();
}

function refreshQuestUI(){
  if(!_questPanelEl||!_dailyQuestData)return;
  const allDone=_dailyQuestData.quests.every(q=>q.done);
  _questPanelEl.innerHTML=`<div style="color:#f1c40f;font-size:12px;font-weight:bold;margin-bottom:8px">📋 Daily Quest</div>`
    +_dailyQuestData.quests.map(q=>{
      const pct=Math.min(100,(q.progress/q.target)*100);
      const col=q.done?'#2ecc71':pct>50?'#f39c12':'#aaa';
      return`<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.07)">
        <div style="color:${col};font-size:11px;font-weight:bold">${q.icon} ${q.title}${q.done?' ✅':''}</div>
        <div style="color:#888;font-size:10px;margin:2px 0">${q.desc}</div>
        <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:5px">
          <div style="background:${col};height:5px;border-radius:4px;width:${pct}%;transition:width 0.4s"></div>
        </div>
        <div style="color:#666;font-size:9px;margin-top:1px">${q.progress}/${q.target} · 💰${q.reward}</div>
      </div>`;
    }).join('')
    +(allDone?'<div style="color:#2ecc71;font-size:11px;text-align:center;padding:4px 0">🎉 Semua quest selesai!</div>':'');
}

// ─── RANDOM WORLD EVENTS ─────────────────────────────────────
const WORLD_EVENTS=[
  {id:'goldRush',   name:'⭐ Ikan Emas Muncul!',  desc:'Legendary fish rate 3x selama 2 menit!', dur:120, effect:()=>{window._eventLegendaryBoost=3;},    end:()=>{window._eventLegendaryBoost=1;}},
  {id:'baitFree',   name:'🪱 Umpan Gratis!',       desc:'Semua umpan unlimited selama 90 detik',  dur:90,  effect:()=>{window._eventFreeBait=true;},        end:()=>{window._eventFreeBait=false;}},
  {id:'doubleXP',   name:'⭐ Double XP!',           desc:'XP 2x selama 2 menit',                  dur:120, effect:()=>{window._eventDoubleXP=2;},           end:()=>{window._eventDoubleXP=1;}},
  {id:'fishFrenzy', name:'🐟 Fish Frenzy!',         desc:'Ikan muncul 2x lebih cepat selama 90 detik',dur:90,effect:()=>{window._eventFishFrenzy=true;},  end:()=>{window._eventFishFrenzy=false;}},
  {id:'coinRain',   name:'💰 Hujan Koin!',          desc:'Harga jual ikan 2x selama 2 menit',      dur:120, effect:()=>{window._eventDoubleCoins=2;},       end:()=>{window._eventDoubleCoins=1;}},
];
let _activeEvent=null;
let _eventTimer=0;
let _nextEventIn=180+Math.random()*240; // event pertama 3-7 menit

function updateWorldEvents(dt){
  if(_activeEvent){
    _eventTimer-=dt;
    updateEventBar();
    if(_eventTimer<=0){
      _activeEvent.end();
      showEventEnded(_activeEvent);
      _activeEvent=null;
      _nextEventIn=240+Math.random()*300; // next event 4-9 menit
    }
    return;
  }
  _nextEventIn-=dt;
  if(_nextEventIn<=0){
    triggerRandomEvent();
  }
}

function triggerRandomEvent(){
  const ev=WORLD_EVENTS[Math.floor(Math.random()*WORLD_EVENTS.length)];
  _activeEvent=ev;
  _eventTimer=ev.dur;
  ev.effect();
  showEventBanner(ev);
  updateQuestProgress('event',1,null);
}

let _evBar=null;
function updateEventBar(){
  if(!_evBar){
    _evBar=document.createElement('div');
    _evBar.id='worldEventBar';
    Object.assign(_evBar.style,{
      position:'fixed',top:'56px',left:'50%',transform:'translateX(-50%)',
      background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',
      border:'1px solid rgba(243,156,18,0.4)',borderRadius:'20px',
      padding:'5px 16px',zIndex:'60',display:'flex',
      alignItems:'center',gap:'8px',maxWidth:'80vw'
    });
    document.body.appendChild(_evBar);
  }
  if(!_activeEvent){_evBar.style.display='none';return;}
  _evBar.style.display='flex';
  const pct=(_eventTimer/_activeEvent.dur)*100;
  _evBar.innerHTML=`<span style="font-size:13px">${_activeEvent.name}</span>
    <div style="background:rgba(255,255,255,0.15);border-radius:6px;height:6px;width:80px">
      <div style="background:#f39c12;height:6px;border-radius:6px;width:${pct}%;transition:width 1s"></div>
    </div>
    <span style="font-size:11px;color:#aaa">${Math.ceil(_eventTimer)}s</span>`;
}

function showEventBanner(ev){
  const el=document.createElement('div');
  el.innerHTML=`<div style="font-size:20px">${ev.name}</div><div style="font-size:12px;opacity:0.85;margin-top:4px">${ev.desc}</div>`;
  Object.assign(el.style,{
    position:'fixed',top:'15%',left:'50%',transform:'translateX(-50%)',
    background:'linear-gradient(135deg,rgba(243,156,18,0.95),rgba(230,126,34,0.95))',
    color:'#fff',padding:'16px 28px',borderRadius:'18px',
    fontWeight:'bold',zIndex:'999',textAlign:'center',
    animation:'popAnim 0.4s ease',pointerEvents:'none',
    boxShadow:'0 4px 24px rgba(243,156,18,0.5)'
  });
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),4000);
}

function showEventEnded(ev){
  showMessage('⏰ '+ev.name.split(' ').slice(1).join(' ')+' berakhir');
}

// ─── ACHIEVEMENTS ─────────────────────────────────────────────
const ACHIEVEMENTS=[
  {id:'first_fish',   name:'Pemancing Pertama',  desc:'Tangkap ikan pertamamu',       check:(f,s)=>s.totalCatch>=1,          reward:50,   icon:'🎣'},
  {id:'catch_50',     name:'Nelayan Berpengalaman',desc:'Tangkap 50 ikan',             check:(f,s)=>s.totalCatch>=50,         reward:200,  icon:'🐟'},
  {id:'catch_200',    name:'Master Nelayan',      desc:'Tangkap 200 ikan',             check:(f,s)=>s.totalCatch>=200,        reward:600,  icon:'🏆'},
  {id:'legendary',    name:'Pemburu Legenda',     desc:'Tangkap ikan Legendary',       check:(f,s)=>f&&f.rarity==='Legendary',reward:400,  icon:'⚡'},
  {id:'streak_10',    name:'Streak 10',           desc:'Tangkap 10 ikan berturut',     check:(f,s)=>catchStreak>=10,          reward:300,  icon:'🔥'},
  {id:'combo_5',      name:'Combo King',          desc:'Capai combo x5',               check:(f,s)=>catchCombo>=5,            reward:250,  icon:'💥'},
  {id:'rich',         name:'Orang Kaya',          desc:'Kumpulkan 100,000 koin',       check:(f,s)=>coins>=100000,            reward:800,  icon:'💎'},
  {id:'explorer',     name:'Penjelajah',          desc:'Kunjungi semua pulau',         check:(f,s)=>s.islandsVisited>=7,      reward:500,  icon:'🗺️'},
];
let _earnedAch=new Set(JSON.parse(localStorage.getItem('achievements_v1')||'[]'));
let _achStats={totalCatch:parseInt(localStorage.getItem('achStat_totalCatch')||'0')};

function checkAchievements(fish){
  _achStats.totalCatch++;
  localStorage.setItem('achStat_totalCatch',_achStats.totalCatch);
  ACHIEVEMENTS.forEach(a=>{
    if(_earnedAch.has(a.id))return;
    if(a.check(fish,_achStats)){
      _earnedAch.add(a.id);
      localStorage.setItem('achievements_v1',JSON.stringify([..._earnedAch]));
      coins+=a.reward;
      const coinUI=document.getElementById('coinUI');
      if(coinUI)coinUI.textContent='💰 '+coins;
      showAchievementToast(a);
      saveProgress();
    }
  });
}

function showAchievementToast(a){
  const el=document.createElement('div');
  el.innerHTML=`<div style="font-size:11px;color:#f1c40f;letter-spacing:1px">ACHIEVEMENT UNLOCKED</div>
    <div style="font-size:16px;margin:4px 0">${a.icon} ${a.name}</div>
    <div style="font-size:11px;opacity:0.8">${a.desc}</div>
    <div style="font-size:12px;color:#f1c40f;margin-top:4px">+💰${a.reward}</div>`;
  Object.assign(el.style,{
    position:'fixed',bottom:'120px',right:'12px',
    background:'linear-gradient(135deg,rgba(15,25,50,0.97),rgba(20,40,80,0.97))',
    border:'1px solid rgba(241,196,15,0.5)',
    color:'#fff',padding:'12px 16px',borderRadius:'14px',
    fontSize:'13px',zIndex:'999',textAlign:'center',
    animation:'popAnim 0.4s ease',pointerEvents:'none',
    boxShadow:'0 4px 20px rgba(241,196,15,0.3)',maxWidth:'200px'
  });
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),4000);
}

// ─── INIT + LOOP HOOK ─────────────────────────────────────────
window._eventLegendaryBoost=1;
window._eventDoubleXP=1;
window._eventDoubleCoins=1;
window._eventFreeBait=false;
window._eventFishFrenzy=false;

// Init systems
setTimeout(()=>{
  initDailyQuest();
},1000);

// Hook gainXP for doubleXP event
const _origGainXP=window.gainXP;
if(typeof _origGainXP==='function'){
  window.gainXP=function(amt){
    _origGainXP(Math.round(amt*(window._eventDoubleXP||1)));
  };
}

// ─── INJECT ke MAIN LOOP via updatePerformance ────────────────
const _origUpdatePerf=updatePerformance;
window._gameplayDt=0;
function updatePerformance(dt,time){
  _origUpdatePerf(dt,time);
  window._gameplayDt=dt;
  updateComboTimer(dt);
  updateWorldEvents(dt);
  // Track islands visited
  if(typeof getPlayerIsland==='function'){
    const isle=getPlayerIsland();
    if(isle){
      _questVisitedIslands.add(isle);
      _achStats.islandsVisited=_questVisitedIslands.size;
      if(_questVisitedIslands.size>0) updateQuestProgress('island',0,null);
    }
  }
}


// ═══ NOTIFICATIONS ═══
function showFishNotification(fish){
  const el=document.getElementById("fishNotify");
  el.style.display="block";el.style.color=fish.color;
  const _wLabel=fish.weight?(fish.weight>=1000?(fish.weight/1000).toFixed(2)+"kg":fish.weight+"g"):"";el.textContent=fish.emoji+" "+fish.name+" ("+fish.rarity+")"+(_wLabel?" ⚖️"+_wLabel:"")+" 🏝️"+(fish.island||"")+" +💰"+fish.price;
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
  currentWeather=w;
  // Sky override only during daytime (day/night handles night sky)
  if(dayTime>0.25&&dayTime<0.75){
    scene.background=new THREE.Color(w.skyColor);scene.fog.color=new THREE.Color(w.fogColor);
  }
  document.getElementById("weatherUI").textContent=w.icon+" "+w.name;
  showEventNotification(w.icon+" "+w.name+" | Speed:"+w.speedMult+"x Luck:"+w.luckMult+"x");
  // Only owner syncs weather; skip if this call itself came from a server sync
  if(!window._weatherSyncFromServer&&window.MP&&window.MP.isActive()&&localStorage.getItem("playerName")===(window.OWNER_NAME_FOR_SYNC||"Varz444"))window.MP.syncWeather(w.name);
}
function updateWeather(dt){
  // Non-owner: cuaca diatur oleh owner via Firebase, jangan random sendiri
  if(window.MP&&window.MP.isActive()&&localStorage.getItem("playerName")!==(window.OWNER_NAME_FOR_SYNC||"Varz444"))return;
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
  // Find nearest harbour
  nearHarbour=false;
  let _nearestHD=null,_nearestHDist=99999;
  HARBOUR_DEFS.forEach(hd=>{
    const hPos=new THREE.Vector3(hd.x,0,hd.z);
    const _d=pwp.distanceTo(hPos);
    if(_d<22&&_d<_nearestHDist){_nearestHDist=_d;nearHarbour=true;currentHarbourId=hd.id;_nearestHD=hd;}
  });
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
  const pp=new THREE.Vector3();player.getWorldPosition(pp);
  // Main island NPCs — hanya animasi kalau dekat (<200 unit)
  const mainDist=pp.length(); // jarak dari origin
  if(mainDist<200){
    npcRoot.rotation.y=Math.sin(time*.002)*.1;
    rodNpcRoot.rotation.y=Math.sin(time*.0022+1)*.1;
    baitNpcRoot.rotation.y=Math.sin(time*.0018+2)*.1;
    jsNpcRoot.rotation.y=Math.sin(time*.002+3)*.1;
    npcGroup.lookAt(pp.x,npcGroup.position.y,pp.z);
    rodNpcGroup.lookAt(pp.x,rodNpcGroup.position.y,pp.z);
    baitNpcGroup.lookAt(pp.x,baitNpcGroup.position.y,pp.z);
    jsNpcGroup.lookAt(pp.x,jsNpcGroup.position.y,pp.z);
  }
  // Other island NPCs — hanya animasi yang paling dekat
  allIslandNpcs.forEach(({g,r},i)=>{
    const d=pp.distanceTo(g.position);
    if(d>180)return; // skip kalau jauh
    r.rotation.y=Math.sin(time*.002+i*0.7)*.12;
    g.lookAt(pp.x,g.position.y,pp.z);
  });
}

// ═══ SAVE/LOAD ═══
function saveProgress(){
  const d={coins,playerXP,playerLevel,fishLog:inventory.fishLog,rods:inventory.rods,equipped:inventory.equipped,bait:inventory.bait,equippedBait:inventory.equippedBait,fish:inventory.fish,jetskiOwned};
  try{localStorage.setItem("fishingSave_v5",JSON.stringify(d));localStorage.setItem("unlockedFish_v5",JSON.stringify([...unlockedFish]));showMessage("💾 Saved!");}catch(e){}
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
    if(d.fishLog)d.fishLog.forEach(function(f){if(f&&f.name)unlockedFish.add(f.name);});
    try{localStorage.setItem("unlockedFish_v5",JSON.stringify([...unlockedFish]));}catch(e){}
    // weather & time tidak disimpan — selalu mulai dari default
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
document.getElementById("settingsBtn").addEventListener("click",()=>{document.getElementById("menuUI").style.display="none";gamePaused=false;openSettings();});
document.getElementById("saveBtn").addEventListener("click",saveProgress);
document.getElementById("quitBtn").addEventListener("click",()=>{if(confirm("Keluar dari game? Progress akan disimpan.")){saveProgress();try{window.open('','_self');window.close();}catch(e){location.href='about:blank';}}});
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
  if(k==="b")toggleFishIndex();

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
  loadGameProgress();loadSettings();gameStarted=true;window.gameStarted=true;
  if(!inventory.equipped)equipRod("FishingRod");
  showMessage("🎣 Selamat datang! [I] Inventory  [B] Index  [Shift] Run");
  adaptUI();
}
simulateLoading();

// ═══ SETTINGS ═══
let settingsOpen=false;
let gameSettings={shadows:true,waterAnim:true,volume:80,minimap:true,fps:false};
function renderProfileStats(){
  const el=document.getElementById('profileStats');
  if(!el)return;
  const rod=rodDatabase[inventory.equipped]||rodDatabase.FishingRod;
  const luck=rod.luckMult||1;
  const speed=rod.speedMult||1;
  const control=rod.controlWidth||20;
  const totalFish=(typeof _achStats!=='undefined'?_achStats.totalCatch:0);
  const best=(typeof streakBest!=='undefined'?streakBest:0);
  const achCount=(typeof _earnedAch!=='undefined'?_earnedAch.size:0);
  const prem=(typeof premiumActive!=='undefined'&&premiumActive)?'👑 Aktif':'—';
  const statCard=(icon,label,val,color)=>
    `<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px">
      <div style="font-size:18px">${icon}</div>
      <div style="color:${color||'#fff'};font-size:16px;font-weight:bold;margin:2px 0">${val}</div>
      <div style="color:#777;font-size:10px">${label}</div>
    </div>`;
  el.innerHTML=
    statCard('🍀','Total Luck',luck+'x','#2ecc71')+
    statCard('⚡','Speed',speed+'x','#3498db')+
    statCard('🎯','Zona Kontrol',control+'%','#f39c12')+
    statCard('🎣','Ikan Ditangkap',totalFish,'#fff')+
    statCard('🔥','Streak Terbaik',best,'#e74c3c')+
    statCard('🏆','Achievement',achCount+'/'+((typeof ACHIEVEMENTS!=='undefined')?ACHIEVEMENTS.length:'?'),'#f1c40f')+
    statCard('🎣','Rod Aktif',rod.name,'#aaa')+
    statCard('👑','Premium',prem,'#f39c12');
}
function openSettings(){
  settingsOpen=true;
  const el=document.getElementById("settingsMenu");
  if(el){el.style.display="flex";el.classList.add("show");}
  // Sync warna baju
  const sc=document.getElementById("settingsShirtColor");
  const _sc2=document.getElementById("shirtColor2")||document.getElementById("shirtColor");
  if(sc&&_sc2)sc.value=_sc2.value;
  // Sync volume
  const sv=document.getElementById("settingsVolume");if(sv)sv.value=gameSettings.volume;
  const svl=document.getElementById("settingsVolumeLabel");if(svl)svl.textContent=gameSettings.volume+"%";
  // Sync toggles (safe — elemen mungkin tidak ada di HTML baru)
  const safeCheck=(id,val)=>{const e=document.getElementById(id);if(e&&'checked' in e)e.checked=val;};
  safeCheck("settingsShadows",gameSettings.shadows);
  safeCheck("settingsWaterAnim",gameSettings.waterAnim);
  safeCheck("settingsMinimap",gameSettings.minimap);
  safeCheck("settingsFPS",gameSettings.fps);
  // Render profile stats
  renderProfileStats();
  freezeInput=true;
}
function closeSettings(){
  settingsOpen=false;
  const el=document.getElementById("settingsMenu");
  if(el){el.style.display="none";el.classList.remove("show");}
  freezeInput=false;
}

// ─── HUD EDITOR ───────────────────────────────────────────
let _hudEditActive=false;
// Semua elemen HUD yang bisa digeser
const _hudDraggables=[
  'castBtn','reelBtn','jumpBtn','sellBtn',
  'fishIndexBtn','openRodShopBtn','invBtn','runBtn','mountJetskiBtn'
];

function toggleHudEdit(){
  _hudEditActive=!_hudEditActive;
  const hint=document.getElementById('hudEditHint');
  const btn=document.getElementById('hudEditBtn');
  if(btn)btn.textContent=_hudEditActive?'✅ Selesai Edit HUD':'✏️ Edit HUD';
  if(hint)hint.style.display=_hudEditActive?'block':'none';

  _hudDraggables.forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    if(_hudEditActive){
      // Konversi posisi saat ini ke fixed+left+top sebelum attach drag
      const r=el.getBoundingClientRect();
      el.style.position='fixed';
      el.style.left=r.left+'px';
      el.style.top=r.top+'px';
      el.style.right='auto';
      el.style.bottom='auto';
      el.style.margin='0';
      el.style.outline='2px dashed rgba(52,152,219,0.9)';
      el.style.boxShadow='0 0 10px rgba(52,152,219,0.5)';
      el.style.cursor='move';
      el.style.zIndex='9999';
      _makeDraggable(el);
    } else {
      el.style.outline='';
      el.style.boxShadow='';
      el.style.cursor='';
      el.style.zIndex='';
      _saveHudPos(id,el);
    }
  });

  if(_hudEditActive){
    // Tutup settings, biarkan player drag di layar game
    const sm=document.getElementById('settingsMenu');
    if(sm){sm.style.display='none';sm.classList.remove('show');}
    settingsOpen=false;
    freezeInput=false;
    freezePlayer=false;
    showMessage('✏️ Mode Edit HUD aktif — drag tombol ke posisi yang diinginkan');
  } else {
    showMessage('✅ Posisi HUD disimpan!');
  }
}

function resetHudPositions(){
  _hudDraggables.forEach(id=>{
    localStorage.removeItem('hudPos_'+id);
    const el=document.getElementById(id);
    if(!el)return;
    // Hapus semua override inline style
    el.style.cssText='';
  });
  showMessage('↺ HUD direset ke default');
}

function _saveHudPos(id,el){
  const r=el.getBoundingClientRect();
  // Simpan sebagai persen viewport agar responsive di semua ukuran layar
  const data={
    leftPct: (r.left/window.innerWidth)*100,
    topPct:  (r.top/window.innerHeight)*100,
    w: window.innerWidth,
    h: window.innerHeight
  };
  localStorage.setItem('hudPos_'+id, JSON.stringify(data));
}

function _loadHudPositions(){
  _hudDraggables.forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const raw=localStorage.getItem('hudPos_'+id);
    if(!raw)return;
    try{
      const d=JSON.parse(raw);
      // Scale posisi ke ukuran layar saat ini
      const x=(d.leftPct/100)*window.innerWidth;
      const y=(d.topPct/100)*window.innerHeight;
      // Clamp agar tidak keluar layar
      const r=el.getBoundingClientRect();
      const safeX=Math.max(0,Math.min(x,window.innerWidth-(r.width||60)));
      const safeY=Math.max(0,Math.min(y,window.innerHeight-(r.height||60)));
      el.style.position='fixed';
      el.style.left=safeX+'px';
      el.style.top=safeY+'px';
      el.style.right='auto';
      el.style.bottom='auto';
      el.style.margin='0';
    }catch(e){}
  });
}

function _makeDraggable(el){
  if(el._dragBound)return;
  el._dragBound=true;
  let startX,startY,origLeft,origTop;

  function getClient(e){ return e.touches?e.touches[0]:e; }

  function onDown(e){
    if(!_hudEditActive)return;
    const c=getClient(e);
    startX=c.clientX; startY=c.clientY;
    origLeft=parseFloat(el.style.left)||0;
    origTop=parseFloat(el.style.top)||0;
    document.addEventListener('mousemove',onMove,{passive:false});
    document.addEventListener('touchmove',onMove,{passive:false});
    document.addEventListener('mouseup',onUp);
    document.addEventListener('touchend',onUp);
    e.stopPropagation();
    e.preventDefault();
  }

  function onMove(e){
    if(!_hudEditActive)return;
    const c=getClient(e);
    const dx=c.clientX-startX;
    const dy=c.clientY-startY;
    const newLeft=origLeft+dx;
    const newTop=origTop+dy;
    // Clamp dalam viewport
    const elW=el.offsetWidth||60;
    const elH=el.offsetHeight||60;
    el.style.left=Math.max(0,Math.min(newLeft,window.innerWidth-elW))+'px';
    el.style.top=Math.max(0,Math.min(newTop,window.innerHeight-elH))+'px';
    e.preventDefault();
  }

  function onUp(){
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('touchmove',onMove);
    document.removeEventListener('mouseup',onUp);
    document.removeEventListener('touchend',onUp);
    if(_hudEditActive) _saveHudPos(el.id,el);
  }

  el.addEventListener('mousedown',onDown,{passive:false});
  el.addEventListener('touchstart',onDown,{passive:false});
}

// Load saved HUD positions on start — tunggu DOM siap
setTimeout(_loadHudPositions, 800);
// Re-apply setelah resize
window.addEventListener('resize',()=>{ if(!_hudEditActive) _loadHudPositions(); });
function settingsBack(){ closeSettings(); }
// Expose ke window agar bisa dipanggil dari inline HTML
window.closeSettings = closeSettings;
window.settingsBack = settingsBack;
function applyGraphicsSettings(){
  gameSettings.shadows=document.getElementById("settingsShadows").checked;
  gameSettings.waterAnim=document.getElementById("settingsWaterAnim").checked;
  renderer.shadowMap.enabled=gameSettings.shadows;
}
function applyAudioSettings(){
  const v=parseInt(document.getElementById("settingsVolume").value)/100;
  gameSettings.volume=Math.round(v*100);
  document.getElementById("settingsVolumeLabel").textContent=gameSettings.volume+"%";
}
function applyHUDSettings(){
  gameSettings.minimap=document.getElementById("settingsMinimap").checked;
  gameSettings.fps=document.getElementById("settingsFPS").checked;
  const mm=document.getElementById("minimap");if(mm)mm.style.display=gameSettings.minimap?"block":"none";
  const fl=document.getElementById("fpsLabel");if(fl)fl.style.display=gameSettings.fps?"block":"none";
}
function saveSettings(){
  const sc=document.getElementById("settingsShirtColor");
  if(sc){setShirt(sc.value);localStorage.setItem("playerShirt",sc.value);}
  try{localStorage.setItem("gameSettings",JSON.stringify(gameSettings));}catch(e){}
  showMessage("⚙️ Settings saved!");closeSettings();
}
function loadSettings(){
  try{const s=JSON.parse(localStorage.getItem("gameSettings")||"null");
    if(s){gameSettings={...gameSettings,...s};renderer.shadowMap.enabled=gameSettings.shadows;
      const mm=document.getElementById("minimap");if(mm)mm.style.display=gameSettings.minimap?"block":"none";}
  }catch(e){}
}
// FPS counter
(function(){
  const fl=document.createElement("div");fl.id="fpsLabel";
  Object.assign(fl.style,{position:"fixed",top:"50px",left:"12px",color:"#7ecfff",fontSize:"11px",
    background:"rgba(0,0,0,0.55)",padding:"2px 7px",borderRadius:"6px",zIndex:"30",display:"none",pointerEvents:"none"});
  fl.textContent="FPS: --";document.body.appendChild(fl);
  let frames=0,lastFPS=Date.now();
  function countFPS(){requestAnimationFrame(countFPS);frames++;
    const now=Date.now();if(now-lastFPS>=1000){fl.textContent="FPS: "+frames;frames=0;lastFPS=now;}}
  countFPS();
})();

// ═══ MAIN LOOP ═══
let lastTime=0;
function animate(time){
  requestAnimationFrame(animate);if(gamePaused)return;
  const dt=Math.min((time-lastTime)/1000,.1);lastTime=time;
  if(gameStarted){
    if(onJetski)updateJetski();else movePlayer(dt);
    updateCastAnimation();updateFishingWait();updateFishingLine();
    updateTensionSystem(dt);animateNPCs(time);updateNPCInteraction();
    updateWeather(dt);updateDayNight(dt);updateWake(dt);updateBubbles(dt);
    updatePerformance(dt,time);
    updateMultiplayerFrame(dt); // MP sync every frame
  }
  if(window._cinActive){window._cinUpdateCamera&&window._cinUpdateCamera();}else{updateCamera();}
  animateWater(time);renderer.render(scene,camera);
}
window.addEventListener("load",()=>{
  const ss=localStorage.getItem("playerShirt");if(ss)setShirt(ss);updateLevelUI();
  // Matikan text selection di seluruh halaman (anti copy/paste popup saat main)
  document.body.style.userSelect="none";
  document.body.style.webkitUserSelect="none";
  document.body.style.msUserSelect="none";
  document.body.style.webkitTouchCallout="none";
  document.documentElement.style.userSelect="none";
  document.documentElement.style.webkitUserSelect="none";
});
animate(0);

(async()=>{
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock("landscape");}catch(e){}
})();
// ═══ LANDSCAPE UI ADAPT ═══
function adaptUI(){
  const lnd=window.innerHeight<window.innerWidth&&window.innerHeight<520;
  const mm=null, mmWrap=null, lbl=null;
  const fibtn=document.getElementById("fishIndexBtn");
  const runbtn=document.getElementById("runBtn");
  const dnui=document.getElementById("dayNightUI");
  const fps=document.getElementById("fpsCounter");

  if(lnd){
    // Landscape compact mode



    if(fibtn){Object.assign(fibtn.style,{top:"4px",left:"calc(50% + 90px)",width:"32px",height:"32px",fontSize:"14px"});}
    if(runbtn){Object.assign(runbtn.style,{bottom:"10px",left:"120px",width:"46px",height:"46px",fontSize:"10px"});}
    if(dnui){Object.assign(dnui.style,{top:"4px",fontSize:"11px",padding:"2px 10px"});}
    if(fps){Object.assign(fps.style,{bottom:"2px",fontSize:"9px"});}
  } else {
    // Portrait / normal mode — reset



    if(fibtn){Object.assign(fibtn.style,{top:"8px",left:"calc(50% + 125px)",width:"40px",height:"40px",fontSize:"18px"});}
    if(runbtn){Object.assign(runbtn.style,{bottom:"28px",left:"148px",width:"58px",height:"58px",fontSize:"11px"});}
    if(dnui){Object.assign(dnui.style,{top:"8px",fontSize:"13px",padding:"4px 16px"});}
    if(fps){Object.assign(fps.style,{bottom:"8px",fontSize:"10px"});}
  }
}
let _resizeLocked=false;
function onScreenResize(){
  if(_resizeLocked)return;
  _resizeLocked=true;
  const w=window.innerWidth, h=window.innerHeight;
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h,false); // false = jangan update style otomatis
  adaptUI();
  if(typeof _loadHudPositions==='function') _loadHudPositions();
  _resizeLocked=false;
}
window.addEventListener("resize", onScreenResize);
window.addEventListener("orientationchange",()=>{
  // Browser butuh beberapa frame untuk update innerWidth/innerHeight setelah rotate
  setTimeout(onScreenResize, 50);
  setTimeout(onScreenResize, 200);
  setTimeout(onScreenResize, 500);
});
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
window.toggleFishIndex=toggleFishIndex;
Object.defineProperty(window,'dayTime',{get:()=>dayTime,set:v=>{dayTime=v;}});
window.applyDayTimeSync=function(t){
  // Snap langsung — non-owner tidak jalan sendiri jadi tidak perlu smooth
  dayTime=t;
};
window.renderFishIndex=renderFishIndex;
window.showPremiumModal=showPremiumModal;
window.closePremiumModal=closePremiumModal;
window.activatePremiumCode=activatePremiumCode;
window.sellAllFishRemote=sellAllFishRemote;
window.openSettings=openSettings;
window.closeSettings=closeSettings;
window.toggleHudEdit=toggleHudEdit;
window.resetHudPositions=resetHudPositions;
window.equipRod=equipRod;
window.selectBait=selectBait;
window.buyBait=buyBait;
window.buyRod=buyRod;
window.buyJetski=buyJetski;
window.closeJetskiShop=closeJetskiShop;
window.toggleInventory=toggleInventory;
window.toggleHoldFish=toggleHoldFish;
window.sellFish=sellFish;
window.sellAllFish=sellAllFish;
window.renderTab=renderTab;
window.switchTab=switchTab;
window.toggleFishIndex=toggleFishIndex;
window.renderFishIndexTabs=renderFishIndexTabs;
Object.defineProperty(window,"coins",{get:()=>coins,set:v=>{coins=v;}});
Object.defineProperty(window,"playerXP",{get:()=>playerXP,set:v=>{playerXP=v;}});
Object.defineProperty(window,"playerLevel",{get:()=>playerLevel,set:v=>{playerLevel=v;}});


// ═══════════════════════════════════════════════════════════
// 🎬 CINEMATIC MODE v2 — Owner Only (Varz444)
// ═══════════════════════════════════════════════════════════
(function(){
  const OWNER = "Varz444";
  function isOwner(){ return localStorage.getItem("playerName") === OWNER; }

  // State
  var cinActive = false;
  var cinShot = 1;
  var cinOrbit = false;
  var cinOrbitAngle = 0;
  var cinYaw = 0, cinPitch = 0.4, cinDist = 18;
  var cinTarget = new THREE.Vector3();
  var cinKeys = {};

  // Expose to animate loop
  window._cinActive = false;

  // Shot presets
  var SHOTS = [
    { id:1, emoji:"🚁", label:"Drone",     desc:"Tampilan udara dari atas",        dist:55,  pitch:1.1  },
    { id:2, emoji:"🎥", label:"Close-Up",  desc:"Dekat dramatis ke karakter",       dist:4,   pitch:0.15 },
    { id:3, emoji:"🔄", label:"Orbit",     desc:"Kamera berputar otomatis",         dist:22,  pitch:0.45 },
    { id:4, emoji:"🌅", label:"Wide",      desc:"Pemandangan luas seluruh pulau",   dist:85,  pitch:0.85 },
    { id:5, emoji:"🎬", label:"Follow",    desc:"Ikuti player dengan smooth lag",   dist:14,  pitch:0.28 },
    { id:6, emoji:"🕹️", label:"Free Cam",  desc:"Kamera bebas — geser & joystick",  dist:20,  pitch:0.4  },
  ];
  // Free cam state
  var cinFreeCam = false;
  var cinFreeCamPos = null; // THREE.Vector3 posisi kamera
  var cinFreeCamYaw = 0, cinFreeCamPitch = 0.1;
  var cinFreeCamSpeed = 0.25;
  var cinFreeTouchId = null, cinFreeTouchX = 0, cinFreeTouchY = 0;
  var cinFreeMoving = {f:false,b:false,l:false,r:false,u:false,d:false};

  // ── Build Panel UI ──
  function buildPanel(){
    if(document.getElementById("cinPanel")) return;

    // Overlay latar
    var overlay = document.createElement("div");
    overlay.id = "cinOverlay";
    Object.assign(overlay.style,{
      position:"fixed",inset:"0",background:"rgba(0,0,0,0.6)",
      zIndex:"9994",display:"none",backdropFilter:"blur(3px)"
    });
    document.body.appendChild(overlay);

    // Panel utama
    var panel = document.createElement("div");
    panel.id = "cinPanel";
    Object.assign(panel.style,{
      position:"fixed",top:"50%",left:"50%",
      transform:"translate(-50%,-50%)",
      background:"linear-gradient(160deg,#0a0a20,#12123a)",
      border:"2px solid rgba(180,100,255,0.5)",
      borderRadius:"18px",padding:"22px",
      color:"#fff",fontFamily:"Arial",
      zIndex:"9995",display:"none",
      width:"min(360px,92vw)",
      maxHeight:"90vh",       // jangan lebih tinggi dari layar
      overflowY:"auto",       // scroll jika konten melebihi layar
      WebkitOverflowScrolling:"touch", // smooth scroll iOS/Android
      boxSizing:"border-box",
      boxShadow:"0 0 50px rgba(150,50,255,0.3)"
    });

    // Header
    var hdr = document.createElement("div");
    Object.assign(hdr.style,{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"});
    hdr.innerHTML = '<div style="font-size:18px;font-weight:bold;color:#cc88ff;">🎬 Cinematic Mode</div>'
      +'<button id="cinCloseBtn" style="background:none;border:none;color:#aaa;font-size:22px;cursor:pointer;padding:4px 8px;line-height:1;">✕</button>';
    panel.appendChild(hdr);

    // Status bar
    var statusBar = document.createElement("div");
    statusBar.id = "cinStatus";
    Object.assign(statusBar.style,{
      background:"rgba(0,0,0,0.4)",borderRadius:"8px",padding:"8px 12px",
      fontSize:"12px",color:"#aaa",marginBottom:"14px",textAlign:"center"
    });
    statusBar.textContent = "Pilih shot lalu tekan Mulai";
    panel.appendChild(statusBar);

    // Shot cards
    var shotGrid = document.createElement("div");
    Object.assign(shotGrid.style,{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"16px"});

    SHOTS.forEach(function(shot){
      var card = document.createElement("div");
      card.id = "cinCard"+shot.id;
      Object.assign(card.style,{
        display:"flex",alignItems:"center",gap:"12px",
        padding:"10px 14px",borderRadius:"10px",
        background:"rgba(255,255,255,0.05)",
        border:"1.5px solid rgba(255,255,255,0.1)",
        cursor:"pointer",transition:"all 0.15s"
      });
      card.innerHTML = '<span style="font-size:24px">'+shot.emoji+'</span>'
        +'<div><div style="font-size:13px;font-weight:bold;color:#eee;">'+shot.label+'</div>'
        +'<div style="font-size:11px;color:#888;">'+shot.desc+'</div></div>'
        +'<div id="cinCheck'+shot.id+'" style="margin-left:auto;font-size:16px;display:none;">✅</div>';
      card.addEventListener("click", function(){ selectShot(shot.id); });
      shotGrid.appendChild(card);
    });
    panel.appendChild(shotGrid);

    // Options row
    var optRow = document.createElement("div");
    Object.assign(optRow.style,{display:"flex",gap:"8px",marginBottom:"16px"});

    var orbitBtn = document.createElement("button");
    orbitBtn.id = "cinOrbitBtn";
    orbitBtn.textContent = "🔄 Auto-Orbit: OFF";
    Object.assign(orbitBtn.style,{
      flex:"1",padding:"8px",borderRadius:"8px",border:"1.5px solid rgba(255,255,255,0.15)",
      background:"rgba(255,255,255,0.05)",color:"#ccc",fontSize:"11px",cursor:"pointer"
    });
    orbitBtn.addEventListener("click", function(){
      cinOrbit = !cinOrbit;
      orbitBtn.textContent = cinOrbit?"🔄 Auto-Orbit: ON":"🔄 Auto-Orbit: OFF";
      orbitBtn.style.background = cinOrbit?"rgba(241,196,15,0.2)":"rgba(255,255,255,0.05)";
      orbitBtn.style.color = cinOrbit?"#f1c40f":"#ccc";
    });

    var vigBtn = document.createElement("button");
    vigBtn.id = "cinVigBtn";
    vigBtn.textContent = "🎭 Vignette: OFF";
    Object.assign(vigBtn.style,{
      flex:"1",padding:"8px",borderRadius:"8px",border:"1.5px solid rgba(255,255,255,0.15)",
      background:"rgba(255,255,255,0.05)",color:"#ccc",fontSize:"11px",cursor:"pointer"
    });
    vigBtn.addEventListener("click", function(){
      var vig = document.getElementById("cinVignette");
      var on = vig && vig.style.display === "block";
      if(vig) vig.style.display = on?"none":"block";
      vigBtn.textContent = on?"🎭 Vignette: OFF":"🎭 Vignette: ON";
      vigBtn.style.background = on?"rgba(255,255,255,0.05)":"rgba(142,68,173,0.25)";
      vigBtn.style.color = on?"#ccc":"#cc88ff";
    });
    optRow.appendChild(orbitBtn);
    optRow.appendChild(vigBtn);
    panel.appendChild(optRow);

    // Tombol Mulai / Hentikan
    var startBtn = document.createElement("button");
    startBtn.id = "cinStartBtn";
    startBtn.textContent = "▶ Mulai Cinematic";
    Object.assign(startBtn.style,{
      width:"100%",padding:"12px",borderRadius:"10px",border:"none",
      background:"linear-gradient(135deg,#8e44ad,#6c3483)",
      color:"#fff",fontSize:"14px",fontWeight:"bold",cursor:"pointer",
      boxShadow:"0 4px 14px rgba(142,68,173,0.4)"
    });
    startBtn.addEventListener("click", function(){
      if(!cinActive) startCinematic();
      else stopCinematic();
    });
    panel.appendChild(startBtn);

    // Screenshot btn
    var ssBtn = document.createElement("button");
    ssBtn.id = "cinSSBtn";
    Object.assign(ssBtn.style,{
      width:"100%",padding:"9px",borderRadius:"10px",
      border:"1.5px solid rgba(255,255,255,0.15)",
      background:"rgba(255,255,255,0.05)",
      color:"#aaa",fontSize:"12px",cursor:"pointer",marginTop:"8px"
    });
    ssBtn.textContent = "📸 Screenshot (sembunyikan UI)";
    ssBtn.addEventListener("click", takeScreenshot);
    panel.appendChild(ssBtn);

    // Hint dinamis
    var hint = document.createElement("div");
    hint.id = "cinHint";
    Object.assign(hint.style,{fontSize:"10px",color:"#555",textAlign:"center",marginTop:"10px"});
    hint.textContent = "Geser layar = putar kamera | Pinch = zoom";
    panel.appendChild(hint);

    // Free cam joystick virtual (muncul hanya saat shot Free Cam aktif & cinematic on)
    var fcJoy = document.createElement("div");
    fcJoy.id = "cinFreeJoy";
    Object.assign(fcJoy.style,{
      position:"fixed", left:"20px", bottom:"100px",
      width:"130px", height:"130px", borderRadius:"50%",
      background:"rgba(0,0,0,0.55)", border:"2px solid rgba(200,100,255,0.6)",
      zIndex:"9992", display:"none", touchAction:"none",
      alignItems:"center", justifyContent:"center", flexDirection:"column",
      boxShadow:"0 0 20px rgba(150,50,255,0.3)"
    });
    // Stick dot
    var fcStick = document.createElement("div");
    fcStick.id = "cinFreeStick";
    Object.assign(fcStick.style,{
      width:"42px",height:"42px",borderRadius:"50%",
      background:"rgba(200,100,255,0.9)",position:"absolute",
      left:"44px",top:"44px",pointerEvents:"none",
      boxShadow:"0 0 10px rgba(180,80,255,0.7)"
    });
    fcJoy.appendChild(fcStick);
    // Label
    var fcLbl = document.createElement("div");
    Object.assign(fcLbl.style,{position:"absolute",bottom:"-20px",fontSize:"10px",color:"#aaa",whiteSpace:"nowrap"});
    fcLbl.textContent = "✋ GERAK";
    fcJoy.appendChild(fcLbl);
    document.body.appendChild(fcJoy);

    // Look hint for right side (free cam)
    var fcLookHint = document.createElement("div");
    fcLookHint.id = "cinLookHint";
    Object.assign(fcLookHint.style,{
      position:"fixed", right:"20px", bottom:"260px",
      color:"rgba(200,100,255,0.7)", fontSize:"11px",
      fontFamily:"Arial", pointerEvents:"none",
      zIndex:"9992", display:"none", textAlign:"center"
    });
    fcLookHint.innerHTML = "👆 Geser sini<br>untuk lihat";
    document.body.appendChild(fcLookHint);

    // Up/Down buttons untuk free cam
    var fcUD = document.createElement("div");
    fcUD.id = "cinFreeUD";
    Object.assign(fcUD.style,{
      position:"fixed", right:"20px", bottom:"120px",
      display:"none", flexDirection:"column", gap:"8px", zIndex:"9992"
    });
    ["⬆️","⬇️"].forEach(function(lbl,i){
      var b = document.createElement("button");
      b.textContent = lbl;
      Object.assign(b.style,{
        width:"50px",height:"50px",borderRadius:"12px",
        background:"rgba(0,0,0,0.6)",border:"2px solid rgba(200,100,255,0.5)",
        color:"#fff",fontSize:"20px",cursor:"pointer",touchAction:"manipulation"
      });
      var dir = i===0 ? "u" : "d";
      b.addEventListener("touchstart",function(e){e.preventDefault();cinFreeMoving[dir]=true;},{passive:false});
      b.addEventListener("touchend",function(){cinFreeMoving[dir]=false;});
      fcUD.appendChild(b);
    });
    document.body.appendChild(fcUD);

    // Free cam joystick touch logic
    var fcJoyActive = false, fcJoyOriginX=0, fcJoyOriginY=0;
    fcJoy.addEventListener("touchstart", function(e){
      e.preventDefault();
      fcJoyActive = true;
      var r = fcJoy.getBoundingClientRect();
      fcJoyOriginX = r.left + r.width/2;
      fcJoyOriginY = r.top + r.height/2;
    },{passive:false});
    fcJoy.addEventListener("touchmove", function(e){
      e.preventDefault();
      if(!fcJoyActive) return;
      var t = e.touches[0];
      var dx = t.clientX - fcJoyOriginX;
      var dy = t.clientY - fcJoyOriginY;
      var maxR = 35;
      var dist = Math.sqrt(dx*dx+dy*dy);
      var cx = dist>maxR ? dx/dist*maxR : dx;
      var cy = dist>maxR ? dy/dist*maxR : dy;
      fcStick.style.left = (47+cx)+"px";
      fcStick.style.top  = (47+cy)+"px";
      var nx = dx/Math.max(dist,1), ny = dy/Math.max(dist,1);
      var thr = 0.2;
      cinFreeMoving.f = ny < -thr;
      cinFreeMoving.b = ny > thr;
      cinFreeMoving.l = nx < -thr;
      cinFreeMoving.r = nx > thr;
    },{passive:false});
    fcJoy.addEventListener("touchend", function(){
      fcJoyActive=false;
      fcStick.style.left="44px"; fcStick.style.top="44px";
      cinFreeMoving.f=cinFreeMoving.b=cinFreeMoving.l=cinFreeMoving.r=false;
    });

    document.body.appendChild(panel);

    // Vignette overlay
    var vig = document.createElement("div");
    vig.id = "cinVignette";
    Object.assign(vig.style,{
      position:"fixed",inset:"0",pointerEvents:"none",zIndex:"9990",
      background:"radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.8) 100%)",
      display:"none"
    });
    document.body.appendChild(vig);

    // Watermark
    var wm = document.createElement("div");
    wm.id = "cinWatermark";
    Object.assign(wm.style,{
      position:"fixed",bottom:"18px",right:"18px",
      color:"rgba(255,255,255,0.4)",fontSize:"13px",letterSpacing:"1px",
      fontFamily:"Arial",pointerEvents:"none",zIndex:"9991",display:"none",
      textShadow:"0 1px 4px rgba(0,0,0,0.8)"
    });
    wm.textContent = "🎣 Let's Fishing!";
    document.body.appendChild(wm);

    // Close button
    document.getElementById("cinCloseBtn").addEventListener("click", function(){
      if(cinActive) stopCinematic();
      hidePanel();
    });
    overlay.addEventListener("click", function(){
      if(cinActive) stopCinematic();
      hidePanel();
    });

    // Default select shot 1
    selectShot(1);
  }

  function selectShot(id){
    cinShot = id;
    SHOTS.forEach(function(s){
      var card = document.getElementById("cinCard"+s.id);
      var check = document.getElementById("cinCheck"+s.id);
      if(card) card.style.background = s.id===id ? "rgba(142,68,173,0.25)" : "rgba(255,255,255,0.05)";
      if(card) card.style.borderColor = s.id===id ? "rgba(180,100,255,0.6)" : "rgba(255,255,255,0.1)";
      if(check) check.style.display = s.id===id ? "block" : "none";
    });
    var s = SHOTS.find(function(x){return x.id===id;});
    var st = document.getElementById("cinStatus");
    if(st && s) st.textContent = s.emoji+" "+s.label+" — "+s.desc;
    // Update hint text & show/hide free cam controls
    var hint2 = document.getElementById("cinHint");
    if(hint2) hint2.textContent = id===6
      ? "Free Cam: geser kanan=putar | joystick kiri=gerak | pinch=speed"
      : "Geser layar = putar kamera | Pinch = zoom";
    // Show free cam controls jika cinematic sudah aktif
    if(cinActive){
      var fj = document.getElementById("cinFreeJoy");
      var fu = document.getElementById("cinFreeUD");
      if(fj) fj.style.display = id===6?"flex":"none";
      if(fu) fu.style.display = id===6?"flex":"none";
      var flh3=document.getElementById("cinLookHint"); if(flh3) flh3.style.display=id===6?"block":"none";
      cinFreeCam = (id===6);
      if(id===6) cinFreeCamPos=null;
    }
  }

  function showPanel(){
    var panel = document.getElementById("cinPanel");
    var overlay = document.getElementById("cinOverlay");
    if(panel) panel.style.display = "block";
    if(overlay) overlay.style.display = "block";
    // Update start btn text
    var btn = document.getElementById("cinStartBtn");
    if(btn) btn.textContent = cinActive ? "⏹ Hentikan Cinematic" : "▶ Mulai Cinematic";
  }

  function hidePanel(){
    var panel = document.getElementById("cinPanel");
    var overlay = document.getElementById("cinOverlay");
    if(panel) panel.style.display = "none";
    if(overlay) overlay.style.display = "none";
  }

  // UI elements yang disembunyikan saat cinematic
  var CIN_UI_IDS = ["coinUI","levelUI","weatherUI","joystick","stick",
    "hotbar","runBtn","jumpBtn","inventoryBtn","fishIndexBtn","dayNightUI",
    "fpsCounter","islandBadge","openMenuBtn","fullscreenBtn",
    "tensionContainer","biteIcon","fishNotify","eventNotify",
    "mpStatusBadge","mpChatBtn","ownerPanelBtn","broadcastNotif","interactHint",
    "harbourBtn","mountJetskiBtn","jetskiUI","heldFishHUD"];

  function hideGameUI(){
    CIN_UI_IDS.forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.style.setProperty("display","none","important");
    });
    // Sembunyikan player mesh
    if(window.player) player.traverse(function(o){ o.visible = false; });
    // Sembunyikan fishing rod & hook
    if(window.hook) hook.visible = false;
  }

  function showGameUI(){
    // Restore UI — biarkan masing2 sistem yang atur display-nya sendiri
    var defaults = {
      coinUI:"block",levelUI:"block",weatherUI:"block",
      joystick:"block",stick:"block",hotbar:"flex",
      runBtn:"flex",inventoryBtn:"flex",fishIndexBtn:"flex",
      dayNightUI:"block",openMenuBtn:"block",
      mpStatusBadge:"block",fullscreenBtn:"flex"
    };
    Object.keys(defaults).forEach(function(id){
      var el = document.getElementById(id);
      if(el){ el.style.removeProperty("display"); el.style.display = defaults[id]; }
    });
    // Yang tersembunyi secara default — cukup hapus override
    ["tensionContainer","biteIcon","fishNotify","eventNotify","fpsCounter",
     "islandBadge","ownerPanelBtn","broadcastNotif","interactHint",
     "harbourBtn","mountJetskiBtn","jetskiUI","heldFishHUD"].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.style.removeProperty("display");
    });
    // Tampilkan kembali player
    if(window.player) player.traverse(function(o){ o.visible = true; });
  }

  function startCinematic(){
    try {
      cinActive = true;
      window._cinActive = true;
      var s = SHOTS.find(function(x){return x.id===cinShot;});
      if(s){ cinDist = s.dist; cinPitch = s.pitch; }
      cinYaw = window.camYaw || 0;
      cinFreeCam = (cinShot === 6);
      cinFreeCamPos = null;
      cinOrbit = (cinShot === 3);
      // Init look target
      var wp = new THREE.Vector3();
      if(window.player) player.getWorldPosition(wp);
      cinTarget.set(wp.x, wp.y + 3.3, wp.z);
      // Sembunyikan UI & player
      hideGameUI();
      // Joystick free cam
      var fj = document.getElementById("cinFreeJoy");
      var fu = document.getElementById("cinFreeUD");
      if(fj) fj.style.display = cinFreeCam ? "flex" : "none";
      if(fu) fu.style.display = cinFreeCam ? "flex" : "none";
      var flh = document.getElementById("cinLookHint"); if(flh) flh.style.display = cinFreeCam ? "block" : "none";
      // Selalu tampilkan cinFab agar bisa buka panel lagi
      var fab = document.getElementById("cinFab");
      if(fab) fab.style.display = "flex";
      var wm = document.getElementById("cinWatermark");
      if(wm) wm.style.display = "block";
      var btn = document.getElementById("cinStartBtn");
      if(btn){ btn.textContent = "⏹ Hentikan"; btn.style.background = "linear-gradient(135deg,#c0392b,#e74c3c)"; }
      freezeInput = true; freezePlayer = true;
      hidePanel();
      showMessage("🎬 Cinematic aktif! Tap 🎬 untuk panel");
    } catch(e){ console.error("Cinematic start error:",e); }
  }

  function stopCinematic(){
    cinActive = false;
    window._cinActive = false;
    cinOrbit = false;
    cinFreeCam = false;
    cinFreeCamPos = null;
    document.getElementById("cinWatermark").style.display = "none";
    document.getElementById("cinVignette").style.display = "none";
    var vig = document.getElementById("cinVigBtn");
    if(vig){ vig.textContent = "🎭 Vignette: OFF"; vig.style.background = "rgba(255,255,255,0.05)"; vig.style.color = "#ccc"; }
    var btn = document.getElementById("cinStartBtn");
    if(btn){ btn.textContent = "▶ Mulai Cinematic"; btn.style.background = "linear-gradient(135deg,#8e44ad,#6c3483)"; }
    var ob = document.getElementById("cinOrbitBtn");
    if(ob){ cinOrbit=false; ob.textContent = "🔄 Auto-Orbit: OFF"; ob.style.background="rgba(255,255,255,0.05)"; ob.style.color="#ccc"; }
    // Restore UI & player
    showGameUI();
    var fj2 = document.getElementById("cinFreeJoy");
    var fu2 = document.getElementById("cinFreeUD");
    if(fj2) fj2.style.display="none";
    if(fu2) fu2.style.display="none";
    var flh2=document.getElementById("cinLookHint"); if(flh2) flh2.style.display="none";
    Object.keys(cinFreeMoving).forEach(function(k){cinFreeMoving[k]=false;});
    freezeInput = false; freezePlayer = false;
    camera.fov = 60; camera.updateProjectionMatrix();
    showMessage("🎬 Cinematic dimatikan");
  }

  function takeScreenshot(){
    var ids = ["cinPanel","cinOverlay","coinUI","levelUI","weatherUI","joystick",
               "hotbar","runBtn","jumpBtn","inventoryBtn","fishIndexBtn","dayNightUI",
               "fpsCounter","islandBadge","mpStatusBadge","ownerPanelBtn","cinFab"];
    var els = ids.map(function(id){return document.getElementById(id);}).filter(Boolean);
    var prev = els.map(function(el){return el.style.visibility;});
    els.forEach(function(el){el.style.visibility="hidden";});
    renderer.render(scene, camera);
    renderer.domElement.toBlob(function(blob){
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href=url; a.download="letsfishing_"+Date.now()+".png"; a.click();
      URL.revokeObjectURL(url);
      els.forEach(function(el,i){el.style.visibility=prev[i];});
      showMessage("📸 Screenshot tersimpan!");
    }, "image/png");
  }

  // ── Camera update ──
  window._cinUpdateCamera = function(){
    if(!cinActive) return;

    // ── FREE CAM mode ──
    if(cinFreeCam){
      if(!cinFreeCamPos){
        cinFreeCamPos = camera.position.clone();
        cinFreeCamYaw = cinYaw;
        cinFreeCamPitch = 0.1;
      }
      // Gerak WASD / joystick virtual
      var spd = cinFreeCamSpeed;
      var fwd = new THREE.Vector3(-Math.sin(cinFreeCamYaw)*Math.cos(cinFreeCamPitch),
                                   Math.sin(cinFreeCamPitch),
                                  -Math.cos(cinFreeCamYaw)*Math.cos(cinFreeCamPitch));
      var rgt = new THREE.Vector3(Math.cos(cinFreeCamYaw),0,-Math.sin(cinFreeCamYaw));
      if(cinFreeMoving.f) cinFreeCamPos.addScaledVector(fwd, spd);
      if(cinFreeMoving.b) cinFreeCamPos.addScaledVector(fwd,-spd);
      if(cinFreeMoving.r) cinFreeCamPos.addScaledVector(rgt, spd);
      if(cinFreeMoving.l) cinFreeCamPos.addScaledVector(rgt,-spd);
      if(cinFreeMoving.u) cinFreeCamPos.y += spd;
      if(cinFreeMoving.d) cinFreeCamPos.y -= spd;
      camera.position.copy(cinFreeCamPos);
      var lookDir = fwd.clone().multiplyScalar(10).add(cinFreeCamPos);
      camera.lookAt(lookDir);
      camera.fov = 70; camera.updateProjectionMatrix();
      return;
    }

    // ── Shot modes ──
    if(cinOrbit) cinYaw += 0.004;
    var wp = new THREE.Vector3();
    player.getWorldPosition(wp);
    wp.y += 3.3;
    cinTarget.x += (wp.x - cinTarget.x) * 0.08;
    cinTarget.y += (wp.y - cinTarget.y) * 0.08;
    cinTarget.z += (wp.z - cinTarget.z) * 0.08;
    var camX = cinTarget.x - Math.sin(cinYaw) * cinDist;
    var camY = cinTarget.y + cinPitch * (cinDist * 0.38);
    var camZ = cinTarget.z - Math.cos(cinYaw) * cinDist;
    var lerpSpd = cinShot===5 ? 0.04 : cinShot===2 ? 0.07 : 0.12;
    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), lerpSpd);
    camera.lookAt(cinTarget);
    camera.fov = cinShot===4 ? 50 : cinShot===2 ? 28 : 60;
    camera.updateProjectionMatrix();
  };

  // Touch controls untuk cinematic
  // FREE CAM: joystick kiri = gerak | swipe kanan layar = look
  // SHOT MODE: swipe mana saja = putar kamera | pinch = zoom
  var cinTouchLookId = null, cinTouchLookX = 0, cinTouchLookY = 0;
  var pinchStartDist = 0;
  var halfW = window.innerWidth / 2;
  window.addEventListener("resize", function(){ halfW = window.innerWidth/2; });

  document.addEventListener("touchstart", function(e){
    if(!cinActive) return;
    var panel = document.getElementById("cinPanel");
    if(panel && panel.style.display !== "none") return;
    for(var i=0;i<e.changedTouches.length;i++){
      var t = e.changedTouches[i];
      // Sisi kanan layar = look (free cam & shot mode)
      if(t.clientX > halfW && cinTouchLookId === null){
        cinTouchLookId = t.identifier;
        cinTouchLookX = t.clientX;
        cinTouchLookY = t.clientY;
      }
    }
    if(e.touches.length === 2){
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.sqrt(dx*dx+dy*dy);
    }
  }, {passive:true});

  document.addEventListener("touchmove", function(e){
    if(!cinActive) return;
    var panel = document.getElementById("cinPanel");
    if(panel && panel.style.display !== "none") return;
    // Look with right-side finger
    for(var i=0;i<e.changedTouches.length;i++){
      var t = e.changedTouches[i];
      if(t.identifier === cinTouchLookId){
        var dx = t.clientX - cinTouchLookX;
        var dy = t.clientY - cinTouchLookY;
        if(cinFreeCam){
          cinFreeCamYaw   -= dx * 0.005;
          cinFreeCamPitch  = Math.max(-1.2, Math.min(1.2, cinFreeCamPitch + dy * 0.004));
        } else {
          cinYaw   += dx * 0.005;
          cinPitch  = Math.max(0.05, Math.min(1.45, cinPitch - dy * 0.003));
        }
        cinTouchLookX = t.clientX;
        cinTouchLookY = t.clientY;
      }
    }
    // Pinch zoom / speed
    if(e.touches.length >= 2){
      var dx2 = e.touches[0].clientX - e.touches[1].clientX;
      var dy2 = e.touches[0].clientY - e.touches[1].clientY;
      var d = Math.sqrt(dx2*dx2+dy2*dy2);
      var delta = (d - pinchStartDist) * 0.08;
      if(cinFreeCam){
        cinFreeCamSpeed = Math.max(0.05, Math.min(5, cinFreeCamSpeed + delta * 0.02));
      } else {
        cinDist = Math.max(2, Math.min(120, cinDist - delta));
      }
      pinchStartDist = d;
    }
  }, {passive:true});

  document.addEventListener("touchend", function(e){
    for(var i=0;i<e.changedTouches.length;i++){
      if(e.changedTouches[i].identifier === cinTouchLookId) cinTouchLookId = null;
    }
  }, {passive:true});

  // Keyboard support
  window.addEventListener("keydown", function(e){
    if(!window.gameStarted) return;
    if(e.key.toLowerCase()==="c" && isOwner()){ buildPanel(); showPanel(); }
    if(!cinActive) return;
    var k = e.key.toLowerCase();
    // Free cam WASD movement
    if(cinFreeCam){
      if(k==="w"||k==="arrowup")    cinFreeMoving.f=true;
      if(k==="s"||k==="arrowdown")  cinFreeMoving.b=true;
      if(k==="a"||k==="arrowleft")  cinFreeMoving.l=true;
      if(k==="d"||k==="arrowright") cinFreeMoving.r=true;
      if(k==="q") cinFreeMoving.d=true;
      if(k==="e") cinFreeMoving.u=true;
      return;
    }
    // Shot cam controls
    if(k==="arrowleft")  cinYaw -= 0.05;
    if(k==="arrowright") cinYaw += 0.05;
    if(k==="arrowup")    cinPitch = Math.max(0.05, cinPitch - 0.05);
    if(k==="arrowdown")  cinPitch = Math.min(1.45, cinPitch + 0.05);
    if(k==="q") cinDist = Math.max(2, cinDist - 2);
    if(k==="e") cinDist = Math.min(120, cinDist + 2);
    if(k>="1"&&k<="6"){ selectShot(parseInt(k)); var s=SHOTS.find(function(x){return x.id===cinShot;}); if(s){cinDist=s.dist;cinPitch=s.pitch;cinFreeCam=(s.id===6);} }
    if(k==="r"){ cinOrbit=!cinOrbit; }
    if(e.key==="F9"){ e.preventDefault(); takeScreenshot(); }
  });
  window.addEventListener("keyup", function(e){
    if(!cinFreeCam) return;
    var k = e.key.toLowerCase();
    if(k==="w"||k==="arrowup")    cinFreeMoving.f=false;
    if(k==="s"||k==="arrowdown")  cinFreeMoving.b=false;
    if(k==="a"||k==="arrowleft")  cinFreeMoving.l=false;
    if(k==="d"||k==="arrowright") cinFreeMoving.r=false;
    if(k==="q") cinFreeMoving.d=false;
    if(k==="e") cinFreeMoving.u=false;
  });

  // ── Function to build FAB (called when access is granted mid-session) ──
  function _buildCinFabNow(){
    if(document.getElementById("cinFab")) return;
    buildPanel();
    var fab = document.createElement("div");
    fab.id = "cinFab";
    Object.assign(fab.style,{
      position:"fixed", right:"12px", bottom:"265px",
      width:"46px", height:"46px", borderRadius:"50%",
      background:"linear-gradient(135deg,#8e44ad,#6c3483)",
      border:"2px solid rgba(200,100,255,0.5)",
      color:"#fff", fontSize:"20px",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:"25", cursor:"pointer",
      boxShadow:"0 4px 14px rgba(142,68,173,0.6)",
      touchAction:"manipulation", userSelect:"none"
    });
    fab.textContent = "🎬";
    fab.addEventListener("click", function(){ showPanel(); });
    document.body.appendChild(fab);
    window.cinematicToggle = function(){ buildPanel(); showPanel(); };
    window._buildCinFab = null;
  }
  window._buildCinFab = _buildCinFabNow;

  // ── Init: buat FAB button saat game ready ──
  var _initInt = setInterval(function(){
    if(window.gameStarted && window.player){
      clearInterval(_initInt);
      const hasCinAccess = isOwner() || localStorage.getItem("cinFreeCamAccess") === "1";
      if(!hasCinAccess) return;
      buildPanel();

      // FAB button 🎬 di layar
      var fab = document.createElement("div");
      fab.id = "cinFab";
      Object.assign(fab.style,{
        position:"fixed", right:"12px", bottom:"265px",
        width:"46px", height:"46px", borderRadius:"50%",
        background:"linear-gradient(135deg,#8e44ad,#6c3483)",
        border:"2px solid rgba(200,100,255,0.5)",
        color:"#fff", fontSize:"20px",
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex:"25", cursor:"pointer",
        boxShadow:"0 4px 14px rgba(142,68,173,0.6)",
        touchAction:"manipulation", userSelect:"none"
      });
      fab.textContent = "🎬";
      fab.title = "Cinematic Mode";
      fab.addEventListener("click", function(){ showPanel(); });
      document.body.appendChild(fab);

      // Expose toggle untuk menu ☰
      window.cinematicToggle = function(){ buildPanel(); showPanel(); };
      window._buildCinFab = null; // already built
    }
  }, 300);

})();
// ═══════════════════════════════════════════════════════════
