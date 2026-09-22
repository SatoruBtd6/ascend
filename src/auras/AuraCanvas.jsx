import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { hexRgb } from "../theme.js";
import { AURAS } from "./catalog.js";
import { noteStrikeFlash } from "./boltClock.js";
/* Particle recipes. Easy unlocks stay simple; rare ones stack more motion. Never shrink the ring so small that studio tiles go blank. */
export const AURA_FX = {
  ember: { spd: 1, glow: 0.6, layers: [{ k: "rise", n: 22, shape: "spark", c: ["#FFB86B", "#FF9340", "#FF4D6D"], sp: [18, 38], life: [1, 2.2], sz: [1.4, 2.6], sway: 10 }, { k: "rise", n: 8, shape: "dot", c: ["#FF9340", "#FF4D6D"], sp: [10, 20], life: [1.2, 2], sz: [3.2, 6], sway: 6, a: 0.55 }] },
  tide: { spd: 1, glow: 0.55, layers: [{ k: "bubble", n: 16, c: ["#9BE7FF", "#38C6FF"], sp: [12, 24], life: [1.6, 3], sz: [2.4, 5.2] }, { k: "orbit", n: 16, shape: "dot", c: ["#38C6FF", "#2F6BFF"], w: [0.7, 1.2], r: [0.95, 1.18], sz: [1.8, 3.2], wave: 0.08 }] },
  storm: { spd: 1.35, glow: 0.58, bolts: { every: [0.8, 1.8], c: ["#E6BFFF", "#B3ECFF"] }, layers: [{ k: "orbit", n: 28, shape: "spark", c: ["#B14BFF", "#38C6FF", "#E6BFFF"], w: [1.8, 2.8], r: [0.9, 1.22], sz: [1.3, 2.4] }, { k: "rise", n: 10, shape: "dot", c: ["#B14BFF", "#38C6FF"], sp: [16, 30], life: [0.8, 1.5], sz: [2, 4], sway: 8, a: 0.6 }] },
  inferno: { spd: 1.55, glow: 0.72, layers: [{ k: "rise", n: 32, shape: "dot", c: ["#FF2D6F", "#FF5A1F", "#FFB43C"], sp: [28, 54], life: [0.55, 1.15], sz: [3.2, 7.5], sway: 5, a: 0.85 }, { k: "rise", n: 18, shape: "spark", c: ["#FFE08A", "#FFB43C", "#FF4D00"], sp: [42, 78], life: [0.5, 1.1], sz: [1.1, 2], sway: 16 }] },
  halo: { spd: 1.2, glow: 0.78, rays: { n: 12, c: "#FFD447", spin: 0.22, len: 1.42, a: 0.18 }, layers: [{ k: "orbit", n: 22, shape: "dot", c: ["#FFF6C9", "#FFD447"], w: [0.4, 0.85], r: [1.02, 1.18], sz: [1.8, 3.4], tw: 1 }, { k: "orbit", n: 10, shape: "star", c: ["#FFFFFF", "#FFD447"], w: [0.7, 1.2], r: [1.08, 1.24], sz: [1, 1.8], tw: 1 }] },
  godray: { spd: 1.4, glow: 0.82, rays: { n: 16, c: "#DFFBFF", spin: -0.2, len: 1.55, a: 0.2 }, layers: [{ k: "rise", n: 22, shape: "star", c: ["#FFFFFF", "#7DF9FF"], sp: [12, 26], life: [1.2, 2.2], sz: [1.6, 3.2], sway: 4, tw: 1 }, { k: "orbit", n: 18, shape: "spark", c: ["#FFFFFF", "#7DF9FF"], w: [0.8, 1.6], r: [1, 1.28], sz: [1.2, 2.2] }] },
  smolder: { spd: 1.1, glow: 0.6, layers: [{ k: "rise", n: 10, shape: "smoke", c: ["#5A4A44", "#3A302C"], sp: [8, 16], life: [2.2, 3.4], sz: [8, 15], sway: 8, a: 0.35, blend: "source-over" }, { k: "rise", n: 26, shape: "spark", c: ["#FF6A2B", "#FFB070", "#FF8A3D"], sp: [12, 26], life: [1.4, 2.6], sz: [1.3, 2.3], sway: 12, flick: 1 }, { k: "orbit", n: 8, shape: "dot", c: ["#C2361A", "#FF6A2B"], w: [0.25, 0.45], r: [0.98, 1.08], sz: [2.2, 4], tw: 1 }] },
  stormborn: { spd: 1.45, glow: 0.4, bolts: { every: [1, 2.2], c: ["#FFFFFF", "#BFD6FF"], flash: 1 }, layers: [{ k: "fall", n: 34, shape: "drop", c: ["#BFD6FF", "#8FB8FF", "#E6F0FF"], sp: [90, 150], sz: [1, 1.7], drift: -16, a: 0.75 }, { k: "orbit", n: 8, shape: "spark", c: ["#FFFFFF", "#8FB8FF"], w: [1.2, 2], r: [1.05, 1.22], sz: [1, 1.8] }] },
  dawn: { spd: 1, glow: 0.62, rays: { n: 9, c: "#FFB978", spin: 0.1, len: 1.4, a: 0.2, fan: 1 }, layers: [{ k: "rise", n: 18, shape: "dot", c: ["#FFD36B", "#FF8A5B", "#FFE9C2"], sp: [10, 20], life: [1.6, 2.8], sz: [1.5, 2.8], sway: 6, tw: 1 }] },
  wanderer: { spd: 0.95, glow: 0.4, layers: [{ k: "orbit", n: 14, shape: "leaf", c: ["#7BC96F", "#A7D96C", "#E0B872"], w: [0.5, 0.95], r: [1, 1.28], sz: [2.6, 4.2], wave: 0.12 }, { k: "rise", n: 10, shape: "dot", c: ["#E0B872", "#F3DDB0"], sp: [8, 16], life: [1.5, 2.6], sz: [1.3, 2.4], sway: 10, a: 0.75 }] },
  wyrm: { spd: 1.5, glow: 0.64, layers: [{ k: "orbit", n: 24, shape: "shard", c: ["#3DF08A", "#B6FFD9", "#FFD447"], w: [1.1, 2], r: [0.94, 1.22], sz: [2.6, 4.6] }, { k: "rise", n: 16, shape: "spark", c: ["#3DF08A", "#FFD447"], sp: [22, 48], life: [0.7, 1.4], sz: [1.2, 2.1], sway: 12 }] },
  frost: { spd: 1.25, glow: 0.58, layers: [{ k: "fall", n: 26, shape: "flake", c: ["#FFFFFF", "#DDF6FF", "#B3ECFF"], sp: [16, 32], sz: [2.2, 4.2], drift: 10 }, { k: "orbit", n: 12, shape: "shard", c: ["#B3ECFF", "#FFFFFF"], w: [0.4, 0.8], r: [1, 1.18], sz: [2.6, 4.2] }] },
  abyss: { spd: 1.6, glow: 0.5, layers: [{ k: "inward", n: 28, shape: "dot", c: ["#6A00FF", "#B14BFF", "#FF2D6F"], sp: [0.55, 1.05], life: [1, 1.9], sz: [1.8, 3.8] }, { k: "orbit", n: 18, shape: "spark", c: ["#B14BFF", "#FF2D6F", "#38C6FF"], w: [1, 2.2], r: [0.94, 1.22], sz: [1.2, 2.2] }] },
  chud: { spd: 1, glow: 0.48, layers: [{ k: "orbit", n: 5, shape: "emoji", e: ["🍔", "🍟", "🍔", "🥤", "🍔"], w: [0.55, 0.55], r: [1.14, 1.14], sz: [0.18, 0.18], bob: 1, even: 1 }, { k: "rise", n: 10, shape: "smoke", c: ["#E9D9A6", "#C9B98A"], sp: [8, 14], life: [1.6, 2.6], sz: [4, 8], sway: 8, a: 0.35, blend: "source-over" }] },
  rust: { spd: 1.35, glow: 0.45, layers: [{ k: "fall", n: 28, shape: "square", c: ["#C7743A", "#E39A5E", "#F0B07A"], sp: [18, 34], sz: [1.7, 3.2], drift: 12, spin: 1 }, { k: "rise", n: 12, shape: "spark", c: ["#FFB86B", "#FF7A2D"], sp: [32, 64], life: [0.4, 0.9], sz: [1, 1.7], sway: 18 }] },
  thunder: { spd: 1.75, glow: 0.6, bolts: { every: [0.35, 0.9], c: ["#FFF27A", "#7DD3FC", "#FFFFFF"] }, layers: [{ k: "orbit", n: 26, shape: "spark", c: ["#7DD3FC", "#FFF27A", "#FFFFFF"], w: [2.2, 3.4], r: [0.94, 1.2], sz: [1.3, 2.3] }] },
  hollow: { spd: 1.2, glow: 0.52, layers: [{ k: "orbit", n: 16, shape: "shard", c: ["#9AA7BD", "#DDE6F2", "#FFFFFF"], w: [0.35, 0.7], r: [1, 1.26], sz: [3.2, 5.2] }, { k: "rise", n: 10, shape: "smoke", c: ["#8A94A6", "#5F6878"], sp: [6, 12], life: [1.8, 3], sz: [7, 13], sway: 6, a: 0.25, blend: "source-over" }] },
  deep: { spd: 1.4, glow: 0.58, layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/tentacle.webp", r: [1.18, 1.18], w: [0, 0], sz: [1, 1], even: 1, at: 0.38, rot: 0.1, wobble: 0.09, a: 0.85, behind: 1, blend: "source-over" },
    { k: "orbit", n: 1, shape: "img", src: "/aura/tentacle.webp", r: [1.1, 1.1], w: [0, 0], sz: [0.8, 0.8], even: 1, at: 0.62, rot: -0.16, flip: 1, wobble: 0.07, a: 0.62, behind: 1, blend: "source-over" },
    { k: "orbit", n: 1, shape: "img", src: "/aura/tentacle.webp", r: [1.22, 1.22], w: [0, 0], sz: [0.65, 0.65], even: 1, at: 0.08, rot: 0.28, wobble: 0.08, a: 0.5, behind: 1, blend: "source-over" },
    { k: "bubble", n: 18, c: ["#9BE7FF", "#00D9FF", "#6FA0FF"], sp: [14, 28], life: [1.3, 2.5], sz: [1.8, 5] },
    { k: "inward", n: 8, shape: "dot", c: ["#2F6BFF", "#00D9FF"], sp: [0.35, 0.65], life: [1.5, 2.4], sz: [1.3, 2.6] },
  ] },
  magma: { spd: 1.55, glow: 0.72, layers: [{ k: "rise", n: 24, shape: "dot", c: ["#FF5A1F", "#FFB43C", "#FFD447"], sp: [18, 38], life: [0.7, 1.4], sz: [3.2, 7], sway: 4, a: 0.88 }, { k: "rise", n: 12, shape: "spark", c: ["#FFE08A", "#FF5A1F"], sp: [28, 55], life: [0.5, 1], sz: [1, 1.8], sway: 12 }] },
  plague: { spd: 1.25, glow: 0.48, layers: [{ k: "rise", n: 12, shape: "smoke", c: ["#8BC34A", "#5E8C2A"], sp: [7, 14], life: [1.8, 3], sz: [7, 13], sway: 8, a: 0.3 }, { k: "bubble", n: 14, c: ["#C6F07A", "#8BC34A"], sp: [12, 22], life: [1.1, 2.2], sz: [1.8, 3.8] }] },
  sand: { spd: 1.65, glow: 0.46, layers: [{ k: "orbit", n: 40, shape: "dot", c: ["#E8C872", "#B8860B", "#F6E3A8"], w: [1.6, 2.8], r: [0.9, 1.38], sz: [1, 2], wave: 0.2, a: 0.92 }, { k: "fall", n: 12, shape: "square", c: ["#E8C872", "#C9962E"], sp: [22, 40], sz: [1.2, 2.2], drift: 16, spin: 1 }] },
  void: { spd: 1.5, glow: 0.66, dark: 1, layers: [{ k: "inward", n: 28, shape: "dot", c: ["#0B0014", "#1A0033", "#3A0A6A"], sp: [0.5, 0.9], life: [1.2, 2.1], sz: [3.2, 7], blend: "source-over", a: 0.9 }, { k: "orbit", n: 22, shape: "star", c: ["#FFFFFF", "#C9A8FF", "#7DF9FF"], w: [0.35, 0.8], r: [1.05, 1.34], sz: [1, 1.8], tw: 1 }] },
  yogurt: { spd: 0.95, glow: 0.42, layers: [{ k: "orbit", n: 3, shape: "emoji", e: ["🥣", "🥛", "🥣"], w: [0.5, 0.5], r: [1.14, 1.14], sz: [0.18, 0.18], bob: 1, even: 1 }, { k: "bubble", n: 12, c: ["#FFFFFF", "#FFF8E7"], sp: [8, 16], life: [1.4, 2.6], sz: [1.8, 3.6] }] },
  vendetta: { spd: 1.7, glow: 0.62, bolts: { every: [0.7, 1.5], c: ["#FF4D6D", "#FFB3C1"] }, layers: [{ k: "inward", n: 20, shape: "dot", c: ["#3A0010", "#5A0018", "#1A0008"], sp: [0.55, 1], life: [1, 1.8], sz: [2.6, 6], blend: "source-over", a: 0.85 }, { k: "rise", n: 22, shape: "spark", c: ["#FF1F4B", "#FF6B8F", "#FFB3C1"], sp: [20, 42], life: [0.7, 1.4], sz: [1.2, 2.2], sway: 8 }, { k: "orbit", n: 12, shape: "shard", c: ["#FF1F4B", "#8A0020"], w: [1.1, 1.8], r: [1, 1.2], sz: [2.6, 4.2] }] },
  champion: { spd: 1.45, glow: 0.68, rays: { n: 12, c: "#FFD447", spin: 0.28, len: 1.45, a: 0.18 }, sweep: { c: "#FFD447", a: 0.85, spd: 0.28, r: 1, w: 3.2, span: 0.55 }, layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/crown.webp", r: [1.02, 1.02], w: [0, 0], sz: [0.7, 0.7], even: 1, at: -0.25, bob: 1, wobble: 0.05, a: 0.98, blend: "source-over" },
    { k: "rise", n: 22, shape: "square", c: ["#FFD447", "#FF9340", "#FFF1B8"], sp: [16, 34], life: [1, 1.8], sz: [1.8, 3.2], sway: 14, spin: 1 },
    { k: "orbit", n: 10, shape: "star", c: ["#FFFFFF", "#FFD447"], w: [0.8, 1.4], r: [1.04, 1.2], sz: [1.1, 1.9], tw: 1 },
  ] },
  ascended: { spd: 1.25, glow: 0.28, art: "ophanim", rays: { n: 14, c: "#FFD447", spin: 0.48, len: 1.42, a: 0.2 }, bolts: { every: [0.5, 1.2], c: ["#7DF9FF", "#FFD447", "#FFFFFF"] }, layers: [
    { k: "orbit", n: 12, shape: "eye", c: ["#7DF9FF"], w: [0.7, 0.7], r: [1.12, 1.12], sz: [2.1, 2.1], even: 1 },
    { k: "orbit", n: 8, shape: "eye", c: ["#FFD447"], w: [-1.05, -1.05], r: [0.94, 0.94], sz: [2.4, 2.4], even: 1 },
    { k: "orbit", n: 14, shape: "star", c: ["#FFFFFF", "#FFD447", "#7DF9FF"], w: [0.5, 1.3], r: [1.04, 1.28], sz: [0.9, 1.6], tw: 1 },
    { k: "rise", n: 16, shape: "spark", c: ["#FFD447", "#FFFFFF", "#7DF9FF"], sp: [18, 40], life: [0.7, 1.4], sz: [0.9, 1.6], sway: 12 },
  ] },
  soon_throne: { spd: 1.15, glow: 0.55, rays: { n: 8, c: "#C9A8FF", spin: 0.16, len: 1.35, a: 0.16 }, layers: [{ k: "orbit", n: 16, shape: "dot", c: ["#C9A8FF", "#7DF9FF"], w: [0.5, 0.9], r: [1, 1.2], sz: [1.8, 3.2], tw: 1 }] },
  soon_seraphim: { spd: 1.2, glow: 0.58, rays: { n: 10, c: "#FFD447", spin: 0.2, len: 1.38, a: 0.16 }, layers: [{ k: "orbit", n: 14, shape: "star", c: ["#FFFFFF", "#FFD447"], w: [0.45, 0.85], r: [1.02, 1.2], sz: [1.2, 2.2], tw: 1 }] },
  // Hunter's Moon: pale moon behind, crimson mist, cold silver rings, a blade-slash sweep, ash and blood
  huntersmoon: { spd: 0.92, glow: 0.9, corona: { inner: "#E4E8F2", outer: "#7A0018" },
    sweep: { c: "#FFE9EC", a: 1, spd: 1.45, r: 1.12, w: 3.6, span: 0.46 },
    rays: { n: 6, c: "#E4E8F2", spin: 0.03, len: 1.4, a: 0.16 },
    rings: [{ r: 1.32, c: "#E4E8F2", spin: -0.05, a: 0.85, w: 1.3, ink: 1 }, { r: 1.12, c: "#C2001F", spin: 0.06, a: 0.96, w: 2.8, filigree: 12, ink: 1 }],
    layers: [
      { k: "rise", n: 12, shape: "smoke", c: ["#6E0014", "#B00020"], sp: [6, 14], life: [1.6, 2.8], sz: [3.2, 6], sway: 7, blend: "source-over", a: 0.5 },
      { k: "fall", n: 14, shape: "dot", c: ["#9AA3B2", "#E4E8F2"], sp: [10, 22], drift: 3, sz: [0.8, 1.4], blend: "source-over", a: 0.5 },
      { k: "rise", n: 9, shape: "ember", c: ["#FF6A3D", "#C2001F"], sp: [16, 30], life: [0.8, 1.6], sz: [1, 1.8], sway: 9, a: 0.8 },
      { k: "fall", n: 7, shape: "drop", c: ["#C2001F", "#7A0018"], sp: [26, 44], drift: 1.5, sz: [0.9, 1.6], blend: "source-over", a: 0.9 },
      { k: "orbit", n: 6, shape: "spark", c: ["#E4E8F2", "#FFFFFF"], w: [1.6, 2.4], r: [1, 1.18], sz: [1.1, 1.9], even: 1 },
    ] },
  // Living Wheel: wheels inside wheels, gold filigree, watching eyes on the rim
  wheel: { spd: 0.9, glow: 0.85,
    sweep: { c: "#FFF6C9", a: 0.95, spd: 0.7, r: 1.16, w: 3.4, span: 1 },
    rays: { n: 12, c: "#FFD447", spin: 0.04, len: 1.42, a: 0.26 },
    rings: [{ r: 1.34, c: "#7DF9FF", spin: -0.06, a: 0.8, w: 1.2, dash: 1, ink: 1 }, { r: 1.16, c: "#FFD447", spin: 0.09, a: 0.96, w: 3.2, filigree: 16, ink: 1 }, { r: 0.98, c: "#FFFFFF", spin: -0.14, a: 0.7, w: 1, ink: 1 }],
    layers: [
      { k: "orbit", n: 4, shape: "eye", c: ["#FFFFFF"], w: [0.22, 0.22], r: [1.16, 1.16], sz: [1.5, 1.5], even: 1, blend: "source-over", a: 0.9 },
      { k: "orbit", n: 8, shape: "gem", c: ["#FFD447", "#7DF9FF"], w: [-0.5, -0.5], r: [1.34, 1.34], sz: [1.6, 2.2], even: 1, blend: "source-over", a: 0.85 },
      { k: "orbit", n: 14, shape: "star", c: ["#FFF6C9", "#7DF9FF"], w: [0.5, 0.95], r: [1, 1.26], sz: [1, 1.8], tw: 1 },
      { k: "inward", n: 10, shape: "dot", c: ["#FFD447", "#FFFFFF"], sp: [0.5, 1.1], life: [1.2, 2.2], sz: [1.4, 2.4] },
    ] },
  sigil: { spd: 0.6, glow: 0.54, layers: [{ k: "rise", n: 12, shape: "ember", c: ["#FFB86B", "#FFD447", "#FFFFFF"], sp: [8, 17], life: [2.1, 3.4], sz: [1.6, 2.8], sway: 9, tw: 1 }] },
  glassfire: { spd: 1.05, glow: 0.78, layers: [{ k: "rise", n: 38, shape: "ember", c: ["#a855f7", "#ec4899", "#FFFFFF"], sp: [22, 48], life: [0.7, 1.5], sz: [2.4, 5.8], sway: 15, tw: 1 }] },
  crownfall: { spd: 1.3, glow: 0.88, bolts: { every: [0.9, 1.4], c: ["#FFD447", "#FFF6C9"] }, rings: [{ r: 1.08, c: "#160000", spin: 0.08, a: 0.95, w: 4 }], layers: [
    { k: "rise", n: 58, shape: "smoke", c: ["#C2001F", "#FF1F4B", "#430008"], sp: [30, 68], life: [0.7, 1.4], sz: [3.2, 7.2], sway: 12, a: 0.62, blend: "source-over" },
    { k: "orbit", n: 14, shape: "spark", c: ["#FFD447", "#FFF6C9"], w: [1.2, 2], r: [1.14, 1.35], sz: [1.1, 2.1] },
  ] },
  eclipseheart: { spd: 0.58, glow: 0.96, sweep: { c: "#FFF6C9", a: 1, spd: 0.85, r: 1.14, w: 4.4, span: 1.15 }, rays: { n: 10, c: "#FFD447", spin: 0.05, len: 1.48, a: 0.36 }, rings: [{ r: 1.32, c: "#FFF1B8", spin: -0.04, a: 0.9, w: 1.4, ink: 1 }, { r: 1.14, c: "#FFD447", spin: 0.05, a: 1, w: 4.2, filigree: 18, ink: 1 }], layers: [
    { k: "orbit", n: 8, shape: "img", src: ["/aura/gem-amber.png", "/aura/gem-amber.png", "/aura/gem-amber.png", "/aura/gem-amber.png", "/aura/gem-amber.png", "/aura/gem-clear.png", "/aura/gem-clear.png", "/aura/gem-ruby.png"], w: [0.04, 0.04], r: [1.32, 1.32], sz: [0.24, 0.34], even: 1, jit: 0.08, spin: 0.035, a: 0.96, glint: 1, blend: "source-over" },
    { k: "orbit", n: 8, shape: "img", src: ["/aura/gem-amber.png", "/aura/gem-amber.png", "/aura/gem-amber.png", "/aura/gem-clear.png", "/aura/gem-clear.png", "/aura/gem-sapphire.png", "/aura/gem-amethyst.png", "/aura/gem-aqua.png"], w: [-0.032, -0.032], r: [1.14, 1.14], sz: [0.2, 0.28], even: 1, jit: 0.07, spin: -0.028, a: 0.96, glint: 1, blend: "source-over" },
    { k: "orbit", n: 10, shape: "ember", c: ["#FFD447", "#FFF6C9", "#C9962E"], w: [0.14, 0.26], r: [0.9, 1.2], sz: [1.7, 2.8], tw: 1, blend: "source-over", a: 0.95 },
    { k: "rise", n: 5, shape: "smoke", c: ["#E8C56A", "#C9A56A"], sp: [4, 9], life: [2.4, 3.4], sz: [4.5, 7.5], sway: 9, a: 0.22, blend: "source-over" },
    { k: "rise", n: 8, shape: "dot", c: ["#FFF6C9", "#FFD447"], sp: [6, 12], life: [1.8, 2.8], sz: [1.4, 2.2], sway: 6, a: 0.85, tw: 1, blend: "source-over" },
  ] },
  steadybreath: { spd: 0.75, glow: 0.38, rings: [{ r: 1.14, c: "#DFFBFF", spin: 0.02, a: 0.68, w: 2.2 }], layers: [{ k: "orbit", n: 8, shape: "dot", c: ["#DFFBFF", "#7DF9FF"], w: [0.18, 0.3], r: [1.08, 1.2], sz: [1.2, 2], tw: 1 }] },
  iaidraw: { spd: 0.55, glow: 0.32, sweep: { c: "#FFFFFF", a: 1, spd: 6.5, r: 1.16, w: 3.4, span: 0.35 }, layers: [{ k: "orbit", n: 5, shape: "spark", c: ["#FFFFFF", "#38C6FF"], w: [0.12, 0.22], r: [1.1, 1.22], sz: [1, 1.6], tw: 1 }] },
  stormstep: { spd: 1.2, glow: 0.62, bolts: { every: [0.35, 0.45], c: ["#FFFFFF", "#7DD3FC"], flash: 1 }, layers: [{ k: "orbit", n: 18, shape: "spark", c: ["#FFFFFF", "#7DD3FC"], w: [1.4, 2.4], r: [1.08, 1.3], sz: [1, 1.8] }] },
  zeropoint: { spd: 0.55, glow: 0.55, rings: [{ r: 1.1, c: "#DDF6FF", spin: 0.05, a: 0.65, w: 3, dash: 1 }], layers: [{ k: "orbit", n: 6, shape: "shard", c: ["#DDF6FF", "#7DF9FF"], w: [0.22, 0.22], r: [1.2, 1.2], sz: [3, 4.5], even: 1 }] },
  ninetail: { spd: 0.9, glow: 0.72, art: "ninetail", rays: { n: 9, c: "#FF9340", spin: 0.08, len: 1.5, a: 0.24 }, layers: [{ k: "orbit", n: 9, shape: "ember", c: ["#FFD447", "#FF9340", "#FF4D00"], w: [0.3, 0.55], r: [1.08, 1.22], sz: [2.2, 3.6], even: 1, tw: 1 }] },
  ledger: { spd: 0.65, glow: 0.34, dark: 1, art: "ledger", rings: [{ r: 1.16, c: "#C2001F", spin: -0.03, a: 0.6, w: 1.4 }], layers: [{ k: "fall", n: 42, shape: "leaf", c: ["#080808", "#343434", "#777"], sp: [12, 28], sz: [2, 5], drift: 12, spin: 1, blend: "source-over" }, { k: "orbit", n: 2, shape: "dot", c: ["#C2001F"], w: [0.08, 0.08], r: [1.15, 1.15], sz: [2.4, 2.4], even: 1 }] },
  bonewright: { spd: 0.7, glow: 0.7, overArt: "bonewright", bolts: { burst: [2, 3], burstSpan: 0.36, gap: [3, 5], c: ["#FFF27A"], flash: 1, flashPeak: 0.35, flashLife: 0.09, from: "above", strike: 1, calm: 1 }, rings: [{ r: 1.12, c: "#F4EAD2", spin: 0.06, a: 0.9, w: 5, dash: 1 }], layers: [{ k: "rise", n: 22, shape: "smoke", c: ["#F4EAD2", "#AAB5C4"], sp: [12, 24], life: [1.4, 2.6], sz: [5, 10], sway: 9, blend: "source-over", a: 0.35 }, { k: "orbit", n: 12, shape: "shard", c: ["#FFFFFF", "#DDE6F2"], w: [0.12, 0.28], r: [1.08, 1.2], sz: [2.2, 4.2] }] },
  nullpoint: { spd: 0.62, glow: 0.66, dark: 1, rings: [{ r: 1.15, c: "#38C6FF", spin: -0.03, a: 0.82, w: 2.8 }], layers: [{ k: "inward", n: 64, shape: "dot", c: ["#38C6FF", "#C2001F", "#a855f7"], sp: [0.35, 0.7], life: [2, 4], sz: [1.2, 2.6] }] },
  carve: { spd: 0.85, glow: 0.58, dark: 1, art: "carve", rings: [{ r: 1.1, c: "#111111", spin: 0.22, a: 0.9, w: 6, dash: 1 }], sweep: { c: "#ec4899", a: 1, spd: 3.2, r: 1.2, w: 2.2, span: 1.6 }, layers: [{ k: "orbit", n: 36, shape: "spark", c: ["#C2001F", "#ec4899", "#F4EAD2"], w: [0.8, 1.8], r: [1.08, 1.35], sz: [0.8, 1.5], tw: 1 }] },
  brandmark: { spd: 0.58, glow: 0.5, dark: 1, art: "brandmark", artLate: 1, overArt: "brandmark", sweep: { c: "#FFFFFF", a: 1, spd: 5.2, r: 1.16, w: 7, span: 0.55 }, rings: [{ r: 1.08, c: "#414141", spin: 0.02, a: 0.95, w: 7 }], layers: [{ k: "rise", n: 22, shape: "smoke", c: ["#FFFFFF", "#AAB5C4"], sp: [7, 15], life: [2, 3.4], sz: [4, 8], sway: 5, blend: "source-over", a: 0.3 }, { k: "orbit", n: 1, shape: "img", src: "/aura/pauldron.webp", over: 1, r: [0.748866, 0.748866], w: [0, 0], sz: [0.78, 0.78], even: 1, at: 0.405238, rot: -0.012, a: 1, blend: "source-over" }, { k: "orbit", n: 1, shape: "img", src: "/aura/pauldron.webp", over: 1, flip: 1, r: [0.748866, 0.748866], w: [0, 0], sz: [0.78, 0.78], even: 1, at: 0.094762, rot: 0.012, a: 1, blend: "source-over" }] },
  blacksun: { spd: 0.32, glow: 0.96, dark: 1, art: "blacksun", rings: [{ r: 1.18, c: "#FFFFFF", spin: 0.01, a: 1, w: 4 }], layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/wing.webp", r: [1.12, 1.12], w: [0, 0], sz: [1.55, 1.55], even: 1, at: -0.38, rot: 0.04, breathe: 1, wobble: 0.03, a: 0.95, behind: 1, blend: "source-over" },
    { k: "orbit", n: 1, shape: "img", src: "/aura/wing.webp", r: [1.12, 1.12], w: [0, 0], sz: [1.55, 1.55], even: 1, at: -0.12, rot: -0.04, flip: 1, breathe: 1, wobble: 0.03, a: 0.95, behind: 1, blend: "source-over" },
    { k: "orbit", n: 1, shape: "img", src: "/aura/book.webp", r: [1.25, 1.25], w: [0.57, 0.57], sz: [0.42, 0.42], even: 1, spin: 0.04, bob: 1, a: 0.95, blend: "source-over" },
    { k: "fall", n: 82, shape: "leaf", c: ["#FFFFFF", "#E4E8F2"], sp: [5, 13], sz: [1.8, 4.6], drift: 3, spin: 1, blend: "source-over" },
    { k: "orbit", n: 5, shape: "dot", c: ["#C2001F"], w: [0.16, 0.16], r: [1.16, 1.16], sz: [2.6, 2.6], even: 1 },
  ] },
};

