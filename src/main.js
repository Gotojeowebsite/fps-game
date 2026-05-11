// Game orchestrator: scene, loop, glue for everything.
import * as THREE from "three";
import { settings, onSettingsChange } from "./settings.js";
import { Input } from "./input.js";
import { initMenus, showScreen, hideAllScreens, toast } from "./menu.js";
import { World } from "./world.js";
import { Player } from "./player.js";
import { Weapon, WEAPONS, raycastShot } from "./weapons.js";
import { BuildSystem, STRUCT } from "./building.js";
import { EditMode } from "./edit.js";
import { Bot } from "./bots.js";
import { HUD } from "./hud.js";
import { FX } from "./effects.js";
import { Net } from "./net.js";
import { createMode } from "./modes.js";
import { GunCharm } from "./charms.js";
import { buildBean, animateBean } from "./beans.js";
import {
  economy, awardMatch, getEquippedSkin, getEquippedCharm, BEAN_SKINS,
} from "./economy.js";
import { getEquippedBean, refreshAll as refreshShop } from "./shop.js";
import { sounds } from "./sounds.js";

sounds.bindUnlock();

const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = settings.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Colour space setting — Three.js renamed the API around r152. Support both.
if ("outputColorSpace" in renderer && THREE.SRGBColorSpace !== undefined) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else if ("outputEncoding" in renderer && THREE.sRGBEncoding !== undefined) {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 600);
scene.add(camera);

const input = new Input();
const net = new Net();
// Always-on message handler — handles matchstart even before our own match
// has started, then delegates to handleNetMessage for in-match traffic.
net.onMessage = (peerId, msg) => handleNetMessage(peerId, msg);

// Loadout: rifle, pistol, sniper, banana, pickaxe
const LOADOUT = ["rifle", "pistol", "sniper", "banana", "pickaxe"];

let world, player, build, edit, hud, fx, mode;
let bots = [];
let remotePlayers = new Map();
let running = false;
let paused = false;
let inMatch = false;
let endTimer = 0;
let lastT = performance.now() / 1000;

let activeSlot = 0;      // index into LOADOUT
let weapon = null;       // current Weapon (or null for pickaxe)
let charm = null;        // current GunCharm
let lastKillT = 0;       // killstreak window
let killStreak = 0;
let damageDirs = [];     // recent damage sources (for direction arrows)
let prevQuickKeys = { z: false, x: false, c: false };

const fpsEl = document.getElementById("fps-counter");
let fpsAcc = 0, fpsFrames = 0;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const scale = settings.renderScale || 1;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = w + "px";
  renderer.domElement.style.height = h + "px";
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * scale);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

onSettingsChange((s) => {
  renderer.shadowMap.enabled = s.shadows;
  resize();
  fpsEl.classList.toggle("hidden", !s.showFps);
});

const api = {
  net,
  inMatch: false,
  startMatch(cfg) { startMatch(cfg); },
  resume() { setPaused(false); },
  exitToMenu() { teardown(); showScreen("menu"); refreshShop(); },
  replay() { if (api._lastCfg) { teardown(); startMatch(api._lastCfg); } },
};
initMenus(api);
showScreen("menu");
fpsEl.classList.toggle("hidden", !settings.showFps);

// Equip a weapon from the loadout by slot index.
function equipSlot(idx) {
  if (idx < 0 || idx >= LOADOUT.length) return;
  if (build.active) { build.setActive(false); hud?.setBuildMode(false); }
  activeSlot = idx;
  hud?.setSelectedSlot(idx);
  // Detach prior weapon + charm.
  if (weapon) { weapon.remove(); weapon = null; }
  if (charm) { charm.remove(); charm = null; }
  const slotId = LOADOUT[idx];
  if (slotId === "pickaxe") return;
  const skin = getEquippedSkin(slotId);
  weapon = new Weapon(scene, camera, slotId, skin);
  const charmDef = getEquippedCharm(slotId);
  if (charmDef) charm = new GunCharm(scene, weapon.charmAnchor, charmDef);
}

