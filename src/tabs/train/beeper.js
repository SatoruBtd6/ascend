export const Beeper = {
  ctx: null,
  unlock() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      this.ctx.resume();
    } catch (e) { /* no audio */ }
  },
  tone(freq, dur = 0.15, delay = 0, vol = 0.5) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "square"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  tick() { this.tone(660, 0.08, 0, 0.3); },
  work() { this.tone(1046, 0.14); this.tone(1318, 0.22, 0.16); },
  rest() { this.tone(523, 0.3); },
  done() { [0, 0.2, 0.4].forEach((d) => this.tone(1318, 0.16, d)); this.tone(1760, 0.5, 0.6); },
};

export const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;
