// ═══════════════════════════════════════════════════
// FISH TEXTURE GENERATOR
// Generates unique canvas textures for each fish type
// ═══════════════════════════════════════════════════

function generateFishTexture(fishDef) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  const cfg = fishTextureConfigs[fishDef.name] || fishTextureConfigs["default"];
  cfg.draw(ctx, canvas.width, canvas.height, fishDef);

  return new THREE.CanvasTexture(canvas);
}

// ─── Helper: draw a fish silhouette ───
function drawFishBody(ctx, cx, cy, bw, bh, color, finColor, eyeColor="#000") {
  ctx.save();

  // Body — ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, bw, bh, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Tail fin
  ctx.beginPath();
  ctx.moveTo(cx - bw * 0.85, cy);
  ctx.lineTo(cx - bw * 1.45, cy - bh * 1.1);
  ctx.lineTo(cx - bw * 1.45, cy + bh * 1.1);
  ctx.closePath();
  ctx.fillStyle = finColor;
  ctx.fill();

  // Top fin
  ctx.beginPath();
  ctx.moveTo(cx - bw * 0.2, cy - bh);
  ctx.quadraticCurveTo(cx + bw * 0.1, cy - bh * 1.9, cx + bw * 0.45, cy - bh);
  ctx.closePath();
  ctx.fillStyle = finColor;
  ctx.fill();

  // Bottom fin
  ctx.beginPath();
  ctx.moveTo(cx, cy + bh * 0.8);
  ctx.lineTo(cx + bw * 0.2, cy + bh * 1.5);
  ctx.lineTo(cx + bw * 0.45, cy + bh * 0.85);
  ctx.closePath();
  ctx.fillStyle = finColor;
  ctx.fill();

  // Eye
  ctx.beginPath();
  ctx.arc(cx + bw * 0.55, cy - bh * 0.2, bh * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + bw * 0.58, cy - bh * 0.2, bh * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = eyeColor;
  ctx.fill();

  // Mouth
  ctx.beginPath();
  ctx.arc(cx + bw * 0.9, cy + bh * 0.1, bh * 0.1, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// ─── Helper: gradient background ───
function bgGrad(ctx, w, h, c1, c2, angle=0) {
  const grd = ctx.createLinearGradient(0, 0, angle===0?w:0, angle===0?0:h);
  grd.addColorStop(0, c1);
  grd.addColorStop(1, c2);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

// ─── Helper: draw scales ───
function drawScales(ctx, cx, cy, bw, bh, color, rows=3, cols=5) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = cx - bw * 0.5 + (c / cols) * bw * 1.1;
      const sy = cy - bh * 0.4 + (r / rows) * bh * 0.85;
      ctx.beginPath();
      ctx.arc(sx, sy, bh * 0.22, Math.PI, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ─── Helper: sparkle/glow dots ───
function drawSparkles(ctx, count, color, w, h, minR=2, maxR=5) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = minR + Math.random() * (maxR - minR);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.4 + Math.random() * 0.5;
    ctx.fill();
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════
// INDIVIDUAL FISH CONFIGS
// ═══════════════════════════════════════════════════
const fishTextureConfigs = {

  "Ikan Kecil": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#1a3a5c", "#0d2235");
      // Beberapa ikan kecil bergerombol
      const positions = [[w*0.35,h*0.45],[w*0.55,h*0.35],[w*0.6,h*0.6],[w*0.42,h*0.62]];
      positions.forEach(([x,y],i)=>{
        const scale = 0.7 + i*0.08;
        drawFishBody(ctx, x, y, 38*scale, 16*scale, "#b0c4de", "#8aa8c8");
        drawScales(ctx, x, y, 38*scale, 16*scale, "#6a8aab", 2, 3);
      });
    }
  },

  "Ikan Tuna": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#0a2744", "#1a4a7a", 1);
      drawFishBody(ctx, w*0.45, h*0.5, 80, 28, "#2e6ea6", "#1a4a7a", "#222");
      drawScales(ctx, w*0.45, h*0.5, 80, 28, "#5dade2");
      // Stripe khas tuna
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = "#87ceeb";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w*0.15, h*0.45);
      ctx.lineTo(w*0.75, h*0.45);
      ctx.stroke();
      ctx.restore();
      // Label
      ctx.fillStyle="rgba(255,255,255,0.7)";
      ctx.font="bold 14px Arial";
      ctx.textAlign="center";
      ctx.fillText("TUNA",w*0.45,h*0.88);
    }
  },

  "Ikan Salmon": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#1a0a0a", "#3d1a0a");
      drawFishBody(ctx, w*0.47, h*0.5, 78, 26, "#e8885a", "#c06030", "#333");
      drawScales(ctx, w*0.47, h*0.5, 78, 26, "#ff9966");
      // Pink stripe
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#ff6b9d";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w*0.12, h*0.52);
      ctx.bezierCurveTo(w*0.3,h*0.4, w*0.6,h*0.55, w*0.82,h*0.5);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle="rgba(255,200,150,0.8)";
      ctx.font="bold 13px Arial";
      ctx.textAlign="center";
      ctx.fillText("SALMON",w*0.47,h*0.9);
    }
  },

  "Ikan Lele": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#1a1208", "#2d2010");
      // Body lebih memanjang
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(w*0.42, h*0.5, 85, 22, 0, 0, Math.PI*2);
      ctx.fillStyle = "#6b5a3e";
      ctx.fill();
      // Ekor
      ctx.beginPath();
      ctx.moveTo(w*0.12, h*0.5);
      ctx.lineTo(w*0.04, h*0.25);
      ctx.lineTo(w*0.04, h*0.75);
      ctx.closePath();
      ctx.fillStyle = "#4a3a28";
      ctx.fill();
      ctx.restore();
      // Kumis lele (whiskers)
      ctx.save();
      ctx.strokeStyle = "#3a2a18";
      ctx.lineWidth = 2.5;
      [[w*0.82,h*0.38,w*0.95,h*0.22],[w*0.82,h*0.38,w*0.97,h*0.35],
       [w*0.82,h*0.6,w*0.95,h*0.76],[w*0.82,h*0.6,w*0.97,h*0.63]].forEach(([x1,y1,x2,y2])=>{
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      });
      ctx.restore();
      // Eye
      ctx.beginPath();
      ctx.arc(w*0.75, h*0.42, 7, 0, Math.PI*2);
      ctx.fillStyle="#fff"; ctx.fill();
      ctx.beginPath();
      ctx.arc(w*0.76, h*0.42, 4, 0, Math.PI*2);
      ctx.fillStyle="#111"; ctx.fill();
      ctx.fillStyle="rgba(180,150,100,0.8)";
      ctx.font="bold 13px Arial"; ctx.textAlign="center";
      ctx.fillText("LELE",w*0.42,h*0.9);
    }
  },

  "Ikan Koi": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#0d1f1a", "#1a3d2a");
      drawFishBody(ctx, w*0.46, h*0.5, 76, 28, "#ff6b35", "#cc4400", "#222");
      // Bercak putih khas koi
      const spots = [[w*0.38,h*0.42,14],[w*0.52,h*0.56,10],[w*0.3,h*0.52,8]];
      ctx.save(); ctx.globalAlpha=0.75;
      spots.forEach(([x,y,r])=>{
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fillStyle="#fff"; ctx.fill();
      });
      ctx.restore();
      drawScales(ctx, w*0.46, h*0.5, 76, 28, "#ff9966");
      ctx.fillStyle="rgba(255,180,80,0.85)";
      ctx.font="bold 13px Arial"; ctx.textAlign="center";
      ctx.fillText("KOI",w*0.46,h*0.9);
    }
  },

  "Ikan Hiu": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#050d1a", "#0a1f35");
      // Body hiu — lebih torpedo
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w*0.88, h*0.5);
      ctx.bezierCurveTo(w*0.75,h*0.2, w*0.2,h*0.28, w*0.05,h*0.5);
      ctx.bezierCurveTo(w*0.2,h*0.72, w*0.75,h*0.8, w*0.88,h*0.5);
      ctx.fillStyle="#607080"; ctx.fill();
      // Perut lebih terang
      ctx.beginPath();
      ctx.ellipse(w*0.45,h*0.56,60,14,0,0,Math.PI*2);
      ctx.fillStyle="#b0bec5"; ctx.fill();
      ctx.restore();
      // Sirip dorsal segitiga tajam
      ctx.beginPath();
      ctx.moveTo(w*0.42, h*0.28);
      ctx.lineTo(w*0.55, h*0.06);
      ctx.lineTo(w*0.65, h*0.28);
      ctx.closePath();
      ctx.fillStyle="#506070"; ctx.fill();
      // Mata
      ctx.beginPath(); ctx.arc(w*0.74,h*0.44,6,0,Math.PI*2);
      ctx.fillStyle="#000"; ctx.fill();
      ctx.beginPath(); ctx.arc(w*0.73,h*0.43,2,0,Math.PI*2);
      ctx.fillStyle="#fff"; ctx.fill();
      // Gigi
      ctx.save(); ctx.fillStyle="#fff";
      for(let i=0;i<4;i++){
        ctx.beginPath();
        ctx.moveTo(w*0.83+i*4, h*0.48);
        ctx.lineTo(w*0.835+i*4, h*0.56);
        ctx.lineTo(w*0.84+i*4, h*0.48);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle="rgba(150,200,220,0.8)";
      ctx.font="bold 14px Arial"; ctx.textAlign="center";
      ctx.fillText("HIU",w*0.45,h*0.9);
    }
  },

  "Golden Fish": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#1a1200", "#2d2000");
      // Glow effect
      const glow = ctx.createRadialGradient(w*0.45,h*0.5,10,w*0.45,h*0.5,70);
      glow.addColorStop(0,"rgba(255,215,0,0.25)");
      glow.addColorStop(1,"rgba(255,215,0,0)");
      ctx.fillStyle=glow; ctx.fillRect(0,0,w,h);
      drawFishBody(ctx, w*0.45, h*0.5, 72, 26, "#f1c40f", "#d4a017", "#222");
      drawScales(ctx, w*0.45, h*0.5, 72, 26, "#ffd700");
      drawSparkles(ctx, 8, "#ffe066", w, h, 2, 4);
      ctx.fillStyle="#ffe066";
      ctx.font="bold 13px Arial"; ctx.textAlign="center";
      ctx.fillText("✨ GOLDEN",w*0.45,h*0.9);
    }
  },

  "Mythic Koi": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#0d0020", "#1a0035");
      // Aura ungu
      const aura=ctx.createRadialGradient(w*0.46,h*0.5,5,w*0.46,h*0.5,80);
      aura.addColorStop(0,"rgba(180,0,255,0.3)");
      aura.addColorStop(1,"rgba(180,0,255,0)");
      ctx.fillStyle=aura; ctx.fillRect(0,0,w,h);
      drawFishBody(ctx, w*0.46, h*0.5, 78, 28, "#dd00ff", "#8800cc", "#fff");
      // Bercak emas khas mythic
      [[w*0.35,h*0.4,12],[w*0.5,h*0.58,8],[w*0.28,h*0.52,6]].forEach(([x,y,r])=>{
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,"#ffe066"); g.addColorStop(1,"#ff9900");
        ctx.fillStyle=g; ctx.fill();
      });
      drawSparkles(ctx,12,"#cc88ff",w,h,1,3);
      ctx.fillStyle="#ee88ff";
      ctx.font="bold 13px Arial"; ctx.textAlign="center";
      ctx.fillText("🌟 MYTHIC KOI",w*0.46,h*0.9);
    }
  },

  "Dragon Fish": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#1a0000", "#330000");
      // Api di belakang
      ctx.save();
      for(let i=0;i<6;i++){
        const x=w*(0.05+i*0.06), fy=h*0.5;
        const flameGrad=ctx.createRadialGradient(x,fy,2,x,fy-20,18);
        flameGrad.addColorStop(0,"rgba(255,200,0,0.7)");
        flameGrad.addColorStop(0.5,"rgba(255,80,0,0.4)");
        flameGrad.addColorStop(1,"rgba(255,0,0,0)");
        ctx.fillStyle=flameGrad;
        ctx.beginPath(); ctx.ellipse(x,fy-10,6,20,0,0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
      drawFishBody(ctx, w*0.46, h*0.5, 80, 28, "#cc2200", "#880000", "#f00");
      // Sisik seperti naga
      ctx.save();
      ctx.globalAlpha=0.4;
      for(let r=0;r<3;r++) for(let c=0;c<6;c++){
        const sx=w*0.15+c*20, sy=h*0.38+r*14;
        ctx.beginPath();
        ctx.moveTo(sx,sy); ctx.lineTo(sx+8,sy-8); ctx.lineTo(sx+16,sy);
        ctx.strokeStyle="#ff4422"; ctx.lineWidth=1.5; ctx.stroke();
      }
      ctx.restore();
      // Tanduk kecil
      ctx.save(); ctx.fillStyle="#aa3300";
      [[w*0.72,h*0.22],[w*0.78,h*0.18]].forEach(([x,y])=>{
        ctx.beginPath(); ctx.moveTo(x,h*0.3); ctx.lineTo(x-4,y); ctx.lineTo(x+4,y);
        ctx.closePath(); ctx.fill();
      });
      ctx.restore();
      drawSparkles(ctx,6,"#ff4400",w,h,2,4);
      ctx.fillStyle="#ff8866";
      ctx.font="bold 13px Arial"; ctx.textAlign="center";
      ctx.fillText("🐉 DRAGON",w*0.46,h*0.9);
    }
  },

  "Crystal Fish": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#001a2a", "#003344");
      // Efek kristal di bg
      ctx.save(); ctx.globalAlpha=0.15;
      for(let i=0;i<8;i++){
        const x=Math.random()*w, y=Math.random()*h;
        ctx.beginPath(); ctx.moveTo(x,y-12); ctx.lineTo(x+7,y); ctx.lineTo(x,y+12); ctx.lineTo(x-7,y);
        ctx.closePath(); ctx.fillStyle="#00ffff"; ctx.fill();
      }
      ctx.restore();
      // Body semi transparan
      ctx.save();
      ctx.beginPath(); ctx.ellipse(w*0.45,h*0.5,76,26,0,0,Math.PI*2);
      const crystalGrad=ctx.createLinearGradient(w*0.1,h*0.2,w*0.8,h*0.8);
      crystalGrad.addColorStop(0,"rgba(180,255,255,0.85)");
      crystalGrad.addColorStop(0.5,"rgba(0,200,220,0.7)");
      crystalGrad.addColorStop(1,"rgba(0,150,180,0.85)");
      ctx.fillStyle=crystalGrad; ctx.fill();
      ctx.strokeStyle="rgba(200,255,255,0.9)"; ctx.lineWidth=2; ctx.stroke();
      ctx.restore();
      // Facet lines (seperti berlian dipotong)
      ctx.save(); ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=1.2;
      [[w*0.25,h*0.35,w*0.45,h*0.65],[w*0.45,h*0.3,w*0.6,h*0.7],
       [w*0.2,h*0.5,w*0.7,h*0.5]].forEach(([x1,y1,x2,y2])=>{
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      });
      ctx.restore();
      // Ekor kristal
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w*0.12,h*0.5); ctx.lineTo(w*0.02,h*0.2); ctx.lineTo(w*0.02,h*0.8);
      ctx.closePath();
      ctx.fillStyle="rgba(0,220,255,0.7)"; ctx.fill();
      ctx.restore();
      // Mata
      ctx.beginPath(); ctx.arc(w*0.73,h*0.44,7,0,Math.PI*2);
      ctx.fillStyle="rgba(255,255,255,0.9)"; ctx.fill();
      ctx.beginPath(); ctx.arc(w*0.74,h*0.44,4,0,Math.PI*2);
      ctx.fillStyle="#00ccdd"; ctx.fill();
      drawSparkles(ctx,14,"#aaffff",w,h,1,3);
      ctx.fillStyle="#aaffff";
      ctx.font="bold 13px Arial"; ctx.textAlign="center";
      ctx.fillText("💎 CRYSTAL",w*0.45,h*0.9);
    }
  },

  "Old Boot": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#1a1208", "#0d0a05");
      // Sepatu bot
      ctx.save();
      // Shaft sepatu
      ctx.beginPath();
      ctx.roundRect(w*0.35, h*0.1, w*0.25, h*0.5, 8);
      ctx.fillStyle="#4a3820"; ctx.fill();
      ctx.strokeStyle="#2a1a08"; ctx.lineWidth=2; ctx.stroke();
      // Sole sepatu
      ctx.beginPath();
      ctx.roundRect(w*0.25, h*0.55, w*0.45, h*0.22, [0,0,8,8]);
      ctx.fillStyle="#333"; ctx.fill();
      ctx.strokeStyle="#111"; ctx.lineWidth=2; ctx.stroke();
      // Lubang tali sepatu
      for(let i=0;i<3;i++){
        ctx.beginPath(); ctx.arc(w*0.43,h*(0.22+i*0.12),4,0,Math.PI*2);
        ctx.fillStyle="#1a1008"; ctx.fill();
        ctx.beginPath(); ctx.arc(w*0.57,h*(0.22+i*0.12),4,0,Math.PI*2);
        ctx.fillStyle="#1a1008"; ctx.fill();
      }
      // Rumput/alga nempel
      ctx.strokeStyle="#2d6a2d"; ctx.lineWidth=2;
      [[w*0.3,h*0.55],[w*0.65,h*0.52],[w*0.25,h*0.6]].forEach(([x,y])=>{
        ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x-8,y-15,x-3,y-25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+8,y-12,x+5,y-22); ctx.stroke();
      });
      ctx.restore();
      ctx.fillStyle="rgba(150,120,80,0.8)";
      ctx.font="bold 13px Arial"; ctx.textAlign="center";
      ctx.fillText("👟 OLD BOOT",w*0.5,h*0.92);
    }
  },

  "Treasure Chest": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#0d0800", "#1a1000");
      // Glow emas
      const glowG=ctx.createRadialGradient(w*0.5,h*0.5,5,w*0.5,h*0.5,65);
      glowG.addColorStop(0,"rgba(255,200,0,0.3)");
      glowG.addColorStop(1,"rgba(255,200,0,0)");
      ctx.fillStyle=glowG; ctx.fillRect(0,0,w,h);
      ctx.save();
      // Badan peti
      ctx.beginPath(); ctx.roundRect(w*0.2,h*0.38,w*0.6,h*0.42,6);
      ctx.fillStyle="#5c3a10"; ctx.fill();
      ctx.strokeStyle="#3a2008"; ctx.lineWidth=3; ctx.stroke();
      // Tutup peti (sedikit terbuka)
      ctx.beginPath();
      ctx.moveTo(w*0.2,h*0.38); ctx.lineTo(w*0.8,h*0.38);
      ctx.lineTo(w*0.78,h*0.2); ctx.lineTo(w*0.22,h*0.2); ctx.closePath();
      ctx.fillStyle="#6b4515"; ctx.fill();
      ctx.strokeStyle="#3a2008"; ctx.lineWidth=3; ctx.stroke();
      // Koin/emas keluar
      ctx.fillStyle="#f1c40f";
      [[w*0.38,h*0.32],[w*0.48,h*0.26],[w*0.58,h*0.3],[w*0.44,h*0.36]].forEach(([x,y])=>{
        ctx.beginPath(); ctx.ellipse(x,y,9,6,0.3,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="#d4a017"; ctx.lineWidth=1; ctx.stroke();
      });
      // Kunci emas
      ctx.beginPath(); ctx.arc(w*0.5,h*0.58,7,0,Math.PI*2);
      ctx.fillStyle="#f1c40f"; ctx.fill();
      ctx.strokeStyle="#d4a017"; ctx.lineWidth=2; ctx.stroke();
      // Strip logam
      ctx.strokeStyle="#d4a017"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(w*0.5,h*0.38); ctx.lineTo(w*0.5,h*0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w*0.2,h*0.58); ctx.lineTo(w*0.8,h*0.58); ctx.stroke();
      ctx.restore();
      drawSparkles(ctx,8,"#ffe066",w,h,1,3);
      ctx.fillStyle="#ffe066";
      ctx.font="bold 12px Arial"; ctx.textAlign="center";
      ctx.fillText("📦 TREASURE",w*0.5,h*0.95);
    }
  },

  "Ikan Pari": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#0a0a1a", "#0d1530");
      // Badan pari — bentuk berlian/diamond
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w*0.5, h*0.08);
      ctx.bezierCurveTo(w*0.85,h*0.15, w*0.92,h*0.55, w*0.5,h*0.62);
      ctx.bezierCurveTo(w*0.08,h*0.55, w*0.15,h*0.15, w*0.5,h*0.08);
      ctx.fillStyle="#7b2d8b"; ctx.fill();
      // Ekor panjang
      ctx.beginPath();
      ctx.moveTo(w*0.5,h*0.62);
      ctx.bezierCurveTo(w*0.55,h*0.75, w*0.48,h*0.9, w*0.5,h*0.98);
      ctx.strokeStyle="#5a1f6b"; ctx.lineWidth=5; ctx.stroke();
      // Tekstur pari
      ctx.globalAlpha=0.2;
      ctx.fillStyle="#cc66ee";
      ctx.beginPath(); ctx.ellipse(w*0.5,h*0.35,25,15,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
      // Mata
      [[w*0.38,h*0.28],[w*0.62,h*0.28]].forEach(([x,y])=>{
        ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2);
        ctx.fillStyle="#fff"; ctx.fill();
        ctx.beginPath(); ctx.arc(x+1,y,3,0,Math.PI*2);
        ctx.fillStyle="#222"; ctx.fill();
      });
      drawSparkles(ctx,6,"#cc88ee",w,h,1,3);
      ctx.fillStyle="rgba(200,150,220,0.85)";
      ctx.font="bold 13px Arial"; ctx.textAlign="center";
      ctx.fillText("PARI",w*0.5,h*0.92);
    }
  },

  "Rainbow Fish": {
    draw(ctx, w, h) {
      bgGrad(ctx, w, h, "#0a0a15", "#15152a");
      // Tubuh pelangi
      ctx.save();
      ctx.beginPath(); ctx.ellipse(w*0.45,h*0.5,76,28,0,0,Math.PI*2);
      const rainbow=ctx.createLinearGradient(w*0.1,h*0.2,w*0.8,h*0.8);
      rainbow.addColorStop(0,"#ff0066");
      rainbow.addColorStop(0.2,"#ff6600");
      rainbow.addColorStop(0.4,"#ffcc00");
      rainbow.addColorStop(0.6,"#00cc44");
      rainbow.addColorStop(0.8,"#0088ff");
      rainbow.addColorStop(1,"#8800ff");
      ctx.fillStyle=rainbow; ctx.fill();
      ctx.restore();
      // Sisik pelangi
      ctx.save(); ctx.globalAlpha=0.4;
      for(let r=0;r<4;r++) for(let c=0;c<7;c++){
        const x=w*0.14+c*17, y=h*0.32+r*12;
        ctx.beginPath(); ctx.arc(x,y,6,Math.PI,Math.PI*2);
        const colors=["#ff6699","#ff9933","#ffee00","#33cc44","#3399ff","#cc66ff"];
        ctx.fillStyle=colors[(r+c)%colors.length]; ctx.fill();
      }
      ctx.restore();
      // Ekor pelangi
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w*0.1,h*0.5);
      ctx.lineTo(w*0.01,h*0.15);
      ctx.lineTo(w*0.01,h*0.85);
      ctx.closePath();
      const tailRainbow=ctx.createLinearGradient(0,0,0,h);
      tailRainbow.addColorStop(0,"#ff0066");
      tailRainbow.addColorStop(0.5,"#00cc44");
      tailRainbow.addColorStop(1,"#8800ff");
      ctx.fillStyle=tailRainbow; ctx.fill();
      ctx.restore();
      // Eye
      ctx.beginPath(); ctx.arc(w*0.73,h*0.44,7,0,Math.PI*2);
      ctx.fillStyle="#fff"; ctx.fill();
      ctx.beginPath(); ctx.arc(w*0.74,h*0.44,4,0,Math.PI*2);
      ctx.fillStyle="#111"; ctx.fill();
      drawSparkles(ctx,12,"#fff",w,h,1,3);
      ctx.fillStyle="rgba(255,255,255,0.9)";
      ctx.font="bold 13px Arial"; ctx.textAlign="center";
      ctx.fillText("🌈 RAINBOW",w*0.45,h*0.91);
    }
  },

  "default": {
    draw(ctx, w, h, fish) {
      bgGrad(ctx, w, h, "#0a1a2a", "#0d2235");
      drawFishBody(ctx, w*0.45, h*0.5, 70, 25, fish.color||"#5dade2", "#3a8ab5");
      drawScales(ctx, w*0.45, h*0.5, 70, 25, "#88ccee");
    }
  }
};

// ═══════════════════════════════════════════════════
// CACHE — generate sekali, reuse terus
// ═══════════════════════════════════════════════════
const fishTextureCache = {};

function getFishTexture(fishName) {
  if (!fishTextureCache[fishName]) {
    const fishDef = fishTypes.find(f => f.name === fishName) || { name: fishName, color: "#5dade2", emoji: "🐟" };
    fishTextureCache[fishName] = generateFishTexture(fishDef);
  }
  return fishTextureCache[fishName];
}

// Generate semua tekstur ikan sekaligus (panggil setelah fishTypes tersedia)
function preloadAllFishTextures() {
  fishTypes.forEach(f => getFishTexture(f.name));
  console.log("✅ Fish textures generated:", Object.keys(fishTextureCache).length);
}
