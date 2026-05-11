// Procedural Web Audio SFX. No audio files needed — every sound is
// synthesized in-browser. The AudioContext is lazily created on first
// user gesture (browser autoplay rules).
import { settings, onSettingsChange } from "./settings.js";

export class Sounds {
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

export const sounds = new Sounds();
