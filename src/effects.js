// Particle / tracer effects.
import * as THREE from "three";
import { settings } from "./settings.js";

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  tracer(from, to, color = 0xffe28a) {
    if (!settings.particles) return;
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    line.userData.noRay = true;
    this.scene.add(line);
    this.items.push({ obj: line, life: 0.08, t: 0, fade: true });
  }

  hitSparks(pos, color = 0xffd060) {
    if (!settings.particles) return;
    const N = 6;
    for (let i = 0; i < N; i++) {
      const geo = new THREE.SphereGeometry(0.05, 5, 4);
      const mat = new THREE.MeshBasicMaterial({ color });
      const s = new THREE.Mesh(geo, mat);
      s.position.copy(pos);
      s.userData.noRay = true;
      this.scene.add(s);
      const v = new THREE.Vector3((Math.random()-0.5)*4, Math.random()*3, (Math.random()-0.5)*4);
      this.items.push({ obj: s, life: 0.35, t: 0, vel: v, gravity: -8, fade: true });
    }
  }

  bloodPuff(pos) {
    if (!settings.particles) return;
    const N = 8;
    for (let i = 0; i < N; i++) {
      const geo = new THREE.SphereGeometry(0.07, 6, 5);
      const mat = new THREE.MeshBasicMaterial({ color: 0xc03030, transparent: true, opacity: 0.9 });
      const s = new THREE.Mesh(geo, mat);
      s.position.copy(pos);
      s.userData.noRay = true;
      this.scene.add(s);
      const v = new THREE.Vector3((Math.random()-0.5)*3, Math.random()*2.5, (Math.random()-0.5)*3);
      this.items.push({ obj: s, life: 0.5, t: 0, vel: v, gravity: -6, fade: true });
    }
  }

  placeBurst(pos, color = 0xf2c94c) {
    if (!settings.particles) return;
    for (let i = 0; i < 12; i++) {
      const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const mat = new THREE.MeshBasicMaterial({ color });
      const c = new THREE.Mesh(geo, mat);
      c.position.copy(pos);
      c.userData.noRay = true;
      this.scene.add(c);
      const v = new THREE.Vector3((Math.random()-0.5)*5, 1 + Math.random()*3, (Math.random()-0.5)*5);
      this.items.push({ obj: c, life: 0.5, t: 0, vel: v, gravity: -10, fade: true });
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (it.vel) {
        it.obj.position.addScaledVector(it.vel, dt);
        it.vel.y += (it.gravity || 0) * dt;
      }
      if (it.fade && it.obj.material) {
        const left = 1 - it.t / it.life;
        if (it.obj.material.opacity !== undefined) {
          it.obj.material.transparent = true;
          it.obj.material.opacity = Math.max(0, left);
        }
      }
      if (it.t >= it.life) {
        this.scene.remove(it.obj);
        it.obj.geometry?.dispose?.();
        it.obj.material?.dispose?.();
        this.items.splice(i, 1);
      }
    }
  }
}
