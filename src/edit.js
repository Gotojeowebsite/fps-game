// Fortnite-style edit mode for placed structures.
// While aiming at a placed wall/floor/ramp, hold the edit key (G) to enter
// edit mode: a 3x3 grid overlays the structure. Click squares to toggle,
// release the key (or press E) to apply. The structure remains in the grid
// of full tiles; toggled-out tiles become open (deletes that sub-piece).
//
// Implementation: we don't sub-divide BoxGeometry. Instead each editable
// structure carries a 3x3 boolean mask. When edited, we rebuild the mesh
// from a set of small box panels for each enabled cell. Defaults to all 9
// cells enabled (looks identical to original wall/floor).

import * as THREE from "three";
import { STRUCT } from "./building.js";

const CELL = 4 / 3; // wall/floor/ramp are 4x4; split into 3x3 cells

function buildEditedMesh(rec) {
  const mat = rec.mesh.material;
  const group = new THREE.Group();
  const t = 0.2; // thickness
  if (rec.kind === STRUCT.WALL) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (!rec.editMask[r][c]) continue;
        const m = new THREE.Mesh(new THREE.BoxGeometry(CELL, CELL, t), mat);
        m.position.set((c - 1) * CELL, (1 - r) * CELL, 0);
        m.castShadow = true; m.receiveShadow = true;
        group.add(m);
      }
    }
  } else if (rec.kind === STRUCT.FLOOR) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (!rec.editMask[r][c]) continue;
        const m = new THREE.Mesh(new THREE.BoxGeometry(CELL, t, CELL), mat);
        m.position.set((c - 1) * CELL, 0, (r - 1) * CELL);
        m.castShadow = true; m.receiveShadow = true;
        group.add(m);
      }
    }
  } else {
    // Ramp: simplest = keep central column only when middle col enabled, etc.
    // For ramp we just use original mesh (no edit).
    return rec.mesh;
  }
  return group;
}

export class EditMode {
  constructor(scene, build, camera) {
    this.scene = scene;
    this.build = build;
    this.camera = camera;

    this.active = false;
    this.target = null;        // structure rec
    this.preview = null;       // 3x3 wireframe group attached to target
    this.localMask = null;     // 3x3 boolean
  }

  enter() {
    // Raycast from camera ~5m to find a structure
    const ray = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    ray.set(origin, dir);
    ray.far = 6;
    const hits = ray.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      if (h.object.userData?.noRay) continue;
      const rec = this._recForObject(h.object);
      if (rec) { this._begin(rec); return true; }
    }
    return false;
  }

  _recForObject(obj) {
    // Walk up to find a structure record
    while (obj) {
      const rec = this.build.structures.find(s => s && (s.mesh === obj || (s.mesh.children && s.mesh.children.includes(obj))));
      if (rec) return rec;
      obj = obj.parent;
    }
    return null;
  }

  _begin(rec) {
    if (rec.kind === STRUCT.RAMP) return; // ramps not editable
    this.active = true;
    this.target = rec;
    if (!rec.editMask) rec.editMask = [[1,1,1],[1,1,1],[1,1,1]];
    this.localMask = rec.editMask.map(r => r.slice());

    // Build wireframe preview parented to original mesh.
    const grp = new THREE.Group();
    grp.userData.noRay = true;
    const isWall = rec.kind === STRUCT.WALL;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const geo = isWall
          ? new THREE.BoxGeometry(CELL * 0.92, CELL * 0.92, 0.05)
          : new THREE.BoxGeometry(CELL * 0.92, 0.05, CELL * 0.92);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
          color: this.localMask[r][c] ? 0x56cc8b : 0xe85a4f,
          transparent: true, opacity: 0.55, depthTest: false,
        }));
        m.userData.noRay = true;
        m.userData.editCell = { r, c };
        if (isWall) m.position.set((c - 1) * CELL, (1 - r) * CELL, 0.18);
        else m.position.set((c - 1) * CELL, 0.18, (r - 1) * CELL);
        grp.add(m);
      }
    }
    rec.mesh.add(grp);
    this.preview = grp;
  }

  click() {
    if (!this.active || !this.target) return;
    // Raycast from camera to preview cells.
    const ray = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    ray.set(origin, dir);
    const hits = ray.intersectObjects(this.preview.children, false);
    for (const h of hits) {
      const cell = h.object.userData.editCell;
      if (!cell) continue;
      const cur = this.localMask[cell.r][cell.c];
      this.localMask[cell.r][cell.c] = cur ? 0 : 1;
      h.object.material.color.setHex(cur ? 0xe85a4f : 0x56cc8b);
      return;
    }
  }

  apply() {
    if (!this.active || !this.target) return this.cancel();
    const rec = this.target;
    // Remove preview.
    rec.mesh.remove(this.preview);
    // Replace mesh with edited mesh.
    if (rec.kind !== STRUCT.RAMP) {
      const old = rec.mesh;
      const pos = old.position.clone();
      const rot = old.rotation.y;
      rec.editMask = this.localMask;
      // Build new mesh from mask.
      const fresh = buildEditedMesh(rec);
      fresh.position.copy(pos);
      fresh.rotation.y = rot;
      this.scene.add(fresh);
      this.scene.remove(old);
      rec.mesh = fresh;
      // If all cells removed → delete the structure entirely.
      const anyAlive = this.localMask.some(r => r.some(v => v));
      if (!anyAlive) {
        this.scene.remove(fresh);
        this.build.byKey.delete(rec.key);
        const i = this.build.structures.indexOf(rec);
        if (i !== -1) this.build.structures[i] = null;
        this.build._rebuildColliders();
      }
    }
    this._reset();
  }

  cancel() {
    if (this.preview && this.target) {
      this.target.mesh.remove(this.preview);
    }
    this._reset();
  }

  _reset() {
    this.active = false;
    this.target = null;
    this.preview = null;
    this.localMask = null;
  }
}
