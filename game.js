// Auto-generated bundle of Operation Polygon — DO NOT EDIT.
// Source modules live under src/. Re-run `python3 bundle.py` after changes.
// Loaded as a classic script so the game runs from file:// without a server.
(function () {
  const G = {};

// ── settings.js ──
G.settings = (() => {
// Persistent settings: sensitivity, FOV, graphics, audio, keybinds.
const KEY = "op-polygon-settings-v1";

const DEFAULTS = {
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

const KEYBIND_LABELS = {
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

const settings = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return deepMerge(DEFAULTS, JSON.parse(raw));
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULTS));
})();

const listeners = new Set();
function onSettingsChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
  for (const fn of listeners) fn(settings);
}
function resetSettings() {
  for (const k of Object.keys(DEFAULTS)) settings[k] = JSON.parse(JSON.stringify(DEFAULTS[k]));
  saveSettings();
}

function keyName(code) {
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
  return { DEFAULTS, KEYBIND_LABELS, settings, onSettingsChange, saveSettings, resetSettings, keyName };
})();

// ── sounds.js ──
G.sounds = (() => {
  const { settings, onSettingsChange } = G.settings;
// Procedural Web Audio SFX. No audio files needed — every sound is
// synthesized in-browser. The AudioContext is lazily created on first
// user gesture (browser autoplay rules).

class Sounds {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this._lastStepT = 0;
    this._unlockBound = false;
  }

  _ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this._applyVolumes();
    onSettingsChange(() => this._applyVolumes());
  }

  _applyVolumes() {
    if (!this.master) return;
    this.master.gain.value = settings.volMaster ?? 0.7;
    this.sfxGain.gain.value = settings.volSfx ?? 0.8;
    this.musicGain.gain.value = settings.volMusic ?? 0.4;
  }

  // Most browsers require an explicit user gesture to start audio.
  unlock() {
    this._ensure();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }
  bindUnlock(target = window) {
    if (this._unlockBound) return;
    this._unlockBound = true;
    const fire = () => this.unlock();
    target.addEventListener("pointerdown", fire);
    target.addEventListener("keydown", fire);
  }

  _now() { return this.ctx.currentTime; }

  // Core synth voice: oscillator with exponential pitch + gain envelope.
  _voice({ freq, freqEnd = null, type = "square", dur = 0.1, attack = 0.005, gain = 0.3, detune = 0 }) {
    this._ensure();
    if (!this.ctx) return;
    const t0 = this._now();
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    if (detune) o.detune.value = detune;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  // Filtered noise burst.
  _noise({ dur = 0.1, gain = 0.25, filterFreq = 2000, filterQ = 0.7, type = "lowpass", attack = 0.002 }) {
    this._ensure();
    if (!this.ctx) return;
    const t0 = this._now();
    const samples = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start(t0);
  }

  // ─── Public SFX library ──────────────────────────────────
  shoot(kind = "rifle") {
    this._ensure(); if (!this.ctx) return;
    switch (kind) {
      case "pistol":
        this._voice({ freq: 340, freqEnd: 90, type: "square", dur: 0.08, gain: 0.28 });
        this._noise({ dur: 0.06, gain: 0.20, filterFreq: 2400 });
        break;
      case "sniper":
        this._voice({ freq: 180, freqEnd: 50, type: "sawtooth", dur: 0.30, gain: 0.45 });
        this._noise({ dur: 0.20, gain: 0.35, filterFreq: 1400 });
        this._voice({ freq: 1200, freqEnd: 200, type: "triangle", dur: 0.10, gain: 0.18 });
        break;
      case "banana":
        this._voice({ freq: 520, freqEnd: 80, type: "triangle", dur: 0.18, gain: 0.30 });
        this._noise({ dur: 0.10, gain: 0.18, filterFreq: 800 });
        break;
      case "rifle":
      default:
        this._voice({ freq: 280, freqEnd: 110, type: "square", dur: 0.07, gain: 0.30 });
        this._noise({ dur: 0.08, gain: 0.25, filterFreq: 1800 });
        break;
    }
  }

  reload() {
    this._voice({ freq: 600, type: "square", dur: 0.04, gain: 0.18 });
    setTimeout(() => this._voice({ freq: 420, type: "square", dur: 0.05, gain: 0.18 }), 220);
    setTimeout(() => this._voice({ freq: 700, type: "square", dur: 0.05, gain: 0.18 }), 700);
  }

  hitmarker(headshot = false) {
    this._voice({ freq: headshot ? 1300 : 950, type: "triangle", dur: 0.06, gain: 0.25 });
  }

  hitTaken() {
    this._noise({ dur: 0.18, gain: 0.30, filterFreq: 350, type: "lowpass" });
    this._voice({ freq: 120, freqEnd: 60, type: "sawtooth", dur: 0.15, gain: 0.20 });
  }

  kill() {
    this._voice({ freq: 660, type: "triangle", dur: 0.10, gain: 0.30 });
    setTimeout(() => this._voice({ freq: 990, type: "triangle", dur: 0.12, gain: 0.30 }), 80);
  }

  death() {
    this._voice({ freq: 250, freqEnd: 70, type: "sawtooth", dur: 0.5, gain: 0.35 });
    this._noise({ dur: 0.4, gain: 0.20, filterFreq: 300 });
  }

  jump() { this._voice({ freq: 480, freqEnd: 620, type: "sine", dur: 0.10, gain: 0.18 }); }
  land() { this._noise({ dur: 0.12, gain: 0.22, filterFreq: 220 }); }

  place(material = "wood") {
    if (material === "stone") this._voice({ freq: 220, freqEnd: 160, type: "square", dur: 0.10, gain: 0.30 });
    else if (material === "metal") {
      this._voice({ freq: 540, freqEnd: 700, type: "triangle", dur: 0.10, gain: 0.25 });
      this._voice({ freq: 820, type: "sine", dur: 0.06, gain: 0.18 });
    } else this._voice({ freq: 330, freqEnd: 240, type: "square", dur: 0.08, gain: 0.25 });
    this._noise({ dur: 0.06, gain: 0.12, filterFreq: 1200 });
  }

  harvest() {
    this._voice({ freq: 220, freqEnd: 380, type: "triangle", dur: 0.08, gain: 0.22 });
    this._noise({ dur: 0.06, gain: 0.14, filterFreq: 700 });
  }

  pickup() { this._voice({ freq: 740, freqEnd: 1050, type: "sine", dur: 0.15, gain: 0.22 }); }
  uiClick() { this._voice({ freq: 820, type: "square", dur: 0.04, gain: 0.18 }); }
  uiOpen() { this._voice({ freq: 520, freqEnd: 880, type: "triangle", dur: 0.18, gain: 0.22 }); }
  crateSpin() { this._voice({ freq: 1400, type: "square", dur: 0.02, gain: 0.18 }); }

  crateReveal(rarity = "common") {
    const map = {
      common:    [330],
      uncommon:  [330, 440],
      rare:      [330, 440, 660],
      epic:      [330, 440, 660, 880],
      legendary: [330, 440, 660, 880, 1320],
    };
    const notes = map[rarity] || map.common;
    notes.forEach((f, i) => setTimeout(() => {
      this._voice({ freq: f, type: "triangle", dur: 0.25, gain: 0.30 });
    }, i * 90));
  }

  step() {
    const now = performance.now() / 1000;
    if (now - this._lastStepT < 0.32) return;
    this._lastStepT = now;
    this._noise({ dur: 0.08, gain: 0.10, filterFreq: 280 });
  }
}

const sounds = new Sounds();
  return { Sounds, sounds };
})();

// ── economy.js ──
G.economy = (() => {
// Currency + inventory + crate roll logic. Persisted in localStorage.
const ECON_KEY = "op-polygon-economy-v1";

const RARITY = {
  common:    { name: "Common",    color: 0x9aa3ad, weight: 60, payout: 25 },
  uncommon:  { name: "Uncommon",  color: 0x56cc8b, weight: 25, payout: 60 },
  rare:      { name: "Rare",      color: 0x4aa8e0, weight: 10, payout: 150 },
  epic:      { name: "Epic",      color: 0xb05ce0, weight: 4,  payout: 400 },
  legendary: { name: "Legendary", color: 0xf2c94c, weight: 1,  payout: 1000 },
};

// ─── Catalog ────────────────────────────────────────────────
// Skins per weapon (id, name, rarity, recolour spec).
const SKINS = {
  pistol: [
    { id: "ps_default", name: "Standard",    rarity: "common",    body: 0x2a2f36, grip: 0x1c1f24, accent: 0xf2c94c },
    { id: "ps_jungle",  name: "Jungle Op",   rarity: "common",    body: 0x4a6b3a, grip: 0x2a3a22, accent: 0xd0d090 },
    { id: "ps_arctic",  name: "Arctic",      rarity: "uncommon",  body: 0xd8e8f0, grip: 0x6a98b0, accent: 0x2090ff },
    { id: "ps_sunset",  name: "Sunset",      rarity: "rare",      body: 0xe07050, grip: 0x401820, accent: 0xffd060 },
    { id: "ps_neon",    name: "Neon Strike", rarity: "epic",      body: 0x101218, grip: 0x101218, accent: 0xff00ff, glow: 0xff00ff },
    { id: "ps_dragon",  name: "Golden Dragon",rarity: "legendary",body: 0xf2c94c, grip: 0x402a04, accent: 0xff6020, glow: 0xffaa20 },
  ],
  rifle: [
    { id: "rf_default", name: "Standard",    rarity: "common",    body: 0x2a2f36, grip: 0x1c1f24, accent: 0xf2c94c },
    { id: "rf_desert",  name: "Desert Cam",  rarity: "common",    body: 0xb29050, grip: 0x60401a, accent: 0xd8a060 },
    { id: "rf_forest",  name: "Forest Cam",  rarity: "uncommon",  body: 0x405a30, grip: 0x202a16, accent: 0x6a8a50 },
    { id: "rf_carbon",  name: "Carbon Edge", rarity: "rare",      body: 0x141a22, grip: 0x080a10, accent: 0x40d0ff },
    { id: "rf_blaze",   name: "Blaze",       rarity: "epic",      body: 0xc02030, grip: 0x301010, accent: 0xffc040, glow: 0xff5020 },
    { id: "rf_void",    name: "Void Walker", rarity: "legendary", body: 0x080414, grip: 0x040208, accent: 0xa050ff, glow: 0xa050ff },
  ],
  sniper: [
    { id: "sn_default", name: "Standard",    rarity: "common",    body: 0x2a2f36, grip: 0x1c1f24, accent: 0xf2c94c },
    { id: "sn_winter",  name: "Winter Op",   rarity: "uncommon",  body: 0xe8eef4, grip: 0x6080a0, accent: 0x2090ff },
    { id: "sn_glass",   name: "Glasswork",   rarity: "rare",      body: 0x506070, grip: 0x202830, accent: 0x70e0ff, glow: 0x40c0ff },
    { id: "sn_marble",  name: "Imperial",    rarity: "epic",      body: 0xeae0d0, grip: 0x80604a, accent: 0xc0a040, glow: 0xffe080 },
    { id: "sn_phoenix", name: "Phoenix",     rarity: "legendary", body: 0xff5020, grip: 0x401004, accent: 0xffd060, glow: 0xff8030 },
  ],
  banana: [
    { id: "bn_default", name: "Fresh",       rarity: "common",    body: 0xf2d44c, grip: 0xb89030, accent: 0x40a040 },
    { id: "bn_browned", name: "Speckled",    rarity: "common",    body: 0xd8a040, grip: 0x806020, accent: 0x402810 },
    { id: "bn_chrome",  name: "Chrome Peel", rarity: "rare",      body: 0xdddddd, grip: 0xaaaaaa, accent: 0x4080ff, glow: 0x60a0ff },
    { id: "bn_neon",    name: "Toxic Peel",  rarity: "epic",      body: 0x80ff20, grip: 0x205020, accent: 0xff00ff, glow: 0x80ff20 },
    { id: "bn_ancient", name: "Bananarchy",  rarity: "legendary", body: 0xf0c040, grip: 0x402810, accent: 0xff2080, glow: 0xff4080 },
  ],
};

// Charms: small decorative danglers. Geometry "kind" picks the shape.
const CHARMS = [
  { id: "ch_cube",    name: "Lucky Cube",     rarity: "common",   kind: "cube",   color: 0xc0c0c0 },
  { id: "ch_die",     name: "Loaded Die",     rarity: "common",   kind: "cube",   color: 0xee2244 },
  { id: "ch_skull",   name: "Tiny Skull",     rarity: "uncommon", kind: "skull",  color: 0xe8e2d4 },
  { id: "ch_star",    name: "Gold Star",      rarity: "uncommon", kind: "star",   color: 0xf2c94c },
  { id: "ch_diamond", name: "Diamond",        rarity: "rare",     kind: "diamond",color: 0x70e0ff, glow: 0x70e0ff },
  { id: "ch_heart",   name: "Heart Pendant",  rarity: "rare",     kind: "heart",  color: 0xff5070 },
  { id: "ch_skull_g", name: "Gilded Skull",   rarity: "epic",     kind: "skull",  color: 0xf2c94c, glow: 0xffd070 },
  { id: "ch_orb",     name: "Mana Orb",       rarity: "epic",     kind: "orb",    color: 0xa050ff, glow: 0xa050ff },
  { id: "ch_crown",   name: "Royal Crown",    rarity: "legendary",kind: "crown",  color: 0xffd060, glow: 0xff8020 },
  { id: "ch_dragon",  name: "Dragon Fang",    rarity: "legendary",kind: "fang",   color: 0xff3060, glow: 0xff6040 },
];

// Bean skins: customizable colours / hats / pattern for the player character.
const BEAN_SKINS = [
  { id: "bn_classic",  name: "Recruit",       rarity: "common",    body: 0xf2c94c, eye: 0x101010, hat: null },
  { id: "bn_mint",     name: "Mint",          rarity: "common",    body: 0x8fe2c0, eye: 0x101010, hat: null },
  { id: "bn_blush",    name: "Blush",         rarity: "common",    body: 0xf09cb0, eye: 0x101010, hat: null },
  { id: "bn_steel",    name: "Steel",         rarity: "uncommon",  body: 0x8090a0, eye: 0x40d0ff, hat: "helmet" },
  { id: "bn_forest",   name: "Forester",      rarity: "uncommon",  body: 0x5a8a4a, eye: 0x101010, hat: "cap" },
  { id: "bn_carrot",   name: "Carrot",        rarity: "uncommon",  body: 0xff8030, eye: 0x101010, hat: "leaf" },
  { id: "bn_robo",     name: "Robo",          rarity: "rare",      body: 0xcccccc, eye: 0xff2020, hat: "antenna" },
  { id: "bn_pirate",   name: "Buccaneer",     rarity: "rare",      body: 0xb87040, eye: 0x101010, hat: "pirate" },
  { id: "bn_ninja",    name: "Shadow Bean",   rarity: "epic",      body: 0x141822, eye: 0xff4060, hat: "mask", glow: 0xff4060 },
  { id: "bn_galaxy",   name: "Galaxy Bean",   rarity: "epic",      body: 0x402060, eye: 0xffffff, hat: "star",  glow: 0x8050ff },
  { id: "bn_royal",    name: "Bean Majesty",  rarity: "legendary", body: 0xf2c94c, eye: 0xffffff, hat: "crown", glow: 0xff8020 },
  { id: "bn_dragon",   name: "Dragon Lord",   rarity: "legendary", body: 0x60ff60, eye: 0xff2020, hat: "horn",  glow: 0x40ff40 },
];

// Crates: define what they roll from and cost.
const CRATES = [
  { id: "crate_skin",  name: "Gun Skin Crate",  cost: 250, pool: "skins" },
  { id: "crate_charm", name: "Charm Crate",     cost: 200, pool: "charms" },
  { id: "crate_bean",  name: "Bean Crate",      cost: 250, pool: "beans" },
  { id: "crate_premium", name: "Premium Crate", cost: 800, pool: "all", boost: true },
];

// ─── State ──────────────────────────────────────────────────
const ECON_DEFAULTS = {
  coins: 500, // starting kit
  ownedSkins: { pistol: ["ps_default"], rifle: ["rf_default"], sniper: ["sn_default"], banana: ["bn_default"] },
  ownedCharms: ["ch_cube"],
  equippedSkin: { pistol: "ps_default", rifle: "rf_default", sniper: "sn_default", banana: "bn_default" },
  equippedCharm: { pistol: null, rifle: "ch_cube", sniper: null, banana: null },
  loadout: ["rifle", "pistol", "sniper", "banana"], // hotbar order
  totals: { matches: 0, kills: 0, wins: 0, cratesOpened: 0 },
};

function econMerge(base, over) {
  if (!over || typeof over !== "object") return base;
  const out = Array.isArray(base) ? over.slice() : { ...base };
  for (const k of Object.keys(over)) {
    if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k])) {
      out[k] = econMerge(base[k] ?? {}, over[k]);
    } else { out[k] = over[k]; }
  }
  return out;
}