export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const _glowCache = new Map();
export let ophanimSrc = "/ophanim.jpg";
export let ophanimPromise = null;
export function loadOphanimSrc() {
  if (!ophanimPromise) {
    ophanimPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = img.width; c.height = img.height;
          const g = c.getContext("2d");
          g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
          for (let i = 0; i < p.length; i += 4) {
            const r = p[i], gv = p[i + 1], b = p[i + 2], avg = (r + gv + b) / 3;
            if (r > 226 && gv > 226 && b > 226 && Math.abs(r - gv) < 16 && Math.abs(gv - b) < 16) p[i + 3] = avg > 246 ? 0 : Math.max(0, Math.round((255 - avg) * 11));
          }
          g.putImageData(d, 0, 0);
          ophanimSrc = c.toDataURL("image/png");
        } catch (e) { /* keep jpg */ }
        resolve(ophanimSrc);
      };
      img.onerror = () => resolve(ophanimSrc);
      img.src = "/ophanim.jpg";
    });
  }
  return ophanimPromise;
}
export function OphanimWings({ w, h }) {
  const [src, setSrc] = useState(ophanimSrc);
  useEffect(() => { loadOphanimSrc().then(setSrc); }, []);
  const box = { position: "absolute", left: "50%", top: "50%", objectFit: "contain", pointerEvents: "none", mixBlendMode: "normal" };
  return (
    <>
      <img src={src} alt="" style={{ ...box, width: w * 1.02, height: h * 1.02, opacity: 0.42, animation: "ophspin 20s linear infinite, ophpulse 2.2s ease-in-out infinite" }} />
      <img src={src} alt="" style={{ ...box, width: w * 0.78, height: h * 0.78, opacity: 0.32, animation: "ophspinrev 11s linear infinite" }} />
      <img src={src} alt="" style={{ ...box, width: w * 0.86, height: h * 0.86, animation: "ophfloat 4s ease-in-out infinite", filter: "drop-shadow(0 0 10px rgba(255,212,71,.95)) drop-shadow(0 0 14px rgba(125,249,255,.45))" }} />
    </>
  );
}
export function glowSprite(color) {
  if (_glowCache.has(color)) return _glowCache.get(color);
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  const rgb = hexRgb(color) || [255, 255, 255];
  if (g) {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "#ffffff"); grd.addColorStop(0.18, `rgb(${rgb.join(",")})`); grd.addColorStop(0.5, `rgba(${rgb.join(",")},.4)`); grd.addColorStop(1, `rgba(${rgb.join(",")},0)`);
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  }
  _glowCache.set(color, c);
  return c;
}
export function softSprite(color) {
  const key = `soft${color}`;
  if (_glowCache.has(key)) return _glowCache.get(key);
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  const rgb = hexRgb(color) || [180, 180, 180];
  if (g) { const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, `rgb(${rgb.join(",")})`); grd.addColorStop(0.55, `rgba(${rgb.join(",")},.53)`); grd.addColorStop(1, `rgba(${rgb.join(",")},0)`); g.fillStyle = grd; g.fillRect(0, 0, 64, 64); }
  _glowCache.set(key, c);
  return c;
}

