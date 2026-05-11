// Multi-weapon system: pistol, rifle, sniper, banana.
// Each weapon has stats + a viewmodel builder that accepts a skin definition.
import * as THREE from "three";

export const WEAPONS = {
  pistol: {
    id: "pistol", name: "PISTOL",
    dmg: 18, dmgFalloff: 0.85, rpm: 350, magSize: 14, reserve: 70, reloadT: 1.2,
    spread: 0.022, adsSpread: 0.006, recoilP: 0.022, recoilY: 0.010,
    range: 110, auto: false, scope: false,
  },
  rifle: {
    id: "rifle", name: "RIFLE",
    dmg: 22, dmgFalloff: 0.7, rpm: 600, magSize: 30, reserve: 120, reloadT: 1.8,
    spread: 0.018, adsSpread: 0.004, recoilP: 0.028, recoilY: 0.012,
    range: 220, auto: true, scope: false,
  },
  sniper: {
    id: "sniper", name: "SNIPER",
    dmg: 110, dmgFalloff: 0.3, rpm: 50, magSize: 5, reserve: 25, reloadT: 2.6,
    spread: 0.03, adsSpread: 0.0006, recoilP: 0.10, recoilY: 0.02,
    range: 400, auto: false, scope: true, scopeFov: 18,
  },
  banana: {
    id: "banana", name: "BANANA",
    dmg: 40, dmgFalloff: 0.9, rpm: 240, magSize: 8, reserve: 24, reloadT: 1.5,
    spread: 0.045, adsSpread: 0.025, recoilP: 0.04, recoilY: 0.04,
    range: 60, auto: false, scope: false, projectile: true,
  },
};

// Lightweight viewmodel builders: build a small group of low-poly boxes
// arranged into a weapon. Accepts a skin {body, grip, accent, glow?}.
function buildPistol(skin) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.10, 0.32),
    new THREE.MeshLambertMaterial({ color: skin.body, emissive: skin.glow || 0, emissiveIntensity: skin.glow ? 0.5 : 0 }));
  body.position.set(0.16, -0.18, -0.30);
  g.add(body);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.10),
    new THREE.MeshLambertMaterial({ color: skin.grip }));
  grip.position.set(0.16, -0.30, -0.22);
  g.add(grip);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.05),
    new THREE.MeshLambertMaterial({ color: skin.accent }));
  sight.position.set(0.16, -0.12, -0.28);
  g.add(sight);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.16, -0.18, -0.46);
  g.add(muzzle);
  const charmAnchor = new THREE.Object3D();
  charmAnchor.position.set(0.16, -0.32, -0.20);
  g.add(charmAnchor);
  g.userData = { muzzle, charmAnchor };
  return g;
}

function buildRifle(skin) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.55),
    new THREE.MeshLambertMaterial({ color: skin.body, emissive: skin.glow || 0, emissiveIntensity: skin.glow ? 0.5 : 0 }));
  body.position.set(0.18, -0.18, -0.45);
  g.add(body);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.10),
    new THREE.MeshLambertMaterial({ color: skin.grip }));
  grip.position.set(0.18, -0.30, -0.30);
  g.add(grip);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.20),
    new THREE.MeshLambertMaterial({ color: skin.grip }));
  stock.position.set(0.18, -0.20, -0.10);
  g.add(stock);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.08),
    new THREE.MeshLambertMaterial({ color: skin.accent }));
  mag.position.set(0.18, -0.30, -0.40);
  g.add(mag);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.06),
    new THREE.MeshLambertMaterial({ color: skin.accent }));
  sight.position.set(0.18, -0.10, -0.40);
  g.add(sight);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.18, -0.18, -0.75);
  g.add(muzzle);
  const charmAnchor = new THREE.Object3D();
  charmAnchor.position.set(0.18, -0.30, -0.10);
  g.add(charmAnchor);
  g.userData = { muzzle, charmAnchor };
  return g;
}

function buildSniper(skin) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.80),
    new THREE.MeshLambertMaterial({ color: skin.body, emissive: skin.glow || 0, emissiveIntensity: skin.glow ? 0.5 : 0 }));
  body.position.set(0.18, -0.18, -0.50);
  g.add(body);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.10),
    new THREE.MeshLambertMaterial({ color: skin.grip }));
  grip.position.set(0.18, -0.30, -0.30);
  g.add(grip);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.25),
    new THREE.MeshLambertMaterial({ color: skin.grip }));
  stock.position.set(0.18, -0.20, -0.05);
  g.add(stock);
  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12),
    new THREE.MeshLambertMaterial({ color: 0x101010 }));
  scopeTube.rotation.z = Math.PI / 2;
  scopeTube.position.set(0.18, -0.06, -0.40);
  g.add(scopeTube);
  const scopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 12),
    new THREE.MeshBasicMaterial({ color: skin.accent }));
  scopeLens.position.set(0.18, -0.06, -0.295);
  g.add(scopeLens);
  const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.04),
    new THREE.MeshLambertMaterial({ color: skin.accent }));
  bipod.position.set(0.18, -0.24, -0.78);
  g.add(bipod);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.18, -0.18, -0.95);
  g.add(muzzle);
  const charmAnchor = new THREE.Object3D();
  charmAnchor.position.set(0.18, -0.30, -0.20);
  g.add(charmAnchor);
  g.userData = { muzzle, charmAnchor };
  return g;
}

