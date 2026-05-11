// Currency + inventory + crate roll logic. Persisted in localStorage.
const KEY = "op-polygon-economy-v1";

export const RARITY = {
  common:    { name: "Common",    color: 0x9aa3ad, weight: 60, payout: 25 },
  uncommon:  { name: "Uncommon",  color: 0x56cc8b, weight: 25, payout: 60 },
  rare:      { name: "Rare",      color: 0x4aa8e0, weight: 10, payout: 150 },
  epic:      { name: "Epic",      color: 0xb05ce0, weight: 4,  payout: 400 },
  legendary: { name: "Legendary", color: 0xf2c94c, weight: 1,  payout: 1000 },
};

// ─── Catalog ────────────────────────────────────────────────
// Skins per weapon (id, name, rarity, recolour spec).
export const SKINS = {
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
export const CHARMS = [
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
export const BEAN_SKINS = [
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
export const CRATES = [
  { id: "crate_skin",  name: "Gun Skin Crate",  cost: 250, pool: "skins" },
  { id: "crate_charm", name: "Charm Crate",     cost: 200, pool: "charms" },
  { id: "crate_bean",  name: "Bean Crate",      cost: 250, pool: "beans" },
  { id: "crate_premium", name: "Premium Crate", cost: 800, pool: "all", boost: true },
];

// ─── State ──────────────────────────────────────────────────
const DEFAULTS = {
  coins: 500, // starting kit
  ownedSkins: { pistol: ["ps_default"], rifle: ["rf_default"], sniper: ["sn_default"], banana: ["bn_default"] },
  ownedCharms: ["ch_cube"],
  equippedSkin: { pistol: "ps_default", rifle: "rf_default", sniper: "sn_default", banana: "bn_default" },
  equippedCharm: { pistol: null, rifle: "ch_cube", sniper: null, banana: null },
  loadout: ["rifle", "pistol", "sniper", "banana"], // hotbar order
  totals: { matches: 0, kills: 0, wins: 0, cratesOpened: 0 },
};

function _merge(base, over) {
  if (!over || typeof over !== "object") return base;
  const out = Array.isArray(base) ? over.slice() : { ...base };
  for (const k of Object.keys(over)) {
    if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k])) {
      out[k] = _merge(base[k] ?? {}, over[k]);
    } else { out[k] = over[k]; }
  }
  return out;
}

export const economy = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return _merge(JSON.parse(JSON.stringify(DEFAULTS)), JSON.parse(raw));
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULTS));
})();

const listeners = new Set();
export function onEconomyChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(economy)); } catch {}
  for (const fn of listeners) fn(economy);
}

// ─── API ────────────────────────────────────────────────────
export function getCoins() { return economy.coins; }
export function addCoins(n) { economy.coins = Math.max(0, economy.coins + Math.round(n)); save(); }
export function spendCoins(n) { if (economy.coins < n) return false; economy.coins -= n; save(); return true; }

export function ownsSkin(weapon, id) { return (economy.ownedSkins[weapon] || []).includes(id); }
export function ownsCharm(id) { return (economy.ownedCharms || []).includes(id); }

export function equipSkin(weapon, id) {
  if (!ownsSkin(weapon, id)) return false;
  economy.equippedSkin[weapon] = id; save(); return true;
}
export function equipCharm(weapon, id) {
  if (id && !ownsCharm(id)) return false;
  economy.equippedCharm[weapon] = id || null; save(); return true;
}

export function getEquippedSkin(weapon) {
  const id = economy.equippedSkin[weapon];
  return (SKINS[weapon] || []).find(s => s.id === id) || (SKINS[weapon] || [])[0];
}
export function getEquippedCharm(weapon) {
  const id = economy.equippedCharm[weapon];
  return CHARMS.find(c => c.id === id) || null;
}

export function buySkin(weapon, id) {
  const def = (SKINS[weapon] || []).find(s => s.id === id);
  if (!def) return { ok: false, reason: "Unknown" };
  if (ownsSkin(weapon, id)) return { ok: false, reason: "Already owned" };
  const price = priceFor(def);
  if (!spendCoins(price)) return { ok: false, reason: "Not enough coins" };
  economy.ownedSkins[weapon] = (economy.ownedSkins[weapon] || []).concat([id]);
  save();
  return { ok: true, price };
}
export function buyCharm(id) {
  const def = CHARMS.find(c => c.id === id);
  if (!def) return { ok: false, reason: "Unknown" };
  if (ownsCharm(id)) return { ok: false, reason: "Already owned" };
  const price = priceFor(def);
  if (!spendCoins(price)) return { ok: false, reason: "Not enough coins" };
  economy.ownedCharms = (economy.ownedCharms || []).concat([id]);
  save();
  return { ok: true, price };
}

export function priceFor(item) {
  const base = { common: 150, uncommon: 350, rare: 800, epic: 1800, legendary: 4500 };
  return base[item.rarity] || 100;
}

// Roll a random item from a crate. Returns { item, weapon?, dupe, payout }.
export function openCrate(crate) {
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
  save();
  return { ok: true, item: win, rarity, dupe, payout };
}

// Match rewards.
export function awardMatch({ kills, won }) {
  const earned = 50 + kills * 10 + (won ? 200 : 0);
  addCoins(earned);
  economy.totals.matches = (economy.totals.matches || 0) + 1;
  economy.totals.kills = (economy.totals.kills || 0) + kills;
  if (won) economy.totals.wins = (economy.totals.wins || 0) + 1;
  save();
  return earned;
}