export const _auraImageCache = new Map();
export function auraImage(src) {
  if (_auraImageCache.has(src)) return _auraImageCache.get(src);
  const rec = { img: new Image(), ready: false, failed: false };
  _auraImageCache.set(src, rec);
  const markReady = () => { if (!rec.failed) rec.ready = true; };
  rec.img.onload = () => {
    if (typeof rec.img.decode === "function") rec.img.decode().then(markReady).catch(markReady);
    else markReady();
  };
  rec.img.onerror = () => { rec.failed = true; };
  rec.img.src = src;
  if (typeof rec.img.decode === "function") rec.img.decode().then(markReady).catch(() => {});
  return rec;
}

// Face anchor in avatar radii, +y down. Bonewright eyes use it. A Nullpoint
// blindfold in the over pass belongs on this same origin so photos match.
export const FACE_REGION = { x: 0.19, y: -0.16, eyeW: 0.17 };

export function auraNeedsOver(aura) {
  const fx = AURA_FX[aura];
  if (!fx) return false;
  if (fx.overArt) return true;
  return (fx.layers || []).some((L) => L.over);
}

function eyeIdle(time) {
  const a = 0.5 + 0.5 * Math.sin(time * 2.2);
  const b = 0.5 + 0.5 * Math.sin(time * 5.1 + 1.3);
  const c = 0.5 + 0.5 * Math.sin(time * 9.7 + 0.4);
  return 0.75 + 0.25 * (a * 0.62 + b * 0.28 + c * 0.1);
}

