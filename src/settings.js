// Persistent settings: sensitivity, FOV, graphics, audio, keybinds.
const KEY = "op-polygon-settings-v1";

export const DEFAULTS = {
  sensitivity: 0.6,
  adsSensMul: 0.55,
  fov: 80,
  invertY: false,
  toggleADS: false,
  quality: "med",
  renderScale: 1,
  shadows: true,
  particles: true,
  showFps: false,
  volMaster: 0.7,
  volSfx: 0.8,
  volMusic: 0.4,
  keybinds: {
    forward: "KeyW",
    back: "KeyS",
    left: "KeyA",
    right: "KeyD",
    jump: "Space",
    sprint: "ShiftLeft",
    crouch: "ControlLeft",
    reload: "KeyR",
    build: "KeyQ",
    edit: "KeyG",
    interact: "KeyE",
    scoreboard: "Tab",
    pause: "Escape",
    slot1: "Digit1",
    slot2: "Digit2",
    slot3: "Digit3",
    slot4: "Digit4",
    slot5: "Digit5",
  },
};

export const KEYBIND_LABELS = {
  forward: "Move forward",
  back: "Move back",
  left: "Strafe left",
  right: "Strafe right",
  jump: "Jump",
  sprint: "Sprint",
  crouch: "Crouch",
  reload: "Reload",
  build: "Build mode",
  edit: "Edit structure",
  interact: "Interact / Harvest",
  scoreboard: "Scoreboard",
  pause: "Menu",
  slot1: "Slot 1 (Rifle / Wood)",
  slot2: "Slot 2 (Pistol / Stone)",
  slot3: "Slot 3 (Sniper / Metal)",
  slot4: "Slot 4 (Banana)",
  slot5: "Slot 5 (Pickaxe)",
};

function deepMerge(base, over) {
  if (!over || typeof over !== "object") return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const k of Object.keys(over)) {
    if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k])) {
      out[k] = deepMerge(base[k] ?? {}, over[k]);
    } else {
      out[k] = over[k];
    }
  }
  return out;
}

export const settings = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return deepMerge(DEFAULTS, JSON.parse(raw));
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULTS));
})();

const listeners = new Set();
export function onSettingsChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
  for (const fn of listeners) fn(settings);
}
export function resetSettings() {
  for (const k of Object.keys(DEFAULTS)) settings[k] = JSON.parse(JSON.stringify(DEFAULTS[k]));
  saveSettings();
}

export function keyName(code) {
  if (!code) return "—";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "ControlLeft" || code === "ControlRight") return "Ctrl";
  if (code === "AltLeft" || code === "AltRight") return "Alt";
  if (code === "Space") return "Space";
  if (code === "Escape") return "Esc";
  if (code === "Tab") return "Tab";
  if (code === "Enter") return "Enter";
  if (code.startsWith("Arrow")) return code.slice(5);
  return code;
}
