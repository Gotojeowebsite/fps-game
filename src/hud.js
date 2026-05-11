// HUD: health, ammo, materials, kill feed, minimap, scoreboard, hotbar.
import { WORLD_SIZE, HALF } from "./world.js";

const $ = (s) => document.querySelector(s);

export class HUD {
  constructor(getState) {
    this.getState = getState;
    this.killfeed = $("#killfeed");
    this.scoreboard = $("#scoreboard");
    this.zoneInfo = $("#zone-info");
    this.modeInfo = $("#mode-info");
    this.healthFill = $("#health-fill");
    this.healthText = $("#health-text");
    this.ammoCur = $("#ammo-cur");
    this.ammoRes = $("#ammo-res");
    this.mats = {
      wood: $(".mat-wood .num"),
      stone: $(".mat-stone .num"),
      metal: $(".mat-metal .num"),
    };
    this.minimap = $("#minimap");
    this.mctx = this.minimap.getContext("2d");
    this.hotbar = $("#hotbar");
    this.buildHint = $("#build-hint");
    this.damageVignette = $("#damage-vignette");
    this.hitmarker = $("#hitmarker");

    this._lastDmgT = 0;
    this._buildHotbar();
  }

  _buildHotbar() {
    this.setLoadout(["rifle", "pistol", "sniper", "banana", "pickaxe"]);
  }

  setLoadout(slots) {
    const labels = { rifle: "RIFLE", pistol: "PISTOL", sniper: "SNIPER", banana: "BANANA", pickaxe: "PICKAXE" };
    this.hotbar.innerHTML = "";
    this.slots = slots.map((id, i) => {
      const el = document.createElement("div");
      el.className = "hotbar-slot" + (i === 0 ? " sel" : "");
      el.innerHTML = `<span class="key">${i + 1}</span><span class="label">${labels[id] || id.toUpperCase()}</span>`;
      this.hotbar.append(el);
      return el;
    });
  }

  setSelectedSlot(idx) {
    if (!this.slots) return;
    for (let i = 0; i < this.slots.length; i++) this.slots[i].classList.toggle("sel", i === idx);
  }

  showHitmarker(head = false) {
    this.hitmarker.classList.remove("show");
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.add("show");
    this.hitmarker.style.filter = head ? "drop-shadow(0 0 6px #e85a4f)" : "";
  }

  flashDamage() {
    this.damageVignette.classList.add("show");
    clearTimeout(this._dmgT);
    this._dmgT = setTimeout(() => this.damageVignette.classList.remove("show"), 240);
  }

  setBuildMode(on) {
    this.buildHint.classList.toggle("hidden", !on);
    this.setSelectedSlot(on ? 3 : 0);
  }

  addKill(killer, victim, isYouKiller, isYouVictim) {
    const row = document.createElement("div");
    row.className = "killfeed-row";
    const kCls = isYouKiller ? "killer you" : "killer";
    const vCls = isYouVictim ? "victim you" : "victim";
    row.innerHTML = `<span class="${kCls}">${killer}</span> <span style="opacity:.6;margin:0 4px">▶</span> <span class="${vCls}">${victim}</span>`;
    this.killfeed.append(row);
    setTimeout(() => row.remove(), 5000);
    // Cap rows
    while (this.killfeed.children.length > 5) this.killfeed.firstChild.remove();
  }

  setModeInfo(text) {
    this.modeInfo.textContent = text || "";
    this.modeInfo.style.display = text ? "" : "none";
  }
  setZoneInfo(text, warn = false) {
    this.zoneInfo.textContent = text || "";
    this.zoneInfo.style.display = text ? "" : "none";
    this.zoneInfo.classList.toggle("warn", warn);
  }

  update() {
    const s = this.getState();
    if (!s) return;
    const p = s.player;
    // Health
    const pct = Math.max(0, p.health) / p.maxHealth * 100;
    this.healthFill.style.width = pct + "%";
    this.healthFill.classList.toggle("low", pct < 35);
    this.healthText.textContent = Math.max(0, Math.ceil(p.health));
    // Ammo
    const w = s.weapon;
    this.ammoCur.textContent = w ? (w.reloading ? "…" : w.mag) : "—";
    this.ammoRes.textContent = w ? w.reserve : "—";
    // Mats
    this.mats.wood.textContent = p.materials.wood | 0;
    this.mats.stone.textContent = p.materials.stone | 0;
    this.mats.metal.textContent = p.materials.metal | 0;

    this._drawMinimap(s);
    this._maybeUpdateScoreboard(s);
  }

