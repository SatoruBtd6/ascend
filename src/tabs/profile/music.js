export const Groove = {
  ctx: null, master: null, timer: null, step: 0, nextTime: 0, noise: null,
  bpm: 114,
  start() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) {
        this.ctx = new AC();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 4;
        this.master = this.ctx.createGain(); this.master.gain.value = 0.5;
        this.master.connect(comp); comp.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      this.ctx.resume();
      if (this.timer) return;
      this.step = 0; this.nextTime = this.ctx.currentTime + 0.08;
      this.timer = setInterval(() => this.schedule(), 25);
    } catch (e) { /* audio not available */ }
  },
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    try { this.ctx?.suspend(); } catch (e) { /* ignore */ }
  },
  schedule() {
    const sixteenth = 60 / this.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      // light swing on the off 16ths
      const t = this.nextTime + (this.step % 2 ? sixteenth * 0.12 : 0);
      this.playStep(this.step, t, sixteenth);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  },
  playStep(st, t, s16) {
    const b = st % 16, bar = Math.floor(st / 16);
    if (b % 4 === 0) this.kick(t);
    if (b === 4 || b === 12) this.clap(t);
    if (b % 4 === 2) this.hat(t, 0.16, 0.09);
    else if (b % 2 === 1) this.hat(t, 0.05, 0.03);
    // bass: syncopated octave line over Em7 / Am7 / Em7 / B7
    const roots = [28, 33, 28, 35]; // E1, A1, E1, B1
    const pat = { 0: 0, 3: 12, 6: 0, 7: 10, 10: 12, 11: 7, 14: 10 };
    if (pat[b] !== undefined) this.bass(t, roots[bar] + 12 + pat[b], s16 * (b === 0 ? 2.5 : 1.4));
    // chord stabs on the offbeats
    const chords = [[52, 55, 59, 62, 66], [57, 60, 64, 67, 71], [52, 55, 59, 62, 66], [59, 63, 66, 69]];
    if (b === 2 || b === 7 || b === 10) this.stab(t, chords[bar], s16 * 1.2);
    // shimmer arpeggio every other bar
    if (bar % 2 === 1 && b % 2 === 0) this.bell(t, chords[bar][(b / 2) % chords[bar].length] + 12);
  },
  hz: (m) => 440 * Math.pow(2, (m - 69) / 12),
  env(g, t, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); },
  kick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.9, 0.32); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.35);
  },
  noiseHit(t, type, freq, peak, dec) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain(); this.env(g, t, peak, dec);
    n.connect(f); f.connect(g); g.connect(this.master); n.start(t, Math.random() * 0.5); n.stop(t + dec + 0.02);
  },
  clap(t) { [0, 0.012, 0.024].forEach((d, i) => this.noiseHit(t + d, "bandpass", 1400, i === 2 ? 0.5 : 0.25, i === 2 ? 0.16 : 0.03)); },
  hat(t, peak, dec) { this.noiseHit(t, "highpass", 7500, peak, dec); },
  bass(t, midi, dur) {
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = this.hz(midi);
    f.type = "lowpass"; f.Q.value = 9; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  stab(t, notes, dur) {
    const f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = "lowpass"; f.Q.value = 6; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + dur);
    this.env(g, t, 0.07, dur); f.connect(g); g.connect(this.master);
    notes.forEach((m, i) => {
      const o = this.ctx.createOscillator(); o.type = "square"; o.frequency.value = this.hz(m); o.detune.value = i % 2 ? 6 : -6;
      o.connect(f); o.start(t); o.stop(t + dur + 0.02);
    });
  },
  bell(t, midi) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "triangle"; o.frequency.value = this.hz(midi);
    this.env(g, t, 0.05, 0.25); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.28);
  },
};

