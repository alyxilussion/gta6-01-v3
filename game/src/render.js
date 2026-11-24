// Frostline — all drawing: the night city, cars, people, police, snow, the HUD
// minimap, and the mission marker. Canvas 2D, no assets, everything procedural.
import { CFG, clamp } from './config.js';
import { isRoadAt, onLake } from './world.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCar(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rr(ctx, -22 + 3, -10 + 4, 46, 22, 7); ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  rr(ctx, -23, -11, 46, 22, 7); ctx.fill();
  // Roof + windshield.
  ctx.fillStyle = 'rgba(20,28,44,0.9)';
  rr(ctx, -6, -9, 16, 18, 4); ctx.fill();
  ctx.fillStyle = 'rgba(160,220,255,0.85)';
  ctx.fillRect(8, -8, 4, 16);
  // Headlights (front = +x).
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath(); ctx.arc(23, -7, 2.5, 0, Math.PI * 2); ctx.arc(23, 7, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,170,0.10)';
  ctx.beginPath(); ctx.moveTo(23, -8); ctx.lineTo(120, -34); ctx.lineTo(120, 34); ctx.lineTo(23, 8); ctx.closePath(); ctx.fill();
  // Tail lights.
  ctx.fillStyle = '#ff3b3b';
  ctx.fillRect(-24, -8, 3, 4); ctx.fillRect(-24, 4, 3, 4);
  // Police light bar, flashing.
  if (car.kind === 'police') {
    const on = Math.floor(t * 6) % 2 === 0;
    ctx.fillStyle = on ? '#ff2e2e' : '#2e7dff';
    ctx.fillRect(-4, -11, 8, 5);
    ctx.fillStyle = on ? '#2e7dff' : '#ff2e2e';
    ctx.fillRect(-4, 6, 8, 5);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, punchAnim, isCop) {
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(2, 3, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Body.
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  // Direction tick (face / shoulders).
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * 12, Math.sin(angle) * 12); ctx.stroke();
  // Cop hat, or the player's red jacket trim.
  if (isCop) {
    ctx.fillStyle = '#16233d';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#d9392b';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  }
  // Punch swing.
  if (punchAnim > 0) {
    ctx.strokeStyle = '#ffd23c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
    ctx.lineTo(Math.cos(angle) * 26, Math.sin(angle) * 26);
    ctx.stroke();
  }
  ctx.restore();
}

export function render(state, ctx, viewW, viewH, t) {
  const world = state.world;
  const p = state.player;
  const shake = state.shake > 0 ? state.shake : 0;
  const camX = clamp(p.x - viewW / 2 + (Math.random() - 0.5) * shake, 0, CFG.WORLD - viewW);
  const camY = clamp(p.y - viewH / 2 + (Math.random() - 0.5) * shake, 0, CFG.WORLD - viewH);
  ctx.save();
  ctx.translate(-camX, -camY);

  // Ground: snow with a faint blue tint, darker at night.
  ctx.fillStyle = '#1d2739';
  ctx.fillRect(camX - 20, camY - 20, viewW + 40, viewH + 40);
  ctx.fillStyle = '#232f45';
  const tile = 120;
  for (let x = Math.floor(camX / tile) * tile; x < camX + viewW; x += tile) {
    for (let y = Math.floor(camY / tile) * tile; y < camY + viewH; y += tile) {
      if (((x + y) / tile) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }
  // Frozen lake.
  const l = world.lake;
  ctx.fillStyle = '#7fb8d9';
  rr(ctx, l.x, l.y, l.w, l.h, 60); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  rr(ctx, l.x + 30, l.y + 40, l.w - 160, 26, 13); ctx.fill();
  rr(ctx, l.x + 90, l.y + l.h - 120, l.w - 220, 20, 10); ctx.fill();
  ctx.fillStyle = '#cfe8f5';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FROZEN LAKE', l.x + l.w / 2, l.y + l.h / 2);
  // Mountain pass clearing.
  ctx.fillStyle = '#2c3a52';
  rr(ctx, world.pass.x, world.pass.y, world.pass.w, world.pass.h, 24); ctx.fill();
  ctx.fillStyle = '#eef4fb';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('MOUNTAIN PASS', world.pass.x + world.pass.w / 2, world.pass.y + world.pass.h / 2);

  // Roads.
  ctx.fillStyle = '#141a26';
  for (const c of world.centers) {
    ctx.fillRect(c - CFG.ROAD_W / 2, 0, CFG.ROAD_W, CFG.WORLD);
    ctx.fillRect(0, c - CFG.ROAD_W / 2, CFG.WORLD, CFG.ROAD_W);
  }
  // Lane dashes.
  ctx.strokeStyle = 'rgba(230,235,245,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  ctx.beginPath();
  for (const c of world.centers) {
    ctx.moveTo(c, 0); ctx.lineTo(c, CFG.WORLD);
    ctx.moveTo(0, c); ctx.lineTo(CFG.WORLD, c);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Buildings with snowy roofs and neon signs.
  for (const b of world.buildings) {
    if (b.x > camX + viewW + 60 || b.x + b.w < camX - 60 || b.y > camY + viewH + 60 || b.y + b.h < camY - 60) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.wall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    ctx.fillStyle = b.snow;
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, Math.min(26, b.h - 16));
    // Lit windows.
    ctx.fillStyle = 'rgba(255,214,120,0.85)';
    const cols = Math.max(1, Math.floor(b.w / 46));
    const rows = Math.max(1, Math.floor(b.h / 52));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 3 + b.x) % 5 !== 0) continue;
        ctx.fillRect(b.x + 14 + i * 44, b.y + 34 + j * 50, 12, 16);
      }
    }
    if (b.sign) {
      ctx.save();
      ctx.shadowColor = b.sign.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = b.sign.color;
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.sign.text, b.x + b.w / 2, b.y + b.h - 10);
      ctx.restore();
    }
  }
  // Pines.
  for (const tr of world.trees) {
    if (tr.x < camX - 30 || tr.x > camX + viewW + 30 || tr.y < camY - 30 || tr.y > camY + viewH + 30) continue;
    ctx.fillStyle = '#12351f';
    ctx.beginPath();
    ctx.moveTo(tr.x, tr.y - 18 * tr.s);
    ctx.lineTo(tr.x - 12 * tr.s, tr.y + 10 * tr.s);
    ctx.lineTo(tr.x + 12 * tr.s, tr.y + 10 * tr.s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(238,244,251,0.8)';
    ctx.beginPath();
    ctx.moveTo(tr.x, tr.y - 18 * tr.s);
    ctx.lineTo(tr.x - 7 * tr.s, tr.y - 4 * tr.s);
    ctx.lineTo(tr.x + 7 * tr.s, tr.y - 4 * tr.s);
    ctx.closePath(); ctx.fill();
  }
  // Street lamps (glow pools).
  for (const lamp of world.lamps) {
    if (lamp.x < camX - 40 || lamp.x > camX + viewW + 40 || lamp.y < camY - 40 || lamp.y > camY + viewH + 40) continue;
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 46);
    g.addColorStop(0, 'rgba(255,220,140,0.28)');
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 46, 0, Math.PI * 2); ctx.fill();
  }

  // Mission marker: pulsing beacon + direction arrow at the screen edge.
  if (state.mission) {
    const mt = state.mission.target(world);
    const pulse = 1 + Math.sin(t * 4) * 0.15;
    ctx.save();
    ctx.translate(mt.x, mt.y);
    ctx.strokeStyle = '#ffd23c';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd23c';
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(9, 8); ctx.lineTo(-9, 8); ctx.closePath(); ctx.fill();
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(mt.label, 0, -36);
    ctx.restore();
  }

  // Cars, peds, cops, player.
  for (const car of state.cars) drawCar(ctx, car, t);
  for (const ped of state.peds) {
    if (ped.hp <= 0) continue;
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, 0, false);
  }
  for (const cop of state.cops) drawPerson(ctx, cop.x, cop.y, cop.angle, '#3b6fd9', 0, true);
  if (!p.dead) {
    if (p.inCar) drawCar(ctx, p.inCar, t);
    else drawPerson(ctx, p.x, p.y, p.angle, '#e8e8e8', p.punchAnim, false);
  }
  // Floating combat / reward text.
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  for (const f of state.floats) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - (1.2 - f.life) * 30);
  }
  ctx.globalAlpha = 1;

  // Snowfall + blizzard fog.
  ctx.fillStyle = 'rgba(238,244,251,0.9)';
  for (const flake of state.flakes) {
    const fx = ((flake.x + t * flake.drift) % (CFG.WORLD + 40)) - 20;
    const fy = ((flake.y + t * flake.fall) % (CFG.WORLD + 40)) - 20;
    if (fx < camX - 10 || fx > camX + viewW + 10 || fy < camY - 10 || fy > camY + viewH + 10) continue;
    ctx.fillRect(fx, fy, flake.s, flake.s);
  }
  if (state.storm > 0.25) {
    ctx.fillStyle = `rgba(190,205,225,${(state.storm - 0.25) * 0.22})`;
    ctx.fillRect(camX - 20, camY - 20, viewW + 40, viewH + 40);
  }
  // Night vignette.
  const vg = ctx.createRadialGradient(p.x, p.y, 200, p.x, p.y, 700);
  vg.addColorStop(0, 'rgba(6,10,18,0)');
  vg.addColorStop(1, 'rgba(6,10,18,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(camX - 20, camY - 20, viewW + 40, viewH + 40);

  ctx.restore();
}

