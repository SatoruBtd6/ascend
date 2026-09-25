import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { hexRgb } from "../theme.js";
import { AURAS, resolveAuraId } from "./catalog.js";
import { mergeViewSpec, mergeViewLayer } from "./specFormat.js";
import { noteStrikeFlash } from "./boltClock.js";
import { resolveAuraAnchors, HEAD_FROM_EYE } from "./anchors.js";
export { FACE_REGION, HEAD_FROM_EYE, resolveAuraAnchors } from "./anchors.js";
export { setFlashPageClock } from "./boltClock.js";
/* Particle recipes. Easy unlocks stay simple; rare ones stack more motion. Never shrink the ring so small that studio tiles go blank. */
export const AURA_FX = {
  ember: { spd: 1, glow: 0.78, layers: [
    { k: "orbit", n: 12, shape: "ember", c: ["#FFB86B", "#FF9340", "#FF4D6D"], w: [0.25, 0.5], r: [0.96, 1.1], sz: [2.2, 3.4], tw: 1 },
    { k: "orbit", n: 6, shape: "orb", c: ["#FFE9C2", "#FFB86B"], w: [0.15, 0.3], r: [1.06, 1.18], sz: [2.5, 3.4], a: 0.8, tw: 1 },
    { k: "rise", n: 16, shape: "ember", c: ["#FFB86B", "#FF9340", "#FF4D6D"], sp: [14, 26], life: [0.8, 1.4], sz: [1.6, 3], sway: 10, circle: { n: 0, a: 0 } },
    { k: "rise", n: 6, shape: "wisp", c: ["#FF9340", "#FF6A3C"], sp: [10, 18], life: [1.2, 2], sz: [2.8, 4.4], sway: 8, a: 0.55, circle: { n: 0, a: 0 } },
  ] },
  // Tide: gentle ocean water — glossy orb droplets riding a slow wave orbit,
  // rising bubbles, wave-like wisps curling around the figure. Aqua/teal
  // over the blue disc; calm T1 ring with no signature mechanic.
  tide: { spd: 0.95, glow: 0.8, layers: [
    { k: "orbit", n: 8, shape: "orb", c: ["#9BE7FF", "#5EEAD4", "#38C6FF"], w: [0.35, 0.6], r: [1.02, 1.14], sz: [2.7, 3.8], wave: 0.1, tw: 1 },
    { k: "orbit", n: 12, shape: "dot", c: ["#38C6FF", "#5EEAD4", "#9BE7FF"], w: [0.8, 1.3], r: [1.12, 1.24], sz: [1.4, 2.2], wave: 0.06, tw: 1 },
    { k: "bubble", n: 14, c: ["#9BE7FF", "#5EEAD4"], sp: [10, 18], life: [1.6, 2.4], sz: [2, 4.2], low: 1 },
    { k: "rise", n: 6, shape: "wisp", c: ["#9BE7FF", "#38C6FF"], sp: [6, 12], life: [2.4, 3.6], sz: [3.5, 5.5], sway: 9, a: 0.5, circle: { n: 0, a: 0 } },
  ] },
  // Storm: a classic moody rainstorm — slate-grey cloud wisps drifting,
  // steady rain (figure + board fall), pale droplets, and occasional
  // slate-white bolts. Muted, not electric-cyan.
  storm: { spd: 1.1, glow: 1, bolts: { every: [1.4, 2.4], c: ["#E8EEF7", "#9FB4CC"], fit: 1 }, layers: [
    { k: "orbit", n: 8, shape: "smoke", c: ["#2E3A4C", "#42506A", "#556678"], w: [0.06, 0.14], r: [0.2, 0.7], sz: [8, 11], a: 0.7, blend: "source-over" },
    { k: "orbit", n: 8, shape: "orb", c: ["#C9D4E0", "#E8EEF7"], w: [0.5, 0.9], r: [1.04, 1.16], sz: [2.6, 3.8], tw: 1 },
    { k: "fall", n: 22, shape: "drop", c: ["#C9D4E0", "#E8EEF7", "#9FB4CC"], sp: [60, 100], sz: [1, 1.7], drift: 8, a: 0.8, xWrap: 1, xFade: 8, tailPad: 17 },
    { k: "rise", n: 5, shape: "wisp", c: ["#9FB4CC", "#556678"], sp: [5, 10], life: [2.6, 3.8], sz: [4, 6], sway: 10, a: 0.45, circle: { n: 0, a: 0 } },
  ] },
  inferno: { spd: 1.55, glow: 0.72, layers: [
    { k: "orbit", n: 1, shape: "flame", c: ["#2F7BFF", "#7DD3FC", "#FFFFFF"], w: [0, 0], r: [1.05, 1.05], even: 1, at: 0.25, sz: [29.4, 29.4], tongues: [7, 7], flicker: 0.3, a: 0.68, behind: 1, circle: { sz: [1.25, 1.25], r: [1.3, 1.3] } },
    { k: "rise", n: 32, shape: "dot", c: ["#BFE9FF", "#7DD3FC", "#FFFFFF"], sp: [28, 54], life: [0.55, 1.15], sz: [3.2, 7.5], sway: 5, a: 0.85 },
    { k: "rise", n: 18, shape: "spark", c: ["#FFFFFF", "#7DD3FC", "#38BDF8"], sp: [42, 78], life: [0.5, 1.1], sz: [1.1, 2], sway: 16 },
  ] },
  halo: { spd: 1.2, glow: 0.78, rays: { n: 12, c: "#FFD447", spin: 0.22, len: 1.42, a: 0.18 }, layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/halo.webp", placed: "head", sz: [0.85, 0.85], w: [0, 0], r: [1, 1], bob: 1, wobble: 0.04, rot: 0.05, a: 0.98, blend: "source-over", hover: 0.16 },
    { k: "orbit", n: 22, shape: "dot", c: ["#FFF6C9", "#FFD447"], w: [0.4, 0.85], r: [1.02, 1.18], sz: [1.8, 3.4], tw: 1 },
    { k: "orbit", n: 10, shape: "star", c: ["#FFFFFF", "#FFD447"], w: [0.7, 1.2], r: [1.08, 1.24], sz: [1, 1.8], tw: 1 },
  ] },
  godray: { spd: 1.4, glow: 0.82, rays: { n: 16, c: "#DFFBFF", spin: -0.2, len: 1.55, a: 0.2 }, layers: [
    { k: "orbit", n: 1, shape: "img", frames: ["/aura/arm-rest.webp", "/aura/arm-mid.webp", "/aura/arm-flex.webp"], frameMode: "pingpong", frameDuration: 0.62, fadeLen: 0.18, frameOffsets: { 0: { scale: 0.93, y: 0.05 } }, r: [1.02, 1.02], w: [0, 0], sz: [1.8, 1.8], even: 1, at: 0.53, flip: 1, a: 0.92, behind: 1, blend: "source-over" },
    { k: "orbit", n: 1, shape: "img", frames: ["/aura/arm-rest.webp", "/aura/arm-mid.webp", "/aura/arm-flex.webp"], frameMode: "pingpong", frameDuration: 0.62, fadeLen: 0.18, frameOffsets: { 0: { scale: 0.93, y: 0.05 } }, r: [1.02, 1.02], w: [0, 0], sz: [1.8, 1.8], even: 1, at: -0.03, a: 0.92, behind: 1, blend: "source-over" },
    { k: "rise", n: 22, shape: "star", c: ["#FFFFFF", "#7DF9FF"], sp: [12, 26], life: [1.2, 2.2], sz: [1.6, 3.2], sway: 4, tw: 1 },
    { k: "orbit", n: 18, shape: "spark", c: ["#FFFFFF", "#7DF9FF"], w: [0.8, 1.6], r: [1, 1.28], sz: [1.2, 2.2] },
  ] },
  smolder: { spd: 1.1, glow: 0.6, layers: [{ k: "rise", n: 10, shape: "smoke", c: ["#5A4A44", "#3A302C"], sp: [8, 16], life: [2.2, 3.4], sz: [8, 15], sway: 8, a: 0.35, blend: "source-over" }, { k: "rise", n: 26, shape: "ash", c: ["#FF6A2B", "#FFB070", "#FF8A3D"], sp: [12, 26], life: [1.4, 2.6], sz: [1.3, 2.3], sway: 12, flick: 1 }, { k: "orbit", n: 8, shape: "dot", c: ["#C2361A", "#FF6A2B"], w: [0.25, 0.45], r: [0.98, 1.08], sz: [2.2, 4], tw: 1 }] },
  // Stormborn: a wind-and-rain runner — teal-green, everything drives
  // sideways: rain streaks fall with heavy drift, comet streaks whip around
  // the ring, and a fast drop orbit reads as speed lines. Signature: comets.
  stormborn: { spd: 1.7, glow: 0.95, layers: [
    { k: "orbit", n: 5, shape: "comet", c: ["#5EEAD4", "#34D3BE", "#E6F0FF"], w: [1.6, 2.4], r: [1.02, 1.14], sz: [1.3, 2] },
    { k: "orbit", n: 10, shape: "dot", c: ["#5EEAD4", "#8FB8FF", "#E6F0FF"], w: [2.2, 3.4], r: [1.14, 1.26], sz: [1.2, 2], tw: 1 },
    { k: "fall", n: 24, shape: "drop", c: ["#5EEAD4", "#8FB8FF", "#E6F0FF"], sp: [80, 130], sz: [1, 1.7], drift: -26, a: 0.75, xWrap: 1, xFade: 8, tailPad: 17 },
    { k: "orbit", n: 5, shape: "wisp", c: ["#34D3BE", "#8FB8FF"], w: [0.9, 1.4], r: [0.9, 1.05], sz: [2.4, 3.6], a: 0.5 },
  ] },
  dawn: { spd: 1, glow: 0.62, rays: { n: 9, c: "#FFB978", spin: 0.1, len: 1.4, a: 0.2, fan: 1 }, layers: [{ k: "rise", n: 18, shape: "dot", c: ["#FFD36B", "#FF8A5B", "#FFE9C2"], sp: [10, 20], life: [1.6, 2.8], sz: [1.5, 2.8], sway: 6, tw: 1 }] },
  wanderer: { spd: 0.95, glow: 0.4, layers: [{ k: "orbit", n: 14, shape: "leaf", c: ["#7BC96F", "#A7D96C", "#E0B872"], w: [0.5, 0.95], r: [1, 1.28], sz: [2.6, 4.2], wave: 0.12 }, { k: "rise", n: 10, shape: "dot", c: ["#E0B872", "#F3DDB0"], sp: [8, 16], life: [1.5, 2.6], sz: [1.3, 2.4], sway: 10, a: 0.75 }] },
  standardbearer: { spd: 0.85, glow: 0.5, layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/banner.webp", r: [0.5, 0.5], w: [0, 0], sz: [1.95, 1.95], even: 1, at: 0.75, y: 0.38, wobble: 0.035, bob: 1, a: 0.95, behind: 1, blend: "source-over" },
    { k: "rise", n: 7, shape: "ember", c: ["#FF6A3C", "#C2001F", "#E8C56A"], sp: [10, 20], life: [1.8, 3], sz: [0.9, 1.7], sway: 9, a: 0.6 },
  ] },
  // Atlas: a stone sphere rests above the head. Its moment is a violent
  // orbit — the sphere lifts off, circles the avatar faster and faster
  // (behind on the far side, in front on the near side, with a motion
  // trail and debris flung off), dives into the avatar centre and
  // explodes into light beams, a shockwave and rock chunks, then re-forms.
  atlas: { spd: 0.85, glow: 0.5, moment: {
    every: [20, 30], dur: 4.4,
    flash: { at: 0.72, flashPeak: 0.55, flashLife: 0.1, flashC: ["#FFF8E0", "#F0D090"], anchor: "center" },
    shake: { at: 0.72, amp: 0.16, dur: 0.45 },
    bursts: [
      { at: 0.72, path: "beams", n: 12, nScale: 0.5, c: ["#FFFDF2", "#FFF6D8", "#F0D090"], a: 0.95, lw: [2.4, 4.6], len: [0.62, 0.92], life: [0.42, 0.62], anchor: "center", over: 1 },
      { at: 0.72, path: "shockring", c: "#FFF3D0", a: 1, lw: 4, r0: 0.12, v: 3.4, life: [0.7, 0.7], anchor: "center", aspect: 1, over: 1 },
      { at: 0.74, path: "shockring", c: "#E8C878", a: 0.7, lw: 2, r0: 0.08, v: 2.6, life: [0.55, 0.55], anchor: "center", aspect: 1, over: 1 },
      { at: 0.72, path: "radial", shape: "shard", n: 10, c: ["#D9DEE7", "#9AA3B2", "#F4E3B2"], anchor: "center", sp: [90, 210], sz: [2.5, 4.5], life: [0.7, 1.2], grav: 2.6, a: 0.95, over: 1 },
      { at: 0.72, path: "radial", shape: "smoke", n: 20, c: ["#F4E3B2", "#D9B87A", "#B08D57"], anchor: "center", sp: [30, 85], sz: [5, 10], life: [0.9, 1.5], grav: 0.3, a: 0.7, over: 1 },
      { at: 0.72, path: "radial", shape: "sandgrain", n: 14, c: ["#F4E3B2", "#E8C878", "#C89B5A"], anchor: "center", sp: [60, 150], sz: [1.4, 2.6], life: [0.6, 1], grav: 2.4, a: 0.9, over: 1 },
      { at: 0.84, path: "shower", shape: "sandgrain", n: 8, c: ["#F4E3B2", "#E8C878"], anchor: "head", y: -0.1, dir: -0.25, sp: [15, 45], spread: 0.9, sz: [1.2, 2.2], life: [0.6, 1], grav: 1.8, a: 0.8, over: 1 },
    ] }, art: "atlas", layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/stone-sphere.webp", placed: "head", r: [1, 1], w: [0, 0], sz: [1, 1], even: 1, hover: -0.4, spin: 0.02, tremble: 0.008, a: 0.98, blend: "source-over",
      wander: { sx: 0.55, sy: 0.85, xR: 1.05, top: 1.05, bot: 0.6, zX: 1.1 },
      mside: "far", mTrail: { n: 6, lag: 0.015, a: 0.4 },
      mOrbit: { center: "center", rX: 1.25, rY: 0.85, from: 0.04, to: 0.66, hit: 0.72, revs: 2.5, ease: 1.8, blend: 0.1, reform: [0.8, 0.95],
        flings: { from: 0.16, every: 0.05, shape: "sandgrain", n: 2, c: ["#F4E3B2", "#E8C878", "#C89B5A"], sp: [40, 110], spread: 0.4, sz: [1.2, 2.4], life: [0.5, 0.9], grav: 2, a: 0.9 } },
      mShake: [[0, 1], [0.15, 1.5], [0.35, 3], [0.55, 6], [0.66, 8], [0.72, 0], [1, 0]], mScale: [[0, 1], [0.55, 1], [0.66, 1.08], [0.72, 1], [1, 1]],
      circle: { sz: [0.9, 0.9], hover: 0.51, wander: { sx: 0.55, sy: 0.85, xR: 0.62, top: 0.72, bot: 0.62, zX: 1.1 }, mOrbit: { center: "center", rX: 1.12, rY: 1.12, from: 0.04, to: 0.66, hit: 0.72, revs: 2.5, ease: 1.8, blend: 0.1, reform: [0.8, 0.95],
        flings: { from: 0.16, every: 0.05, shape: "sandgrain", n: 2, c: ["#F4E3B2", "#E8C878", "#C89B5A"], sp: [40, 110], spread: 0.4, sz: [1.2, 2.4], life: [0.5, 0.9], grav: 2, a: 0.9 } } } },
    { k: "orbit", n: 1, shape: "img", src: "/aura/stone-sphere.webp", placed: "head", r: [1, 1], w: [0, 0], sz: [1, 1], even: 1, hover: -0.4, spin: 0.02, a: 0.98, over: 1, blend: "source-over",
      wander: { sx: 0.55, sy: 0.85, xR: 1.05, top: 1.05, bot: 0.6, zX: 1.1 },
      mside: "near", mTrail: { n: 6, lag: 0.015, a: 0.4 },
      mOrbit: { center: "center", rX: 1.25, rY: 0.85, from: 0.04, to: 0.66, hit: 0.72, revs: 2.5, ease: 1.8, blend: 0.1 },
      mScale: [[0, 1], [0.55, 1], [0.66, 1.08], [0.72, 1], [1, 1]],
      circle: { sz: [0.9, 0.9], hover: 0.51, wander: { sx: 0.55, sy: 0.85, xR: 0.62, top: 0.72, bot: 0.62, zX: 1.1 }, mOrbit: { center: "center", rX: 1.12, rY: 1.12, from: 0.04, to: 0.66, hit: 0.72, revs: 2.5, ease: 1.8, blend: 0.1 } } },
    { k: "orbit", n: 5, shape: "shard", c: ["#8B93A6", "#C9CDD4", "#B9A8E8"], w: [0.06, 0.17], r: [1.14, 1.42], sz: [2.2, 4.2], jit: 0.08, a: 0.9, eject: { every: [4, 8], sp: [0.3, 0.45], life: 0.8 } },
    { k: "orbit", n: 3, shape: "shard", c: ["#A7B0C2", "#D9DEE7", "#C4B5FD"], w: [-0.15, -0.06], r: [1.04, 1.26], sz: [1.8, 3.2], jit: 0.06, a: 0.95, over: 1, frontOnly: 1, eject: { every: [5, 9], sp: [0.3, 0.45], life: 0.8 } },
    { k: "fall", n: 12, shape: "sandgrain", c: ["#E8C878", "#C9A86A", "#B9A8E8", "#F4E3B2"], sp: [10, 22], sz: [0.9, 1.8], drift: 3, a: 0.55 },
  ] },
  forge: { spd: 1, glow: 0.38, overArt: "forge", moment: { every: [6, 10], dur: 1.5,
    flash: { at: 0.26, flashPeak: 0.6, flashLife: 0.11, flashC: ["#FFF6E0", "#FFB43C"], anchor: "ground", x: 0.75 },
    bursts: [
      { at: 0.26, path: "shower", shape: "spark", n: 22, c: ["#FFF6C9", "#FFD447", "#FF9340"], anchor: "ground", x: 0.75, dir: -0.28, sp: [170, 320], spread: 0.95, sz: [1, 1.9], life: [0.4, 0.8], grav: 2.6, a: 0.95, over: 1 },
      { at: 0.26, path: "shower", shape: "spark", n: 8, c: ["#FFF6C9", "#FFB43C"], anchor: "ground", x: 0.75, dir: -0.16, sp: [80, 150], spread: 0.4, sz: [0.8, 1.4], life: [0.5, 0.9], grav: 2.6, a: 0.9, over: 1 },
      { at: 0.26, path: "shockring", c: "#FFD89A", a: 0.9, lw: 3, r0: 0.12, v: 2.6, life: [0.5, 0.5], anchor: "ground", x: 0.75, flat: 1, over: 1 },
      { at: 0.32, path: "shower", shape: "ember", n: 10, c: ["#FF9340", "#FF5A1F", "#FFD447"], anchor: "ground", x: 0.75, dir: -0.26, sp: [25, 70], spread: 1, sz: [0.9, 1.6], life: [1.4, 2.4], grav: 1.2, a: 0.85, over: 1 },
    ] }, layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/hammer.webp", r: [1.35, 1.35], w: [0, 0], sz: [1.1, 1.1], even: 1, at: 0.79, rot: 0.12, wobble: 0.02, a: 0.97, over: 1, blend: "source-over",
      mY: [[0, 0], [0.1, -0.12], [0.26, 2.5], [0.45, 2.5], [0.72, 0.08], [1, 0]], mX: [[0, 0], [0.1, -0.08], [0.26, 0.3], [0.45, 0.3], [0.8, 0], [1, 0]], mRot: [[0, 0], [0.1, -0.14], [0.26, 0.22], [0.5, 0.22], [0.85, 0], [1, 0]],
      circle: { r: [1.2, 1.2], sz: [0.95, 0.95], mY: [[0, 0], [0.1, -0.1], [0.26, 1.93], [0.45, 1.93], [0.72, 0.07], [1, 0]], mX: [[0, 0], [0.1, -0.06], [0.26, 0.32], [0.45, 0.32], [0.8, 0], [1, 0]] } },
    { k: "rise", n: 12, shape: "ember", c: ["#FFB43C", "#FF5A1F", "#FFE08A"], sp: [16, 34], life: [0.8, 1.6], sz: [1, 2], sway: 10, a: 0.75 },
    { k: "orbit", n: 8, shape: "spark", c: ["#FF9340", "#FFD447"], w: [0.12, 0.2], r: [0.95, 1.2], sz: [1, 1.8], a: 0.6 },
  ] },
  fallenlight: { spd: 0.9, glow: 0.42, art: "fallenlight",
    bolts: { every: [0.12, 0.22], calmEvery: [1.2, 2], overlap: 1, flashEvery: 2.4, c: ["#FF4D5A", "#FF8A7A", "#D92B2B"] },
    flare: { every: [4, 8], bolt: 1, anchor: "img:/aura/halo-cracked.webp", flashPeak: 0.34, flashLife: 0.09, flashC: ["#FFEAE0", "#FF7A5A"] },
    moment: { every: [18, 26], dur: 4.2,
      flash: { at: 0.3, flashPeak: 0.55, flashLife: 0.1, flashC: ["#FFEFE8", "#FF8A6A"], anchor: "img:/aura/halo-cracked.webp" },
      shake: { at: 0.3, amp: 0.12, dur: 0.4 },
      bursts: [
        { at: 0.3, path: "beams", n: 10, nScale: 0.5, c: ["#FFEFE0", "#FFB08A", "#FF6A5A"], a: 0.9, lw: [2, 3.6], len: [0.5, 0.8], life: [0.4, 0.6], anchor: "img:/aura/halo-cracked.webp", over: 1 },
        { at: 0.3, path: "radial", shape: "shard", n: 14, c: ["#E8B04B", "#C0453A", "#FF6A5A"], anchor: "img:/aura/halo-cracked.webp", sp: [55, 125], sz: [1.8, 3.4], life: [0.7, 1.2], grav: 1.6, a: 0.95, over: 1 },
        { at: 0.34, path: "shower", shape: "feather", n: 12, c: ["#C9B8A0", "#9A8878", "#6B5A4C"], anchor: "img:/aura/halo-cracked.webp", dir: 0.25, spread: 0.75, sp: [20, 60], sz: [1.4, 2.4], life: [1.6, 2.6], grav: 0.5, a: 0.9, over: 1 },
        { at: 0.34, path: "shower", shape: "ember", n: 10, c: ["#FF5A3C", "#C0392B", "#FF8A5A"], anchor: "img:/aura/halo-cracked.webp", dir: 0.25, spread: 0.7, sp: [15, 55], sz: [0.9, 1.6], life: [1.2, 2], grav: 0.7, a: 0.9, over: 1 },
        { at: 0.34, path: "shockring", c: "#FF8A6A", a: 0.7, lw: 2, r0: 0.1, v: 1.3, life: [0.5, 0.5], anchor: "img:/aura/halo-cracked.webp", aspect: 0.35, over: 1 },
      ] }, layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/halo-cracked.webp", placed: "head", r: [1, 1], w: [0, 0], sz: [0.82, 0.82], even: 1, hover: 0.12, breathe: 1, tremble: 0.004, a: 0.98, blend: "source-over",
      mY: [[0, 0], [0.3, 0.16], [0.6, 0.22], [0.85, 0], [1, 0]], mRot: [[0, 0], [0.3, 0.16], [0.6, 0.24], [0.85, 0], [1, 0]], mDim: [[0, 1], [0.3, 0.5], [0.55, 0.42], [0.8, 1], [1, 1]],
      circle: { sz: [0.9, 0.9], hover: 0.55 } },
    { k: "orbit", n: 1, shape: "img", src: "/aura/halo-shard.webp", r: [1.06, 1.06], w: [0.06, 0.06], sz: [0.45, 0.45], even: 1, bob: 1, a: 0.95, over: 1, blend: "source-over",
      mY: [[0, 0], [0.32, 0.1], [0.58, 0.9], [0.78, 0.9], [0.92, 0], [1, 0]], mRot: [[0, 0], [0.32, 0.3], [0.62, 1.1], [0.78, 1.7], [1, 1.7]], mDim: [[0, 1], [0.7, 1], [0.82, 0], [0.94, 0], [1, 1]],
      circle: { sz: [0.5, 0.5] } },
    { k: "orbit", n: 2, shape: "img", src: "/aura/feather.webp", w: [0.05, 0.08], r: [1.14, 1.3], sz: [0.22, 0.3], spin: 0.02, bob: 1, a: 0.85, blend: "source-over" },
    { k: "fall", n: 8, shape: "feather", c: ["#C9B8A0", "#9A8878", "#B8A890"], sp: [10, 22], sz: [1.2, 2], drift: 6, a: 0.65 },
    { k: "fall", n: 5, shape: "ember", c: ["#FF5A3C", "#C0392B", "#FF8A5A"], sp: [8, 18], sz: [0.8, 1.4], drift: 5, a: 0.75 },
    { k: "rise", n: 10, shape: "dot", c: ["#E8B86A", "#C0453A", "#FF8A7A"], sp: [8, 18], life: [1.4, 2.6], sz: [1, 1.8], sway: 14, a: 0.5 },
    { k: "orbit", n: 10, shape: "sandgrain", c: ["#D8B878", "#C0453A", "#8A6A4C"], w: [0.05, 0.14], r: [1.06, 1.3], sz: [0.9, 1.7], jit: 0.06, a: 0.6 },
  ] },
  ossuary: { spd: 0.85, glow: 0.4, art: "ossuary",
    moment: { every: [20, 30], dur: 4.6,
      flash: { at: 0.28, flashPeak: 0.35, flashLife: 0.09, flashC: ["#E8FFF2", "#7CE8A8"], anchor: "img:/aura/crown-bone.webp" },
      shake: { at: 0.3, amp: 0.11, dur: 0.55 },
      bursts: [
        { at: 0.28, path: "shower", shape: "bonechip", n: 12, c: ["#F2EAD6", "#D8CDB2", "#9FE8B8"], anchor: "img:/aura/crown-bone.webp", dir: -0.25, spread: 0.5, sp: [80, 160], sz: [1.6, 3], life: [0.9, 1.5], grav: 1.4, a: 0.9, over: 1 },
        { at: 0.3, path: "shower", shape: "shard", n: 6, c: ["#E8E0CC", "#7CE8A8"], anchor: "img:/aura/crown-bone.webp", dir: -0.25, spread: 0.35, sp: [50, 110], sz: [1.8, 3.2], life: [0.9, 1.4], grav: 1.3, a: 0.85, over: 1 },
      ] }, layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/crown-bone.webp", placed: "head", r: [1, 1], w: [0, 0], sz: [0.62, 0.62], even: 1, hover: -0.62, wobble: 0.03, a: 0.97, blend: "source-over",
      mY: [[0, 0], [0.28, -0.12], [0.5, -0.12], [0.8, 0], [1, 0]], mRot: [[0, 0], [0.28, -0.06], [0.55, 0.05], [0.8, 0], [1, 0]],
      circle: { sz: [0.6, 0.6], hover: 0.85 } },
    { k: "orbit", n: 1, shape: "img", src: "/aura/bone-shard-1.webp", r: [1.18, 1.18], w: [0.05, 0.05], sz: [0.42, 0.42], even: 1, rot: 0.3, spin: 0.01, tremble: 0.012, behind: 1, a: 0.92, blend: "source-over",
      mY: [[0, 0], [0.28, -0.3], [0.5, -0.4], [0.85, 0], [1, 0]], mRot: [[0, 0], [0.28, 0.4], [0.7, 0.9], [0.92, 0], [1, 0]],
      mSpin: [[0, 0], [0.25, 0], [0.5, 3.5], [0.72, 7], [0.88, 1], [1, 0]], mR: [[0, 1], [0.3, 1], [0.55, 0.82], [0.72, 0.72], [0.9, 1], [1, 1]],
      mFlings: { from: 0.34, to: 0.82, every: 0.09, shape: "smoke", n: 1, c: ["#7CE8A8", "#4ADE80"], spread: 1.4, sp: [4, 16], sz: [3, 5], life: [0.4, 0.7], a: 0.4 } },
    { k: "orbit", n: 1, shape: "img", src: "/aura/bone-shard-2.webp", r: [1.3, 1.3], w: [-0.04, -0.04], sz: [0.5, 0.5], even: 1, rot: -0.15, spin: -0.008, tremble: 0.012, behind: 1, a: 0.9, blend: "source-over",
      mY: [[0, 0], [0.3, -0.26], [0.55, -0.38], [0.86, 0], [1, 0]], mRot: [[0, 0], [0.3, -0.4], [0.7, -0.8], [0.94, 0], [1, 0]],
      mSpin: [[0, 0], [0.28, 0], [0.52, 3.2], [0.74, 6.5], [0.9, 0.8], [1, 0]], mR: [[0, 1], [0.32, 1], [0.58, 0.8], [0.74, 0.7], [0.92, 1], [1, 1]],
      mFlings: { from: 0.36, to: 0.82, every: 0.1, shape: "smoke", n: 1, c: ["#7CE8A8"], spread: 1.4, sp: [4, 14], sz: [3, 5], life: [0.4, 0.7], a: 0.38 } },
    { k: "orbit", n: 1, shape: "img", src: "/aura/bone-shard-3.webp", r: [1.12, 1.12], w: [0.06, 0.06], sz: [0.44, 0.44], even: 1, tremble: 0.012, a: 0.94, over: 1, frontOnly: 1, blend: "source-over",
      mY: [[0, 0], [0.32, -0.28], [0.58, -0.4], [0.88, 0], [1, 0]], mRot: [[0, 0], [0.32, 0.5], [0.72, 1.1], [0.95, 0], [1, 0]],
      mSpin: [[0, 0], [0.26, 0], [0.5, 4], [0.74, 8], [0.9, 1], [1, 0]], mR: [[0, 1], [0.3, 1], [0.56, 0.78], [0.74, 0.68], [0.9, 1], [1, 1]],
      mFlings: { from: 0.34, to: 0.82, every: 0.09, shape: "smoke", n: 1, c: ["#7CE8A8", "#4ADE80"], spread: 1.4, sp: [4, 16], sz: [3, 5], life: [0.4, 0.7], a: 0.4, over: 1 } },
    { k: "orbit", n: 9, shape: "bonechip", c: ["#F2EAD6", "#D8CDB2", "#B9AE93"], w: [0.1, 0.22], r: [1.06, 1.24], sz: [2, 3.6], a: 0.85,
      mSpin: [[0, 0], [0.3, 0], [0.55, 3], [0.74, 5.5], [0.9, 0.8], [1, 0]] },
    { k: "rise", n: 10, shape: "smoke", c: ["#9FE8B8", "#6FBF8F"], sp: [10, 20], life: [1.6, 2.8], sz: [5, 9], sway: 10, a: 0.28, blend: "source-over" },
  ] },
  wyrm: { spd: 1.5, glow: 0.64, layers: [{ k: "orbit", n: 24, shape: "shard", c: ["#3DF08A", "#B6FFD9", "#FFD447"], w: [1.1, 2], r: [0.94, 1.22], sz: [2.6, 4.6] }, { k: "rise", n: 16, shape: "ember", c: ["#3DF08A", "#FFD447"], sp: [22, 48], life: [0.7, 1.4], sz: [1.2, 2.1], sway: 12 }] },
  // Frostbite: sharp, aggressive ice — deep blue and white, jagged crystal
  // shards that periodically burst outward off the ring (eject), fast
  // ice-spark streaks and a dark glacial core. Calm snow belongs to
  // zeropoint; this one bites.
  frost: { spd: 1.5, glow: 1, layers: [
    { k: "orbit", n: 7, shape: "smoke", c: ["#0A2A6B", "#14406B", "#1E5EFF"], w: [0.08, 0.16], r: [0.2, 0.66], sz: [8, 11], a: 0.7, blend: "source-over" },
    { k: "orbit", n: 9, shape: "crystal", c: ["#3D8BFF", "#B3ECFF", "#FFFFFF"], w: [0.5, 0.9], r: [1.02, 1.16], sz: [2.8, 4], tw: 1,
      eject: { every: [3, 6], sp: [0.28, 0.42], life: 0.7 } },
    { k: "orbit", n: 8, shape: "spark", c: ["#FFFFFF", "#B3ECFF"], w: [2.4, 3.8], r: [1.08, 1.22], sz: [1.2, 2] },
    { k: "orbit", n: 6, shape: "shard", c: ["#1E5EFF", "#DDF6FF"], w: [1.2, 2], r: [1.14, 1.26], sz: [2, 3] },
  ] },
  // Abyss moment: a black hole opens behind the avatar — a pinpoint of
  // darkness grows to a black disc with a spinning violet-magenta accretion
  // ring, the orbit layers speed up and spiral into it (mSpin/mR), then it
  // collapses inward and vanishes with a gated flash.
  abyss: { spd: 1.6, glow: 0.62, dark: 1, art: "abyss", moment: {
    every: [24, 34], dur: 3,
    flash: { at: 0.8, flashPeak: 0.5, flashLife: 0.1, flashC: ["#E8C9FF", "#B14BFF"], anchor: "center" },
    shake: { at: 0.8, amp: 0.11, dur: 0.4 },
    bursts: [{ at: 0.82, path: "shockring", c: "#B14BFF", a: 0.8, lw: 2.4, r0: 0.12, v: 2.6, life: [0.5, 0.5], anchor: "center", aspect: 1 }],
  }, layers: [
    { k: "inward", n: 10, shape: "dot", c: ["#6A00FF", "#B14BFF", "#FF2D6F"], sp: [0.55, 1.05], life: [1, 1.9], sz: [1.8, 3.2], fit: 1 },
    { k: "orbit", n: 9, shape: "sandgrain", c: ["#B14BFF", "#FF2D6F", "#38C6FF"], w: [1, 2.2], r: [0.94, 1.22], sz: [1.2, 2.2],
      mSpin: [[0, 0], [0.15, 0.6], [0.5, 4], [0.75, 7], [0.85, 0], [1, 0]], mR: [[0, 1], [0.5, 1], [0.72, 0.6], [0.8, 0.22], [0.92, 1], [1, 1]] },
    { k: "orbit", n: 4, shape: "sparkle", c: ["#E8C9FF", "#FF9AD5"], w: [0.4, 0.8], r: [1.04, 1.14], sz: [2.2, 3.2], tw: 1,
      mSpin: [[0, 0], [0.15, 0.6], [0.5, 4], [0.75, 7], [0.85, 0], [1, 0]], mR: [[0, 1], [0.5, 1], [0.72, 0.6], [0.8, 0.22], [0.92, 1], [1, 1]] },
    { k: "orbit", n: 5, shape: "orb", c: ["#B14BFF", "#FF2D6F"], w: [0.5, 0.9], r: [1.1, 1.24], sz: [1.8, 2.6], tw: 1,
      mSpin: [[0, 0], [0.15, 0.6], [0.5, 4], [0.75, 7], [0.85, 0], [1, 0]], mR: [[0, 1], [0.5, 1], [0.72, 0.6], [0.8, 0.22], [0.92, 1], [1, 1]] },
    { k: "rise", n: 8, shape: "wisp", c: ["#B14BFF", "#6A00FF"], sp: [8, 16], life: [1.6, 2.6], sz: [3, 5], sway: 8, a: 0.5, circle: { n: 0, a: 0 } },
  ] },
  chud: { spd: 1, glow: 0.48, layers: [{ k: "orbit", n: 5, shape: "emoji", e: ["🍔", "🍟", "🍔", "🥤", "🍔"], w: [0.55, 0.55], r: [1.14, 1.14], sz: [0.18, 0.18], bob: 1, even: 1 }, { k: "rise", n: 10, shape: "smoke", c: ["#E9D9A6", "#C9B98A"], sp: [8, 14], life: [1.6, 2.6], sz: [4, 8], sway: 8, a: 0.35, blend: "source-over" }] },
  rust: { spd: 1.35, glow: 0.95, rings: [{ r: 1.14, c: "#C7743A", spin: -0.04, a: 0.55, w: 2, dash: 1 }, { r: 1.08, c: "#F0B07A", spin: 0.05, a: 0.2, w: 10 }], layers: [
    { k: "orbit", n: 10, shape: "square", c: ["#C7743A", "#E39A5E", "#8B4513"], w: [0.8, 1.4], r: [1.04, 1.16], sz: [3, 4.4], spin: 1 },
    { k: "orbit", n: 8, shape: "sandgrain", c: ["#FFB86B", "#FF7A2D", "#F0B07A"], w: [1.4, 2.4], r: [1.1, 1.26], sz: [1.6, 2.4], tw: 1 },
    { k: "orbit", n: 5, shape: "sparkle", c: ["#FFE0B8", "#F0B07A"], w: [0.4, 0.8], r: [1, 1.1], sz: [2, 3], tw: 1 },
    { k: "orbit", n: 12, shape: "smoke", c: ["#FFE0B8", "#F0B07A"], w: [0.08, 0.18], r: [0.2, 0.6], sz: [7, 10], a: 0.7, blend: "lighter" },
    { k: "fall", n: 16, shape: "square", c: ["#C7743A", "#E39A5E", "#F0B07A"], sp: [16, 30], sz: [1.6, 3], drift: 8, spin: 1, xWrap: 1, xFade: 8, circle: { n: 0, a: 0 } },
  ] },
  // Thunderhead: a boss thunderstorm — heavy dark cloud bank, gold-yellow
  // lightning as the signature (multi-strike bursts, fitted), gold sparks
  // and white-hot motes in the churn.
  thunder: { spd: 1.5, glow: 1, bolts: { burst: [2, 3], burstSpan: 0.3, gap: [1.8, 3.2], c: ["#FFF27A", "#FFE9A8"], flash: 1, fit: 1 }, layers: [
    { k: "orbit", n: 9, shape: "smoke", c: ["#141821", "#232B3A", "#3A3226"], w: [0.06, 0.14], r: [0.18, 0.7], sz: [8, 12], a: 0.8, blend: "source-over" },
    { k: "orbit", n: 10, shape: "zap", c: ["#FFF27A", "#FFE9A8"], w: [1, 1.8], r: [1.02, 1.16], sz: [2.6, 3.8], tw: 1 },
    { k: "orbit", n: 8, shape: "spark", c: ["#FFE9A8", "#FFFFFF"], w: [2.4, 3.6], r: [1.1, 1.24], sz: [1.2, 2] },
    { k: "rise", n: 5, shape: "smoke", c: ["#232B3A", "#3A3226"], sp: [4, 9], life: [2.6, 3.8], sz: [4, 7], sway: 8, a: 0.4, blend: "source-over", circle: { n: 0, a: 0 } },
  ] },
  hollow: { spd: 1.2, glow: 0.52, layers: [{ k: "orbit", n: 16, shape: "chainlink", c: ["#9AA7BD", "#DDE6F2", "#FFFFFF"], w: [0.35, 0.7], r: [1, 1.26], sz: [3.2, 5.2] }, { k: "rise", n: 10, shape: "smoke", c: ["#8A94A6", "#5F6878"], sp: [6, 12], life: [1.8, 3], sz: [7, 13], sway: 6, a: 0.25, blend: "source-over" }] },
  deep: { spd: 1.4, glow: 0.58, layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/tentacle.webp", r: [1.18, 1.18], w: [0, 0], sz: [1, 1], even: 1, at: 0.38, rot: 0.1, wobble: 0.09, a: 0.85, behind: 1, blend: "source-over" },
    { k: "orbit", n: 1, shape: "img", src: "/aura/tentacle.webp", r: [1.1, 1.1], w: [0, 0], sz: [0.8, 0.8], even: 1, at: 0.62, rot: -0.16, flip: 1, wobble: 0.07, a: 0.62, behind: 1, blend: "source-over" },
    { k: "orbit", n: 1, shape: "img", src: "/aura/tentacle.webp", r: [1.22, 1.22], w: [0, 0], sz: [0.65, 0.65], even: 1, at: 0.08, rot: 0.28, wobble: 0.08, a: 0.5, behind: 1, blend: "source-over" },
    { k: "bubble", n: 18, c: ["#9BE7FF", "#00D9FF", "#6FA0FF"], sp: [14, 28], life: [1.3, 2.5], sz: [1.8, 5] },
    { k: "inward", n: 8, shape: "dot", c: ["#2F6BFF", "#00D9FF"], sp: [0.35, 0.65], life: [1.5, 2.4], sz: [1.3, 2.6] },
  ] },
  magma: { spd: 1.55, glow: 0.72, layers: [{ k: "rise", n: 24, shape: "dot", c: ["#FF5A1F", "#FFB43C", "#FFD447"], sp: [18, 38], life: [0.7, 1.4], sz: [3.2, 7], sway: 4, a: 0.88 }, { k: "rise", n: 12, shape: "ember", c: ["#FFE08A", "#FF5A1F"], sp: [28, 55], life: [0.5, 1], sz: [1, 1.8], sway: 12 }] },
  plague: { spd: 1.25, glow: 0.48, layers: [{ k: "rise", n: 12, shape: "smoke", c: ["#8BC34A", "#5E8C2A"], sp: [7, 14], life: [1.8, 3], sz: [7, 13], sway: 8, a: 0.3 }, { k: "bubble", n: 14, c: ["#C6F07A", "#8BC34A"], sp: [12, 22], life: [1.1, 2.2], sz: [1.8, 3.8] }] },
  sand: { spd: 1.65, glow: 0.46, layers: [{ k: "orbit", n: 40, shape: "sandgrain", c: ["#E8C872", "#B8860B", "#F6E3A8"], w: [1.6, 2.8], r: [0.9, 1.38], sz: [1, 2], wave: 0.2, a: 0.92 }, { k: "fall", n: 12, shape: "square", c: ["#E8C872", "#C9962E"], sp: [22, 40], sz: [1.2, 2.2], drift: 16, spin: 1 }] },
  // Void is the starfield aura: a deep indigo/midnight field with a dense
  // constellation of white and pale-gold stars and shooting-star comets —
  // bright, not dark-banded, and clearly different from abyss's violet
  // nebula. Moment: an indigo portal spirals open behind the avatar, stars
  // stream out (bursts), then it spirals shut.
  void: { spd: 1.5, glow: 1.2, art: "void", moment: {
    every: [24, 34], dur: 3,
    flash: { at: 0.3, flashPeak: 0.4, flashLife: 0.09, flashC: ["#EAF0FF", "#7C8FE8"], anchor: "center" },
    bursts: [
      { at: 0.32, path: "radial", shape: "star", n: 10, c: ["#FFFFFF", "#FFE9A8", "#B9C8FF"], anchor: "center", sp: [16, 30], sz: [1.6, 2.6], life: [0.45, 0.65], grav: 0, a: 0.95 },
      { at: 0.5, path: "radial", shape: "comet", n: 3, c: ["#FFFFFF", "#FFE9A8"], anchor: "center", sp: [18, 28], sz: [1.3, 1.8], life: [0.4, 0.6], grav: 0, a: 0.95 },
      { at: 0.58, path: "radial", shape: "sparkle", n: 8, c: ["#FFFFFF", "#FFE9A8", "#7C8FE8"], anchor: "center", sp: [16, 28], sz: [1.4, 2.4], life: [0.4, 0.6], grav: 0, a: 0.9 },
    ] }, layers: [
    { k: "orbit", n: 8, shape: "smoke", c: ["#2B3A8F", "#3F51B5", "#4A5FC8"], w: [0.05, 0.12], r: [0.15, 0.66], sz: [8, 11], a: 0.75, blend: "source-over" },
    { k: "orbit", n: 9, shape: "star", c: ["#FFFFFF", "#FFE9A8", "#B9C8FF"], w: [0.3, 0.7], r: [0.96, 1.12], sz: [1.8, 3], tw: 1,
      mSpin: [[0, 0], [0.2, 0.4], [0.55, 2.5], [0.72, 4], [0.9, 0], [1, 0]] },
    { k: "orbit", n: 5, shape: "sparkle", c: ["#FFFFFF", "#FFE9A8"], w: [0.5, 0.9], r: [1.0, 1.14], sz: [2.2, 3.2], tw: 1,
      mSpin: [[0, 0], [0.2, 0.4], [0.55, 2.5], [0.72, 4], [0.9, 0], [1, 0]] },
    { k: "orbit", n: 6, shape: "dot", c: ["#7C8FE8", "#B9C8FF", "#FFFFFF"], w: [1.4, 2.4], r: [1.1, 1.22], sz: [1.2, 2], tw: 1 },
    { k: "orbit", n: 3, shape: "comet", c: ["#FFFFFF", "#FFE9A8", "#7C8FE8"], w: [0.9, 1.5], r: [1.05, 1.16], sz: [1.2, 1.7] },
  ] },
  yogurt: { spd: 0.95, glow: 0.42, layers: [{ k: "orbit", n: 3, shape: "emoji", e: ["🥣", "🥛", "🥣"], w: [0.5, 0.5], r: [1.14, 1.14], sz: [0.18, 0.18], bob: 1, even: 1 }, { k: "bubble", n: 12, c: ["#FFFFFF", "#FFF8E7"], sp: [8, 16], life: [1.4, 2.6], sz: [1.8, 3.6] }] },
  // Vendetta moment (~3.5s): an obsidian skull flies in and grows large in
  // front of the avatar (over-canvas), its sockets ignite to glowing red on
  // a ramp, it spews a roaring crimson-orange flame stream through the
  // transparent mouth, then recedes and the normal aura returns.
  vendetta: { spd: 1.7, glow: 0.45, dark: 1, overArt: "vendetta", moment: {
    every: [26, 36], dur: 3.5,
    flash: { at: 0.46, flashPeak: 0.45, flashLife: 0.1, flashC: ["#FF6B4D", "#C2001F"], anchor: "center" },
  }, bolts: { every: [0.7, 1.5], c: ["#FF4D6D", "#FFB3C1"], fit: 1 }, rings: [{ r: 1.26, c: "#8A0020", spin: 0.05, a: 0.5, w: 2.2, dash: 1 }], layers: [
    { k: "inward", n: 20, shape: "dot", c: ["#3A0010", "#5A0018", "#1A0008"], sp: [0.55, 1], life: [1, 1.8], sz: [2, 3.4], blend: "source-over", a: 0.85, fit: 1 },
    { k: "orbit", n: 6, shape: "shard", c: ["#FF1F4B", "#FF6B8F", "#8A0020"], w: [1.1, 1.8], r: [1, 1.1], sz: [3.2, 4.2] },
    { k: "orbit", n: 4, shape: "sparkle", c: ["#FFB3C1", "#FFFFFF"], w: [0.5, 0.9], r: [1.02, 1.12], sz: [2, 2.8], tw: 1 },
    { k: "orbit", n: 7, shape: "dot", c: ["#FF1F4B", "#FF6B8F"], w: [2, 3.2], r: [1.14, 1.24], sz: [1.4, 2.2], tw: 1 },
    { k: "rise", n: 14, shape: "drop", c: ["#FF1F4B", "#FF6B8F", "#FFB3C1"], sp: [20, 42], life: [0.7, 1.4], sz: [1.2, 2.2], sway: 8, low: 1, circle: { n: 0, a: 0 } },
  ] },
  champion: { spd: 1.45, glow: 0.68, rays: { n: 12, c: "#FFD447", spin: 0.28, len: 1.45, a: 0.18 }, sweep: { c: "#FFD447", a: 0.85, spd: 0.28, r: 1, w: 3.2, span: 0.55 }, layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/crown.webp", placed: "head", r: [1, 1], w: [0, 0], sz: [0.7, 0.7], even: 1, bob: 1, wobble: 0.05, a: 0.98, blend: "source-over", hover: 0.1 },
    { k: "rise", n: 22, shape: "square", c: ["#FFD447", "#FF9340", "#FFF1B8"], sp: [16, 34], life: [1, 1.8], sz: [1.8, 3.2], sway: 14, spin: 1 },
    { k: "orbit", n: 10, shape: "star", c: ["#FFFFFF", "#FFD447"], w: [0.8, 1.4], r: [1.04, 1.2], sz: [1.1, 1.9], tw: 1 },
  ] },
  ascended: { spd: 1.25, glow: 0.28, art: "ophanim", rays: { n: 14, c: "#FFD447", spin: 0.48, len: 1.42, a: 0.2 }, bolts: { every: [0.5, 1.2], c: ["#7DF9FF", "#FFD447", "#FFFFFF"] }, layers: [
    { k: "orbit", n: 12, shape: "eye", c: ["#7DF9FF"], w: [0.7, 0.7], r: [1.12, 1.12], sz: [2.1, 2.1], even: 1 },
    { k: "orbit", n: 8, shape: "eye", c: ["#FFD447"], w: [-1.05, -1.05], r: [0.94, 0.94], sz: [2.4, 2.4], even: 1 },
    { k: "orbit", n: 14, shape: "star", c: ["#FFFFFF", "#FFD447", "#7DF9FF"], w: [0.5, 1.3], r: [1.04, 1.28], sz: [0.9, 1.6], tw: 1 },
    { k: "rise", n: 16, shape: "feather", c: ["#FFD447", "#FFFFFF", "#7DF9FF"], sp: [18, 40], life: [0.7, 1.4], sz: [0.9, 1.6], sway: 12 },
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
  sigil: { spd: 0.9, glow: 0.78, layers: [
    { k: "orbit", n: 7, shape: "rune", c: ["#FFD447", "#FFB86B", "#FFF3C9"], w: [0.5, 0.9], r: [1.05, 1.16], sz: [2.6, 3.4] },
    { k: "orbit", n: 10, shape: "ember", c: ["#FFB86B", "#FFD447"], w: [1.8, 3], r: [1.12, 1.22], sz: [1.6, 2.6], tw: 1 },
    { k: "orbit", n: 5, shape: "sparkle", c: ["#FFFFFF", "#FFF3C9"], w: [0.4, 0.7], r: [1, 1.1], sz: [2.2, 3], tw: 1 },
    { k: "rise", n: 10, shape: "rune", c: ["#FFB86B", "#FFD447"], sp: [8, 14], life: [1.2, 2], sz: [1.8, 2.6], sway: 5, circle: { n: 0, a: 0 } },
  ] },
  glassfire: { spd: 1.1, glow: 1.05, rings: [{ r: 1.1, c: "#EC4899", spin: 0.06, a: 0.5, w: 2, dash: 1 }, { r: 1.15, c: "#FFB3D1", spin: -0.04, a: 0.22, w: 14 }], layers: [
    { k: "orbit", n: 8, shape: "crystal", c: ["#A855F7", "#EC4899", "#FFFFFF"], w: [0.8, 1.4], r: [1, 1.1], sz: [3.4, 4.6] },
    { k: "orbit", n: 12, shape: "ember", c: ["#F78BD0", "#FFD9EE", "#C77DFF"], w: [2, 3.2], r: [1.08, 1.18], sz: [1.8, 2.8], tw: 1 },
    { k: "orbit", n: 6, shape: "sparkle", c: ["#FFFFFF", "#FFB3D1"], w: [0.5, 0.9], r: [1, 1.1], sz: [2.4, 3.4], tw: 1 },
    { k: "orbit", n: 18, shape: "smoke", c: ["#FFF0F8", "#F5D0FF"], w: [0.08, 0.18], r: [0.15, 0.62], sz: [8, 11], a: 0.9, blend: "lighter" },
    { k: "rise", n: 14, shape: "ember", c: ["#EC4899", "#A855F7", "#FFB3D1"], sp: [14, 26], life: [0.8, 1.3], sz: [1.6, 2.8], sway: 8, circle: { n: 0, a: 0 } },
  ] },
  redline: { spd: 1.3, glow: 0.88, bolts: { every: [0.9, 1.4], c: ["#FFD447", "#FFF6C9"] }, rings: [{ r: 1.08, c: "#160000", spin: 0.08, a: 0.95, w: 4 }], layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/hat-straw.webp", placed: "head", headSz: 3.2, r: [1, 1], w: [0, 0], sz: [1, 1], even: 1, hover: -0.3, rot: 0.02, wobble: 0.02, bob: 1, bobAmp: 0.04, breathe: 1, a: 0.98, over: 1, blend: "source-over",
      rim: 1, rimSz: 1.05, rimSink: 0.12, y: -0.18, circle: { y: 0 } },
    { k: "rise", n: 58, shape: "smoke", c: ["#C2001F", "#FF1F4B", "#430008"], sp: [30, 68], life: [0.7, 1.4], sz: [3.2, 7.2], sway: 12, a: 0.62, blend: "source-over" },
    { k: "orbit", n: 14, shape: "pulse", c: ["#FFD447", "#FFF6C9"], w: [1.2, 2], r: [1.14, 1.35], sz: [1.1, 2.1] },
  ] },
  eclipseheart: { spd: 0.58, glow: 0.96, sweep: { c: "#FFF6C9", a: 1, spd: 0.85, r: 1.14, w: 4.4, span: 1.15 }, rays: { n: 10, c: "#FFD447", spin: 0.05, len: 1.48, a: 0.36 }, rings: [{ r: 1.32, c: "#FFF1B8", spin: -0.04, a: 0.9, w: 1.4, ink: 1 }, { r: 1.14, c: "#FFD447", spin: 0.05, a: 1, w: 4.2, filigree: 18, ink: 1 }], layers: [
    { k: "orbit", n: 41, shape: "img", src: ["/aura/gem-ruby.png", "/aura/gem-amber.png", "/aura/gem-emerald.png", "/aura/gem-aqua.png", "/aura/gem-sapphire.png", "/aura/gem-amethyst.png", "/aura/gem-clear.png"], w: [0.04, 0.04], r: [1.32, 1.32], sz: [0.53, 0.53], even: 1, jit: 0.08, spin: 0.035, a: 0.96, glint: 1, blend: "source-over", circle: { sz: [0.68, 0.64], jit: 0, n: 22 } },
    { k: "orbit", n: 8, shape: "img", src: ["/aura/gem-ruby.png", "/aura/gem-amber.png", "/aura/gem-emerald.png", "/aura/gem-aqua.png", "/aura/gem-sapphire.png", "/aura/gem-amethyst.png", "/aura/gem-clear.png"], w: [-0.032, -0.032], r: [1.14, 1.14], sz: [0.2, 0.28], even: 1, jit: 0.07, spin: -0.028, a: 0.96, glint: 1, blend: "source-over" },
    { k: "orbit", n: 10, shape: "ember", c: ["#FFD447", "#FFF6C9", "#C9962E"], w: [0.14, 0.26], r: [0.9, 1.2], sz: [1.7, 2.8], tw: 1, blend: "source-over", a: 0.95 },
    { k: "rise", n: 5, shape: "smoke", c: ["#E8C56A", "#C9A56A"], sp: [4, 9], life: [2.4, 3.4], sz: [4.5, 7.5], sway: 9, a: 0.22, blend: "source-over" },
    { k: "rise", n: 8, shape: "dot", c: ["#FFF6C9", "#FFD447"], sp: [6, 12], life: [1.8, 2.8], sz: [1.4, 2.2], sway: 6, a: 0.85, tw: 1, blend: "source-over" },
  ] },
  steadybreath: { spd: 0.8, glow: 0.75, rings: [{ r: 1.14, c: "#DFFBFF", spin: 0.02, a: 0.68, w: 2.2, breath: 0.12, breathS: 5 }], layers: [
    { k: "orbit", n: 8, shape: "pulse", c: ["#DFFBFF", "#7DF9FF", "#FFFFFF"], w: [0.18, 0.35], r: [1.06, 1.16], sz: [2.4, 3.4], tw: 1 },
    { k: "orbit", n: 6, shape: "wisp", c: ["#7DF9FF", "#DFFBFF"], w: [0.5, 0.9], r: [1.06, 1.16], sz: [2.8, 3.8], a: 0.7 },
    { k: "orbit", n: 6, shape: "sparkle", c: ["#FFFFFF", "#DFFBFF"], w: [0.6, 1], r: [0.98, 1.08], sz: [1.8, 2.6], tw: 1 },
    { k: "rise", n: 8, shape: "wisp", c: ["#7DF9FF", "#DFFBFF"], sp: [6, 12], life: [2.4, 3.8], sz: [3.5, 5.5], sway: 6, a: 0.6, circle: { n: 0, a: 0 } },
  ] },
  iaidraw: { spd: 1, glow: 0.78, sweep: { c: "#FFFFFF", a: 1, spd: 5.5, r: 1.16, w: 2.6, span: 0.28 }, layers: [
    { k: "orbit", n: 7, shape: "shard", c: ["#FFFFFF", "#E8ECF4", "#C2001F"], w: [0.9, 1.6], r: [1.06, 1.16], sz: [2.6, 3.4] },
    { k: "orbit", n: 5, shape: "sparkle", c: ["#FF3A3A", "#FFB3C1"], w: [1.4, 2.2], r: [1, 1.1], sz: [2, 3], tw: 1 },
    { k: "orbit", n: 8, shape: "dot", c: ["#C2001F", "#FF6B7A"], w: [2.4, 3.6], r: [1.14, 1.26], sz: [1.4, 2.2], tw: 1 },
    { k: "rise", n: 6, shape: "shard", c: ["#E8ECF4", "#C2001F"], sp: [16, 28], life: [0.8, 1.4], sz: [1.6, 2.6], sway: 10, circle: { n: 0, a: 0 } },
  ] },
  stormstep: { spd: 1.2, glow: 1.05, bolts: { every: [0.35, 0.45], c: ["#FFFFFF", "#7DD3FC"], flash: 1, fit: 1 }, layers: [
    { k: "orbit", n: 10, shape: "zap", c: ["#FFFFFF", "#7DD3FC"], w: [1.6, 2.6], r: [1, 1.14], sz: [2.8, 4.4] },
    { k: "orbit", n: 10, shape: "spark", c: ["#FFFFFF", "#7DD3FC", "#38BDF8"], w: [2.6, 3.8], r: [1.14, 1.28], sz: [1, 1.8] },
    { k: "orbit", n: 5, shape: "sparkle", c: ["#FFFFFF", "#B3ECFF"], w: [0.4, 0.7], r: [1.02, 1.12], sz: [2.4, 3.2], tw: 1 },
    { k: "rise", n: 8, shape: "spark", c: ["#7DD3FC", "#B3ECFF"], sp: [20, 36], life: [0.8, 1.5], sz: [1.4, 2.4], sway: 14, a: 0.7, circle: { n: 0, a: 0 } },
  ] },
  zeropoint: { spd: 0.8, glow: 1.05, rings: [{ r: 1.12, c: "#DDF6FF", spin: 0.04, a: 0.6, w: 2.4, filigree: 6 }], layers: [
    { k: "orbit", n: 4, shape: "crystal", c: ["#EAFBFF", "#B3ECFF", "#FFFFFF"], w: [0.2, 0.45], r: [1.04, 1.14], sz: [3.4, 4.6], even: 1 },
    { k: "orbit", n: 4, shape: "flake", c: ["#FFFFFF", "#DDF6FF"], w: [0.5, 0.9], r: [1.1, 1.24], sz: [1.8, 2.8], tw: 1 },
    { k: "orbit", n: 3, shape: "sparkle", c: ["#FFFFFF", "#B3ECFF"], w: [0.4, 0.8], r: [1, 1.1], sz: [2.2, 3], tw: 1 },
    { k: "orbit", n: 5, shape: "smoke", c: ["#EAFBFF", "#C9E9FF"], w: [0.08, 0.18], r: [0.35, 0.7], sz: [6, 9], a: 0.3, blend: "source-over" },
    { k: "fall", n: 10, shape: "flake", c: ["#FFFFFF", "#DDF6FF"], sp: [10, 18], sz: [1.6, 2.8], drift: 3, a: 0.8, xWrap: 1, xFade: 8, circle: { n: 0, a: 0 } },
  ] },
  ninetail: { spd: 0.9, glow: 1, art: "ninetail", rays: { n: 3, c: "#FF9340", spin: 0.08, len: 1.5, a: 0.36, fit: 1 }, layers: [
    { k: "orbit", n: 9, shape: "ember", c: ["#FFD447", "#FF9340", "#FF4D00"], w: [0.3, 0.55], r: [0.98, 1.06], sz: [3.0, 3.8], even: 1, tw: 1 },
    { k: "orbit", n: 6, shape: "orb", c: ["#FFE9C2", "#FFB86B"], w: [0.4, 0.7], r: [0.96, 1.06], sz: [2.2, 3], tw: 1 },
    { k: "orbit", n: 4, shape: "sparkle", c: ["#FFF6C9", "#FFD447"], w: [0.5, 0.9], r: [1.06, 1.16], sz: [2, 3], tw: 1 },
    { k: "rise", n: 7, shape: "ember", c: ["#FF9340", "#FF4D00", "#FFD447"], sp: [16, 28], life: [0.9, 1.5], sz: [1.6, 2.6], sway: 10, circle: { n: 0, a: 0 } },
  ] },
  ironbound: { spd: 0.8, glow: 0.45, layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/chain.webp", r: [0.8, 0.8], w: [0, 0], sz: [1.3, 1.3], even: 1, at: 0.25, rot: 0.015, wobble: 0.06, bob: 1, a: 0.95, behind: 1, blend: "source-over" },
    { k: "orbit", n: 1, shape: "img", src: "/aura/chain.webp", r: [0.85, 0.85], w: [0, 0], sz: [1.05, 1.05], even: 1, at: 0.16, rot: -0.05, flip: 1, wobble: 0.08, bob: 1, a: 0.7, behind: 1, blend: "source-over" },
    { k: "orbit", n: 1, shape: "img", src: "/aura/chain.webp", r: [0.88, 0.88], w: [0, 0], sz: [0.9, 0.9], even: 1, at: 0.34, rot: 0.05, wobble: 0.1, bob: 1, a: 0.5, behind: 1, blend: "source-over" },
    { k: "orbit", n: 5, shape: "spark", c: ["#DDE6F2", "#9AA7BD"], w: [0.25, 0.5], r: [1.02, 1.18], sz: [0.9, 1.5], a: 0.55 },
  ] },
  // Ledger: a feared secret order in matching cloaks — the cloak hangs behind
  // the avatar, the order's pale mask drifts beside the head, inked pages of
  // the record tumble past, and a red ink trickle creeps along the ring.
  ledger: { spd: 0.6, glow: 0.38, dark: 1, art: "ledger", overArt: "ledger",
    robeW: 1, robeTop: 0.27, robeRise: 1.6, robeSway: 1, emblemBeat: 1,
    maskX: 2.5, maskY: -0.7, maskSz: 0.55, maskTilt: 0.18,
    sweep: { c: "#8A1420", a: 0.8, spd: 0.09, r: 1.06, w: 1.7, span: 0.45, dim: 1 },
    rings: [{ r: 1.14, c: "#2E0D12", spin: 0.02, a: 0.9, w: 4.5, ink: 1 }],
    moment: { every: [20, 30], dur: 4.2,
      flash: { at: 0.76, flashPeak: 0.36, flashLife: 0.09, flashC: ["#FF3A3A", "#C2001F"], anchor: "center", x: -0.34, y: 1.02 },
      shake: { at: 0.76, amp: 0.09, dur: 0.4 },
      bursts: [
        { at: 0.76, path: "shockring", c: "#C2001F", a: 0.9, lw: 2.4, r0: 0.1, v: 2.3, life: [0.5, 0.5], anchor: "center", x: -0.34, y: 1.02, aspect: 1, over: 1 },
        { at: 0.76, path: "radial", shape: "page", n: 6, c: ["#E8E0CC", "#C9BFA8"], anchor: "center", x: -0.34, y: 1.02, sp: [35, 85], sz: [1.6, 3], life: [0.9, 1.5], grav: 0.5, a: 0.9, over: 1 },
      ] },
    layers: [
      { k: "rise", n: 16, shape: "smoke", c: ["#12040a", "#26070e", "#3B0B13"], sp: [5, 12], life: [3, 5.5], sz: [7, 14], sway: 9, blend: "source-over", a: 0.4 },
      { k: "orbit", n: 6, shape: "page", c: ["#E8E0CC", "#D8CCB0", "#C0B294"], w: [0.03, 0.08], r: [1.06, 1.3], sz: [2.2, 4], spin: 1, a: 0.88 },
      { k: "orbit", n: 3, shape: "ember", c: ["#C2001F", "#7A1420"], w: [0.05, 0.1], r: [1.02, 1.2], sz: [0.7, 1.2], a: 0.55 },
    ] },
  bonewright: { spd: 0.7, glow: 0.7, overArt: "bonewright", bolts: { burst: [2, 3], burstSpan: 0.36, gap: [3, 5], c: ["#FFF27A"], flash: 1, flashPeak: 0.35, flashLife: 0.09, from: "above", strike: 1, calm: 1 }, rings: [{ r: 1.12, c: "#F4EAD2", spin: 0.06, a: 0.9, w: 5, dash: 1 }], layers: [{ k: "rise", n: 22, shape: "smoke", c: ["#F4EAD2", "#AAB5C4"], sp: [12, 24], life: [1.4, 2.6], sz: [5, 10], sway: 9, blend: "source-over", a: 0.35 }, { k: "orbit", n: 12, shape: "bonechip", c: ["#FFFFFF", "#DDE6F2"], w: [0.12, 0.28], r: [1.08, 1.2], sz: [2.2, 4.2] }] },
  nullpoint: { spd: 0.62, glow: 0.66, dark: 1, overArt: "nullpoint", foldW: 3.4, foldY: 0.04, foldH: 1, foldTail: 1.6, foldGlow: 0.55, rings: [{ r: 1.15, c: "#38C6FF", spin: -0.03, a: 0.82, w: 2.8 }], layers: [{ k: "inward", n: 64, shape: "dot", c: ["#38C6FF", "#C2001F", "#a855f7"], sp: [0.35, 0.7], life: [2, 4], sz: [1.2, 2.6], fit: 1 }], circle: { foldW: 6.5, foldY: 0.2, foldH: 0.8, foldTail: 1.8 } },
  carve: { spd: 0.85, glow: 0.58, dark: 1, art: "carve", rings: [{ r: 1.1, c: "#111111", spin: 0.22, a: 0.9, w: 6, dash: 1 }], sweep: { c: "#ec4899", a: 1, spd: 3.2, r: 1.2, w: 2.2, span: 1.6 }, layers: [{ k: "orbit", n: 36, shape: "shard", c: ["#C2001F", "#ec4899", "#F4EAD2"], w: [0.8, 1.8], r: [1.08, 1.35], sz: [0.8, 1.5], tw: 1 }] },
  brandmark: { spd: 0.58, glow: 0.5, dark: 1, art: "brandmark", artLate: 1, overArt: "brandmark", sweep: { c: "#FFFFFF", a: 1, spd: 5.2, r: 1.16, w: 7, span: 0.55 }, rings: [{ r: 1.08, c: "#414141", spin: 0.02, a: 0.95, w: 7 }], layers: [
    { k: "orbit", n: 2, shape: "img", src: "/aura/pauldron.webp", placed: "shoulders" },
    { k: "rise", n: 22, shape: "smoke", c: ["#FFFFFF", "#AAB5C4"], sp: [7, 15], life: [2, 3.4], sz: [4, 8], sway: 5, blend: "source-over", a: 0.3 },
  ] },
  blacksun: { spd: 0.32, glow: 0.96, dark: 1, art: "blacksun", rings: [{ r: 1.18, c: "#FFFFFF", spin: 0.01, a: 1, w: 4, colorCycle: ["#FFFFFF", "#0A0A0A"], cyclePeriod: 4 }], layers: [
    { k: "orbit", n: 1, shape: "img", src: "/aura/wing.webp", r: [1.1, 1.1], w: [0, 0], sz: [1.75, 1.75], even: 1, at: -0.38, rot: 0.05, flip: 1, breathe: 1, wobble: 0.03, a: 0.95, behind: 1, blend: "source-over", shadow: { rate: 8, max: 20, sz: [3, 8], sp: [4, 11], c: "#050505", a: 0.42, blend: "source-over" } },
    { k: "orbit", n: 1, shape: "img", src: "/aura/wing.webp", r: [1.1, 1.1], w: [0, 0], sz: [1.75, 1.75], even: 1, at: -0.12, rot: -0.05, breathe: 1, wobble: 0.03, a: 0.95, behind: 1, blend: "source-over", shadow: { rate: 8, max: 20, sz: [3, 8], sp: [4, 11], c: "#050505", a: 0.42, blend: "source-over" } },
    { k: "orbit", n: 1, shape: "img", src: "/aura/book.webp", r: [1.25, 1.25], w: [0.57, 0.57], sz: [0.70, 0.70], even: 1, spin: 0.04, bob: 1, a: 0.95, blend: "source-over" },
    { k: "fall", n: 82, shape: "leaf", c: ["#FFFFFF", "#E4E8F2"], sp: [5, 13], sz: [1.8, 4.6], drift: 3, spin: 1, blend: "source-over" },
    { k: "orbit", n: 5, shape: "glyph", c: ["#C2001F"], w: [0.16, 0.16], r: [1.16, 1.16], sz: [2.6, 2.6], even: 1 },
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
  const box = { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", objectFit: "contain", pointerEvents: "none", mixBlendMode: "normal" };
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
// Glossy-sphere sprite for the `orb` shape: lit core upper-left, colour limb,
// dark rim. The specular never rotates — it reads as a fixed light source.
const orbPaint = (g, rgb) => {
  const dim = rgb.map((v) => (v * 0.45) | 0);
  let grd = g.createRadialGradient(-7, -8, 2, 0, 0, 30);
  grd.addColorStop(0, `rgb(${rgb.map((v) => Math.min(255, (v + 90) | 0)).join(",")})`);
  grd.addColorStop(0.35, `rgb(${rgb.join(",")})`);
  grd.addColorStop(0.82, `rgb(${dim.join(",")})`);
  grd.addColorStop(1, `rgba(${dim.join(",")},0)`);
  g.fillStyle = grd; g.fillRect(-32, -32, 64, 64);
  grd = g.createRadialGradient(-9, -11, 0, -9, -11, 8);
  grd.addColorStop(0, "rgba(255,255,255,0.95)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.beginPath(); g.arc(-9, -11, 8, 0, Math.PI * 2); g.fill();
};

export const _auraImageCache = new Map();
export const FRAME_ANCHOR_CACHE_LIMIT = 16;

export function edgeAnchorsFromAlpha(data, width, height, max = 48) {
  const alphaAt = (x, y) => x >= 0 && y >= 0 && x < width && y < height ? data[(y * width + x) * 4 + 3] : 0;
  const boundary = [];
  let cx = 0, cy = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alphaAt(x, y) <= 32) continue;
      let dx = 0, dy = 0, edge = false;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (alphaAt(x + ox, y + oy) <= 32) { edge = true; dx += ox; dy += oy; }
      }
      if (!edge) continue;
      const px = (x + 0.5) / width - 0.5, py = (y + 0.5) / height - 0.5;
      boundary.push({ x: px, y: py, dx, dy });
      cx += px; cy += py;
    }
  }
  if (!boundary.length || max <= 0) return [];
  cx /= boundary.length; cy /= boundary.length;
  boundary.forEach((p) => {
    const len = Math.hypot(p.dx, p.dy) || Math.hypot(p.x - cx, p.y - cy) || 1;
    p.dx /= len; p.dy /= len;
  });
  boundary.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  const stride = boundary.length / Math.min(max, boundary.length);
  return Array.from({ length: Math.min(max, boundary.length) }, (_, i) => boundary[Math.floor(i * stride)]);
}

