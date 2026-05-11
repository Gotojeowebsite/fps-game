// Bots — now use bean character models. AI loop unchanged.
import * as THREE from "three";
import { buildBean, animateBean } from "./beans.js";
import { BEAN_SKINS } from "./economy.js";

const BOT_NAMES = [
  "Vector","Echo","Tango","Bravo","Foxtrot","Recon","Ghost","Whiskey","Romeo","Sierra",
  "Maple","Cinder","Onyx","Talon","Frost","Husk","Vega","Lynx","Drift","Phantom",
];

function randBeanSkin() {
  return BEAN_SKINS[Math.floor(Math.random() * BEAN_SKINS.length)];
}

export class Bot {
  constructor(scene, world, opts = {}) {
    this.scene = scene;
    this.world = world;
    this.team = opts.team || "b";
    this.name = opts.name || BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    this.isLocal = false;
    this.isBot = true;
    this.alive = true;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.maxHealth = 100; this.health = 100;
    this.kills = 0; this.deaths = 0; this.score = 0;
    this.shotCD = 0;
    this.aimTarget = null;
    this.state = "wander"; this.stateT = 0; this.wanderDir = Math.random() * Math.PI * 2;
    this.respawnAt = 0;
    this.lastDamageT = 0;

    // Bean body. Team colour tints body if team known.
    const skin = opts.beanSkin || randBeanSkin();
    // Tint by team for TDM clarity.
    let bodyColor = skin.body;
    if (this.team === "a") bodyColor = mix(bodyColor, 0x56cc8b, 0.45);
    else if (this.team === "b") bodyColor = mix(bodyColor, 0xe85a4f, 0.45);
    const teamSkin = { ...skin, body: bodyColor };
    this.group = buildBean(teamSkin);
    this.group.traverse((m) => {
      m.castShadow = true;
      m.userData.botRef = this;
    });
    scene.add(this.group);
    this.capsule = { r: 0.55, h: 2.0 };
  }

  destroy() { this.scene.remove(this.group); }
  setPos(p) { this.position.copy(p); this.group.position.copy(p); }

  takeDamage(dmg) {
    if (!this.alive) return false;
    this.health -= dmg;
    this.lastDamageT = performance.now() / 1000;
    if (this.health <= 0) { this.alive = false; this.deaths++; this.group.visible = false; return true; }
    return false;
  }

  respawn(pos) {
    this.health = this.maxHealth; this.alive = true; this.position.copy(pos); this.group.visible = true;
  }

  update(dt, targets, world, buildSystem) {
    if (!this.alive) return null;
    this.stateT += dt;
    this.shotCD -= dt;

    let best = null, bestD = Infinity;
    for (const t of targets) {
      if (!t || !t.alive) continue;
      if (t.team === this.team) continue;
      const d = this.position.distanceToSquared(t.position);
      if (d < bestD) { bestD = d; best = t; }
    }
    this.aimTarget = best;

    let result = null;

    if (best && bestD < 70 * 70) {
      const from = this.position.clone(); from.y += 1.6;
      const to = best.position.clone(); to.y += 1.4;
      const visible = !this._blocked(from, to, world, buildSystem);
      if (visible) {
        const dir = to.clone().sub(from);
        this.yaw = Math.atan2(-dir.x, -dir.z);
        this.pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
        this.state = "engage";
        const dist = Math.sqrt(bestD);
        const desired = 12;
        const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        const move = new THREE.Vector3();
        const closeDir = dist > desired ? 1 : (dist < desired - 3 ? -1 : 0);
        move.addScaledVector(fwd, closeDir);
        move.addScaledVector(right, Math.sin(this.stateT * 1.4) * 0.7);
        const speed = 3.6;
        this.velocity.x = move.x * speed;
        this.velocity.z = move.z * speed;
        if (this.shotCD <= 0 && dist < 60) {
          this.shotCD = 0.18 + Math.random() * 0.12;
          const miss = (Math.random() - 0.5) * (0.05 + dist * 0.0035);
          const aim = to.clone().add(new THREE.Vector3((Math.random()-0.5), miss*2, (Math.random()-0.5)).multiplyScalar(0.6 + dist * 0.04));
          const aimDir = aim.clone().sub(from).normalize();
          const hitChance = Math.max(0.18, 0.85 - dist * 0.012);
          const hits = Math.random() < hitChance;
          result = { fired: true, from, dir: aimDir, target: best, hit: hits, dmg: 14 };
        }
      } else {
        const dir = best.position.clone().sub(this.position).normalize();
        this.velocity.x = dir.x * 3.2;
        this.velocity.z = dir.z * 3.2;
        this.state = "chase";
      }
    } else {
      this.state = "wander";
      if (this.stateT > 2.5) {
        this.wanderDir += (Math.random() - 0.5) * 1.4;
        this.stateT = 0;
      }
      this.velocity.x = Math.cos(this.wanderDir) * 1.8;
      this.velocity.z = Math.sin(this.wanderDir) * 1.8;
      this.yaw = Math.atan2(-this.velocity.x, -this.velocity.z);
    }

    const next = this.position.clone();
    next.x += this.velocity.x * dt; next.z += this.velocity.z * dt;
    if (this._blockedBox(next, world, buildSystem)) {
      const nx = this.position.clone(); nx.x += this.velocity.x * dt;
      if (!this._blockedBox(nx, world, buildSystem)) { this.position.copy(nx); }
      else {
        const nz = this.position.clone(); nz.z += this.velocity.z * dt;
        if (!this._blockedBox(nz, world, buildSystem)) this.position.copy(nz);
        else this.wanderDir += 2;
      }
    } else { this.position.copy(next); }
    this.position.x = Math.max(-105, Math.min(105, this.position.x));
    this.position.z = Math.max(-105, Math.min(105, this.position.z));
    this.position.y = 0;

    const moving = Math.hypot(this.velocity.x, this.velocity.z) > 0.4;
    animateBean(this.group, moving, 7);

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw + Math.PI;

    return result;
  }

  _blocked(from, to, world, build) {
    const all = world.colliders.concat(build.colliders);
    const dir = to.clone().sub(from);
    const dist = dir.length();
    if (dist < 0.01) return false;
    dir.divideScalar(dist);
    const steps = Math.min(40, Math.ceil(dist / 0.6));
    const p = new THREE.Vector3();
    for (let i = 1; i < steps; i++) {
      p.copy(from).addScaledVector(dir, dist * (i / steps));
      for (const c of all) {
        if (p.x > c.min.x && p.x < c.max.x && p.y > c.min.y && p.y < c.max.y && p.z > c.min.z && p.z < c.max.z) return true;
      }
    }
    return false;
  }

  _blockedBox(pos, world, build) {
    const r = this.capsule.r, h = this.capsule.h;
    const min = { x: pos.x - r, y: 0, z: pos.z - r };
    const max = { x: pos.x + r, y: h, z: pos.z + r };
    const all = world.colliders.concat(build.colliders);
    for (const c of all) {
      if (min.x > c.max.x || max.x < c.min.x) continue;
      if (min.y > c.max.y || max.y < c.min.y) continue;
      if (min.z > c.max.z || max.z < c.min.z) continue;
      return true;
    }
    return false;
  }
}

function mix(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 * (1-t) + r2 * t);
  const g = Math.round(g1 * (1-t) + g2 * t);
  const b = Math.round(b1 * (1-t) + b2 * t);
  return (r << 16) | (g << 8) | b;
}