function startMatch(cfg) {
  api._lastCfg = cfg;
  api.cfg = cfg;
  api.inMatch = true;
  inMatch = true; paused = false; running = true;
  endTimer = 0;
  killStreak = 0; lastKillT = 0;
  damageDirs = [];

  // Clear stale remote-player entries so re-spawning doesn't reference
  // destroyed Three groups from a previous match (or pre-game lobby).
  for (const r of remotePlayers.values()) { try { scene.remove(r.group); } catch {} }
  remotePlayers.clear();

  while (scene.children.length > 0) scene.remove(scene.children[0]);
  scene.add(camera);

  world = new World(scene, { shadows: settings.shadows, mapId: cfg.mapId || "outpost" });
  api.world = world;

  player = new Player(camera, world);
  player.name = "You";
  api.player = player;

  build = new BuildSystem(scene, world, player, {
    onPlace: (msg) => net.send({ t: "build", ...msg }),
  });
  api.build = build;

  edit = new EditMode(scene, build, camera);
  api.edit = edit;

  fx = new FX(scene);
  api.fx = fx;

  bots = []; api.bots = bots;
  api.addBot = (opts) => {
    const b = new Bot(scene, world, opts);
    b.setPos(world.pickSpawn([player.position, ...bots.map(x => x.position)]));
    bots.push(b);
    return b;
  };
  api.onZoneKill = (e) => {
    pushKill("THE ZONE", e.name, false, e === player);
    if (e === player) onPlayerDied();
  };

  mode = createMode(cfg.mode, api);
  mode.init();
  api.mode = mode;

  player.reset(world.pickSpawn([], 30));
  player.materials.wood = 100;
  player.materials.stone = 50;
  player.materials.metal = 20;

  // Equip starting weapon.
  activeSlot = 0;
  equipSlot(0);

  if (mode.zoneInfo) {
    api.zoneMesh = makeZoneMesh();
    scene.add(api.zoneMesh);
  } else { api.zoneMesh = null; }

  document.getElementById("hud").classList.remove("hidden");
  document.getElementById("scope").classList.add("hidden");
  hideAllScreens();
  hud = new HUD(() => buildHudState());
  api.hud = hud;
  hud.setLoadout(LOADOUT);
  hud.setModeInfo(mode.getHudInfo());

  // onMessage stays the same (handleNetMessage); just hook join/leave for HUD.
  net.onPeerJoin = (id) => { toast(`Player joined (${id.slice(0,6)})`); ensureRemotePlayer(id); };
  net.onPeerLeave = (id) => { toast(`Player left`); const r = remotePlayers.get(id); if (r) { scene.remove(r.group); remotePlayers.delete(id); } };

  canvas.addEventListener("click", lockOnce);
  input.requestLock(canvas);

  lastT = performance.now() / 1000;
  requestAnimationFrame(loop);
}

function lockOnce() {
  if (!inMatch || paused) return;
  input.requestLock(canvas);
}

function teardown() {
  // Award coins if not already done by showEnd.
  if (player && !player._awarded) {
    const won = mode?.winner === player || (mode?.winner && mode.winner.team === player.team);
    const earned = awardMatch({ kills: player.kills, won: !!won });
    if (earned) toast(`+${earned} coins`);
    player._awarded = true;
  }
  running = false;
  inMatch = false; api.inMatch = false;
  input.exitLock();
  canvas.removeEventListener("click", lockOnce);
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("scope").classList.add("hidden");
  for (const r of remotePlayers.values()) scene.remove(r.group);
  remotePlayers.clear();
  if (weapon) { weapon.remove(); weapon = null; }
  if (charm) { charm.remove(); charm = null; }
  while (scene.children.length > 0) scene.remove(scene.children[0]);
}

function setPaused(p) {
  paused = p;
  if (p) { input.exitLock(); showScreen("pause"); }
  else { hideAllScreens(); document.getElementById("hud").classList.remove("hidden"); input.requestLock(canvas); }
}