function drawBoneEyes(ctx, { time, cx, cy, rx, ry, strike, mode }) {
  if (!ctx || mode === "body") return;
  const R = Math.min(rx, ry);
  const k = Math.min(1, eyeIdle(time) + (1 - eyeIdle(time)) * strike);
  const ew = FACE_REGION.eyeW * R;
  const eh = ew * 0.42;
  const bloom = ew * 2.5 * (1 + 0.45 * strike);
  ctx.save();
  for (const side of [-1, 1]) {
    const x = cx + side * FACE_REGION.x * rx;
    const y = cy + FACE_REGION.y * ry;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, 0.5 * k + 0.45 * strike);
    const grd = ctx.createRadialGradient(x, y, ew * 0.15, x, y, bloom);
    grd.addColorStop(0, "rgba(140,255,90,.95)");
    grd.addColorStop(0.42, "rgba(43,170,20,.4)");
    grd.addColorStop(1, "rgba(43,170,20,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, bloom, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = k;
    ctx.fillStyle = "#2BAA14";
    ctx.beginPath(); ctx.ellipse(x, y, ew / 2, eh / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8CFF5A";
    ctx.beginPath(); ctx.ellipse(x, y, ew * 0.28, eh * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9 * k;
    ctx.fillStyle = "#F4FFE8";
    ctx.beginPath(); ctx.ellipse(x, y, ew * 0.1, eh * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawCape(ctx, { cx, cy, rx, ry, clock }) {
  const rec = auraImage("/aura/cape.webp");
  if (!rec.ready || rec.failed || !ctx) return;
  const img = rec.img;
  const R = Math.min(rx, ry);
  const ih = R * 1.52;
  const iw = ih * (img.naturalWidth / Math.max(1, img.naturalHeight));
  const sway = Math.sin((clock || 0) * (Math.PI * 2 / 5)) * 0.07;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.96;
  ctx.translate(cx, cy + ry * 0.08);
  ctx.rotate(sway);
  ctx.drawImage(img, -iw / 2, 0, iw, ih);
  ctx.restore();
}

function sweepHit(time, sweep, ang) {
  if (!sweep) return 0;
  const head = time * (sweep.spd || 0.55);
  const span = sweep.span || 0.9;
  let d = head - ang;
  d = ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return d <= span ? 1 - d / span : 0;
}

function drawSigil(ctx, { time, clock, cx, cy, rx, ry, unit, sweep }) {
  const rec = auraImage("/aura/brand.png");
  if (!rec.ready || rec.failed || !ctx) return;
  const img = rec.img;
  const R = Math.min(rx, ry);
  const ang = -0.85;
  const sx = cx + Math.cos(ang) * rx * 0.55;
  const sy = cy + Math.sin(ang) * ry * 0.55;
  const rot = 8 * Math.PI / 180;
  const ih = 0.42 * R;
  const iw = ih * (img.naturalWidth / Math.max(1, img.naturalHeight));
  const beat = 0.85 + Math.sin(time * 4.5) * 0.15;
  const hit = sweepHit(time, sweep, ang);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(rot);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = Math.min(1, beat);
  ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  if (hit > 0.02) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, hit * 0.55 * beat);
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  }
  ctx.restore();
  const bx = sx - Math.sin(rot) * (ih / 2);
  const by = sy + Math.cos(rot) * (ih / 2);
  const len = R * (0.42 + 0.2 * Math.sin((clock || 0) * 0.65));
  const wob = Math.sin((clock || 0) * 0.9) * (unit || 1) * 3;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = `rgba(194,0,31,${(0.55 + 0.35 * beat).toFixed(3)})`;
  ctx.lineWidth = Math.max(1, (unit || 1) * 0.9);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(bx + wob, by + len * 0.55, bx + wob * 0.35, by + len);
  ctx.stroke();
  ctx.restore();
}

// Behaviour-neutral homes for the legacy one-off art passes. Specs opt in via
// `art`; makeAura invokes the selected pass at the same point as before.
export const AURA_ART = {
  blacksun: ({ g, time, cx, cy, rx, ry, unit }) => {
    const ang = time * (Math.PI * 2 / 21) + 0.32 * Math.sin(time * 0.53) + 0.18 * Math.sin(time * 0.97);
    const rad = 1.15 + 0.20 * Math.sin(time * 0.37) + 0.10 * Math.sin(time * 0.83);
    const sx = cx + Math.cos(ang) * rx * rad, sy = cy + Math.sin(ang) * ry * rad;
    g.save();
    g.globalAlpha = Math.sin(ang) < 0 ? 0.7 : 1;
    g.shadowColor = "#ffffff"; g.shadowBlur = 16 * unit; g.fillStyle = "#020202";
    g.beginPath(); g.arc(sx, sy, rx * 0.52, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0; g.strokeStyle = "#ffffff"; g.lineWidth = Math.max(2, 4 * unit); g.stroke();
    g.restore();
    return { freeze: rad <= 0.94 };
  },
  ledger: ({ g, time, cx, cy, rx, ry }) => {
    const write = (time % 8) > 5;
    g.save(); g.translate(cx + rx * 0.72, cy - ry * 0.82); g.fillStyle = "#080808"; g.strokeStyle = "#777"; g.lineWidth = 1.2;
    g.beginPath(); g.roundRect?.(-rx * 0.24, -ry * 0.16, rx * 0.48, ry * 0.32, 3); if (!g.roundRect) g.rect(-rx * 0.24, -ry * 0.16, rx * 0.48, ry * 0.32); g.fill(); g.stroke();
    if (write) { g.strokeStyle = "#C2001F"; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-rx * 0.16, -ry * 0.1 + i * ry * 0.06); g.lineTo(rx * (0.04 + ((time * 0.2 + i * 0.17) % 0.15)), -ry * 0.1 + i * ry * 0.06); g.stroke(); } }
    g.restore();
  },
  carve: ({ g, time, cx, cy, rx, ry, unit }) => {
    const k = (time % 3.2) / 3.2;
    g.save(); g.strokeStyle = `rgba(236,72,153,${Math.sin(k * Math.PI)})`; g.lineWidth = Math.max(0.8, unit);
    for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * rx * 1.35, cy + Math.sin(a) * ry * 1.35); g.lineTo(cx + rx * 0.18, cy - ry * 0.12); g.stroke(); }
    g.restore();
  },
  ninetail: ({ g, time, cx, cy, rx, ry }) => {
    const palette = ["#FF9340", "#FFD447", "#FF4D00"];
    const R = Math.min(rx, ry);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.42 + (i / 8) * Math.PI * 1.66;
      const x = cx + Math.cos(a) * rx * 1.02, y = cy + Math.sin(a) * ry * 1.02;
      const len = (0.55 + (i % 3) * 0.08) * R, wide = 0.2 * R, ph = i * 0.73;
      const sway = Math.sin(time * 1.35 + ph) * 0.16 * R;
      const col = palette[i % 3], rgb = hexRgb(col) || [255, 147, 64];
      g.save(); g.translate(x, y); g.rotate(a);
      const grad = g.createLinearGradient(0, 0, len, sway);
      grad.addColorStop(0, col); grad.addColorStop(0.72, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.82)`); grad.addColorStop(1, "#FFF6C9");
      [1.18, 1, 0.78].forEach((band, bi) => {
        const bw = wide * band, off = (bi - 1) * wide * 0.12;
        g.globalAlpha = bi === 1 ? 0.92 : 0.42;
        g.fillStyle = grad; g.beginPath(); g.moveTo(0, off - bw / 2);
        g.bezierCurveTo(len * 0.34, off - bw * 0.54, len * 0.72, sway - bw * 0.22, len, sway);
        g.bezierCurveTo(len * 0.72, sway + bw * 0.22, len * 0.34, off + bw * 0.54, 0, off + bw / 2);
        g.closePath(); g.fill();
      });
      g.globalAlpha = 1; g.fillStyle = "#FFF6C9";
      g.beginPath(); g.arc(len, sway, Math.max(1.5, wide * 0.22 * 1.25), 0, Math.PI * 2); g.fill();
      g.restore();
    }
  },
  bonewright: (opts) => { if (opts.pass === "over") drawBoneEyes(opts.over || opts.g, opts); },
  brandmark: (opts) => {
    if (opts.pass === "late") drawCape(opts.g, opts);
    else if (opts.pass === "over") drawSigil(opts.over || opts.g, opts);
  },
};

// One shared animation loop for every aura on screen. Offscreen or hidden auras don't tick.
export const AuraLoop = {
  set: new Set(), raf: 0, last: 0,
  add(inst) { this.set.add(inst); if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.tick(t)); } },
  remove(inst) { this.set.delete(inst); if (!this.set.size && this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; } },
  tick(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
    if (!document.hidden) this.set.forEach((inst) => { if (inst.visible) { try { inst.frame(dt); } catch (e) { /* one bad aura must not blank the rest */ } } });
    this.raf = this.set.size ? requestAnimationFrame((tt) => this.tick(tt)) : 0;
  },
};

export function makeAura(canvas, { aura, w, h, mode, ringR, overCanvas }) {
  const fx = AURA_FX[aura], base = AURAS.find((a) => a.id === aura);
  const g = canvas.getContext("2d");
  if (!fx || !g) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  let overG = null;
  if (overCanvas) {
    overG = overCanvas.getContext("2d");
    if (overG) {
      overCanvas.width = canvas.width; overCanvas.height = canvas.height;
      overG.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  if (aura === "brandmark") { auraImage("/aura/cape.webp"); auraImage("/aura/brand.png"); }
  const spd = fx.spd || 1;
  const cx = w / 2, cy = mode === "body" ? h * 0.52 : h / 2;
  const fit = aura === "ascended" ? 1 : (mode === "body" ? 0.84 : 1);
  const rx = Math.max(10, (mode === "body" ? w * 0.28 : ringR) * fit);
  const ry = Math.max(10, (mode === "body" ? h * 0.36 : ringR) * fit);
  const gR = Math.min(1.45, (Math.min(cx, w - cx) / rx) * 0.97, (Math.min(cy, h - cy) / ry) * 0.97);
  const scale = Math.max(0.7, Math.min(1.25, (w * h) / (140 * 140)));
  const unit = Math.max(w < 110 ? 1.15 : 0.75, Math.min(rx, ry) / 48);
  const onRing = (ang, k = 1) => [cx + Math.cos(ang) * rx * k, cy + Math.sin(ang) * ry * k];
  let time = 0, clock = 0;
  let boltT = fx.bolts?.burst ? rnd(0.35, 0.9) : (fx.bolts?.every ? rnd(...fx.bolts.every) : 0), bolt = null;
  let liveBolts = [], burstLeft = 0, burstGap = 0.16, strike = 0, flashLeft = 0;
  let flashState = { last: null, burstFlashed: false };
  const api = { visible: true, reduce: false, flashes: 0, flashTimes: [], strike: 0, boltsFired: 0 };
  const c1 = base?.colors?.[0] || "#00D9FF", c2 = base?.colors?.[1] || c1;
  const rgba = (hex, a) => { const c = hexRgb(hex) || [0, 217, 255]; return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`; };

  let particleBudget = 120;
  const layers = fx.layers.map((L) => {
    const n = Math.min(particleBudget, Math.max(L.even ? L.n : 3, Math.round(L.n * (L.even ? 1 : scale))));
    particleBudget -= n;
    const srcList = L.shape === "img" ? [].concat(L.src || []).filter(Boolean) : [];
    srcList.forEach(auraImage);
    // `behind` stays on this under-photo canvas. `over` layers paint later,
    // on the second canvas above the photo.
    const range = (v, fallback) => Array.isArray(v) ? v : [v ?? fallback, v ?? fallback];
    const spawn = (p, fresh) => {
      p.c = L.c ? pick(L.c) : "#ffffff";
      const raw = rnd(...range(L.sz, L.shape === "img" ? 0.8 : 2.5));
      p.sz = L.shape === "emoji" ? raw : L.shape === "img" ? raw * Math.min(rx, ry) : Math.max(w < 110 ? 1.35 : 0.9, raw * unit * (mode === "body" ? 1.15 : 1));
      p.age = 0;
      p.rot = L.shape === "img" ? (L.rot || 0) * Math.PI * 2 : rnd(0, Math.PI * 2);
      p.vr = L.shape === "img" ? (L.spin || 0) * Math.PI * 2 : L.spin ? rnd(-3, 3) : rnd(-1, 1);
      p.ph = rnd(0, Math.PI * 2);
      if (L.shape === "img" && srcList.length) { p.src = srcList[p.i % srcList.length]; p.image = auraImage(p.src); }
      if (L.k === "rise" || L.k === "bubble") {
        const ang = rnd(Math.PI * 0.05, Math.PI * 0.95) + (Math.random() < 0.35 ? Math.PI : 0);
        [p.x, p.y] = onRing(ang, rnd(1.05, 1.18)); p.vy = -rnd(...L.sp) * unit; p.life = rnd(...(L.life || [1.5, 2.5]));
        if (fresh) p.age = rnd(0, p.life);
      } else if (L.k === "fall") {
        p.x = rnd(cx - rx * 1.5, cx + rx * 1.5); p.y = cy - ry * 1.6 - rnd(0, 20); p.vy = rnd(...L.sp) * unit; p.vx = (L.drift || 0) * unit * rnd(0.6, 1.2); p.life = 99;
        if (fresh) p.y = rnd(cy - ry * 1.6, cy + ry * 1.5);
      } else if (L.k === "inward") {
        p.ang = rnd(0, Math.PI * 2); p.r0 = rnd(1.35, 1.6); p.life = rnd(...L.life); p.spd = rnd(...L.sp);
        if (fresh) p.age = rnd(0, p.life);
      } else { // orbit
        p.ang = L.at != null ? L.at * Math.PI * 2 : L.even ? (p.i / n) * Math.PI * 2 + (L.jit ? rnd(-L.jit, L.jit) : 0) : rnd(0, Math.PI * 2);
        p.r = Math.max(0.5, rnd(...L.r)); p.w = rnd(...L.w) * (Math.random() < 0.5 && !L.even && L.at == null ? -1 : 1); p.life = 99;
        if (L.top && L.at == null) p.ang = rnd(Math.PI * 1.1, Math.PI * 1.9);
      }
      p.e = L.e ? L.e[p.i % L.e.length] : null;
    };
    const ps = Array.from({ length: n }, (_, i) => { const p = { i }; spawn(p, true); return p; });
    return { L, ps, spawn };
  });

  const drawP = (ctx, L, p, alpha, x, y) => {
    const g = ctx;
    if (alpha <= 0.01) return;
    g.globalAlpha = Math.min(1, alpha * (L.a ?? 1));
    const s = p.sz;
    switch (L.shape) {
      case "img": {
        const rec = p.image;
        if (!rec?.ready || rec.failed) break;
        const img = rec.img, aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
        const breathe = L.breathe ? 1 + 0.03 * Math.sin(time * (Math.PI * 2 / 4) + p.ph) : 1;
        const iw0 = aspect >= 1 ? s : s * aspect, ih0 = aspect >= 1 ? s / aspect : s;
        const iw = iw0 * breathe, ih = ih0 * breathe;
        const wob = L.wobble ? Math.sin(time * (Math.PI * 2 / (6.8 + (p.ph % 2.2))) + p.ph) * L.wobble : 0;
        const bob = L.bob ? Math.sin(time * (Math.PI * 2 / 2.5) + p.ph) * s * 0.1 : 0;
        g.save(); g.translate(x, y + bob); g.rotate(p.rot + wob); if (L.flip) g.scale(-1, 1);
        g.drawImage(img, -iw / 2, -ih / 2, iw, ih);
        if (L.glint) {
          const period = 3.4 + (p.ph % 2.4);
          const cycle = (time + p.ph * 1.7) % period;
          if (cycle < 0.28) {
            const k = cycle / 0.28;
            g.beginPath(); g.rect(-iw / 2, -ih / 2, iw, ih); g.clip();
            g.globalCompositeOperation = "lighter";
            g.globalAlpha = Math.min(1, alpha * (L.a ?? 1)) * Math.sin(k * Math.PI);
            g.strokeStyle = "#ffffff"; g.lineWidth = Math.max(1.1, s * 0.07);
            g.beginPath(); g.moveTo(-iw / 2, -ih / 2 + ih * k); g.lineTo(iw / 2, -ih / 2 + ih * k + ih * 0.18); g.stroke();
            const hs = Math.max(4, s * 0.28);
            g.drawImage(glowSprite("#ffffff"), -hs, -ih / 2 + ih * k - hs, hs * 2, hs * 2);
          }
        }
        g.restore(); break;
      }
      case "dot": { const sp = glowSprite(p.c); g.drawImage(sp, x - s * 2, y - s * 2, s * 4, s * 4); break; }
      case "ember": { const sp = glowSprite(p.c); g.drawImage(sp, x - s * 2.6, y - s * 2.6, s * 5.2, s * 5.2); break; }
      case "smoke": { const sp = softSprite(p.c); const k = Math.min(1.28, 1 + Math.min(p.age, 2.4) * 0.1); g.drawImage(sp, x - s * k, y - s * k, s * 2 * k, s * 2 * k); break; }
      case "spark": case "drop": {
        const orb = p.vy === undefined; const vx = orb ? -Math.sin(p.ang) * p.w * 20 : (p.vx || 0), vy = orb ? Math.cos(p.ang) * p.w * 20 : p.vy;
        const len = Math.hypot(vx, vy) || 1, l = L.shape === "drop" ? s * 9 : s * 5;
        g.strokeStyle = p.c; g.lineWidth = s; g.lineCap = "round";
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - (vx / len) * l, y - (vy / len) * l); g.stroke();
        if (L.shape === "spark") { const sp = glowSprite(p.c); g.drawImage(sp, x - s * 2.5, y - s * 2.5, s * 5, s * 5); }
        break;
      }
      case "flake": {
        g.save(); g.translate(x, y); g.rotate(p.rot); g.strokeStyle = p.c; g.lineWidth = Math.max(0.6, s * 0.28); g.lineCap = "round";
        for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, s); g.moveTo(0, s * 0.55); g.lineTo(s * 0.28, s * 0.8); g.moveTo(0, s * 0.55); g.lineTo(-s * 0.28, s * 0.8); g.stroke(); }
        g.restore(); break;
      }
      case "shard": {
        g.save(); g.translate(x, y); g.rotate(p.rot);
        g.fillStyle = p.c;
        g.beginPath(); g.moveTo(0, -s * 1.4); g.lineTo(s * 0.55, 0); g.lineTo(0, s * 1.1); g.lineTo(-s * 0.55, 0); g.closePath();
        g.strokeStyle = "rgba(18,10,4,0.5)"; g.lineWidth = Math.max(1.1, s * 0.28); g.stroke(); g.fill();
        g.globalAlpha *= 0.6; g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(0, -s * 1.4); g.lineTo(s * 0.2, -s * 0.2); g.lineTo(0, 0); g.closePath(); g.fill();
        g.restore(); break;
      }
      case "leaf": {
        g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.c;
        g.beginPath(); g.ellipse(0, 0, s * 1.3, s * 0.55, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-s * 1.2, 0); g.lineTo(s * 1.2, 0); g.stroke();
        g.restore(); break;
      }
      case "square": { g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-s / 2, -s * 0.8, s, s * 1.6); g.restore(); break; }
      case "star": {
        const sp = glowSprite(p.c); g.drawImage(sp, x - s * 3, y - s * 3, s * 6, s * 6);
        g.strokeStyle = p.c; g.lineWidth = Math.max(0.5, s * 0.35); g.beginPath(); g.moveTo(x - s * 2.4, y); g.lineTo(x + s * 2.4, y); g.moveTo(x, y - s * 2.4); g.lineTo(x, y + s * 2.4); g.stroke();
        break;
      }
      case "emoji": { const px = Math.max(10, Math.min(w, h) * p.sz); g.font = `${px}px system-ui, "Apple Color Emoji", "Segoe UI Emoji"`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(p.e, x, y + (L.bob ? Math.sin(time * 2.4 + p.ph) * px * 0.12 : 0)); break; }
      case "eye": {
        g.save(); g.translate(x, y); g.rotate(p.rot + time * 0.4);
        g.fillStyle = "#F4FBFF"; g.beginPath(); g.ellipse(0, 0, s * 1.85, s * 1.05, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#FFD447"; g.lineWidth = Math.max(0.7, s * 0.2); g.stroke();
        g.fillStyle = "#1A6DFF"; g.beginPath(); g.arc(Math.sin(time * 3 + p.ph) * s * 0.2, 0, s * 0.58, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#061018"; g.beginPath(); g.arc(Math.sin(time * 3 + p.ph) * s * 0.2, 0, s * 0.24, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ffffff"; g.beginPath(); g.arc(-s * 0.28, -s * 0.22, s * 0.16, 0, Math.PI * 2); g.fill();
        g.restore(); break;
      }
      case "glyph": {
        g.save(); g.translate(x, y); g.rotate(p.rot + time * 0.6);
        g.lineJoin = "round";
        g.strokeStyle = "rgba(18,10,4,0.55)"; g.lineWidth = Math.max(1.6, s * 0.42);
        g.strokeRect(-s, -s, s * 2, s * 2);
        g.beginPath(); g.moveTo(0, -s * 1.35); g.lineTo(0, s * 1.35); g.moveTo(-s * 1.35, 0); g.lineTo(s * 1.35, 0); g.stroke();
        g.strokeStyle = p.c; g.lineWidth = Math.max(0.85, s * 0.3);
        g.strokeRect(-s, -s, s * 2, s * 2);
        g.beginPath(); g.moveTo(0, -s * 1.35); g.lineTo(0, s * 1.35); g.moveTo(-s * 1.35, 0); g.lineTo(s * 1.35, 0); g.stroke();
        g.restore(); break;
      }
      case "gem": {
        g.save(); g.translate(x, y); g.rotate(p.rot);
        g.fillStyle = p.c; g.beginPath(); g.moveTo(0, -s * 1.65); g.lineTo(s, -s * 0.15); g.lineTo(s * 0.55, s * 1.2); g.lineTo(-s * 0.55, s * 1.2); g.lineTo(-s, -s * 0.15); g.closePath(); g.fill();
        g.fillStyle = "#ffffff"; g.globalAlpha *= 0.5; g.beginPath(); g.moveTo(0, -s * 1.65); g.lineTo(s * 0.38, -s * 0.2); g.lineTo(0, 0); g.closePath(); g.fill();
        g.restore(); break;
      }
      case "petal": {
        g.save(); g.translate(x, y); g.rotate(p.rot + time * 0.4);
        g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, s * 0.42, s * 1.55, 0, 0, Math.PI * 2); g.fill();
        g.restore(); break;
      }
      default: { // bubble ring
        g.strokeStyle = p.c; g.lineWidth = Math.max(0.7, s * 0.3); g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.stroke();
        g.fillStyle = "#ffffff"; g.globalAlpha *= 0.7; g.beginPath(); g.arc(x - s * 0.35, y - s * 0.35, s * 0.25, 0, Math.PI * 2); g.fill();
      }
    }
  };

  const makeBolt = () => {
    if (fx.bolts.from === "above") {
      const ang = -Math.PI / 2 + rnd(-0.65, 0.65);
      const endAng = ang + rnd(-0.08, 0.08);
      const [x, y] = onRing(ang, rnd(1.48, 1.75));
      const [ex, ey] = onRing(endAng, 1.05);
      const segs = 8, pts = [];
      for (let i = 0; i <= segs; i++) {
        const k = i / segs;
        let px = x + (ex - x) * k + (i && i < segs ? rnd(-8, 8) * unit : 0);
        let py = y + (ey - y) * k + (i && i < segs ? rnd(-8, 8) * unit : 0);
        const rk = Math.hypot((px - cx) / rx, (py - cy) / ry) || 1;
        if (rk < 1.05) { const s = 1.05 / rk; px = cx + (px - cx) * s; py = cy + (py - cy) * s; }
        pts.push([px, py]);
      }
      return { pts, t: 0, c: "#FFF27A" };
    }
    const ang = rnd(0, Math.PI * 2), segs = 7, pts = [];
    let [x, y] = onRing(ang, 0.95);
    const [ex, ey] = onRing(ang + rnd(-0.5, 0.5), rnd(1.45, 1.7));
    for (let i = 0; i <= segs; i++) { const k = i / segs; pts.push([x + (ex - x) * k + (i && i < segs ? rnd(-6, 6) * unit : 0), y + (ey - y) * k + (i && i < segs ? rnd(-6, 6) * unit : 0)]); }
    return { pts, t: 0, c: pick(fx.bolts.c) };
  };

  const frame = (dt) => {
    time += dt * spd;
    clock += dt;
    strike = Math.max(0, strike - dt / 0.25);
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    if (overG) {
      overG.setTransform(dpr, 0, 0, dpr, 0, 0);
      overG.clearRect(0, 0, w, h);
      overG.globalAlpha = 1; overG.globalCompositeOperation = "source-over";
    }
    // base glow that breathes
    const breathe = 0.85 + Math.sin(time * 2.1) * 0.15;
    if (fx.dark) {
      const grd = g.createRadialGradient(cx, cy, rx * 0.7, cx, cy, rx * gR);
      grd.addColorStop(0, "rgba(10,0,20,0)"); grd.addColorStop(0.35, `rgba(20,0,40,${0.75 * breathe})`); grd.addColorStop(0.55, rgba(c1, 0.66)); grd.addColorStop(1, "rgba(10,0,20,0)");
      g.fillStyle = grd; g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.translate(-cx, -cy); g.beginPath(); g.arc(cx, cy, rx * gR, 0, Math.PI * 2); g.fill(); g.restore();
    } else {
      g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
      const grd = g.createRadialGradient(0, 0, rx * 0.45, 0, 0, rx * gR);
      grd.addColorStop(0, rgba(c1, 0)); grd.addColorStop(0.32, rgba(c1, fx.glow * breathe * 0.55)); grd.addColorStop(0.62, rgba(c2, fx.glow * 0.42)); grd.addColorStop(1, rgba(c2, 0));
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, rx * gR, 0, Math.PI * 2); g.fill(); g.restore();
    }
    if (fx.corona) {
      const pulse = 0.55 + 0.45 * Math.sin(time * 2.3);
      const grd = g.createRadialGradient(cx, cy, rx * 0.12, cx, cy, rx * 1.38);
      grd.addColorStop(0, "rgba(4,1,8,.95)"); grd.addColorStop(0.2, "rgba(8,2,12,.8)");
      grd.addColorStop(0.36, rgba(fx.corona.inner || c2, 0.62 * pulse)); grd.addColorStop(0.72, rgba(fx.corona.outer || c1, 0.28)); grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd; g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.beginPath(); g.arc(0, 0, rx * 1.38, 0, Math.PI * 2); g.fill(); g.restore();
    }
    const artArgs = (pass) => ({ g, over: overG, time, clock, cx, cy, rx, ry, unit, strike, sweep: fx.sweep, pass, mode });
    const artState = AURA_ART[fx.art]?.(artArgs("main")) || null;
    if (fx.rings) {
      g.save(); g.globalCompositeOperation = "source-over";
      g.translate(cx, cy); g.scale(1, ry / rx);
      fx.rings.forEach((R) => {
        const rr = rx * (R.r || 1.08);
        const rot = time * (R.spin || 0.3);
        const lw = Math.max(w < 80 ? (R.w >= 3 ? 3.6 : 1.85) : 1.2, (R.w || 1.3) * unit);
        const a = Math.min(1, (R.a || 0.35) * breathe);
        if (R.dash) g.setLineDash([5 * unit, 7 * unit]);
        if (R.ink) {
          g.strokeStyle = "rgba(18,10,4,0.62)";
          g.lineWidth = lw + Math.max(1.4, unit * 1.15);
          g.beginPath(); g.ellipse(0, 0, rr, rr, rot, 0, Math.PI * 2); g.stroke();
        }
        g.strokeStyle = rgba(R.c || c1, a);
        g.lineWidth = lw;
        g.beginPath(); g.ellipse(0, 0, rr, rr, rot, 0, Math.PI * 2); g.stroke();
        g.setLineDash([]);
        if (R.filigree) {
          const ticks = R.filigree;
          for (let i = 0; i < ticks; i++) {
            const ang = (i / ticks) * Math.PI * 2 + time * (R.spin || 0);
            const inner = rr - unit * (i % 4 === 0 ? 3.8 : 2.3), outer = rr + unit * (i % 4 === 0 ? 2.8 : 1.4);
            const x0 = Math.cos(ang) * inner, y0 = Math.sin(ang) * inner, x1 = Math.cos(ang) * outer, y1 = Math.sin(ang) * outer;
            if (R.ink) {
              g.strokeStyle = "rgba(18,10,4,0.55)"; g.lineWidth = Math.max(1.3, unit * 1.05);
              g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
            }
            g.strokeStyle = rgba(R.c || c1, a);
            g.lineWidth = Math.max(0.85, unit * 0.85);
            g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
          }
        }
      });
      g.restore();
    }
    if (fx.sweep) {
      const S = fx.sweep;
      const rr = rx * (S.r || 1);
      const ang = time * (S.spd || 0.55);
      const span = S.span || 0.9;
      const sw = Math.max(w < 80 ? 3.4 : 1.8, (S.w || 3) * unit);
      g.save(); g.globalCompositeOperation = "source-over";
      g.translate(cx, cy); g.scale(1, ry / rx);
      g.lineCap = "round";
      g.strokeStyle = "rgba(18,10,4,0.5)"; g.lineWidth = sw + 1.6;
      g.beginPath(); g.arc(0, 0, rr, ang - span, ang); g.stroke();
      g.strokeStyle = rgba(S.c || "#FFF6C9", S.a ?? 1); g.lineWidth = sw;
      g.beginPath(); g.arc(0, 0, rr, ang - span, ang); g.stroke();
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = rgba("#FFFFFF", 0.7); g.lineWidth = Math.max(1, sw * 0.35);
      g.beginPath(); g.arc(0, 0, rr, ang - span * 0.28, ang); g.stroke();
      const hx = Math.cos(ang) * rr, hy = Math.sin(ang) * rr;
      const sp = glowSprite(S.c || "#FFF6C9");
      const hs = Math.max(6, sw * 1.8);
      g.globalAlpha = 0.85; g.drawImage(sp, hx - hs, hy - hs, hs * 2, hs * 2);
      g.restore();
    }
    g.globalCompositeOperation = "source-over";
    if (fx.rays) {
      const R = fx.rays; g.save(); g.translate(cx, cy);
      for (let i = 0; i < R.n; i++) {
        const a0 = (i / R.n) * Math.PI * 2 + time * R.spin;
        if (R.fan && Math.sin(a0) > 0.15) continue;
        const len = Math.min(Math.max(rx, ry) * R.len, Math.min(cx, cy, w - cx, h - cy) * 1.15) * (0.8 + 0.2 * Math.sin(time * 1.3 + i));
        const grd = g.createLinearGradient(0, 0, Math.cos(a0) * len, Math.sin(a0) * len);
        const pulse = R.a * (0.75 + 0.25 * Math.sin(time * 2 + i * 1.7));
        grd.addColorStop(0, rgba(R.c, 0)); grd.addColorStop(0.45, rgba(R.c, pulse)); grd.addColorStop(1, rgba(R.c, 0));
        g.fillStyle = grd; g.beginPath(); g.moveTo(0, 0);
        const wd = 0.07 + 0.03 * Math.sin(i * 2.3);
        g.lineTo(Math.cos(a0 - wd) * len, Math.sin(a0 - wd) * len); g.lineTo(Math.cos(a0 + wd) * len, Math.sin(a0 + wd) * len); g.closePath(); g.fill();
      }
      g.restore();
    }
    const paintLayers = (ctx, wantOver) => {
      layers.forEach(({ L, ps, spawn }) => {
        if (!!L.over !== wantOver) return;
        const layerDt = artState?.freeze && L.shape !== "img" ? 0 : dt;
        ctx.globalCompositeOperation = L.blend || (L.shape === "emoji" || L.shape === "img" ? "source-over" : "lighter");
        ps.forEach((p) => {
          if (L.shape === "img" && p.image?.failed) return;
          p.age += layerDt; p.rot += p.vr * layerDt;
          let x, y, alpha = 1;
          if (L.k === "rise" || L.k === "bubble") {
            p.y += p.vy * layerDt; x = p.x + Math.sin(time * 2 + p.ph) * (L.sway || 5) * unit * (L.k === "bubble" ? 0.6 : 1); y = p.y;
            const k = p.age / p.life; alpha = Math.min(1, k * 5) * (1 - k);
            if (L.flick) alpha *= 0.6 + 0.4 * Math.sin(time * 18 + p.ph);
            if (p.age >= p.life) spawn(p);
          } else if (L.k === "fall") {
            p.y += p.vy * layerDt; p.x += p.vx * layerDt + Math.sin(time + p.ph) * 0.2; x = p.x; y = p.y;
            const edge = Math.min(1, (p.y - (cy - ry * 1.6)) / 20, (cy + ry * 1.5 - p.y) / 20);
            alpha = Math.max(0, edge);
            if (p.y > cy + ry * 1.5) spawn(p);
          } else if (L.k === "inward") {
            const k = p.age / p.life; const r = p.r0 - (p.r0 - 1.05) * k; p.ang += p.spd * layerDt;
            [x, y] = onRing(p.ang, r); alpha = Math.min(1, k * 4) * (1 - k * k);
            if (p.age >= p.life) spawn(p);
          } else {
            p.ang += p.w * layerDt; const wob = L.wave ? Math.sin(time * 3 + p.ph) * L.wave : 0;
            [x, y] = onRing(p.ang, p.r + wob);
            if (L.shape !== "emoji" && L.shape !== "smoke" && L.shape !== "img") alpha = 0.75 + 0.25 * Math.sin(time * 3 + p.ph);
            if (mode === "body" && L.shape !== "emoji" && L.shape !== "img") alpha *= Math.sin(p.ang) < 0 ? 0.55 : 1;
          }
          if (L.tw) alpha *= 0.55 + 0.45 * Math.sin(time * 5 + p.ph * 3);
          drawP(ctx, L, p, alpha, x, y);
        });
      });
    };
    paintLayers(g, false);
    if (fx.artLate) AURA_ART[fx.art]?.(artArgs("late"));
    if (fx.bolts?.burst) {
      boltT -= dt;
      if (boltT <= 0 && liveBolts.length < 6) {
        const calm = !!(api.reduce && fx.bolts.calm);
        const starting = burstLeft <= 0;
        if (starting) {
          const lo = calm ? 1 : fx.bolts.burst[0];
          const hi = calm ? 1 : fx.bolts.burst[1];
          burstLeft = lo + Math.floor(Math.random() * (hi - lo + 1));
          const intervals = Math.max(1, burstLeft - 1);
          burstGap = ((fx.bolts.burstSpan || 0.36) / intervals) * (calm ? 1 : rnd(0.82, 0.98));
        }
        liveBolts.push(makeBolt());
        api.boltsFired += 1;
        strike = 1;
        burstLeft -= 1;
        const gate = noteStrikeFlash(flashState, { now: clock, reduce: !!api.reduce, enabled: !!fx.bolts.flash, burstStart: starting });
        flashState = { last: gate.last, burstFlashed: gate.burstFlashed };
        if (gate.fired) {
          flashLeft = fx.bolts.flashLife || 0.09;
          api.flashes += 1;
          api.flashTimes.push(clock);
          if (api.flashTimes.length > 40) api.flashTimes.shift();
        }
        boltT = burstLeft > 0 ? burstGap : rnd(...(calm ? [5.5, 8] : (fx.bolts.gap || [3, 5])));
      }
      const calmDraw = !!(api.reduce && fx.bolts.calm);
      liveBolts = liveBolts.filter((b) => {
        b.t += dt; const life = 0.26, k = b.t / life;
        if (k >= 1) return false;
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = calmDraw ? (1 - k) * 0.8 : (1 - k) * (0.82 + 0.18 * Math.sin(b.t * 46));
        const strokes = calmDraw
          ? [[6 * unit, "#FFD447"], [2.6 * unit, "#FFF27A"], [0.9, "#FFFFFF"]]
          : [[11 * unit, "#FFD447"], [4.6 * unit, "#FFF27A"], [1.5 * unit, "#FFFFFF"]];
        strokes.forEach(([lw, col]) => {
          g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath();
          b.pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
        });
        return true;
      });
    } else if (fx.bolts) {
      boltT -= dt;
      if (boltT <= 0) { bolt = makeBolt(); boltT = rnd(...fx.bolts.every); }
      if (bolt) {
        bolt.t += dt; const life = 0.28, k = bolt.t / life;
        if (k >= 1) bolt = null;
        else {
          g.globalCompositeOperation = "lighter"; g.globalAlpha = (1 - k) * (0.6 + 0.4 * Math.sin(bolt.t * 90));
          if (fx.bolts.flash && k < 0.3) {
            const flash = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry) * 1.25);
            flash.addColorStop(0, `rgba(200,220,255,${0.14 * (1 - k / 0.3)})`); flash.addColorStop(1, "rgba(0,0,0,0)");
            g.fillStyle = flash; g.beginPath(); g.arc(cx, cy, Math.max(rx, ry) * 1.25, 0, Math.PI * 2); g.fill();
          }
          [[4 * unit, `${bolt.c}55`], [1.6 * unit, bolt.c], [0.7, "#ffffff"]].forEach(([lw, col]) => {
            g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = "round"; g.beginPath();
            bolt.pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
          });
        }
      }
    }
    const paintWash = (ctx) => {
      if (!(flashLeft > 0) || !fx.bolts?.burst) return;
      const life = fx.bolts.flashLife || 0.09;
      const a = (fx.bolts.flashPeak ?? 0.35) * Math.max(0, flashLeft / life);
      if (a <= 0.01) return;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = a;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };
    paintWash(g);
    if (overG) {
      paintLayers(overG, true);
      paintWash(overG);
      if (fx.overArt) AURA_ART[fx.overArt]?.(artArgs("over"));
    }
    if (flashLeft > 0) flashLeft -= dt;
    api.strike = strike;
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  };
  api.frame = frame;
  try {
    if (import.meta.env && import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("auraProbe") === "1") canvas._aura = api;
  } catch (e) { /* probe is dev-only */ }
  return api;
}

