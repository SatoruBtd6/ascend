// Face anchor in avatar radii, +y down. Bonewright eyes use it. A Nullpoint
// blindfold in the over pass belongs on this same origin so photos match.
export const FACE_REGION = { x: 0.19, y: -0.16, eyeW: 0.17 };

// Physique art is 424×568. Landmarks are pixels on that image, measured from
// the opaque figure: the head blob, the shoulder girdle where the arms meet
// the torso, and the chest. Raised fists are not the shoulders.
export const FIGURE_ART = { w: 424, h: 568 };
export const FIGURE_LANDMARKS = {
  face: { x: 211.5, y: 64, eyeSpan: 9, eyeW: 8 },
  shoulder: { y: 140, half: 57 },
  torso: { x: 212, y: 250 },
};
// Physique.jsx places that image in the aura box: canvas is 0.8× by 1.02× the
// figure height, shifted up by 0.02×, image centered and height-fitted.
export const FIGURE_BOX = { w: 0.8, h: 1.02, top: 0.02 };

function figurePoint(w, h, x, y) {
  const figH = h / FIGURE_BOX.h;
  const figW = figH * (FIGURE_ART.w / FIGURE_ART.h);
  const left = (w - figW) / 2;
  const top = FIGURE_BOX.top * figH;
  const s = figW / FIGURE_ART.w;
  return { x: left + x * s, y: top + y * s, s };
}

// One resolved anchor set, in canvas pixels, for whichever avatar is showing.
export function resolveAuraAnchors(mode, { w, h, cx, cy, rx, ry }) {
  if (mode === "body") {
    const face = figurePoint(w, h, FIGURE_LANDMARKS.face.x, FIGURE_LANDMARKS.face.y);
    const shoulder = figurePoint(w, h, FIGURE_LANDMARKS.torso.x, FIGURE_LANDMARKS.shoulder.y);
    const torso = figurePoint(w, h, FIGURE_LANDMARKS.torso.x, FIGURE_LANDMARKS.torso.y);
    const half = FIGURE_LANDMARKS.shoulder.half * shoulder.s;
    const span = half * 2;
    return {
      face: { x: face.x, y: face.y, eyeX: FIGURE_LANDMARKS.face.eyeSpan * face.s, eyeW: FIGURE_LANDMARKS.face.eyeW * face.s },
      shoulderY: shoulder.y,
      shoulderHalf: half,
      shoulderX: shoulder.x,
      cape: { x: shoulder.x, y: shoulder.y, w: span * 1.85 },
      torso: { x: torso.x, y: torso.y },
      sigil: { x: shoulder.x + half * 0.72, y: shoulder.y + (torso.y - shoulder.y) * 0.22, h: half * 0.95 },
      pauldronH: half * 1.15,
    };
  }
  const R = Math.min(rx, ry);
  return {
    face: { x: cx, y: cy + FACE_REGION.y * ry, eyeX: FACE_REGION.x * rx, eyeW: FACE_REGION.eyeW * R },
    shoulderY: cy + 0.42 * ry,
    shoulderHalf: 0.62 * rx,
    shoulderX: cx,
    cape: { x: cx, y: cy + 0.08 * ry, w: 1.52 * R * (447 / 512) },
    torso: { x: cx, y: cy },
    sigil: { x: cx + Math.cos(-0.85) * rx * 0.55, y: cy + Math.sin(-0.85) * ry * 0.55, h: 0.42 * R },
    pauldronH: 0.78 * R,
  };
}