function loop() {
  if (!running) return;
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - lastT);
  lastT = now;

  if (!paused) tick(dt, now);

  renderer.render(scene, camera);

  if (settings.showFps) {
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc > 0.5) { fpsEl.textContent = Math.round(fpsFrames / fpsAcc); fpsAcc = 0; fpsFrames = 0; }
  }

  requestAnimationFrame(loop);
}

function tick(dt, now) {
  const f = input.frame();

  if (f.actionEdge.has("pause")) { setPaused(!paused); return; }

  // Weapon switching via slot keys (1..5). In build mode 1/2/3 swap materials
  // (handled below) rather than swapping weapons.
  if (!build.active) {
    for (let i = 0; i < LOADOUT.length; i++) {
      const slot = `slot${i + 1}`;
      if (f.actionEdge.has(slot)) equipSlot(i);
    }
  }

  // 1v1.lol-style fast build keys (Z/X/C) — place on key-down edge.
  const z = input.keys.has("KeyZ");
  const x = input.keys.has("KeyX");
  const c = input.keys.has("KeyC");
  if (z && !prevQuickKeys.z) quickBuild(STRUCT.WALL);
  if (x && !prevQuickKeys.x) quickBuild(STRUCT.FLOOR);
  if (c && !prevQuickKeys.c) quickBuild(STRUCT.RAMP);
  prevQuickKeys = { z, x, c };

  // Build toggle (Q): enter cursor-driven build mode.
  if (f.actionEdge.has("build")) {
    build.setActive(!build.active);
    hud?.setBuildMode(build.active);
    if (build.active) {
      // Hide weapon viewmodel while building cursor active.
      if (weapon) weapon.group.visible = false;
    } else {
      if (weapon) weapon.group.visible = true;
    }
  }

  // Material switching while in build (1/2/3 also toggle slot — guard).
  if (build.active) {
    // 1/2/3 set material (overrides slot switch while in build mode).
    if (f.actionEdge.has("slot1")) build.setMat("wood");
    if (f.actionEdge.has("slot2")) build.setMat("stone");
    if (f.actionEdge.has("slot3")) build.setMat("metal");
    if (f.wheel !== 0) build.cycleKind(f.wheel > 0 ? 1 : -1);
  }

  // Edit mode (G).
  if (f.actionEdge.has("edit")) {
    if (edit.active) edit.apply();
    else edit.enter();
  }

  // Reload (the actual SFX is fired by the wasReloading edge below).
  if (f.actionEdge.has("reload") && weapon) weapon.startReload();
  // Jump sound on the keydown edge while grounded.
  if (f.actionEdge.has("jump") && player.onGround) sounds.jump();

  // ADS toggle/hold.
  const canADS = weapon && !build.active;
  if (canADS) {
    if (settings.toggleADS) {
      if (f.rightEdge) player.adsing = !player.adsing;
    } else {
      player.adsing = input.mouse.right;
    }
  } else { player.adsing = false; }

  // Sniper scope overlay.
  const scoping = canADS && weapon && weapon.def.scope && player.adsing && player.adsT > 0.6;
  document.getElementById("scope").classList.toggle("hidden", !scoping);
  if (weapon) weapon.group.visible = !scoping && !build.active;

  hud?.toggleScoreboard(input.isDown("scoreboard"));

  // Player physics + look.
  player.update(dt, { mdx: f.mdx, mdy: f.mdy, actions: input.actions, actionEdge: f.actionEdge }, build);

  // Edit-mode mouse click.
  if (edit.active && f.leftEdge) { edit.click(); }
  // Build ghost + place.
  else if (build.active) {
    build.updateGhost(camera);
    if (f.leftEdge) {
      const placed = build.tryPlace();
      if (placed) {
        fx.placeBurst(placed.mesh.position.clone(), 0xf2c94c);
        sounds.place(placed.mat);
      } else {
        sounds.uiClick();
      }
    }
  } else {
    // Shooting or pickaxe.
    const slotId = LOADOUT[activeSlot];
    if (slotId === "pickaxe") {
      // Pickaxe: harvest closest harvestable in front, on click + cooldown.
      if (f.leftEdge || (input.mouse.left && (!player._pickT || now - player._pickT > 0.45))) {
        player._pickT = now;
        pickaxeSwing(now);
      }
    } else if (weapon && player.alive) {
      const canFire = weapon.def.auto ? input.mouse.left : f.leftEdge;
      if (canFire && weapon.tryShoot(now, player.adsing)) {
        sounds.shoot(weapon.def.id);
        fireBullet(now);
      } else if (canFire && weapon.mag === 0 && !weapon.reloading) {
        // dry click — only on the edge, not auto-fire
        if (f.leftEdge) sounds.uiClick();
      }
      // Harvest by holding E (alternative method).
      if (input.isDown("interact")) {
        const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
        const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
        const hit = raycastShot(scene, origin, dir, []);
        if (hit && hit.distance < 3) {
          const idx = hit.object.userData?.harvestIdx;
          if (idx !== undefined && (!player._meleeT || now - player._meleeT > 0.35)) {
            player._meleeT = now;
            const yld = world.damageHarvest(idx, 25);
            if (yld) {
              player.giveMat(yld.kind, yld.amount);
              fx.placeBurst(hit.point, yld.kind === "wood" ? 0xc08a4a : yld.kind === "stone" ? 0xb6b8bb : 0x6ab0e0);
              sounds.harvest();
            }
          }
        }
      }
    }
  }

  // Detect auto-reload (empty mag → tryShoot triggers reload) and play SFX.
  if (weapon) {
    const wasReloading = weapon._sfxReloading || false;
    if (weapon.reloading && !wasReloading) sounds.reload();
    weapon._sfxReloading = weapon.reloading;
  }
  if (weapon) weapon.update(dt, player.adsT);
  if (charm) charm.update(dt);

  // Bots tick.
  const targets = [player, ...bots];
  for (const b of bots) {
    const r = b.update(dt, targets, world, build);
    if (r && r.fired) {
      const from = r.from.clone();
      const to = from.clone().addScaledVector(r.dir, 80);
      fx.tracer(from, to, 0xff8866);
      if (r.hit && r.target) {
        const dead = r.target.takeDamage(r.dmg, b.name);
        if (r.target === player) {
          hud?.flashDamage();
          showDamageDir(b.position);
          sounds.hitTaken();
        }
        const pt = r.target.position.clone(); pt.y += 1.2;
        fx.bloodPuff(pt);
        if (dead) onKill(b, r.target);
      }
    }
  }

  // Respawns (skip BR).
  if (mode.constructor.name !== "BRMode") {
    if (!player.alive && now > player.respawnAt) respawnPlayer();
    for (const b of bots) {
      if (!b.alive && now > b.respawnAt) {
        b.respawn(world.pickSpawn([player.position, ...bots.filter(x => x.alive).map(x => x.position)]));
      }
    }
  }

  fx.update(dt);
  mode.update(dt);
  hud?.setModeInfo(mode.getHudInfo());

  if (mode.zoneInfo) {
    const z = mode.zoneInfo();
    if (api.zoneMesh) {
      api.zoneMesh.position.set(z.x, 0.05, z.z);
      api.zoneMesh.scale.set(z.r, 1, z.r);
    }
    const inside = (player.position.x - z.x) ** 2 + (player.position.z - z.z) ** 2 < z.r * z.r;
    hud?.setZoneInfo(inside ? `ZONE · phase ${mode.phase}` : `OUTSIDE ZONE — MOVE`, !inside);
  } else { hud?.setZoneInfo(""); }

  // Multiplayer state heartbeat ~12Hz.
  if (net.peer && net.peerCount() > 0) {
    if (!api._netT || now - api._netT > 1/12) {
      api._netT = now;
      const beanId = economy.equippedBean || "bn_classic";
      net.send({
        t: "state", n: player.name,
        x: player.position.x, y: player.position.y, z: player.position.z,
        yw: player.yaw, pt: player.pitch,
        hp: player.health, alive: player.alive, team: player.team,
        bean: beanId,
      });
    }
  }

  // Remote interpolation.
  for (const r of remotePlayers.values()) {
    if (!r.group) continue;
    r.group.position.lerp(r.target, Math.min(1, dt * 12));
    r.group.rotation.y = r.yaw + Math.PI;
  }

  hud?.update();
  updateDamageDirArrows(dt);

  if (mode.over) {
    endTimer += dt;
    if (endTimer > 1.2) showEnd();
  }
}