export function AuraCanvas({ aura, w, h, mode = "circle", ringR, style, children, overSlot }) {
  const ref = useRef(null);
  const overRef = useRef(null);
  const needs = auraNeedsOver(aura);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !AURA_FX[aura] || typeof window === "undefined") return;
    let inst = null;
    try { inst = makeAura(cv, { aura, w, h, mode, ringR: ringR || Math.min(w, h) / 3.2, overCanvas: needs ? overRef.current : null }); } catch (e) { return; }
    if (!inst) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    inst.reduce = !!reduce;
    try { inst.frame(1 / 30); } catch (e) { /* first paint */ }
    if (reduce && aura !== "bonewright") { for (let i = 0; i < 60; i++) inst.frame(1 / 30); return; }
    let io = null;
    if (typeof IntersectionObserver !== "undefined") { io = new IntersectionObserver((es) => { inst.visible = es[0]?.isIntersecting ?? true; }, { rootMargin: "80px" }); io.observe(cv); }
    AuraLoop.add(inst);
    return () => { AuraLoop.remove(inst); io?.disconnect(); };
  }, [aura, w, h, mode, ringR, needs, overSlot]);
  if (!AURA_FX[aura]) return null;
  const overCanvas = needs ? (
    <canvas ref={overRef} aria-hidden="true" className="absolute pointer-events-none" style={{ left: 0, top: 0, width: w, height: h, zIndex: 2 }} />
  ) : null;
  return (
    <div aria-hidden="true" className="absolute pointer-events-none" style={{ width: w, height: h, zIndex: 0, ...style }}>
      {aura === "ascended" && <OphanimWings w={w} h={h} />}
      <canvas ref={ref} className="absolute pointer-events-none" style={{ left: 0, top: 0, width: w, height: h }} />
      {children ? <div className="absolute pointer-events-none" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 1 }}>{children}</div> : null}
      {needs && overSlot ? createPortal(overCanvas, overSlot) : overCanvas}
    </div>
  );
}
// Drop-in replacement for the old ring. `size` is the ring's outer size as before; the canvas is larger so particles can drift out.
export function AuraRing({ aura, size, style, children }) {
  if (!AURA_FX[aura]) return null;
  const k = aura === "ascended" ? 1.18 : 1.28;
  const w = Math.round(size * k);
  return <AuraCanvas aura={aura} w={w} h={w} ringR={size / 2.7} style={style}>{children}</AuraCanvas>;
}
