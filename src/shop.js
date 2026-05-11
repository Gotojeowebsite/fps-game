// Shop screen wiring + crate opening animation.
import {
  economy, onEconomyChange, getCoins, addCoins,
  SKINS, CHARMS, BEAN_SKINS, CRATES, RARITY,
  priceFor, buySkin, buyCharm, openCrate, ownsSkin, ownsCharm,
  equipSkin, equipCharm,
} from "./economy.js";

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

export function initShop() {
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

export function refreshAll() {
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

  $("#crate-open").classList.remove("hidden");
  $("#crate-result").classList.add("hidden");

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

export function getEquippedBean() {
  ensureBeanState();
  return BEAN_SKINS.find(b => b.id === economy.equippedBean) || BEAN_SKINS[0];
}