// ─── Quick build (1v1.lol style) ────────────────────────────
function quickBuild(kind) {
  if (!build || edit.active) return;
  // Temporarily switch the build kind, place, restore.
  const prev = build.kind;
  build.kind = kind;
  build.setActive(true);
  build.updateGhost(camera);
  const placed = build.tryPlace();
  if (placed) {
    fx.placeBurst(placed.mesh.position.clone(), 0xf2c94c);
    sounds.place(placed.mat);
  }
  // Auto-exit build mode (so user keeps shooting flow).
  build.setActive(false);
  build.kind = prev;
  hud?.setBuildMode(false);
  if (weapon) weapon.group.visible = true;
}

// ─── Pickaxe ────────────────────────────────────────────────
function pickaxeSwing(now) {
  const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const hit = raycastShot(scene, origin, dir, []);
  if (hit && hit.distance < 3.6) {
    const idx = hit.object.userData?.harvestIdx;
    if (idx !== undefined) {
      const yld = world.damageHarvest(idx, 40);
      if (yld) {
        player.giveMat(yld.kind, Math.round(yld.amount * 1.5));
        fx.placeBurst(hit.point, yld.kind === "wood" ? 0xc08a4a : yld.kind === "stone" ? 0xb6b8bb : 0x6ab0e0);
        sounds.harvest();
      }
    } else {
      // Pickaxe also damages structures lightly.
      if (build.structures.find(s => s && s.mesh === hit.object)) {
        build.damageMesh(hit.object, 35);
        fx.hitSparks(hit.point, 0xddddff);
      }
      // Or deals minor melee damage to bots in range.
      const botRef = hit.object.userData?.botRef;
      if (botRef && botRef.alive) {
        const dead = botRef.takeDamage(35);
        fx.bloodPuff(hit.point); hud?.showHitmarker();
        if (dead) onKill(player, botRef);
      }
    }
  }
}