const economy = (() => {
  try {
    const raw = localStorage.getItem(ECON_KEY);
    if (raw) return econMerge(JSON.parse(JSON.stringify(ECON_DEFAULTS)), JSON.parse(raw));
  } catch {}
  return JSON.parse(JSON.stringify(ECON_DEFAULTS));
})();

const econListeners = new Set();
function onEconomyChange(fn) { econListeners.add(fn); return () => econListeners.delete(fn); }
function econSave() {
  try { localStorage.setItem(ECON_KEY, JSON.stringify(economy)); } catch {}
  for (const fn of econListeners) fn(economy);
}

// ─── API ────────────────────────────────────────────────────
function getCoins() { return economy.coins; }
function addCoins(n) { economy.coins = Math.max(0, economy.coins + Math.round(n)); econSave(); }
function spendCoins(n) { if (economy.coins < n) return false; economy.coins -= n; econSave(); return true; }

function ownsSkin(weapon, id) { return (economy.ownedSkins[weapon] || []).includes(id); }
function ownsCharm(id) { return (economy.ownedCharms || []).includes(id); }

function equipSkin(weapon, id) {
  if (!ownsSkin(weapon, id)) return false;
  economy.equippedSkin[weapon] = id; econSave(); return true;
}
function equipCharm(weapon, id) {
  if (id && !ownsCharm(id)) return false;
  economy.equippedCharm[weapon] = id || null; econSave(); return true;
}

function getEquippedSkin(weapon) {
  const id = economy.equippedSkin[weapon];
  return (SKINS[weapon] || []).find(s => s.id === id) || (SKINS[weapon] || [])[0];
}
function getEquippedCharm(weapon) {
  const id = economy.equippedCharm[weapon];
  return CHARMS.find(c => c.id === id) || null;
}

function buySkin(weapon, id) {
  const def = (SKINS[weapon] || []).find(s => s.id === id);
  if (!def) return { ok: false, reason: "Unknown" };
  if (ownsSkin(weapon, id)) return { ok: false, reason: "Already owned" };
  const price = priceFor(def);
  if (!spendCoins(price)) return { ok: false, reason: "Not enough coins" };
  economy.ownedSkins[weapon] = (economy.ownedSkins[weapon] || []).concat([id]);
  econSave();
  return { ok: true, price };
}
function buyCharm(id) {
  const def = CHARMS.find(c => c.id === id);
  if (!def) return { ok: false, reason: "Unknown" };
  if (ownsCharm(id)) return { ok: false, reason: "Already owned" };
  const price = priceFor(def);
  if (!spendCoins(price)) return { ok: false, reason: "Not enough coins" };
  economy.ownedCharms = (economy.ownedCharms || []).concat([id]);
  econSave();
  return { ok: true, price };
}

function priceFor(item) {
  const base = { common: 150, uncommon: 350, rare: 800, epic: 1800, legendary: 4500 };
  return base[item.rarity] || 100;
}

// Roll a random item from a crate. Returns { item, weapon?, dupe, payout }.
function openCrate(crate) {
  if (!spendCoins(crate.cost)) return { ok: false, reason: "Not enough coins" };
  economy.totals.cratesOpened = (economy.totals.cratesOpened || 0) + 1;

  // Build pool
  let pool = [];
  if (crate.pool === "skins" || crate.pool === "all") {
    for (const w of Object.keys(SKINS)) for (const s of SKINS[w]) pool.push({ kind: "skin", weapon: w, def: s });
  }
  if (crate.pool === "charms" || crate.pool === "all") {
    for (const c of CHARMS) pool.push({ kind: "charm", def: c });
  }

  // Roll by rarity weighting (boost epic+legendary if premium).
  const weights = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
  if (crate.boost) { weights.epic = 12; weights.legendary = 4; weights.common = 35; }
  // Pick rarity bucket first.
  const totalW = Object.values(weights).reduce((a,b) => a+b, 0);
  let r = Math.random() * totalW;
  let rarity = "common";
  for (const k of Object.keys(weights)) { r -= weights[k]; if (r <= 0) { rarity = k; break; } }
  const choices = pool.filter(p => p.def.rarity === rarity);
  // Fallback to common if rarity bucket is empty.
  const finalChoices = choices.length ? choices : pool.filter(p => p.def.rarity === "common");
  const win = finalChoices[Math.floor(Math.random() * finalChoices.length)];

  let dupe = false;
  if (win.kind === "skin") {
    if (ownsSkin(win.weapon, win.def.id)) dupe = true;
    else economy.ownedSkins[win.weapon] = (economy.ownedSkins[win.weapon] || []).concat([win.def.id]);
  } else {
    if (ownsCharm(win.def.id)) dupe = true;
    else economy.ownedCharms = (economy.ownedCharms || []).concat([win.def.id]);
  }
  const payout = dupe ? RARITY[rarity].payout : 0;
  if (dupe) addCoins(payout);
  econSave();
  return { ok: true, item: win, rarity, dupe, payout };
}

// Match rewards.
function awardMatch({ kills, won }) {
  const earned = 50 + kills * 10 + (won ? 200 : 0);
  addCoins(earned);
  economy.totals.matches = (economy.totals.matches || 0) + 1;
  economy.totals.kills = (economy.totals.kills || 0) + kills;
  if (won) economy.totals.wins = (economy.totals.wins || 0) + 1;
  econSave();
  return earned;
}
  return { RARITY, SKINS, CHARMS, BEAN_SKINS, CRATES, economy, onEconomyChange, getCoins, addCoins, spendCoins, ownsSkin, ownsCharm, equipSkin, equipCharm, getEquippedSkin, getEquippedCharm, buySkin, buyCharm, priceFor, openCrate, awardMatch };
})();

// ── maps.js ──
G.maps = (() => {
// Map presets. Each map is a palette + prop kit.
const MAPS = [
  {
    id: "outpost",
    name: "Outpost",
    desc: "Verdant forest valley. Trees, rocks, supply crates.",
    sky: 0x9dc4f0, fogNear: 80, fogFar: 260, fogColor: 0x9dc4f0,
    sun: 0xfff0d0, hemi: { sky: 0xbfd9ff, ground: 0x4a5c3a, intensity: 0.55 },
    ground: 0x6b9a4a,
    cloudColor: 0xffffff,
    trees: { trunk: 0x5a3a22, leaves: [0x3f7a3a, 0x4f8a48], shape: "ico", count: 90 },
    rocks: 0x9aa0a6, rockCount: 55,
    crates: 0xc08a4a, crateCount: 14,
    barrels: 0x5a6a5a, barrelCount: 18,
    buildings: 6, buildingWall: 0xd8c79b, buildingRoof: 0x995544,
  },
  {
    id: "dunes",
    name: "Dunes",
    desc: "Sun-baked desert with mesas and lonely cacti.",
    sky: 0xfbd8a0, fogNear: 100, fogFar: 280, fogColor: 0xfbd8a0,
    sun: 0xffe9b0, hemi: { sky: 0xfbd8a0, ground: 0xc09060, intensity: 0.6 },
    ground: 0xd9b178,
    cloudColor: 0xffe8c0,
    trees: { trunk: 0x4a7036, leaves: [0x60a040, 0x80b850], shape: "cactus", count: 35 },
    rocks: 0xb89070, rockCount: 65,
    crates: 0xc0a468, crateCount: 18,
    barrels: 0x7a5a3a, barrelCount: 12,
    buildings: 4, buildingWall: 0xd0a070, buildingRoof: 0x884030,
  },
  {
    id: "tundra",
    name: "Snow Valley",
    desc: "Frozen valley. Pines, icy boulders, low visibility.",
    sky: 0xc6dcec, fogNear: 60, fogFar: 200, fogColor: 0xdfe8f0,
    sun: 0xfffafa, hemi: { sky: 0xeaf3fb, ground: 0xa0b0c0, intensity: 0.7 },
    ground: 0xeef4f8,
    cloudColor: 0xffffff,
    trees: { trunk: 0x5a3a22, leaves: [0x2a5a3a, 0x346f4a], shape: "pine", count: 80 },
    rocks: 0xd0d8e0, rockCount: 50,
    crates: 0x8aa0b0, crateCount: 10,
    barrels: 0x6a7884, barrelCount: 14,
    buildings: 5, buildingWall: 0xe0e8ee, buildingRoof: 0x506878,
  },
  {
    id: "downtown",
    name: "Downtown",
    desc: "Urban grid. Concrete, asphalt, lots of cover.",
    sky: 0xb0bdc8, fogNear: 80, fogFar: 240, fogColor: 0xb0bdc8,
    sun: 0xffe8c0, hemi: { sky: 0xc0ccd6, ground: 0x6a6f74, intensity: 0.45 },
    ground: 0x55595e,
    cloudColor: 0xdddddd,
    trees: { trunk: 0x5a3a22, leaves: [0x3a7a4a], shape: "ico", count: 20 },
    rocks: 0x707880, rockCount: 18,
    crates: 0xc08a4a, crateCount: 22,
    barrels: 0x4a5258, barrelCount: 26,
    buildings: 12, buildingWall: 0x8a8e94, buildingRoof: 0x44484e,
  },
];

function mapById(id) {
  return MAPS.find(m => m.id === id) || MAPS[0];
}
  return { MAPS, mapById };
})();

