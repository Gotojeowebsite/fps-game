// World generation. Driven by a map preset.
import * as THREE from "three";
import { mapById } from "./maps.js";

export const WORLD_SIZE = 220;
export const HALF = WORLD_SIZE / 2;

function randIn(min, max) { return min + Math.random() * (max - min); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

export class World {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.opts = { shadows: true, mapId: "outpost", ...opts };
    this.map = mapById(this.opts.mapId);

    this.harvestables = [];
    this.colliders = [];
    this.spawnPoints = [];

    this._buildSky();
    this._buildGround();
    this._buildProps();
    this._buildSpawns();
  }

  _buildSky() {
    this.scene.background = new THREE.Color(this.map.sky);
    this.scene.fog = new THREE.Fog(this.map.fogColor, this.map.fogNear, this.map.fogFar);

    const sun = new THREE.DirectionalLight(this.map.sun, 1.1);
    sun.position.set(40, 80, 30);
    if (this.opts.shadows) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 1; sun.shadow.camera.far = 220;
      const d = 80;
      sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
      sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0005;
    }
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(this.map.hemi.sky, this.map.hemi.ground, this.map.hemi.intensity));

    const cloudGeo = new THREE.IcosahedronGeometry(6, 0);
    const cloudMat = new THREE.MeshBasicMaterial({ color: this.map.cloudColor, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 18; i++) {
      const c = new THREE.Mesh(cloudGeo, cloudMat);
      c.position.set(randIn(-HALF, HALF), randIn(70, 110), randIn(-HALF, HALF));
      c.scale.set(randIn(1, 2.4), randIn(0.4, 0.7), randIn(1, 2.4));
      this.scene.add(c);
    }
  }

  _buildGround() {
    const seg = 64;
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const edgeFalloff = clamp((HALF - 8 - r) / HALF, 0, 1);
      const y =
        Math.sin(x * 0.04) * Math.cos(z * 0.035) * 1.2 +
        Math.sin(x * 0.013 + 1.4) * 0.8 +
        Math.cos(z * 0.018) * 0.6;
      pos.setY(i, y * edgeFalloff * (this.opts.mapId === "downtown" ? 0.2 : 1));
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: this.map.ground }));
    ground.receiveShadow = !!this.opts.shadows;
    ground.name = "ground";
    this.scene.add(ground);

    const wallH = 6;
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x3a4a52 });
    for (const [w, h, d, x, z] of [
      [WORLD_SIZE, wallH, 1, 0,  HALF],
      [WORLD_SIZE, wallH, 1, 0, -HALF],
      [1, wallH, WORLD_SIZE,  HALF, 0],
      [1, wallH, WORLD_SIZE, -HALF, 0],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, wallH / 2 - 0.5, z);
      this.scene.add(m);
      this.colliders.push({
        min: new THREE.Vector3(x - w/2, -1, z - d/2),
        max: new THREE.Vector3(x + w/2, wallH, z + d/2),
      });
    }
  }

  _buildProps() {
    const map = this.map;

    // Trees / cacti / pines.
    const trunkMat = new THREE.MeshLambertMaterial({ color: map.trees.trunk });
    for (let i = 0; i < map.trees.count; i++) {
      const x = randIn(-HALF + 10, HALF - 10);
      const z = randIn(-HALF + 10, HALF - 10);
      if (Math.hypot(x, z) < 12) continue;
      const leafColor = map.trees.leaves[Math.floor(Math.random() * map.trees.leaves.length)];
      const leafMat = new THREE.MeshLambertMaterial({ color: leafColor });
      const parts = [];
      if (map.trees.shape === "pine") {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.40, 2.4, 6), trunkMat);
        trunk.position.set(x, 1.2, z); trunk.castShadow = !!this.opts.shadows; parts.push(trunk); this.scene.add(trunk);
        for (let s = 0; s < 3; s++) {
          const r = 1.6 - s * 0.35;
          const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 1.6, 8), leafMat);
          cone.position.set(x, 2.4 + s * 1.0, z);
          cone.castShadow = !!this.opts.shadows;
          this.scene.add(cone); parts.push(cone);
        }
      } else if (map.trees.shape === "cactus") {
        const main = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.2, 8), leafMat);
        main.position.set(x, 1.1, z); main.castShadow = !!this.opts.shadows;
        this.scene.add(main); parts.push(main);
        if (Math.random() > 0.4) {
          const armR = Math.random() > 0.5 ? 0.6 : -0.6;
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 7), leafMat);
          arm.position.set(x + armR, 1.6, z); arm.castShadow = !!this.opts.shadows;
          this.scene.add(arm); parts.push(arm);
          const up = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.6, 7), leafMat);
          up.position.set(x + armR, 2.0, z); up.castShadow = !!this.opts.shadows;
          this.scene.add(up); parts.push(up);
        }
      } else {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3, 6), trunkMat);
        trunk.position.set(x, 1.5, z); trunk.castShadow = !!this.opts.shadows;
        this.scene.add(trunk); parts.push(trunk);
        const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), leafMat);
        top.position.set(x, 3.8, z);
        top.scale.setScalar(randIn(0.9, 1.4));
        top.castShadow = !!this.opts.shadows;
        this.scene.add(top); parts.push(top);
      }
      this._registerHarvest(parts[0], "wood", 60, parts);
      this.colliders.push(this._aabb({ x, y: 1.5, z }, 0.8, 3, 0.8));
    }

    // Rocks.
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshLambertMaterial({ color: map.rocks });
    for (let i = 0; i < map.rockCount; i++) {
      const x = randIn(-HALF + 6, HALF - 6);
      const z = randIn(-HALF + 6, HALF - 6);
      if (Math.hypot(x, z) < 10) continue;
      const r = new THREE.Mesh(rockGeo, rockMat);
      r.position.set(x, 0.6, z);
      r.scale.set(randIn(0.6, 1.4), randIn(0.5, 1.1), randIn(0.6, 1.4));
      r.rotation.y = Math.random() * Math.PI;
      r.castShadow = !!this.opts.shadows;
      this.scene.add(r);
      this._registerHarvest(r, "stone", 80, [r]);
      this.colliders.push(this._aabb(r.position, 1.5 * r.scale.x, 2 * r.scale.y, 1.5 * r.scale.z));
    }

    // Crates.
    const crateGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const crateMat = new THREE.MeshLambertMaterial({ color: map.crates });
    for (let c = 0; c < map.crateCount; c++) {
      const cx = randIn(-HALF + 14, HALF - 14);
      const cz = randIn(-HALF + 14, HALF - 14);
      const stack = 1 + Math.floor(Math.random() * 3);
      for (let s = 0; s < stack; s++) {
        const cr = new THREE.Mesh(crateGeo, crateMat);
        cr.position.set(cx + randIn(-0.4, 0.4), 0.6 + s * 1.21, cz + randIn(-0.4, 0.4));
        cr.castShadow = !!this.opts.shadows;
        cr.rotation.y = randIn(-0.2, 0.2);
        this.scene.add(cr);
        this._registerHarvest(cr, "wood", 40, [cr]);
        this.colliders.push(this._aabb(cr.position, 1.2, 1.2, 1.2));
      }
    }

    // Barrels.
    const barGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.4, 12);
    const barMat = new THREE.MeshLambertMaterial({ color: map.barrels });
    for (let i = 0; i < map.barrelCount; i++) {
      const x = randIn(-HALF + 8, HALF - 8);
      const z = randIn(-HALF + 8, HALF - 8);
      const b = new THREE.Mesh(barGeo, barMat);
      b.position.set(x, 0.7, z); b.castShadow = !!this.opts.shadows;
      this.scene.add(b);
      this._registerHarvest(b, "metal", 100, [b]);
      this.colliders.push(this._aabb(b.position, 1.1, 1.4, 1.1));
    }

    // Buildings (downtown gets a grid).
    if (this.opts.mapId === "downtown") {
      const grid = 4;
      for (let i = -grid; i <= grid; i += 2) {
        for (let j = -grid; j <= grid; j += 2) {
          this._building(i * 18, j * 18);
        }
      }
    } else {
      for (let i = 0; i < map.buildings; i++) {
        this._building(randIn(-HALF + 20, HALF - 20), randIn(-HALF + 20, HALF - 20));
      }
    }
  }

  _building(x, z) {
    const w = randIn(6, 10), d = randIn(6, 10), h = randIn(3.5, 5.5);
    const wallMat = new THREE.MeshLambertMaterial({ color: this.map.buildingWall });
    const roofMat = new THREE.MeshLambertMaterial({ color: this.map.buildingRoof });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), wallMat);
    floor.position.set(x, 0.2, z);
    floor.receiveShadow = !!this.opts.shadows;
    this.scene.add(floor);
    const wallT = 0.3;
    const sides = [
      { w: w, h: h, d: wallT, x: x, y: h/2, z: z + d/2 },
      { w: wallT, h: h, d: d, x: x - w/2, y: h/2, z: z },
      { w: wallT, h: h, d: d, x: x + w/2, y: h/2, z: z },
    ];
    const doorW = 1.6;
    const segL = (w - doorW) / 2;
    sides.push({ w: segL, h: h, d: wallT, x: x - (w/2 - segL/2), y: h/2, z: z - d/2 });
    sides.push({ w: segL, h: h, d: wallT, x: x + (w/2 - segL/2), y: h/2, z: z - d/2 });
    sides.push({ w: doorW, h: h * 0.25, d: wallT, x, y: h - h*0.125, z: z - d/2 });

    for (const s of sides) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), wallMat);
      m.position.set(s.x, s.y, s.z);
      m.castShadow = !!this.opts.shadows;
      m.receiveShadow = !!this.opts.shadows;
      this.scene.add(m);
      this.colliders.push(this._aabb(m.position, s.w, s.h, s.d));
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), roofMat);
    roof.position.set(x, h + 0.15, z);
    roof.castShadow = !!this.opts.shadows;
    this.scene.add(roof);
    this.colliders.push(this._aabb(roof.position, w + 0.6, 0.3, d + 0.6));
  }

  _buildSpawns() {
    const N = 24, r = HALF - 18;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2;
      this.spawnPoints.push(new THREE.Vector3(Math.cos(ang) * r * randIn(0.4, 1), 1.6, Math.sin(ang) * r * randIn(0.4, 1)));
    }
  }

  _registerHarvest(root, kind, hp, meshes) {
    this.harvestables.push({ root, kind, hp, meshes });
    for (const m of meshes) m.userData.harvestIdx = this.harvestables.length - 1;
  }

  _aabb(pos, w, h, d) {
    return {
      min: new THREE.Vector3(pos.x - w/2, pos.y - h/2, pos.z - d/2),
      max: new THREE.Vector3(pos.x + w/2, pos.y + h/2, pos.z + d/2),
    };
  }

  damageHarvest(idx, dmg) {
    const h = this.harvestables[idx];
    if (!h) return null;
    h.hp -= dmg;
    if (h.hp <= 0) {
      for (const m of h.meshes) this.scene.remove(m);
      this.harvestables[idx] = null;
      return { kind: h.kind, amount: 10 + Math.floor(Math.random() * 8) };
    }
    return { kind: h.kind, amount: 3 + Math.floor(Math.random() * 4) };
  }

  pickSpawn(awayFrom = [], minDist = 25) {
    let best = this.spawnPoints[0], bestD = -1;
    for (const sp of this.spawnPoints) {
      let d = Infinity;
      for (const o of awayFrom) {
        if (!o) continue;
        const dd = sp.distanceToSquared(o);
        if (dd < d) d = dd;
      }
      if (d > bestD) { bestD = d; best = sp; }
    }
    return best.clone();
  }
}