export const THEMES_MUSIC = {
  epic: { name: "Epic entrance", bpm: 92, wave: "sawtooth", bass: [36, 36, 43, 43, 41, 41, 39, 39], lead: [60, 63, 67, 72, 70, 67, 63, 60, 62, 65, 69, 74, 72, 69, 65, 62], drums: "kick" },
  hype: { name: "Hype trap", bpm: 140, wave: "square", bass: [33, 33, 33, 33, 31, 31, 36, 36], lead: [57, 60, 64, 60, 57, 60, 64, 67, 55, 59, 62, 59, 55, 59, 62, 66], drums: "trap" },
  bit: { name: "8-bit boss", bpm: 150, wave: "square", bass: [40, 40, 47, 47, 45, 45, 43, 43], lead: [64, 67, 71, 76, 74, 71, 67, 64, 66, 69, 73, 78, 76, 73, 69, 66], drums: "kick" },
  disco: { name: "Disco strut", bpm: 118, wave: "triangle", bass: [28, 40, 28, 40, 33, 45, 33, 45], lead: [64, 67, 71, 74, 69, 72, 76, 79, 64, 67, 71, 74, 71, 74, 78, 81], drums: "disco" },
  dark: { name: "Dark arrival", bpm: 80, wave: "sawtooth", bass: [29, 29, 29, 29, 32, 32, 27, 27], lead: [53, 56, 60, 56, 53, 51, 48, 51, 53, 56, 60, 63, 60, 56, 53, 51], drums: "kick" },
  lofi: { name: "Chill lo-fi", bpm: 84, wave: "triangle", bass: [38, 38, 41, 41, 43, 43, 36, 36], lead: [62, 65, 69, 72, 69, 65, 62, 60, 62, 65, 69, 74, 72, 69, 65, 62], drums: "soft" },
};
export const Jingle = {
  ctx: null, timer: null, master: null, id: null,
  hz: (m) => 440 * Math.pow(2, (m - 69) / 12),
  start(id, onEnd) {
    this.stop();
    const T = THEMES_MUSIC[id]; if (!T) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      this.ctx.resume();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ctx.destination);
      this.id = id;
      const step = 60 / T.bpm / 2, t0 = this.ctx.currentTime + 0.05, total = 32;
      for (let i = 0; i < total; i++) {
        const t = t0 + i * step;
        this.note(T.wave, T.lead[i % T.lead.length], t, step * 0.9, 0.16);
        if (i % 2 === 0) this.note("sawtooth", T.bass[(i / 2) % T.bass.length], t, step * 1.6, 0.22, 500);
        if (i % 4 === 0) this.kick(t);
        if (T.drums === "trap" && i % 2 === 1) this.hat(t, 0.05);
        if (T.drums === "disco" && i % 2 === 1) this.hat(t, 0.08);
        if ((T.drums === "kick" || T.drums === "disco") && i % 8 === 4) this.snare(t);
        if (T.drums === "soft" && i % 8 === 4) this.hat(t, 0.06);
      }
      if (id === "epic") { for (let i = 0; i < 4; i++) this.note("sawtooth", 48 + [0, 3, 7, 12][i], t0 + total * step - 1.2, 1.6, 0.14, 1400); }
      this.timer = setTimeout(() => { this.stop(); onEnd?.(); }, (total * step + 1.8) * 1000);
    } catch (e) { onEnd?.(); }
  },
  stop() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } try { this.master?.disconnect(); } catch (e) { /* ignore */ } this.master = null; this.id = null; },
  note(wave, midi, t, dur, vol, cutoff = 2600) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = wave; o.frequency.value = this.hz(midi); f.type = "lowpass"; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  kick(t) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.32); },
  noise(t, dur, vol, type, freq) { const b = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const n = this.ctx.createBufferSource(); n.buffer = b; const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(f); f.connect(g); g.connect(this.master); n.start(t); },
  hat(t, vol) { this.noise(t, 0.05, vol, "highpass", 7000); },
  snare(t) { this.noise(t, 0.16, 0.35, "bandpass", 1800); },
};
export const embedFor = (url) => {
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { kind: "YouTube", src: `https://www.youtube.com/embed/${yt[1]}?rel=0`, h: 200 };
  const sp = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
  if (sp) return { kind: "Spotify", src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}?theme=0`, h: sp[1] === "track" || sp[1] === "episode" ? 152 : 352 };
  const am = url.match(/music\.apple\.com\/(.+)/);
  if (am) return { kind: "Apple Music", src: `https://embed.music.apple.com/${am[1]}`, h: 175 };
  return null;
};