// Minimap: the whole city scaled into a small canvas, with player, cars and mission.
export function drawMinimap(state, mctx, size) {
  const s = size / CFG.WORLD;
  mctx.clearRect(0, 0, size, size);
  mctx.fillStyle = 'rgba(10,16,28,0.92)';
  mctx.fillRect(0, 0, size, size);
  mctx.fillStyle = '#7fb8d9';
  mctx.fillRect(state.world.lake.x * s, state.world.lake.y * s, state.world.lake.w * s, state.world.lake.h * s);
  mctx.strokeStyle = '#3a4a63';
  mctx.lineWidth = 1;
  for (const c of state.world.centers) {
    mctx.beginPath(); mctx.moveTo(c * s, 0); mctx.lineTo(c * s, size); mctx.stroke();
    mctx.beginPath(); mctx.moveTo(0, c * s); mctx.lineTo(size, c * s); mctx.stroke();
  }
  mctx.fillStyle = '#ffd23c';
  if (state.mission) {
    const mt = state.mission.target(state.world);
    mctx.beginPath(); mctx.arc(mt.x * s, mt.y * s, 5, 0, Math.PI * 2); mctx.fill();
  }
  mctx.fillStyle = '#ff5b5b';
  for (const car of state.cars) {
    if (car.kind === 'police') mctx.fillRect(car.x * s - 2, car.y * s - 2, 4, 4);
  }
  mctx.fillStyle = '#fff';
  mctx.beginPath(); mctx.arc(state.player.x * s, state.player.y * s, 4, 0, Math.PI * 2); mctx.fill();
  mctx.strokeStyle = 'rgba(255,255,255,0.7)';
  mctx.strokeRect(0.5, 0.5, size - 1, size - 1);
}
