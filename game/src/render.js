// FROSTLINE — render: draws the city, the cars, Mara, the storm and every menu.
// One canvas, top-down, night snow lit by neon and streetlamps.

var Render = (function () {
  var snowflakes = [];
  for (var i = 0; i < 220; i++) {
    snowflakes.push({ x: Math.random() * 1400, y: Math.random() * 900, s: 1 + Math.random() * 2.4, v: 30 + Math.random() * 55 });
  }

  function drawCar(ctx, x, y, a, color, kind, sirenOn, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-24, -13, 48, 26);
    // body
    ctx.fillStyle = color;
    roundRect(ctx, -24, -12, 48, 24, 6); ctx.fill();
    // cabin + windshield
    ctx.fillStyle = 'rgba(180,225,255,0.85)';
    roundRect(ctx, -6, -9, 14, 18, 3); ctx.fill();
    ctx.fillStyle = 'rgba(20,30,50,0.9)';
    ctx.fillRect(10, -10, 5, 20);
    // headlights
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(22, -10, 3, 5); ctx.fillRect(22, 5, 3, 5);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(-25, -10, 3, 5); ctx.fillRect(-25, 5, 3, 5);
    if (kind === 'police') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', 0, 4);
      if (sirenOn) {
        var on = Math.floor(time * 3) % 2 === 0;
        ctx.fillStyle = on ? '#ff3b30' : '#3b82ff';
        ctx.beginPath(); ctx.arc(-14, 0, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = on ? '#3b82ff' : '#ff3b30';
        ctx.beginPath(); ctx.arc(14, 0, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawPerson(ctx, x, y, a, coat, down, isPlayer, punchAnim) {
    ctx.save();
    ctx.translate(x, y);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 3, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
    if (down) {
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = coat;
      roundRect(ctx, -13, -7, 26, 14, 7); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.rotate(a);
    ctx.fillStyle = coat;
    roundRect(ctx, -11, -8, 22, 16, 7); ctx.fill();
    // head + hair
    ctx.fillStyle = isPlayer ? '#e8b48a' : '#d9a06a';
    ctx.beginPath(); ctx.arc(9, 0, 6, 0, Math.PI * 2); ctx.fill();
    if (isPlayer) {
      ctx.fillStyle = '#3a2a1a'; // Mara's dark braid
      ctx.beginPath(); ctx.arc(6, 0, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8b48a';
      ctx.beginPath(); ctx.arc(10, 0, 5, 0, Math.PI * 2); ctx.fill();
    }
    // punch arm
    if (punchAnim > 0) {
      ctx.fillStyle = coat;
      ctx.fillRect(10, -3, 16 + punchAnim * 40, 6);
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawWorld(ctx, cam, game, time) {
    var x0 = cam.x - 40, y0 = cam.y - 40, x1 = cam.x + cam.w + 40, y1 = cam.y + cam.h + 40;
    // Snow ground.
    ctx.fillStyle = PAL.groundSnow;
    ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
    // Frozen lake.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(LAKE.x, LAKE.y, LAKE.rx, LAKE.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = PAL.lakeIce; ctx.fill();
    ctx.strokeStyle = PAL.lakeIceDeep; ctx.lineWidth = 4; ctx.stroke();
    // cracks in the ice
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LAKE.x - 180, LAKE.y - 60); ctx.lineTo(LAKE.x - 40, LAKE.y + 30); ctx.lineTo(LAKE.x + 120, LAKE.y - 20);
    ctx.moveTo(LAKE.x + 60, LAKE.y + 120); ctx.lineTo(LAKE.x + 180, LAKE.y + 40);
    ctx.stroke();
    ctx.restore();
    // Mountain pass: the north gate, pines and a snow ridge.
    ctx.fillStyle = '#e8eef4';
    ctx.fillRect(0, 0, WORLD_W, 34);
    ctx.fillStyle = '#5a6b80';
    for (var mx = 120; mx < WORLD_W; mx += 260) {
      ctx.beginPath();
      ctx.moveTo(mx, 34); ctx.lineTo(mx + 90, 34); ctx.lineTo(mx + 45, -40);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#eef4f8';
      ctx.beginPath();
      ctx.moveTo(mx + 28, -6); ctx.lineTo(mx + 62, -6); ctx.lineTo(mx + 45, -40);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a6b80';
    }
    ctx.fillStyle = '#0e1420';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MOUNTAIN PASS', PASS.x, 26);
    // Roads.
    ctx.fillStyle = PAL.road;
    var i, j;
    for (i = 0; i < ROAD_V.length; i++) ctx.fillRect(ROAD_V[i] - ROAD_W / 2, 0, ROAD_W, WORLD_H);
    for (j = 0; j < ROAD_H.length; j++) ctx.fillRect(0, ROAD_H[j] - ROAD_W / 2, WORLD_W, ROAD_W);
    // Sidewalks.
    ctx.fillStyle = PAL.sidewalk;
    for (i = 0; i < ROAD_V.length; i++) {
      ctx.fillRect(ROAD_V[i] - ROAD_W / 2 - 12, 0, 12, WORLD_H);
      ctx.fillRect(ROAD_V[i] + ROAD_W / 2, 0, 12, WORLD_H);
    }
    for (j = 0; j < ROAD_H.length; j++) {
      ctx.fillRect(0, ROAD_H[j] - ROAD_W / 2 - 12, WORLD_W, 12);
      ctx.fillRect(0, ROAD_H[j] + ROAD_W / 2, WORLD_W, 12);
    }
    // Lane dashes.
    ctx.fillStyle = PAL.lane;
    for (i = 0; i < ROAD_V.length; i++) {
      for (var y = 20; y < WORLD_H; y += 70) ctx.fillRect(ROAD_V[i] - 2, y, 4, 34);
    }
    for (j = 0; j < ROAD_H.length; j++) {
      for (var x = 20; x < WORLD_W; x += 70) ctx.fillRect(x, ROAD_H[j] - 2, 34, 4);
    }
    // Buildings.
    var bs = World.buildings();
    for (var b = 0; b < bs.length; b++) {
      var bd = bs[b];
      if (bd.x > x1 || bd.x + bd.w < x0 || bd.y > y1 || bd.y + bd.h < y0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bd.x + 5, bd.y + 6, bd.w, bd.h);
      ctx.fillStyle = PAL.building;
      ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
      ctx.fillStyle = PAL.buildingRoof;
      ctx.fillRect(bd.x + 6, bd.y + 6, bd.w - 12, bd.h - 12);
      // snowy roof edge
      ctx.fillStyle = 'rgba(230,240,248,0.9)';
      ctx.fillRect(bd.x + 6, bd.y + 6, bd.w - 12, 8);
      // lit windows
      ctx.fillStyle = '#ffd98a';
      for (var wy = bd.y + 22; wy < bd.y + bd.h - 14; wy += 26) {
        for (var wx = bd.x + 14; wx < bd.x + bd.w - 16; wx += 26) {
          if (((wx * 7 + wy * 13) % 5) < 2) ctx.fillRect(wx, wy, 10, 12);
        }
      }
      if (bd.neon) {
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = bd.hue;
        ctx.fillText(bd.neon, bd.x + bd.w / 2, bd.y - 8);
      }
      if (bd.lodge) {
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillStyle = PAL.neonPink;
        ctx.fillText('ROOMS  •  BAR  •  JAX INSIDE', bd.x + bd.w / 2, bd.y + bd.h + 18);
      }
    }
    // Pines.
    var ps = World.pines();
    for (var p = 0; p < ps.length; p++) {
      var pn = ps[p];
      if (pn.x < x0 || pn.x > x1 || pn.y < y0 || pn.y > y1) continue;
      ctx.fillStyle = PAL.pine;
      ctx.beginPath();
      ctx.moveTo(pn.x, pn.y - 26 * pn.s); ctx.lineTo(pn.x - 15 * pn.s, pn.y + 10 * pn.s); ctx.lineTo(pn.x + 15 * pn.s, pn.y + 10 * pn.s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = PAL.pineSnow;
      ctx.beginPath();
      ctx.moveTo(pn.x, pn.y - 26 * pn.s); ctx.lineTo(pn.x - 8 * pn.s, pn.y - 8 * pn.s); ctx.lineTo(pn.x + 8 * pn.s, pn.y - 8 * pn.s);
      ctx.closePath(); ctx.fill();
    }
    // Street lamps (glow pools).
    var ls = World.lamps();
    ctx.fillStyle = 'rgba(255,217,138,0.16)';
    for (var l = 0; l < ls.length; l++) {
      var lp = ls[l];
      if (lp.x < x0 || lp.x > x1 || lp.y < y0 || lp.y > y1) continue;
      ctx.beginPath(); ctx.arc(lp.x, lp.y, 46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PAL.lampGlow;
      ctx.beginPath(); ctx.arc(lp.x, lp.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,217,138,0.16)';
    }
    // Cash pickups.
    var cps = World.cashPickups();
    for (var c = 0; c < cps.length; c++) {
      var cp = cps[c];
      if (cp.taken) continue;
      ctx.fillStyle = '#2fae5f';
      ctx.beginPath(); ctx.arc(cp.x, cp.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', cp.x, cp.y + 4);
    }
  }

  function drawMarker(ctx, x, y, label, time) {
    var bob = Math.sin(time * 3) * 6;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = 'rgba(255,77,141,0.25)';
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PAL.neonPink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = PAL.neonPink;
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(10, -14); ctx.lineTo(-10, -14); ctx.closePath(); ctx.fill();
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, -44);
    ctx.restore();
  }

  function drawMinimap(ctx, game, w, h) {
    var mw = 210, mh = 158, mx = w - mw - 14, my = 14;
    var sx = mw / WORLD_W, sy = mh / WORLD_H;
    ctx.fillStyle = PAL.hudBg;
    roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 8); ctx.fill();
    ctx.strokeStyle = PAL.hudLine; ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    ctx.fillStyle = '#8fa3bb';
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#a8dcf0';
    ctx.beginPath();
    ctx.ellipse(mx + LAKE.x * sx, my + LAKE.y * sy, LAKE.rx * sx, LAKE.ry * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#232a38';
    for (var i = 0; i < ROAD_V.length; i++) ctx.fillRect(mx + ROAD_V[i] * sx - 2, my, 4, mh);
    for (var j = 0; j < ROAD_H.length; j++) ctx.fillRect(mx, my + ROAD_H[j] * sy - 2, mw, 4);
    var t = missionTarget(game.missions);
    if (t) {
      ctx.fillStyle = PAL.neonPink;
      ctx.beginPath(); ctx.arc(mx + t.x * sx, my + t.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    }
    for (var c = 0; c < game.traffic.length; c++) {
      ctx.fillStyle = game.traffic[c].kind === 'police' ? '#ff5252' : '#ffe066';
      ctx.fillRect(mx + game.traffic[c].x * sx - 2, my + game.traffic[c].y * sy - 2, 4, 4);
    }
    var p = game.player;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(mx + p.x * sx, my + p.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#37e0ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mx + p.x * sx, my + p.y * sy, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = PAL.text;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FROSTLINE', mx, my + mh + 24);
  }

  function drawHud(ctx, game, w, h) {
    var p = game.player;
    // Wanted stars, top centre.
    ctx.textAlign = 'center';
    for (var s = 0; s < WANTED_MAX; s++) {
      ctx.font = '28px system-ui, sans-serif';
      ctx.fillStyle = s < p.wanted ? PAL.star : 'rgba(255,255,255,0.25)';
      ctx.fillText('★', w / 2 + (s - 2) * 32, 40);
    }
    // Mission box, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = PAL.hudBg;
    roundRect(ctx, 12, 12, 300, 86, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(55,224,255,0.5)'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = PAL.neonPink;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(currentMission(game.missions) ? currentMission(game.missions).name.toUpperCase() : 'FREE ROAM', 24, 34);
    ctx.fillStyle = PAL.text;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(missionTitle(game.missions), 24, 56);
    ctx.fillStyle = PAL.textDim;
    ctx.font = '13px system-ui, sans-serif';
    var ms = currentMission(game.missions);
    ctx.fillText(ms ? ms.hint : 'Explore, steal, survive the storm.', 24, 78);
    // Money + health, bottom left.
    ctx.fillStyle = PAL.hudBg;
    roundRect(ctx, 12, h - 64, 250, 52, 8); ctx.fill();
    ctx.fillStyle = '#59ffa0';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(fmtMoney(p.money), 24, h - 36);
    ctx.fillStyle = '#333';
    ctx.fillRect(120, h - 48, 120, 12);
    ctx.fillStyle = p.hp > 40 ? '#59ffa0' : '#ff5252';
    ctx.fillRect(120, h - 48, 120 * clamp(p.hp / 100, 0, 1), 12);
    ctx.fillStyle = PAL.textDim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('HP ' + Math.ceil(p.hp), 120, h - 20);
    // Blizzard meter, bottom right above speed.
    var bw = 170;
    ctx.fillStyle = PAL.hudBg;
    roundRect(ctx, w - bw - 12, h - 96, bw, 84, 8); ctx.fill();
    ctx.fillStyle = PAL.text;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('BLIZZARD', w - bw, h - 76);
    ctx.fillStyle = '#22303f';
    ctx.fillRect(w - bw, h - 66, bw - 24, 10);
    ctx.fillStyle = game.blizzard > 0.66 ? '#ff5252' : game.blizzard > 0.4 ? '#ffb347' : '#37e0ff';
    ctx.fillRect(w - bw, h - 66, (bw - 24) * game.blizzard, 10);
    ctx.fillStyle = PAL.textDim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(game.blizzard > 0.66 ? 'WHITEOUT — grip low' : game.blizzard > 0.4 ? 'Storm rising — slick roads' : 'Light snow — good grip', w - bw, h - 38);
    if (p.inCar) {
      ctx.fillStyle = PAL.text;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(Math.abs(p.speed) * 0.32) + ' km/h', w - 24, h - 110);
      ctx.textAlign = 'left';
    }
    // Context prompt, bottom centre.
    var prompt = '';
    if (!p.inCar && game.nearCar) prompt = 'E — STEAL CAR';
    else if (p.inCar) prompt = 'E — LEAVE CAR    SPACE — (on foot) PUNCH';
    else if (!p.inCar) prompt = 'SPACE — PUNCH    E — STEAL CAR';
    if (prompt) {
      ctx.textAlign = 'center';
      ctx.fillStyle = PAL.hudBg;
      var pw = ctx.measureText(prompt).width + 28;
      roundRect(ctx, w / 2 - pw / 2, h - 40, pw, 28, 14); ctx.fill();
      ctx.fillStyle = PAL.text;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(prompt, w / 2, h - 21);
      ctx.textAlign = 'left';
    }
    // Banner + toast.
    var ms2 = game.missions;
    if (ms2.bannerTimer > 0) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(6,12,24,0.7)';
      var bw2 = ctx.measureText(ms2.banner).width + 48;
      roundRect(ctx, w / 2 - bw2 / 2, h / 2 - 90, bw2, 56, 10); ctx.fill();
      ctx.fillStyle = PAL.neonCyan;
      ctx.fillText(ms2.banner, w / 2, h / 2 - 52);
      ctx.textAlign = 'left';
    }
    if (ms2.toastTimer > 0) {
      ctx.textAlign = 'center';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = PAL.text;
      ctx.fillText(ms2.toast, w / 2, h / 2 - 110);
      ctx.textAlign = 'left';
    }
    drawMinimap(ctx, game, w, h);
  }

  function drawSnow(ctx, cam, blizzard, dt, time) {
    var wind = (blizzard - 0.5) * 160;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (var i = 0; i < snowflakes.length; i++) {
      var f = snowflakes[i];
      f.y += f.v * (0.6 + blizzard) * dt;
      f.x += (wind * 0.4 + Math.sin(time + i) * 12) * dt;
      if (f.y > cam.h + 10) { f.y = -10; f.x = Math.random() * (cam.w + 100); }
      if (f.x > cam.w + 10) f.x = -10;
      if (f.x < -10) f.x = cam.w + 10;
      ctx.globalAlpha = 0.35 + f.s * 0.2;
      ctx.fillRect(cam.x + f.x, cam.y + f.y, f.s, f.s);
    }
    ctx.globalAlpha = 1;
    // Whiteout fog: edges close in as the storm grows.
    if (blizzard > 0.25) {
      var g = ctx.createRadialGradient(cam.x + cam.w / 2, cam.y + cam.h / 2, cam.h * 0.28, cam.x + cam.w / 2, cam.y + cam.h / 2, cam.h * 0.75);
      g.addColorStop(0, 'rgba(220,235,245,0)');
      g.addColorStop(1, 'rgba(220,235,245,' + (blizzard * 0.5).toFixed(2) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
    }
  }

  function button(ctx, x, y, w, h, label, hot) {
    ctx.fillStyle = hot ? PAL.neonPink : 'rgba(255,77,141,0.75)';
    roundRect(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = hot ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 6);
    ctx.textAlign = 'left';
  }

  function drawMenu(ctx, game, w, h, hasSave) {
    ctx.fillStyle = '#070b16';
    ctx.fillRect(0, 0, w, h);
    // Neon skyline silhouette.
    for (var i = 0; i < 26; i++) {
      var bx = i * (w / 26), bh = 90 + ((i * 53) % 160);
      ctx.fillStyle = i % 3 === 0 ? '#131c2e' : '#0e1626';
      ctx.fillRect(bx, h - 220 - bh, w / 26 - 6, bh + 220);
      if (i % 4 === 0) {
        ctx.fillStyle = i % 8 === 0 ? PAL.neonPink : PAL.neonCyan;
        ctx.fillRect(bx + 8, h - 220 - bh - 26, 6, 26);
      }
    }
    ctx.fillStyle = 'rgba(220,235,245,0.06)';
    ctx.fillRect(0, h - 220, w, 220);
    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.neonCyan;
    ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.fillText('FROSTLINE', w / 2, 190);
    ctx.fillStyle = PAL.neonPink;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('A SNOWY NEON OPEN-WORLD CRIME GAME', w / 2, 228);
    ctx.fillStyle = PAL.text;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Mara Kessler, getaway driver of the Whiteout Crew. Five jobs. One storm.', w / 2, 280);
    ctx.fillText('Steal cars, dodge the law, and vanish into the whiteout.', w / 2, 306);
    ctx.fillStyle = PAL.textDim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('WASD / arrows — move & drive      E — steal car      SPACE — punch', w / 2, 360);
    ctx.fillText('P / Esc — pause      M — mute      The frozen lake loses the cops.', w / 2, 384);
    var bw = 280, bh = 52, bx = w / 2 - bw / 2;
    button(ctx, bx, 430, bw, bh, 'NEW GAME', true);
    if (hasSave) button(ctx, bx, 496, bw, bh, 'CONTINUE', false);
    ctx.fillStyle = PAL.textDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center'; // button() leaves textAlign at 'left'
    ctx.fillText('Progress saves to this browser. 100% original — no Rockstar content.', w / 2, 600);
    ctx.fillText('Five chained missions, then free roam. Top 100 paid — good luck, Mara.', w / 2, 622);
    ctx.textAlign = 'left';
    return { newGame: { x: bx, y: 430, w: bw, h: bh }, continueGame: hasSave ? { x: bx, y: 496, w: bw, h: bh } : null };
  }

  function drawPaused(ctx, game, w, h) {
    ctx.fillStyle = 'rgba(4,8,16,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.text;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('PAUSED', w / 2, h / 2 - 30);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = PAL.textDim;
    ctx.fillText('Progress saved. Press P or Esc to keep driving.', w / 2, h / 2 + 8);
    ctx.fillText('M — mute    Enter — resume', w / 2, h / 2 + 34);
    ctx.textAlign = 'left';
  }

  function drawBusted(ctx, w, h, reason) {
    ctx.fillStyle = 'rgba(20,4,8,0.78)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText(reason, w / 2, h / 2 - 10);
    ctx.fillStyle = PAL.text;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Mara wakes up at the Neon Lodge, lighter in the pocket. Press Enter to go on.', w / 2, h / 2 + 28);
    ctx.textAlign = 'left';
  }

  return {
    drawCar: drawCar,
    drawPerson: drawPerson,
    drawWorld: drawWorld,
    drawMarker: drawMarker,
    drawHud: drawHud,
    drawSnow: drawSnow,
    drawMenu: drawMenu,
    drawPaused: drawPaused,
    drawBusted: drawBusted,
    roundRect: roundRect
  };
})();
