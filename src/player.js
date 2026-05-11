// First-person player controller (local human).
import * as THREE from "three";
import { settings } from "./settings.js";
import { moveWithCollision } from "./physics.js";

const GRAVITY = 28;
const JUMP_VEL = 9.2;
const WALK_SPEED = 5.4;
const SPRINT_MUL = 1.55;
const CROUCH_MUL = 0.55;
const AIR_CONTROL = 0.35;

export class Player {
  constructor(camera, world, opts = {}) {
    this.camera = camera;
    this.world = world;
    this.team = opts.team || "a";
    this.name = opts.name || "You";
    this.isLocal = true;
    this.alive = true;

    this.position = new THREE.Vector3(0, 1.7, 0);
    this.velocity = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.onGround = false;
    this.crouching = false;
    this.sprinting = false;
    this.adsing = false;
    this.adsT = 0;            // 0..1
    this.viewBob = 0;
    this.capsule = { r: 0.4, h: 1.7 };
    this.maxHealth = 100;
    this.health = 100;
    this.shield = 0;
    this.materials = { wood: 0, stone: 0, metal: 0 };
    this.kills = 0; this.deaths = 0; this.score = 0;
    this.lastDamageT = 0;
    this.respawnAt = 0;

    this.recoilPitch = 0; this.recoilYaw = 0;
  }

  takeDamage(dmg, fromName = null) {
    if (!this.alive) return false;
    const block = Math.min(this.shield, dmg);
    this.shield -= block;
    this.health -= (dmg - block);
    this.lastDamageT = performance.now() / 1000;
    if (this.health <= 0) { this.alive = false; this.deaths++; return true; }
    return false;
  }

  giveMat(kind, amount) {
    this.materials[kind] = Math.min(999, (this.materials[kind] || 0) + amount);
  }
  takeMat(kind, amount) {
    if ((this.materials[kind] || 0) < amount) return false;
    this.materials[kind] -= amount;
    return true;
  }

  reset(spawn) {
    this.position.copy(spawn);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.shield = 0;
    this.alive = true;
    this.adsing = false; this.adsT = 0;
  }

  update(dt, input, structures) {
    if (!this.alive) return;
    // Look
    const sens = settings.sensitivity * 0.0022 * (this.adsing ? settings.adsSensMul : 1);
    this.yaw -= input.mdx * sens;
    this.pitch -= input.mdy * sens * (settings.invertY ? -1 : 1);
    this.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.pitch));

    // Recoil decay
    this.recoilPitch *= Math.pow(0.001, dt);
    this.recoilYaw *= Math.pow(0.001, dt);

    // Movement input
    const fwd = (input.actions.has("forward") ? 1 : 0) - (input.actions.has("back") ? 1 : 0);
    const str = (input.actions.has("right") ? 1 : 0) - (input.actions.has("left") ? 1 : 0);
    this.crouching = input.actions.has("crouch");
    this.sprinting = input.actions.has("sprint") && fwd > 0 && !this.adsing && !this.crouching;
    const speed = WALK_SPEED * (this.sprinting ? SPRINT_MUL : 1) * (this.crouching ? CROUCH_MUL : 1) * (this.adsing ? 0.7 : 1);

    // Build wishvel in local then rotate by yaw
    const wishX = str, wishZ = -fwd;
    const len = Math.hypot(wishX, wishZ) || 1;
    const nx = wishX / len, nz = wishZ / len;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const wvx = (nx * cy - nz * sy) * speed * (fwd || str ? 1 : 0);
    const wvz = (nx * sy + nz * cy) * speed * (fwd || str ? 1 : 0);

    // Horizontal accel/friction
    const targetX = wvx, targetZ = wvz;
    const k = this.onGround ? 14 : (14 * AIR_CONTROL);
    this.velocity.x += (targetX - this.velocity.x) * Math.min(1, k * dt);
    this.velocity.z += (targetZ - this.velocity.z) * Math.min(1, k * dt);

    // Jump
    if (this.onGround && input.actionEdge.has("jump")) {
      this.velocity.y = JUMP_VEL;
      this.onGround = false;
    }

    // Gravity
    this.velocity.y -= GRAVITY * dt;

    // Collide with structures + world props (terrain ground handled below).
    const all = () => this.world.colliders.concat(structures.colliders);
    const wasY = this.position.y;
    this.onGround = moveWithCollision(this.position, this.velocity, dt, this.capsule, all);

    // Soft terrain ground: hills are gentle so a flat plane is fine for play.
    const groundY = 0;
    const floorY = groundY + this.capsule.h / 2;
    if (this.position.y < floorY) {
      this.position.y = floorY;
      this.velocity.y = 0;
      this.onGround = true;
    }

    // Crouch lowers eye height (just visually).
    const eyeH = this.crouching ? 1.15 : 1.55;

    // Camera bob
    const moving = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.onGround && moving > 0.5) {
      this.viewBob += dt * (this.sprinting ? 14 : 9);
    } else {
      this.viewBob *= Math.pow(0.001, dt);
    }
    const bobY = Math.sin(this.viewBob) * (this.sprinting ? 0.07 : 0.04) * (this.onGround ? 1 : 0);
    const bobX = Math.cos(this.viewBob * 0.5) * 0.04 * (this.onGround ? 1 : 0);

    // ADS lerp + FOV
    const adsTarget = this.adsing ? 1 : 0;
    this.adsT += (adsTarget - this.adsT) * Math.min(1, 14 * dt);

    // Apply to camera
    this.camera.position.set(this.position.x + bobX * Math.cos(this.yaw), this.position.y - this.capsule.h/2 + eyeH + bobY, this.position.z + bobX * Math.sin(this.yaw));
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch + this.recoilPitch, this.yaw + this.recoilYaw, 0);

    const baseFov = settings.fov;
    const targetFov = baseFov - 22 * this.adsT;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld(true);
  }
}