// ── physics.js ──
G.physics = (() => {
  const THREE = window.THREE;
// Light-weight AABB collision against world.colliders + structures.

const tmpMin = new THREE.Vector3();
const tmpMax = new THREE.Vector3();

function makeCapsule(radius = 0.4, height = 1.8) {
  return { r: radius, h: height };
}

// Test AABB overlap against an array of colliders {min,max}. Resolves XZ first, then Y separately.
function moveWithCollision(pos, vel, dt, capsule, getColliders) {
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
function groundY(_x, _z) { return 0; }
  return { makeCapsule, moveWithCollision, groundY };
})();

// ── input.js ──
G.input = (() => {
  const { settings } = G.settings;
// Centralised input. Tracks keys/buttons + emits action events.

class Input {
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
    const action = this._resolveAction(code);
    // While in pointer lock (i.e. actively playing) suppress browser defaults
    // for any bound action key, plus Tab/Space/arrows/letters that the browser
    // might otherwise hijack (find-as-you-type, scroll, focus change).
    const isLetter = code.startsWith("Key");
    const isDigit = code.startsWith("Digit");
    const isArrow = code.startsWith("Arrow");
    const isHijack = code === "Space" || code === "Tab" || isArrow || isLetter || isDigit;
    if (this.locked && (action || isHijack)) e.preventDefault();
    // Always prevent Tab default to stop focus stealing when menu is open.
    if (code === "Tab") e.preventDefault();
    if (down) {
      if (this.keys.has(code)) return;
      this.keys.add(code);
      if (action) { this.actions.add(action); this.actionEdge.add(action); }
    } else {
      this.keys.delete(code);
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
  return { Input };
})();

// ── effects.js ──
G.effects = (() => {
  const THREE = window.THREE;
  const { settings } = G.settings;
// Particle / tracer effects.


class FX {
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
  return { FX };
})();

// ── weapons.js ──
G.weapons = (() => {
  const THREE = window.THREE;
// Multi-weapon system: pistol, rifle, sniper, banana.
// Each weapon has stats + a viewmodel builder that accepts a skin definition.

const WEAPONS = {
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

class Weapon {
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

function raycastShot(scene, origin, dir, ignore = []) {
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
  return { WEAPONS, Weapon, raycastShot };
})();

// ── charms.js ──
G.charms = (() => {
  const THREE = window.THREE;
// Gun charm with simple verlet-pendulum physics. The string is constrained to
// a fixed length from the gun's charmAnchor; the charm dangles + swings as
// the player moves the camera/gun.

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

class GunCharm {
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
  return { GunCharm };
})();

// ── beans.js ──
G.beans = (() => {
  const THREE = window.THREE;
// Bean character builder. Customisable colour, eye, hat.
// Used for both bots and remote players.

// Build a low-poly bean character. Returns a Group, anchored at feet (y=0).
function buildBean(skin = { body: 0xf2c94c, eye: 0x101010, hat: null, glow: null }) {
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
function animateBean(bean, isMoving, walkSpeed = 6) {
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
  return { buildBean, animateBean };
})();

// ── world.js ──
G.world = (() => {
  const THREE = window.THREE;
  const { mapById } = G.maps;
// World generation. Driven by a map preset.


const WORLD_SIZE = 220;
const HALF = WORLD_SIZE / 2;

function randIn(min, max) { return min + Math.random() * (max - min); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

class World {
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
  return { WORLD_SIZE, HALF, World };
})();

// ── building.js ──
G.building = (() => {
  const THREE = window.THREE;
// Fortnite-style building. Grid-snapped walls, floors, ramps.

const STRUCT = { WALL: "wall", FLOOR: "floor", RAMP: "ramp" };
const MAT_KINDS = ["wood", "stone", "metal"];

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

class BuildSystem {
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
  return { STRUCT, MAT_KINDS, BuildSystem };
})();

// ── edit.js ──
G.edit = (() => {
  const THREE = window.THREE;
  const { STRUCT } = G.building;
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

class EditMode {
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
  return { EditMode };
})();

// ── bots.js ──
G.bots = (() => {
  const THREE = window.THREE;
  const { buildBean, animateBean } = G.beans;
  const { BEAN_SKINS } = G.economy;
// Bots — now use bean character models. AI loop unchanged.



const BOT_NAMES = [
  "Vector","Echo","Tango","Bravo","Foxtrot","Recon","Ghost","Whiskey","Romeo","Sierra",
  "Maple","Cinder","Onyx","Talon","Frost","Husk","Vega","Lynx","Drift","Phantom",
];

function randBeanSkin() {
  return BEAN_SKINS[Math.floor(Math.random() * BEAN_SKINS.length)];
}

class Bot {
  constructor(scene, world, opts = {}) {
    this.scene = scene;
    this.world = world;
    this.team = opts.team || "b";
    this.name = opts.name || BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    this.isLocal = false;
    this.isBot = true;
    this.alive = true;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.maxHealth = 100; this.health = 100;
    this.kills = 0; this.deaths = 0; this.score = 0;
    this.shotCD = 0;
    this.aimTarget = null;
    this.state = "wander"; this.stateT = 0; this.wanderDir = Math.random() * Math.PI * 2;
    this.respawnAt = 0;
    this.lastDamageT = 0;

    // Bean body. Team colour tints body if team known.
    const skin = opts.beanSkin || randBeanSkin();
    // Tint by team for TDM clarity.
    let bodyColor = skin.body;
    if (this.team === "a") bodyColor = mix(bodyColor, 0x56cc8b, 0.45);
    else if (this.team === "b") bodyColor = mix(bodyColor, 0xe85a4f, 0.45);
    const teamSkin = { ...skin, body: bodyColor };
    this.group = buildBean(teamSkin);
    this.group.traverse((m) => {
      m.castShadow = true;
      m.userData.botRef = this;
    });
    scene.add(this.group);
    this.capsule = { r: 0.55, h: 2.0 };
  }

  destroy() { this.scene.remove(this.group); }
  setPos(p) { this.position.copy(p); this.group.position.copy(p); }

  takeDamage(dmg) {
    if (!this.alive) return false;
    this.health -= dmg;
    this.lastDamageT = performance.now() / 1000;
    if (this.health <= 0) { this.alive = false; this.deaths++; this.group.visible = false; return true; }
    return false;
  }

  respawn(pos) {
    this.health = this.maxHealth; this.alive = true; this.position.copy(pos); this.group.visible = true;
  }

  update(dt, targets, world, buildSystem) {
    if (!this.alive) return null;
    this.stateT += dt;
    this.shotCD -= dt;

    let best = null, bestD = Infinity;
    for (const t of targets) {
      if (!t || !t.alive) continue;
      if (t.team === this.team) continue;
      const d = this.position.distanceToSquared(t.position);
      if (d < bestD) { bestD = d; best = t; }
    }
    this.aimTarget = best;

    let result = null;

    if (best && bestD < 70 * 70) {
      const from = this.position.clone(); from.y += 1.6;
      const to = best.position.clone(); to.y += 1.4;
      const visible = !this._blocked(from, to, world, buildSystem);
      if (visible) {
        const dir = to.clone().sub(from);
        this.yaw = Math.atan2(-dir.x, -dir.z);
        this.pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
        this.state = "engage";
        const dist = Math.sqrt(bestD);
        const desired = 12;
        const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        const move = new THREE.Vector3();
        const closeDir = dist > desired ? 1 : (dist < desired - 3 ? -1 : 0);
        move.addScaledVector(fwd, closeDir);
        move.addScaledVector(right, Math.sin(this.stateT * 1.4) * 0.7);
        const speed = 3.6;
        this.velocity.x = move.x * speed;
        this.velocity.z = move.z * speed;
        if (this.shotCD <= 0 && dist < 60) {
          this.shotCD = 0.18 + Math.random() * 0.12;
          const miss = (Math.random() - 0.5) * (0.05 + dist * 0.0035);
          const aim = to.clone().add(new THREE.Vector3((Math.random()-0.5), miss*2, (Math.random()-0.5)).multiplyScalar(0.6 + dist * 0.04));
          const aimDir = aim.clone().sub(from).normalize();
          const hitChance = Math.max(0.18, 0.85 - dist * 0.012);
          const hits = Math.random() < hitChance;
          result = { fired: true, from, dir: aimDir, target: best, hit: hits, dmg: 14 };
        }
      } else {
        const dir = best.position.clone().sub(this.position).normalize();
        this.velocity.x = dir.x * 3.2;
        this.velocity.z = dir.z * 3.2;
        this.state = "chase";
      }
    } else {
      this.state = "wander";
      if (this.stateT > 2.5) {
        this.wanderDir += (Math.random() - 0.5) * 1.4;
        this.stateT = 0;
      }
      this.velocity.x = Math.cos(this.wanderDir) * 1.8;
      this.velocity.z = Math.sin(this.wanderDir) * 1.8;
      this.yaw = Math.atan2(-this.velocity.x, -this.velocity.z);
    }

    const next = this.position.clone();
    next.x += this.velocity.x * dt; next.z += this.velocity.z * dt;
    if (this._blockedBox(next, world, buildSystem)) {
      const nx = this.position.clone(); nx.x += this.velocity.x * dt;
      if (!this._blockedBox(nx, world, buildSystem)) { this.position.copy(nx); }
      else {
        const nz = this.position.clone(); nz.z += this.velocity.z * dt;
        if (!this._blockedBox(nz, world, buildSystem)) this.position.copy(nz);
        else this.wanderDir += 2;
      }
    } else { this.position.copy(next); }
    this.position.x = Math.max(-105, Math.min(105, this.position.x));
    this.position.z = Math.max(-105, Math.min(105, this.position.z));
    this.position.y = 0;

    const moving = Math.hypot(this.velocity.x, this.velocity.z) > 0.4;
    animateBean(this.group, moving, 7);

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw + Math.PI;

    return result;
  }

  _blocked(from, to, world, build) {
    const all = world.colliders.concat(build.colliders);
    const dir = to.clone().sub(from);
    const dist = dir.length();
    if (dist < 0.01) return false;
    dir.divideScalar(dist);
    const steps = Math.min(40, Math.ceil(dist / 0.6));
    const p = new THREE.Vector3();
    for (let i = 1; i < steps; i++) {
      p.copy(from).addScaledVector(dir, dist * (i / steps));
      for (const c of all) {
        if (p.x > c.min.x && p.x < c.max.x && p.y > c.min.y && p.y < c.max.y && p.z > c.min.z && p.z < c.max.z) return true;
      }
    }
    return false;
  }

  _blockedBox(pos, world, build) {
    const r = this.capsule.r, h = this.capsule.h;
    const min = { x: pos.x - r, y: 0, z: pos.z - r };
    const max = { x: pos.x + r, y: h, z: pos.z + r };
    const all = world.colliders.concat(build.colliders);
    for (const c of all) {
      if (min.x > c.max.x || max.x < c.min.x) continue;
      if (min.y > c.max.y || max.y < c.min.y) continue;
      if (min.z > c.max.z || max.z < c.min.z) continue;
      return true;
    }
    return false;
  }
}

function mix(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 * (1-t) + r2 * t);
  const g = Math.round(g1 * (1-t) + g2 * t);
  const b = Math.round(b1 * (1-t) + b2 * t);
  return (r << 16) | (g << 8) | b;
}
  return { Bot };
})();

// ── hud.js ──
G.hud = (() => {
  const { WORLD_SIZE, HALF } = G.world;
// HUD: health, ammo, materials, kill feed, minimap, scoreboard, hotbar.

const $ = (s) => document.querySelector(s);

class HUD {
  constructor(getState) {
    this.getState = getState;
    this.killfeed = $("#killfeed");
    this.scoreboard = $("#scoreboard");
    this.zoneInfo = $("#zone-info");
    this.modeInfo = $("#mode-info");
    this.healthFill = $("#health-fill");
    this.healthText = $("#health-text");
    this.ammoCur = $("#ammo-cur");
    this.ammoRes = $("#ammo-res");
    this.mats = {
      wood: $(".mat-wood .num"),
      stone: $(".mat-stone .num"),
      metal: $(".mat-metal .num"),
    };
    this.minimap = $("#minimap");
    this.mctx = this.minimap.getContext("2d");
    this.hotbar = $("#hotbar");
    this.buildHint = $("#build-hint");
    this.damageVignette = $("#damage-vignette");
    this.hitmarker = $("#hitmarker");

    this._lastDmgT = 0;
    this._buildHotbar();
  }

  _buildHotbar() {
    this.setLoadout(["rifle", "pistol", "sniper", "banana", "pickaxe"]);
  }

  setLoadout(slots) {
    const labels = { rifle: "RIFLE", pistol: "PISTOL", sniper: "SNIPER", banana: "BANANA", pickaxe: "PICKAXE" };
    this.hotbar.innerHTML = "";
    this.slots = slots.map((id, i) => {
      const el = document.createElement("div");
      el.className = "hotbar-slot" + (i === 0 ? " sel" : "");
      el.innerHTML = `<span class="key">${i + 1}</span><span class="label">${labels[id] || id.toUpperCase()}</span>`;
      this.hotbar.append(el);
      return el;
    });
  }

  setSelectedSlot(idx) {
    if (!this.slots) return;
    for (let i = 0; i < this.slots.length; i++) this.slots[i].classList.toggle("sel", i === idx);
  }

  showHitmarker(head = false) {
    this.hitmarker.classList.remove("show");
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.add("show");
    this.hitmarker.style.filter = head ? "drop-shadow(0 0 6px #e85a4f)" : "";
  }

  flashDamage() {
    this.damageVignette.classList.add("show");
    clearTimeout(this._dmgT);
    this._dmgT = setTimeout(() => this.damageVignette.classList.remove("show"), 240);
  }

  setBuildMode(on) {
    this.buildHint.classList.toggle("hidden", !on);
    this.setSelectedSlot(on ? 3 : 0);
  }

  addKill(killer, victim, isYouKiller, isYouVictim) {
    const row = document.createElement("div");
    row.className = "killfeed-row";
    const kCls = isYouKiller ? "killer you" : "killer";
    const vCls = isYouVictim ? "victim you" : "victim";
    row.innerHTML = `<span class="${kCls}">${killer}</span> <span style="opacity:.6;margin:0 4px">▶</span> <span class="${vCls}">${victim}</span>`;
    this.killfeed.append(row);
    setTimeout(() => row.remove(), 5000);
    // Cap rows
    while (this.killfeed.children.length > 5) this.killfeed.firstChild.remove();
  }

  setModeInfo(text) {
    this.modeInfo.textContent = text || "";
    this.modeInfo.style.display = text ? "" : "none";
  }
  setZoneInfo(text, warn = false) {
    this.zoneInfo.textContent = text || "";
    this.zoneInfo.style.display = text ? "" : "none";
    this.zoneInfo.classList.toggle("warn", warn);
  }

  update() {
    const s = this.getState();
    if (!s) return;
    const p = s.player;
    // Health
    const pct = Math.max(0, p.health) / p.maxHealth * 100;
    this.healthFill.style.width = pct + "%";
    this.healthFill.classList.toggle("low", pct < 35);
    this.healthText.textContent = Math.max(0, Math.ceil(p.health));
    // Ammo
    const w = s.weapon;
    this.ammoCur.textContent = w ? (w.reloading ? "…" : w.mag) : "—";
    this.ammoRes.textContent = w ? w.reserve : "—";
    // Mats
    this.mats.wood.textContent = p.materials.wood | 0;
    this.mats.stone.textContent = p.materials.stone | 0;
    this.mats.metal.textContent = p.materials.metal | 0;

    this._drawMinimap(s);
    this._maybeUpdateScoreboard(s);
  }

  _drawMinimap(s) {
    const ctx = this.mctx;
    const W = this.minimap.width, H = this.minimap.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(20,28,38,0.85)";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const scale = (W * 0.5) / 70; // 70m radius view

    const px = s.player.position.x, pz = s.player.position.z;
    // Zone
    if (s.zone) {
      const dx = s.zone.x - px, dz = s.zone.z - pz;
      ctx.beginPath();
      ctx.arc(cx + dx * scale, cy + dz * scale, s.zone.r * scale, 0, Math.PI*2);
      ctx.strokeStyle = "#f2c94c"; ctx.lineWidth = 1.5;
      ctx.stroke();
      if (s.zone.next) {
        ctx.beginPath();
        ctx.arc(cx + (s.zone.next.x - px) * scale, cy + (s.zone.next.z - pz) * scale, s.zone.next.r * scale, 0, Math.PI*2);
        ctx.setLineDash([3,3]); ctx.strokeStyle = "#56cc8b"; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // Bots/players
    for (const e of s.entities) {
      if (!e || !e.alive) continue;
      const dx = e.position.x - px, dz = e.position.z - pz;
      if (Math.abs(dx) > W * 0.5 / scale || Math.abs(dz) > H * 0.5 / scale) continue;
      ctx.fillStyle = e.team === s.player.team ? "#56cc8b" : "#e85a4f";
      ctx.beginPath(); ctx.arc(cx + dx * scale, cy + dz * scale, 3, 0, Math.PI*2); ctx.fill();
    }
    // Self (north up)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0);
    ctx.fillStyle = "#f2c94c";
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.rotate(-s.player.yaw);
    ctx.fill();
    ctx.restore();
    // Border
    ctx.strokeStyle = "rgba(242,201,76,0.6)";
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  }

  _maybeUpdateScoreboard(s) {
    if (this.scoreboard.classList.contains("hidden")) return;
    const rows = $("#sb-rows");
    const all = [s.player, ...s.entities.filter(e => e)];
    if (s.teams) {
      // Split rows by team
      const aRows = all.filter(p => p.team === "a");
      const bRows = all.filter(p => p.team === "b");
      const tA = aRows.reduce((a,b) => a + b.kills, 0);
      const tB = bRows.reduce((a,b) => a + b.kills, 0);
      rows.innerHTML = `
        <div class="sb-row head"><span></span><span>Player</span><span>K</span><span>D</span><span>Score</span></div>
        <h3 style="margin-top:8px;color:var(--accent2);">TEAM A — ${tA}</h3>
        ${aRows.map((p, i) => this._sbRow(p, i+1, s.player, "sb-team-a")).join("")}
        <h3 style="margin-top:8px;color:var(--danger);">TEAM B — ${tB}</h3>
        ${bRows.map((p, i) => this._sbRow(p, i+1, s.player, "sb-team-b")).join("")}
      `;
    } else {
      all.sort((a,b) => b.kills - a.kills || a.deaths - b.deaths);
      rows.innerHTML = `
        <div class="sb-row head"><span>#</span><span>Player</span><span>K</span><span>D</span><span>Score</span></div>
        ${all.map((p, i) => this._sbRow(p, i+1, s.player, "")).join("")}
      `;
    }
  }

  _sbRow(p, rank, you, extra) {
    const cls = (p === you ? "you " : "") + (p.alive ? "" : "dead ") + extra;
    return `<div class="sb-row ${cls}"><span>${rank}</span><span>${p.name}${p.isBot ? " (BOT)" : ""}</span><span>${p.kills}</span><span>${p.deaths}</span><span>${p.score|0}</span></div>`;
  }

  toggleScoreboard(show) {
    this.scoreboard.classList.toggle("hidden", !show);
  }
}
  return { HUD };
})();

// ── modes.js ──
G.modes = (() => {
  const THREE = window.THREE;
  const { HALF } = G.world;
// Game mode rules: Solo, 1v1 Duel, Team Deathmatch, Battle Royale.


class ModeBase {
  constructor(api) { this.api = api; this.over = false; this.winner = null; }
  init() {}
  update(_dt) {}
  onKill(_killer, _victim) {}
  shouldRespawn() { return true; }
  getHudInfo() { return ""; }
  scoreboardTeams() { return false; }
}

class SoloMode extends ModeBase {
  constructor(api) { super(api); this.killGoal = 15; }
  init() {
    // Mix bots, all FFA (each on own team).
    for (let i = 0; i < this.api.cfg.bots; i++) {
      this.api.addBot({ team: "bot" + i });
    }
    this.api.player.team = "you";
  }
  onKill(killer, victim) {
    killer.kills++; killer.score += 100;
    if (killer === this.api.player && killer.kills >= this.killGoal) {
      this.over = true; this.winner = killer;
    }
    // Bots also can win.
    if (killer.isBot && killer.kills >= this.killGoal) {
      this.over = true; this.winner = killer;
    }
  }
  getHudInfo() {
    return `SOLO · KILLS ${this.api.player.kills}/${this.killGoal}`;
  }
}

class DuelMode extends ModeBase {
  constructor(api) { super(api); this.targetRounds = 5; this.scoreYou = 0; this.scoreOpp = 0; }
  init() {
    // If no remote opponent, add a single tough bot.
    const hasRemote = this.api.cfg.multiplayer?.role && this.api.net.peerCount() > 0;
    if (!hasRemote) {
      const b = this.api.addBot({ team: "opp" });
      b.maxHealth = 120; b.health = 120;
    }
    this.api.player.team = "you";
  }
  onKill(killer, victim) {
    killer.kills++; killer.score += 100;
    if (killer === this.api.player) this.scoreYou++; else this.scoreOpp++;
    if (this.scoreYou >= Math.ceil(this.targetRounds / 2)) { this.over = true; this.winner = this.api.player; }
    else if (this.scoreOpp >= Math.ceil(this.targetRounds / 2)) { this.over = true; this.winner = victim === this.api.player ? killer : this.api.player; }
  }
  getHudInfo() { return `DUEL · ${this.scoreYou} – ${this.scoreOpp} (BO${this.targetRounds})`; }
}

class TDMMode extends ModeBase {
  constructor(api) { super(api); this.scoreGoal = 25; }
  init() {
    const size = this.api.cfg.teamSize || 2;
    this.api.player.team = "a";
    // Fill remaining slots with bots.
    for (let i = 1; i < size; i++) this.api.addBot({ team: "a" });
    for (let i = 0; i < size; i++) this.api.addBot({ team: "b" });
  }
  onKill(killer, victim) {
    killer.kills++; killer.score += 100;
    this[`team${killer.team.toUpperCase()}`] = (this[`team${killer.team.toUpperCase()}`] || 0) + 1;
    const a = this.teamA || 0, b = this.teamB || 0;
    if (a >= this.scoreGoal || b >= this.scoreGoal) {
      this.over = true;
      this.winner = a > b ? { name: "TEAM A", team: "a" } : { name: "TEAM B", team: "b" };
    }
  }
  scoreboardTeams() { return true; }
  getHudInfo() { return `TDM · A ${this.teamA||0} – B ${this.teamB||0} → ${this.scoreGoal}`; }
}

class BRMode extends ModeBase {
  constructor(api) {
    super(api);
    this.zoneCenter = new THREE.Vector3(0, 0, 0);
    this.zoneRadius = HALF * 0.9;
    this.nextCenter = new THREE.Vector3(0, 0, 0);
    this.nextRadius = HALF * 0.6;
    this.phase = "wait"; // wait → shrink → wait → shrink
    this.phaseEnd = 0;
    this.phaseT = 0;
    this.tick = 0;
  }
  init() {
    // All bots free-for-all.
    for (let i = 0; i < this.api.cfg.bots; i++) this.api.addBot({ team: "br" + i });
    this.api.player.team = "you";
    this._planNextZone();
    this.phase = "wait"; this.phaseEnd = 25;
  }
  _planNextZone() {
    const r = Math.max(8, this.zoneRadius * 0.55);
    const dx = (Math.random() - 0.5) * (this.zoneRadius - r) * 1.4;
    const dz = (Math.random() - 0.5) * (this.zoneRadius - r) * 1.4;
    this.nextCenter.set(this.zoneCenter.x + dx, 0, this.zoneCenter.z + dz);
    this.nextRadius = r;
  }
  update(dt) {
    this.phaseT += dt;
    // Damage outside zone.
    const dmgInterval = 0.5;
    this.tick += dt;
    if (this.tick > dmgInterval) {
      this.tick = 0;
      const dps = 4;
      const all = [this.api.player, ...this.api.bots];
      for (const e of all) {
        if (!e?.alive) continue;
        const d2 = (e.position.x - this.zoneCenter.x) ** 2 + (e.position.z - this.zoneCenter.z) ** 2;
        if (d2 > this.zoneRadius * this.zoneRadius) {
          e.takeDamage?.(dps);
          if (!e.alive && this.api.onZoneKill) this.api.onZoneKill(e);
        }
      }
    }

    // Phase progression.
    if (this.phaseT >= this.phaseEnd) {
      this.phaseT = 0;
      if (this.phase === "wait") {
        this.phase = "shrink";
        this.phaseEnd = 15;
        this._shrinkStart = { c: this.zoneCenter.clone(), r: this.zoneRadius };
      } else {
        this.zoneCenter.copy(this.nextCenter);
        this.zoneRadius = this.nextRadius;
        if (this.zoneRadius > 8) { this._planNextZone(); this.phase = "wait"; this.phaseEnd = 22; }
        else { this.phase = "end"; this.phaseEnd = Infinity; }
      }
    }
    if (this.phase === "shrink" && this._shrinkStart) {
      const t = Math.min(1, this.phaseT / 15);
      this.zoneCenter.lerpVectors(this._shrinkStart.c, this.nextCenter, t);
      this.zoneRadius = this._shrinkStart.r + (this.nextRadius - this._shrinkStart.r) * t;
    }

    // Last one standing?
    const alive = [this.api.player, ...this.api.bots].filter(e => e?.alive);
    if (alive.length === 1) {
      this.over = true;
      this.winner = alive[0];
    } else if (alive.length === 0) {
      this.over = true; this.winner = null;
    }
  }
  onKill(killer, _victim) { if (killer) { killer.kills++; killer.score += 100; } }
  zoneInfo() {
    return { x: this.zoneCenter.x, z: this.zoneCenter.z, r: this.zoneRadius, next: { x: this.nextCenter.x, z: this.nextCenter.z, r: this.nextRadius } };
  }
  getHudInfo() {
    const alive = [this.api.player, ...this.api.bots].filter(e => e?.alive).length;
    const sec = Math.max(0, Math.ceil(this.phaseEnd - this.phaseT));
    return `BR · ALIVE ${alive} · ${this.phase.toUpperCase()} ${sec}s`;
  }
}

function createMode(name, api) {
  switch (name) {
    case "solo": return new SoloMode(api);
    case "duel": return new DuelMode(api);
    case "tdm":  return new TDMMode(api);
    case "br":   return new BRMode(api);
  }
  return new SoloMode(api);
}
  return { ModeBase, SoloMode, DuelMode, TDMMode, BRMode, createMode };
})();

// ── net.js ──
G.net = (() => {
// PeerJS-based room-code multiplayer. Best-effort: state sync of remote players,
// shot events, and building placements. The host is authoritative for scores.
const PEER_PREFIX = "operationpolygon-";

function shortCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

class Net {
  constructor() {
    this.peer = null;
    this.role = null; // 'host' | 'guest'
    this.code = null;
    this.conns = new Map(); // id -> DataConnection
    this.onMessage = () => {};
    this.onPeerJoin = () => {};
    this.onPeerLeave = () => {};
  }

  peerCount() { return this.conns.size; }

  available() { return typeof window.Peer !== "undefined"; }

  async host() {
    if (!this.available()) throw new Error("PeerJS not loaded");
    if (this.peer) this.disconnect();
    const code = shortCode();
    this.code = code; this.role = "host";
    return new Promise((resolve, reject) => {
      const peer = new window.Peer(PEER_PREFIX + code);
      this.peer = peer;
      peer.on("open", (id) => resolve(code));
      peer.on("error", (err) => { reject(err); });
      peer.on("connection", (conn) => this._addConn(conn));
    });
  }

  async join(code) {
    if (!this.available()) throw new Error("PeerJS not loaded");
    if (this.peer) this.disconnect();
    this.role = "guest"; this.code = code;
    return new Promise((resolve, reject) => {
      const peer = new window.Peer();
      this.peer = peer;
      peer.on("open", () => {
        const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
        let opened = false;
        conn.on("open", () => { opened = true; this._addConn(conn); resolve(); });
        conn.on("error", (e) => { if (!opened) reject(e); });
        setTimeout(() => { if (!opened) reject(new Error("timeout")); }, 8000);
      });
      peer.on("error", (err) => reject(err));
    });
  }

  _addConn(conn) {
    this.conns.set(conn.peer, conn);
    conn.on("data", (data) => this.onMessage(conn.peer, data));
    conn.on("close", () => { this.conns.delete(conn.peer); this.onPeerLeave(conn.peer); });
    conn.on("error", () => { this.conns.delete(conn.peer); this.onPeerLeave(conn.peer); });
    this.onPeerJoin(conn.peer);
  }

  send(data, to = null) {
    if (!this.peer) return;
    const msg = data;
    if (to) {
      const c = this.conns.get(to);
      if (c && c.open) c.send(msg);
    } else {
      for (const c of this.conns.values()) if (c.open) c.send(msg);
    }
  }

  disconnect() {
    for (const c of this.conns.values()) try { c.close(); } catch {}
    this.conns.clear();
    try { this.peer?.destroy(); } catch {}
    this.peer = null;
    this.role = null; this.code = null;
  }
}
  return { Net };
})();

// ── player.js ──
G.player = (() => {
  const THREE = window.THREE;
  const { settings } = G.settings;
  const { moveWithCollision } = G.physics;
// First-person player controller (local human).



const GRAVITY = 28;
const JUMP_VEL = 9.2;
const WALK_SPEED = 5.4;
const SPRINT_MUL = 1.55;
const CROUCH_MUL = 0.55;
const AIR_CONTROL = 0.35;

class Player {
  constructor(camera, world, opts = {}) {
    this.camera = camera;
    this.world = world;
    this.team = opts.team || "a";
    this.name = opts.name || "You";
    this.isLocal = true;
    this.alive = true;

    this.position = new THREE.Vector3(0, 1.7, 0);
    this.velocity = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.onGround = false;
    this.crouching = false;
    this.sprinting = false;
    this.adsing = false;
    this.adsT = 0;            // 0..1
    this.viewBob = 0;
    this.capsule = { r: 0.4, h: 1.7 };
    this.maxHealth = 100;
    this.health = 100;
    this.shield = 0;
    this.materials = { wood: 0, stone: 0, metal: 0 };
    this.kills = 0; this.deaths = 0; this.score = 0;
    this.lastDamageT = 0;
    this.respawnAt = 0;

    this.recoilPitch = 0; this.recoilYaw = 0;
  }

  takeDamage(dmg, fromName = null) {
    if (!this.alive) return false;
    const block = Math.min(this.shield, dmg);
    this.shield -= block;
    this.health -= (dmg - block);
    this.lastDamageT = performance.now() / 1000;
    if (this.health <= 0) { this.alive = false; this.deaths++; return true; }
    return false;
  }

  giveMat(kind, amount) {
    this.materials[kind] = Math.min(999, (this.materials[kind] || 0) + amount);
  }
  takeMat(kind, amount) {
    if ((this.materials[kind] || 0) < amount) return false;
    this.materials[kind] -= amount;
    return true;
  }

  reset(spawn) {
    this.position.copy(spawn);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.shield = 0;
    this.alive = true;
    this.adsing = false; this.adsT = 0;
  }

  update(dt, input, structures) {
    if (!this.alive) return;
    // Look
    const sens = settings.sensitivity * 0.0022 * (this.adsing ? settings.adsSensMul : 1);
    this.yaw -= input.mdx * sens;
    this.pitch -= input.mdy * sens * (settings.invertY ? -1 : 1);
    this.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.pitch));

    // Recoil decay
    this.recoilPitch *= Math.pow(0.001, dt);
    this.recoilYaw *= Math.pow(0.001, dt);

    // Movement input
    const fwd = (input.actions.has("forward") ? 1 : 0) - (input.actions.has("back") ? 1 : 0);
    const str = (input.actions.has("right") ? 1 : 0) - (input.actions.has("left") ? 1 : 0);
    this.crouching = input.actions.has("crouch");
    this.sprinting = input.actions.has("sprint") && fwd > 0 && !this.adsing && !this.crouching;
    const speed = WALK_SPEED * (this.sprinting ? SPRINT_MUL : 1) * (this.crouching ? CROUCH_MUL : 1) * (this.adsing ? 0.7 : 1);

    // Build wishvel in local then rotate by yaw
    const wishX = str, wishZ = -fwd;
    const len = Math.hypot(wishX, wishZ) || 1;
    const nx = wishX / len, nz = wishZ / len;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const wvx = (nx * cy - nz * sy) * speed * (fwd || str ? 1 : 0);
    const wvz = (nx * sy + nz * cy) * speed * (fwd || str ? 1 : 0);

    // Horizontal accel/friction
    const targetX = wvx, targetZ = wvz;
    const k = this.onGround ? 14 : (14 * AIR_CONTROL);
    this.velocity.x += (targetX - this.velocity.x) * Math.min(1, k * dt);
    this.velocity.z += (targetZ - this.velocity.z) * Math.min(1, k * dt);

    // Jump
    if (this.onGround && input.actionEdge.has("jump")) {
      this.velocity.y = JUMP_VEL;
      this.onGround = false;
    }

    // Gravity
    this.velocity.y -= GRAVITY * dt;

    // Collide with structures + world props (terrain ground handled below).
    const all = () => this.world.colliders.concat(structures.colliders);
    const wasY = this.position.y;
    this.onGround = moveWithCollision(this.position, this.velocity, dt, this.capsule, all);

    // Soft terrain ground: hills are gentle so a flat plane is fine for play.
    const groundY = 0;
    const floorY = groundY + this.capsule.h / 2;
    if (this.position.y < floorY) {
      this.position.y = floorY;
      this.velocity.y = 0;
      this.onGround = true;
    }

    // Crouch lowers eye height (just visually).
    const eyeH = this.crouching ? 1.15 : 1.55;

    // Camera bob
    const moving = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.onGround && moving > 0.5) {
      this.viewBob += dt * (this.sprinting ? 14 : 9);
    } else {
      this.viewBob *= Math.pow(0.001, dt);
    }
    const bobY = Math.sin(this.viewBob) * (this.sprinting ? 0.07 : 0.04) * (this.onGround ? 1 : 0);
    const bobX = Math.cos(this.viewBob * 0.5) * 0.04 * (this.onGround ? 1 : 0);

    // ADS lerp + FOV
    const adsTarget = this.adsing ? 1 : 0;
    this.adsT += (adsTarget - this.adsT) * Math.min(1, 14 * dt);

    // Apply to camera
    this.camera.position.set(this.position.x + bobX * Math.cos(this.yaw), this.position.y - this.capsule.h/2 + eyeH + bobY, this.position.z + bobX * Math.sin(this.yaw));
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch + this.recoilPitch, this.yaw + this.recoilYaw, 0);

    const baseFov = settings.fov;
    const targetFov = baseFov - 22 * this.adsT;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld(true);
  }
}
  return { Player };
})();

// ── shop.js ──
G.shop = (() => {
  const { economy, onEconomyChange, getCoins, addCoins, SKINS, CHARMS, BEAN_SKINS, CRATES, RARITY, priceFor, buySkin, buyCharm, openCrate, ownsSkin, ownsCharm, equipSkin, equipCharm } = G.economy;
  const { sounds } = G.sounds;
// Shop screen wiring + crate opening animation.


const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let beanOwnedKey = "ownedBeans";
let beanEquippedKey = "equippedBean";

// Bean inventory shim using existing economy save key (beans stored in same JSON).
function ensureBeanState() {
  if (!economy.ownedBeans) economy.ownedBeans = ["bn_classic"];
  if (!economy.equippedBean) economy.equippedBean = "bn_classic";
}
function ownsBean(id) { ensureBeanState(); return economy.ownedBeans.includes(id); }
function equipBean(id) {
  ensureBeanState();
  if (!ownsBean(id)) return false;
  economy.equippedBean = id;
  try { localStorage.setItem("op-polygon-economy-v1", JSON.stringify(economy)); } catch {}
  refreshAll();
  return true;
}
function buyBean(id) {
  ensureBeanState();
  const def = BEAN_SKINS.find(b => b.id === id);
  if (!def) return { ok: false, reason: "Unknown" };
  if (ownsBean(id)) return { ok: false, reason: "Already owned" };
  const price = priceFor(def);
  if (economy.coins < price) return { ok: false, reason: "Not enough coins" };
  economy.coins -= price;
  economy.ownedBeans.push(id);
  try { localStorage.setItem("op-polygon-economy-v1", JSON.stringify(economy)); } catch {}
  return { ok: true, price };
}

let currentWeaponTab = "rifle";

function initShop() {
  ensureBeanState();
  // Tabs.
  for (const t of $$("#shop .tab")) {
    t.addEventListener("click", () => {
      $$("#shop .tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      for (const p of $$("#shop .shop-tab")) p.classList.toggle("hidden", p.dataset.shoppanel !== t.dataset.shoptab);
      refreshAll();
    });
  }
  // Crate-open buttons.
  $("#crate-again").addEventListener("click", () => {
    const last = lastCrate;
    $("#crate-open").classList.add("hidden");
    if (last) openCrateAnim(last);
  });
  $("#crate-done").addEventListener("click", () => {
    $("#crate-open").classList.add("hidden");
    refreshAll();
  });

  onEconomyChange(refreshAll);
  refreshAll();
}

let lastCrate = null;

function refreshAll() {
  // Coin counters everywhere.
  const coin = getCoins();
  if ($("#coin-val")) $("#coin-val").textContent = coin;
  $$(".coin-val-2").forEach(el => el.textContent = coin);

  renderCrates();
  renderSkins();
  renderCharms();
  renderBeans();
  renderLoadout();
}

function renderCrates() {
  const list = $("#crates-list");
  if (!list) return;
  list.innerHTML = "";
  for (const c of CRATES) {
    const cls = c.id.includes("premium") ? "premium" : c.id.includes("charm") ? "charm" : c.id.includes("bean") ? "bean" : "";
    const card = document.createElement("div");
    card.className = "crate-card " + cls;
    card.innerHTML = `
      <div class="crate-art"></div>
      <h3>${c.name}</h3>
      <div class="muted small">${describePool(c.pool)}</div>
      <div class="price"><span class="coin-icon" style="margin-right:4px;vertical-align:-2px"></span>${c.cost}</div>
      <button class="open-btn">OPEN</button>
    `;
    card.querySelector(".open-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      if (getCoins() < c.cost) { flashToast("Not enough coins"); return; }
      openCrateAnim(c);
    });
    list.appendChild(card);
  }
}

function describePool(p) {
  if (p === "skins") return "Random gun skin · all rarities";
  if (p === "charms") return "Random gun charm · all rarities";
  if (p === "beans") return "Random bean character · all rarities";
  if (p === "all") return "Premium: boosted Epic & Legendary chance";
  return "";
}

function flashToast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 1500);
}

// ─── Crate opening animation ─────────────────────────────────
function openCrateAnim(crate) {
  // Roll first (deducts coins).
  const result = openCrate(crate);
  if (!result.ok) { flashToast(result.reason); return; }
  lastCrate = crate;
  refreshAll();
  sounds.uiOpen();

  $("#crate-open").classList.remove("hidden");
  $("#crate-result").classList.add("hidden");
  // Spin ticks.
  let tickCount = 0;
  const tickTimer = setInterval(() => {
    sounds.crateSpin();
    tickCount++;
    if (tickCount > 30) clearInterval(tickTimer);
  }, 130);

  // Build a fake spinning strip with random items, ending on the winner.
  const track = $("#crate-track");
  track.innerHTML = "";
  track.style.transition = "none";
  track.style.transform = "translateX(0)";

  const ITEMS = 60;
  const winIdx = 50;
  // Pool for fake items: from a wide set
  const pool = [];
  for (const w of Object.keys(SKINS)) for (const s of SKINS[w]) pool.push({ kind: "skin", weapon: w, def: s });
  for (const c of CHARMS) pool.push({ kind: "charm", def: c });
  for (const b of BEAN_SKINS) pool.push({ kind: "bean", def: b });

  for (let i = 0; i < ITEMS; i++) {
    const itm = i === winIdx ? result.item : pool[Math.floor(Math.random() * pool.length)];
    const cell = document.createElement("div");
    cell.className = "ci rar-" + itm.def.rarity;
    const color = itm.def.body || itm.def.color || 0x9aa3ad;
    cell.style.borderColor = rarityColor(itm.def.rarity);
    cell.innerHTML = `<div class="sw" style="background:${hex(color)}"></div>`;
    track.append(cell);
  }

  // After a tick, animate to position the winning cell under the marker.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      track.style.transition = "transform 4s cubic-bezier(0.15, 0.85, 0.05, 1)";
      const cellW = 110;
      const containerW = track.parentElement.clientWidth;
      const offset = winIdx * cellW + cellW / 2 - containerW / 2 + (Math.random() - 0.5) * 40;
      track.style.transform = `translateX(${-offset}px)`;
    });
  });

  setTimeout(() => {
    const r = $("#crate-result");
    r.className = "crate-result rar-" + result.rarity;
    const rar = RARITY[result.rarity];
    $("#crate-result-rarity").textContent = rar.name.toUpperCase();
    $("#crate-result-rarity").style.color = hex(rar.color);
    const c = $("#crate-result-card");
    c.style.color = hex(rar.color);
    const item = result.item;
    const color = item.def.body || item.def.color || 0x9aa3ad;
    c.innerHTML = `<div style="width:80px;height:80px;background:${hex(color)};border-radius:6px;box-shadow:0 0 20px ${hex(color)}"></div>`;
    const label = item.kind === "skin" ? `${item.def.name} (${item.weapon})`
      : item.kind === "charm" ? `${item.def.name} — Charm`
      : `${item.def.name} — Bean`;
    $("#crate-result-name").textContent = label;
    $("#crate-result-dupe").textContent = result.dupe ? `Duplicate — +${result.payout} coins refund` : "Added to inventory";
    r.classList.remove("hidden");
    sounds.crateReveal(result.rarity);
  }, 4200);
}

function hex(n) { return "#" + n.toString(16).padStart(6, "0"); }
function rarityColor(r) { return hex(RARITY[r].color); }

// ─── Gun skins ─────────────────────────────────────────────
function renderSkins() {
  const tabs = $("#skin-weapon-tabs");
  if (!tabs) return;
  tabs.innerHTML = "";
  for (const w of Object.keys(SKINS)) {
    const b = document.createElement("button");
    b.textContent = w.toUpperCase();
    if (w === currentWeaponTab) b.classList.add("active");
    b.addEventListener("click", () => { currentWeaponTab = w; renderSkins(); });
    tabs.append(b);
  }
  const list = $("#skins-list");
  list.innerHTML = "";
  for (const def of SKINS[currentWeaponTab]) {
    const owned = ownsSkin(currentWeaponTab, def.id);
    const equipped = economy.equippedSkin[currentWeaponTab] === def.id;
    const card = document.createElement("div");
    card.className = `item-card rar-${def.rarity} ${owned ? "owned" : "locked"} ${equipped ? "equipped" : ""}`;
    const swatch = hex(def.body);
    card.innerHTML = `
      <div class="preview"><div class="swatch" style="background:linear-gradient(135deg, ${swatch}, ${hex(def.accent)});box-shadow:${def.glow?`0 0 12px ${hex(def.glow)}`:'none'}"></div></div>
      <h4>${def.name}</h4>
      <span class="rar-tag rar-text-${def.rarity}">${RARITY[def.rarity].name}</span>
      ${equipped ? `<span class="badge eq">EQUIPPED</span>`
        : owned ? `<button class="equip-btn">EQUIP</button>`
        : `<span class="price"><span class="coin-icon" style="vertical-align:-2px"></span> ${priceFor(def)}</span>
           <button class="buy-btn">BUY</button>`}
    `;
    if (!owned) {
      card.querySelector(".buy-btn").addEventListener("click", () => {
        const r = buySkin(currentWeaponTab, def.id);
        if (!r.ok) flashToast(r.reason);
        else { flashToast(`Purchased ${def.name}`); refreshAll(); }
      });
    } else if (!equipped) {
      card.querySelector(".equip-btn").addEventListener("click", () => {
        equipSkin(currentWeaponTab, def.id); refreshAll();
      });
    }
    list.append(card);
  }
}

// ─── Charms ────────────────────────────────────────────────
function renderCharms() {
  const list = $("#charms-list");
  if (!list) return;
  list.innerHTML = "";
  for (const def of CHARMS) {
    const owned = ownsCharm(def.id);
    const card = document.createElement("div");
    card.className = `item-card rar-${def.rarity} ${owned ? "owned" : "locked"}`;
    card.innerHTML = `
      <div class="preview"><div class="swatch" style="background:${hex(def.color)};box-shadow:${def.glow?`0 0 12px ${hex(def.glow)}`:'none'}"></div></div>
      <h4>${def.name}</h4>
      <span class="rar-tag rar-text-${def.rarity}">${RARITY[def.rarity].name}</span>
      ${owned ? `<span class="badge eq">OWNED</span>`
        : `<span class="price"><span class="coin-icon" style="vertical-align:-2px"></span> ${priceFor(def)}</span>
           <button class="buy-btn">BUY</button>`}
    `;
    if (!owned) {
      card.querySelector(".buy-btn").addEventListener("click", () => {
        const r = buyCharm(def.id);
        if (!r.ok) flashToast(r.reason);
        else { flashToast(`Purchased ${def.name}`); refreshAll(); }
      });
    }
    list.append(card);
  }
}

// ─── Beans ─────────────────────────────────────────────────
function renderBeans() {
  const list = $("#beans-list");
  if (!list) return;
  ensureBeanState();
  list.innerHTML = "";
  for (const def of BEAN_SKINS) {
    const owned = ownsBean(def.id);
    const equipped = economy.equippedBean === def.id;
    const card = document.createElement("div");
    card.className = `item-card rar-${def.rarity} ${owned ? "owned" : "locked"} ${equipped ? "equipped" : ""}`;
    card.innerHTML = `
      <div class="preview"><div class="swatch" style="background:${hex(def.body)};border-radius:50% 50% 35% 35%;box-shadow:${def.glow?`0 0 12px ${hex(def.glow)}`:'none'}"></div></div>
      <h4>${def.name}</h4>
      <span class="rar-tag rar-text-${def.rarity}">${RARITY[def.rarity].name}</span>
      ${equipped ? `<span class="badge eq">EQUIPPED</span>`
        : owned ? `<button class="equip-btn">EQUIP</button>`
        : `<span class="price"><span class="coin-icon" style="vertical-align:-2px"></span> ${priceFor(def)}</span>
           <button class="buy-btn">BUY</button>`}
    `;
    if (!owned) {
      card.querySelector(".buy-btn").addEventListener("click", () => {
        const r = buyBean(def.id);
        if (!r.ok) flashToast(r.reason);
        else { flashToast(`Purchased ${def.name}`); refreshAll(); }
      });
    } else if (!equipped) {
      card.querySelector(".equip-btn").addEventListener("click", () => {
        equipBean(def.id); refreshAll();
      });
    }
    list.append(card);
  }
}

// ─── Loadout screen ────────────────────────────────────────
let loadoutWeaponTab = "rifle";
function renderLoadout() {
  const tabs = $("#loadout-weapon-tabs");
  if (!tabs) return;
  tabs.innerHTML = "";
  for (const w of Object.keys(SKINS)) {
    const b = document.createElement("button");
    b.textContent = w.toUpperCase();
    if (w === loadoutWeaponTab) b.classList.add("active");
    b.addEventListener("click", () => { loadoutWeaponTab = w; renderLoadout(); });
    tabs.append(b);
  }
  const content = $("#loadout-content");
  content.innerHTML = `
    <div class="ld-row">
      <div class="ld-col">
        <h4>SKIN</h4>
        <div id="ld-skins" class="item-grid"></div>
      </div>
      <div class="ld-col">
        <h4>CHARM</h4>
        <div id="ld-charms" class="item-grid"></div>
      </div>
    </div>
  `;
  // Owned skins for this weapon
  const ownedSkins = SKINS[loadoutWeaponTab].filter(s => ownsSkin(loadoutWeaponTab, s.id));
  const sList = $("#ld-skins");
  for (const def of ownedSkins) {
    const equipped = economy.equippedSkin[loadoutWeaponTab] === def.id;
    const card = document.createElement("div");
    card.className = `item-card rar-${def.rarity} owned ${equipped ? "equipped" : ""}`;
    card.innerHTML = `
      <div class="preview"><div class="swatch" style="background:linear-gradient(135deg, ${hex(def.body)}, ${hex(def.accent)});box-shadow:${def.glow?`0 0 12px ${hex(def.glow)}`:'none'}"></div></div>
      <h4>${def.name}</h4>
      <span class="rar-tag rar-text-${def.rarity}">${RARITY[def.rarity].name}</span>
      ${equipped ? `<span class="badge eq">EQUIPPED</span>` : `<button class="equip-btn">EQUIP</button>`}
    `;
    if (!equipped) card.querySelector(".equip-btn").addEventListener("click", () => { equipSkin(loadoutWeaponTab, def.id); renderLoadout(); refreshAll(); });
    sList.append(card);
  }
  // Owned charms
  const cList = $("#ld-charms");
  const noneCard = document.createElement("div");
  const noCharm = !economy.equippedCharm[loadoutWeaponTab];
  noneCard.className = `item-card ${noCharm ? "equipped" : "owned"}`;
  noneCard.innerHTML = `<div class="preview"><div class="swatch" style="background:#22272e;opacity:0.5"></div></div><h4>No Charm</h4>${noCharm?`<span class="badge eq">EQUIPPED</span>`:`<button class="equip-btn">EQUIP</button>`}`;
  if (!noCharm) noneCard.querySelector(".equip-btn").addEventListener("click", () => { equipCharm(loadoutWeaponTab, null); renderLoadout(); });
  cList.append(noneCard);
  for (const def of CHARMS) {
    if (!ownsCharm(def.id)) continue;
    const equipped = economy.equippedCharm[loadoutWeaponTab] === def.id;
    const card = document.createElement("div");
    card.className = `item-card rar-${def.rarity} owned ${equipped ? "equipped" : ""}`;
    card.innerHTML = `
      <div class="preview"><div class="swatch" style="background:${hex(def.color)};box-shadow:${def.glow?`0 0 12px ${hex(def.glow)}`:'none'}"></div></div>
      <h4>${def.name}</h4>
      <span class="rar-tag rar-text-${def.rarity}">${RARITY[def.rarity].name}</span>
      ${equipped ? `<span class="badge eq">EQUIPPED</span>` : `<button class="equip-btn">EQUIP</button>`}
    `;
    if (!equipped) card.querySelector(".equip-btn").addEventListener("click", () => { equipCharm(loadoutWeaponTab, def.id); renderLoadout(); });
    cList.append(card);
  }

  // Owned beans below.
  ensureBeanState();
  const bList = $("#loadout-beans");
  if (!bList) return;
  bList.innerHTML = "";
  for (const def of BEAN_SKINS) {
    if (!ownsBean(def.id)) continue;
    const equipped = economy.equippedBean === def.id;
    const card = document.createElement("div");
    card.className = `item-card rar-${def.rarity} owned ${equipped ? "equipped" : ""}`;
    card.innerHTML = `
      <div class="preview"><div class="swatch" style="background:${hex(def.body)};border-radius:50% 50% 35% 35%;box-shadow:${def.glow?`0 0 12px ${hex(def.glow)}`:'none'}"></div></div>
      <h4>${def.name}</h4>
      <span class="rar-tag rar-text-${def.rarity}">${RARITY[def.rarity].name}</span>
      ${equipped ? `<span class="badge eq">EQUIPPED</span>` : `<button class="equip-btn">EQUIP</button>`}
    `;
    if (!equipped) card.querySelector(".equip-btn").addEventListener("click", () => { equipBean(def.id); renderLoadout(); refreshAll(); });
    bList.append(card);
  }
}

function getEquippedBean() {
  ensureBeanState();
  return BEAN_SKINS.find(b => b.id === economy.equippedBean) || BEAN_SKINS[0];
}
  return { initShop, refreshAll, getEquippedBean };
})();

// ── menu.js ──
G.menu = (() => {
  const { settings, saveSettings, resetSettings, KEYBIND_LABELS, keyName } = G.settings;
  const { MAPS } = G.maps;
  const { initShop } = G.shop;
  const { sounds } = G.sounds;
// Menu / settings / mode-select wiring.




const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SCREENS = ["menu", "play", "settings", "howto", "pause", "endscreen", "shop", "loadout", "crate-open"];

function showScreen(id) {
  for (const s of SCREENS) {
    const el = document.getElementById(s);
    if (!el) continue;
    el.classList.toggle("hidden", s !== id);
  }
}

function hideAllScreens() {
  for (const s of SCREENS) document.getElementById(s)?.classList.add("hidden");
}

function initMenus(api) {
  // Top-level menu buttons.
  for (const btn of $$("#menu .menu-buttons button[data-screen]")) {
    btn.addEventListener("click", () => { sounds.uiClick(); showScreen(btn.dataset.screen); });
  }
  $("#quit-btn")?.addEventListener("click", () => {
    document.body.innerHTML = "<div style='color:#aaa;font-family:sans-serif;text-align:center;margin-top:40vh'>Thanks for playing.<br><small>Close the tab to exit.</small></div>";
  });

  // Back buttons.
  for (const btn of $$("[data-back]")) {
    btn.addEventListener("click", () => {
      const t = btn.dataset.back;
      if (t === "auto") {
        showScreen(api.inMatch ? "pause" : "menu");
      } else showScreen(t);
    });
  }

  initModeSelect(api);
  initSettings();
  initPause(api);
  initEnd(api);
  initShop();
}

// ─── Mode select ─────────────────────────────────────────────
let selectedMode = null;
let multiplayerCfg = { role: null, code: null };

function initModeSelect(api) {
  // Populate map dropdown.
  const mapSel = $("#mc-map");
  for (const m of MAPS) {
    const opt = document.createElement("option");
    opt.value = m.id; opt.textContent = m.name;
    mapSel.append(opt);
  }
  const refreshMapDesc = () => {
    const m = MAPS.find(x => x.id === mapSel.value) || MAPS[0];
    $("#mc-map-desc").textContent = m.desc;
  };
  mapSel.addEventListener("change", refreshMapDesc);
  refreshMapDesc();

  for (const card of $$(".mode-card")) {
    card.addEventListener("click", () => {
      for (const c of $$(".mode-card")) c.classList.remove("sel");
      card.classList.add("sel");
      selectedMode = card.dataset.mode;
      const cfg = $("#mode-config");
      cfg.classList.remove("hidden");
      $("#mc-title").textContent = card.querySelector("h3").textContent;
      $("#mc-team-row").classList.toggle("hidden", selectedMode !== "tdm");
      const isMulti = (selectedMode === "duel" || selectedMode === "tdm");
      $("#mc-multi").classList.toggle("hidden", !isMulti);
      const defaults = { solo: 7, duel: 0, tdm: 2, br: 15 };
      $("#mc-bots").value = defaults[selectedMode];
      $("#mc-bots-val").textContent = defaults[selectedMode];
      multiplayerCfg = { role: null, code: null };
      $("#mc-room").textContent = "";
    });
  }
  $("#mc-bots").addEventListener("input", (e) => $("#mc-bots-val").textContent = e.target.value);

  const setMpStatus = (text, cls = "") => {
    const el = $("#mc-room");
    el.textContent = text;
    el.className = "mp-status " + cls;
  };

  $("#mc-host").addEventListener("click", async () => {
    sounds.uiClick();
    setMpStatus("Hosting…", "wait");
    try {
      const code = await api.net.host();
      multiplayerCfg = { role: "host", code };
      setMpStatus(`ROOM: ${code} — share & wait for friend`, "wait");
      api.net.onPeerJoin = () => {
        setMpStatus(`ROOM: ${code} — FRIEND CONNECTED · click START`, "ok");
        sounds.pickup();
      };
    } catch (e) {
      setMpStatus("Host failed: " + (e?.type || e?.message || "broker error"), "err");
    }
  });

  const joinCode = $("#mc-join-code");
  joinCode.addEventListener("input", () => {
    joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
  const doJoin = async () => {
    const code = joinCode.value.trim().toUpperCase();
    if (!code || code.length < 4) { setMpStatus("Enter a code (4+ chars)", "err"); return; }
    sounds.uiClick();
    setMpStatus(`Connecting to ${code}…`, "wait");
    try {
      await api.net.join(code);
      multiplayerCfg = { role: "guest", code };
      setMpStatus(`CONNECTED to ${code} — waiting for host to start…`, "ok");
      sounds.pickup();
      // Guest auto-starts on host's "matchstart" message (handled in main.js).
    } catch (e) {
      setMpStatus("Join failed: " + (e?.type || e?.message || "timeout"), "err");
    }
  };
  $("#mc-join").addEventListener("click", doJoin);
  joinCode.addEventListener("keydown", (e) => { if (e.key === "Enter") doJoin(); });

  $("#mc-start").addEventListener("click", () => {
    if (!selectedMode) return;
    sounds.uiClick();
    const cfg = {
      mode: selectedMode,
      mapId: $("#mc-map").value,
      bots: +$("#mc-bots").value,
      teamSize: +$("#mc-team").value,
      multiplayer: multiplayerCfg,
    };
    // If host, tell guest(s) to start with the same config.
    if (multiplayerCfg.role === "host" && api.net.peerCount() > 0) {
      api.net.send({ t: "matchstart", cfg });
    }
    api.startMatch(cfg);
  });
}

// ─── Settings panel ──────────────────────────────────────────
function bindRange(id, key, fmt = (v) => v) {
  const el = $("#" + id);
  const val = $("#" + id + "-val");
  el.value = settings[key];
  if (val) val.textContent = fmt(settings[key]);
  el.addEventListener("input", () => {
    settings[key] = +el.value;
    if (val) val.textContent = fmt(settings[key]);
    saveSettings();
  });
}
function bindCheck(id, key) {
  const el = $("#" + id);
  el.checked = settings[key];
  el.addEventListener("change", () => { settings[key] = el.checked; saveSettings(); });
}
function bindSelect(id, key) {
  const el = $("#" + id);
  el.value = settings[key];
  el.addEventListener("change", () => { settings[key] = el.value; saveSettings(); });
}

function initSettings() {
  // Tabs.
  for (const t of $$("#settings .tab")) {
    t.addEventListener("click", () => {
      for (const x of $$("#settings .tab")) x.classList.remove("active");
      t.classList.add("active");
      for (const p of $$("#settings .tab-panel")) p.classList.toggle("hidden", p.dataset.tabpanel !== t.dataset.tab);
    });
  }
  bindRange("s-sens", "sensitivity", (v) => (+v).toFixed(2));
  bindRange("s-adsens", "adsSensMul", (v) => (+v).toFixed(2));
  bindRange("s-fov", "fov", (v) => v + "°");
  bindCheck("s-invy", "invertY");
  bindCheck("s-tads", "toggleADS");
  bindSelect("s-quality", "quality");
  bindRange("s-rscale", "renderScale", (v) => (+v).toFixed(2) + "x");
  bindCheck("s-shadow", "shadows");
  bindCheck("s-particles", "particles");
  bindCheck("s-showfps", "showFps");
  bindRange("s-vol-master", "volMaster", (v) => Math.round(v * 100) + "%");
  bindRange("s-vol-sfx", "volSfx", (v) => Math.round(v * 100) + "%");
  bindRange("s-vol-music", "volMusic", (v) => Math.round(v * 100) + "%");

  renderKeybinds();

  $("#s-reset").addEventListener("click", () => {
    if (!confirm("Reset all settings to defaults?")) return;
    resetSettings();
    // Re-read into UI.
    location.reload();
  });
}

function renderKeybinds() {
  const wrap = $("#keybinds");
  wrap.innerHTML = "";
  for (const action of Object.keys(KEYBIND_LABELS)) {
    const row = document.createElement("div");
    row.className = "kb-row";
    const label = document.createElement("label");
    label.textContent = KEYBIND_LABELS[action];
    const btn = document.createElement("button");
    btn.textContent = keyName(settings.keybinds[action]);
    btn.addEventListener("click", () => bindKey(action, btn));
    row.append(label, btn);
    wrap.append(row);
  }
}
function bindKey(action, btn) {
  btn.classList.add("binding");
  btn.textContent = "press a key…";
  const handler = (e) => {
    e.preventDefault(); e.stopPropagation();
    window.removeEventListener("keydown", handler, true);
    btn.classList.remove("binding");
    if (e.code === "Escape") {
      btn.textContent = keyName(settings.keybinds[action]);
      return;
    }
    settings.keybinds[action] = e.code;
    saveSettings();
    btn.textContent = keyName(e.code);
  };
  window.addEventListener("keydown", handler, true);
}

// ─── Pause / End ─────────────────────────────────────────────
function initPause(api) {
  $("#resume-btn").addEventListener("click", () => api.resume());
  $("#psettings-btn").addEventListener("click", () => showScreen("settings"));
  $("#exit-btn").addEventListener("click", () => api.exitToMenu());
}
function initEnd(api) {
  $("#end-again").addEventListener("click", () => api.replay());
  $("#end-menu").addEventListener("click", () => api.exitToMenu());
}

// ─── Toast ──────────────────────────────────────────────────
let toastT = null;
function toast(msg, ms = 1800) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.add("hidden"), ms);
}
  return { showScreen, hideAllScreens, initMenus, toast };
})();

// ── main.js ──
G.main = (() => {
  const THREE = window.THREE;
  const { settings, onSettingsChange } = G.settings;
  const { Input } = G.input;
  const { initMenus, showScreen, hideAllScreens, toast } = G.menu;
  const { World } = G.world;
  const { Player } = G.player;
  const { Weapon, WEAPONS, raycastShot } = G.weapons;
  const { BuildSystem, STRUCT } = G.building;
  const { EditMode } = G.edit;
  const { Bot } = G.bots;
  const { HUD } = G.hud;
  const { FX } = G.effects;
  const { Net } = G.net;
  const { createMode } = G.modes;
  const { GunCharm } = G.charms;
  const { buildBean, animateBean } = G.beans;
  const { economy, awardMatch, getEquippedSkin, getEquippedCharm, BEAN_SKINS } = G.economy;
  const { getEquippedBean, refreshAll: refreshShop } = G.shop;
  const { sounds } = G.sounds;
// Game orchestrator: scene, loop, glue for everything.



















sounds.bindUnlock();

const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = settings.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Colour space setting — Three.js renamed the API around r152. Support both.
if ("outputColorSpace" in renderer && THREE.SRGBColorSpace !== undefined) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else if ("outputEncoding" in renderer && THREE.sRGBEncoding !== undefined) {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 600);
scene.add(camera);

const input = new Input();
const net = new Net();
// Always-on message handler — handles matchstart even before our own match
// has started, then delegates to handleNetMessage for in-match traffic.
net.onMessage = (peerId, msg) => handleNetMessage(peerId, msg);

// Loadout: rifle, pistol, sniper, banana, pickaxe
const LOADOUT = ["rifle", "pistol", "sniper", "banana", "pickaxe"];

let world, player, build, edit, hud, fx, mode;
let bots = [];
let remotePlayers = new Map();
let running = false;
let paused = false;
let inMatch = false;
let endTimer = 0;
let lastT = performance.now() / 1000;

let activeSlot = 0;      // index into LOADOUT
let weapon = null;       // current Weapon (or null for pickaxe)
let charm = null;        // current GunCharm
let lastKillT = 0;       // killstreak window
let killStreak = 0;
let damageDirs = [];     // recent damage sources (for direction arrows)
let prevQuickKeys = { z: false, x: false, c: false };

const fpsEl = document.getElementById("fps-counter");
let fpsAcc = 0, fpsFrames = 0;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const scale = settings.renderScale || 1;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = w + "px";
  renderer.domElement.style.height = h + "px";
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * scale);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

onSettingsChange((s) => {
  renderer.shadowMap.enabled = s.shadows;
  resize();
  fpsEl.classList.toggle("hidden", !s.showFps);
});

const api = {
  net,
  inMatch: false,
  startMatch(cfg) { startMatch(cfg); },
  resume() { setPaused(false); },
  exitToMenu() { teardown(); showScreen("menu"); refreshShop(); },
  replay() { if (api._lastCfg) { teardown(); startMatch(api._lastCfg); } },
};
initMenus(api);
showScreen("menu");
fpsEl.classList.toggle("hidden", !settings.showFps);

// Equip a weapon from the loadout by slot index.
function equipSlot(idx) {
  if (idx < 0 || idx >= LOADOUT.length) return;
  if (build.active) { build.setActive(false); hud?.setBuildMode(false); }
  activeSlot = idx;
  hud?.setSelectedSlot(idx);
  // Detach prior weapon + charm.
  if (weapon) { weapon.remove(); weapon = null; }
  if (charm) { charm.remove(); charm = null; }
  const slotId = LOADOUT[idx];
  if (slotId === "pickaxe") return;
  const skin = getEquippedSkin(slotId);
  weapon = new Weapon(scene, camera, slotId, skin);
  const charmDef = getEquippedCharm(slotId);
  if (charmDef) charm = new GunCharm(scene, weapon.charmAnchor, charmDef);
}

function startMatch(cfg) {
  api._lastCfg = cfg;
  api.cfg = cfg;
  api.inMatch = true;
  inMatch = true; paused = false; running = true;
  endTimer = 0;
  killStreak = 0; lastKillT = 0;
  damageDirs = [];

  // Clear stale remote-player entries so re-spawning doesn't reference
  // destroyed Three groups from a previous match (or pre-game lobby).
  for (const r of remotePlayers.values()) { try { scene.remove(r.group); } catch {} }
  remotePlayers.clear();

  while (scene.children.length > 0) scene.remove(scene.children[0]);
  scene.add(camera);

  world = new World(scene, { shadows: settings.shadows, mapId: cfg.mapId || "outpost" });
  api.world = world;

  player = new Player(camera, world);
  player.name = "You";
  api.player = player;

  build = new BuildSystem(scene, world, player, {
    onPlace: (msg) => net.send({ t: "build", ...msg }),
  });
  api.build = build;

  edit = new EditMode(scene, build, camera);
  api.edit = edit;

  fx = new FX(scene);
  api.fx = fx;

  bots = []; api.bots = bots;
  api.addBot = (opts) => {
    const b = new Bot(scene, world, opts);
    b.setPos(world.pickSpawn([player.position, ...bots.map(x => x.position)]));
    bots.push(b);
    return b;
  };
  api.onZoneKill = (e) => {
    pushKill("THE ZONE", e.name, false, e === player);
    if (e === player) onPlayerDied();
  };

  mode = createMode(cfg.mode, api);
  mode.init();
  api.mode = mode;

  player.reset(world.pickSpawn([], 30));
  player.materials.wood = 100;
  player.materials.stone = 50;
  player.materials.metal = 20;

  // Equip starting weapon.
  activeSlot = 0;
  equipSlot(0);

  if (mode.zoneInfo) {
    api.zoneMesh = makeZoneMesh();
    scene.add(api.zoneMesh);
  } else { api.zoneMesh = null; }

  document.getElementById("hud").classList.remove("hidden");
  document.getElementById("scope").classList.add("hidden");
  hideAllScreens();
  hud = new HUD(() => buildHudState());
  api.hud = hud;
  hud.setLoadout(LOADOUT);
  hud.setModeInfo(mode.getHudInfo());

  // onMessage stays the same (handleNetMessage); just hook join/leave for HUD.
  net.onPeerJoin = (id) => { toast(`Player joined (${id.slice(0,6)})`); ensureRemotePlayer(id); };
  net.onPeerLeave = (id) => { toast(`Player left`); const r = remotePlayers.get(id); if (r) { scene.remove(r.group); remotePlayers.delete(id); } };

  canvas.addEventListener("click", lockOnce);
  input.requestLock(canvas);

  lastT = performance.now() / 1000;
  requestAnimationFrame(loop);
}

function lockOnce() {
  if (!inMatch || paused) return;
  input.requestLock(canvas);
}

function teardown() {
  // Award coins if not already done by showEnd.
  if (player && !player._awarded) {
    const won = mode?.winner === player || (mode?.winner && mode.winner.team === player.team);
    const earned = awardMatch({ kills: player.kills, won: !!won });
    if (earned) toast(`+${earned} coins`);
    player._awarded = true;
  }
  running = false;
  inMatch = false; api.inMatch = false;
  input.exitLock();
  canvas.removeEventListener("click", lockOnce);
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("scope").classList.add("hidden");
  for (const r of remotePlayers.values()) scene.remove(r.group);
  remotePlayers.clear();
  if (weapon) { weapon.remove(); weapon = null; }
  if (charm) { charm.remove(); charm = null; }
  while (scene.children.length > 0) scene.remove(scene.children[0]);
}

function setPaused(p) {
  paused = p;
  if (p) { input.exitLock(); showScreen("pause"); }
  else { hideAllScreens(); document.getElementById("hud").classList.remove("hidden"); input.requestLock(canvas); }
}

function loop() {
  if (!running) return;
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - lastT);
  lastT = now;

  if (!paused) tick(dt, now);

  renderer.render(scene, camera);

  if (settings.showFps) {
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc > 0.5) { fpsEl.textContent = Math.round(fpsFrames / fpsAcc); fpsAcc = 0; fpsFrames = 0; }
  }

  requestAnimationFrame(loop);
}

function tick(dt, now) {
  const f = input.frame();

  if (f.actionEdge.has("pause")) { setPaused(!paused); return; }

  // Weapon switching via slot keys (1..5). In build mode 1/2/3 swap materials
  // (handled below) rather than swapping weapons.
  if (!build.active) {
    for (let i = 0; i < LOADOUT.length; i++) {
      const slot = `slot${i + 1}`;
      if (f.actionEdge.has(slot)) equipSlot(i);
    }
  }

  // 1v1.lol-style fast build keys (Z/X/C) — place on key-down edge.
  const z = input.keys.has("KeyZ");
  const x = input.keys.has("KeyX");
  const c = input.keys.has("KeyC");
  if (z && !prevQuickKeys.z) quickBuild(STRUCT.WALL);
  if (x && !prevQuickKeys.x) quickBuild(STRUCT.FLOOR);
  if (c && !prevQuickKeys.c) quickBuild(STRUCT.RAMP);
  prevQuickKeys = { z, x, c };

  // Build toggle (Q): enter cursor-driven build mode.
  if (f.actionEdge.has("build")) {
    build.setActive(!build.active);
    hud?.setBuildMode(build.active);
    if (build.active) {
      // Hide weapon viewmodel while building cursor active.
      if (weapon) weapon.group.visible = false;
    } else {
      if (weapon) weapon.group.visible = true;
    }
  }

  // Material switching while in build (1/2/3 also toggle slot — guard).
  if (build.active) {
    // 1/2/3 set material (overrides slot switch while in build mode).
    if (f.actionEdge.has("slot1")) build.setMat("wood");
    if (f.actionEdge.has("slot2")) build.setMat("stone");
    if (f.actionEdge.has("slot3")) build.setMat("metal");
    if (f.wheel !== 0) build.cycleKind(f.wheel > 0 ? 1 : -1);
  }

  // Edit mode (G).
  if (f.actionEdge.has("edit")) {
    if (edit.active) edit.apply();
    else edit.enter();
  }

  // Reload (the actual SFX is fired by the wasReloading edge below).
  if (f.actionEdge.has("reload") && weapon) weapon.startReload();
  // Jump sound on the keydown edge while grounded.
  if (f.actionEdge.has("jump") && player.onGround) sounds.jump();

  // ADS toggle/hold.
  const canADS = weapon && !build.active;
  if (canADS) {
    if (settings.toggleADS) {
      if (f.rightEdge) player.adsing = !player.adsing;
    } else {
      player.adsing = input.mouse.right;
    }
  } else { player.adsing = false; }

  // Sniper scope overlay.
  const scoping = canADS && weapon && weapon.def.scope && player.adsing && player.adsT > 0.6;
  document.getElementById("scope").classList.toggle("hidden", !scoping);
  if (weapon) weapon.group.visible = !scoping && !build.active;

  hud?.toggleScoreboard(input.isDown("scoreboard"));

  // Player physics + look.
  player.update(dt, { mdx: f.mdx, mdy: f.mdy, actions: input.actions, actionEdge: f.actionEdge }, build);

  // Edit-mode mouse click.
  if (edit.active && f.leftEdge) { edit.click(); }
  // Build ghost + place.
  else if (build.active) {
    build.updateGhost(camera);
    if (f.leftEdge) {
      const placed = build.tryPlace();
      if (placed) {
        fx.placeBurst(placed.mesh.position.clone(), 0xf2c94c);
        sounds.place(placed.mat);
      } else {
        sounds.uiClick();
      }
    }
  } else {
    // Shooting or pickaxe.
    const slotId = LOADOUT[activeSlot];
    if (slotId === "pickaxe") {
      // Pickaxe: harvest closest harvestable in front, on click + cooldown.
      if (f.leftEdge || (input.mouse.left && (!player._pickT || now - player._pickT > 0.45))) {
        player._pickT = now;
        pickaxeSwing(now);
      }
    } else if (weapon && player.alive) {
      const canFire = weapon.def.auto ? input.mouse.left : f.leftEdge;
      if (canFire && weapon.tryShoot(now, player.adsing)) {
        sounds.shoot(weapon.def.id);
        fireBullet(now);
      } else if (canFire && weapon.mag === 0 && !weapon.reloading) {
        // dry click — only on the edge, not auto-fire
        if (f.leftEdge) sounds.uiClick();
      }
      // Harvest by holding E (alternative method).
      if (input.isDown("interact")) {
        const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
        const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
        const hit = raycastShot(scene, origin, dir, []);
        if (hit && hit.distance < 3) {
          const idx = hit.object.userData?.harvestIdx;
          if (idx !== undefined && (!player._meleeT || now - player._meleeT > 0.35)) {
            player._meleeT = now;
            const yld = world.damageHarvest(idx, 25);
            if (yld) {
              player.giveMat(yld.kind, yld.amount);
              fx.placeBurst(hit.point, yld.kind === "wood" ? 0xc08a4a : yld.kind === "stone" ? 0xb6b8bb : 0x6ab0e0);
              sounds.harvest();
            }
          }
        }
      }
    }
  }

  // Detect auto-reload (empty mag → tryShoot triggers reload) and play SFX.
  if (weapon) {
    const wasReloading = weapon._sfxReloading || false;
    if (weapon.reloading && !wasReloading) sounds.reload();
    weapon._sfxReloading = weapon.reloading;
  }
  if (weapon) weapon.update(dt, player.adsT);
  if (charm) charm.update(dt);

  // Bots tick.
  const targets = [player, ...bots];
  for (const b of bots) {
    const r = b.update(dt, targets, world, build);
    if (r && r.fired) {
      const from = r.from.clone();
      const to = from.clone().addScaledVector(r.dir, 80);
      fx.tracer(from, to, 0xff8866);
      if (r.hit && r.target) {
        const dead = r.target.takeDamage(r.dmg, b.name);
        if (r.target === player) {
          hud?.flashDamage();
          showDamageDir(b.position);
          sounds.hitTaken();
        }
        const pt = r.target.position.clone(); pt.y += 1.2;
        fx.bloodPuff(pt);
        if (dead) onKill(b, r.target);
      }
    }
  }

  // Respawns (skip BR).
  if (mode.constructor.name !== "BRMode") {
    if (!player.alive && now > player.respawnAt) respawnPlayer();
    for (const b of bots) {
      if (!b.alive && now > b.respawnAt) {
        b.respawn(world.pickSpawn([player.position, ...bots.filter(x => x.alive).map(x => x.position)]));
      }
    }
  }

  fx.update(dt);
  mode.update(dt);
  hud?.setModeInfo(mode.getHudInfo());

  if (mode.zoneInfo) {
    const z = mode.zoneInfo();
    if (api.zoneMesh) {
      api.zoneMesh.position.set(z.x, 0.05, z.z);
      api.zoneMesh.scale.set(z.r, 1, z.r);
    }
    const inside = (player.position.x - z.x) ** 2 + (player.position.z - z.z) ** 2 < z.r * z.r;
    hud?.setZoneInfo(inside ? `ZONE · phase ${mode.phase}` : `OUTSIDE ZONE — MOVE`, !inside);
  } else { hud?.setZoneInfo(""); }

  // Multiplayer state heartbeat ~12Hz.
  if (net.peer && net.peerCount() > 0) {
    if (!api._netT || now - api._netT > 1/12) {
      api._netT = now;
      const beanId = economy.equippedBean || "bn_classic";
      net.send({
        t: "state", n: player.name,
        x: player.position.x, y: player.position.y, z: player.position.z,
        yw: player.yaw, pt: player.pitch,
        hp: player.health, alive: player.alive, team: player.team,
        bean: beanId,
      });
    }
  }

  // Remote interpolation.
  for (const r of remotePlayers.values()) {
    if (!r.group) continue;
    r.group.position.lerp(r.target, Math.min(1, dt * 12));
    r.group.rotation.y = r.yaw + Math.PI;
  }

  hud?.update();
  updateDamageDirArrows(dt);

  if (mode.over) {
    endTimer += dt;
    if (endTimer > 1.2) showEnd();
  }
}

// ─── Quick build (1v1.lol style) ────────────────────────────
function quickBuild(kind) {
  if (!build || edit.active) return;
  // Temporarily switch the build kind, place, restore.
  const prev = build.kind;
  build.kind = kind;
  build.setActive(true);
  build.updateGhost(camera);
  const placed = build.tryPlace();
  if (placed) {
    fx.placeBurst(placed.mesh.position.clone(), 0xf2c94c);
    sounds.place(placed.mat);
  }
  // Auto-exit build mode (so user keeps shooting flow).
  build.setActive(false);
  build.kind = prev;
  hud?.setBuildMode(false);
  if (weapon) weapon.group.visible = true;
}

// ─── Pickaxe ────────────────────────────────────────────────
function pickaxeSwing(now) {
  const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const hit = raycastShot(scene, origin, dir, []);
  if (hit && hit.distance < 3.6) {
    const idx = hit.object.userData?.harvestIdx;
    if (idx !== undefined) {
      const yld = world.damageHarvest(idx, 40);
      if (yld) {
        player.giveMat(yld.kind, Math.round(yld.amount * 1.5));
        fx.placeBurst(hit.point, yld.kind === "wood" ? 0xc08a4a : yld.kind === "stone" ? 0xb6b8bb : 0x6ab0e0);
        sounds.harvest();
      }
    } else {
      // Pickaxe also damages structures lightly.
      if (build.structures.find(s => s && s.mesh === hit.object)) {
        build.damageMesh(hit.object, 35);
        fx.hitSparks(hit.point, 0xddddff);
      }
      // Or deals minor melee damage to bots in range.
      const botRef = hit.object.userData?.botRef;
      if (botRef && botRef.alive) {
        const dead = botRef.takeDamage(35);
        fx.bloodPuff(hit.point); hud?.showHitmarker();
        if (dead) onKill(player, botRef);
      }
    }
  }
}

// ─── Bullet ─────────────────────────────────────────────────
function fireBullet(now) {
  const def = weapon.def;
  player.recoilPitch += def.recoilP * (player.adsing ? 0.4 : 1);
  player.recoilYaw += (Math.random() - 0.5) * def.recoilY * (player.adsing ? 0.4 : 1);

  const origin = new THREE.Vector3(); camera.getWorldPosition(origin);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const sp = weapon.spread(player.adsing);
  dir.x += (Math.random() - 0.5) * sp;
  dir.y += (Math.random() - 0.5) * sp;
  dir.z += (Math.random() - 0.5) * sp;
  dir.normalize();

  const hit = raycastShot(scene, origin, dir, []);
  const tracerEnd = hit ? hit.point.clone() : origin.clone().addScaledVector(dir, def.range);
  const muzzle = weapon.worldMuzzlePos();
  fx.tracer(muzzle, tracerEnd, def.scope ? 0xfff4c0 : 0xffe28a);

  if (hit) {
    const botRef = hit.object.userData?.botRef;
    if (botRef && botRef.alive) {
      const dist = origin.distanceTo(hit.point);
      const dmg = def.dmg * (1 - Math.min(0.65, dist / def.range * (1 - def.dmgFalloff)));
      const head = hit.point.y > botRef.position.y + 1.55;
      const final = head ? dmg * 2 : dmg;
      const dead = botRef.takeDamage(final);
      fx.bloodPuff(hit.point);
      hud?.showHitmarker(head);
      sounds.hitmarker(head);
      net.send({ t: "shot", x: muzzle.x, y: muzzle.y, z: muzzle.z, ex: tracerEnd.x, ey: tracerEnd.y, ez: tracerEnd.z });
      if (dead) onKill(player, botRef);
      return;
    }
    if (build.structures.find(s => s && s.mesh === hit.object)) {
      build.damageMesh(hit.object, def.dmg);
      fx.hitSparks(hit.point, 0xddddff);
      return;
    }
    const idx = hit.object.userData?.harvestIdx;
    if (idx !== undefined) {
      const yld = world.damageHarvest(idx, def.dmg * 0.4);
      if (yld) { player.giveMat(yld.kind, yld.amount); fx.placeBurst(hit.point, yld.kind === "wood" ? 0xc08a4a : yld.kind === "stone" ? 0xb6b8bb : 0x6ab0e0); }
      return;
    }
    fx.hitSparks(hit.point, 0xffddaa);
  }

  net.send({ t: "shot", x: muzzle.x, y: muzzle.y, z: muzzle.z, ex: tracerEnd.x, ey: tracerEnd.y, ez: tracerEnd.z });
}

function pushKill(killerName, victimName, isYouKiller, isYouVictim) {
  hud?.addKill(killerName, victimName, isYouKiller, isYouVictim);
}

const STREAK_LABELS = [null, null, "DOUBLE KILL", "TRIPLE KILL", "QUAD KILL", "RAMPAGE", "UNSTOPPABLE", "GODLIKE"];

function onKill(killer, victim) {
  mode.onKill(killer, victim);
  pushKill(killer.name || "Bot", victim.name || "Bot", killer === player, victim === player);
  if (killer === player) {
    sounds.kill();
    const now = performance.now() / 1000;
    if (now - lastKillT < 4.5) killStreak++; else killStreak = 1;
    lastKillT = now;
    if (STREAK_LABELS[killStreak]) showStreak(STREAK_LABELS[killStreak]);
  }
  if (victim === player) { sounds.death(); onPlayerDied(); killStreak = 0; }
  else if (!mode || mode.constructor.name !== "BRMode") {
    victim.respawnAt = performance.now() / 1000 + 2.5;
  }
}
function onPlayerDied() {
  player.respawnAt = performance.now() / 1000 + (mode.constructor.name === "BRMode" ? Infinity : 2.5);
}
function respawnPlayer() {
  player.reset(world.pickSpawn([player.position, ...bots.map(b => b.position)], 25));
}

function showStreak(label) {
  const el = document.getElementById("streak");
  el.textContent = label;
  el.classList.remove("hidden");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add("hidden"), 1600);
}

function showDamageDir(srcPos) {
  damageDirs.push({ pos: srcPos.clone(), t: 1.2, elm: null });
}
function updateDamageDirArrows(dt) {
  const wrap = document.getElementById("dmg-dirs");
  if (!wrap) return;
  for (let i = damageDirs.length - 1; i >= 0; i--) {
    const d = damageDirs[i];
    d.t -= dt;
    if (d.t <= 0) {
      if (d.elm) d.elm.remove();
      damageDirs.splice(i, 1);
      continue;
    }
    if (!d.elm) {
      d.elm = document.createElement("div");
      d.elm.className = "dmg-arrow";
      wrap.append(d.elm);
    }
    // Angle from player view to damage source on horizontal plane.
    const dx = d.pos.x - player.position.x;
    const dz = d.pos.z - player.position.z;
    const ang = Math.atan2(dx, -dz) - player.yaw;
    d.elm.style.transform = `rotate(${ang}rad)`;
  }
}

function makeZoneMesh() {
  const ringG = new THREE.RingGeometry(0.985, 1, 64);
  ringG.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xf2c94c, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
  const fg = new THREE.CircleGeometry(1, 48);
  fg.rotateX(-Math.PI / 2);
  const fill = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0x56cc8b, transparent: true, opacity: 0.05, side: THREE.DoubleSide }));
  fill.position.y = -0.02;
  const grp = new THREE.Group();
  grp.add(ring); grp.add(fill);
  grp.userData.noRay = true; ring.userData.noRay = true; fill.userData.noRay = true;
  return grp;
}

