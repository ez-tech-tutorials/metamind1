(() => {
  const OPEN = [82.41, 110, 146.83, 196, 246.94, 329.63];

  let ctx;
  let master;
  let compressor;

  function ensure() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.72;
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 20;
    compressor.ratio.value = 3.5;
    master.connect(compressor);
    compressor.connect(ctx.destination);
  }

  async function resume() {
    ensure();
    if (ctx.state !== "running") await ctx.resume();
  }

  let activeSources = [];

  function pluck(freq, when, gain = 0.55) {
    if (freq <= 0) return;
    const period = Math.max(2, Math.round(ctx.sampleRate / freq));
    const seconds = 2.4;
    const length = Math.round(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const out = buffer.getChannelData(0);
    for (let i = 0; i < period; i += 1) out[i] = (Math.random() * 2 - 1) * 0.9;
    for (let i = period; i < length; i += 1) {
      const a = out[i - period];
      const b = out[i - period + 1] ?? a;
      out[i] = 0.991 * 0.5 * (a + b);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2800;
    const g = ctx.createGain();
    g.gain.value = gain;
    
    src.gainNode = g;
    
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(when);
    
    activeSources.push(src);
    src.onended = () => {
      activeSources = activeSources.filter(s => s !== src);
    };
  }

  function muteAll() {
    if (!ctx) return;
    const t = ctx.currentTime;
    activeSources.forEach(src => {
      try {
        if (src.gainNode) {
          src.gainNode.gain.cancelScheduledValues(t);
          src.gainNode.gain.setValueAtTime(src.gainNode.gain.value, t);
          src.gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        }
        src.stop(t + 0.1);
      } catch (e) {}
    });
    activeSources = [];
  }

  function fretFreq(stringIndex, fret) {
    if (fret < 0) return 0;
    return OPEN[stringIndex] * 2 ** (fret / 12);
  }

  function strum(frets, onLabel) {
    resume();
    const t = ctx.currentTime;
    frets.forEach((fret, stringIndex) => {
      if (fret < 0) return;
      pluck(fretFreq(stringIndex, fret), t + stringIndex * 0.016, 0.42 + stringIndex * 0.04);
    });
    if (onLabel) onLabel();
  }

  let fluteOsc = null;
  let fluteGainNode = null;

  function playBayan(when) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, when);
    osc.frequency.exponentialRampToValueAtTime(65, when + 0.35);
    gainNode.gain.setValueAtTime(0.7, when);
    gainNode.gain.exponentialRampToValueAtTime(0.001, when + 0.45);
    osc.connect(gainNode);
    gainNode.connect(master);
    osc.start(when);
    osc.stop(when + 0.5);
  }

  function playNa(when) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, when);
    gainNode.gain.setValueAtTime(0.5, when);
    gainNode.gain.exponentialRampToValueAtTime(0.001, when + 0.25);
    osc.connect(gainNode);
    gainNode.connect(master);
    osc.start(when);
    osc.stop(when + 0.3);
  }

  function playTin(when) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, when);
    gainNode.gain.setValueAtTime(0.45, when);
    gainNode.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
    osc.connect(gainNode);
    gainNode.connect(master);
    osc.start(when);
    osc.stop(when + 0.35);
  }

  function startFlute(freq) {
    resume();
    const t = ctx.currentTime;
    if (fluteOsc) {
      fluteOsc.frequency.setTargetAtTime(freq, t, 0.08);
      return;
    }
    fluteOsc = ctx.createOscillator();
    fluteGainNode = ctx.createGain();
    fluteOsc.type = "triangle";
    fluteOsc.frequency.setValueAtTime(freq, t);
    
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = 5.5;
    vibratoGain.gain.value = 3;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(fluteOsc.frequency);
    vibrato.start();
    fluteOsc.vibrato = vibrato;
    
    fluteGainNode.gain.setValueAtTime(0, t);
    fluteGainNode.gain.linearRampToValueAtTime(0.35, t + 0.08);
    fluteOsc.connect(fluteGainNode);
    fluteGainNode.connect(master);
    fluteOsc.start(t);
  }

  function stopFlute() {
    if (!fluteOsc) return;
    const t = ctx.currentTime;
    const osc = fluteOsc;
    const gainNode = fluteGainNode;
    fluteOsc = null;
    fluteGainNode = null;
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setValueAtTime(gainNode.gain.value, t);
    gainNode.gain.linearRampToValueAtTime(0, t + 0.1);
    setTimeout(() => {
      try {
        osc.stop();
        if (osc.vibrato) osc.vibrato.stop();
      } catch (e) {}
    }, 150);
  }

  window.SoundStudio = {
    resume,
    strum,
    muteAll,
    playTabla(kind) {
      resume();
      const t = ctx.currentTime;
      if (kind === "bayan") playBayan(t);
      else if (kind === "na") playNa(t);
      else if (kind === "tin") playTin(t);
    },
    startFlute,
    stopFlute
  };
})();