// ─── Bullet ─────────────────────────────────────────────────
function fireBullet(now) {
  const def = weapon.def;
  player.recoilPitch += def.recoilP * (player.adsing ? 0.4 : 1);
  player.recoilYaw += (Math.random() - 0.5) * def.recoilY * (player.adsing ? 0.4 : 1);

  const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const sp = weapon.spread(player.adsing);
  dir.x += (Math.random() - 0.5) * sp;
  dir.y += (Math.random() - 0.5) * sp;
  dir.z += (Math.random() - 0.5) * sp;
  dir.normalize();

  const hit = raycastShot(scene, origin, dir, []);
  const tracerEnd = hit ? hit.point.clone() : origin.clone().addScaledVector(dir, def.range);
  const muzzle = weapon.worldMuzzlePos();
  fx.tracer(muzzle, tracerEnd, def.scope ? 0xfff4c0 : 0xffe28a);

  if (hit) {
    const botRef = hit.object.userData?.botRef;
    if (botRef && botRef.alive) {
      const dist = origin.distanceTo(hit.point);
      const dmg = def.dmg * (1 - Math.min(0.65, dist / def.range * (1 - def.dmgFalloff)));
      const head = hit.point.y > botRef.position.y + 1.55;
      const final = head ? dmg * 2 : dmg;
      const dead = botRef.takeDamage(final);
      fx.bloodPuff(hit.point);
      hud?.showHitmarker(head);
      sounds.hitmarker(head);
      net.send({ t: "shot", x: muzzle.x, y: muzzle.y, z: muzzle.z, ex: tracerEnd.x, ey: tracerEnd.y, ez: tracerEnd.z });
      if (dead) onKill(player, botRef);
      return;
    }
    if (build.structures.find(s => s && s.mesh === hit.object)) {
      build.damageMesh(hit.object, def.dmg);
      fx.hitSparks(hit.point, 0xddddff);
      return;
    }
    const idx = hit.object.userData?.harvestIdx;
    if (idx !== undefined) {
      const yld = world.damageHarvest(idx, def.dmg * 0.4);
      if (yld) { player.giveMat(yld.kind, yld.amount); fx.placeBurst(hit.point, yld.kind === "wood" ? 0xc08a4a : yld.kind === "stone" ? 0xb6b8bb : 0x6ab0e0); }
      return;
    }
    fx.hitSparks(hit.point, 0xffddaa);
  }

  net.send({ t: "shot", x: muzzle.x, y: muzzle.y, z: muzzle.z, ex: tracerEnd.x, ey: tracerEnd.y, ez: tracerEnd.z });
}

