// Fortnite-style building. Grid-snapped walls, floors, ramps.
import * as THREE from "three";

export const STRUCT = { WALL: "wall", FLOOR: "floor", RAMP: "ramp" };
export const MAT_KINDS = ["wood", "stone", "metal"];

const GRID = 4; // 4m cell
const STRUCT_COST = 10;

const COLORS = {
  wood:  { base: 0xc08a4a, ghostOK: 0x9bd47a, ghostBad: 0xe85a4f },
  stone: { base: 0xb6b8bb, ghostOK: 0x9bd47a, ghostBad: 0xe85a4f },
  metal: { base: 0x6ab0e0, ghostOK: 0x9bd47a, ghostBad: 0xe85a4f },
};
const MAX_HP = { wood: 100, stone: 200, metal: 350 };

function structGeo(kind) {
  if (kind === STRUCT.WALL)  return new THREE.BoxGeometry(GRID, GRID, 0.2);
  if (kind === STRUCT.FLOOR) return new THREE.BoxGeometry(GRID, 0.2, GRID);
  if (kind === STRUCT.RAMP) {
    // Triangular prism: build via custom geometry.
    const g = new THREE.BufferGeometry();
    const s = GRID / 2;
    // Vertices (right-triangle prism along +Y rising to +Z)
    const verts = new Float32Array([
      // bottom face (y=0)
      -s, 0, -s,   s, 0, -s,   s, 0,  s,
      -s, 0, -s,   s, 0,  s,  -s, 0,  s,
      // back triangle (z = s, vertical face)
      -s, 0,  s,   s, 0,  s,   s, GRID, s,
      -s, 0,  s,   s, GRID, s, -s, GRID, s,
      // slope (from bottom-front to top-back)
      -s, 0, -s,   s, 0, -s,   s, GRID,  s,
      -s, 0, -s,   s, GRID, s, -s, GRID, s,
      // left side triangle
      -s, 0, -s,  -s, GRID, s,  -s, 0,  s,
      // right side triangle
       s, 0, -s,   s, 0,  s,    s, GRID, s,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return g;
  }
}

export class BuildSystem {
  constructor(scene, world, player, opts = {}) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.onPlace = opts.onPlace || (() => {});

    this.active = false;
    this.kind = STRUCT.WALL;
    this.mat = "wood";
    this.structures = []; // {mesh, kind, mat, hp, max, key, aabb}
    this.byKey = new Map();
    this.colliders = []; // refreshed live

    // Ghost preview
    this.ghost = new THREE.Mesh(structGeo(this.kind), new THREE.MeshBasicMaterial({
      color: COLORS[this.mat].ghostOK, transparent: true, opacity: 0.45, depthWrite: false,
    }));
    this.ghost.userData.noRay = true;
    this.ghost.visible = false;
    scene.add(this.ghost);
  }

  setActive(on) {
    this.active = on;
    this.ghost.visible = on;
  }
  cycleKind(dir) {
    const order = [STRUCT.WALL, STRUCT.FLOOR, STRUCT.RAMP];
    let i = order.indexOf(this.kind);
    i = (i + dir + order.length) % order.length;
    this.kind = order[i];
    this.ghost.geometry.dispose();
    this.ghost.geometry = structGeo(this.kind);
  }
  setMat(m) {
    if (!MAT_KINDS.includes(m)) return;
    this.mat = m;
    this.ghost.material.color.setHex(COLORS[m].ghostOK);
  }

  // Snap world position to nearest grid cell.
  _snap(pos, kind) {
    const x = Math.round(pos.x / GRID) * GRID;
    const z = Math.round(pos.z / GRID) * GRID;
    let y;
    if (kind === STRUCT.FLOOR) {
      y = Math.max(0, Math.round(pos.y / GRID) * GRID);
    } else if (kind === STRUCT.WALL) {
      y = Math.max(GRID/2, Math.round((pos.y - GRID/2) / GRID) * GRID + GRID/2);
    } else { // ramp
      y = Math.max(0, Math.round(pos.y / GRID) * GRID);
    }
    return new THREE.Vector3(x, y, z);
  }

  _key(kind, pos) {
    return `${kind}|${Math.round(pos.x/GRID)}|${Math.round(pos.y/GRID)}|${Math.round(pos.z/GRID)}`;
  }

  // Place visual ghost where player aims.
  updateGhost(camera) {
    if (!this.active) { this.ghost.visible = false; return; }
    // Project forward from camera ~6m and snap.
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const cast = camera.position.clone().add(dir.multiplyScalar(5.5));
    const snapped = this._snap(cast, this.kind);
    this.ghost.position.copy(snapped);
    // Orient wall to face the player (axis-aligned: pick nearest cardinal).
    if (this.kind === STRUCT.WALL) {
      // Decide wall orientation: along X axis or Z axis based on which face we're hitting.
      const rel = new THREE.Vector3().subVectors(snapped, camera.position);
      this.ghost.rotation.y = Math.abs(rel.x) > Math.abs(rel.z) ? Math.PI/2 : 0;
    } else if (this.kind === STRUCT.RAMP) {
      // Face the ramp up-direction towards player look (4 orientations).
      const yaw = Math.atan2(-dir.x, -dir.z);
      const snap = Math.round(yaw / (Math.PI/2)) * (Math.PI/2);
      this.ghost.rotation.y = snap;
    } else {
      this.ghost.rotation.y = 0;
    }

    const key = this._key(this.kind, snapped);
    const occupied = this.byKey.has(key);
    const canAfford = (this.player.materials[this.mat] || 0) >= STRUCT_COST;
    const ok = !occupied && canAfford;
    this.ghost.material.color.setHex(ok ? COLORS[this.mat].ghostOK : COLORS[this.mat].ghostBad);
  }

  tryPlace() {
    if (!this.active) return null;
    const pos = this.ghost.position.clone();
    const key = this._key(this.kind, pos);
    if (this.byKey.has(key)) return null;
    if (!this.player.takeMat(this.mat, STRUCT_COST)) return null;
    return this.place(this.kind, this.mat, pos, this.ghost.rotation.y);
  }

  place(kind, mat, pos, rotY, fromNetwork = false) {
    const key = this._key(kind, pos);
    if (this.byKey.has(key)) return null;
    const mesh = new THREE.Mesh(structGeo(kind), new THREE.MeshLambertMaterial({ color: COLORS[mat].base }));
    mesh.position.copy(pos);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    const aabb = this._aabbFor(kind, pos, rotY);
    const rec = { mesh, kind, mat, hp: MAX_HP[mat], max: MAX_HP[mat], key, aabb };
    this.structures.push(rec);
    this.byKey.set(key, rec);
    this._rebuildColliders();
    if (!fromNetwork) this.onPlace({ kind, mat, x: pos.x, y: pos.y, z: pos.z, ry: rotY });

    // Quick "place" feedback animation.
    mesh.scale.set(1, 0.1, 1);
    const t0 = performance.now();
    const anim = () => {
      const t = Math.min(1, (performance.now() - t0) / 120);
      mesh.scale.set(1, 0.1 + 0.9 * t, 1);
      if (t < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
    return rec;
  }

  _aabbFor(kind, pos, rotY) {
    let w, h, d;
    if (kind === STRUCT.WALL)  { w = GRID; h = GRID; d = 0.4; }
    else if (kind === STRUCT.FLOOR) { w = GRID; h = 0.4; d = GRID; }
    else { w = GRID; h = GRID; d = GRID; }
    if (kind === STRUCT.WALL && Math.abs(Math.sin(rotY)) > 0.5) { const t = w; w = d; d = t; }
    return {
      min: new THREE.Vector3(pos.x - w/2, pos.y - h/2, pos.z - d/2),
      max: new THREE.Vector3(pos.x + w/2, pos.y + h/2, pos.z + d/2),
    };
  }

  _rebuildColliders() {
    this.colliders = this.structures.filter(s => s).map(s => s.aabb);
  }

  damageMesh(mesh, dmg) {
    const rec = this.structures.find(s => s && s.mesh === mesh);
    if (!rec) return false;
    rec.hp -= dmg;
    // Visual feedback: darken slightly
    const ratio = Math.max(0, rec.hp / rec.max);
    rec.mesh.material.color.setHex(COLORS[rec.mat].base);
    rec.mesh.material.color.multiplyScalar(0.5 + 0.5 * ratio);
    if (rec.hp <= 0) {
      this.scene.remove(rec.mesh);
      this.byKey.delete(rec.key);
      const idx = this.structures.indexOf(rec);
      if (idx !== -1) this.structures[idx] = null;
      this._rebuildColliders();
      return true;
    }
    return false;
  }
}