function buildBanana(skin) {
  const g = new THREE.Group();
  // Curved-ish banana shape from a few rotated boxes / cylinders.
  const seg = new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8);
  const mat = new THREE.MeshLambertMaterial({ color: skin.body, emissive: skin.glow || 0, emissiveIntensity: skin.glow ? 0.5 : 0 });
  const positions = [
    [0.16, -0.20, -0.20, -0.5],
    [0.16, -0.18, -0.30, -0.25],
    [0.16, -0.17, -0.40, 0.0],
    [0.16, -0.18, -0.50, 0.25],
    [0.16, -0.22, -0.58, 0.55],
  ];
  for (const [x, y, z, rot] of positions) {
    const s = new THREE.Mesh(seg, mat);
    s.position.set(x, y, z);
    s.rotation.z = Math.PI / 2 + rot;
    g.add(s);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 6),
    new THREE.MeshLambertMaterial({ color: skin.grip }));
  stem.position.set(0.16, -0.16, -0.18);
  stem.rotation.z = Math.PI / 2 - 0.6;
  g.add(stem);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6),
    new THREE.MeshLambertMaterial({ color: skin.accent }));
  tip.position.set(0.16, -0.25, -0.62);
  g.add(tip);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0.16, -0.25, -0.70);
  g.add(muzzle);
  const charmAnchor = new THREE.Object3D();
  charmAnchor.position.set(0.16, -0.22, -0.16);
  g.add(charmAnchor);
  g.userData = { muzzle, charmAnchor };
  return g;
}

const BUILDERS = { pistol: buildPistol, rifle: buildRifle, sniper: buildSniper, banana: buildBanana };

export class Weapon {
  constructor(scene, camera, defId, skin) {
    this.scene = scene;
    this.camera = camera;
    this.def = WEAPONS[defId];
    this.skin = skin;
    this.mag = this.def.magSize;
    this.reserve = this.def.reserve;
    this.lastShotT = -1;
    this.reloading = false;
    this.reloadEnd = 0;

    this.group = BUILDERS[defId](skin);
    this.muzzleAnchor = this.group.userData.muzzle;
    this.charmAnchor = this.group.userData.charmAnchor;

    // Muzzle flash sprite.
    const flashGeo = new THREE.PlaneGeometry(0.35, 0.35);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0, depthWrite: false });
    this.flash = new THREE.Mesh(flashGeo, flashMat);
    this.flash.userData.noRay = true;
    this.muzzleAnchor.add(this.flash);
    this.flashUntil = 0;

    camera.add(this.group);
    this.group.traverse((o) => { o.userData.noRay = true; });

    this.kickT = 0;
  }

  remove() { this.camera.remove(this.group); }

  worldMuzzlePos(out = new THREE.Vector3()) {
    this.muzzleAnchor.updateWorldMatrix(true, false);
    this.muzzleAnchor.getWorldPosition(out);
    return out;
  }

  startReload() {
    if (this.reloading) return;
    if (this.mag >= this.def.magSize) return;
    if (this.reserve <= 0) return;
    this.reloading = true;
    this.reloadEnd = performance.now() / 1000 + this.def.reloadT;
  }

  update(dt, adsT) {
    // ADS offset.
    this.group.position.set(
      adsT * -0.18, adsT * 0.08, adsT * -0.03,
    );
    // Kick decay.
    this.kickT *= Math.pow(0.001, dt);
    this.group.rotation.x = -this.kickT * 0.5;
    this.group.position.z += this.kickT * 0.15;
    // Flash fade.
    const now = performance.now() / 1000;
    const left = this.flashUntil - now;
    this.flash.material.opacity = left > 0 ? Math.min(1, left * 12) * 0.9 : 0;
    if (this.flash.material.opacity > 0) this.flash.rotation.z = Math.random() * Math.PI * 2;
    // Reload finish.
    if (this.reloading && now >= this.reloadEnd) {
      const need = this.def.magSize - this.mag;
      const give = Math.min(need, this.reserve);
      this.mag += give; this.reserve -= give;
      this.reloading = false;
    }
  }

  tryShoot(now, adsing) {
    if (this.reloading) return false;
    if (this.mag <= 0) { this.startReload(); return false; }
    const interval = 60 / this.def.rpm;
    if (now - this.lastShotT < interval) return false;
    this.lastShotT = now;
    this.mag--;
    this.flashUntil = now + 0.06;
    this.kickT = Math.min(1.5, this.kickT + 1);
    return true;
  }

  spread(adsing) { return adsing ? this.def.adsSpread : this.def.spread; }
}

const raycaster = new THREE.Raycaster();

export function raycastShot(scene, origin, dir, ignore = []) {
  raycaster.set(origin, dir.clone().normalize());
  raycaster.far = 400;
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const h of hits) {
    if (ignore.includes(h.object)) continue;
    if (h.object.userData?.noRay) continue;
    return h;
  }
  return null;
}
