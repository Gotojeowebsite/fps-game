// Menu / settings / mode-select wiring.
import { settings, saveSettings, resetSettings, KEYBIND_LABELS, keyName } from "./settings.js";
import { MAPS } from "./maps.js";
import { initShop } from "./shop.js";
import { sounds } from "./sounds.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SCREENS = ["menu", "play", "settings", "howto", "pause", "endscreen", "shop", "loadout", "crate-open"];

export function showScreen(id) {
  for (const s of SCREENS) {
    const el = document.getElementById(s);
    if (!el) continue;
    el.classList.toggle("hidden", s !== id);
  }
}

export function hideAllScreens() {
  for (const s of SCREENS) document.getElementById(s)?.classList.add("hidden");
}

export function initMenus(api) {
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
export function toast(msg, ms = 1800) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.add("hidden"), ms);
}