export function imageEdgeAnchors(img, max = 48, size = 64) {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return [];
    g.drawImage(img, 0, 0, size, size);
    const data = g.getImageData(0, 0, size, size).data;
    return edgeAnchorsFromAlpha(data, size, size, max);
  } catch (e) {
    return [];
  }
}

export function ensureImageEdgeAnchors(rec, max = 48) {
  if (!rec?.ready || rec.failed) return [];
  if (!rec.edgeAnchors) rec.edgeAnchors = imageEdgeAnchors(rec.img, max);
  return rec.edgeAnchors;
}

export function cachedFrameEdgeAnchors(cache, rec, max = 48) {
  if (cache.has(rec)) {
    const anchors = cache.get(rec);
    cache.delete(rec);
    cache.set(rec, anchors);
    return anchors;
  }
  const anchors = rec?.ready && !rec.failed ? imageEdgeAnchors(rec.img, max) : [];
  if (cache.size >= FRAME_ANCHOR_CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(rec, anchors);
  return anchors;
}

export function auraImage(src, opts = {}) {
  if (_auraImageCache.has(src)) {
    const rec = _auraImageCache.get(src);
    if (opts.edgeAnchors) {
      rec.edgeAnchorsWanted = true;
      if (rec.ready) ensureImageEdgeAnchors(rec);
    }
    return rec;
  }
  const rec = { img: new Image(), ready: false, failed: false, edgeAnchorsWanted: !!opts.edgeAnchors };
  _auraImageCache.set(src, rec);
  const markReady = () => {
    if (rec.failed) return;
    rec.ready = true;
    if (rec.edgeAnchorsWanted) ensureImageEdgeAnchors(rec);
  };
  rec.img.onload = () => {
    if (typeof rec.img.decode === "function") rec.img.decode().then(markReady).catch(markReady);
    else markReady();
  };
  rec.img.onerror = () => { rec.failed = true; };
  rec.img.src = src;
  if (typeof rec.img.decode === "function") rec.img.decode().then(markReady).catch(() => {});
  return rec;
}

export function auraNeedsOver(aura) {
  const fx = AURA_FX[resolveAuraId(aura)];
  if (!fx) return false;
  // Over-canvas needs can live in either view block — check both merged views.
  for (const view of ["body", "circle"]) {
    const spec = mergeViewSpec(fx, view);
    if (spec.overArt || spec.moment?.bursts?.some((b) => b.over)) return true;
    if ((spec.layers || []).some((L) => mergeViewLayer(L, view).over)) return true;
  }
  return false;
}

function eyeIdle(time) {
  const a = 0.5 + 0.5 * Math.sin(time * 2.2);
  const b = 0.5 + 0.5 * Math.sin(time * 5.1 + 1.3);
  const c = 0.5 + 0.5 * Math.sin(time * 9.7 + 0.4);
  return 0.75 + 0.25 * (a * 0.62 + b * 0.28 + c * 0.1);
}

function drawBoneEyes(ctx, { time, strike, anchors }) {
  if (!ctx || !anchors) return;
  const k = Math.min(1, eyeIdle(time) + (1 - eyeIdle(time)) * strike);
  const ew = anchors.face.eyeW;
  const eh = ew * 0.42;
  const bloom = ew * 2.5 * (1 + 0.45 * strike);
  ctx.save();
  for (const side of [-1, 1]) {
    const x = anchors.face.x + side * anchors.face.eyeX;
    const y = anchors.face.y;
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

function drawCape(ctx, { clock, anchors }) {
  const rec = auraImage("/aura/cape.webp");
  if (!rec.ready || rec.failed || !ctx || !anchors) return;
  const img = rec.img;
  const iw = anchors.cape.w;
  const ih = iw * (img.naturalHeight / Math.max(1, img.naturalWidth));
  const sway = Math.sin((clock || 0) * (Math.PI * 2 / 5)) * 0.07;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.96;
  ctx.translate(anchors.cape.x, anchors.cape.y);
  ctx.rotate(sway);
  ctx.drawImage(img, -iw / 2, 0, iw, ih);
  ctx.restore();
}

function drawPauldrons(ctx, anchors, shift) {
  const rec = auraImage("/aura/pauldron.webp");
  if (!rec.ready || rec.failed || !ctx || !anchors) return;
  const img = rec.img;
  const ih = anchors.pauldronH;
  const iw = ih * (img.naturalWidth / Math.max(1, img.naturalHeight));
  const dx = shift?.x || 0;
  const dy = shift?.y || 0;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(anchors.shoulderX + side * anchors.shoulderHalf + dx, anchors.shoulderY + dy);
    ctx.rotate(side * -0.08);
    if (side > 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  }
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

function drawSigil(ctx, { time, clock, unit, sweep, anchors }) {
  const rec = auraImage("/aura/brand.png");
  if (!rec.ready || rec.failed || !ctx || !anchors) return;
  const img = rec.img;
  const ang = -0.85;
  const sx = anchors.sigil.x;
  const sy = anchors.sigil.y;
  const rot = 8 * Math.PI / 180;
  const ih = anchors.sigil.h;
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
  const len = ih * (1 + 0.48 * Math.sin((clock || 0) * 0.65));
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

// Crimson ring-sigils printed on the order's cloak, as fractions of
// robe-ledger.webp (x, y in 0..1). The pulse/flare overlay draws at these.
const LEDGER_EMBLEMS = [
  [0.24, 0.26], [0.72, 0.29], [0.13, 0.41], [0.86, 0.44],
  [0.34, 0.51], [0.66, 0.54], [0.15, 0.65], [0.50, 0.66],
  [0.84, 0.67], [0.30, 0.79], [0.63, 0.80], [0.82, 0.86],
];

// The order's cloak hangs behind the avatar: anchored at the shoulder line
// on figures with the collar rising to the jaw; on the ring it is cropped to
// collar and shoulders framing the photo's bottom edge. The hem fades out in
// strips so it ends cleanly before the canvas edge at any size. Emblems
// pulse faintly, brighten as the ink trickle's arc passes their angle, and
// flare one by one during the moment.
function drawLedgerRobe(g, { fx, time, clock, cx, cy, rx, ry, mode, anchors, moment, reduce, sweep }) {
  const rec = auraImage("/aura/robe-ledger.webp");
  if (!rec.ready || rec.failed || !anchors) return;
  const img = rec.img;
  const srcW = Math.max(1, img.naturalWidth), srcH = Math.max(1, img.naturalHeight);
  const crop = mode === "body" ? 1 : (fx.robeCrop ?? 0.5);
  const headHalf = anchors.face.eyeX * HEAD_FROM_EYE;
  const iw = (mode === "body" ? anchors.cape.w * 1.4 : Math.min(rx, ry) * 2.1) * (fx.robeW ?? 1);
  const ih = iw * (crop * srcH / srcW);
  const top = mode === "body" ? anchors.shoulderY - headHalf * (fx.robeRise ?? 1.6) : cy + ry * (fx.robeTop ?? 0.27);
  const ox = mode === "body" ? anchors.cape.x : cx;
  const sway = Math.sin((clock || 0) * (Math.PI * 2 / 6.5)) * 0.035 * (fx.robeSway ?? 1) * (reduce ? 0.3 : 1);
  g.save();
  g.translate(ox, top);
  g.rotate(sway);
  g.globalCompositeOperation = "source-over";
  const strips = 6, fadeFrom = 0.72;
  for (let i = 0; i < strips; i++) {
    const f0 = i / strips, f1 = (i + 1) / strips;
    g.globalAlpha = 0.97 * (f0 < fadeFrom ? 1 : Math.max(0, 1 - (f0 - fadeFrom) / (1 - fadeFrom)));
    g.drawImage(img, 0, srcH * crop * f0, srcW, srcH * crop * (f1 - f0), -iw / 2, ih * f0, iw, ih * (f1 - f0));
  }
  const beat = fx.emblemBeat ?? 1;
  const mt = moment?.t;
  if (beat > 0.01 || mt != null) {
    const gs = glowSprite("#C2001F");
    LEDGER_EMBLEMS.forEach(([efx, efy], i) => {
      if (efy > crop - 0.04) return;
      const ex = (efx - 0.5) * iw, ey = (efy / crop) * ih;
      // emblem angle measured in canvas space so the trickle's head hits match
      const ang = Math.atan2(top + ey - cy, ox + ex - cx);
      let a = 0.14 * beat + 0.45 * beat * sweepHit(time, sweep, ang);
      if (mt != null) { const ft = 0.08 + i * 0.045; a += Math.max(0, 1 - Math.abs(mt - ft) / 0.09) * 0.85; }
      if (a <= 0.03) return;
      const r0 = Math.max(1.4, iw * 0.034);
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = Math.min(1, a) * 0.5;
      g.drawImage(gs, ex - r0 * 2.4, ey - r0 * 2.4, r0 * 4.8, r0 * 4.8);
      g.globalAlpha = Math.min(1, a);
      g.strokeStyle = "#E03040"; g.lineWidth = Math.max(0.7, iw * 0.007);
      g.beginPath(); g.arc(ex, ey, r0, 0, Math.PI * 2); g.stroke();
      g.globalCompositeOperation = "source-over";
    });
  }
  g.restore();
}

// The order's pale mask floats beside the head — tilted, bobbing and turning
// a few degrees as it drifts. Never over the face: the offset is measured in
// head half-widths so it clears the head on every figure and the photo edge
// on the ring.
function drawLedgerMask(g, { fx, clock, anchors, reduce }) {
  const rec = auraImage("/aura/mask-ledger.webp");
  if (!rec.ready || rec.failed || !anchors) return;
  const img = rec.img;
  const headHalf = anchors.face.eyeX * HEAD_FROM_EYE;
  const mw = headHalf * 2 * (fx.maskSz ?? 0.55);
  const mh = mw * (img.naturalHeight / Math.max(1, img.naturalWidth));
  const bob = Math.sin((clock || 0) * 1.05) * headHalf * 0.16 * (reduce ? 0.3 : 1);
  const turn = Math.sin((clock || 0) * 0.55 + 1.1) * 0.07 * (reduce ? 0.35 : 1);
  g.save();
  g.globalAlpha = 0.96;
  g.translate(anchors.face.x + headHalf * (fx.maskX ?? 2.5), anchors.face.y + headHalf * (fx.maskY ?? -0.7) + bob);
  g.rotate((fx.maskTilt ?? 0.18) + turn);
  g.drawImage(img, -mw / 2, -mh / 2, mw, mh);
  g.restore();
}

// The moment's record page swings in over the cloak's shoulder, a name inks
// itself in red left to right, then the seal slams down. Flash/shockwave
// come from the spec's moment.flash/bursts, not drawn here.
function drawLedgerMoment(g, { moment, cx, cy, rx, ry, unit, reduce }) {
  const t = moment.t;
  const R = Math.min(rx, ry);
  const inK = Math.min(1, Math.max(0, (t - 0.34) / 0.2));
  const outK = t > 0.88 ? Math.max(0, 1 - (t - 0.88) / 0.12) : 1;
  if (inK <= 0 || outK <= 0) return;
  const e = 1 - (1 - inK) * (1 - inK);
  const px = cx - rx * (0.34 + (1 - e) * 0.55);
  const py = cy + ry * (1.02 - (1 - e) * 0.12);
  const pw = R * 0.5, ph = pw * 1.32;
  g.save();
  g.translate(px, py);
  g.rotate(-0.12 + (1 - e) * 0.5 + Math.sin(t * 6) * 0.02 * (reduce ? 0.4 : 1));
  g.globalAlpha = 0.95 * inK * outK;
  g.fillStyle = "#E4DCC8";
  g.beginPath(); g.rect(-pw / 2, -ph / 2, pw, ph); g.fill();
  g.strokeStyle = "rgba(20,12,8,0.55)"; g.lineWidth = Math.max(0.8, unit * 0.5); g.stroke();
  g.globalAlpha *= 0.45; g.strokeStyle = "#7A6F58"; g.lineWidth = Math.max(0.5, unit * 0.28);
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-pw * 0.38, -ph * 0.05 + i * ph * 0.14); g.lineTo(pw * 0.38, -ph * 0.05 + i * ph * 0.14); g.stroke(); }
  g.globalAlpha = 0.95 * inK * outK;
  const inkK = Math.min(1, Math.max(0, (t - 0.5) / 0.2));
  if (inkK > 0) {
    g.strokeStyle = "#A3151F"; g.lineWidth = Math.max(0.9, unit * 0.55); g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath();
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      if (k > inkK) break;
      const ix = -pw * 0.36 + k * pw * 0.72, iy = -ph * 0.3 + Math.sin(k * 17) * ph * 0.05;
      if (i === 0) g.moveTo(ix, iy); else g.lineTo(ix, iy);
    }
    g.stroke();
  }
  const sT = (t - 0.76) / 0.07;
  if (sT > 0) {
    const slam = Math.min(1, sT);
    const ss = 1 + (1 - slam) * 0.9;
    const sr = pw * 0.3;
    g.globalAlpha = Math.min(1, sT * 2.5) * outK;
    g.translate(pw * 0.14, ph * 0.18); g.rotate(0.25 - (1 - slam) * 0.35);
    g.strokeStyle = "#C2001F"; g.lineWidth = Math.max(1, sr * 0.16);
    g.beginPath(); g.arc(0, 0, sr * ss, 0, Math.PI * 2); g.stroke();
    g.lineWidth = Math.max(0.7, sr * 0.07);
    g.beginPath(); g.arc(0, 0, sr * ss * 0.62, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath(); g.moveTo(Math.cos(a) * sr * ss * 0.66, Math.sin(a) * sr * ss * 0.66); g.lineTo(Math.cos(a) * sr * ss * 0.94, Math.sin(a) * sr * ss * 0.94); g.stroke();
    }
    g.beginPath(); g.moveTo(-sr * ss * 0.3, 0); g.lineTo(sr * ss * 0.3, 0); g.moveTo(0, -sr * ss * 0.3); g.lineTo(0, sr * ss * 0.3); g.stroke();
  }
  g.restore();
}

// Nullpoint worn piece — a blindfold across the eye line on the same face
// anchors Bonewright's eyes use. The art's baked tails get procedural
// extensions that flutter with the aura's motion so the ends read as cloth,
// not a sticker. Everything scales from the head half-width (eyeX ×
// HEAD_FROM_EYE) so all 14 figures and photos place the piece identically.
function drawNullpointBlindfold(ctx, { time, clock, anchors, reduce, w, unit }, fx) {
  if (!ctx || !anchors) return;
  const rec = auraImage("/aura/blindfold.webp");
  if (!rec.ready || rec.failed) return;
  const hh = anchors.face.eyeX * HEAD_FROM_EYE;
  const bw = hh * (fx.foldW || 2.7);
  const bh = bw * (rec.img.naturalHeight / Math.max(1, rec.img.naturalWidth)) * (fx.foldH ?? 1);
  const bx = anchors.face.x, by = anchors.face.y + hh * (fx.foldY || 0);
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.98;
  // the cloth band sits around 38% of the art's height — that line, not the
  // image centre, lands on the eye line
  ctx.drawImage(rec.img, bx - bw / 2, by - bh * 0.38, bw, bh);
  // fluttering ends: tapering ribbons continuing outward from the baked tail
  // tips — the static art supplies the knot, the tips wave with the aura
  const drift = reduce ? 0.2 : 1;
  // reach clamps to the canvas so pushing foldW never chops the ends off
  const tl = Math.max(0, Math.min((fx.foldTail ?? 1.4) * hh, w / 2 - bw * 0.44 - 4 * (unit || 1)));
  if (tl > 0.5) {
    const w0 = Math.max(1.2, bh * 0.1);
    for (const s of [-1, 1]) {
      const tx0 = bx + s * bw * 0.44, ty0 = by + bh * 0.2;
      const ph = s > 0 ? 2.1 : 0.4;
      const s1 = Math.sin(time * 1.35 + ph) * hh * 0.1 * drift;
      const s2 = Math.sin(time * 1.35 + ph + 0.9) * hh * 0.16 * drift + Math.sin(clock * 0.5 + ph) * hh * 0.04 * drift;
      const mx = tx0 + s * tl * 0.5, my = ty0 + tl * 0.16 + s1;
      const tx = tx0 + s * tl, ty = ty0 + tl * 0.3 + s2;
      const grad = ctx.createLinearGradient(tx0, ty0, tx, ty);
      grad.addColorStop(0, "rgba(38,36,42,0.95)");
      grad.addColorStop(0.7, "rgba(26,24,30,0.85)");
      grad.addColorStop(1, "rgba(22,20,26,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(tx0, ty0 - w0 / 2);
      ctx.quadraticCurveTo(mx, my - w0 * 0.55, tx, ty);
      ctx.quadraticCurveTo(mx, my + w0 * 0.55, tx0, ty0 + w0 / 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  // faint aura-light bleeding along the fold's lower edge — slow pulse so the
  // piece reads as part of the aura rather than a pasted band
  const a = (fx.foldGlow ?? 0.55) * (reduce ? 0.55 : 0.55 + 0.45 * Math.sin(clock * 0.9));
  if (a > 0.01) {
    const gy = by + bh * 0.24;
    ctx.globalCompositeOperation = "lighter";
    ctx.save();
    ctx.translate(bx, gy);
    ctx.scale(1, 0.26);
    const grad = ctx.createRadialGradient(0, 0, bw * 0.06, 0, 0, bw * 0.52);
    grad.addColorStop(0, `rgba(196,181,253,${(0.32 * a).toFixed(3)})`);
    grad.addColorStop(0.6, `rgba(139,92,246,${(0.14 * a).toFixed(3)})`);
    grad.addColorStop(1, "rgba(139,92,246,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, bw * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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
  ledger: (opts) => {
    const fx = opts.fx || AURA_FX.ledger;
    if (opts.pass === "main") { drawLedgerRobe(opts.g, { ...opts, fx }); return null; }
    if (opts.pass === "over") {
      const g = opts.over || opts.g;
      drawLedgerMask(g, { ...opts, fx });
      if (opts.moment) drawLedgerMoment(g, { ...opts, fx });
    }
    return null;
  },
  carve: ({ g, time, cx, cy, rx, ry, unit }) => {
    const k = (time % 3.2) / 3.2;
    g.save(); g.strokeStyle = `rgba(236,72,153,${Math.sin(k * Math.PI)})`; g.lineWidth = Math.max(0.8, unit);
    for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * rx * 1.35, cy + Math.sin(a) * ry * 1.35); g.lineTo(cx + rx * 0.18, cy - ry * 0.12); g.stroke(); }
    g.restore();
  },
  ninetail: ({ g, time, cx, cy, rx, ry, mode }) => {
    const palette = ["#FF9340", "#FFD447", "#FF4D00"];
    const R = Math.min(rx, ry);
    // circle canvases are tight — fan the tails from inside the photo ring
    // so tips peek past the avatar edge instead of clipping the frame
    const base = mode === "body" ? 1.02 : 0.62;
    const lenMul = mode === "body" ? 1 : 0.78;
    // small canvases can't fit nine wide tails inside the frame — draw six
    // evenly spaced ones instead; the full nine stay on the figure
    const tn = mode === "body" ? 9 : 4;
    for (let i = 0; i < tn; i++) {
      const a = Math.PI * 0.42 + (i / (tn - 1)) * Math.PI * 1.66;
      const x = cx + Math.cos(a) * rx * base, y = cy + Math.sin(a) * ry * base;
      const len = (0.55 + (i % 3) * 0.08) * R * lenMul, wide = 0.2 * R, ph = i * 0.73;
      const sway = Math.sin(time * 1.35 + ph) * 0.16 * R;
      const col = palette[i % 3], rgb = hexRgb(col) || [255, 147, 64];
      g.save(); g.translate(x, y); g.rotate(a);
      // flat fill on small canvases — a per-tail gradient per frame is the
      // cost driver, and the colour ramp is invisible at board size anyway
      const grad = mode === "body" ? g.createLinearGradient(0, 0, len, sway) : null;
      if (grad) { grad.addColorStop(0, col); grad.addColorStop(0.72, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.82)`); grad.addColorStop(1, "#FFF6C9"); }
      const bands = mode === "body" ? [1.18, 1, 0.78] : [1.05];
      bands.forEach((band, bi) => {
        const bw = wide * band, off = (bi - 1) * wide * 0.12;
        g.globalAlpha = bi === 1 ? 0.92 : 0.42;
        g.fillStyle = grad || col; g.beginPath(); g.moveTo(0, off - bw / 2);
        g.bezierCurveTo(len * 0.34, off - bw * 0.54, len * 0.72, sway - bw * 0.22, len, sway);
        g.bezierCurveTo(len * 0.72, sway + bw * 0.22, len * 0.34, off + bw * 0.54, 0, off + bw / 2);
        g.closePath(); g.fill();
      });
      g.globalAlpha = 1; g.fillStyle = "#FFF6C9";
      g.beginPath(); g.arc(len, sway, Math.max(1.5, wide * 0.22 * 1.25), 0, Math.PI * 2); g.fill();
      g.restore();
    }
  },
  // Abyss moment: a black hole opens behind the avatar — a near-black disc
  // with a spinning violet-magenta accretion ring riding the rim, then
  // collapses inward and vanishes. Draws only while the moment is live.
  abyss: ({ g, cx, cy, rx, ry, w, h, moment, time, unit, reduce }) => {
    if (!moment) return null;
    const t = moment.t, R = Math.min(rx, ry);
    const open = t < 0.14 ? t / 0.14 : t < 0.78 ? 1 : Math.max(0, 1 - (t - 0.78) / 0.08);
    const ease = open * open * (3 - 2 * open);
    const discR = R * 1.0 * ease;
    const accR = R * (0.5 + 0.56 * ease);
    // drawn under a ry/rx vertical stretch — cap radii to the local-space
    // margin so figure-height ellipses can't graze the canvas border
    const lim = Math.min(cx, w - cx, (Math.min(cy, h - cy) * rx) / ry) * 0.92;
    g.save();
    g.translate(cx, cy); g.scale(1, ry / rx);
    if (discR > 0.5) {
      g.globalCompositeOperation = "source-over";
      const dg = g.createRadialGradient(0, 0, discR * 0.4, 0, 0, discR * 1.12);
      dg.addColorStop(0, "rgba(2,0,8,0.98)");
      dg.addColorStop(0.8, "rgba(4,0,14,0.95)");
      dg.addColorStop(1, "rgba(10,0,26,0)");
      g.fillStyle = dg;
      g.beginPath(); g.arc(0, 0, Math.min(discR * 1.12, lim), 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    const spin = time * (reduce ? 2 : 7);
    const cols = ["#B14BFF", "#FF2D6F", "#E8C9FF"];
    const accRim = Math.min(accR, lim);
    for (let i = 0; i < 3; i++) {
      const a0 = spin + (i * Math.PI * 2) / 3;
      g.strokeStyle = cols[i]; g.globalAlpha = 0.8 * ease;
      g.lineWidth = Math.max(1, unit * 1.7);
      g.beginPath(); g.arc(0, 0, accRim, a0, a0 + 1.9); g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const a0 = -spin * 0.7 + (i * Math.PI * 2) / 5;
      g.strokeStyle = i % 2 ? "#FF2D6F" : "#B14BFF";
      g.globalAlpha = 0.35 * ease;
      g.lineWidth = Math.max(0.7, unit * 0.9);
      g.beginPath();
      for (let s = 0; s <= 8; s++) {
        const aa = a0 + s * 0.14, rr = Math.min(accRim * (1 + s / 16), lim);
        const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
        if (s) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
    g.restore();
    return null;
  },
  // Void moment: an indigo portal spirals open behind the avatar while stars
  // stream out (spec bursts), then spirals shut. Draws only while the moment
  // is live.
  void: ({ g, cx, cy, rx, ry, w, h, moment, time, unit, reduce }) => {
    if (!moment) return null;
    const t = moment.t, R = Math.min(rx, ry);
    const open = t < 0.22 ? t / 0.22 : t < 0.72 ? 1 : Math.max(0, 1 - (t - 0.72) / 0.2);
    const ease = open * open * (3 - 2 * open);
    const lim = Math.min(cx, w - cx, (Math.min(cy, h - cy) * rx) / ry) * 0.92;
    const pr = Math.min(R * 0.92 * ease, lim);
    if (pr < 0.5) return null;
    g.save();
    g.translate(cx, cy); g.scale(1, ry / rx);
    g.globalCompositeOperation = "source-over";
    const pg = g.createRadialGradient(0, 0, pr * 0.15, 0, 0, pr);
    pg.addColorStop(0, "rgba(10,14,44,0.96)");
    pg.addColorStop(0.55, "rgba(26,35,126,0.9)");
    pg.addColorStop(0.85, "rgba(63,81,181,0.75)");
    pg.addColorStop(1, "rgba(124,143,232,0)");
    g.globalAlpha = 1; g.fillStyle = pg;
    g.beginPath(); g.arc(0, 0, pr, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    const spin = time * (reduce ? 1.8 : 5.5);
    const cols = ["#7C8FE8", "#FFFFFF", "#FFE9A8"];
    for (let i = 0; i < 3; i++) {
      const a0 = spin + (i * Math.PI * 2) / 3;
      g.strokeStyle = cols[i]; g.globalAlpha = 0.75 * ease;
      g.lineWidth = Math.max(1, unit * 1.5);
      g.beginPath();
      for (let s = 0; s <= 10; s++) {
        const aa = a0 + s * 0.16, rr = pr * (1 - s / 15);
        const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
        if (s) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
    g.restore();
    return null;
  },
  // Vendetta skull moment — draws on the over-canvas so the skull sits in
  // front of the photo/body. Phases: fly-in (grow+settle), socket ignite
  // ramp, mouth-fire stream, recede.
  vendetta: (opts) => {
    if (opts.pass !== "over") return null;
    const g = opts.over || opts.g;
    const mo = opts.moment;
    if (!mo) return null;
    const rec = auraImage("/aura/vendetta-skull.webp");
    if (!rec.ready || rec.failed) return null;
    const { cx, cy, rx, ry, unit, time, reduce } = opts;
    const t = mo.t, R = Math.min(rx, ry);
    const inK = Math.min(1, t / 0.22), easeIn = inK * inK * (3 - 2 * inK);
    const outK = t > 0.8 ? Math.max(0, 1 - (t - 0.8) / 0.18) : 1;
    // fly in small -> large; on exit it recedes (shrinks back toward the
    // distance) while fading. Capped so the drawn square never reaches the
    // canvas edge at any size.
    const scale = (0.16 + 1.02 * easeIn) * (0.24 + 0.76 * outK);
    const alpha = Math.min(1, t * 10) * outK;
    if (alpha <= 0.02) return null;
    const S = Math.min(R * 2.5 * scale, Math.min(opts.w, opts.h) * 0.78);
    const sx = cx, sy = cy - S * 0.12;              // skull centre — mouth lands ~mid-canvas
    const mth = { x: sx, y: sy + S * 0.16 };        // mouth (image ~50%,66%)
    const eye = { x: sx, y: sy - S * 0.07, dx: S * 0.135 }; // sockets ~36%/63%×43%
    const fireK = t < 0.4 ? 0 : t < 0.8 ? Math.min(1, (t - 0.4) / 0.12) : Math.max(0, 1 - (t - 0.8) / 0.1);
    const ignite = t < 0.28 ? 0 : Math.min(1, (t - 0.28) / 0.22); // slow ramp, no flash
    const img = rec.img;
    g.save();
    g.globalAlpha = alpha;
    // fire behind the skull first — the transparent mouth lets it show
    // through, and the spill reads as flame bursting out around the jaw
    if (fireK > 0) {
      g.globalCompositeOperation = "lighter";
      const n = reduce ? 8 : 16;
      const reach2 = Math.min(opts.w - cx, cx, opts.h - cy, cy) * 0.92;
      for (let i = 0; i < n; i++) {
        const ph = i * 2.39, sp = 40 + (i % 5) * 22;
        const tt = ((time * (reduce ? 0.4 : 1.15) * (0.6 + (i % 3) * 0.2) + ph) % 1);
        const ang = Math.PI * 0.5 + Math.sin(ph * 7 + i) * 0.75; // downward cone
        const d = tt * sp * unit * 2.2 * fireK;
        const fx = mth.x + Math.cos(ang) * d * 0.8, fy = mth.y + Math.sin(ang) * d;
        if (Math.abs(fx - cx) > reach2 - 4 || Math.abs(fy - cy) > reach2 - 4) continue;
        const fs = (2.4 + tt * 3.4) * unit * fireK;
        g.globalAlpha = alpha * fireK * (1 - tt) * 0.85;
        g.drawImage(i % 3 ? glowSprite("#FF4D00") : glowSprite("#C2001F"), fx - fs, fy - fs, fs * 2, fs * 2);
      }
      // inner mouth glow — the furnace inside the skull
      const mg = g.createRadialGradient(mth.x, mth.y, 1, mth.x, mth.y, S * 0.22 * fireK);
      mg.addColorStop(0, `rgba(255,120,40,${0.9 * fireK})`); mg.addColorStop(0.5, `rgba(220,20,40,${0.5 * fireK})`); mg.addColorStop(1, "rgba(120,0,20,0)");
      g.globalAlpha = alpha;
      g.fillStyle = mg; g.beginPath(); g.arc(mth.x, mth.y, S * 0.22 * fireK, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = "source-over";
    }
    g.drawImage(img, sx - S / 2, sy - S / 2, S, S);
    // igniting sockets — a red ramp, not a flash
    if (ignite > 0) {
      g.globalCompositeOperation = "lighter";
      for (const sgn of [-1, 1]) {
        const er = S * 0.075 * (0.6 + 0.4 * ignite);
        const eg = g.createRadialGradient(eye.x + sgn * eye.dx, eye.y, 0.5, eye.x + sgn * eye.dx, eye.y, er * 2.2);
        eg.addColorStop(0, `rgba(255,60,40,${0.95 * ignite})`); eg.addColorStop(0.45, `rgba(194,0,31,${0.55 * ignite})`); eg.addColorStop(1, "rgba(90,0,18,0)");
        g.globalAlpha = alpha;
        g.fillStyle = eg; g.beginPath(); g.arc(eye.x + sgn * eye.dx, eye.y, er * 2.2, 0, Math.PI * 2); g.fill();
      }
      g.globalCompositeOperation = "source-over";
    }
    g.restore();
    return null;
  },
  bonewright: (opts) => { if (opts.pass === "over") drawBoneEyes(opts.over || opts.g, opts); },
  nullpoint: (opts) => {
    if (opts.pass !== "over") return null;
    const g = opts.over || opts.g;
    const fx = opts.fx || AURA_FX.nullpoint;
    drawNullpointBlindfold(g, opts, fx);
    return null;
  },
  // Atlas base loop: a soft violet ambience around the figure, a halo and
  // faint rim light behind the sphere, and a few slow rotating light rays.
  // All low alpha — the moment's explosion must still feel like a big jump.
  atlas: ({ g, time, cx, cy, rx, ry, w, h, unit, anchors, anchor, moment, orbitXY, reduce, pass, cc }) => {
    if (pass !== "main") return null;
    const aS = Math.min(1, (w * h) / (100 * 100)); // lighter on board-size
    g.save();
    // ambient violet band hugging the figure silhouette — geometry and stops
    // are fixed per canvas size, so the gradient is built once per instance
    g.translate(cx, cy); g.scale(1, ry / rx);
    const amb = cc?._ambAtlas || (() => {
      const gr = g.createRadialGradient(0, 0, rx * 0.45, 0, 0, rx * 1.32);
      gr.addColorStop(0, "rgba(139,92,246,0)");
      gr.addColorStop(0.55, `rgba(139,92,246,${(0.07 * aS).toFixed(3)})`);
      gr.addColorStop(1, "rgba(139,92,246,0)");
      if (cc) cc._ambAtlas = gr;
      return gr;
    })();
    g.fillStyle = amb; g.beginPath(); g.arc(0, 0, rx * 1.32, 0, Math.PI * 2); g.fill();
    g.restore();
    // sphere halo + rim light + rotating rays — all anchored to the live
    // sphere position so they follow the moment's orbit; hidden while the
    // sphere is destroyed.
    const spos = orbitXY?.near || orbitXY?.far
      || (moment == null && anchors ? { x: anchors.face.x, y: anchors.face.y - anchors.face.eyeX * HEAD_FROM_EYE } : null);
    if (!spos) return null;
    const edge = Math.min(spos.x, spos.y, w - spos.x, h - spos.y);
    const haloR = Math.min(rx * 1.1, Math.max(8, edge - 1.5));
    const halo = g.createRadialGradient(spos.x, spos.y, 0, spos.x, spos.y, haloR);
    halo.addColorStop(0, `rgba(167,139,250,${(0.16 * aS).toFixed(3)})`);
    halo.addColorStop(1, "rgba(167,139,250,0)");
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = halo;
    g.beginPath(); g.arc(spos.x, spos.y, haloR, 0, Math.PI * 2); g.fill(); g.restore();
    const rim = glowSprite("#A78BFA");
    // sprite is offset up-left by design; cap its radius so the glow rect stays
    // a pixel inside the canvas at small sizes (unit floors at 1.15 < 110px)
    const rs = Math.min(24 * unit, spos.x - 3 * unit - 1.5, spos.y - 5 * unit - 1.5, w - 1.5 - spos.x + 3 * unit, h - 1.5 - spos.y + 5 * unit);
    if (rs > 1) {
      g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.4 * aS;
      g.drawImage(rim, spos.x - rs - 3 * unit, spos.y - rs - 5 * unit, rs * 2, rs * 2); g.restore();
    }
    const rot = time * (reduce ? 0.05 : 0.14);
    const len = Math.min(rx * 1.45, Math.max(7, (edge - 1.5) * 0.9));
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const a0 = rot + (i / 5) * Math.PI * 2;
      const breath = 0.055 * aS * (0.7 + 0.3 * Math.sin(time * 0.8 + i * 1.7));
      const grd = g.createLinearGradient(spos.x, spos.y, spos.x + Math.cos(a0) * len, spos.y + Math.sin(a0) * len);
      grd.addColorStop(0, `rgba(167,139,250,${breath.toFixed(3)})`);
      grd.addColorStop(0.5, `rgba(167,139,250,${(breath * 0.5).toFixed(3)})`);
      grd.addColorStop(1, "rgba(167,139,250,0)");
      g.fillStyle = grd;
      const wd = 0.06;
      g.beginPath(); g.moveTo(spos.x, spos.y);
      g.lineTo(spos.x + Math.cos(a0 - wd) * len, spos.y + Math.sin(a0 - wd) * len);
      g.lineTo(spos.x + Math.cos(a0 + wd) * len, spos.y + Math.sin(a0 + wd) * len);
      g.closePath(); g.fill();
    }
    g.restore();
    return null;
  },
  // Fallen Light: a dim ember-red glow behind the cracked halo — fallen, not
  // holy — and a red gleam in the crack that surges while the halo snaps.
  fallenlight: ({ g, time, rx, ry, w, h, anchors, anchor, flash, moment, reduce, pass }) => {
    if (pass !== "main") return null;
    const o = anchor("img:/aura/halo-cracked.webp");
    const aS = Math.min(1, (w * h) / (100 * 100));
    const s = Math.min(rx, ry);
    const flick = reduce ? 0.85 : 0.85 + 0.15 * Math.sin(time * 1.3) * Math.sin(time * 2.9);
    const boost = flash && flash.spec?.anchor?.startsWith?.("img:") ? flash.k * 0.4 : 0;
    const R = Math.min(s * (0.62 + boost * 0.55), Math.max(8, (o.y - 3) / 0.45));
    g.save(); g.globalCompositeOperation = "lighter";
    const grd = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, R);
    grd.addColorStop(0, `rgba(255,120,80,${((0.15 * flick + boost) * aS).toFixed(3)})`);
    grd.addColorStop(0.55, `rgba(200,60,45,${((0.07 * flick + boost * 0.5) * aS).toFixed(3)})`);
    grd.addColorStop(1, "rgba(200,60,45,0)");
    g.fillStyle = grd; g.beginPath(); g.ellipse(o.x, o.y, R, R * 0.45, 0, 0, Math.PI * 2); g.fill();
    // red gleam in the crack — sits behind the halo image, seeping through
    // the break; swells while the halo snaps during the moment.
    const snap = moment && moment.t > 0.22 && moment.t < 0.85 ? Math.sin(Math.min(1, (moment.t - 0.22) / 0.63) * Math.PI) : 0;
    const ca = (0.2 * flick + 0.55 * snap + boost * 0.6) * Math.max(0.55, aS);
    if (ca > 0.02) {
      const cs = s * 0.5, gy = Math.max(3, o.y - s * 0.12 - cs * 0.55);
      g.globalAlpha = Math.min(1, ca);
      g.drawImage(glowSprite("#FF3B2E"), o.x + s * 0.42 - cs, gy, cs * 2, cs * 1.1);
    }
    g.restore();
    return null;
  },
  // Ossuary: a soft spectral green ambience around the figure and a faint
  // green gleam breathing inside the crown's fissures — eerie, not bright.
  ossuary: ({ g, time, cx, cy, rx, ry, w, h, anchors, anchor, flash, reduce, pass, cc }) => {
    if (pass !== "main") return null;
    const aS = Math.min(1, (w * h) / (100 * 100));
    g.save();
    g.translate(cx, cy); g.scale(1, ry / rx);
    const amb = cc?._ambOss || (() => {
      const gr = g.createRadialGradient(0, 0, rx * 0.45, 0, 0, rx * 1.3);
      gr.addColorStop(0, "rgba(74,222,128,0)");
      gr.addColorStop(0.55, `rgba(74,222,128,${(0.055 * aS).toFixed(3)})`);
      gr.addColorStop(1, "rgba(74,222,128,0)");
      if (cc) cc._ambOss = gr;
      return gr;
    })();
    g.fillStyle = amb; g.beginPath(); g.arc(0, 0, rx * 1.3, 0, Math.PI * 2); g.fill();
    g.restore();
    const o = anchor("img:/aura/crown-bone.webp");
    const br = reduce ? 0.8 : 0.8 + 0.2 * Math.sin(time * 0.9);
    const boost = flash && flash.spec?.anchor?.startsWith?.("img:") ? flash.k * 0.4 : 0;
    const R = Math.min(Math.min(rx, ry) * (0.55 + boost * 0.5), Math.max(8, (o.y - 3) / 0.5));
    g.save(); g.globalCompositeOperation = "lighter";
    const grd = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, R);
    grd.addColorStop(0, `rgba(124,232,168,${((0.15 * br + boost) * aS).toFixed(3)})`);
    grd.addColorStop(0.6, `rgba(74,222,128,${((0.06 * br + boost * 0.4) * aS).toFixed(3)})`);
    grd.addColorStop(1, "rgba(74,222,128,0)");
    g.fillStyle = grd; g.beginPath(); g.ellipse(o.x, o.y, R, R * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    return null;
  },
  // Molten pool where the hammer lands: white-hot at the flash, a flat
  // ellipse on the ground that cools to orange — not a round fireball.
  forge: ({ over, moment, cx, rx, anchor, pass }) => {
    const fl = moment?.spec?.flash;
    if (!fl || !over || pass !== "over" || moment.t <= fl.at) return null;
    const k = Math.min(1, (moment.t - fl.at) / Math.max(0.05, 1 - fl.at));
    const a = Math.pow(1 - k, 1.35) * 0.8;
    if (a <= 0.02) return null;
    const gc = Math.round(246 - 96 * k), bc = Math.round(214 - 164 * k);
    const o = anchor("ground");
    const ax = o.x + (fl.x || 0) * rx, ay = o.y;
    const prx = rx * 0.62, pry = prx * 0.22;
    over.save(); over.globalCompositeOperation = "lighter";
    over.translate(ax, ay); over.scale(1, pry / prx);
    const grd = over.createRadialGradient(0, 0, 0, 0, 0, prx);
    grd.addColorStop(0, `rgba(255,${gc},${bc},${a.toFixed(3)})`);
    grd.addColorStop(0.55, `rgba(255,150,50,${(a * 0.45).toFixed(3)})`);
    grd.addColorStop(1, "rgba(255,120,30,0)");
    over.fillStyle = grd; over.beginPath(); over.arc(0, 0, prx, 0, Math.PI * 2); over.fill();
    over.restore();
    return null;
  },
  brandmark: (opts) => {
    if (opts.pass === "late") drawCape(opts.g, opts);
    else if (opts.pass === "over") {
      const ctx = opts.over || opts.g;
      drawPauldrons(ctx, opts.anchors, opts.paulShift);
      drawSigil(ctx, opts);
    }
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

export function frameBlendAt(elapsed, count, duration = 0.12, mode = "loop", fadeLength = 0.12, reduced = false) {
  if (count <= 1 || reduced) return { from: 0, to: 0, alpha: 0 };
  const sequence = mode === "pingpong"
    ? [...Array(count).keys(), ...Array.from({ length: count - 2 }, (_, i) => count - i - 2)]
    : [...Array(count).keys()];
  const frameDuration = Math.max(0.001, duration);
  const position = Math.max(0, elapsed) / frameDuration;
  const step = Math.floor(position) % sequence.length;
  const progress = position - Math.floor(position);
  const fadeStart = Math.max(0, 1 - Math.min(frameDuration, Math.max(0, fadeLength)) / frameDuration);
  const alpha = fadeLength <= 0 || progress < fadeStart ? 0 : (progress - fadeStart) / Math.max(0.000001, 1 - fadeStart);
  return { from: sequence[step], to: sequence[(step + 1) % sequence.length], alpha };
}

export function readyFrameBlend(images, elapsed, duration, mode, fadeLength, reduced) {
  if (!images.every((frame) => frame.ready || frame.failed)) return null;
  const available = images.map((frame, index) => ({ frame, index })).filter(({ frame }) => frame.ready && !frame.failed);
  if (!available.length) return null;
  return { available, ...frameBlendAt(elapsed, available.length, duration, mode, fadeLength, reduced) };
}

function hexChannel(n) { return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"); }

export function ringColorAt(ring, elapsed, reduced = false, fallback = "#00D9FF") {
  const colors = ring.colorCycle?.filter((color) => hexRgb(color));
  if (!colors?.length) return ring.c || fallback;
  if (colors.length === 1 || reduced) return colors[0];
  const period = Math.max(0.001, ring.cyclePeriod || 3);
  const position = ((elapsed % period) + period) % period / period * colors.length;
  const index = Math.floor(position) % colors.length;
  if ((ring.cycleEasing || "linear") === "step") return colors[index];
  const a = hexRgb(colors[index]), b = hexRgb(colors[(index + 1) % colors.length]);
  const t = position - Math.floor(position);
  return `#${hexChannel(a[0] + (b[0] - a[0]) * t)}${hexChannel(a[1] + (b[1] - a[1]) * t)}${hexChannel(a[2] + (b[2] - a[2]) * t)}`;
}

export function makeFlameTongues(spec = [5, 7]) {
  const range = Array.isArray(spec) ? spec : [spec, spec];
  const lo = Math.max(5, Math.round(range[0] ?? 5));
  const hi = Math.min(7, Math.round(range[1] ?? 7));
  const count = Math.min(lo, hi) + Math.floor(Math.random() * (Math.abs(hi - lo) + 1));
  return Array.from({ length: count }, (_, i) => ({
    u: (i + 0.5) / count,
    h: rnd(0.86, 1.18),
    w: rnd(0.62, 1),
    f1: rnd(3.1, 5.7),
    f2: rnd(7.3, 11.9),
    f3: rnd(13.7, 19.1),
    p1: rnd(0, Math.PI * 2),
    p2: rnd(0, Math.PI * 2),
    p3: rnd(0, Math.PI * 2),
  }));
}

function flameFill(hex, alpha) {
  const rgb = hexRgb(hex) || [255, 90, 31];
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, alpha))})`;
}

function drawFlameTongue(g, baseX, baseY, width, height, tipX, color, alpha) {
  g.fillStyle = flameFill(color, alpha);
  g.beginPath();
  g.moveTo(baseX - width, baseY);
  g.bezierCurveTo(baseX - width * 0.88, baseY - height * 0.34, tipX - width * 0.28, baseY - height * 0.68, tipX, baseY - height);
  g.bezierCurveTo(tipX + width * 0.28, baseY - height * 0.68, baseX + width * 0.88, baseY - height * 0.34, baseX + width, baseY);
  g.closePath();
  g.fill();
}

function drawProceduralFlame(g, p, x, y, time, reduced, L = {}) {
  const s = p.sz;
  const palette = Array.isArray(L.c) && L.c.length ? L.c : [L.c || "#FF5A1F", "#FFB43C", "#FFF6C9"];
  const outer = palette[0], mid = palette[1] || outer, inner = palette[2] || "#FFF6C9";
  const tongues = p.flameTongues || (p.flameTongues = makeFlameTongues(L.tongues));
  const flicker = Math.max(0, L.flicker ?? 0.22) * (reduced ? 0.35 : 1);
  g.save();
  g.translate(x, y);
  g.rotate(p.rot || 0);
  g.globalCompositeOperation = "lighter";
  const a0 = g.globalAlpha;
  g.globalAlpha = a0 * 0.28;
  g.fillStyle = flameFill(outer, 0.55);
  g.beginPath();
  g.ellipse(0, -s * 0.08, s * 0.86, s * 0.36, 0, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = a0;
  for (const tongue of tongues) {
    const wave = Math.sin(time * tongue.f1 + tongue.p1) + Math.sin(time * tongue.f2 + tongue.p2) * 0.55 + Math.sin(time * tongue.f3 + tongue.p3) * 0.25;
    const stretch = 1 + (Math.sin(time * tongue.f2 + tongue.p2) * 0.07 + Math.sin(time * tongue.f3 + tongue.p3) * 0.04) * (reduced ? 0.35 : 1);
    const baseX = (tongue.u - 0.5) * s * 1.35;
    const height = s * 1.85 * tongue.h * stretch;
    const width = s * 0.42 * tongue.w;
    const tipX = baseX + wave * s * flicker;
    drawFlameTongue(g, baseX, 0, width, height, tipX, outer, 0.72);
    drawFlameTongue(g, baseX, 0, width * 0.58, height * 0.76, baseX + (tipX - baseX) * 0.62, mid, 0.76);
    drawFlameTongue(g, baseX, 0, width * 0.3, height * 0.48, baseX + (tipX - baseX) * 0.35, inner, 0.8);
  }
  if (!reduced && L.shimmer !== false) {
    const shimmerCount = Math.max(0, Math.round(L.shimmerN ?? 3));
    for (let i = 0; i < shimmerCount; i += 1) {
      const phase = time * (1.7 + i * 0.61) + p.ph + i * 1.9;
      g.globalAlpha = a0 * (0.09 + 0.08 * (0.5 + 0.5 * Math.sin(phase)));
      g.strokeStyle = flameFill(inner, 0.9);
      g.lineWidth = Math.max(0.6, s * (0.035 + i * 0.012));
      g.beginPath();
      g.arc((i - (shimmerCount - 1) / 2) * s * 0.22, -s * 0.05, s * (0.58 + i * 0.18), Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
    g.globalAlpha = a0;
  }
  g.restore();
}

// Per-particle sprite memo: a particle only ever uses one sprite kind and its
// colour only changes on respawn — skips a Map lookup per particle per frame.
const pSprite = (p, soft) => (p._spC === p.c && p._sp) ? p._sp : (p._spC = p.c, p._sp = soft ? softSprite(p.c) : glowSprite(p.c));

// Baked detail sprites for the richer 7j shapes: multi-element art (ribs,
// flares, facet shading) paints once per colour per size tier and then costs a
// single drawImage per particle per frame. Painters work in a centred unit
// space roughly -32..32 px on the sprite. `need` is the displayed draw size in
// device px — the bake resolution scales with it (64px per tier) so a small
// bake is never stretched to a big size, and a DPR-2 canvas (double device px)
// gets a double-resolution bake.
const bakeSprite = (key, color, tier, paint) => {
  const ck = `7j:${key}:${color}:${tier}`;
  if (_glowCache.has(ck)) return _glowCache.get(ck);
  const c = document.createElement("canvas"); c.width = c.height = 64 * tier;
  const g = c.getContext("2d");
  if (g) { g.scale(tier, tier); g.translate(32, 32); paint(g, hexRgb(color) || [255, 255, 255]); }
  _glowCache.set(ck, c);
  return c;
};
const shapeSprite = (p, key, need, paint) => {
  const tier = Math.min(8, Math.max(1, Math.ceil(need / 64)));
  if (p._bspC === p.c && p._bspT === tier && p._bsp) return p._bsp;
  p._bspC = p.c; p._bspT = tier;
  return (p._bsp = bakeSprite(key, p.c, tier, paint));
};

// Path2D is browser-only — the Node unit tests stub the 2d context and have
// no global for it, so fall back to a no-op recorder (fill/stroke calls still
// reach the stub with a placeholder path object).
const Path2DImpl = typeof Path2D !== "undefined" ? Path2D : class {
  moveTo() {} lineTo() {} closePath() {} arc() {} ellipse() {} rect() {} quadraticCurveTo() {} bezierCurveTo() {}
};

// Static-geometry particle paths are cached on the particle as Path2D objects
// — the same geometry re-issued every frame rasterizes identically, so this is
// a pure call-count cut. The cache rebuilds if the drawn size ever changes.
const shapePath = (p, key, s, build) => {
  const cache = p._p2 || (p._p2 = { _s: s });
  if (cache._s !== s) { for (const k in cache) delete cache[k]; cache._s = s; }
  return cache[key] || (cache[key] = build(new Path2DImpl(), s));
};

export function drawNewParticleShape(g, shape, p, x, y, time = 0, reduced = false, L = {}) {
  const s = p.sz;
  if (shape === "flame") {
    drawProceduralFlame(g, p, x, y, time, reduced, L);
  } else if (shape === "ash") {
    g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.c; g.globalAlpha *= 0.38; g.shadowColor = p.c; g.shadowBlur = s * 0.35;
    for (const blob of p.ashBlobs || [[0, 0, 0.4]]) { g.beginPath(); g.arc(blob[0] * s, blob[1] * s, blob[2] * s, 0, Math.PI * 2); g.fill(); }
    g.restore();
  } else if (shape === "feather") {
    const body = shapePath(p, "b", s, (P, v) => { P.moveTo(0, -v * 1.7); P.bezierCurveTo(v * 0.9, -v * 0.7, v * 0.45, v * 0.75, -v * 0.1, v * 1.25); P.bezierCurveTo(-v * 0.35, v * 0.35, -v * 0.45, -v * 0.8, 0, -v * 1.7); return P; });
    const spine = shapePath(p, "sp", s, (P, v) => { P.moveTo(0, -v * 1.45); P.quadraticCurveTo(v * 0.12, 0, -v * 0.15, v * 1.45); return P; });
    g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.c;
    g.fill(body);
    g.strokeStyle = "rgba(15,23,42,0.42)"; g.lineWidth = Math.max(0.5, s * 0.14); g.stroke(spine); g.restore();
  } else if (shape === "bonechip") {
    const chip = shapePath(p, "c", s, (P, v) => { P.moveTo(0, -v); P.lineTo(v * 0.48, -v * 0.18); P.lineTo(v * 0.24, v * 0.62); P.lineTo(-v * 0.3, v * 0.48); P.lineTo(-v * 0.42, -v * 0.12); P.closePath(); return P; });
    const glint = shapePath(p, "g", s, (P, v) => { P.moveTo(0, -v); P.lineTo(v * 0.48, -v * 0.18); P.lineTo(0, 0); P.closePath(); return P; });
    g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.c;
    g.fill(chip);
    g.globalAlpha *= 0.35; g.fillStyle = "#ffffff"; g.fill(glint); g.restore();
  } else if (shape === "coin") {
    g.save(); g.translate(x, y); g.rotate(p.rot); const flip = Math.sin(time * 8 + p.ph); const width = Math.max(s * 0.08, s * 0.75 * Math.abs(flip));
    g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, width, s * 0.7, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = Math.max(0.5, s * 0.1); g.stroke(); g.restore();
  } else if (shape === "crescent") {
    const moon = shapePath(p, "m", s, (P, v) => { P.arc(-v * 0.18, 0, v, -1.05, 1.05); P.arc(v * 0.28, 0, v * 0.82, 1.05, -1.05, true); P.closePath(); return P; });
    g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.c;
    g.fill(moon); g.restore();
  } else if (shape === "pulse") {
    const period = 1.35;
    const progress = (((time + p.ph) % period) + period) % period / period;
    g.save(); g.translate(x, y); g.globalAlpha *= 1 - progress; g.strokeStyle = p.c; g.lineWidth = Math.max(0.5, s * 0.2); g.beginPath(); g.arc(0, 0, s * (0.35 + progress * 1.4), 0, Math.PI * 2); g.stroke(); g.restore();
  } else if (shape === "sandgrain") {
    const vx = p.vx || (p.w ? -Math.sin(p.ang || 0) * p.w : 0), vy = p.vy || (p.w ? Math.cos(p.ang || 0) * p.w : 1);
    const grain = shapePath(p, "g", s, (P, v) => { P.ellipse(0, 0, v * 0.75, v * 0.35, 0, 0, Math.PI * 2); return P; });
    g.save(); g.translate(x, y); g.rotate(Math.atan2(vy, vx)); g.fillStyle = p.c; g.globalAlpha *= 0.32; g.fill(grain); g.restore();
  } else if (shape === "shard") {
    const shard = shapePath(p, "s", s, (P, v) => { P.moveTo(0, -v * 1.4); P.lineTo(v * 0.55, 0); P.lineTo(0, v * 1.1); P.lineTo(-v * 0.55, 0); P.closePath(); return P; });
    const glint = shapePath(p, "g", s, (P, v) => { P.moveTo(0, -v * 1.4); P.lineTo(v * 0.2, -v * 0.2); P.lineTo(0, 0); P.closePath(); return P; });
    g.save(); g.translate(x, y); g.rotate(p.rot);
    g.fillStyle = p.c;
    g.strokeStyle = "rgba(18,10,4,0.5)"; g.lineWidth = Math.max(1.1, s * 0.28); g.stroke(shard); g.fill(shard);
    g.globalAlpha *= 0.6; g.fillStyle = "#ffffff"; g.fill(glint);
    g.restore();
  } else if (shape === "smoke") {
    const sp = pSprite(p, true), k = Math.min(1.28, 1 + Math.min(p.age || 0, 2.4) * 0.1);
    g.drawImage(sp, x - s * k, y - s * k, s * 2 * k, s * 2 * k);
  } else if (shape === "chainlink") {
    const link = shapePath(p, "l", s, (P, v) => { P.ellipse(0, 0, v * 0.8, v * 0.4, 0, 0, Math.PI * 2); return P; });
    g.save(); g.translate(x, y); g.rotate(p.rot); g.strokeStyle = p.c; g.lineWidth = Math.max(0.5, s * 0.2); g.stroke(link); g.restore();
  } else if (shape === "page") {
    // a page of the record: pale rectangle tumbling, one in three carries a
    // name inked in red
    const pw = s * 1.05, phh = s * 1.45;
    const body = shapePath(p, "b", s, (P) => { P.rect(-pw / 2, -phh / 2, pw, phh); return P; });
    const ink = shapePath(p, "i", s, (P) => {
      P.moveTo(-pw * 0.3, -phh * 0.14); P.quadraticCurveTo(-pw * 0.05, -phh * 0.22, pw * 0.28, -phh * 0.12);
      P.moveTo(-pw * 0.3, phh * 0.04); P.quadraticCurveTo(-pw * 0.1, phh * 0.1, pw * 0.14, phh * 0.05);
      return P;
    });
    g.save(); g.translate(x, y); g.rotate(p.rot + Math.sin(time * 0.7 + p.ph) * 0.15);
    g.fillStyle = p.c; g.fill(body);
    g.strokeStyle = "rgba(20,12,8,0.5)"; g.lineWidth = Math.max(0.5, s * 0.09); g.stroke(body);
    if (((p.i ?? Math.floor(p.ph * 10)) % 3) === 0) {
      g.strokeStyle = "#A3151F"; g.lineWidth = Math.max(0.5, s * 0.1); g.lineCap = "round";
      g.stroke(ink);
    }
    g.restore();
  } else if (shape === "comet") {
    // bright head trailing a tapered ribbon along its velocity — baked sprite,
    // stretched along the motion axis; the head elongates slightly, which reads
    // as speed blur
    const vx = p.vx || (p.w ? -Math.sin(p.ang || 0) * p.w * 20 : 0), vy = p.vy || (p.w ? Math.cos(p.ang || 0) * p.w * 20 : 1);
    const len = Math.hypot(vx, vy) || 1;
    const stretch = reduced ? 1 : 1 + Math.min(1.5, len * 0.05);
    const sp = shapeSprite(p, "comet", s * 5.6, (sg, rgb) => {
      let grd = sg.createLinearGradient(10, 0, -30, 0);
      grd.addColorStop(0, `rgba(${rgb.join(",")},0.8)`); grd.addColorStop(1, `rgba(${rgb.join(",")},0)`);
      sg.fillStyle = grd;
      sg.beginPath(); sg.moveTo(10, -5); sg.lineTo(-30, 0); sg.lineTo(10, 5); sg.closePath(); sg.fill();
      grd = sg.createRadialGradient(10, 0, 0, 10, 0, 15);
      grd.addColorStop(0, "#ffffff"); grd.addColorStop(0.3, `rgb(${rgb.join(",")})`); grd.addColorStop(1, `rgba(${rgb.join(",")},0)`);
      sg.fillStyle = grd; sg.beginPath(); sg.arc(10, 0, 15, 0, Math.PI * 2); sg.fill();
    });
    g.save(); g.translate(x, y); g.rotate(Math.atan2(vy, vx)); g.scale(stretch, 1);
    g.drawImage(sp, -s * 3.4, -s * 2.2, s * 5.6, s * 4.4);
    g.restore();
  } else if (shape === "sparkle") {
    // four-point star with concave arms, a thin axis flare and a soft core —
    // one baked sprite, twinkle applied as draw size
    const tw = reduced ? 1 : 1 + 0.2 * Math.sin(time * 5 + p.ph);
    const sp = shapeSprite(p, "sparkle", s * 5.2, (sg, rgb) => {
      let grd = sg.createRadialGradient(0, 0, 0, 0, 0, 27);
      grd.addColorStop(0, "#ffffff"); grd.addColorStop(0.3, `rgba(${rgb.join(",")},0.85)`); grd.addColorStop(1, `rgba(${rgb.join(",")},0)`);
      sg.fillStyle = grd; sg.fillRect(-32, -32, 64, 64);
      sg.lineCap = "round"; sg.strokeStyle = "rgba(255,255,255,0.85)"; sg.lineWidth = 1.1;
      sg.beginPath(); sg.moveTo(0, -30); sg.lineTo(0, -20); sg.moveTo(0, 20); sg.lineTo(0, 30); sg.moveTo(-22, 0); sg.lineTo(-16, 0); sg.moveTo(16, 0); sg.lineTo(22, 0); sg.stroke();
      sg.fillStyle = "#ffffff"; sg.beginPath();
      const R = 22, t = 3.2;
      sg.moveTo(0, -R); sg.quadraticCurveTo(t, -t, R, 0); sg.quadraticCurveTo(t, t, 0, R); sg.quadraticCurveTo(-t, t, -R, 0); sg.quadraticCurveTo(-t, -t, 0, -R);
      sg.closePath(); sg.fill();
      sg.fillStyle = `rgba(${rgb.join(",")},0.85)`; sg.beginPath();
      const r2 = 13;
      sg.moveTo(0, -r2); sg.quadraticCurveTo(2, -2, r2, 0); sg.quadraticCurveTo(2, 2, 0, r2); sg.quadraticCurveTo(-2, 2, -r2, 0); sg.quadraticCurveTo(-2, -2, 0, -r2);
      sg.closePath(); sg.fill();
    });
    const r = s * 2.15 * tw;
    g.drawImage(sp, x - r, y - r, r * 2, r * 2);
  } else if (shape === "orb") {
    // glossy sphere: baked specular highlight and shaded limb, slow breathe
    const k = reduced ? 1 : 1 + 0.07 * Math.sin(time * 1.6 + p.ph);
    const sp = shapeSprite(p, "orb", s * 4.5, orbPaint), r = s * 2.1 * k;
    g.drawImage(sp, x - r, y - r, r * 2, r * 2);
  } else if (shape === "crystal") {
    // hex shard split into lit, shaded and top-glint facets
    const out = shapePath(p, "o", s, (P, v) => { P.moveTo(0, -v * 1.7); P.lineTo(v * 0.62, -v * 0.5); P.lineTo(v * 0.42, v * 0.9); P.lineTo(0, v * 1.5); P.lineTo(-v * 0.42, v * 0.9); P.lineTo(-v * 0.62, -v * 0.5); P.closePath(); return P; });
    const shade = shapePath(p, "d", s, (P, v) => { P.moveTo(-v * 0.62, -v * 0.5); P.lineTo(-v * 0.42, v * 0.9); P.lineTo(0, v * 1.5); P.lineTo(0, -v * 0.1); P.closePath(); return P; });
    const shine = shapePath(p, "h", s, (P, v) => { P.moveTo(0, -v * 1.7); P.lineTo(-v * 0.62, -v * 0.5); P.lineTo(0, -v * 0.1); P.closePath(); return P; });
    g.save(); g.translate(x, y); g.rotate(p.rot + (reduced ? 0 : time * 0.2));
    g.fillStyle = p.c; g.fill(out);
    g.fillStyle = "rgba(8,10,20,0.34)"; g.fill(shade);
    g.fillStyle = "rgba(255,255,255,0.3)"; g.fill(shine);
    g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = Math.max(0.4, s * 0.08); g.stroke(out);
    g.restore();
  } else if (shape === "wisp") {
    // curling ribbon of light rising from a bright head — baked sprite, swayed
    const sp = shapeSprite(p, "wisp", s * 4.2, (sg, rgb) => {
      let grd = sg.createRadialGradient(-6, 9, 0, -6, 9, 12);
      grd.addColorStop(0, "#ffffff"); grd.addColorStop(0.45, `rgb(${rgb.join(",")})`); grd.addColorStop(1, `rgba(${rgb.join(",")},0)`);
      sg.fillStyle = grd; sg.beginPath(); sg.arc(-6, 9, 12, 0, Math.PI * 2); sg.fill();
      grd = sg.createLinearGradient(-6, 8, 20, -24);
      grd.addColorStop(0, `rgb(${rgb.join(",")})`); grd.addColorStop(1, `rgba(${rgb.join(",")},0)`);
      sg.fillStyle = grd; sg.beginPath();
      sg.moveTo(-11, 7);
      sg.bezierCurveTo(6, 7, 4, -14, 20, -24);
      sg.bezierCurveTo(10, -17, 8, -2, -3, 13);
      sg.closePath(); sg.fill();
      // bright filament along the ribbon spine — carries the shape at board-32
      sg.strokeStyle = "rgba(255,255,255,0.8)"; sg.lineWidth = 1.6; sg.lineCap = "round";
      sg.beginPath(); sg.moveTo(-6, 8); sg.bezierCurveTo(2, 2, 6, -10, 17, -20); sg.stroke();
    });
    const sway = reduced ? 0 : Math.sin(time * 1.4 + p.ph) * 0.3;
    g.save(); g.translate(x, y); g.rotate(p.rot + sway);
    g.drawImage(sp, -s * 2, -s * 2.1, s * 4, s * 4.2);
    g.restore();
  } else if (shape === "rune") {
    // small rotating sigil: outer ring, inner ring, three radial ticks
    const mark = shapePath(p, "m", s, (P, v) => {
      P.arc(0, 0, v, 0, Math.PI * 2);
      P.moveTo(v * 0.42, 0); P.arc(0, 0, v * 0.42, 0, Math.PI * 2);
      for (let i = 0; i < 3; i++) { const a = i * (Math.PI * 2 / 3) + 0.5; P.moveTo(Math.cos(a) * v * 0.66, Math.sin(a) * v * 0.66); P.lineTo(Math.cos(a) * v * 0.95, Math.sin(a) * v * 0.95); }
      return P;
    });
    g.save(); g.translate(x, y); g.rotate(p.ph + (reduced ? 0 : time * 0.35));
    g.strokeStyle = p.c; g.lineWidth = Math.max(0.5, s * 0.16); g.stroke(mark);
    if (s >= 2.4) { g.fillStyle = p.c; g.beginPath(); g.arc(0, 0, s * 0.14, 0, Math.PI * 2); g.fill(); }
    g.restore();
  } else if (shape === "zap") {
    // tiny jagged spark of light — no flash, never touches the flash budget
    const alt = (p.i ?? Math.floor(p.ph * 7)) % 2;
    const zig = shapePath(p, alt ? "b" : "a", s, (P, v) => {
      if (alt) { P.moveTo(-v * 0.4, -v * 1.35); P.lineTo(v * 0.2, -v * 0.35); P.lineTo(-v * 0.3, -v * 0.08); P.lineTo(v * 0.35, v * 1.35); }
      else { P.moveTo(v * 0.35, -v * 1.35); P.lineTo(-v * 0.2, -v * 0.3); P.lineTo(v * 0.28, -v * 0.02); P.lineTo(-v * 0.38, v * 1.35); }
      return P;
    });
    // flicker ~1.4 Hz. Phase is spread across particles by golden angle on the
    // slot index (+ spawn phase) so a layer never brightens in sync — worst
    // case a few particles peak together, the rest sit mid-cycle.
    const phase = (p.i == null ? p.ph * 2.1 : (p.i * 2.399963 + p.ph * 0.5)) % (Math.PI * 2);
    const fl = reduced ? 0.85 : 0.62 + 0.38 * Math.max(0, Math.sin(time * 9 + phase));
    g.save(); g.translate(x, y); g.rotate(p.rot + (alt ? 0.5 : -0.2));
    g.globalAlpha *= fl;
    g.strokeStyle = p.c; g.lineWidth = Math.max(0.9, s * 0.5); g.lineCap = "round"; g.stroke(zig);
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = Math.max(0.4, s * 0.18); g.stroke(zig);
    g.restore();
  } else if (shape === "moth") {
    // two luminous wings fluttering around a small body — both wings baked
    // mirrored into one path so the flap is a single scaled fill
    const flap = reduced ? 0.3 : 0.3 + 0.7 * Math.abs(Math.sin(time * 6 + p.ph));
    const wings = shapePath(p, "w", s, (P, v) => {
      for (const m of [1, -1]) {
        P.moveTo(0, -v * 0.1);
        P.bezierCurveTo(m * v * 0.5, -v * 1.15, m * v * 1.5, -v * 1.05, m * v * 1.55, -v * 0.25);
        P.bezierCurveTo(m * v * 1.2, v * 0.25, m * v * 0.4, v * 0.35, 0, v * 0.15);
        P.closePath();
      }
      return P;
    });
    g.save(); g.translate(x, y); g.rotate(p.rot);
    g.save(); g.scale(flap, 1); g.fillStyle = p.c; g.fill(wings);
    g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = Math.max(0.6, s * 0.13); g.stroke(wings); g.restore();
    g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.15, s * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  } else if (shape === "lantern") {
    // warm hanging lantern: glow halo, ribbed body, cap and hanger — one sprite
    const sp = shapeSprite(p, "lantern", s * 4.8, (sg, rgb) => {
      let grd = sg.createRadialGradient(0, 4, 0, 0, 4, 24);
      grd.addColorStop(0, `rgba(${rgb.join(",")},0.5)`); grd.addColorStop(1, `rgba(${rgb.join(",")},0)`);
      sg.fillStyle = grd; sg.fillRect(-32, -32, 64, 64);
      sg.fillStyle = `rgba(${rgb.join(",")},0.7)`;
      sg.beginPath(); sg.ellipse(0, 3, 12, 14, 0, 0, Math.PI * 2); sg.fill();
      grd = sg.createRadialGradient(0, 4, 0, 0, 4, 9);
      grd.addColorStop(0, "rgba(255,255,255,0.95)"); grd.addColorStop(0.6, `rgba(${rgb.join(",")},0.55)`); grd.addColorStop(1, `rgba(${rgb.join(",")},0)`);
      sg.fillStyle = grd; sg.beginPath(); sg.arc(0, 4, 9, 0, Math.PI * 2); sg.fill();
      sg.strokeStyle = "rgba(28,16,8,0.6)"; sg.lineWidth = 1.4;
      for (const k of [-0.55, 0, 0.55]) { sg.beginPath(); sg.moveTo(k * 11, -9.5); sg.quadraticCurveTo(k * 17, 3, k * 11, 15.5); sg.stroke(); }
      sg.beginPath(); sg.moveTo(-6, -11); sg.lineTo(6, -11); sg.moveTo(-6, 17); sg.lineTo(6, 17); sg.stroke();
      sg.beginPath(); sg.moveTo(0, -11); sg.lineTo(0, -19); sg.stroke();
    });
    const sway = reduced ? 0 : Math.sin(time * 0.9 + p.ph) * 0.12;
    g.save(); g.translate(x, y); g.rotate(p.rot + sway);
    g.drawImage(sp, -s * 2.2, -s * 2.4, s * 4.4, s * 4.8);
    g.restore();
  } else if (shape === "sparkburst") {
    // six tapered rays around a bright core — one sprite, spun and pulsed
    const sp = shapeSprite(p, "sparkburst", s * 4.6, (sg, rgb) => {
      sg.fillStyle = `rgba(${rgb.join(",")},0.9)`;
      for (let i = 0; i < 6; i++) {
        sg.save(); sg.rotate((i / 6) * Math.PI * 2 + 0.26);
        sg.beginPath(); sg.moveTo(5, -1.1); sg.lineTo(27, 0); sg.lineTo(5, 1.1); sg.closePath(); sg.fill();
        sg.restore();
      }
      const grd = sg.createRadialGradient(0, 0, 0, 0, 0, 13);
      grd.addColorStop(0, "#ffffff"); grd.addColorStop(0.4, `rgb(${rgb.join(",")})`); grd.addColorStop(1, `rgba(${rgb.join(",")},0)`);
      sg.fillStyle = grd; sg.beginPath(); sg.arc(0, 0, 13, 0, Math.PI * 2); sg.fill();
    });
    const pul = reduced ? 0.9 : 0.8 + 0.3 * Math.sin(time * 4 + p.ph);
    g.save(); g.translate(x, y); g.rotate(p.rot + (reduced ? 0 : time * 0.4));
    g.globalAlpha *= Math.min(1, pul);
    g.drawImage(sp, -s * 2.3, -s * 2.3, s * 4.6, s * 4.6);
    g.restore();
  }
}

// Linear keyframe lookup for moment poses: [[t, v], ...] sorted by t,
// clamped at both ends. t is the 0..1 moment phase from api.moment.
const keyAt = (frames, t) => {
  if (!frames?.length) return null;
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    if (t <= frames[i][0]) {
      const [t0, v0] = frames[i - 1], [t1, v1] = frames[i];
      return v0 + (v1 - v0) * ((t - t0) / Math.max(1e-6, t1 - t0));
    }
  }
  return frames[frames.length - 1][1];
};

export function makeAura(canvas, { aura, w, h, mode, ringR, overCanvas, figure }) {
  aura = resolveAuraId(aura); // legacy ids from old saves/cards render the renamed spec
  // View-scoped spec overrides: `body:` fields apply only to body/figure
  // renders, `circle:` only to the avatar ring. Everything else is shared.
  const viewBlock = mode === "body" ? "body" : "circle";
  const fx = mergeViewSpec(AURA_FX[aura], viewBlock), base = AURAS.find((a) => a.id === aura);
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
  if (aura === "brandmark") { auraImage("/aura/cape.webp"); auraImage("/aura/brand.png"); auraImage("/aura/pauldron.webp"); }
  if (aura === "ledger") { auraImage("/aura/robe-ledger.webp"); auraImage("/aura/mask-ledger.webp"); }
  const spd = fx.spd || 1;
  const cx = w / 2, cy = mode === "body" ? h * 0.52 : h / 2;
  const fit = aura === "ascended" ? 1 : (mode === "body" ? 0.84 : 1);
  const rx = Math.max(10, (mode === "body" ? w * 0.28 : ringR) * fit);
  const ry = Math.max(10, (mode === "body" ? h * 0.36 : ringR) * fit);
  const anchors = resolveAuraAnchors(mode, { w, h, cx, cy, rx, ry }, figure);
  const gR = Math.min(1.45, (Math.min(cx, w - cx) / rx) * 0.97, (Math.min(cy, h - cy) / ry) * 0.97);
  // base-glow discs are static geometry — the gradients pulse, the path doesn't
  const glowPath = new Path2DImpl(); glowPath.arc(0, 0, rx * gR, 0, Math.PI * 2);
  const darkGlowPath = new Path2DImpl(); darkGlowPath.arc(cx, cy, rx * gR, 0, Math.PI * 2);
  const scale = Math.max(0.7, Math.min(1.25, (w * h) / (140 * 140)));
  const unit = Math.max(w < 110 ? 1.15 : 0.75, Math.min(rx, ry) / 48);
  const onRing = (ang, k = 1) => [cx + Math.cos(ang) * rx * k, cy + Math.sin(ang) * ry * k];
  let time = 0, clock = 0;
  let boltT = fx.bolts?.burst ? rnd(0.35, 0.9) : (fx.bolts?.every ? rnd(...fx.bolts.every) : 0), bolt = null;
  let liveBolts = [], burstLeft = 0, burstGap = 0.16, strike = 0, flashLeft = 0, flTryAt = 0;
  let flashState = { last: null, burstFlashed: false };
  let flashSpec = null;
  const api = { visible: true, reduce: false, flashes: 0, flashTimes: [], strike: 0, boltsFired: 0, shadowWisps: 0, shadowAnchorCache: 0, moment: null };
  // Signature moments: the first wait is drawn per mount so a leaderboard of
  // auras never fires in sync. Big canvases get 2.5x burst particles and a
  // longer moment; board-size canvases get the small version.
  const mScale = (w * h) >= 110 * 110 ? 2.5 : (w * h) >= 80 * 80 ? 1.5 : 1;
  const mdur = fx.moment ? fx.moment.dur * (mScale >= 2.5 ? 1.35 : 1) : 0;
  let momentAt = fx.moment ? rnd(0.4, (fx.moment.every || [6, 10])[1]) : 0;
  let flareAt = fx.flare ? rnd(...fx.flare.every) : 0;
  let momentT = null, momentFired = null, momentParts = [];
  // Per-instance render cache: gradients/paths that embed this canvas's
  // geometry must never live on the shared AURA_FX spec — two instances of
  // the same aura can be mounted at different sizes at once.
  const cc = {};
  api.momentWait = momentAt;
  api.forceMoment = () => { if (fx.moment && momentT == null) momentAt = Math.min(momentAt, 0.001); };
  const c1 = base?.colors?.[0] || "#00D9FF", c2 = base?.colors?.[1] || c1;
  const rgba = (hex, a) => { const c = hexRgb(hex) || [0, 217, 255]; return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`; };

  let particleBudget = 120;
  const layerSpecs = [];
  fx.layers.filter((L) => L.placed !== "shoulders").forEach((L) => {
    // Per-view override: `body:` wins in body/figure mode, `circle:` on the
    // avatar ring — the other view stays pixel-identical to the base layer.
    const eff = mergeViewLayer(L, viewBlock);
    layerSpecs.push(eff);
    if (eff.shape === "flame" && eff.embers) {
      const embers = eff.embers === true ? {} : eff.embers;
      layerSpecs.push({
        k: "rise", shape: "ember", n: 8, c: ["#FFB43C", "#FFF6C9"], sp: [18, 42], life: [0.5, 1.1], sz: [0.8, 1.6], sway: 10, a: 0.8,
        ...embers, over: eff.over, behind: eff.behind,
      });
    }
  });
  const shadowSpec = (L) => {
    if (!L.shadow) return null;
    const s = L.shadow === true ? {} : L.shadow;
    return {
      max: Math.max(0, Math.round(s.max ?? 24)),
      rate: Math.max(0, s.rate ?? 10),
      life: s.life || [0.8, 1.6],
      sp: s.sp || [4, 12],
      sz: s.sz || [3, 8],
      c: s.c || "#111827",
      a: s.a ?? 0.38,
      blend: s.blend || "source-over",
      anchors: Math.max(1, Math.round(s.anchors ?? 48)),
      jit: s.jit ?? 0.35,
    };
  };

  const layers = layerSpecs.map((L) => {
    const n = Math.min(particleBudget, Math.max(L.even ? L.n : L.shape === "flame" ? 1 : 3, Math.round(L.n * (L.even ? 1 : scale))));
    particleBudget -= n;
    const srcList = L.shape === "img" ? [].concat(L.src || []).filter(Boolean) : [];
    const frameList = L.frames ? [].concat(L.frames).filter(Boolean) : [];
    const isFrameAnim = L.shape === "img" && frameList.length > 0;
    const singleSrcList = isFrameAnim ? [] : srcList;
    const wantsShadow = !!(L.shadow && L.shape === "img");
    if (isFrameAnim) frameList.forEach((src) => auraImage(src));
    else singleSrcList.forEach((src) => auraImage(src, { edgeAnchors: wantsShadow }));
    // `behind` stays on this under-photo canvas. `over` layers paint later,
    // on the second canvas above the photo.
    const range = (v, fallback) => Array.isArray(v) ? v : [v ?? fallback, v ?? fallback];
    const spawn = (p, fresh) => {
      p.c = L.c ? pick(L.c) : "#ffffff";
      const raw = rnd(...range(L.sz, L.shape === "img" ? 0.8 : 2.5));
      p.sz = L.shape === "emoji" ? raw : L.shape === "img" || (L.shape === "flame" && mode !== "body" && L.circle) ? raw * Math.min(rx, ry) : Math.max(w < 110 ? 1.35 : 0.9, raw * unit * (mode === "body" ? 1.15 : 1));
      p.age = 0;
      p.rot = L.shape === "img" || L.shape === "flame" ? (L.rot || 0) * Math.PI * 2 : rnd(0, Math.PI * 2);
      p.vr = L.shape === "img" || L.shape === "flame" ? (L.spin || 0) * Math.PI * 2 : L.spin ? rnd(-3, 3) : rnd(-1, 1);
      p.ph = rnd(0, Math.PI * 2);
      if (L.shape === "ash") p.ashBlobs = Array.from({ length: 3 }, () => [rnd(-0.28, 0.28), rnd(-0.28, 0.28), rnd(0.24, 0.42)]);
      if (L.shape === "flame") p.flameTongues = makeFlameTongues(L.tongues);
      if (isFrameAnim) {
        p.frameImages = frameList.map((src) => auraImage(src));
        if (wantsShadow) p.shadowAnchorCache = new Map();
      } else if (L.shape === "img" && singleSrcList.length) {
        p.src = singleSrcList[p.i % singleSrcList.length];
        p.image = auraImage(p.src, { edgeAnchors: wantsShadow });
      }
      if (L.k === "rise" || L.k === "bubble") {
        // low: opt-in — spawn only on the lower arc so risers fade before
        // they can reach the top border on small canvases
        const ang = rnd(Math.PI * 0.05, Math.PI * 0.95) + (!L.low && Math.random() < 0.35 ? Math.PI : 0);
        [p.x, p.y] = onRing(ang, rnd(1.05, 1.18)); p.vy = -rnd(...(L.sp || [6, 12])) * unit; p.life = rnd(...(L.life || [1.5, 2.5]));
        if (fresh) p.age = rnd(0, p.life);
      } else if (L.k === "fall") {
        p.x = rnd(cx - rx * 1.5, cx + rx * 1.5); p.y = cy - ry * 1.6 - rnd(0, 20); p.vy = rnd(...(L.sp || [8, 16])) * unit; p.vx = (L.drift || 0) * unit * rnd(0.6, 1.2); p.life = 99;
        if (fresh) p.y = rnd(cy - ry * 1.6, cy + ry * 1.5);
      } else if (L.k === "inward") {
        p.ang = rnd(0, Math.PI * 2); p.r0 = rnd(1.35, 1.6); p.life = rnd(...(L.life || [1.5, 2.5])); p.spd = rnd(...(L.sp || [0.4, 0.9]));
        // fit: opt-in spawn-radius clamp that keeps the particle footprint
        // inside the canvas — the default 1.35–1.6 start radius overflows
        // narrow body-mode canvases. Absent field = byte-identical behavior.
        if (L.fit) { const pad = p.sz * 2.2 + 2; p.r0 = Math.min(p.r0, Math.max(1.05, Math.min((Math.min(cx, w - cx) - pad) / rx, (Math.min(cy, h - cy) - pad) / ry))); }
        if (fresh) p.age = rnd(0, p.life);
      } else { // orbit
        p.ang = L.at != null ? L.at * Math.PI * 2 : L.even ? (p.i / n) * Math.PI * 2 + (L.jit ? rnd(-L.jit, L.jit) : 0) : rnd(0, Math.PI * 2);
        p.r = Math.max(0.5, rnd(...(L.r || [1, 1.1]))); p.w = rnd(...(L.w || [0.1, 0.3])) * (Math.random() < 0.5 && !L.even && L.at == null ? -1 : 1); p.life = 99;
        if (L.top && L.at == null) p.ang = rnd(Math.PI * 1.1, Math.PI * 1.9);
      }
      p.e = L.e ? L.e[p.i % L.e.length] : null;
    };
    const ps = Array.from({ length: n }, (_, i) => { const p = { i }; spawn(p, true); return p; });
    return { L, ps, spawn, wisps: [], wispAcc: 0, wantsShadow, shadow: wantsShadow ? shadowSpec(L) : null, aMul: L.a ?? 1 };
  });

  const frameSize = (img, s) => {
    const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
    return aspect >= 1 ? [s, s / aspect] : [s * aspect, s];
  };

  const activeShadowSource = (state, p, S) => {
    const L = state.L;
    let rec = p.image, index = 0, anchors = null;
    if (L.frames?.length) {
      if (p.frameStarted == null) return null;
      const blend = readyFrameBlend(p.frameImages, time - p.frameStarted, L.frameDuration ?? 0.12, L.frameMode || "loop", L.fadeLen ?? 0.12, api.reduce);
      if (!blend) return null;
      const item = blend.available[blend.alpha > 0.5 ? blend.to : blend.from];
      rec = item.frame;
      index = item.index;
      anchors = cachedFrameEdgeAnchors(p.shadowAnchorCache, rec, S.anchors);
    } else {
      if (!rec?.ready || rec.failed) return null;
      anchors = ensureImageEdgeAnchors(rec, S.anchors);
    }
    if (!anchors.length) return null;
    const [iw, ih] = frameSize(rec.img, p.sz);
    return { anchors, index, iw, ih };
  };

  const spawnShadowWisp = (state, p, S) => {
    const src = activeShadowSource(state, p, S);
    if (!src) return false;
    const a = src.anchors[Math.floor(rnd(0, src.anchors.length))];
    const speed = rnd(...(Array.isArray(S.sp) ? S.sp : [S.sp, S.sp])) * unit;
    const tangent = rnd(-S.jit, S.jit);
    const off = state.L.frameOffsets?.[src.index] || {};
    const offRot = ((off.rotation ?? off.rot) || 0) * Math.PI * 2;
    const offScale = off.scale ?? 1;
    const cos = Math.cos(offRot), sin = Math.sin(offRot);
    const dx = a.dx * cos - a.dy * sin, dy = a.dx * sin + a.dy * cos;
    const tx = -dy, ty = dx;
    const lx = a.x * src.iw * offScale, ly = a.y * src.ih * offScale;
    state.wisps.push({
      p,
      x: (off.x || 0) * rx + lx * cos - ly * sin,
      y: (off.y || 0) * ry + lx * sin + ly * cos,
      vx: dx * speed + tx * speed * tangent,
      vy: dy * speed + ty * speed * tangent,
      sz: rnd(...(Array.isArray(S.sz) ? S.sz : [S.sz, S.sz])) * unit,
      rot: rnd(0, Math.PI * 2),
      vr: rnd(-0.9, 0.9),
      c: Array.isArray(S.c) ? pick(S.c) : S.c,
      age: 0,
      life: rnd(...(Array.isArray(S.life) ? S.life : [S.life, S.life])),
    });
    return true;
  };

  const updateShadowWisps = (state, dt) => {
    if (!state.wantsShadow || Math.min(w, h) < 56) return;
    const S = state.shadow;
    if (!S) return;
    const sizeScale = Math.min(1, Math.min(w, h) / 160);
    const sizeMax = Math.ceil(S.max * sizeScale);
    const max = api.reduce ? Math.ceil(sizeMax * 0.35) : sizeMax;
    const motionDt = dt * (api.reduce ? 0.35 : 1);
    state.wisps = state.wisps.filter((w) => {
      w.age += motionDt;
      w.x += w.vx * motionDt;
      w.y += w.vy * motionDt;
      w.rot += w.vr * motionDt;
      return w.age < w.life;
    });
    if (state.wisps.length > max) state.wisps.splice(0, state.wisps.length - max);
    if (max > 0 && S.rate > 0) {
      state.wispAcc += dt * S.rate * sizeScale * (api.reduce ? 0.25 : 1);
      let toSpawn = Math.floor(state.wispAcc);
      state.wispAcc -= toSpawn;
      let spawned = false;
      for (const p of state.ps) {
        while (toSpawn > 0 && state.wisps.length < max && spawnShadowWisp(state, p, S)) {
          toSpawn -= 1;
          spawned = true;
        }
        if (!toSpawn || state.wisps.length >= max) break;
      }
      if (toSpawn > 0 && (!spawned || state.wisps.length >= max)) state.wispAcc = 0;
    }
    api.shadowWisps += state.wisps.length;
    api.shadowAnchorCache += state.ps.reduce((sum, p) => sum + (p.shadowAnchorCache?.size || 0), 0);
  };

  const drawShadowWisps = (ctx, state, p, S, edgeScale = 1) => {
    if (!S || !state.wisps.length) return;
    ctx.save();
    ctx.globalCompositeOperation = S.blend;
    for (const w of state.wisps) {
      if (w.p !== p) continue;
      const k = Math.sin(Math.PI * Math.min(1, w.age / Math.max(0.001, w.life)));
      const sprite = softSprite(w.c);
      ctx.save();
      ctx.globalAlpha *= S.a * k;
      ctx.translate(w.x * edgeScale, w.y * edgeScale);
      ctx.rotate(w.rot);
      ctx.drawImage(sprite, -w.sz * edgeScale, -w.sz * edgeScale, w.sz * 2 * edgeScale, w.sz * 2 * edgeScale);
      ctx.restore();
    }
    ctx.restore();
  };

  const drawP = (ctx, state, p, alpha, x, y) => {
    const L = state.L;
    const g = ctx;
    if (alpha <= 0.01) return;
    g.globalAlpha = Math.min(1, alpha * state.aMul);
    const s = p.sz;
    switch (L.shape) {
      case "img": {
        const isFrameAnim = L.frames && L.frames.length > 0;
        const rec = isFrameAnim ? null : p.image;
        const S = state.shadow;
        if (!isFrameAnim && (!rec?.ready || rec.failed)) break;
        const breathe = L.breathe ? 1 + 0.03 * Math.sin(time * (Math.PI * 2 / 4) + p.ph) : 1;
        const wob = L.wobble ? Math.sin(time * (Math.PI * 2 / (6.8 + (p.ph % 2.2))) + p.ph) * L.wobble : 0;
        const bob = L.bob ? Math.sin(time * (Math.PI * 2 / 2.5) + p.ph) * s * (L.bobAmp ?? 0.1) * (L.bobAmp != null && api.reduce ? 0.35 : 1) : 0;
        const ox = (L.x || 0) * rx;
        const oy = (L.y || 0) * ry;
        const mt = api.moment, mkL = state._mk;
        let mdx = mkL ? mkL.x : 0;
        let mdy = mkL ? mkL.y : 0;
        const mrot = mkL ? mkL.rot : 0;
        const msc = mkL ? mkL.sc : 1;
        const mshake = mkL ? mkL.shake : 1;
        const trem = (L.tremble || 0) * mshake * (api.reduce ? 0.3 : 1);
        const mDim = mkL ? mkL.dim : 1;
        const mo = L.mOrbit;
        let absX = null, absY = null;
        g.save(); if (mDim < 1) g.globalAlpha *= mDim;
        if (mo && mt != null) {
          const os = orbitPos(mo, mt, x + ox, y + bob + oy);
          const wantNear = L.mside === "near";
          api.orbitXY = api.orbitXY || {};
          let vis = 1;
          if (os.phase === "orbit" || os.phase === "dive") {
            vis = wantNear ? (os.z > -0.12 ? 1 : 0) : (os.z < 0.12 ? 1 : 0);
            absX = os.x; absY = os.y;
          } else if (os.phase === "gone" || wantNear) vis = 0;
          const ref = mo.reform;
          if (ref && mt >= ref[0] && !wantNear) vis *= Math.min(1, (mt - ref[0]) / Math.max(0.001, ref[1] - ref[0]));
          if (vis <= 0.01) { api.orbitXY[wantNear ? "near" : "far"] = null; g.restore(); break; }
          g.globalAlpha *= vis;
          // Motion trail: ghost copies at earlier orbit positions. The orbit
          // is a pure function of phase, so ghosts are recomputed — the trail
          // naturally lengthens as the spin accelerates.
          if (L.mTrail && absX != null && !isFrameAnim && rec?.ready && !rec.failed) {
            const T = L.mTrail, tn = T.n ?? 6;
            const timg = rec.img, tAspect = timg.naturalWidth / Math.max(1, timg.naturalHeight);
            const tiw = (tAspect >= 1 ? s : s * tAspect) * breathe, tih = (tAspect >= 1 ? s / tAspect : s) * breathe;
            for (let j = 1; j <= tn; j++) {
              const mtP = mt - j * (T.lag ?? 0.015);
              if (mtP < mo.from) break;
              const os2 = orbitPos(mo, mtP, x + ox, y + bob + oy);
              if (os2.phase !== "orbit" && os2.phase !== "dive") break;
              if (wantNear ? os2.z < -0.12 : os2.z > 0.12) continue;
              const ga = (T.a ?? 0.45) * (1 - j / (tn + 1)) * Math.min(1, (os2.u ?? 1) / 0.45);
              if (ga <= 0.02) continue;
              g.save(); g.globalAlpha *= ga;
              g.translate(os2.x, os2.y); g.rotate(p.rot + wob + mrot * Math.PI * 2); if (msc !== 1 || L.flip) g.scale(msc * (L.flip ? -1 : 1), msc);
              g.drawImage(timg, -tiw / 2, -tih / 2, tiw, tih); g.restore();
            }
          }
        }
        // wander z-split (idle, no moment): the far/near copies of a wandering
        // piece fade across the face-band crossing so it reads as passing
        // behind the figure/photo rather than popping
        if (L.wander && mt == null) {
          const wz = p.wz ?? 1;
          const wantNear = L.mside === "near";
          const wvis = Math.min(1, Math.max(0, wantNear ? 0.5 + wz * 1.4 : 0.5 - wz * 1.4));
          api.orbitXY = api.orbitXY || {};
          if (wvis <= 0.01) { api.orbitXY[wantNear ? "near" : "far"] = null; g.restore(); break; }
          // record the live wander position so the art's halo/rays follow it
          const wslot = wantNear ? "near" : "far", we = api.orbitXY[wslot] || (api.orbitXY[wslot] = {});
          we.x = x + ox; we.y = y + bob + oy;
          g.globalAlpha *= wvis;
        }
        if (absX != null) { mdx = absX - x - ox; mdy = absY - y - bob - oy; }
        if (mo) {
          api.orbitXY = api.orbitXY || {};
          const slot = L.mside === "near" ? "near" : "far", e = api.orbitXY[slot] || (api.orbitXY[slot] = {});
          e.x = x + ox + mdx; e.y = y + bob + oy + mdy;
        }
        g.translate(x + ox + mdx, y + bob + oy + mdy); g.rotate(p.rot + wob + mrot * Math.PI * 2 + trem * Math.PI * 2 * Math.sin(time * 41 + p.ph * 9.7));
        if (msc !== 1 || L.flip) g.scale(msc * (L.flip ? -1 : 1), msc);
        if (S) drawShadowWisps(g, state, p, S, breathe);
        if (isFrameAnim) {
          if (p.frameStarted == null && p.frameImages.every((frame) => frame.ready || frame.failed)) p.frameStarted = time;
          const blend = p.frameStarted == null ? null : readyFrameBlend(p.frameImages, time - p.frameStarted, L.frameDuration ?? 0.12, L.frameMode || "loop", L.fadeLen ?? 0.12, api.reduce);
          if (!blend) { g.restore(); break; }
          const drawFrame = ({ frame, index }, opacity) => {
            const img = frame.img;
            const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
            const iw0 = aspect >= 1 ? s : s * aspect, ih0 = aspect >= 1 ? s / aspect : s;
            const off = L.frameOffsets?.[index] || {};
            g.save(); g.globalAlpha *= opacity; g.translate((off.x || 0) * rx, (off.y || 0) * ry); g.rotate(((off.rotation ?? off.rot) || 0) * Math.PI * 2); g.scale(off.scale ?? 1, off.scale ?? 1);
            g.drawImage(img, -iw0 * breathe / 2, -ih0 * breathe / 2, iw0 * breathe, ih0 * breathe); g.restore();
          };
          drawFrame(blend.available[blend.from], 1 - blend.alpha);
          if (blend.alpha > 0 && blend.to !== blend.from) drawFrame(blend.available[blend.to], blend.alpha);
        } else {
          const img = rec.img, aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
          const iw0 = aspect >= 1 ? s : s * aspect, ih0 = aspect >= 1 ? s / aspect : s;
          const iw = iw0 * breathe, ih = ih0 * breathe;
          g.drawImage(img, -iw / 2, -ih / 2, iw, ih);
          if (L.glint) {
            const period = 3.4 + (p.ph % 2.4);
            const cycle = (time + p.ph * 1.7) % period;
            if (cycle < 0.28) {
              const k = cycle / 0.28;
              g.beginPath(); g.rect(-iw / 2, -ih / 2, iw, ih); g.clip();
              g.globalCompositeOperation = "lighter";
              g.globalAlpha = Math.min(1, alpha * state.aMul) * Math.sin(k * Math.PI);
              g.strokeStyle = "#ffffff"; g.lineWidth = Math.max(1.1, s * 0.07);
              g.beginPath(); g.moveTo(-iw / 2, -ih / 2 + ih * k); g.lineTo(iw / 2, -ih / 2 + ih * k + ih * 0.18); g.stroke();
              const hs = Math.max(4, s * 0.28);
              g.drawImage(glowSprite("#ffffff"), -hs, -ih / 2 + ih * k - hs, hs * 2, hs * 2);
            }
          }
        }
        g.restore(); break;
      }
      case "dot": { const sp = pSprite(p); g.drawImage(sp, x - s * 2, y - s * 2, s * 4, s * 4); break; }
      case "ember": { const sp = pSprite(p); g.drawImage(sp, x - s * 2.6, y - s * 2.6, s * 5.2, s * 5.2); break; }
      case "smoke": { const sp = pSprite(p, true); const k = Math.min(1.28, 1 + Math.min(p.age, 2.4) * 0.1); g.drawImage(sp, x - s * k, y - s * k, s * 2 * k, s * 2 * k); break; }
      case "spark": case "drop": {
        const orb = p.vy === undefined; const vx = orb ? -Math.sin(p.ang) * p.w * 20 : (p.vx || 0), vy = orb ? Math.cos(p.ang) * p.w * 20 : p.vy;
        const len = Math.hypot(vx, vy) || 1, l = L.shape === "drop" ? s * 9 : s * 5;
        g.strokeStyle = p.c; g.lineWidth = s; g.lineCap = "round";
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - (vx / len) * l, y - (vy / len) * l); g.stroke();
        if (L.shape === "spark") { const sp = pSprite(p); g.drawImage(sp, x - s * 2.5, y - s * 2.5, s * 5, s * 5); }
        break;
      }
      case "flake": {
        g.save(); g.translate(x, y); g.rotate(p.rot); g.strokeStyle = p.c; g.lineWidth = Math.max(0.6, s * 0.28); g.lineCap = "round";
        for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, s); g.moveTo(0, s * 0.55); g.lineTo(s * 0.28, s * 0.8); g.moveTo(0, s * 0.55); g.lineTo(-s * 0.28, s * 0.8); g.stroke(); }
        g.restore(); break;
      }
      case "shard": {
        const shard = shapePath(p, "s", s, (P, v) => { P.moveTo(0, -v * 1.4); P.lineTo(v * 0.55, 0); P.lineTo(0, v * 1.1); P.lineTo(-v * 0.55, 0); P.closePath(); return P; });
        const glint = shapePath(p, "g", s, (P, v) => { P.moveTo(0, -v * 1.4); P.lineTo(v * 0.2, -v * 0.2); P.lineTo(0, 0); P.closePath(); return P; });
        g.save(); g.translate(x, y); g.rotate(p.rot);
        g.fillStyle = p.c;
        g.strokeStyle = "rgba(18,10,4,0.5)"; g.lineWidth = Math.max(1.1, s * 0.28); g.stroke(shard); g.fill(shard);
        g.globalAlpha *= 0.6; g.fillStyle = "#ffffff"; g.fill(glint);
        g.restore(); break;
      }
      case "leaf": {
        const blade = shapePath(p, "b", s, (P, v) => { P.ellipse(0, 0, v * 1.3, v * 0.55, 0, 0, Math.PI * 2); return P; });
        const vein = shapePath(p, "v", s, (P, v) => { P.moveTo(-v * 1.2, 0); P.lineTo(v * 1.2, 0); return P; });
        g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.c;
        g.fill(blade);
        g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.6; g.stroke(vein);
        g.restore(); break;
      }
      case "square": { g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-s / 2, -s * 0.8, s, s * 1.6); g.restore(); break; }
      case "star": {
        const sp = pSprite(p); g.drawImage(sp, x - s * 3, y - s * 3, s * 6, s * 6);
        const cross = shapePath(p, "x", s, (P, v) => { P.moveTo(-v * 2.4, 0); P.lineTo(v * 2.4, 0); P.moveTo(0, -v * 2.4); P.lineTo(0, v * 2.4); return P; });
        g.save(); g.translate(x, y);
        g.strokeStyle = p.c; g.lineWidth = Math.max(0.5, s * 0.35); g.stroke(cross);
        g.restore();
        break;
      }
      case "emoji": { const px = Math.max(10, Math.min(w, h) * p.sz); g.font = `${px}px system-ui, "Apple Color Emoji", "Segoe UI Emoji"`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(p.e, x, y + (L.bob ? Math.sin(time * 2.4 + p.ph) * px * 0.12 : 0)); break; }
      case "eye": {
        const outline = shapePath(p, "o", s, (P, v) => { P.ellipse(0, 0, v * 1.85, v * 1.05, 0, 0, Math.PI * 2); return P; });
        const io = Math.sin(time * 3 + p.ph) * s * 0.2;
        g.save(); g.translate(x, y); g.rotate(p.rot + time * 0.4);
        g.fillStyle = "#F4FBFF"; g.fill(outline);
        g.strokeStyle = "#FFD447"; g.lineWidth = Math.max(0.7, s * 0.2); g.stroke(outline);
        g.fillStyle = "#1A6DFF"; g.beginPath(); g.arc(io, 0, s * 0.58, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#061018"; g.beginPath(); g.arc(io, 0, s * 0.24, 0, Math.PI * 2); g.fill();
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
        const facet = shapePath(p, "f", s, (P, v) => { P.moveTo(0, -v * 1.65); P.lineTo(v, -v * 0.15); P.lineTo(v * 0.55, v * 1.2); P.lineTo(-v * 0.55, v * 1.2); P.lineTo(-v, -v * 0.15); P.closePath(); return P; });
        const glint = shapePath(p, "g", s, (P, v) => { P.moveTo(0, -v * 1.65); P.lineTo(v * 0.38, -v * 0.2); P.lineTo(0, 0); P.closePath(); return P; });
        g.save(); g.translate(x, y); g.rotate(p.rot);
        g.fillStyle = p.c; g.fill(facet);
        g.fillStyle = "#ffffff"; g.globalAlpha *= 0.5; g.fill(glint);
        g.restore(); break;
      }
      case "petal": {
        const petal = shapePath(p, "p", s, (P, v) => { P.ellipse(0, 0, v * 0.42, v * 1.55, 0, 0, Math.PI * 2); return P; });
        g.save(); g.translate(x, y); g.rotate(p.rot + time * 0.4);
        g.fillStyle = p.c; g.fill(petal);
        g.restore(); break;
      }
      case "flame": {
        drawNewParticleShape(g, L.shape, p, x, y, time, api.reduce, L); break;
      }
      case "ash": case "feather": case "bonechip": case "coin": case "crescent": case "pulse": case "sandgrain": case "chainlink":
      case "comet": case "sparkle": case "orb": case "crystal": case "wisp": case "rune": case "zap": case "moth": case "lantern": case "sparkburst": {
        drawNewParticleShape(g, L.shape, p, x, y, time, api.reduce, L); break;
      }
      default: { // bubble ring
        g.strokeStyle = p.c; g.lineWidth = Math.max(0.7, s * 0.3); g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.stroke();
        g.fillStyle = "#ffffff"; g.globalAlpha *= 0.7; g.beginPath(); g.arc(x - s * 0.35, y - s * 0.35, s * 0.25, 0, Math.PI * 2); g.fill();
      }
    }
  };

  const makeBolt = () => {
    // Bolts live ~0.26s and re-stroke the same polyline 3x per frame at
    // different widths — the Path2D and stroke specs are built once here.
    const finish = (pts, c) => {
      if (fx.bolts.fit) {
        // keep every stroke vertex (plus the widest halo's half-width) inside
        // the canvas — small boards would otherwise clip strike ends flat
        const rMax = Math.min(w, h) / 2 - 2 * unit - 1.5;
        for (const pt of pts) {
          const dx = pt[0] - cx, dy = pt[1] - cy, r = Math.hypot(dx, dy);
          if (r > rMax) { const s = rMax / r; pt[0] = cx + dx * s; pt[1] = cy + dy * s; }
        }
      }
      const path = new Path2DImpl();
      path.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
      return {
        pts, t: 0, c, path,
        strokes: [[4 * unit, `${c}55`], [1.6 * unit, c], [0.7, "#ffffff"]],
        burst: {
          calm: [[6 * unit, "#FFD447"], [2.6 * unit, c], [0.9, "#FFFFFF"]],
          hot: [[11 * unit, "#FFD447"], [4.6 * unit, c], [1.5 * unit, "#FFFFFF"]],
        },
      };
    };
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
      // short-circuit a single-colour palette: pick() would consume an RNG
      // value and shift the whole stream even though the colour can't vary
      return finish(pts, Array.isArray(fx.bolts.c) && fx.bolts.c.length === 1 ? fx.bolts.c[0] : pick(fx.bolts.c));
    }
    const ang = rnd(0, Math.PI * 2), segs = 7, pts = [];
    let [x, y] = onRing(ang, 0.95);
    const [ex, ey] = onRing(ang + rnd(-0.5, 0.5), rnd(1.45, 1.7));
    for (let i = 0; i <= segs; i++) { const k = i / segs; pts.push([x + (ex - x) * k + (i && i < segs ? rnd(-6, 6) * unit : 0), y + (ey - y) * k + (i && i < segs ? rnd(-6, 6) * unit : 0)]); }
    return finish(pts, pick(fx.bolts.c));
  };

  // Named canvas points a burst can anchor to — without one it uses the ring
  // centre, which sits mid-torso in body mode (the Atlas-torso bug).
  const anchorOrigin = (name) => {
    if (name === "head" && anchors) return { x: anchors.face.x, y: anchors.face.y - anchors.face.eyeX * HEAD_FROM_EYE };
    if (name === "face" && anchors) return { x: anchors.face.x, y: anchors.face.y };
    if (name === "center") return anchors ? { x: anchors.torso.x, y: anchors.torso.y } : { x: cx, y: cy };
    if (name === "ground") return { x: cx, y: mode === "body" ? h * 0.965 : cy + ry * 0.97 };
    if (name?.startsWith?.("img:")) return api.imgXY?.[name.slice(4)] || { x: cx, y: cy };
    return { x: cx, y: cy };
  };
  // Parametric moment orbit for img layers (Atlas): lifts off the rest spot,
  // circles the orbit centre faster and faster (ease>1), then dives into the
  // centre. Pure function of the moment phase so trails and fling spawns can
  // evaluate past positions. z < 0 = far side (behind), z > 0 = near (front).
  // Callers alternate between two scratch objects so a result stays valid
  // until the next call — callers must copy anything they need to keep (the
  // mOrbit fling check holds fp while evaluating fp2, hence two slots).
  const _opA = {}, _opB = {};
  let _opFlip = false;
  const orbitPos = (o, mt, restX, restY) => {
    const out = (_opFlip = !_opFlip) ? _opA : _opB;
    const oc = anchorOrigin(o.center || "center");
    const rScale = api.reduce ? 0.55 : 1;
    const oRX = (o.rX ?? 1.15) * rx * rScale, oRY = (o.rY ?? 0.8) * ry * rScale;
    const hit = o.hit ?? 0.72;
    if (mt < o.from) { out.x = restX; out.y = restY; out.z = -1; out.u = 0; out.phase = "rest"; return out; }
    if (mt <= o.to) {
      const u = (mt - o.from) / Math.max(0.001, o.to - o.from);
      const ang = -Math.PI / 2 + (o.revs ?? 2.5) * Math.PI * 2 * Math.pow(u, o.ease ?? 1.7);
      const bl = Math.min(1, u / (o.blend ?? 0.1));
      const px = oc.x + Math.cos(ang) * oRX, py = oc.y + Math.sin(ang) * oRY;
      out.x = restX + (px - restX) * bl; out.y = restY + (py - restY) * bl; out.z = Math.sin(ang); out.u = u; out.ang = ang; out.phase = "orbit"; return out;
    }
    if (mt < hit) {
      const end = orbitPos(o, o.to, restX, restY);
      const e = Math.min(1, (mt - o.to) / Math.max(0.001, hit - o.to)) ** 2;
      out.x = end.x + (oc.x - end.x) * e; out.y = end.y + (oc.y - end.y) * e; out.z = 1; out.u = 1; out.phase = "dive"; return out;
    }
    const ref = o.reform;
    if (ref && mt >= ref[0]) { out.x = restX; out.y = restY; out.z = -1; out.u = 0; out.phase = "rest"; return out; }
    out.x = oc.x; out.y = oc.y; out.z = 1; out.phase = "gone"; return out;
  };
  // One-shot moment burst: n scales with canvas size, paths give the burst
  // shape (cone spray, radial dust, expanding shock ring). `dir` aims the cone
  // in turns (0=right, .25=down, -.25=up); `flat` flattens the ring to a
  // ground shockwave.
  // Optional trailing args let the fling paths aim/place a shower without
  // allocating a spread object per spawn step: absolute origin (absX/absY),
  // cone direction in turns (dir), and target canvas (over).
  const burstFire = (b, absX, absY, dir, over) => {
    const n = Math.max(1, Math.round((b.n ?? 8) * mScale * (b.nScale ?? 1) * ((over ?? b.over) ? 1 : scale)));
    const ax = absX ?? b.absX, ay = absY ?? b.absY;
    let ox, oy;
    if (ax != null) { ox = ax + (b.x ?? 0) * rx; oy = ay + (b.y ?? 0) * ry; }
    else { const o = anchorOrigin(b.anchor); ox = o.x + (b.x ?? 0) * rx; oy = o.y + (b.y ?? 0) * ry; }
    api.lastBurst = { x: ox, y: oy, anchor: b.anchor || null };
    for (let i = 0; i < n; i++) {
      const p = {
        b, over: over ?? !!b.over, x: ox, y: oy, age: 0, i,
        life: b.life ? rnd(...b.life) : 0.8,
        sz: (b.sz ? rnd(...b.sz) : 1.4) * unit,
        c: Array.isArray(b.c) ? pick(b.c) : (b.c || c1), rot: rnd(0, Math.PI * 2), vr: rnd(-2, 2),
      };
      if (b.path === "beams") {
        p.beam = true;
        p.ang = (i / n) * Math.PI * 2 + rnd(-0.14, 0.14);
        const edge = Math.min(ox, oy, w - ox, h - oy);
        p.len = rnd(...(b.len || [0.6, 0.9])) * Math.max(8, edge * 0.92);
        p.lw = (b.lw ? rnd(...b.lw) : 3) * unit;
      } else if (b.path === "shockring") {
        p.ring = true; p.aspect = b.aspect ?? (b.flat ? 0.16 : ry / rx); p.r = (b.r0 ?? 0.4) * Math.min(rx, ry); p.rv = (b.v ?? 2) * Math.min(rx, ry);
      } else {
        const cone = absX != null || dir != null || b.path === "shower" || b.dir != null;
        const bd = dir ?? b.dir;
        const base = bd != null ? bd * Math.PI * 2 : -Math.PI / 2;
        const ang = cone ? base + rnd(-(b.spread ?? 1), b.spread ?? 1) : rnd(0, Math.PI * 2);
        const v = (b.sp ? rnd(...b.sp) : 70) * unit;
        p.vx = Math.cos(ang) * v; p.vy = Math.sin(ang) * v;
        p.grav = (b.grav ?? 1.8) * 150 * unit;
      }
      momentParts.push(p);
    }
  };
  const paintMoment = (ctx, wantOver) => {
    // One save/composite for the whole pass instead of per particle — every
    // branch sets absolute state anyway, so the draw calls are identical.
    let open = false;
    for (const p of momentParts) {
      if (!!p.over !== wantOver) continue;
      const k = p.age / p.life, a = (p.b.a ?? 0.9) * (1 - k);
      if (a <= 0.01) continue;
      if (!open) { ctx.save(); ctx.globalCompositeOperation = "lighter"; open = true; }
      if (p.beam) {
        const tx = p.x + Math.cos(p.ang) * p.len, ty = p.y + Math.sin(p.ang) * p.len;
        const grd = ctx.createLinearGradient(p.x, p.y, tx, ty);
        grd.addColorStop(0, p.c); grd.addColorStop(0.5, p.c); grd.addColorStop(1, rgba(p.c, 0));
        ctx.globalAlpha = Math.max(0, a);
        ctx.strokeStyle = grd; ctx.lineWidth = Math.max(0.7, p.lw * (1 - k * 0.45)); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tx, ty); ctx.stroke();
      } else if (p.ring) {
        ctx.globalAlpha = Math.max(0, a);
        ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(0.7, (p.b.lw ?? 2) * unit * (1 - k * 0.5));
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * p.aspect, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.globalAlpha = Math.max(0, Math.min(1, a));
        const shape = p.b.shape || "spark";
        if (shape === "spark" || shape === "dot" || shape === "ember") {
          const gs = pSprite(p), r = p.sz * (shape === "ember" ? 2.2 : shape === "dot" ? 1.7 : 1.3);
          ctx.drawImage(gs, p.x - r * 2, p.y - r * 2, r * 4, r * 4);
          if (shape === "spark") {
            ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(0.5, p.sz * 0.4); ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - (p.vx || 0) * 0.085, p.y - (p.vy || 0) * 0.085); ctx.stroke();
          }
        } else {
          drawNewParticleShape(ctx, shape, p, p.x, p.y, time, api.reduce);
        }
      }
    }
    if (open) ctx.restore();
  };

  const paul = fx.layers?.find((L) => L.placed === "shoulders");
  const paulShift = paul ? { x: (paul.x || 0) * rx, y: (paul.y || 0) * ry } : null;
  const frame = (dt) => {
    time += dt * spd;
    clock += dt;
    api.shadowWisps = 0;
    api.shadowAnchorCache = 0;
    strike = Math.max(0, strike - dt / 0.25);
    api.moment = null;
    if (fx.moment) {
      if (momentT == null) {
        momentAt -= dt;
        if (momentAt <= 0) { momentT = 0; momentFired = new Set(); layers.forEach((st) => { st.flingAt = null; }); }
      } else {
        momentT += dt;
        const mt = momentT / mdur;
        if (mt >= 1) { momentT = null; momentAt = rnd(...(fx.moment.every || [6, 10])); }
        else {
          api.moment = mt;
          const fl = fx.moment.flash;
          if (fl && !momentFired.has("f") && mt >= fl.at) {
            momentFired.add("f");
            strike = 1;
            const gate = noteStrikeFlash(flashState, { now: clock, reduce: !!api.reduce, enabled: true, burstStart: true });
            flashState = { last: gate.last, burstFlashed: gate.burstFlashed };
            if (gate.fired) {
              flashSpec = fx.moment.flash; flashLeft = fl.flashLife || 0.09;
              api.flashes += 1; api.flashTimes.push(clock);
              if (api.flashTimes.length > 40) api.flashTimes.shift();
            }
          }
          const mbs = fx.moment.bursts || [];
          for (let i = 0; i < mbs.length; i++) {
            if (!momentFired.has(i) && mt >= mbs[i].at) { momentFired.add(i); burstFire(mbs[i]); }
          }
          // Orbit flings: dust/pebbles shed tangentially while the sphere spins
          // up. Spawned at the sphere's position at each scheduled phase.
          for (const st of layers) {
            const o = st.L.mOrbit, fl2 = o?.flings;
            if (o && fl2 && mt >= (fl2.from ?? o.from) && mt <= o.to) {
              if (st.flingAt == null) st.flingAt = fl2.from ?? o.from;
              while (st.flingAt <= mt) {
                const fp = orbitPos(o, st.flingAt, 0, 0);
                if (fp.phase === "orbit" && fp.ang != null) {
                  const fp2 = orbitPos(o, Math.min(o.to, st.flingAt + 0.002), 0, 0);
                  const tdir = Math.atan2(fp2.y - fp.y, fp2.x - fp.x) / (Math.PI * 2);
                  burstFire(fl2, fp.x, fp.y, tdir, fp.z > 0);
                }
                st.flingAt += fl2.every ?? 0.05;
              }
            }
            // mFlings: trailing wisps shed from a regular orbit layer's live
            // particle positions while the moment's swirl window is open
            // (Ossuary's green trails on the flying bones).
            const fl3 = st.L.mFlings;
            if (fl3 && mt >= (fl3.from ?? 0) && mt <= (fl3.to ?? 1)) {
              if (st.mflAt == null) st.mflAt = fl3.from ?? 0;
              while (st.mflAt <= mt) {
                const rMul = st.L.mR ? (keyAt(st.L.mR, st.mflAt) ?? 1) : 1;
                for (const p of st.ps) {
                  const pr = p.r * rMul;
                  burstFire(fl3, cx + Math.cos(p.ang) * rx * pr, cy + Math.sin(p.ang) * ry * pr);
                }
                st.mflAt += fl3.every ?? 0.08;
              }
            } else st.mflAt = null;
          }
        }
      }
    }
    let wmp = 0;
    for (let i = 0; i < momentParts.length; i++) {
      const p = momentParts[i];
      p.age += dt;
      if (p.age < p.life) {
        if (p.ring) p.r += p.rv * dt;
        else { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; p.vy += (p.grav || 0) * dt; p.rot += (p.vr || 0) * dt; }
        momentParts[wmp++] = p;
      }
    }
    momentParts.length = wmp;
    api.momentParts = momentParts.length;
    // Recurring flare (Fallen Light's halo flicker): one gated flash per event,
    // same noteStrikeFlash gate as moment/bolt flashes — <=3/s, none under
    // reduced motion.
    if (fx.flare) {
      flareAt -= dt;
      if (flareAt <= 0) {
        flareAt = rnd(...fx.flare.every);
        const gate = noteStrikeFlash(flashState, { now: clock, reduce: !!api.reduce, enabled: true, burstStart: true });
        flashState = { last: gate.last, burstFlashed: gate.burstFlashed };
        if (gate.fired) {
          flashSpec = fx.flare; flashLeft = fx.flare.flashLife || 0.08;
          api.flashes += 1; api.flashTimes.push(clock);
          if (api.flashTimes.length > 40) api.flashTimes.shift();
          // flare.bolt: spawn a bolt through the shared fx.bolts draw path —
          // strikes only ever appear when the gate fires (<=3/s, none reduced).
          if (fx.flare.bolt && fx.bolts) bolt = makeBolt();
        }
      }
    }
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
      g.fillStyle = grd; g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.translate(-cx, -cy); g.fill(darkGlowPath); g.restore();
    } else {
      g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
      const grd = g.createRadialGradient(0, 0, rx * 0.45, 0, 0, rx * gR);
      grd.addColorStop(0, rgba(c1, 0)); grd.addColorStop(0.32, rgba(c1, fx.glow * breathe * 0.55)); grd.addColorStop(0.62, rgba(c2, fx.glow * 0.42)); grd.addColorStop(1, rgba(c2, 0));
      g.fillStyle = grd; g.fill(glowPath); g.restore();
    }
    if (fx.corona) {
      const pulse = 0.55 + 0.45 * Math.sin(time * 2.3);
      // gradient must be centred at the draw origin — the fill runs under
      // translate(cx, cy), so cx/cy here would double-offset it off-canvas
      const grd = g.createRadialGradient(0, 0, rx * 0.12, 0, 0, rx * 1.38);
      grd.addColorStop(0, "rgba(4,1,8,.95)"); grd.addColorStop(0.2, "rgba(8,2,12,.8)");
      grd.addColorStop(0.36, rgba(fx.corona.inner || c2, 0.62 * pulse)); grd.addColorStop(0.72, rgba(fx.corona.outer || c1, 0.28)); grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd; g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.beginPath(); g.arc(0, 0, rx * 1.38, 0, Math.PI * 2); g.fill(); g.restore();
    }
    const aa = { g, over: overG, fx, cc, time, clock, cx, cy, rx, ry, w, h, unit, strike, sweep: fx.sweep, pass: "main", mode, anchors, anchor: anchorOrigin, moment: null, orbitXY: api.orbitXY, flash: null, reduce: !!api.reduce, paulShift };
    const aaMoment = { t: 0, spec: fx.moment }, aaFlash = { k: 0, spec: null };
    const artArgs = (pass) => {
      aa.time = time; aa.clock = clock; aa.strike = strike; aa.pass = pass; aa.orbitXY = api.orbitXY;
      aa.moment = api.moment != null ? (aaMoment.t = api.moment, aaMoment) : null;
      aa.flash = flashLeft > 0 && flashSpec ? (aaFlash.k = flashLeft / (flashSpec.flashLife || 0.09), aaFlash.spec = flashSpec, aaFlash) : null;
      return aa;
    };
    const artState = AURA_ART[fx.art]?.(artArgs("main")) || null;
    if (fx.rings) {
      g.save(); g.globalCompositeOperation = "source-over";
      g.translate(cx, cy); g.scale(1, ry / rx);
      for (const R of fx.rings) {
        // breath: slow radius in/out on a breathS-second cycle — size motion,
        // not a brightness swing; holds still under reduced motion
        const rr = rx * (R.r || 1.08) * (R.breath && !api.reduce ? 1 + R.breath * Math.sin((time * Math.PI * 2) / (R.breathS || 5)) : 1);
        const rot = time * (R.spin || 0.3);
        const lw = Math.max(w < 80 ? (R.w >= 3 ? 3.6 : 1.85) : 1.2, (R.w || 1.3) * unit);
        const a = Math.min(1, (R.a || 0.35) * breathe);
        const ringColor = ringColorAt(R, time, api.reduce, c1);
        if (R.dash) g.setLineDash([5 * unit, 7 * unit]);
        if (R.ink) {
          g.strokeStyle = "rgba(18,10,4,0.62)";
          g.lineWidth = lw + Math.max(1.4, unit * 1.15);
          g.beginPath(); g.ellipse(0, 0, rr, rr, rot, 0, Math.PI * 2); g.stroke();
        }
        g.strokeStyle = rgba(ringColor, a);
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
            g.strokeStyle = rgba(ringColor, a);
            g.lineWidth = Math.max(0.85, unit * 0.85);
            g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
          }
        }
      }
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
      if (!S.dim) {
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = rgba("#FFFFFF", 0.7); g.lineWidth = Math.max(1, sw * 0.35);
        g.beginPath(); g.arc(0, 0, rr, ang - span * 0.28, ang); g.stroke();
        const hx = Math.cos(ang) * rr, hy = Math.sin(ang) * rr;
        const sp = glowSprite(S.c || "#FFF6C9");
        const hs = Math.max(6, sw * 1.8);
        g.globalAlpha = 0.85; g.drawImage(sp, hx - hs, hy - hs, hs * 2, hs * 2);
      }
      g.restore();
    }
    g.globalCompositeOperation = "source-over";
    if (fx.rays) {
      const R = fx.rays; g.save(); g.translate(cx, cy);
      for (let i = 0; i < R.n; i++) {
        const a0 = (i / R.n) * Math.PI * 2 + time * R.spin;
        if (R.fan && Math.sin(a0) > 0.15) continue;
        // fit: opt-in tight clamp — the default 1.15 overshoot lets ray tips
        // graze the border on small canvases; 0.94 keeps them inside.
        const len = Math.min(Math.max(rx, ry) * R.len, Math.min(cx, cy, w - cx, h - cy) * (R.fit ? 0.94 : 1.15)) * (0.8 + 0.2 * Math.sin(time * 1.3 + i));
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
      for (const state of layers) {
        const { L, ps, spawn } = state;
        if (!!L.over !== wantOver) continue;
        const layerDt = artState?.freeze && L.shape !== "img" ? 0 : dt;
        if (state.shadow) updateShadowWisps(state, layerDt);
        ctx.globalCompositeOperation = L.blend || (L.shape === "emoji" || L.shape === "img" ? "source-over" : "lighter");
        // moment keyframes are constant for the whole layer this frame —
        // evaluate once rather than per particle
        const mtL = api.moment, mAmp = api.reduce ? 0.45 : 1;
        state._swirl = mtL != null && L.mSpin ? (keyAt(L.mSpin, mtL) || 0) : 0;
        state._rMul = mtL != null && L.mR ? (keyAt(L.mR, mtL) ?? 1) : 1;
        const mk = mtL != null && L.shape === "img" ? state._mk || (state._mk = {}) : null;
        state._mk = mk;
        // imgXY slots must stay lazily created — anchor() falls back to the
        // canvas centre only while no img particle has ever written one, so
        // an eagerly-created empty {} would poison anchor reads (NaN radius).
        let ixy = L.shape === "img" ? (api.imgXY ||= {})[L.src] : undefined;
        if (mk) {
          mk.x = (keyAt(L.mX, mtL) || 0) * mAmp * rx;
          mk.y = (keyAt(L.mY, mtL) || 0) * mAmp * ry;
          mk.rot = (keyAt(L.mRot, mtL) || 0) * mAmp;
          mk.sc = 1 + ((keyAt(L.mScale, mtL) ?? 1) - 1) * mAmp;
          mk.shake = 1 + ((keyAt(L.mShake, mtL) ?? 1) - 1) * mAmp;
          mk.dim = keyAt(L.mDim, mtL) ?? 1;
        }
        if (L.eject) {
          state.ejectAt = (state.ejectAt ?? rnd(...(L.eject.every || [4, 8]))) - layerDt;
          if (state.ejectAt <= 0) {
            state.ejectAt = rnd(...(L.eject.every || [4, 8]));
            const cand = ps.filter((pp) => !pp.ej);
            if (cand.length) {
              const pc = cand[Math.floor(Math.random() * cand.length)];
              pc.ej = { t: 0, life: L.eject.life ?? 0.8, sp: rnd(...(L.eject.sp || [0.3, 0.45])), spin: rnd(-0.5, 0.5) };
            }
          }
        }
        for (const p of ps) {
          if (L.shape === "img" && p.image?.failed) continue;
          p.age += layerDt; p.rot += p.vr * layerDt;
          let x, y, alpha = 1;
          if (L.k === "rise" || L.k === "bubble") {
            p.y += p.vy * layerDt; x = p.x + Math.sin(time * 2 + p.ph) * (L.sway || 5) * unit * (L.k === "bubble" ? 0.6 : 1); y = p.y;
            const k = p.age / p.life; alpha = Math.min(1, k * 5) * (1 - k);
            if (L.flick) alpha *= 0.6 + 0.4 * Math.sin(time * 18 + p.ph);
            if (p.age >= p.life) spawn(p);
          } else if (L.k === "fall") {
            p.y += p.vy * layerDt; p.x += p.vx * layerDt + Math.sin(time + p.ph) * 0.2; x = p.x; y = p.y;
            // tailPad: opt-in — drop streaks draw s·9px BEHIND the particle,
            // so the fade-in must wait until the tail is inside the canvas
            const edge = Math.min(1, (p.y - (cy - ry * 1.6 + (L.tailPad || 0) * unit)) / 20, (cy + ry * 1.5 - p.y) / 20);
            alpha = Math.max(0, edge);
            // xWrap/xFade: opt-in horizontal containment for narrow canvases
            // (body mode) — wrap drifted particles to the far side and fade
            // near left/right borders; absent fields keep old behavior.
            // The fade must reach zero at least one sprite-extent inside the
            // border, so alpha is 0 out to the margin and ramps over a second
            // margin's width — fading to 0 exactly AT the border still lets
            // the sprite's outer pixels paint the edge.
            if (L.xWrap && p.x > cx + rx * 1.45) p.x = cx - rx * 1.45;
            if (L.xFade) { const fm = L.xFade * unit; alpha *= Math.max(0, Math.min(1, (x - fm) / fm, (w - x - fm) / fm)); }
            if (p.y > cy + ry * 1.5) spawn(p);
          } else if (L.k === "inward") {
            const k = p.age / p.life; const r = p.r0 - (p.r0 - 1.05) * k; p.ang += p.spd * layerDt;
            x = cx + Math.cos(p.ang) * rx * r; y = cy + Math.sin(p.ang) * ry * r; alpha = Math.min(1, k * 4) * (1 - k * k);
            if (p.age >= p.life) spawn(p);
          } else {
            // mSpin/mR: moment-driven swirl — orbit speed multiplier and orbit
            // radius multiplier keyed to the moment phase (Ossuary's spiral).
            const swirl = state._swirl, rMul = state._rMul;
            p.ang += p.w * layerDt * (1 + swirl); const wob = L.wave ? Math.sin(time * 3 + p.ph) * L.wave : 0;
            if (p.ej) {
              p.ej.t += layerDt;
              if (p.ej.t >= p.ej.life) p.ej = null;
            }
            if (p.ej) {
              const k = p.ej.t / p.ej.life;
              const er = p.r + wob + p.ej.sp * p.ej.t, ea = p.ang + p.ej.spin * p.ej.t;
              x = cx + Math.cos(ea) * rx * er; y = cy + Math.sin(ea) * ry * er;
              alpha *= (1 - k) * (1 - k);
            } else {
              const or2 = p.r * rMul + wob;
              x = cx + Math.cos(p.ang) * rx * or2; y = cy + Math.sin(p.ang) * ry * or2;
            }
            if (L.placed === "head") {
              if (mode !== "body" && L.rim) {
                // rim: circle mode wears the piece on the photo frame's top
                // edge, scaled to the avatar circle — not over the face
                if (L.rimSz) p.sz = Math.min(rx, ry) * L.rimSz;
                x = cx + (L.rimX || 0) * rx;
                y = cy - ry + p.sz * (L.rimSink ?? 0.12);
              } else if (!anchors) { alpha = 0; }
              else {
                // headSz: drawn size in head half-widths, not ring radii, so a
                // worn piece stays proportional across figures and photos
                if (L.headSz) p.sz = anchors.face.eyeX * HEAD_FROM_EYE * L.headSz;
                x = anchors.face.x;
                y = anchors.face.y - anchors.face.eyeX * HEAD_FROM_EYE - p.sz * (L.hover ?? 0.14);
              }
            }
            if (L.wander && anchors) {
              // wander: the piece roams a zigzag around the figure/photo —
              // slow horizontal sweep + triangular vertical bob. p.wz is the
              // continuous front/back depth: negative while crossing the
              // figure/face centre (drawn behind), positive elsewhere.
              const W = L.wander;
              const hh = anchors.face.eyeX * HEAD_FROM_EYE;
              const zx = anchors.face.x;
              // shrink the roam box so the piece (and its halo) stays inside
              // the canvas at every size — matters most at board-32. The pad
              // covers the drawn half-diagonal (≈0.79·sz worst-case under
              // wobble+breathe rotation) plus a fixed floor.
              const pad = p.sz * 0.85 + 2;
              const xAmp = Math.min(rx * (W.xR ?? 1.05), Math.max(0, Math.min(zx, w - zx) - pad));
              const yTop = Math.max(pad, cy - ry * (W.top ?? 1.05));
              const yBot = Math.min(h - pad, cy + ry * (W.bot ?? 0.6));
              x = zx + Math.sin(time * (W.sx ?? 0.55)) * xAmp;
              const tri = Math.asin(Math.sin(time * (W.sy ?? 0.85))) / (Math.PI / 2);
              y = (yTop + yBot) / 2 + tri * Math.max(0, yBot - yTop) / 2;
              const zHalf = hh * (W.zX ?? 1.1);
              p.wz = Math.max(-1, Math.min(1, (Math.abs(x - zx) - zHalf) / (zHalf * 0.35)));
            }
            if (L.shape !== "emoji" && L.shape !== "smoke" && L.shape !== "img") alpha = 0.75 + 0.25 * Math.sin(time * 3 + p.ph);
            if (mode === "body" && L.shape !== "emoji" && L.shape !== "img") alpha *= Math.sin(p.ang) < 0 ? 0.55 : 1;
            if (L.frontOnly && Math.sin(p.ang) < 0.15) alpha = 0;
          }
          if (L.tw) alpha *= 0.55 + 0.45 * Math.sin(time * 5 + p.ph * 3);
          if (L.shape === "img") { if (!ixy) ixy = api.imgXY[L.src] = {}; ixy.x = x; ixy.y = y; ixy.z = p.wz; }
          drawP(ctx, state, p, alpha, x, y);
        }
      }
    };
    // Explosion shake: decays over moment.shake.dur, skipped entirely when no
    // moment spec exists so non-moment auras keep identical pixels.
    const shkSpec = fx.moment?.shake;
    const shkU = shkSpec && api.moment != null ? (api.moment - shkSpec.at) / Math.max(0.01, shkSpec.dur ?? 0.4) : 1;
    const shakeAmp = shkSpec && shkU >= 0 && shkU < 1 ? (shkSpec.amp ?? 0.04) * Math.min(rx, ry) * (1 - shkU) * (1 - shkU) * (api.reduce ? 0.3 : 1) : 0;
    if (shakeAmp > 0.01) { g.save(); g.translate(rnd(-shakeAmp, shakeAmp), rnd(-shakeAmp, shakeAmp)); }
    paintLayers(g, false);
    paintMoment(g, false);
    if (shakeAmp > 0.01) g.restore();
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
        if (fx.bolts.strike !== 0) strike = 1;
        burstLeft -= 1;
        const gate = noteStrikeFlash(flashState, { now: clock, reduce: !!api.reduce, enabled: !!fx.bolts.flash, burstStart: starting });
        flashState = { last: gate.last, burstFlashed: gate.burstFlashed };
        if (gate.fired) {
          flashSpec = fx.bolts;
          flashLeft = fx.bolts.flashLife || 0.09;
          api.flashes += 1;
          api.flashTimes.push(clock);
          if (api.flashTimes.length > 40) api.flashTimes.shift();
        }
        boltT = burstLeft > 0 ? burstGap : rnd(...(calm ? [5.5, 8] : (fx.bolts.gap || [3, 5])));
      }
      const calmDraw = !!(api.reduce && fx.bolts.calm);
      let wb = 0;
      for (let i = 0; i < liveBolts.length; i++) {
        const b = liveBolts[i];
        b.t += dt; const life = 0.26, k = b.t / life;
        if (k >= 1) continue;
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = calmDraw ? (1 - k) * 0.8 : (1 - k) * (0.82 + 0.18 * Math.sin(b.t * 46));
        g.lineJoin = "round"; g.lineCap = "round";
        const strokes = calmDraw ? b.burst.calm : b.burst.hot;
        for (const [lw, col] of strokes) {
          g.strokeStyle = col; g.lineWidth = lw; g.stroke(b.path);
        }
        liveBolts[wb++] = b;
      }
      liveBolts.length = wb;
    } else if (fx.bolts) {
      boltT -= dt;
      if (boltT <= 0) {
        const nb = makeBolt();
        // calmEvery: reduced motion strikes far less often, same bolt look
        const calm = !!(api.reduce && fx.bolts.calmEvery);
        boltT = rnd(...(calm ? fx.bolts.calmEvery : fx.bolts.every));
        api.boltsFired += 1;
        if (fx.bolts.overlap) liveBolts.push(nb); else bolt = nb;
        // bolts strike on their own cadence; only an occasional bolt gets the
        // bright wash — flashEvery sets the attempt spacing (~1 per 2s on its
        // own), flashP picks a random share of bolts. Either way the wash is
        // still through noteStrikeFlash (<=3/s page-wide, none under reduce).
        const wantsFlash = fx.bolts.flashEvery != null ? clock >= flTryAt : fx.bolts.flashP != null && Math.random() < fx.bolts.flashP;
        if (wantsFlash) {
          if (fx.bolts.flashEvery != null) flTryAt = clock + fx.bolts.flashEvery * (0.7 + Math.random() * 0.6);
          const gate = noteStrikeFlash(flashState, { now: clock, reduce: !!api.reduce, enabled: true, burstStart: true });
          flashState = { last: gate.last, burstFlashed: gate.burstFlashed };
          if (gate.fired) {
            flashSpec = fx.flare || fx.bolts;
            flashLeft = flashSpec.flashLife || 0.09;
            api.flashes += 1; api.flashTimes.push(clock);
            if (api.flashTimes.length > 40) api.flashTimes.shift();
            strike = 1;
          }
        }
      }
      const strokeBolt = (b) => {
        b.t += dt; const life = 0.28, k = b.t / life;
        if (k >= 1) return false;
        g.globalCompositeOperation = "lighter"; g.globalAlpha = (1 - k) * (0.6 + 0.4 * Math.sin(b.t * 90));
        if (fx.bolts.flash && k < 0.3) {
          const flash = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry) * 1.25);
          flash.addColorStop(0, `rgba(200,220,255,${0.14 * (1 - k / 0.3)})`); flash.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = flash; g.beginPath(); g.arc(cx, cy, Math.max(rx, ry) * 1.25, 0, Math.PI * 2); g.fill();
        }
        g.lineJoin = "round";
        for (const [lw, col] of b.strokes) {
          g.strokeStyle = col; g.lineWidth = lw; g.stroke(b.path);
        }
        return true;
      };
      if (bolt && !strokeBolt(bolt)) bolt = null;
      if (fx.bolts.overlap) {
        let wb = 0;
        for (let i = 0; i < liveBolts.length; i++) if (strokeBolt(liveBolts[i])) liveBolts[wb++] = liveBolts[i];
        liveBolts.length = wb;
      }
    }
    const paintWash = (ctx) => {
      if (!(flashLeft > 0) || !flashSpec) return;
      const life = flashSpec.flashLife || 0.09;
      const k = Math.max(0, flashLeft / life);
      // flashPeak is the spec's strength. Drawn softer so a light theme
      // brightens instead of clipping to white, and only at the ring centre.
      const a = (flashSpec.flashPeak ?? 0.35) * 0.5 * k;
      if (a <= 0.01) return;
      const edge = Math.min(cx, cy, w - cx, h - cy);
      const fo = anchorOrigin(flashSpec.anchor);
      const wx = fo.x + (flashSpec.x || 0) * rx, wy = fo.y + (flashSpec.y || 0) * ry;
      // img:-anchored flashes (halo snap, crown flare) sit near the canvas
      // edge — size the wash from the anchor's own edge distance so the glow
      // fades out instead of clipping flat. Other anchors keep the original
      // centre-based radius (Bonewright/Atlas/Forge pixels unchanged).
      const imgAnchored = flashSpec.anchor?.startsWith?.("img:");
      const outer = Math.max(8, (imgAnchored ? Math.min(wx, wy, w - wx, h - wy) : edge) * 0.96);
      const inner = Math.min(rx, ry) * 0.15;
      // flashC defaults to Bonewright's exact warm-white pair.
      const [w0, w1] = flashSpec.flashC || ["#FFF8DC", "#FFF4D2"];
      const wc0 = hexRgb(w0) || [255, 248, 220], wc1 = hexRgb(w1) || [255, 244, 210];
      ctx.save();
      // Adds light onto pixels already on this canvas. Empty pixels only pick
      // up the gradient's own alpha, which is 0 before the canvas edge.
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 1;
      const wash = ctx.createRadialGradient(wx, wy, inner, wx, wy, outer);
      wash.addColorStop(0, `rgba(${wc0[0]},${wc0[1]},${wc0[2]},${a.toFixed(3)})`);
      wash.addColorStop(0.42, `rgba(${wc1[0]},${wc1[1]},${wc1[2]},${(a * 0.38).toFixed(3)})`);
      wash.addColorStop(1, `rgba(${wc0[0]},${wc0[1]},${wc0[2]},0)`);
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.arc(wx, wy, outer, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    paintWash(g);
    if (overG) {
      if (shakeAmp > 0.01) { overG.save(); overG.translate(rnd(-shakeAmp, shakeAmp), rnd(-shakeAmp, shakeAmp)); }
      paintLayers(overG, true);
      paintMoment(overG, true);
      if (shakeAmp > 0.01) overG.restore();
      paintWash(overG);
      if (fx.overArt) AURA_ART[fx.overArt]?.(artArgs("over"));
    }
    if (flashLeft > 0) { flashLeft -= dt; if (flashLeft <= 0) flashSpec = null; }
    api.strike = strike;
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  };
  api.frame = frame;
  try {
    if (import.meta.env && import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("auraProbe") === "1") { canvas._aura = api; window.__auraLive = auraLiveInstances; }
  } catch (e) { /* probe is dev-only */ }
  return api;
}

