// FROSTLINE — audio: every sound is synthesized in WebAudio. No audio files,
// no network. Starts on the first user gesture (browser autoplay rules).

var AudioSys = (function () {
  var ctx = null, master = null;
  var engineOsc = null, engineGain = null, engineFilter = null;
  var windSrc = null, windGain = null, windFilter = null;
  var sirenOsc = null, sirenGain = null, sirenLfo = null;
  var started = false;
  var muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Engine: a low sawtooth through a low-pass, pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      // Wind: looped noise through a band-pass, gain follows the blizzard.
      var len = ctx.sampleRate * 2;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      windSrc = ctx.createBufferSource();
      windSrc.buffer = buf; windSrc.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass'; windFilter.frequency.value = 480; windFilter.Q.value = 0.6;
      windGain = ctx.createGain(); windGain.gain.value = 0.05;
      windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
      windSrc.start();
      // Siren: a sine whose pitch wobbles, only while wanted.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 720;
      sirenLfo = ctx.createOscillator();
      sirenLfo.type = 'square'; sirenLfo.frequency.value = 1.6;
      var lfoGain = ctx.createGain(); lfoGain.gain.value = 190;
      sirenLfo.connect(lfoGain); lfoGain.connect(sirenOsc.frequency);
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start(); sirenLfo.start();
      started = true;
      return true;
    } catch (e) { return false; }
  }

  function resume() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }

  function blip(freq, dur, type, vol, when) {
    if (!ctx || muted) return;
    var t = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, freq) {
    if (!ctx || muted) return;
    var t = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 900;
    var g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  return {
    resume: resume,
    setMuted: function (m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    isMuted: function () { return muted; },
    // Called every frame: engine pitch from speed, wind from blizzard, siren from wanted.
    update: function (speed01, blizzard, wanted) {
      if (!ctx || muted) return;
      var t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(speed01 > 0.02 ? 0.05 + speed01 * 0.07 : 0, t, 0.1);
      engineOsc.frequency.setTargetAtTime(52 + speed01 * 130, t, 0.08);
      engineFilter.frequency.setTargetAtTime(280 + speed01 * 900, t, 0.1);
      windGain.gain.setTargetAtTime(0.02 + blizzard * 0.11, t, 0.4);
      windFilter.frequency.setTargetAtTime(380 + blizzard * 500, t, 0.4);
      sirenGain.gain.setTargetAtTime(wanted > 0 ? 0.035 : 0, t, 0.3);
    },
    punch: function () { noiseBurst(0.12, 0.35, 500); blip(90, 0.1, 'sine', 0.25); },
    swing: function () { noiseBurst(0.07, 0.1, 1800); },
    crash: function (hard) { noiseBurst(0.3, 0.15 + hard * 0.3, 420); },
    pickup: function () { blip(660, 0.12, 'sine', 0.2); blip(990, 0.18, 'sine', 0.2, 0.09); },
    missionComplete: function () {
      blip(523, 0.14, 'triangle', 0.22); blip(659, 0.14, 'triangle', 0.22, 0.12);
      blip(784, 0.22, 'triangle', 0.24, 0.24); blip(1046, 0.3, 'triangle', 0.22, 0.36);
    },
    busted: function () { blip(220, 0.5, 'sawtooth', 0.2); blip(165, 0.7, 'sawtooth', 0.2, 0.4); },
    steal: function () { blip(180, 0.08, 'square', 0.12); blip(240, 0.1, 'square', 0.12, 0.07); },
    click: function () { blip(880, 0.05, 'sine', 0.12); }
  };
})();
