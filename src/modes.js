// Game mode rules: Solo, 1v1 Duel, Team Deathmatch, Battle Royale.
import * as THREE from "three";
import { HALF } from "./world.js";

export class ModeBase {
  constructor(api) { this.api = api; this.over = false; this.winner = null; }
  init() {}
  update(_dt) {}
  onKill(_killer, _victim) {}
  shouldRespawn() { return true; }
  getHudInfo() { return ""; }
  scoreboardTeams() { return false; }
}

export class SoloMode extends ModeBase {
  constructor(api) { super(api); this.killGoal = 15; }
  init() {
    // Mix bots, all FFA (each on own team).
    for (let i = 0; i < this.api.cfg.bots; i++) {
      this.api.addBot({ team: "bot" + i });
    }
    this.api.player.team = "you";
  }
  onKill(killer, victim) {
    killer.kills++; killer.score += 100;
    if (killer === this.api.player && killer.kills >= this.killGoal) {
      this.over = true; this.winner = killer;
    }
    // Bots also can win.
    if (killer.isBot && killer.kills >= this.killGoal) {
      this.over = true; this.winner = killer;
    }
  }
  getHudInfo() {
    return `SOLO · KILLS ${this.api.player.kills}/${this.killGoal}`;
  }
}

export class DuelMode extends ModeBase {
  constructor(api) { super(api); this.targetRounds = 5; this.scoreYou = 0; this.scoreOpp = 0; }
  init() {
    // If no remote opponent, add a single tough bot.
    const hasRemote = this.api.cfg.multiplayer?.role && this.api.net.peerCount() > 0;
    if (!hasRemote) {
      const b = this.api.addBot({ team: "opp" });
      b.maxHealth = 120; b.health = 120;
    }
    this.api.player.team = "you";
  }
  onKill(killer, victim) {
    killer.kills++; killer.score += 100;
    if (killer === this.api.player) this.scoreYou++; else this.scoreOpp++;
    if (this.scoreYou >= Math.ceil(this.targetRounds / 2)) { this.over = true; this.winner = this.api.player; }
    else if (this.scoreOpp >= Math.ceil(this.targetRounds / 2)) { this.over = true; this.winner = victim === this.api.player ? killer : this.api.player; }
  }
  getHudInfo() { return `DUEL · ${this.scoreYou} – ${this.scoreOpp} (BO${this.targetRounds})`; }
}

export class TDMMode extends ModeBase {
  constructor(api) { super(api); this.scoreGoal = 25; }
  init() {
    const size = this.api.cfg.teamSize || 2;
    this.api.player.team = "a";
    // Fill remaining slots with bots.
    for (let i = 1; i < size; i++) this.api.addBot({ team: "a" });
    for (let i = 0; i < size; i++) this.api.addBot({ team: "b" });
  }
  onKill(killer, victim) {
    killer.kills++; killer.score += 100;
    this[`team${killer.team.toUpperCase()}`] = (this[`team${killer.team.toUpperCase()}`] || 0) + 1;
    const a = this.teamA || 0, b = this.teamB || 0;
    if (a >= this.scoreGoal || b >= this.scoreGoal) {
      this.over = true;
      this.winner = a > b ? { name: "TEAM A", team: "a" } : { name: "TEAM B", team: "b" };
    }
  }
  scoreboardTeams() { return true; }
  getHudInfo() { return `TDM · A ${this.teamA||0} – B ${this.teamB||0} → ${this.scoreGoal}`; }
}

export class BRMode extends ModeBase {
  constructor(api) {
    super(api);
    this.zoneCenter = new THREE.Vector3(0, 0, 0);
    this.zoneRadius = HALF * 0.9;
    this.nextCenter = new THREE.Vector3(0, 0, 0);
    this.nextRadius = HALF * 0.6;
    this.phase = "wait"; // wait → shrink → wait → shrink
    this.phaseEnd = 0;
    this.phaseT = 0;
    this.tick = 0;
  }
  init() {
    // All bots free-for-all.
    for (let i = 0; i < this.api.cfg.bots; i++) this.api.addBot({ team: "br" + i });
    this.api.player.team = "you";
    this._planNextZone();
    this.phase = "wait"; this.phaseEnd = 25;
  }
  _planNextZone() {
    const r = Math.max(8, this.zoneRadius * 0.55);
    const dx = (Math.random() - 0.5) * (this.zoneRadius - r) * 1.4;
    const dz = (Math.random() - 0.5) * (this.zoneRadius - r) * 1.4;
    this.nextCenter.set(this.zoneCenter.x + dx, 0, this.zoneCenter.z + dz);
    this.nextRadius = r;
  }
  update(dt) {
    this.phaseT += dt;
    // Damage outside zone.
    const dmgInterval = 0.5;
    this.tick += dt;
    if (this.tick > dmgInterval) {
      this.tick = 0;
      const dps = 4;
      const all = [this.api.player, ...this.api.bots];
      for (const e of all) {
        if (!e?.alive) continue;
        const d2 = (e.position.x - this.zoneCenter.x) ** 2 + (e.position.z - this.zoneCenter.z) ** 2;
        if (d2 > this.zoneRadius * this.zoneRadius) {
          e.takeDamage?.(dps);
          if (!e.alive && this.api.onZoneKill) this.api.onZoneKill(e);
        }
      }
    }

    // Phase progression.
    if (this.phaseT >= this.phaseEnd) {
      this.phaseT = 0;
      if (this.phase === "wait") {
        this.phase = "shrink";
        this.phaseEnd = 15;
        this._shrinkStart = { c: this.zoneCenter.clone(), r: this.zoneRadius };
      } else {
        this.zoneCenter.copy(this.nextCenter);
        this.zoneRadius = this.nextRadius;
        if (this.zoneRadius > 8) { this._planNextZone(); this.phase = "wait"; this.phaseEnd = 22; }
        else { this.phase = "end"; this.phaseEnd = Infinity; }
      }
    }
    if (this.phase === "shrink" && this._shrinkStart) {
      const t = Math.min(1, this.phaseT / 15);
      this.zoneCenter.lerpVectors(this._shrinkStart.c, this.nextCenter, t);
      this.zoneRadius = this._shrinkStart.r + (this.nextRadius - this._shrinkStart.r) * t;
    }

    // Last one standing?
    const alive = [this.api.player, ...this.api.bots].filter(e => e?.alive);
    if (alive.length === 1) {
      this.over = true;
      this.winner = alive[0];
    } else if (alive.length === 0) {
      this.over = true; this.winner = null;
    }
  }
  onKill(killer, _victim) { if (killer) { killer.kills++; killer.score += 100; } }
  zoneInfo() {
    return { x: this.zoneCenter.x, z: this.zoneCenter.z, r: this.zoneRadius, next: { x: this.nextCenter.x, z: this.nextCenter.z, r: this.nextRadius } };
  }
  getHudInfo() {
    const alive = [this.api.player, ...this.api.bots].filter(e => e?.alive).length;
    const sec = Math.max(0, Math.ceil(this.phaseEnd - this.phaseT));
    return `BR · ALIVE ${alive} · ${this.phase.toUpperCase()} ${sec}s`;
  }
}

export function createMode(name, api) {
  switch (name) {
    case "solo": return new SoloMode(api);
    case "duel": return new DuelMode(api);
    case "tdm":  return new TDMMode(api);
    case "br":   return new BRMode(api);
  }
  return new SoloMode(api);
}