// Live aura instances by aura id — lets dev tools fire a moment on every
// mounted canvas of an aura at once (gallery stage + profile preview).
const auraLiveInstances = new Map();
// Test/dev access to the registry.
export const _auraLiveInstances = auraLiveInstances;
export function trackAuraInstance(aura, inst) {
  let live = auraLiveInstances.get(aura);
  if (!live) auraLiveInstances.set(aura, (live = new Set()));
  live.add(inst);
  return () => { live.delete(inst); if (!live.size) auraLiveInstances.delete(aura); };
}
export function fireAuraMoment(aura) {
  for (const inst of auraLiveInstances.get(resolveAuraId(aura)) || []) { try { inst.forceMoment?.(); } catch (e) { /* dev-only */ } }
}

export function AuraCanvas({ aura, w, h, mode = "circle", ringR, style, children, overSlot, figure, onInstance }) {
  aura = resolveAuraId(aura); // leaderboard cards from older builds still carry the old id
  const ref = useRef(null);
  const overRef = useRef(null);
  const needs = auraNeedsOver(aura);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !AURA_FX[aura] || typeof window === "undefined") return;
    let inst = null;
    try { inst = makeAura(cv, { aura, w, h, mode, ringR: ringR || Math.min(w, h) / 3.2, overCanvas: needs ? overRef.current : null, figure }); } catch (e) { return; }
    if (!inst) return;
    try { onInstance?.(inst); } catch (e) { /* consumer hook only */ }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    inst.reduce = !!reduce;
    try { inst.frame(1 / 30); } catch (e) { /* first paint */ }
    if (reduce && aura !== "bonewright") { for (let i = 0; i < 60; i++) inst.frame(1 / 30); return; }
    let io = null;
    if (typeof IntersectionObserver !== "undefined") { io = new IntersectionObserver((es) => { inst.visible = es[0]?.isIntersecting ?? true; }, { rootMargin: "80px" }); io.observe(cv); }
    const untrack = trackAuraInstance(aura, inst);
    AuraLoop.add(inst);
    return () => { AuraLoop.remove(inst); untrack(); io?.disconnect(); try { onInstance?.(null); } catch (e) { /* consumer hook only */ } };
  }, [aura, w, h, mode, ringR, needs, overSlot, figure]);
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
  aura = resolveAuraId(aura);
  if (!AURA_FX[aura]) return null;
  const k = aura === "ascended" ? 1.5 : 1.28;
  const w = Math.round(size * k);
  return <AuraCanvas aura={aura} w={w} h={w} ringR={size / (aura === "ascended" ? 2.15 : 2.7)} style={style}>{children}</AuraCanvas>;
}