function buildHudState() {
  return {
    player, weapon,
    entities: bots.concat([...remotePlayers.values()].map(r => r._proxy)),
    teams: mode?.scoreboardTeams?.(),
    zone: mode?.zoneInfo?.(),
  };
}

// ─── Networking ─────────────────────────────────────────────
function ensureRemotePlayer(id) {
  if (remotePlayers.has(id)) return;
  // Spawn a generic bean for the remote until first state message arrives.
  const skin = BEAN_SKINS[0];
  const g = buildBean(skin);
  g.traverse((m) => { m.castShadow = true; m.userData.remoteId = id; });
  scene.add(g);
  remotePlayers.set(id, {
    group: g, target: g.position.clone(), yaw: 0, beanId: skin.id,
    _proxy: { name: "Remote", team: "remote", isBot: false, alive: true, kills: 0, deaths: 0, score: 0, position: g.position },
  });
}

function setRemoteBean(r, beanId) {
  if (r.beanId === beanId) return;
  const skin = BEAN_SKINS.find(b => b.id === beanId) || BEAN_SKINS[0];
  const oldPos = r.group.position.clone();
  scene.remove(r.group);
  r.group = buildBean(skin);
  r.group.position.copy(oldPos);
  r.group.traverse((m) => { m.castShadow = true; });
  scene.add(r.group);
  r.beanId = beanId;
}