  _drawMinimap(s) {
    const ctx = this.mctx;
    const W = this.minimap.width, H = this.minimap.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(20,28,38,0.85)";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const scale = (W * 0.5) / 70; // 70m radius view

    const px = s.player.position.x, pz = s.player.position.z;
    // Zone
    if (s.zone) {
      const dx = s.zone.x - px, dz = s.zone.z - pz;
      ctx.beginPath();
      ctx.arc(cx + dx * scale, cy + dz * scale, s.zone.r * scale, 0, Math.PI*2);
      ctx.strokeStyle = "#f2c94c"; ctx.lineWidth = 1.5;
      ctx.stroke();
      if (s.zone.next) {
        ctx.beginPath();
        ctx.arc(cx + (s.zone.next.x - px) * scale, cy + (s.zone.next.z - pz) * scale, s.zone.next.r * scale, 0, Math.PI*2);
        ctx.setLineDash([3,3]); ctx.strokeStyle = "#56cc8b"; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // Bots/players
    for (const e of s.entities) {
      if (!e || !e.alive) continue;
      const dx = e.position.x - px, dz = e.position.z - pz;
      if (Math.abs(dx) > W * 0.5 / scale || Math.abs(dz) > H * 0.5 / scale) continue;
      ctx.fillStyle = e.team === s.player.team ? "#56cc8b" : "#e85a4f";
      ctx.beginPath(); ctx.arc(cx + dx * scale, cy + dz * scale, 3, 0, Math.PI*2); ctx.fill();
    }
    // Self (north up)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0);
    ctx.fillStyle = "#f2c94c";
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.rotate(-s.player.yaw);
    ctx.fill();
    ctx.restore();
    // Border
    ctx.strokeStyle = "rgba(242,201,76,0.6)";
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }

  _maybeUpdateScoreboard(s) {
    if (this.scoreboard.classList.contains("hidden")) return;
    const rows = $("#sb-rows");
    const all = [s.player, ...s.entities.filter(e => e)];
    if (s.teams) {
      // Split rows by team
      const aRows = all.filter(p => p.team === "a");
      const bRows = all.filter(p => p.team === "b");
      const tA = aRows.reduce((a,b) => a + b.kills, 0);
      const tB = bRows.reduce((a,b) => a + b.kills, 0);
      rows.innerHTML = `
        <div class="sb-row head"><span></span><span>Player</span><span>K</span><span>D</span><span>Score</span></div>
        <h3 style="margin-top:8px;color:var(--accent2);">TEAM A — ${tA}</h3>
        ${aRows.map((p, i) => this._sbRow(p, i+1, s.player, "sb-team-a")).join("")}
        <h3 style="margin-top:8px;color:var(--danger);">TEAM B — ${tB}</h3>
        ${bRows.map((p, i) => this._sbRow(p, i+1, s.player, "sb-team-b")).join("")}
      `;
    } else {
      all.sort((a,b) => b.kills - a.kills || a.deaths - b.deaths);
      rows.innerHTML = `
        <div class="sb-row head"><span>#</span><span>Player</span><span>K</span><span>D</span><span>Score</span></div>
        ${all.map((p, i) => this._sbRow(p, i+1, s.player, "")).join("")}
      `;
    }
  }

  _sbRow(p, rank, you, extra) {
    const cls = (p === you ? "you " : "") + (p.alive ? "" : "dead ") + extra;
    return `<div class="sb-row ${cls}"><span>${rank}</span><span>${p.name}${p.isBot ? " (BOT)" : ""}</span><span>${p.kills}</span><span>${p.deaths}</span><span>${p.score|0}</span></div>`;
  }

  toggleScoreboard(show) {
    this.scoreboard.classList.toggle("hidden", !show);
  }
}
