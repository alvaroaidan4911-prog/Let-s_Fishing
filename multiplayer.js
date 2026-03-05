// ============================================================
// LET'S FISHING — MULTIPLAYER SYSTEM v2
// Engine: Firebase Realtime Database (free tier)
//
// CARA SETUP (5 menit):
// 1. Buka https://console.firebase.google.com
// 2. "Create project" → nama bebas → Continue
// 3. Klik "Realtime Database" di sidebar → "Create database"
// 4. Pilih lokasi → "Start in test mode" → Enable
// 5. Klik ikon roda gigi → "Project settings"
// 6. Scroll ke "Your apps" → klik </> (web app) → daftarkan
// 7. Copy nilai di firebaseConfig dan paste ke bawah:
// ============================================================

window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCuZXPtSt8UykNylQTL3vOZhHJJJGlNmxY",
  authDomain:        "lets-fishing-ed271.firebaseapp.com",
  databaseURL:       "https://lets-fishing-ed271-default-rtdb.firebaseio.com",
  projectId:         "lets-fishing-ed271",
  storageBucket:     "lets-fishing-ed271.firebasestorage.app",
  messagingSenderId: "458916675317",
  appId:             "1:458916675317:web:e913889e2b872c58054fbc"
};

// ============================================================
// JANGAN UBAH DI BAWAH INI
// ============================================================