function handleNetMessage(peerId, msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.t === "matchstart") {
    // Host triggered the match. Start ours with their config.
    if (!api.inMatch) startMatch(msg.cfg);
    return;
  }
  if (msg.t === "state") {
    let r = remotePlayers.get(peerId);
    if (!r) { ensureRemotePlayer(peerId); r = remotePlayers.get(peerId); }
    if (msg.bean && msg.bean !== r.beanId) setRemoteBean(r, msg.bean);
    r.target.set(msg.x, msg.y - 0.85, msg.z);
    r.yaw = msg.yw || 0;
    r._proxy.name = msg.n || "Remote";
    r._proxy.team = msg.team || "remote";
    r._proxy.alive = !!msg.alive;
    r._proxy.position.copy(r.target);
    const moving = msg.move !== false;
    animateBean(r.group, moving, 6);
  } else if (msg.t === "shot") {
    fx?.tracer(new THREE.Vector3(msg.x, msg.y, msg.z), new THREE.Vector3(msg.ex, msg.ey, msg.ez), 0xffe28a);
  } else if (msg.t === "build") {
    build?.place(msg.kind, msg.mat, new THREE.Vector3(msg.x, msg.y, msg.z), msg.ry || 0, true);
  } else if (msg.t === "hit") {
    if (msg.victim === "me") {
      const dead = player.takeDamage(msg.dmg, msg.from);
      hud?.flashDamage();
      if (dead) onPlayerDied();
    }
  }
}