function pushKill(killerName, victimName, isYouKiller, isYouVictim) {
  hud?.addKill(killerName, victimName, isYouKiller, isYouVictim);
}

const STREAK_LABELS = [null, null, "DOUBLE KILL", "TRIPLE KILL", "QUAD KILL", "RAMPAGE", "UNSTOPPABLE", "GODLIKE"];

function onKill(killer, victim) {
  mode.onKill(killer, victim);
  pushKill(killer.name || "Bot", victim.name || "Bot", killer === player, victim === player);
  if (killer === player) {
    sounds.kill();
    const now = performance.now() / 1000;
    if (now - lastKillT < 4.5) killStreak++; else killStreak = 1;
    lastKillT = now;
    if (STREAK_LABELS[killStreak]) showStreak(STREAK_LABELS[killStreak]);
  }
  if (victim === player) { sounds.death(); onPlayerDied(); killStreak = 0; }
  else if (!mode || mode.constructor.name !== "BRMode") {
    victim.respawnAt = performance.now() / 1000 + 2.5;
  }
}
function onPlayerDied() {
  player.respawnAt = performance.now() / 1000 + (mode.constructor.name === "BRMode" ? Infinity : 2.5);
}
function respawnPlayer() {
  player.reset(world.pickSpawn([player.position, ...bots.map(b => b.position)], 25));
}

function showStreak(label) {
  const el = document.getElementById("streak");
  el.textContent = label;
  el.classList.remove("hidden");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add("hidden"), 1600);
}

function showDamageDir(srcPos) {
  damageDirs.push({ pos: srcPos.clone(), t: 1.2, elm: null });
}
function updateDamageDirArrows(dt) {
  const wrap = document.getElementById("dmg-dirs");
  if (!wrap) return;
  for (let i = damageDirs.length - 1; i >= 0; i--) {
    const d = damageDirs[i];
    d.t -= dt;
    if (d.t <= 0) {
      if (d.elm) d.elm.remove();
      damageDirs.splice(i, 1);
      continue;
    }
    if (!d.elm) {
      d.elm = document.createElement("div");
      d.elm.className = "dmg-arrow";
      wrap.append(d.elm);
    }
    // Angle from player view to damage source on horizontal plane.
    const dx = d.pos.x - player.position.x;
    const dz = d.pos.z - player.position.z;
    const ang = Math.atan2(dx, -dz) - player.yaw;
    d.elm.style.transform = `rotate(${ang}rad)`;
  }
}

function makeZoneMesh() {
  const ringG = new THREE.RingGeometry(0.985, 1, 64);
  ringG.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xf2c94c, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
  const fg = new THREE.CircleGeometry(1, 48);
  fg.rotateX(-Math.PI / 2);
  const fill = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0x56cc8b, transparent: true, opacity: 0.05, side: THREE.DoubleSide }));
  fill.position.y = -0.02;
  const grp = new THREE.Group();
  grp.add(ring); grp.add(fill);
  grp.userData.noRay = true; ring.userData.noRay = true; fill.userData.noRay = true;
  return grp;
}

function buildHudState() {
  return {
    player, weapon,
    entities: bots.concat([...remotePlayers.values()].map(r => r._proxy)),
    teams: mode?.scoreboardTeams?.(),
    zone: mode?.zoneInfo?.(),
  };
}