(function() {
  "use strict";

// ═══ OWNER PANEL START ═══
// ============================================================
// OWNER PANEL — Let's Fishing
// Taruh kode ini di multiplayer.js
// TEPAT SETELAH baris:  "use strict";
// (kira-kira baris ke-29 di multiplayer.js)
// ============================================================

// ──────────────────────────────────────────────
// 🔑 KONFIGURASI OWNER
// Ganti "Varz444" dengan nama kamu jika ingin ganti
// ──────────────────────────────────────────────
const OWNER_NAME = "Varz444";

// ──────────────────────────────────────────────
// SISTEM ADMIN — Tambah nama admin di sini
// ──────────────────────────────────────────────
// Owner bisa set/remove admin via panel
// Admin: bisa kelola cuaca, teleport, kick/ban — TIDAK bisa ikan/koin/xp

function isOwner() {
  return localStorage.getItem("playerName") === OWNER_NAME;
}

function getAdminList() {
  try { return JSON.parse(localStorage.getItem("adminList_lf") || "[]"); } catch(e) { return []; }
}
function saveAdminList(arr) {
  localStorage.setItem("adminList_lf", JSON.stringify(arr));
}
function isAdmin() {
  const name = localStorage.getItem("playerName") || "";
  if (isOwner()) return true; // Owner = admin tertinggi
  return getAdminList().includes(name);
}
function isAdminOnly() {
  return !isOwner() && getAdminList().includes(localStorage.getItem("playerName") || "");
}

// ── Format nama dengan badge role ──
function getDisplayName(rawName) {
  if (!rawName) return "Player";
  if (rawName === OWNER_NAME) return "👑OWNER (" + rawName + ")";
  if (getAdminList().includes(rawName)) return "🛡ADMIN (" + rawName + ")";
  return rawName;
}

// ──────────────────────────────────────────────
// FUNGSI-FUNGSI ADMIN
// ──────────────────────────────────────────────

// Kick player (hapus dari database)
// ── Modal kick/ban dengan input alasan ──
function showKickBanModal(type, playerId, playerName) {
  const old = document.getElementById("kickBanModal");
  if (old) old.remove();
  const isKick = type === "kick";
  const modal = document.createElement("div");
  modal.id = "kickBanModal";
  Object.assign(modal.style, {
    position:"fixed", inset:"0", background:"rgba(0,0,0,0.78)",
    display:"flex", alignItems:"center", justifyContent:"center",
    zIndex:"999998", fontFamily:"Arial"
  });
  modal.innerHTML = `
    <div style="background:#0d1a2e;border:2px solid ${isKick?"rgba(231,126,34,0.5)":"rgba(231,76,60,0.5)"};
                border-radius:16px;padding:24px;width:min(340px,90vw);color:#fff">
      <div style="font-size:20px;font-weight:bold;color:${isKick?"#e67e22":"#e74c3c"};margin-bottom:6px">
        ${isKick?"🔨 Kick":"🚫 Ban"} — ${playerName}
      </div>
      <div style="color:#888;font-size:12px;margin-bottom:14px">
        ${isKick?"Player akan dikeluarkan dan bisa join kembali.":"Player tidak bisa masuk ke room ini lagi."}
      </div>
      <div style="font-size:12px;color:#aaa;margin-bottom:6px">📝 Alasan (opsional):</div>
      <input id="kickBanReason" placeholder="Contoh: Cheating, spam, dll..."
        style="width:100%;box-sizing:border-box;padding:9px 12px;
               background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
               border-radius:9px;color:#fff;font-size:13px;margin-bottom:14px">
      <div style="display:flex;gap:8px">
        <button id="kickBanConfirmBtn"
          style="flex:1;padding:10px;background:linear-gradient(135deg,${isKick?"#e67e22,#d35400":"#c0392b,#e74c3c"});
                 border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:bold;cursor:pointer">
          ${isKick?"🔨 Kick":"🚫 Ban"}
        </button>
        <button onclick="document.getElementById('kickBanModal').remove()"
          style="flex:1;padding:10px;background:rgba(255,255,255,0.08);
                 border:1px solid rgba(255,255,255,0.15);border-radius:10px;
                 color:#aaa;font-size:13px;cursor:pointer">Batal</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("kickBanConfirmBtn").addEventListener("click", () => {
    const reason = (document.getElementById("kickBanReason").value || "").trim();
    modal.remove();
    if (isKick) doKickPlayer(playerId, playerName, reason);
    else doBanPlayer(playerId, playerName, reason);
  });
  document.getElementById("kickBanReason").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("kickBanConfirmBtn").click();
  });
  setTimeout(() => { const inp = document.getElementById("kickBanReason"); if(inp) inp.focus(); }, 50);
}

function kickPlayer(playerId, playerName) {
  showKickBanModal("kick", playerId, playerName);
}

function doKickPlayer(playerId, playerName, reason) {
  if (!db) return;
  const byRaw = localStorage.getItem("playerName") || "Owner";
  const by = getDisplayName(byRaw);
  db.ref(`rooms/${roomId}/serverCommands`).push({
    cmd:"kicked", targetId:playerId, by, reason:reason||"", ts:Date.now()
  });
  setTimeout(() => db.ref(`rooms/${roomId}/players/${playerId}`).remove(), 800);
  db.ref(`rooms/${roomId}/chat`).push({
    name:"🔨 SERVER",
    text:`${playerName} di-kick oleh ${by}${reason?": "+reason:"."}`,
    senderId:"server", ts:Date.now()
  });
  addSystemMsg(`🔨 Kamu kick ${playerName}${reason?" ("+reason+")":""}`);
}

function banPlayer(playerId, playerName) {
  showKickBanModal("ban", playerId, playerName);
}

function doBanPlayer(playerId, playerName, reason) {
  if (!db) return;
  const byRaw2 = localStorage.getItem("playerName") || "Owner";
  const by = getDisplayName(byRaw2);
  db.ref(`rooms/${roomId}/serverCommands`).push({
    cmd:"banned", targetId:playerId, by, reason:reason||"", ts:Date.now()
  });
  setTimeout(() => {
    db.ref(`rooms/${roomId}/banned/${playerName}`).set({ reason:reason||"", by, ts:Date.now() });
    db.ref(`rooms/${roomId}/players/${playerId}`).remove();
  }, 800);
  db.ref(`rooms/${roomId}/chat`).push({
    name:"🚫 SERVER",
    text:`${playerName} di-ban oleh ${by}${reason?": "+reason:"."}`,
    senderId:"server", ts:Date.now()
  });
  addSystemMsg(`🚫 Kamu ban ${playerName}${reason?" ("+reason+")":""}`);
}

// (legacy stub — tidak dipakai langsung)
function _banPlayerOld(playerId, playerName) {
  if (!db) return;
  db.ref(`rooms/${roomId}/banned/${playerName}`).set(true);
  db.ref(`rooms/${roomId}/players/${playerId}`).remove();
  db.ref(`rooms/${roomId}/chat`).push({
    name: "🚫 SERVER",
    text: `${playerName} telah di-ban oleh Owner.`,
    senderId: "server",
    ts: Date.now()
  });
  addSystemMsg(`🚫 Kamu ban ${playerName}`);
}

// Unban player
function unbanPlayer(playerName) {
  if (!db) return;
  db.ref(`rooms/${roomId}/banned/${playerName}`).remove();
  addSystemMsg(`✅ ${playerName} di-unban.`);
  refreshOwnerPanel();
}

// Broadcast pesan ke semua player
function ownerBroadcast(message) {
  if (!db || !message.trim()) return;
  const senderName = localStorage.getItem("playerName") || OWNER_NAME;
  const senderIsOwner = senderName === OWNER_NAME;
  const senderLabel = getDisplayName(senderName);
  // Kirim via serverCommand supaya semua player dapat notifikasi
  db.ref(`rooms/${roomId}/serverCommands`).push({
    cmd: "broadcast",
    message: message.trim(),
    ownerName: senderName,
    ownerLabel: senderLabel,
    ts: Date.now()
  });
  // Broadcast hanya via serverCommands, tidak perlu chatRef (mencegah dobel notif)
  // Tetap tambahkan ke chat panel lokal saja
  appendChatMsg ? appendChatMsg(senderLabel, "📢 " + message, false) : null;
  addSystemMsg(`📢 Broadcast terkirim: "${message}"`);
}

// Ganti cuaca untuk semua player
function ownerSetWeather(weatherName) {
  if (!db) return;
  db.ref(`rooms/${roomId}/serverCommands`).push({
    cmd: "setWeather",
    value: weatherName,
    ts: Date.now()
  });
  addSystemMsg(`🌦️ Cuaca diganti ke ${weatherName} untuk semua player`);
}

// Beri coins ke semua player (via command)
function ownerGiveCoins(amount) {
  if (!db) return;
  db.ref(`rooms/${roomId}/serverCommands`).push({
    cmd: "giveCoins",
    value: amount,
    ts: Date.now()
  });
  addSystemMsg(`💰 Memberi ${amount} koin ke semua player`);
}

// Clear seluruh chat
function ownerClearChat() {
  if (!db) return;
  if (!confirm("Hapus semua chat?")) return;
  db.ref(`rooms/${roomId}/chat`).remove();
  const area = document.getElementById("mpMsgArea");
  if (area) area.innerHTML = "";
  addSystemMsg("🗑️ Chat dibersihkan.");
}

// ──────────────────────────────────────────────
// LISTEN SERVER COMMANDS (untuk semua player)
// Taruh ini di dalam fungsi connect(), setelah myRef.onDisconnect().remove();
// Salin bagian LISTEN SERVER COMMANDS ke sana
// ──────────────────────────────────────────────
function listenServerCommands() {
  if (!db) return;
  const cmdRef = db.ref(`rooms/${roomId}/serverCommands`);
  // Hanya listen command baru (bukan yang lama)
  cmdRef.limitToLast(1).on("child_added", snap => {
    const cmd = snap.val();
    if (!cmd || Date.now() - cmd.ts > 5000) return; // abaikan command > 5 detik lalu
    if (cmd.cmd === "setWeather" && window.setWeather) {
      const weatherTypes = window.weatherTypes || [];
      const w = weatherTypes.find(x => x.name === cmd.value);
      if (w) { window.setWeather(w); addSystemMsg(`🌦️ Owner mengganti cuaca: ${cmd.value}`); }
    }
    if (cmd.cmd === "giveCoins") {
      window.coins = (window.coins || 0) + (cmd.value || 0);
      const coinUI = document.getElementById("coinUI");
      if (coinUI) coinUI.textContent = "💰 " + window.coins;
      addSystemMsg(`💰 Owner memberimu +${cmd.value} koin!`);
    }
    if (cmd.cmd === "giveXP") {
      if (typeof window.gainXP === "function") window.gainXP(cmd.value || 0);
      else {
        window.playerXP = (window.playerXP||0) + (cmd.value||0);
        if (typeof window.checkLevelUp === "function") window.checkLevelUp();
        if (typeof window.updateLevelUI === "function") window.updateLevelUI();
      }
      addSystemMsg(`⭐ Owner memberimu +${cmd.value} XP!`);
    }
    if (cmd.cmd === "giftFish" && (!cmd.targetId || cmd.targetId === myId)) {
      const fishDB = window.fishTypes || [];
      const fish = fishDB.find(f => f.name === cmd.fishName);
      if (fish && window.inventory) {
        const newFish = {...fish, id:"gift_"+Date.now(), caughtAt:new Date().toLocaleString(), gifted:true};
        window.inventory.fish = window.inventory.fish || [];
        window.inventory.fish.push(newFish);
        if (typeof window.renderTab === "function") window.renderTab("fish");
        showGiftNotif(`🎁 Gift dari ${cmd.from||"Owner"}: ${fish.emoji} ${fish.name}!`);
        addSystemMsg(`🎁 Kamu dapat hadiah: ${fish.emoji} ${fish.name}`);
      }
    }
    if (cmd.cmd === "giftCoins" && (!cmd.targetId || cmd.targetId === myId)) {
      window.coins = (window.coins||0) + (cmd.value||0);
      const coinUI = document.getElementById("coinUI");
      if (coinUI) coinUI.textContent = "💰 " + window.coins;
      showGiftNotif(`🎁 Gift dari ${cmd.from||"Owner"}: +💰${cmd.value}!`);
      addSystemMsg(`💰 Gift koin dari ${cmd.from}: +${cmd.value}`);
    }
    if (cmd.cmd === "syncWeather") {
      const weatherTypes = window.weatherTypes || [];
      const w = weatherTypes.find(x => x.name === cmd.name);
      if (w && typeof window.setWeather === "function") window.setWeather(w);
    }
    // ── Cinematic Free Cam access ──
    if (cmd.cmd === "cinAccess" && cmd.targetId === myId) {
      if (cmd.grant) {
        localStorage.setItem("cinFreeCamAccess", "1");
        if (typeof window.showMessage === "function") window.showMessage("🎬 Kamu diberi akses Free Cam!");
        // Build cinematic FAB if not exists
        if (typeof window._buildCinFab === "function") window._buildCinFab();
      } else {
        localStorage.removeItem("cinFreeCamAccess");
        if (typeof window.showMessage === "function") window.showMessage("🎬 Akses Free Cam dicabut.");
      }
    }
    // ── KICK dengan alasan ──
    if (cmd.cmd === "kicked" && cmd.targetId === myId) {
      mpActive = false;
      showKickBanOverlay("kick", cmd.reason || "", cmd.by || "");
    }
    // ── BAN dengan alasan ──
    if (cmd.cmd === "banned" && cmd.targetId === myId) {
      mpActive = false;
      showKickBanOverlay("ban", cmd.reason || "", cmd.by || "");
    }
    // ── BROADCAST NOTIFICATION ──
    if (cmd.cmd === "broadcast" && cmd.message) {
      showBroadcastToast(cmd.ownerName || "Owner", cmd.message);
      addSystemMsg(`📢 ${cmd.ownerLabel||cmd.ownerName||"Owner"}: ${cmd.message}`);
    }
  }); // end cmdRef listener
}

// ──────────────────────────────────────────────
// CEK BAN (cek apakah player ini di-ban)
// ──────────────────────────────────────────────
function checkIfBanned(cb) {
  if (!db) { cb(false); return; }
  const myName = localStorage.getItem("playerName") || "Player";
  db.ref(`rooms/${roomId}/banned/${myName}`).once("value", snap => {
    cb(snap.exists() && snap.val() === true);
  });
}

// ──────────────────────────────────────────────
// BUILD OWNER PANEL UI
// ──────────────────────────────────────────────
function buildOwnerPanel() {
  if (!isOwner() && !isAdmin()) return;

  // Tombol buka panel
  const btn = document.createElement("div");
  btn.id = "ownerPanelBtn";
  Object.assign(btn.style, {
    position: "fixed", right: "12px", bottom: "210px",
    padding: "7px 13px",
    background: "linear-gradient(135deg,#f39c12,#e67e22)",
    border: "2px solid rgba(255,200,0,0.5)",
    borderRadius: "10px", color: "#fff",
    fontSize: "13px", fontWeight: "bold",
    cursor: "pointer", zIndex: "25",
    boxShadow: "0 0 14px rgba(243,156,18,0.6)",
    userSelect: "none"
  });
  const isAdm = isAdminOnly();
  btn.textContent = isAdm ? "🛡️ Admin" : "👑 Owner";
  btn.style.background = isAdm
    ? "linear-gradient(135deg,#2980b9,#3498db)"
    : "linear-gradient(135deg,#f39c12,#e67e22)";
  btn.style.boxShadow = isAdm ? "0 0 14px rgba(52,152,219,0.6)" : "0 0 14px rgba(243,156,18,0.6)";
  btn.onclick = () => {
    const panel = document.getElementById("ownerPanel");
    if (panel) { panel.style.display = panel.style.display === "flex" ? "none" : "flex"; refreshOwnerPanel(); }
  };
  document.body.appendChild(btn);

  // Cinematic mode button (shortcut dari owner panel)
  // Will be appended to panel after it's built

  // Panel utama
  const panel = document.createElement("div");
  panel.id = "ownerPanel";
  Object.assign(panel.style, {
    position: "fixed", top: "50%", left: "50%",
    transform: "translate(-50%,-50%)",
    width: "min(94vw,480px)", maxHeight: "85vh",
    background: "rgba(5,8,18,0.97)",
    border: "2px solid rgba(243,156,18,0.5)",
    borderRadius: "18px", display: "none",
    flexDirection: "column", zIndex: "9000",
    overflow: "hidden",
    boxShadow: "0 0 40px rgba(243,156,18,0.25)"
  });

  // Header
  const header = document.createElement("div");
  Object.assign(header.style, {
    padding: "16px 20px",
    background: "linear-gradient(135deg,rgba(243,156,18,0.2),rgba(230,126,34,0.15))",
    borderBottom: "1px solid rgba(243,156,18,0.3)",
    display: "flex", alignItems: "center", justifyContent: "space-between"
  });
  const myPanelName = localStorage.getItem("playerName") || "";
  const panelIsAdmin = isAdminOnly();
  header.innerHTML = `
    <div>
      <div style="color:${panelIsAdmin?'#3498db':'#f39c12'};font-size:18px;font-weight:bold">
        ${panelIsAdmin ? '🛡️ Admin Panel' : '👑 Owner Panel'}
      </div>
      <div style="color:#888;font-size:11px">Logged in as ${myPanelName}${panelIsAdmin?' (Admin)':''}</div>
    </div>
    <button onclick="document.getElementById('ownerPanel').style.display='none'"
      style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
             color:#fff;padding:6px 13px;border-radius:8px;cursor:pointer;font-size:13px">✕ Tutup</button>
  `;

  // Tabs
  const tabs = document.createElement("div");
  Object.assign(tabs.style, {
    display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)"
  });
  // Admin hanya dapat tab terbatas
  const allTabNames = [["players","👥 Players"],["broadcast","📢 Broadcast"],["world","🌍 World"],["fish","🐟 Fish"],["gift","🎁 Gift"],["banned","🚫 Banned"],["admins","🛡️ Admins"]];
  const adminTabNames = [["players","👥 Players"],["broadcast","📢 Broadcast"],["world","🌍 World"]];
  const tabNames = isAdminOnly() ? adminTabNames : allTabNames;
  tabNames.forEach(([id, label]) => {
    const t = document.createElement("div");
    t.dataset.tab = id;
    t.textContent = label;
    Object.assign(t.style, {
      flex: "1", padding: "10px 4px", textAlign: "center",
      cursor: "pointer", fontSize: "12px", color: "#888",
      borderBottom: "3px solid transparent", transition: "all .2s"
    });
    t.onclick = () => switchOwnerTab(id);
    tabs.appendChild(t);
  });

  // Content area
  const content = document.createElement("div");
  content.id = "ownerPanelContent";
  Object.assign(content.style, {
    flex: "1", overflowY: "auto", padding: "16px"
  });

  panel.appendChild(header);
  panel.appendChild(tabs);
  panel.appendChild(content);
  document.body.appendChild(panel);

  switchOwnerTab("players");
}

let currentOwnerTab = "players";
function switchOwnerTab(tab) {
  currentOwnerTab = tab;
  // Update tab styles
  const tabs = document.querySelectorAll("#ownerPanel [data-tab]");
  tabs.forEach(t => {
    const active = t.dataset.tab === tab;
    t.style.color = active ? "#f39c12" : "#888";
    t.style.borderBottomColor = active ? "#f39c12" : "transparent";
    t.style.background = active ? "rgba(243,156,18,0.08)" : "transparent";
  });
  refreshOwnerPanel();
}

function refreshOwnerPanel() {
  const content = document.getElementById("ownerPanelContent");
  if (!content) return;
  // Add cinematic button if not yet added
  if(!document.getElementById("cinPanelBtn")){
    const op=document.getElementById("ownerPanel");
    if(op){
      const cb=document.createElement("button");
      cb.id="cinPanelBtn";
      cb.textContent="🎬 Cinematic Mode";
      Object.assign(cb.style,{width:"100%",padding:"10px",marginTop:"10px",
        background:"linear-gradient(135deg,#8e44ad,#6c3483)",
        border:"none",borderRadius:"10px",color:"#fff",
        fontSize:"13px",fontWeight:"bold",cursor:"pointer"});
      cb.onclick=()=>{if(window.cinematicToggle)window.cinematicToggle();};
      op.appendChild(cb);
    }
  }

  // Admin: reset to allowed tab if current tab not allowed
  const adminAllowedTabs = ["players","broadcast","world"];
  if (isAdminOnly() && !adminAllowedTabs.includes(currentOwnerTab)) currentOwnerTab = "players";

  if (currentOwnerTab === "players") renderPlayersTab(content);
  else if (currentOwnerTab === "gift") renderGiftTab(content);
  else if (currentOwnerTab === "broadcast") renderBroadcastTab(content);
  else if (currentOwnerTab === "world") renderWorldTab(content);
  else if (currentOwnerTab === "banned") renderBannedTab(content);
  else if (currentOwnerTab === "fish") renderFishGiveTab(content);
  else if (currentOwnerTab === "admins") renderAdminsTab(content);
}

// ── TAB: Players ──
function renderPlayersTab(el) {
  const players = Object.entries(otherPlayers || {});
  let html = `
    <div style="color:#aaa;font-size:11px;margin-bottom:12px">
      ${players.length} player online (selain kamu)
    </div>`;

  if (players.length === 0) {
    html += `<div style="text-align:center;color:#555;padding:24px;font-size:13px">
      Belum ada player lain online.</div>`;
  } else {
    players.forEach(([id, op]) => {
      const d = op.latestData || {};
      const name = d.name || "Player";
      const pos = `x:${(d.x||0).toFixed(0)} z:${(d.z||0).toFixed(0)}`;
      const status = d.isSwimming ? "🏊 Berenang" : d.isFishing ? "🎣 Mancing" : d.onJetski ? "🛥️ Jetski" : "🚶 Berjalan";

      html += `
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                    border-radius:12px;padding:12px;margin-bottom:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div>
              <div style="color:#fff;font-size:14px;font-weight:bold">${name}</div>
              <div style="color:#888;font-size:11px">${status} · ${pos}</div>
            </div>
            <div style="width:10px;height:10px;background:#2ecc71;border-radius:50%;box-shadow:0 0 6px #2ecc71"></div>
          </div>
          <div style="display:flex;gap:7px;flex-wrap:wrap">
            <button onclick="kickPlayer('${id}','${name}')"
              style="padding:6px 13px;background:linear-gradient(135deg,#e67e22,#d35400);
                     border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:11px;font-weight:bold">
              🦵 Kick
            </button>
            <button onclick="banPlayer('${id}','${name}')"
              style="padding:6px 13px;background:linear-gradient(135deg,#c0392b,#e74c3c);
                     border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:11px;font-weight:bold">
              🚫 Ban
            </button>
            <button onclick="ownerTeleportTo('${id}')"
              style="padding:6px 13px;background:rgba(255,255,255,0.1);
                     border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#fff;cursor:pointer;font-size:11px">
              📍 Teleport ke dia
            </button>
            <button onclick="switchOwnerTab('gift')"
              style="padding:6px 13px;background:rgba(243,156,18,0.15);
                     border:1px solid rgba(243,156,18,0.3);border-radius:8px;color:#f39c12;cursor:pointer;font-size:11px">
              🎁 Gift
            </button>
          </div>
        </div>`;
    });
  }

  el.innerHTML = html;
}

// ── TAB: Broadcast ──
function renderBroadcastTab(el) {
  el.innerHTML = `
    <div style="color:#aaa;font-size:12px;margin-bottom:14px">
      Kirim pesan ke semua player sebagai SERVER
    </div>

    <textarea id="ownerBroadcastText" rows="3" maxlength="120"
      placeholder="Tulis pesan broadcast..."
      style="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
             border-radius:10px;color:#fff;padding:10px;font-size:13px;outline:none;
             resize:none;box-sizing:border-box;margin-bottom:10px"
    ></textarea>
    <button onclick="ownerBroadcast(document.getElementById('ownerBroadcastText').value);document.getElementById('ownerBroadcastText').value=''"
      style="width:100%;padding:11px;background:linear-gradient(135deg,#8e44ad,#9b59b6);
             border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:bold;cursor:pointer;margin-bottom:16px">
      📢 Kirim Broadcast
    </button>

    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:14px">
      <div style="color:#f39c12;font-size:12px;font-weight:bold;margin-bottom:10px">💰 Beri Koin ke Semua</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input id="ownerCoinAmt" type="number" value="500" min="1" max="99999"
          style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
                 border-radius:8px;color:#fff;padding:8px 10px;font-size:13px;outline:none">
        <button onclick="ownerGiveCoins(parseInt(document.getElementById('ownerCoinAmt').value))"
          style="padding:8px 16px;background:linear-gradient(135deg,#f39c12,#e67e22);
                 border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:13px;font-weight:bold">
          💰 Beri
        </button>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        ${[100,500,1000,5000].map(n => `
          <button onclick="ownerGiveCoins(${n})"
            style="padding:6px 12px;background:rgba(243,156,18,0.15);border:1px solid rgba(243,156,18,0.3);
                   border-radius:8px;color:#f39c12;cursor:pointer;font-size:12px">
            +💰${n}
          </button>`).join("")}
      </div>
    </div>

    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:14px;margin-top:14px">
      <button onclick="ownerClearChat()"
        style="width:100%;padding:10px;background:rgba(255,255,255,0.06);
               border:1px solid rgba(255,255,255,0.15);border-radius:10px;
               color:#aaa;cursor:pointer;font-size:13px">
        🗑️ Clear Chat
      </button>
    </div>
  `;
  // stop key propagation on inputs
  el.querySelectorAll("input,textarea").forEach(inp => inp.addEventListener("keydown", e => e.stopPropagation()));
}

// ── TAB: World ──
function renderWorldTab(el) {
  const weathers = window.weatherTypes || [];
  el.innerHTML = `
    <div style="color:#aaa;font-size:12px;margin-bottom:14px">
      Kontrol dunia game untuk semua player
    </div>

    <div style="color:#7ecfff;font-size:12px;font-weight:bold;margin-bottom:8px">🌦️ Ganti Cuaca</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
      ${weathers.map(w => `
        <button onclick="ownerSetWeather('${w.name}')"
          style="padding:8px 14px;background:rgba(255,255,255,0.07);
                 border:1px solid rgba(255,255,255,0.15);border-radius:9px;
                 color:#fff;cursor:pointer;font-size:13px">
          ${w.icon} ${w.name}
        </button>`).join("")}
    </div>

    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:14px">
      <div style="color:#7ecfff;font-size:12px;font-weight:bold;margin-bottom:8px">📍 Teleport Diri Sendiri</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button onclick="ownerTeleportSelf(0,-50)" style="${ownerTeleportBtnStyle()}">🏝️ Main Island</button>
        <button onclick="ownerTeleportSelf(700,-30)" style="${ownerTeleportBtnStyle()}">🔮 Mystic Isle</button>
        <button onclick="ownerTeleportSelf(-800,-550)" style="${ownerTeleportBtnStyle()}">🌋 Volcano Isle</button>
        <button onclick="ownerTeleportSelf(300,970)" style="${ownerTeleportBtnStyle()}">💎 Crystal Isle</button>
        <button onclick="ownerTeleportSelf(-400,1170)" style="${ownerTeleportBtnStyle()}">🌌 Aurora Isle</button>
      </div>
    </div>

    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:14px;margin-top:14px">
      <div style="color:#7ecfff;font-size:12px;font-weight:bold;margin-bottom:8px">💰 Beri Koin ke Diri Sendiri</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        ${[1000,5000,10000,99999].map(n => `
          <button onclick="ownerGiveCoinsToSelf(${n})"
            style="padding:7px 13px;background:rgba(243,156,18,0.12);
                   border:1px solid rgba(243,156,18,0.3);border-radius:8px;
                   color:#f39c12;cursor:pointer;font-size:12px">
            +💰${n.toLocaleString()}
          </button>`).join("")}
      </div>
    </div>

    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:14px;margin-top:14px">
      <div style="color:#f1c40f;font-size:12px;font-weight:bold;margin-bottom:8px">⭐ XP & Level</div>
      
      <div style="color:#aaa;font-size:11px;margin-bottom:6px">Tambah XP ke diri sendiri:</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px">
        ${[100,500,1000,5000,10000].map(n => `
          <button onclick="ownerGiveXP(${n})"
            style="padding:6px 12px;background:rgba(241,196,15,0.12);
                   border:1px solid rgba(241,196,15,0.35);border-radius:8px;
                   color:#f1c40f;cursor:pointer;font-size:12px">
            +${n.toLocaleString()} XP
          </button>`).join("")}
      </div>

      <div style="color:#aaa;font-size:11px;margin-bottom:6px">XP ke semua player:</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px">
        ${[100,500,1000].map(n => `
          <button onclick="ownerGiveXPToAll(${n})"
            style="padding:6px 12px;background:rgba(241,196,15,0.08);
                   border:1px solid rgba(241,196,15,0.2);border-radius:8px;
                   color:#e6b800;cursor:pointer;font-size:12px">
            🌐 +${n} XP semua
          </button>`).join("")}
      </div>

      <div style="color:#aaa;font-size:11px;margin-bottom:6px">Set level langsung:</div>
      <div style="display:flex;gap:7px;align-items:center">
        <input id="ownerLevelInput" type="number" min="1" max="11" value="5"
          style="width:70px;padding:7px;background:rgba(255,255,255,0.08);
                 border:1px solid rgba(255,255,255,0.15);border-radius:8px;
                 color:#fff;font-size:13px;outline:none;text-align:center">
        <button onclick="ownerSetLevel(document.getElementById('ownerLevelInput').value)"
          style="padding:7px 16px;background:linear-gradient(135deg,#f1c40f,#f39c12);
                 border:none;border-radius:8px;color:#000;font-weight:bold;
                 cursor:pointer;font-size:12px">
          ⭐ Set Level
        </button>
        <span style="color:#666;font-size:11px">Max: 11</span>
      </div>
    </div>
  `;
  // stop key propagation on inputs inside world tab
  el.querySelectorAll('input').forEach(i=>i.addEventListener('keydown',e=>e.stopPropagation()));
}

function ownerTeleportBtnStyle() {
  return `padding:7px 12px;background:rgba(255,255,255,0.07);
          border:1px solid rgba(255,255,255,0.15);border-radius:8px;
          color:#fff;cursor:pointer;font-size:12px`;
}

function ownerTeleportSelf(x, z) {
  if (!window.player) return;
  window.player.position.set(x, 0, z);
  addSystemMsg(`📍 Teleport ke (${x}, ${z})`);
}

function ownerTeleportTo(playerId) {
  const op = (typeof otherPlayers !== "undefined") && otherPlayers[playerId];
  if (!op || !op.latestData || !window.player) return;
  window.player.position.set(op.latestData.x + 2, 0, op.latestData.z + 2);
  addSystemMsg(`📍 Teleport ke ${op.latestData.name}`);
}

function ownerGiveCoinsToSelf(amount) {
  window.coins = (window.coins || 0) + amount;
  const coinUI = document.getElementById("coinUI");
  if (coinUI) coinUI.textContent = "💰 " + window.coins;
  addSystemMsg(`💰 +${amount.toLocaleString()} koin untukmu!`);
}

function ownerGiveXP(amount) {
  if (typeof window.gainXP === "function") {
    window.gainXP(amount);
    addSystemMsg(`⭐ +${amount.toLocaleString()} XP!`);
  } else {
    // fallback manual
    window.playerXP = (window.playerXP || 0) + amount;
    if (typeof window.checkLevelUp === "function") window.checkLevelUp();
    if (typeof window.updateLevelUI === "function") window.updateLevelUI();
    addSystemMsg(`⭐ +${amount.toLocaleString()} XP!`);
  }
}

function ownerSetLevel(level) {
  const lv = Math.max(1, Math.min(parseInt(level)||1, 11));
  const xpThresholds = window.xpThresholds || [0,100,250,450,700,1000,1400,1900,2500,3200,4000];
  window.playerLevel = lv;
  window.playerXP = xpThresholds[lv-1] || 0;
  if (typeof window.updateLevelUI === "function") window.updateLevelUI();
  addSystemMsg(`⭐ Level disetel ke ${lv}!`);
  showMessage && showMessage(`⭐ Level: ${lv}`);
}

function ownerGiveXPToAll(amount) {
  if (!db) return;
  db.ref(`rooms/${roomId}/serverCommands`).push({
    cmd: "giveXP",
    value: amount,
    ts: Date.now()
  });
  ownerGiveXP(amount); // beri ke diri sendiri juga
  addSystemMsg(`⭐ Memberi ${amount} XP ke semua player`);
}

// ── GIFT SYSTEM ──
function ownerGiftCoins(targetId, targetName, amount) {
  if (!db) return;
  db.ref(`rooms/${roomId}/gifts`).push({
    cmd: "giftCoins",
    to: targetId,
    toName: targetName,
    from: localStorage.getItem("playerName") || "Owner",
    value: amount,
    ts: Date.now()
  });
  addSystemMsg(`🎁 Gift 💰${amount} koin ke ${targetName}`);
}

function ownerGiftFish(targetId, targetName, fishName) {
  if (!db) return;
  const fishTypes = window.fishTypes || [];
  const fish = fishTypes.find(f => f.name === fishName);
  if (!fish) return;
  const weightInput = document.getElementById("ownerFishWeight");
  let customWeight = null;
  if (weightInput && weightInput.value !== "") {
    customWeight = parseFloat(weightInput.value);
    if (isNaN(customWeight) || customWeight <= 0) customWeight = null;
  }
  const WEIGHT_RANGE={Junk:[20,80],Common:[80,400],Uncommon:[300,900],Rare:[700,2500],Epic:[1500,6000],Legendary:[5000,20000]};
  const wr = WEIGHT_RANGE[fish.rarity] || [50,500];
  const weight = customWeight !== null ? customWeight : +(wr[0]+Math.random()*(wr[1]-wr[0])).toFixed(1);
  const wLabel = weight >= 1000 ? (weight/1000).toFixed(2)+"kg" : weight+"g";
  db.ref(`rooms/${roomId}/gifts`).push({
    cmd: "giftFish",
    to: targetId,
    toName: targetName,
    from: localStorage.getItem("playerName") || "Owner",
    fish: { ...fish, weight },
    ts: Date.now()
  });
  addSystemMsg(`🎁 Gift ${fish.emoji} ${fish.name} ⚖️${wLabel} ke ${targetName}`);
}

function ownerAddFishToSelf(fishName) {
  const fishTypes = window.fishTypes || [];
  const fish = fishTypes.find(f => f.name === fishName);
  if (!fish) return;
  // Baca berat dari input jika ada
  const weightInput = document.getElementById("ownerFishWeight");
  let customWeight = null;
  if (weightInput && weightInput.value !== "") {
    customWeight = parseFloat(weightInput.value);
    if (isNaN(customWeight) || customWeight <= 0) customWeight = null;
  }
  // Jika tidak diisi, generate random berdasarkan rarity
  const WEIGHT_RANGE={Junk:[20,80],Common:[80,400],Uncommon:[300,900],Rare:[700,2500],Epic:[1500,6000],Legendary:[5000,20000]};
  const wr = WEIGHT_RANGE[fish.rarity] || [50,500];
  const weight = customWeight !== null ? customWeight : +(wr[0]+Math.random()*(wr[1]-wr[0])).toFixed(1);
  const wLabel = weight >= 1000 ? (weight/1000).toFixed(2)+"kg" : weight+"g";
  const fishObj = {
    ...fish,
    id: Date.now() + Math.random(),
    weight: weight,
    caughtAt: new Date().toLocaleTimeString()
  };
  if (window.inventory && Array.isArray(window.inventory.fish)) {
    window.inventory.fish.push(fishObj);
  }
  addSystemMsg(`✅ ${fish.emoji} ${fish.name} (${wLabel}) ditambahkan ke tas!`);
  if (typeof window.showMessage === "function") window.showMessage(`🎣 Dapat ${fish.emoji} ${fish.name} ⚖️${wLabel}!`);
}

function showGiftNotif(text) {
  const notif = document.createElement("div");
  notif.textContent = text;
  Object.assign(notif.style, {
    position:"fixed", top:"80px", left:"50%",
    transform:"translateX(-50%)",
    background:"linear-gradient(135deg,#e74c3c,#c0392b)",
    color:"#fff", padding:"12px 24px", borderRadius:"14px",
    fontSize:"15px", fontWeight:"bold", zIndex:"99999",
    boxShadow:"0 4px 20px rgba(231,76,60,0.5)",
    pointerEvents:"none", textAlign:"center"
  });
  document.body.appendChild(notif);
  setTimeout(()=>{ notif.style.transition="opacity 0.5s"; notif.style.opacity="0"; setTimeout(()=>notif.remove(),500); },4000);
}

// ── GIFT SYSTEM ──
function ownerGiftFish(fishName) {
  // Tambah ikan langsung ke inventory owner
  const fishDB = window.fishTypes || [];
  const fish = fishDB.find(f => f.name === fishName);
  if (!fish) { addSystemMsg("❌ Ikan tidak ditemukan"); return; }
  const inv = window.inventory;
  if (!inv) return;
  const newFish = {
    ...fish,
    id: "gift_" + Date.now(),
    caughtAt: new Date().toLocaleString(),
    gifted: true
  };
  inv.fish = inv.fish || [];
  inv.fish.push(newFish);
  addSystemMsg(`🎁 Dapat ${fish.emoji} ${fish.name}!`);
  // Notif visual
  showGiftNotif(`🎁 Kamu mendapat ${fish.emoji} ${fish.name}!`);
  if (typeof window.renderTab === "function") window.renderTab("fish");
}

function ownerGiftFishToPlayer(playerId, playerName, fishName) {
  if (!db) return;
  const fishDB = window.fishTypes || [];
  const fish = fishDB.find(f => f.name === fishName);
  if (!fish) return;
  db.ref(`rooms/${roomId}/serverCommands`).push({
    cmd: "giftFish",
    fishName,
    targetId: playerId,
    from: localStorage.getItem("playerName") || "Owner",
    ts: Date.now()
  });
  addSystemMsg(`🎁 Kirim ${fish.emoji} ${fish.name} ke ${playerName}`);
}

function ownerGiftCoinsToPlayer(playerId, playerName, amount) {
  if (!db) return;
  db.ref(`rooms/${roomId}/serverCommands`).push({
    cmd: "giftCoins",
    value: amount,
    targetId: playerId,
    from: localStorage.getItem("playerName") || "Owner",
    ts: Date.now()
  });
  addSystemMsg(`💝 Kirim 💰${amount} ke ${playerName}`);
}

function showGiftNotif(text) {
  const el = document.getElementById("giftNotif");
  if (!el) return;
  el.textContent = text;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 3500);
}

// ── TAB: Gift ──
function renderGiftTab(el) {
  const fishDB = window.fishTypes || [];
  const players = Object.entries(otherPlayers || {});

  // Rarity colors
  const rarityColor = {Common:"#aaa",Uncommon:"#2ecc71",Rare:"#3498db",Epic:"#9b59b6",Legendary:"#f39c12",Junk:"#666"};

  let html = `
    <div style="color:#aaa;font-size:11px;margin-bottom:12px">
      Kirim ikan atau koin ke player atau diri sendiri
    </div>

    <div style="color:#f39c12;font-size:12px;font-weight:bold;margin-bottom:8px">🐟 Tambah Ikan ke Bag Kamu</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      ${fishDB.map(f => `
        <button onclick="ownerGiftFish('${f.name}')"
          style="padding:6px 10px;background:rgba(255,255,255,0.06);
                 border:1px solid ${rarityColor[f.rarity]||'#555'};
                 border-radius:8px;color:#fff;cursor:pointer;font-size:12px;
                 display:flex;align-items:center;gap:4px">
          ${f.emoji} <span style="color:${rarityColor[f.rarity]}">${f.name}</span>
        </button>`).join("")}
    </div>`;

  if (players.length > 0) {
    html += `<div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;margin-bottom:8px">
      <div style="color:#f39c12;font-size:12px;font-weight:bold;margin-bottom:10px">🎁 Gift ke Player Online</div>`;

    players.forEach(([id, op]) => {
      const d = op.latestData || {};
      const name = d.name || "Player";
      html += `
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
                    border-radius:10px;padding:10px;margin-bottom:8px">
          <div style="color:#fff;font-size:13px;font-weight:bold;margin-bottom:8px">📦 Gift ke ${name}</div>
          <div style="color:#aaa;font-size:11px;margin-bottom:5px">Pilih ikan:</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
            ${fishDB.map(f => `
              <button onclick="ownerGiftFishToPlayer('${id}','${name}','${f.name}')"
                style="padding:5px 8px;background:rgba(255,255,255,0.05);
                       border:1px solid ${rarityColor[f.rarity]||'#555'};
                       border-radius:7px;color:#fff;cursor:pointer;font-size:11px">
                ${f.emoji}
              </button>`).join("")}
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <input id="giftCoin_${id}" type="number" value="500" min="1" placeholder="koin"
              style="width:80px;padding:6px;background:rgba(255,255,255,0.08);
                     border:1px solid rgba(255,255,255,0.15);border-radius:7px;
                     color:#fff;font-size:12px;outline:none;text-align:center">
            <button onclick="ownerGiftCoinsToPlayer('${id}','${name}',parseInt(document.getElementById('giftCoin_${id}').value))"
              style="padding:6px 12px;background:rgba(243,156,18,0.2);border:1px solid #f39c12;
                     border-radius:7px;color:#f39c12;cursor:pointer;font-size:12px;font-weight:bold">
              💰 Gift Koin
            </button>
          </div>
        </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div style="color:#555;font-size:12px;text-align:center;padding:12px">
      Tidak ada player lain online untuk di-gift.</div>`;
  }

  el.innerHTML = html;
  el.querySelectorAll("input").forEach(i => i.addEventListener("keydown", e => e.stopPropagation()));
}

// ── TAB: Fish Give (owner beri ikan) ──
function renderFishGiveTab(el) {
  const fishTypes = window.fishTypes || [];
  const rarityColor = {Common:"#aaa",Uncommon:"#2ecc71",Rare:"#3498db",Epic:"#9b59b6",Legendary:"#f39c12"};

  let html = `<div style="color:#aaa;font-size:11px;margin-bottom:12px">Klik ikan untuk menambahkan ke tas kamu, atau gift ke player lain</div>`;

  // Tombol tambah ke diri sendiri
  html += `<div style="color:#7ecfff;font-size:12px;font-weight:bold;margin-bottom:8px">🐟 Tambah ke Tas Sendiri</div>`;
  html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">`;
  // Input berat custom
  html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;background:rgba(255,255,255,0.05);padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.1)">
    <span style="font-size:13px">⚖️ Berat:</span>
    <input id="ownerFishWeight" type="number" min="1" max="99999" placeholder="gram (kosong=random)"
      style="flex:1;padding:5px 8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:7px;color:#fff;font-size:12px">
    <span style="font-size:11px;color:#888">g</span>
  </div>`;
  fishTypes.forEach(f => {
    html += `<button onclick="ownerAddFishToSelf('${f.name}')"
      style="padding:6px 10px;background:rgba(255,255,255,0.07);
             border:1px solid rgba(255,255,255,0.15);border-radius:8px;
             color:#fff;cursor:pointer;font-size:12px;text-align:left">
      ${f.emoji} <span style="color:${rarityColor[f.rarity]||'#fff'}">${f.name}</span>
      <span style="color:#888;font-size:10px"> 💰${f.price}</span>
    </button>`;
  });
  html += `</div>`;

  // Gift ke player lain
  const players = Object.entries(otherPlayers || {});
  if (players.length > 0) {
    html += `<div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;margin-top:4px">`;
    html += `<div style="color:#7ecfff;font-size:12px;font-weight:bold;margin-bottom:8px">🎁 Gift Ikan ke Player</div>`;
    players.forEach(([id, op]) => {
      const name = (op.latestData && op.latestData.name) || "Player";
      html += `<div style="margin-bottom:10px">
        <div style="color:#fff;font-size:12px;margin-bottom:5px">→ ${name}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">`;
      fishTypes.forEach(f => {
        html += `<button onclick="ownerGiftFish('${id}','${name}','${f.name}')"
          style="padding:4px 8px;background:rgba(155,89,182,0.15);
                 border:1px solid rgba(155,89,182,0.3);border-radius:7px;
                 color:#ddd;cursor:pointer;font-size:11px">
          ${f.emoji} ${f.name}
        </button>`;
      });
      html += `</div></div>`;
    });
    html += `</div>`;
  } else {
    html += `<div style="color:#555;font-size:12px;margin-top:8px">Tidak ada player lain online untuk di-gift.</div>`;
  }

  el.innerHTML = html;
}

// ── TAB: Gift (gift coins & item ke player) ──
function renderGiftTab(el) {
  const players = Object.entries(otherPlayers || {});
  let html = `<div style="color:#aaa;font-size:11px;margin-bottom:12px">Gift koin atau item ke player yang sedang online</div>`;

  if (players.length === 0) {
    el.innerHTML = html + `<div style="text-align:center;color:#555;padding:24px;font-size:13px">Tidak ada player lain online.</div>`;
    return;
  }

  players.forEach(([id, op]) => {
    const name = (op.latestData && op.latestData.name) || "Player";
    html += `
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                  border-radius:12px;padding:12px;margin-bottom:10px">
        <div style="color:#fff;font-size:13px;font-weight:bold;margin-bottom:8px">🎁 Gift ke: ${name}</div>
        <div style="color:#aaa;font-size:11px;margin-bottom:5px">💰 Gift Koin:</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          ${[100,500,1000,5000].map(n => `
            <button onclick="ownerGiftCoins('${id}','${name}',${n})"
              style="padding:5px 11px;background:rgba(243,156,18,0.15);
                     border:1px solid rgba(243,156,18,0.3);border-radius:7px;
                     color:#f39c12;cursor:pointer;font-size:12px">
              💰${n}
            </button>`).join("")}
        </div>
        <div style="color:#aaa;font-size:11px;margin-bottom:5px">🐟 Gift Ikan:</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${(window.fishTypes||[]).slice(0,8).map(f => `
            <button onclick="ownerGiftFish('${id}','${name}','${f.name}')"
              style="padding:4px 8px;background:rgba(155,89,182,0.12);
                     border:1px solid rgba(155,89,182,0.25);border-radius:7px;
                     color:#ddd;cursor:pointer;font-size:11px">
              ${f.emoji} ${f.name}
            </button>`).join("")}
        </div>
      </div>`;
  });

  el.innerHTML = html;
}

// ── TAB: Banned ──
function renderBannedTab(el) {
  if (!db) { el.innerHTML = `<div style="color:#555;text-align:center;padding:20px">DB tidak aktif</div>`; return; }
  el.innerHTML = `<div style="color:#aaa;font-size:12px;margin-bottom:10px">Memuat list ban...</div>`;
  db.ref(`rooms/${roomId}/banned`).once("value", snap => {
    const banned = snap.val() || {};
    const names  = Object.keys(banned);
    if (names.length === 0) {
      el.innerHTML = `<div style="text-align:center;color:#555;padding:24px;font-size:13px">Tidak ada player yang di-ban.</div>`;
      return;
    }
    el.innerHTML = `<div style="color:#aaa;font-size:12px;margin-bottom:12px">${names.length} player di-ban</div>`
      + names.map(name => `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    background:rgba(231,76,60,0.08);border:1px solid rgba(231,76,60,0.2);
                    border-radius:10px;padding:10px 14px;margin-bottom:8px">
          <span style="color:#e74c3c;font-size:13px">🚫 ${name}</span>
          <button onclick="unbanPlayer('${name}')"
            style="padding:5px 12px;background:rgba(39,174,96,0.2);border:1px solid #27ae60;
                   border-radius:7px;color:#2ecc71;cursor:pointer;font-size:11px">
            ✅ Unban
          </button>
        </div>`).join("");
  });
}

// ──────────────────────────────────────────────
// ── TAB: Cinematic (grant free cam access) ──
function renderCinematicTab(el) {
  const players = Object.entries(otherPlayers || {});
  const cinAccessList = JSON.parse(localStorage.getItem("cinAccessList_lf") || "[]");

  let html = `<div style="color:#aaa;font-size:11px;margin-bottom:12px">
    Beri akses <b>Free Cam</b> ke player.<br>
    Player yang diberi akses hanya bisa menggunakan free cam mode saja.
  </div>`;

  html += `<button onclick="if(window.cinematicToggle)window.cinematicToggle();"
    style="width:100%;padding:10px;margin-bottom:14px;
           background:linear-gradient(135deg,#8e44ad,#6c3483);
           border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:bold;cursor:pointer">
    🎬 Buka Panel Cinematic Saya
  </button>`;

  if (players.length > 0) {
    html += `<div style="color:#cc88ff;font-size:12px;font-weight:bold;margin-bottom:8px">👥 Player Online</div>`;
    players.forEach(([id, op]) => {
      const name = (op.latestData && op.latestData.name) || "Player";
      const hasAccess = cinAccessList.includes(name);
      html += `<div style="display:flex;align-items:center;justify-content:space-between;
                background:rgba(142,68,173,0.08);border:1px solid rgba(142,68,173,0.2);
                border-radius:10px;padding:9px 13px;margin-bottom:7px">
        <span style="color:#ddd;font-size:13px">🎥 ${name}</span>
        <button onclick="toggleCinAccess('${name}','${id}')"
          style="padding:5px 12px;background:${hasAccess?"linear-gradient(135deg,#c0392b,#e74c3c)":"linear-gradient(135deg,#8e44ad,#6c3483)"};
                 border:none;border-radius:7px;color:#fff;cursor:pointer;font-size:11px;font-weight:bold">
          ${hasAccess ? "✕ Cabut" : "✓ Beri Akses"}
        </button>
      </div>`;
    });
  } else {
    html += `<div style="color:#555;font-size:12px;padding:16px;text-align:center">Tidak ada player online.</div>`;
  }

  el.innerHTML = html;
}

function toggleCinAccess(playerName, playerId) {
  const list = JSON.parse(localStorage.getItem("cinAccessList_lf") || "[]");
  const hasAccess = list.includes(playerName);
  const newList = hasAccess ? list.filter(n => n !== playerName) : [...list, playerName];
  localStorage.setItem("cinAccessList_lf", JSON.stringify(newList));
  if (db) db.ref(`rooms/${roomId}/serverCommands`).push({
    cmd: "cinAccess", targetId: playerId, grant: !hasAccess, ts: Date.now()
  });
  addSystemMsg(`🎬 ${hasAccess?"Cabut":"Beri"} akses Free Cam: ${playerName}`);
  refreshOwnerPanel();
}

// ── TAB: Admins (owner only) ──
function renderAdminsTab(el) {
  if (!isOwner()) { el.innerHTML = `<div style="color:#e74c3c;padding:20px;text-align:center">Hanya Owner yang bisa mengatur admin.</div>`; return; }

  const adminList = getAdminList();
  const onlinePlayers = Object.values(otherPlayers || {}).map(op => (op.latestData && op.latestData.name) || null).filter(Boolean);

  let html = `<div style="color:#aaa;font-size:11px;margin-bottom:14px">Admin bisa: kelola cuaca, teleport, kick/ban.<br><b>Tidak bisa</b>: ambil ikan, koin, atau XP.</div>`;

  html += `<div style="color:#3498db;font-size:12px;font-weight:bold;margin-bottom:8px">🛡️ Admin Saat Ini (${adminList.length})</div>`;
  if (adminList.length === 0) {
    html += `<div style="color:#555;font-size:12px;margin-bottom:12px;padding:10px;background:rgba(255,255,255,0.03);border-radius:8px">Belum ada admin.</div>`;
  } else {
    adminList.forEach(name => {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;
                background:rgba(52,152,219,0.1);border:1px solid rgba(52,152,219,0.25);
                border-radius:10px;padding:9px 13px;margin-bottom:7px">
        <span style="color:#7ecfff;font-size:13px">🛡️ ${name}</span>
        <button onclick="removeAdmin('${name}')"
          style="padding:4px 10px;background:rgba(231,76,60,0.2);border:1px solid rgba(231,76,60,0.4);
                 border-radius:7px;color:#e74c3c;cursor:pointer;font-size:11px">✕ Hapus</button>
      </div>`;
    });
  }

  const candidates = onlinePlayers.filter(n => !adminList.includes(n) && n !== OWNER_NAME);
  if (candidates.length > 0) {
    html += `<div style="color:#3498db;font-size:12px;font-weight:bold;margin:14px 0 8px">➕ Jadikan Admin</div>`;
    candidates.forEach(name => {
      html += `<button onclick="addAdmin('${name}')"
        style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;margin-bottom:6px;
               background:rgba(52,152,219,0.08);border:1px solid rgba(52,152,219,0.2);
               border-radius:9px;color:#fff;cursor:pointer;font-size:12px;text-align:left">
        <span>👤</span> ${name}
        <span style="margin-left:auto;color:#3498db;font-size:11px">+ Jadikan Admin</span>
      </button>`;
    });
  }

  html += `<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07)">
    <div style="color:#aaa;font-size:11px;margin-bottom:6px">Tambah admin by nama:</div>
    <div style="display:flex;gap:6px">
      <input id="adminNameInput" placeholder="Nama player..." style="flex:1;padding:7px 10px;
        background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);
        border-radius:8px;color:#fff;font-size:12px">
      <button onclick="addAdminByInput()" style="padding:7px 14px;background:linear-gradient(135deg,#2980b9,#3498db);
        border:none;border-radius:8px;color:#fff;font-size:12px;cursor:pointer;font-weight:bold">+ Admin</button>
    </div>
  </div>`;

  el.innerHTML = html;
}

function addAdmin(name) {
  if (!isOwner()) return;
  const list = getAdminList();
  if (!list.includes(name)) { list.push(name); saveAdminList(list); }
  addSystemMsg(`🛡️ ${name} dijadikan Admin!`);
  if (db) db.ref(`rooms/${roomId}/admins/${name}`).set(true);
  refreshOwnerPanel();
}
function addAdminByInput() {
  const inp = document.getElementById("adminNameInput");
  if (!inp || !inp.value.trim()) return;
  addAdmin(inp.value.trim()); inp.value = "";
}
function removeAdmin(name) {
  if (!isOwner()) return;
  saveAdminList(getAdminList().filter(n => n !== name));
  if (db) db.ref(`rooms/${roomId}/admins/${name}`).remove();
  addSystemMsg(`🛡️ ${name} dicopot dari Admin.`);
  refreshOwnerPanel();
}

// CROWN BADGE DI ATAS KEPALA OWNER
// (otomatis tampil di atas nama kamu untuk player lain)
// ──────────────────────────────────────────────
function addOwnerCrownToNameTag(nameCanvas) {
  // Tambahkan crown emoji sebelum nama di name tag
  const nc = nameCanvas.getContext("2d");
  nc.clearRect(0, 0, nameCanvas.width, nameCanvas.height);
  nc.fillStyle = "rgba(0,0,0,0.65)";
  nc.beginPath();
  if (nc.roundRect) nc.roundRect(0, 0, nameCanvas.width, nameCanvas.height, 10);
  else nc.rect(0, 0, nameCanvas.width, nameCanvas.height);
  nc.fill();
  nc.fillStyle = "#f39c12";
  nc.font = "bold 28px Arial";
  nc.textAlign = "center";
  nc.textBaseline = "middle";
  nc.fillText("👑 " + OWNER_NAME, nameCanvas.width / 2, nameCanvas.height / 2);
}


// ═══ OWNER PANEL END ═══

  // ── Config check ──
  const IS_CONFIGURED = !window.FIREBASE_CONFIG.apiKey.includes("ISI_DISINI");

  // ── State ──
  let db = null;
  let myId = null;
  let myRef = null;
  let playersRef = null;
  let chatRef = null;
  let otherPlayers = {};      // id → { meshes, data, walkAnim }
  let mpActive = false;
  let lastSend = 0;
  let chatOpen = false;
  let roomId = "world_main";
  let _worldSyncTimer = 0;

  const SEND_MS    = 80;   // kirim update posisi tiap 80ms
  const STALE_MS   = 12000; // hapus player yang tidak update 12 detik

  // ── Tunggu sampai game scene siap ──
  let sceneReady = false;
  function waitForScene(cb) {
    const check = setInterval(() => {
      if (window.scene && window.player && window.camera) {
        clearInterval(check);
        sceneReady = true;
        cb();
      }
    }, 200);
  }

  // ═══════════════════════════════════════════════
  // BUILD OTHER PLAYER MESH
  // ═══════════════════════════════════════════════
  function buildPlayerMesh(data) {
    const g = new THREE.Group();
    const shirtColor = data.shirtColor || "#3498db";

    // Torso
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 1),
      new THREE.MeshStandardMaterial({ color: shirtColor })
    );
    torso.position.y = 3;
    g.add(torso);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd6b3, roughness: 0.6 })
    );
    head.scale.y = 1.05;
    head.position.y = 1.9;
    torso.add(head);

    // Face canvas
    const fc = document.createElement("canvas");
    fc.width = 128; fc.height = 128;
    const fx = fc.getContext("2d");
    fx.fillStyle = "#000";
    fx.beginPath(); fx.arc(38,55,8,0,Math.PI*2); fx.arc(90,55,8,0,Math.PI*2); fx.fill();
    fx.beginPath(); fx.arc(64,80,22,0,Math.PI); fx.lineWidth = 5; fx.stroke();
    const faceMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fc), transparent: true })
    );
    faceMesh.position.z = 0.73;
    head.add(faceMesh);

    // Arms
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd6b3 });
    const armGeo  = new THREE.BoxGeometry(1, 2, 1);
    const armL = new THREE.Mesh(armGeo, skinMat); armL.position.set(-1.5, 0, 0); torso.add(armL);
    const armR = new THREE.Mesh(armGeo, skinMat); armR.position.set( 1.5, 0, 0); torso.add(armR);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const legGeo  = new THREE.BoxGeometry(1, 2, 1);
    const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(-0.5, -2, 0); torso.add(legL);
    const legR = new THREE.Mesh(legGeo, legMat); legR.position.set( 0.5, -2, 0); torso.add(legR);

    // Rod visual
    const rodMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.06, 2),
      new THREE.MeshStandardMaterial({ color: data.rodColor || 0x8b5a2b })
    );
    rodMesh.visible = false;
    const rodAnchor = new THREE.Object3D();
    rodAnchor.position.set(0, -0.8, 0.5);
    armR.add(rodAnchor);
    rodAnchor.add(rodMesh);

    // Name tag sprite
    const nameCanvas = document.createElement("canvas");
    nameCanvas.width = 300; nameCanvas.height = 72;
    const nc = nameCanvas.getContext("2d");
    nc.fillStyle = "rgba(0,0,0,0.65)";
    nc.beginPath();
    nc.roundRect(0, 0, 300, 72, 10);
    nc.fill();
    nc.fillStyle = "#fff";
    nc.font = "bold 32px Arial";
    nc.textAlign = "center";
    nc.textBaseline = "middle";
    // Show role badge in name tag
    const rawTagName = data.name || "Player";
    const tagIsOwner = rawTagName === OWNER_NAME;
    const tagIsAdmin = !tagIsOwner && getAdminList().includes(rawTagName);
    const tagLabel = tagIsOwner ? ("👑 " + rawTagName) : tagIsAdmin ? ("🛡 " + rawTagName) : rawTagName;
    nc.fillStyle = tagIsOwner ? "#f39c12" : tagIsAdmin ? "#7ecfff" : "#fff";
    nc.fillText(tagLabel.substring(0, 18), 150, 36);
    const nameSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(nameCanvas), transparent: true, depthTest: false })
    );
    nameSprite.scale.set(3.5, 0.85, 1);
    nameSprite.position.y = 6.2;
    g.add(nameSprite);

    // Fishing line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.65, transparent: true });
    const fishLine = new THREE.Line(lineGeo, lineMat);
    fishLine.visible = false;
    window.scene.add(fishLine);

    g.scale.set(0.8, 0.8, 0.8);
    window.scene.add(g);

    return { group: g, torso, head, armL, armR, legL, legR, rodMesh, nameSprite, fishLine };
  }

  // ═══════════════════════════════════════════════
  // SMOOTH INTERPOLATION FOR OTHER PLAYERS
  // ═══════════════════════════════════════════════
  function updateOtherPlayerVisuals(id, dt) {
    const op = otherPlayers[id];
    if (!op || !op.meshes) return;

    const d = op.latestData;
    const m = op.meshes;

    // Smooth position
    const target = new THREE.Vector3(d.x || 0, d.y || 0, d.z || 0);
    m.group.position.lerp(target, 0.2);

    // Smooth rotation
    let dRot = (d.ry || 0) - m.group.rotation.y;
    dRot = Math.atan2(Math.sin(dRot), Math.cos(dRot));
    m.group.rotation.y += dRot * 0.18;

    // Walk animation
    const isMoving = target.distanceTo(m.group.position) > 0.05;
    if (isMoving && !d.isFishing && !d.isSwimming) {
      op.walkAnim = (op.walkAnim || 0) + 0.18;
    } else {
      op.walkAnim = (op.walkAnim || 0) * 0.88;
    }
    const sw = Math.sin(op.walkAnim);

    if (d.isSwimming) {
      // Freestyle swim animation
      const sc = (op.swimCycle || 0) + dt * 2.5;
      op.swimCycle = sc;
      m.torso.rotation.x = THREE.MathUtils.lerp(m.torso.rotation.x, -0.65, 0.1);
      m.torso.rotation.z = Math.sin(sc * 0.5) * 0.15;
      m.armL.rotation.x = Math.sin(sc) * 1.3;
      m.armL.rotation.z = Math.cos(sc) * 0.4 - 0.3;
      m.armR.rotation.x = Math.sin(sc + Math.PI) * 1.3;
      m.armR.rotation.z = -Math.cos(sc + Math.PI) * 0.4 + 0.3;
      m.legL.rotation.x = Math.sin(sc * 2) * 0.3;
      m.legR.rotation.x = Math.sin(sc * 2 + Math.PI) * 0.3;
    } else if (d.isFishing) {
      m.torso.rotation.x = THREE.MathUtils.lerp(m.torso.rotation.x, 0, 0.1);
      m.torso.rotation.z = THREE.MathUtils.lerp(m.torso.rotation.z, 0, 0.1);
      m.armR.rotation.x = THREE.MathUtils.lerp(m.armR.rotation.x, -0.6, 0.12);
      m.armR.rotation.z = THREE.MathUtils.lerp(m.armR.rotation.z, -0.2, 0.12);
      m.armL.rotation.x = THREE.MathUtils.lerp(m.armL.rotation.x, 0.1, 0.1);
      m.legL.rotation.x = THREE.MathUtils.lerp(m.legL.rotation.x, 0, 0.1);
      m.legR.rotation.x = THREE.MathUtils.lerp(m.legR.rotation.x, 0, 0.1);
      m.rodMesh.visible = true;
      m.rodMesh.rotation.x = Math.PI / 2;
    } else {
      m.torso.rotation.x = THREE.MathUtils.lerp(m.torso.rotation.x, 0, 0.1);
      m.torso.rotation.z = THREE.MathUtils.lerp(m.torso.rotation.z, 0, 0.1);
      m.armL.rotation.x = -sw * 0.5;
      m.armR.rotation.x =  sw * 0.5;
      m.armR.rotation.z = THREE.MathUtils.lerp(m.armR.rotation.z, 0, 0.1);
      m.legL.rotation.x =  sw * 0.8;
      m.legR.rotation.x = -sw * 0.8;
      m.rodMesh.visible = false;
    }

    // Fishing line
    if (d.hookVisible) {
      m.fishLine.visible = true;
      const handW = new THREE.Vector3();
      m.group.getWorldPosition(handW);
      handW.y += 3.5;
      m.fishLine.geometry.setFromPoints([handW, new THREE.Vector3(d.hookX, d.hookY, d.hookZ)]);
    } else {
      m.fishLine.visible = false;
    }

    // Name tag always faces camera
    m.nameSprite.quaternion.copy(window.camera.quaternion);

    // Stale check
    if (Date.now() - (op.latestData.ts || 0) > STALE_MS) {
      removeOtherPlayer(id);
    }
  }

  function removeOtherPlayer(id) {
    if (!otherPlayers[id]) return;
    const m = otherPlayers[id].meshes;
    if (m) {
      window.scene.remove(m.group);
      if (m.fishLine) window.scene.remove(m.fishLine);
    }
    delete otherPlayers[id];
    updatePlayerCountBadge();
  }

  // ═══════════════════════════════════════════════
  // SEND MY STATE TO FIREBASE
  // ═══════════════════════════════════════════════
  function sendState() {
    if (!mpActive || !myRef) return;
    const now = Date.now();
    if (now - lastSend < SEND_MS) return;
    lastSend = now;

    const p = window.player;
    const h = window.hook;
    const hv = h && h.visible;

    // Get equipped rod color
    const rodDb = window.rodDatabase || {};
    const equipped = window.inventory ? window.inventory.equipped : null;
    const rodColor = rodDb[equipped] ? rodDb[equipped].color : 0x8b5a2b;

    myRef.update({
      x: +p.position.x.toFixed(2),
      y: +p.position.y.toFixed(2),
      z: +p.position.z.toFixed(2),
      ry: +p.rotation.y.toFixed(3),
      isFishing:  !!(window.isFishing),
      isSwimming: !!(window.isSwimming),
      onJetski:   !!(window.onJetski),
      hookVisible: hv,
      hookX: hv ? +h.position.x.toFixed(2) : 0,
      hookY: hv ? +h.position.y.toFixed(2) : 0,
      hookZ: hv ? +h.position.z.toFixed(2) : 0,
      rodColor: rodColor,
      shirtColor: localStorage.getItem("playerShirt") || "#2ecc71",
      ts: now
    });
  }

  // ═══════════════════════════════════════════════
  // FIREBASE CONNECTION
  // ═══════════════════════════════════════════════
  function connect() {
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      db = firebase.database();
      window.db = db; // expose for room list in main menu

      // Generate / recover player ID
      myId = localStorage.getItem("mpId") || ("p_" + Math.random().toString(36).slice(2, 10));
      localStorage.setItem("mpId", myId);

      myRef = db.ref(`rooms/${roomId}/players/${myId}`);
      playersRef = db.ref(`rooms/${roomId}/players`);
      chatRef    = db.ref(`rooms/${roomId}/chat`);

      const myName = localStorage.getItem("playerName") || "Player";
      const shirt  = localStorage.getItem("playerShirt") || "#2ecc71";

      // Register presence
      myRef.set({
        name: myName, shirtColor: shirt,
        x: 0, y: 0, z: -8, ry: 0,
        isFishing: false, isSwimming: false, onJetski: false,
        hookVisible: false, hookX: 0, hookY: 0, hookZ: 0,
        ts: Date.now(), online: true
      });
      myRef.onDisconnect().remove();

      // ── Owner: listen server commands ──
      listenServerCommands();

      // ── Check if banned before joining ──
      checkIfBanned(isBanned => {
        if (isBanned) {
          myRef.remove();
          mpActive = false;
          setStatusBadge("🚫 Kamu di-ban dari room ini", "#e74c3c");
          const overlay = document.createElement("div");
          Object.assign(overlay.style, {
            position:"fixed",inset:"0",background:"rgba(0,0,0,0.95)",
            display:"flex",alignItems:"center",justifyContent:"center",
            zIndex:"99999",flexDirection:"column",color:"#fff"
          });
          overlay.innerHTML = `<div style="font-size:64px;margin-bottom:16px">🚫</div>
            <h2 style="color:#e74c3c;margin:0 0 8px">Kamu di-ban</h2>
            <p style="color:#888;font-size:13px">Kamu tidak bisa masuk ke room ini.</p>`;
          document.body.appendChild(overlay);
          return;
        }
        mpActive = true;
        setStatusBadge("🟢 Online", "#2ecc71");
        updatePlayerCountBadge();
        addSystemMsg("✅ Terhubung! Selamat bermain 🎣");

        // Listen admin list from Firebase — sync ke localStorage
        const myName2 = localStorage.getItem("playerName") || "";
        db.ref(`rooms/${roomId}/admins/${myName2}`).on("value", snap => {
          if (snap.val() === true) {
            const list = getAdminList();
            if (!list.includes(myName2)) { list.push(myName2); saveAdminList(list); }
            // Build admin panel if not yet built
            if (!document.getElementById("ownerPanelBtn")) buildOwnerPanel();
            addSystemMsg("🛡️ Kamu sekarang adalah Admin!");
            // Update name tags of all other players (they need to re-render nametag)
            rebuildAllNameTags();
          } else if (snap.val() === null) {
            // Removed from admin
            const list = getAdminList().filter(n => n !== myName2);
            saveAdminList(list);
            // Remove panel if not owner
            if (!isOwner()) {
              const btn = document.getElementById("ownerPanelBtn");
              const panel = document.getElementById("ownerPanel");
              if (btn) btn.remove();
              if (panel) panel.remove();
            }
          }
        });

        // Realtime ban listener — langsung tampil overlay jika di-ban
        const myName = localStorage.getItem("playerName") || "";
        db.ref(`rooms/${roomId}/banned/${myName}`).on("value", snap => {
          if (snap.val() === true && mpActive) {
            mpActive = false;
            myRef.remove();
            showKickBanOverlay("ban");
          }
        });
      });

      // ── Listen for other players ──
      playersRef.on("child_added", snap => {
        if (snap.key === myId) return;
        const d = snap.val(); if (!d) return;
        const meshes = buildPlayerMesh(d);
        otherPlayers[snap.key] = { meshes, latestData: d, walkAnim: 0, swimCycle: 0 };
        updatePlayerCountBadge();
        addSystemMsg(`🟢 ${d.name || "Player"} bergabung!`);
      });

      playersRef.on("child_changed", snap => {
        if (snap.key === myId) return;
        const d = snap.val(); if (!d) return;
        if (otherPlayers[snap.key]) {
          otherPlayers[snap.key].latestData = d;
        }
      });

      playersRef.on("child_removed", snap => {
        // Jika data diri sendiri dihapus = dikick oleh Owner
        if (snap.key === myId) {
          // Jika belum ada overlay (kick tanpa cmd — fallback)
          if (!document.getElementById("kickBanOverlay")) {
            mpActive = false;
            showKickBanOverlay("kick", "", "");
          }
          return;
        }
        const _op2=otherPlayers[snap.key]; const name = (_op2 && _op2.latestData && _op2.latestData.name) || "Player";
        removeOtherPlayer(snap.key);
        addSystemMsg(`🔴 ${name} keluar.`);
      });

      // ── Listen for gifts ──
      db.ref(`rooms/${roomId}/gifts`).limitToLast(1).on("child_added", snap => {
        const g = snap.val();
        if (!g || Date.now() - g.ts > 8000) return;
        // Hanya proses kalau gift untuk kita
        if (g.to !== myId) return;
        if (g.cmd === "giftCoins") {
          window.coins = (window.coins || 0) + (g.value || 0);
          const coinUI = document.getElementById("coinUI");
          if (coinUI) coinUI.textContent = "💰 " + window.coins;
          showGiftNotif(`🎁 ${g.from} memberimu 💰${g.value} koin!`);
          addSystemMsg(`🎁 Gift dari ${g.from}: +${g.value} koin`);
        }
        if (g.cmd === "giftFish" && g.fish) {
          const fishObj = { ...g.fish, id: Date.now()+Math.random(), caughtAt: new Date().toLocaleTimeString() };
          if (window.inventory && Array.isArray(window.inventory.fish)) {
            window.inventory.fish.push(fishObj);
          }
          showGiftNotif(`🎁 ${g.from} memberimu ${g.fish.emoji} ${g.fish.name}!`);
          addSystemMsg(`🎁 Gift dari ${g.from}: ${g.fish.emoji} ${g.fish.name}`);
        }
      });

      // ── Listen for worldState (weather + dayTime) — owner is master ──
      db.ref(`rooms/${roomId}/worldState`).on("value", snap => {
        const data = snap.val();
        if (!data || !data.ts) return;
        if (Date.now() - data.ts > 60000) return; // abaikan data lama >60 detik
        const myName = localStorage.getItem("playerName");
        const isOwnerClient = myName === (window.OWNER_NAME_FOR_SYNC || "Varz444");
        if (isOwnerClient) return; // owner tidak perlu sync dari diri sendiri
        // Sync cuaca
        const wt = window.weatherTypes || [];
        const w = wt.find(x => x.name === data.weather);
        if (w && typeof window.setWeather === "function") {
          // setWeather without re-broadcasting (avoid loop)
          window._weatherSyncFromServer = true;
          window.setWeather(w);
          window._weatherSyncFromServer = false;
        }
        // Sync dayTime (smooth)
        if (data.dayTime !== undefined) {
          if (typeof window.applyDayTimeSync === "function") window.applyDayTimeSync(data.dayTime);
          else window.dayTime = data.dayTime;
        }
      });
      // Keep old weather listener for backward compat
      db.ref(`rooms/${roomId}/weather`).on("value", snap => {
        const data = snap.val();
        if (!data || !data.name) return;
        if (Date.now() - data.ts > 30000) return;
        const myName = localStorage.getItem("playerName");
        if (myName === (window.OWNER_NAME_FOR_SYNC || "Varz444")) return;
        const wt = window.weatherTypes || [];
        const w = wt.find(x => x.name === data.name);
        if (w && typeof window.setWeather === "function") window.setWeather(w);
      });

      // ── Listen for chat ──
      chatRef.limitToLast(1).on("child_added", snap => {
        const msg = snap.val();
        if (!msg || msg.senderId === myId) return;
        const displayName = getDisplayName(msg.name);
        appendChatMsg(displayName, msg.text, false);
        showFloatingBubble(msg.senderId, displayName, msg.text);
      });

      // ── Listen for game events (weather sync, jetski, dll) ──
      db.ref(`rooms/${roomId}/events`).limitToLast(1).on("child_added", snap => {
        const ev = snap.val();
        if (!ev || ev.senderId === myId) return;
        if (Date.now() - ev.ts > 8000) return; // abaikan event lama
        if (ev.type === "weather") {
          const wt = window.weatherTypes || [];
          const w = wt.find(x => x.name === (ev.data && ev.data.name));
          if (w && typeof window.setWeather === "function") window.setWeather(w);
        }
      });

      // (status set inside checkIfBanned callback)

    } catch(e) {
      console.error("[MP]", e);
      setStatusBadge("🔴 Koneksi gagal", "#e74c3c");
    }
  }

  function loadFirebaseSDK(cb) {
    if (window.firebase) { cb(); return; }
    const s1 = document.createElement("script");
    s1.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js";
      s2.onload = cb;
      s2.onerror = () => setStatusBadge("🔴 Gagal load SDK", "#e74c3c");
      document.head.appendChild(s2);
    };
    s1.onerror = () => setStatusBadge("🔴 Gagal load SDK", "#e74c3c");
    document.head.appendChild(s1);
  }

  // ═══════════════════════════════════════════════
  // CHAT UI
  // ═══════════════════════════════════════════════
  function buildChatUI() {
    // Chat box
    const box = document.createElement("div");
    box.id = "mpChatBox";
    Object.assign(box.style, {
      position: "fixed", right: "12px", bottom: "70px",
      width: "min(310px,85vw)", height: "210px",
      background: "rgba(5,10,20,0.88)", backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px",
      display: "none", flexDirection: "column", zIndex: "500", overflow: "hidden"
    });

    const msgArea = document.createElement("div");
    msgArea.id = "mpMsgArea";
    Object.assign(msgArea.style, {
      flex: "1", overflowY: "auto", padding: "8px 10px",
      display: "flex", flexDirection: "column", gap: "3px", fontSize: "12px"
    });

    const inputRow = document.createElement("div");
    Object.assign(inputRow.style, {
      display: "flex", gap: "6px", padding: "7px 8px",
      borderTop: "1px solid rgba(255,255,255,0.08)"
    });

    const inp = document.createElement("input");
    inp.id = "mpChatInput";
    inp.placeholder = "Pesan... (Enter kirim)";
    inp.maxLength = 80;
    Object.assign(inp.style, {
      flex: "1", background: "rgba(255,255,255,0.1)", border: "none",
      borderRadius: "8px", color: "#fff", padding: "6px 10px",
      fontSize: "12px", outline: "none"
    });
    inp.addEventListener("keydown", e => {
      e.stopPropagation();
      if (e.key === "Enter") sendChat();
    });
    inp.addEventListener("focus",  () => { if (window.freezeInput !== undefined) window.freezeInput = true; });
    inp.addEventListener("blur",   () => { if (window.freezeInput !== undefined) window.freezeInput = false; });

    const sendBtn = document.createElement("button");
    sendBtn.textContent = "➤";
    Object.assign(sendBtn.style, {
      background: "linear-gradient(135deg,#27ae60,#2ecc71)", border: "none",
      borderRadius: "8px", color: "#fff", padding: "6px 11px",
      cursor: "pointer", fontSize: "13px"
    });
    sendBtn.onclick = sendChat;

    inputRow.appendChild(inp); inputRow.appendChild(sendBtn);
    box.appendChild(msgArea); box.appendChild(inputRow);
    document.body.appendChild(box);

    // Chat toggle button
    const btn = document.createElement("div");
    btn.id = "mpChatBtn";
    Object.assign(btn.style, {
      position: "fixed", right: "12px", bottom: "18px",
      width: "46px", height: "46px",
      background: "rgba(0,0,0,0.7)", border: "2px solid rgba(255,255,255,0.22)",
      borderRadius: "12px", display: "flex", alignItems: "center",
      justifyContent: "center", cursor: "pointer", zIndex: "21",
      fontSize: "20px", userSelect: "none"
    });
    btn.textContent = "💬";
    btn.title = "Chat [T]";
    btn.onclick = toggleChat;
    document.body.appendChild(btn);
  }

  function toggleChat() {
    chatOpen = !chatOpen;
    const box = document.getElementById("mpChatBox");
    box.style.display = chatOpen ? "flex" : "none";
    if (chatOpen) {
      setTimeout(() => { var _inp=document.getElementById("mpChatInput"); if(_inp)_inp.focus(); }, 80);
    }
  }

  function sendChat() {
    if (!mpActive || !chatRef) {
      addSystemMsg("⚠️ Multiplayer tidak aktif.");
      return;
    }
    const inp = document.getElementById("mpChatInput");
    const text = inp.value.trim();
    if (!text) return;
    inp.value = "";
    const rawName = localStorage.getItem("playerName") || "Player";
    chatRef.push({ name: rawName, text, senderId: myId, ts: Date.now() });
    appendChatMsg(name, text, true);
  }

  function appendChatMsg(name, text, isSelf) {
    const area = document.getElementById("mpMsgArea"); if (!area) return;
    const el = document.createElement("div");
    Object.assign(el.style, {
      background: isSelf ? "rgba(39,174,96,0.2)" : "rgba(255,255,255,0.07)",
      borderRadius: "7px", padding: "4px 8px",
      borderLeft: "2px solid " + (isSelf ? "#2ecc71" : "#3498db")
    });
    el.innerHTML = `<span style="color:${isSelf?"#2ecc71":"#7ecfff"};font-weight:bold;font-size:11px">${name}</span>
                    <span style="color:#ddd"> ${text}</span>`;
    area.appendChild(el);
    area.scrollTop = area.scrollHeight;
    while (area.children.length > 40) area.removeChild(area.firstChild);

    // Badge notification
    if (!chatOpen && !isSelf) {
      const btn = document.getElementById("mpChatBtn");
      if (btn) { btn.textContent = "🔴"; setTimeout(() => { if (!chatOpen) btn.textContent = "💬"; }, 3000); }
    }
  }

  function addSystemMsg(text) {
    const area = document.getElementById("mpMsgArea"); if (!area) return;
    const el = document.createElement("div");
    Object.assign(el.style, { color: "#aaa", fontSize: "10px", textAlign: "center", padding: "2px" });
    el.textContent = text;
    area.appendChild(el);
    area.scrollTop = area.scrollHeight;
  }

  // Rebuild name tags for all other players (e.g. after admin list changes)
  function rebuildAllNameTags() {
    Object.entries(otherPlayers).forEach(([id, op]) => {
      if (!op.meshes || !op.latestData) return;
      const m = op.meshes;
      // Find the nameSprite and update its canvas
      if (!m.nameSprite) return;
      const nameCanvas = document.createElement("canvas");
      nameCanvas.width = 300; nameCanvas.height = 72;
      const nc = nameCanvas.getContext("2d");
      nc.fillStyle = "rgba(0,0,0,0.65)";
      nc.beginPath();
      if (nc.roundRect) nc.roundRect(0, 0, 300, 72, 10);
      else nc.rect(0, 0, 300, 72);
      nc.fill();
      const rawTagName = op.latestData.name || "Player";
      const tagIsOwner = rawTagName === OWNER_NAME;
      const tagIsAdmin = !tagIsOwner && getAdminList().includes(rawTagName);
      const tagLabel = tagIsOwner ? ("👑 " + rawTagName) : tagIsAdmin ? ("🛡 " + rawTagName) : rawTagName;
      nc.fillStyle = tagIsOwner ? "#f39c12" : tagIsAdmin ? "#7ecfff" : "#fff";
      nc.font = "bold 32px Arial";
      nc.textAlign = "center";
      nc.textBaseline = "middle";
      nc.fillText(tagLabel.substring(0, 18), 150, 36);
      if (m.nameSprite.material && m.nameSprite.material.map) {
        m.nameSprite.material.map.image = nameCanvas;
        m.nameSprite.material.map.needsUpdate = true;
      }
    });
  }

  // ── Broadcast toast notification (badge role terpisah dari nama) ──
  function showBroadcastToast(rawName, message) {
    // Tentukan role dan warna
    const isOwnerSender = rawName === OWNER_NAME;
    const isAdminSender = !isOwnerSender && getAdminList().includes(rawName);
    const roleLabel = isOwnerSender ? "👑 OWNER" : isAdminSender ? "🛡 ADMIN" : "📢";
    const roleColor = isOwnerSender ? "#f39c12" : isAdminSender ? "#3498db" : "#aaa";

    // Hapus toast lama jika masih ada
    const old = document.getElementById("broadcastToast");
    if (old) old.remove();

    const toast = document.createElement("div");
    toast.id = "broadcastToast";
    Object.assign(toast.style, {
      position: "fixed", top: "80px", left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(5,8,18,0.95)",
      border: `2px solid ${roleColor}55`,
      borderRadius: "14px", padding: "12px 20px",
      color: "#fff", fontFamily: "Arial",
      zIndex: "9001", textAlign: "center",
      boxShadow: `0 0 20px ${roleColor}44`,
      maxWidth: "300px", pointerEvents: "none"
    });
    toast.innerHTML = `
      <div style="font-size:11px;color:${roleColor};font-weight:bold;letter-spacing:1px;margin-bottom:4px">
        ${roleLabel} <span style="color:#aaa;font-weight:normal">• ${rawName}</span>
      </div>
      <div style="font-size:14px;color:#fff;line-height:1.4">${message}</div>
    `;
    document.body.appendChild(toast);
    // Fade out
    setTimeout(() => {
      toast.style.transition = "opacity 0.6s";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 700);
    }, 4000);
  }

  function showFloatingBubble(senderId, name, text) {
    const op = otherPlayers[senderId];
    if (!op || !op.meshes) return;
    const worldPos = op.meshes.group.position.clone(); worldPos.y += 6;
    const v = worldPos.project(window.camera);
    if (Math.abs(v.z) > 1) return; // behind camera

    const el = document.createElement("div");
    // Determine name color by role
    const isOwnerMsg = name.startsWith("👑");
    const isAdminMsg = name.startsWith("🛡");
    const nameColor = isOwnerMsg ? "#f39c12" : isAdminMsg ? "#3498db" : "#7ecfff";
    el.innerHTML = `<div style="font-size:10px;color:${nameColor};font-weight:bold;margin-bottom:3px">${name}</div><div>${text}</div>`;
    Object.assign(el.style, {
      position: "fixed",
      left: ((v.x * 0.5 + 0.5) * window.innerWidth) + "px",
      top: ((-v.y * 0.5 + 0.5) * window.innerHeight - 60) + "px",
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,0.82)", color: "#fff",
      padding: "6px 12px", borderRadius: "10px",
      fontSize: "12px", zIndex: "1000",
      pointerEvents: "none", maxWidth: "200px",
      border: "1px solid rgba(255,255,255,0.2)",
      textAlign: "center", lineHeight: "1.4"
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ═══════════════════════════════════════════════
  // STATUS BADGE + PLAYER COUNT
  // ═══════════════════════════════════════════════
  function buildStatusBadge() {
    const el = document.createElement("div");
    el.id = "mpStatusBadge";
    Object.assign(el.style, {
      position: "fixed", right: "12px", bottom: "12px",
      background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "9px", padding: "5px 11px",
      color: "#888", fontSize: "11px", zIndex: "20", pointerEvents: "none"
    });
    el.textContent = "⚫ Offline";
    document.body.appendChild(el);
  }

  function setStatusBadge(text, color) {
    const el = document.getElementById("mpStatusBadge");
    if (el) { el.textContent = text; el.style.color = color || "#fff"; }
  }

  function updatePlayerCountBadge() {
    const total = Object.keys(otherPlayers).length + 1;
    setStatusBadge(`🟢 ${total} player online`, "#2ecc71");
  }

  // ═══════════════════════════════════════════════
  // NAME ENTRY SCREEN
  // ═══════════════════════════════════════════════
  function showNameScreen(cb) {
    if (localStorage.getItem("playerName")) { cb(); return; }

    const ov = document.createElement("div");
    Object.assign(ov.style, {
      position: "fixed", inset: "0",
      background: "rgba(0,5,15,0.96)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: "99999", flexDirection: "column"
    });

    ov.innerHTML = `
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);
                  border-radius:22px;padding:36px 28px;text-align:center;max-width:340px;width:90%">
        <div style="font-size:52px;margin-bottom:14px">🎣</div>
        <h2 style="color:#7ecfff;margin:0 0 6px;font-size:22px">Let's Fishing!</h2>
        <p style="color:#888;font-size:12px;margin:0 0 22px">Masukkan nama untuk bermain multiplayer</p>

        <input id="mpNameInp" maxlength="14" placeholder="Nama kamu..."
          style="width:100%;padding:12px;border-radius:10px;
                 border:1px solid rgba(255,255,255,0.2);
                 background:rgba(255,255,255,0.1);color:#fff;
                 font-size:15px;outline:none;text-align:center;
                 margin-bottom:12px;box-sizing:border-box">

        <div style="display:flex;gap:8px;margin-bottom:14px">
          <div id="colorPick" style="flex:0 0 44px;height:44px;border-radius:8px;
               background:#2ecc71;cursor:pointer;border:2px solid rgba(255,255,255,0.3);
               display:flex;align-items:center;justify-content:center;font-size:18px"
               title="Pilih warna baju">👕</div>
          <input type="color" id="mpColorPicker" value="#2ecc71"
            style="display:none">
          <input id="mpRoomInp" maxlength="12" placeholder="Nama room (opsional)"
            style="flex:1;padding:12px;border-radius:10px;
                   border:1px solid rgba(255,255,255,0.15);
                   background:rgba(255,255,255,0.08);color:#aaa;
                   font-size:13px;outline:none;box-sizing:border-box">
        </div>

        <button id="mpStartBtn"
          style="width:100%;padding:13px;
                 background:linear-gradient(135deg,#27ae60,#2ecc71);
                 border:none;border-radius:11px;color:#fff;
                 font-size:15px;font-weight:bold;cursor:pointer;
                 box-shadow:0 4px 14px rgba(39,174,96,0.4)">
          Mulai Bermain ▶
        </button>

        <p style="color:#555;font-size:10px;margin:12px 0 0">
          Room yang sama = bisa bermain bareng teman
        </p>
      </div>`;

    document.body.appendChild(ov);

    let chosenColor = "#2ecc71";
    const colorPick   = document.getElementById("colorPick");
    const colorPicker = document.getElementById("mpColorPicker");
    colorPick.onclick = () => colorPicker.click();
    colorPicker.oninput = e => {
      chosenColor = e.target.value;
      colorPick.style.background = chosenColor;
    };

    const nameInp = document.getElementById("mpNameInp");
    const roomInp = document.getElementById("mpRoomInp");
    const startBtn = document.getElementById("mpStartBtn");

    [nameInp, roomInp].forEach(el => el.addEventListener("keydown", e => e.stopPropagation()));

    startBtn.onclick = () => {
      const n = nameInp.value.trim();
      if (!n) { nameInp.style.borderColor = "#e74c3c"; return; }
      const r = (roomInp.value.trim() || "world_main").replace(/\s+/g, "_");
      localStorage.setItem("playerName", n);
      localStorage.setItem("playerShirt", chosenColor);
      roomId = r;
      ov.remove();
      cb();
    };

    setTimeout(() => nameInp.focus(), 150);
  }

  // ═══════════════════════════════════════════════
  // MAIN EXPOSED API (called by script.js)
  // ═══════════════════════════════════════════════
  window.MP = {
    // Called every frame from animate()
    update(dt) {
      if (!mpActive) return;
      sendState();
      for (const id in otherPlayers) updateOtherPlayerVisuals(id, dt);
      // Owner: broadcast worldState (weather+dayTime) every 5s
      const myName = localStorage.getItem("playerName");
      if (myName === (window.OWNER_NAME_FOR_SYNC||"Varz444") && db) {
        _worldSyncTimer = (_worldSyncTimer||0) + dt;
        if (_worldSyncTimer >= 5) {
          _worldSyncTimer = 0;
          db.ref(`rooms/${roomId}/worldState`).set({
            weather: window.currentWeather ? window.currentWeather.name : "Sunny",
            dayTime: window.dayTime||0.5,
            ts: Date.now()
          });
        }
      }
    },

    // Send a custom event (catch fish, etc.)
    sendEvent(type, data) {
      if (!mpActive || !db) return;
      db.ref(`rooms/${roomId}/events`).push({ type, data, senderId: myId, ts: Date.now() });
    },

    isActive() { return mpActive; },

    // Toggle chat from keyboard
    toggleChat,

    // Sync cuaca + waktu ke semua player
    syncWeather(weatherName) {
      if (!db) return;
      db.ref(`rooms/${roomId}/worldState`).set({
        weather: weatherName,
        dayTime: window.dayTime||0.5,
        ts: Date.now()
      });
    },

    // Change room at runtime
    changeRoom(newRoom) {
      if (myRef) myRef.remove();
      if (playersRef) playersRef.off();
      if (chatRef) chatRef.off();
      for (const id in otherPlayers) removeOtherPlayer(id);
      roomId = newRoom;
      connect();
    }
  };

  // ═══════════════════════════════════════════════
  // KEYBOARD SHORTCUT [T] for chat
  // ═══════════════════════════════════════════════
  window.addEventListener("keydown", e => {
    if (!e.key) return;
    if (e.key.toLowerCase() === "t" && !chatOpen) {
      e.preventDefault();
      toggleChat();
    } else if (e.key === "Escape" && chatOpen) {
      toggleChat();
    }
  });

  // ═══════════════════════════════════════════════
  // EXPOSE SEMUA FUNGSI KE WINDOW — harus sebelum buildOwnerPanel!
  // ═══════════════════════════════════════════════
  window.kickPlayer           = kickPlayer;
  window.banPlayer            = banPlayer;
  window.showKickBanModal     = showKickBanModal;
  window.unbanPlayer          = unbanPlayer;
  window.ownerBroadcast       = ownerBroadcast;
  window.ownerSetWeather      = ownerSetWeather;
  window.ownerGiveCoins       = ownerGiveCoins;
  window.ownerGiveCoinsToSelf = ownerGiveCoinsToSelf;
  window.ownerClearChat       = ownerClearChat;
  window.ownerTeleportSelf    = ownerTeleportSelf;
  window.ownerTeleportTo      = ownerTeleportTo;
  window.switchOwnerTab       = switchOwnerTab;
  window.refreshOwnerPanel    = refreshOwnerPanel;
  window.ownerGiveXP          = ownerGiveXP;
  window.ownerSetLevel        = ownerSetLevel;
  window.ownerGiveXPToAll     = ownerGiveXPToAll;
  window.ownerGiftCoins       = ownerGiftCoins;
  window.ownerGiftFish        = ownerGiftFish;
  window.ownerAddFishToSelf   = ownerAddFishToSelf;
  window.ownerGiftFishToPlayer   = typeof ownerGiftFishToPlayer !== "undefined" ? ownerGiftFishToPlayer : ownerGiftFish;
  window.ownerGiftCoinsToPlayer  = typeof ownerGiftCoinsToPlayer !== "undefined" ? ownerGiftCoinsToPlayer : ownerGiftCoins;
  window.showGiftNotif        = showGiftNotif;
  window.renderFishGiveTab    = renderFishGiveTab;
  window.renderAdminsTab      = renderAdminsTab;
  window.renderCinematicTab   = renderCinematicTab;
  window.toggleCinAccess      = toggleCinAccess;
  window.renderGiftTab        = renderGiftTab;
  window.renderBannedTab      = renderBannedTab;
  window.addAdmin             = addAdmin;
  window.addAdminByInput      = addAdminByInput;
  window.removeAdmin          = removeAdmin;
  window.isAdmin              = isAdmin;
  window.isAdminOnly          = isAdminOnly;

  // ═══════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════
  buildStatusBadge();
  buildChatUI();
  buildOwnerPanel(); // 👑 Owner panel (only shows if name === OWNER_NAME)

  if (!IS_CONFIGURED) {
    setStatusBadge("⚫ Set Firebase config dulu", "#f39c12");
    addSystemMsg("⚠️ Isi FIREBASE_CONFIG di multiplayer.js untuk aktifkan multiplayer.");
    // Expose initFromMenu tetap supaya tidak error
    window.MP.initFromMenu = () => {};
    return;
  }

// Auto-connect langsung tanpa main menu
  showNameScreen(() => {
    waitForScene(() => {
      setStatusBadge("🔄 Menghubungkan...", "#f39c12");
      loadFirebaseSDK(connect);
    });
  });

  // (fungsi sudah di-expose di atas sebelum buildOwnerPanel)
  // ── Kick/Ban overlay instant ──
  function showKickBanOverlay(type) {
    // Sembunyikan semua UI game
    document.querySelectorAll("#coinUI,#levelUI,#hotbar,#inventoryBtn,#openMenuBtn,#dayNightUI").forEach(el => { if(el) el.style.display="none"; });
    const isKick = type === "kick";
    const overlay = document.createElement("div");
    overlay.id = "kickBanOverlay";
    Object.assign(overlay.style, {
      position:"fixed", inset:"0",
      background:"rgba(0,0,0,0.97)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:"999999", flexDirection:"column", color:"#fff",
      fontFamily:"Arial", textAlign:"center"
    });
    overlay.innerHTML = `
      <div style="font-size:72px;margin-bottom:20px">${isKick ? "🔨" : "🚫"}</div>
      <h1 style="color:${isKick?"#e67e22":"#e74c3c"};margin:0 0 12px;font-size:28px">
        ${isKick ? "Kamu telah di-Kick" : "Kamu telah di-Ban"}
      </h1>
      <p style="color:#888;font-size:14px;max-width:280px;line-height:1.6">
        ${isKick
          ? "Owner mengeluarkan kamu dari room.<br>Kamu bisa bergabung kembali."
          : "Kamu tidak bisa masuk ke room ini lagi."}
      </p>
      ${isKick ? `<button onclick="location.reload()" style="margin-top:24px;padding:12px 28px;background:linear-gradient(135deg,#27ae60,#2ecc71);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:bold;cursor:pointer">🔄 Coba Lagi</button>` : ""}
    `;
    document.body.appendChild(overlay);
  }
  window.showKickBanOverlay = showKickBanOverlay;

  window.renderFishGiveTab    = renderFishGiveTab;
  window.renderAdminsTab      = renderAdminsTab;
  window.renderCinematicTab   = renderCinematicTab;
  window.toggleCinAccess      = toggleCinAccess;
  window.addAdmin             = addAdmin;
  window.addAdminByInput      = addAdminByInput;
  window.removeAdmin          = removeAdmin;
  window.isAdmin              = isAdmin;
  window.isAdminOnly          = isAdminOnly;
  window.renderGiftTab        = renderGiftTab;
  window.fishTypes            = window.fishTypes; // expose from script.js
  window.ownerGiftFish        = ownerGiftFish;
  window.ownerGiftFishToPlayer = ownerGiftFishToPlayer;
  window.ownerGiftCoinsToPlayer = ownerGiftCoinsToPlayer;
  window.showGiftNotif        = showGiftNotif;
  window.fishTypes            = window.fishTypes; // expose fishTypes alias
  window.renderBannedTab      = renderBannedTab;

})();
