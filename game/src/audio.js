// Frostline — all sound is synthesized with WebAudio: no audio files, no network.
// Engine hum, sirens, punches, crashes, chimes and wind.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.windGain = null;
    this.muted = false;
  }
  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      // Looping wind noise (filtered noise buffer) for the blizzard.
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 420;
      this.windGain = this.ctx.createGain(); this.windGain.gain.value = 0.05;
      src.connect(filt).connect(this.windGain).connect(this.ctx.destination);
      src.start();
    } catch { this.ctx = null; }
  }
  setWind(intensity) {
    if (this.windGain) this.windGain.gain.value = 0.02 + intensity * 0.09;
  }
  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t); o.stop(t + dur);
    } catch { /* audio is cosmetic */ }
  }
  punch() { this.blip(140, 0.09, 'sine', 0.25, 60); }
  crash() { this.blip(90, 0.25, 'sawtooth', 0.2, 40); }
  coin() { this.blip(880, 0.12, 'sine', 0.15, 1320); }
  mission() { this.blip(523, 0.15, 'triangle', 0.18); setTimeout(() => this.blip(784, 0.25, 'triangle', 0.18), 140); }
  busted() { this.blip(220, 0.5, 'sawtooth', 0.2, 110); }
  engineStart() {
    if (!this.ctx || this.engineOsc) return;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = 55;
    const g = this.ctx.createGain(); g.gain.value = 0.0;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
    o.connect(f).connect(g).connect(this.ctx.destination);
    o.start();
    this.engineOsc = o; this.engineGain = g;
  }
  engine(speed01, on) {
    if (!this.engineOsc) return;
    this.engineGain.gain.value = on ? 0.03 + speed01 * 0.05 : 0.0;
    this.engineOsc.frequency.value = 50 + speed01 * 130;
  }
  engineStop() {
    if (this.engineOsc) { try { this.engineOsc.stop(); } catch { /* already stopped */ } this.engineOsc = null; }
  }
  siren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      const g = this.ctx.createGain(); g.gain.value = 0.035;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.7;
      const lg = this.ctx.createGain(); lg.gain.value = 320;
      lfo.connect(lg).connect(o.frequency);
      o.frequency.value = 750;
      o.connect(g).connect(this.ctx.destination);
      o.start(); lfo.start();
      this.sirenOsc = o; this.sirenGain = g; this.sirenLfo = lfo;
    } else if (!on && this.sirenOsc) {
      try { this.sirenOsc.stop(); this.sirenLfo.stop(); } catch { /* already stopped */ }
      this.sirenOsc = null;
    }
  }
}
