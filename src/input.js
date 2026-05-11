// Centralised input. Tracks keys/buttons + emits action events.
import { settings } from "./settings.js";

export class Input {
  constructor() {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, wheel: 0, left: false, right: false, leftEdge: false, rightEdge: false };
    this.actions = new Set();      // pressed actions (held)
    this.actionEdge = new Set();   // pressed this frame
    this.locked = false;
    this.enabled = true;

    this._onKD = (e) => this._key(e, true);
    this._onKU = (e) => this._key(e, false);
    this._onMD = (e) => this._mouse(e, true);
    this._onMU = (e) => this._mouse(e, false);
    this._onMM = (e) => this._move(e);
    this._onWh = (e) => { if (this.enabled) this.mouse.wheel += Math.sign(e.deltaY); };
    this._onLockChange = () => { this.locked = (document.pointerLockElement !== null); };

    window.addEventListener("keydown", this._onKD);
    window.addEventListener("keyup", this._onKU);
    window.addEventListener("mousedown", this._onMD);
    window.addEventListener("mouseup", this._onMU);
    window.addEventListener("mousemove", this._onMM);
    window.addEventListener("wheel", this._onWh, { passive: true });
    document.addEventListener("pointerlockchange", this._onLockChange);
    window.addEventListener("contextmenu", (e) => { if (this.enabled) e.preventDefault(); });
    window.addEventListener("blur", () => { this.keys.clear(); this.actions.clear(); this.mouse.left = this.mouse.right = false; });
  }

  destroy() {
    window.removeEventListener("keydown", this._onKD);
    window.removeEventListener("keyup", this._onKU);
    window.removeEventListener("mousedown", this._onMD);
    window.removeEventListener("mouseup", this._onMU);
    window.removeEventListener("mousemove", this._onMM);
    window.removeEventListener("wheel", this._onWh);
    document.removeEventListener("pointerlockchange", this._onLockChange);
  }

  requestLock(canvas) {
    if (!this.locked) canvas.requestPointerLock?.();
  }
  exitLock() { document.exitPointerLock?.(); }

  _resolveAction(code) {
    const kb = settings.keybinds;
    for (const a of Object.keys(kb)) if (kb[a] === code) return a;
    return null;
  }

  _key(e, down) {
    if (!this.enabled) return;
    const code = e.code;
    // Stop browser stealing Tab/Space etc while playing.
    if (this.locked || down) {
      const action = this._resolveAction(code);
      if (action === "scoreboard" || action === "pause" || code === "Tab") e.preventDefault();
    }
    if (down) {
      if (this.keys.has(code)) return;
      this.keys.add(code);
      const action = this._resolveAction(code);
      if (action) { this.actions.add(action); this.actionEdge.add(action); }
    } else {
      this.keys.delete(code);
      const action = this._resolveAction(code);
      if (action) this.actions.delete(action);
    }
  }

  _mouse(e, down) {
    if (!this.enabled) return;
    if (e.button === 0) {
      this.mouse.left = down;
      if (down) this.mouse.leftEdge = true;
    } else if (e.button === 2) {
      this.mouse.right = down;
      if (down) this.mouse.rightEdge = true;
    }
  }

  _move(e) {
    if (!this.enabled) return;
    this.mouse.x = e.clientX; this.mouse.y = e.clientY;
    if (this.locked) {
      this.mouse.dx += e.movementX || 0;
      this.mouse.dy += e.movementY || 0;
    }
  }

  // Consume per-frame edges.
  frame() {
    const out = {
      mdx: this.mouse.dx, mdy: this.mouse.dy, wheel: this.mouse.wheel,
      leftEdge: this.mouse.leftEdge, rightEdge: this.mouse.rightEdge,
      actionEdge: this.actionEdge,
    };
    this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0;
    this.mouse.leftEdge = false; this.mouse.rightEdge = false;
    this.actionEdge = new Set();
    return out;
  }

  isDown(action) { return this.actions.has(action); }
}
