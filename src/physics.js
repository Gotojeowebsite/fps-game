// Light-weight AABB collision against world.colliders + structures.
import * as THREE from "three";

const tmpMin = new THREE.Vector3();
const tmpMax = new THREE.Vector3();

export function makeCapsule(radius = 0.4, height = 1.8) {
  return { r: radius, h: height };
}

// Test AABB overlap against an array of colliders {min,max}. Resolves XZ first, then Y separately.
export function moveWithCollision(pos, vel, dt, capsule, getColliders) {
  // Move X
  pos.x += vel.x * dt;
  resolveAxis(pos, capsule, getColliders(), 0);
  // Move Z
  pos.z += vel.z * dt;
  resolveAxis(pos, capsule, getColliders(), 2);
  // Move Y
  pos.y += vel.y * dt;
  const onGround = resolveAxis(pos, capsule, getColliders(), 1, vel);
  return onGround;
}

function resolveAxis(pos, cap, colliders, axis, vel = null) {
  const r = cap.r;
  const h = cap.h;
  // capsule AABB approximation
  tmpMin.set(pos.x - r, pos.y - h/2, pos.z - r);
  tmpMax.set(pos.x + r, pos.y + h/2, pos.z + r);
  let landed = false;
  for (const c of colliders) {
    if (!c) continue;
    if (tmpMin.x > c.max.x || tmpMax.x < c.min.x) continue;
    if (tmpMin.y > c.max.y || tmpMax.y < c.min.y) continue;
    if (tmpMin.z > c.max.z || tmpMax.z < c.min.z) continue;
    // Overlap on this axis – push along the chosen axis.
    if (axis === 0) {
      if (pos.x > (c.min.x + c.max.x) / 2) pos.x = c.max.x + r + 0.001;
      else pos.x = c.min.x - r - 0.001;
    } else if (axis === 2) {
      if (pos.z > (c.min.z + c.max.z) / 2) pos.z = c.max.z + r + 0.001;
      else pos.z = c.min.z - r - 0.001;
    } else {
      if (pos.y > (c.min.y + c.max.y) / 2) {
        pos.y = c.max.y + h/2 + 0.001;
        if (vel && vel.y < 0) { vel.y = 0; landed = true; }
      } else {
        pos.y = c.min.y - h/2 - 0.001;
        if (vel && vel.y > 0) vel.y = 0;
      }
    }
    // Refresh
    tmpMin.set(pos.x - r, pos.y - h/2, pos.z - r);
    tmpMax.set(pos.x + r, pos.y + h/2, pos.z + r);
  }
  return landed;
}

// Ground plane check (very simple — terrain hills are sampled by main.js separately).
export function groundY(_x, _z) { return 0; }