// ─── Networking ─────────────────────────────────────────────
function ensureRemotePlayer(id) {
  if (remotePlayers.has(id)) return;
  // Spawn a generic bean for the remote until first state message arrives.
  const skin = BEAN_SKINS[0];
  const g = buildBean(skin);
  g.traverse((m) => { m.castShadow = true; m.userData.remoteId = id; });
  scene.add(g);
  remotePlayers.set(id, {
    group: g, target: g.position.clone(), yaw: 0, beanId: skin.id,
    _proxy: { name: "Remote", team: "remote", isBot: false, alive: true, kills: 0, deaths: 0, score: 0, position: g.position },
  });
}

function setRemoteBean(r, beanId) {
  if (r.beanId === beanId) return;
  const skin = BEAN_SKINS.find(b => b.id === beanId) || BEAN_SKINS[0];
  const oldPos = r.group.position.clone();
  scene.remove(r.group);
  r.group = buildBean(skin);
  r.group.position.copy(oldPos);
  r.group.traverse((m) => { m.castShadow = true; });
  scene.add(r.group);
  r.beanId = beanId;
}

function handleNetMessage(peerId, msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.t === "matchstart") {
    // Host triggered the match. Start ours with their config.
    if (!api.inMatch) startMatch(msg.cfg);
    return;
  }
  if (msg.t === "state") {
    let r = remotePlayers.get(peerId);
    if (!r) { ensureRemotePlayer(peerId); r = remotePlayers.get(peerId); }
    if (msg.bean && msg.bean !== r.beanId) setRemoteBean(r, msg.bean);
    r.target.set(msg.x, msg.y - 0.85, msg.z);
    r.yaw = msg.yw || 0;
    r._proxy.name = msg.n || "Remote";
    r._proxy.team = msg.team || "remote";
    r._proxy.alive = !!msg.alive;
    r._proxy.position.copy(r.target);
    const moving = msg.move !== false;
    animateBean(r.group, moving, 6);
  } else if (msg.t === "shot") {
    fx?.tracer(new THREE.Vector3(msg.x, msg.y, msg.z), new THREE.Vector3(msg.ex, msg.ey, msg.ez), 0xffe28a);
  } else if (msg.t === "build") {
    build?.place(msg.kind, msg.mat, new THREE.Vector3(msg.x, msg.y, msg.z), msg.ry || 0, true);
  } else if (msg.t === "hit") {
    if (msg.victim === "me") {
      const dead = player.takeDamage(msg.dmg, msg.from);
      hud?.flashDamage();
      if (dead) onPlayerDied();
    }
  }
}

function showEnd() {
  // Coins awarded here, not on teardown (so the toast appears with the end screen).
  if (player && !player._awarded) {
    const won = mode.winner === player || (mode.winner && mode.winner.team === player.team);
    const earned = awardMatch({ kills: player.kills, won: !!won });
    if (earned) toast(`+${earned} coins`);
    player._awarded = true;
  }
  running = false;
  inMatch = false; api.inMatch = false;
  input.exitLock();
  const t = document.getElementById("end-title");
  const stats = document.getElementById("end-stats");
  const rows = document.getElementById("end-rows");
  const youWon = (mode.winner === player) || (mode.winner && mode.winner.team === player.team);
  t.textContent = youWon ? "VICTORY" : (mode.winner ? "DEFEAT" : "DRAW");
  t.classList.toggle("win", youWon); t.classList.toggle("lose", !youWon);
  stats.textContent = `Kills: ${player.kills} · Deaths: ${player.deaths} · Score: ${player.score|0} · Coins: ${economy.coins}`;
  const all = [player, ...bots, ...[...remotePlayers.values()].map(r => r._proxy)];
  all.sort((a,b) => b.kills - a.kills);
  rows.innerHTML = all.map((p, i) =>
    `<div class="sb-row ${p === player ? "you" : ""}"><span>${i+1}</span><span>${p.name}${p.isBot ? " (BOT)" : ""}</span><span>${p.kills}</span><span>${p.deaths}</span><span>${p.score|0}</span></div>`
  ).join("");
  showScreen("endscreen");
  refreshShop();
}
