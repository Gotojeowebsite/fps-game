// Gun charm with simple verlet-pendulum physics. The string is constrained to
// a fixed length from the gun's charmAnchor; the charm dangles + swings as
// the player moves the camera/gun.
import * as THREE from "three";

function buildCharmGeometry(kind, color, glow) {
  const mat = new THREE.MeshLambertMaterial({
    color,
    emissive: glow || 0,
    emissiveIntensity: glow ? 0.6 : 0,
  });
  const g = new THREE.Group();
  switch (kind) {
    case "cube":
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), mat));
      break;
    case "skull": {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.10), mat);
      g.add(head);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x101010 });
      for (const x of [-0.025, 0.025]) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.01), eyeMat);
        e.position.set(x, 0.01, 0.052);
        g.add(e);
      }
      break;
    }
    case "star": {
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), mat);
        const ang = (i / 5) * Math.PI * 2;
        sp.position.set(Math.cos(ang) * 0.04, Math.sin(ang) * 0.04, 0);
        sp.rotation.z = ang - Math.PI / 2;
        g.add(sp);
      }
      break;
    }
    case "diamond": {
      const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), mat);
      g.add(d);
      break;
    }
    case "heart": {
      const lobeGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const l = new THREE.Mesh(lobeGeo, mat); l.position.set(-0.025, 0.02, 0);
      const r = new THREE.Mesh(lobeGeo, mat); r.position.set(0.025, 0.02, 0);
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), mat);
      t.rotation.x = Math.PI; t.position.set(0, -0.04, 0);
      g.add(l, r, t);
      break;
    }
    case "orb": {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), mat));
      break;
    }
    case "crown": {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), mat);
      g.add(ring);
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 4), mat);
        const ang = (i / 5) * Math.PI * 2;
        sp.position.set(Math.cos(ang) * 0.05, 0.04, Math.sin(ang) * 0.05);
        g.add(sp);
      }
      break;
    }
    case "fang": {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14, 6), mat);
      g.add(fang);
      break;
    }
    default:
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), mat));
  }
  // Tiny ring at top (attachment point).
  const ringMat = new THREE.MeshLambertMaterial({ color: 0xb0b0b0 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 6, 12), ringMat);
  ring.position.y = 0.07;
  g.add(ring);
  return g;
}

export class GunCharm {
  constructor(scene, charmAnchor, def) {
    this.scene = scene;
    this.anchor = charmAnchor; // THREE.Object3D on the weapon
    this.length = 0.18;        // string length
    this.bobLen = 0.07;
    this.color = def.color; this.glow = def.glow;

    this.mesh = buildCharmGeometry(def.kind, def.color, def.glow);
    this.mesh.traverse((o) => { o.userData.noRay = true; });
    scene.add(this.mesh);

    // String — a thin line.
    const lineMat = new THREE.LineBasicMaterial({ color: 0xb0b0b0, transparent: true, opacity: 0.85 });
    this.lineGeo = new THREE.BufferGeometry();
    this.lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    this.line = new THREE.Line(this.lineGeo, lineMat);
    this.line.userData.noRay = true;
    scene.add(this.line);

    // Verlet state in WORLD space.
    this.curr = new THREE.Vector3();
    this.prev = new THREE.Vector3();
    this.initialised = false;
  }

  remove() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.line);
    this.lineGeo.dispose();
    this.mesh.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  }

  update(dt) {
    if (!this.anchor) return;
    this.anchor.updateWorldMatrix(true, false);
    const aw = new THREE.Vector3();
    this.anchor.getWorldPosition(aw);

    if (!this.initialised) {
      this.curr.copy(aw); this.curr.y -= this.length;
      this.prev.copy(this.curr);
      this.initialised = true;
    }

    // Verlet integrate.
    const vel = this.curr.clone().sub(this.prev);
    vel.multiplyScalar(0.88); // damping
    this.prev.copy(this.curr);
    this.curr.add(vel);
    // Gravity.
    this.curr.y -= 9.8 * dt * dt * 60; // dt*dt scaled

    // Constrain to fixed length from anchor.
    const delta = this.curr.clone().sub(aw);
    const dist = delta.length() || 1;
    delta.multiplyScalar((dist - this.length) / dist);
    this.curr.sub(delta);

    // Update visuals.
    this.mesh.position.copy(this.curr);
    // Orient mesh so it swings nicely (up vector ≈ towards anchor).
    const up = aw.clone().sub(this.curr).normalize();
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), up, new THREE.Vector3(0, 0, 1));
    this.mesh.quaternion.setFromRotationMatrix(m);
    this.mesh.rotateX(Math.PI / 2); // align cone-up etc.

    // Update string.
    const arr = this.lineGeo.attributes.position.array;
    arr[0] = aw.x; arr[1] = aw.y; arr[2] = aw.z;
    arr[3] = this.curr.x; arr[4] = this.curr.y; arr[5] = this.curr.z;
    this.lineGeo.attributes.position.needsUpdate = true;
  }
}
