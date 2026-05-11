// Bean character builder. Customisable colour, eye, hat.
// Used for both bots and remote players.
import * as THREE from "three";

// Build a low-poly bean character. Returns a Group, anchored at feet (y=0).
export function buildBean(skin = { body: 0xf2c94c, eye: 0x101010, hat: null, glow: null }) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({
    color: skin.body,
    emissive: skin.glow || 0,
    emissiveIntensity: skin.glow ? 0.4 : 0,
  });

  // Bean body: a capsule built from cylinder + 2 spheres.
  const r = 0.55, h = 1.05;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), bodyMat);
  trunk.position.y = 0.6 + h / 2;
  g.add(trunk);
  const top = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
  top.position.y = 0.6 + h;
  g.add(top);
  const bot = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bodyMat);
  bot.position.y = 0.6;
  g.add(bot);

  // Eyes (front-facing). Whites + pupils.
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: skin.eye });
  const eyeFwdZ = -r * 0.95;
  const eyeY = 0.6 + h * 0.75;
  for (const x of [-0.18, 0.18]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), eyeMat);
    w.position.set(x, eyeY, eyeFwdZ);
    g.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), pupilMat);
    p.position.set(x, eyeY, eyeFwdZ - 0.07);
    g.add(p);
  }

  // Tiny stub legs (visible at the bottom for walk animation).
  const legMat = new THREE.MeshLambertMaterial({ color: 0x202428 });
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.32, 8), legMat);
  legL.position.set(-0.22, 0.16, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.22;
  g.add(legR);

  // Arms (also visible). Aligned slightly forward to hold gun.
  const armMat = bodyMat;
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 8), armMat);
  armL.position.set(-r - 0.08, 0.6 + h * 0.6, 0.05);
  armL.rotation.x = -0.4;
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = r + 0.08;
  g.add(armR);

  // Hat / accessory.
  let hatGroup = null;
  if (skin.hat) hatGroup = buildHat(skin.hat, skin);
  if (hatGroup) {
    hatGroup.position.set(0, 0.6 + h + r * 0.4, 0);
    g.add(hatGroup);
  }

  // Tiny rifle held by arms (placeholder; real held weapon comes from active weapon model).
  // We don't add a held weapon here for remote players (kept lightweight).

  g.userData = { legL, legR, armL, armR, hatGroup, bodyParts: [trunk, top, bot] };
  return g;
}

function buildHat(kind, skin) {
  const g = new THREE.Group();
  switch (kind) {
    case "helmet": {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0x4a5a40 }));
      g.add(h);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 16),
        new THREE.MeshLambertMaterial({ color: 0x303838 }));
      strap.rotation.x = Math.PI / 2;
      g.add(strap);
      break;
    }
    case "cap": {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 12),
        new THREE.MeshLambertMaterial({ color: 0x405a30 }));
      top.position.y = 0.09;
      g.add(top);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.4),
        new THREE.MeshLambertMaterial({ color: 0x405a30 }));
      brim.position.set(0, 0.02, -0.30);
      g.add(brim);
      break;
    }
    case "leaf": {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 6),
        new THREE.MeshLambertMaterial({ color: 0x40a040 }));
      leaf.position.y = 0.35;
      leaf.rotation.x = -0.3;
      g.add(leaf);
      break;
    }
    case "antenna": {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6),
        new THREE.MeshLambertMaterial({ color: 0x808080 }));
      stalk.position.y = 0.22;
      g.add(stalk);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 0.7 }));
      ball.position.y = 0.48;
      g.add(ball);
      break;
    }
    case "pirate": {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 12),
        new THREE.MeshLambertMaterial({ color: 0x101010 }));
      top.position.y = 0.10;
      g.add(top);
      const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.04, 0.2),
        new THREE.MeshLambertMaterial({ color: 0x101010 }));
      wing1.position.y = 0.04;
      g.add(wing1);
      const skull = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.04),
        new THREE.MeshLambertMaterial({ color: 0xffffff }));
      skull.position.set(0, 0.18, -0.35);
      g.add(skull);
      break;
    }
    case "mask": {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 0.05),
        new THREE.MeshLambertMaterial({ color: 0x101010 }));
      m.position.set(0, -0.36, -0.55);
      g.add(m);
      break;
    }
    case "star": {
      // Spiky star
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4),
          new THREE.MeshLambertMaterial({ color: skin.glow || 0xffd060, emissive: skin.glow || 0xffd060, emissiveIntensity: 0.6 }));
        sp.position.y = 0.18;
        sp.rotation.z = (i / 5) * Math.PI * 2;
        sp.position.x = Math.sin(sp.rotation.z) * 0.12;
        sp.position.y += Math.cos(sp.rotation.z) * 0.12;
        g.add(sp);
      }
      break;
    }
    case "crown": {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16),
        new THREE.MeshLambertMaterial({ color: 0xffd060, emissive: 0xc0a040, emissiveIntensity: 0.4 }));
      ring.position.y = 0.08;
      g.add(ring);
      for (let i = 0; i < 6; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4),
          new THREE.MeshLambertMaterial({ color: 0xffd060 }));
        const ang = (i / 6) * Math.PI * 2;
        sp.position.set(Math.cos(ang) * 0.32, 0.20, Math.sin(ang) * 0.32);
        g.add(sp);
      }
      break;
    }
    case "horn": {
      for (const x of [-0.18, 0.18]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6),
          new THREE.MeshLambertMaterial({ color: 0x303030 }));
        horn.position.set(x, 0.22, 0);
        horn.rotation.z = x > 0 ? -0.4 : 0.4;
        g.add(horn);
      }
      break;
    }
  }
  return g;
}

// Animate walking: simple leg/arm sway when moving.
export function animateBean(bean, isMoving, walkSpeed = 6) {
  const ud = bean.userData;
  if (!ud) return;
  if (isMoving) {
    const phase = performance.now() / 1000 * walkSpeed;
    if (ud.legL) ud.legL.rotation.x = Math.sin(phase) * 0.6;
    if (ud.legR) ud.legR.rotation.x = -Math.sin(phase) * 0.6;
    if (ud.armL) ud.armL.rotation.x = -0.4 + Math.sin(phase) * 0.3;
    if (ud.armR) ud.armR.rotation.x = -0.4 - Math.sin(phase) * 0.3;
  } else {
    if (ud.legL) ud.legL.rotation.x *= 0.85;
    if (ud.legR) ud.legR.rotation.x *= 0.85;
    if (ud.armL) ud.armL.rotation.x = ud.armL.rotation.x * 0.85 + (-0.4) * 0.15;
    if (ud.armR) ud.armR.rotation.x = ud.armR.rotation.x * 0.85 + (-0.4) * 0.15;
  }
}