function showEnd() {
  // Coins awarded here, not on teardown (so the toast appears with the end screen).
  if (player && !player._awarded) {
    const won = mode.winner === player || (mode.winner && mode.winner.team === player.team);
    const earned = awardMatch({ kills: player.kills, won: !!won });
    if (earned) toast(`+${earned} coins`);
    player._awarded = true;
  }
  running = false;
  inMatch = false; api.inMatch = false;
  input.exitLock();
  const t = document.getElementById("end-title");
  const stats = document.getElementById("end-stats");
  const rows = document.getElementById("end-rows");
  const youWon = (mode.winner === player) || (mode.winner && mode.winner.team === player.team);
  t.textContent = youWon ? "VICTORY" : (mode.winner ? "DEFEAT" : "DRAW");
  t.classList.toggle("win", youWon); t.classList.toggle("lose", !youWon);
  stats.textContent = `Kills: ${player.kills} · Deaths: ${player.deaths} · Score: ${player.score|0} · Coins: ${economy.coins}`;
  const all = [player, ...bots, ...[...remotePlayers.values()].map(r => r._proxy)];
  all.sort((a,b) => b.kills - a.kills);
  rows.innerHTML = all.map((p, i) =>
    `<div class="sb-row ${p === player ? "you" : ""}"><span>${i+1}</span><span>${p.name}${p.isBot ? " (BOT)" : ""}</span><span>${p.kills}</span><span>${p.deaths}</span><span>${p.score|0}</span></div>`
  ).join("");
  showScreen("endscreen");
  refreshShop();
}
  return {};
})();

})();
