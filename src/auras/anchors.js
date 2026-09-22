// Face anchor in avatar radii, +y down. Bonewright eyes use it. A Nullpoint
// blindfold in the over pass belongs on this same origin so photos match.
export const FACE_REGION = { x: 0.19, y: -0.16, eyeW: 0.17 };

// Physique art is 424×568. Keys are the paths physiqueSrc returns, so the
// figure on screen and the landmarks are the same choice. Each entry is pixels
// on that file: the centre of the head blob and its half-width there, the
// shoulder line where the raised arms close onto the torso, and the chest at
// y=250. Eyes are spaced from the
// head half-width using the proportion measured on the E head (9px apart, 8px
// wide, on a 22.5px half).
export const FIGURE_ART = { w: 424, h: 568 };
const EYE_FROM_HEAD = { x: 9 / 22.5, w: 8 / 22.5 };
export const FIGURE_ANCHORS = {
  "/avatars/E.webp": { head: { x: 212, y: 55, half: 24 }, shoulder: { x: 210.5, y: 135, half: 63.5 }, chest: { x: 212.5, y: 250, half: 40.5 } },
  "/avatars/D.webp": { head: { x: 211.5, y: 56, half: 24.5 }, shoulder: { x: 211, y: 137, half: 63 }, chest: { x: 212.5, y: 250, half: 40.5 } },
  "/avatars/C.webp": { head: { x: 211.5, y: 58, half: 24.5 }, shoulder: { x: 211, y: 142, half: 67 }, chest: { x: 212.5, y: 250, half: 41.5 } },
  "/avatars/B.webp": { head: { x: 211.5, y: 58, half: 24.5 }, shoulder: { x: 212.5, y: 141, half: 68.5 }, chest: { x: 212.5, y: 250, half: 42.5 } },
  "/avatars/A.webp": { head: { x: 211.5, y: 57, half: 24.5 }, shoulder: { x: 211.5, y: 142, half: 70.5 }, chest: { x: 212.5, y: 250, half: 42.5 } },
  "/avatars/S.webp": { head: { x: 211.5, y: 58, half: 24.5 }, shoulder: { x: 212, y: 144, half: 71 }, chest: { x: 212, y: 250, half: 41 } },
  "/avatars/SS.webp": { head: { x: 211.5, y: 58, half: 24.5 }, shoulder: { x: 212, y: 144, half: 73 }, chest: { x: 211.5, y: 250, half: 41.5 } },
  "/avatars/E-f.webp": { head: { x: 217, y: 60, half: 32 }, shoulder: { x: 210.5, y: 148, half: 62.5 }, chest: { x: 212.5, y: 250, half: 53.5 } },
  "/avatars/D-f.webp": { head: { x: 217, y: 61, half: 32 }, shoulder: { x: 211, y: 147, half: 63 }, chest: { x: 212.5, y: 250, half: 53.5 } },
  "/avatars/C-f.webp": { head: { x: 217, y: 61, half: 32 }, shoulder: { x: 213, y: 147, half: 63 }, chest: { x: 212.5, y: 250, half: 51.5 } },
  "/avatars/B-f.webp": { head: { x: 217, y: 61, half: 32 }, shoulder: { x: 214, y: 147, half: 65 }, chest: { x: 212.5, y: 250, half: 50.5 } },
  "/avatars/A-f.webp": { head: { x: 217, y: 61, half: 32 }, shoulder: { x: 213.5, y: 147, half: 68.5 }, chest: { x: 212.5, y: 250, half: 47.5 } },
  "/avatars/S-f.webp": { head: { x: 217, y: 62, half: 32 }, shoulder: { x: 213.5, y: 147, half: 68.5 }, chest: { x: 212.5, y: 250, half: 47.5 } },
  "/avatars/SS-f.webp": { head: { x: 217, y: 62, half: 32 }, shoulder: { x: 214, y: 148, half: 70 }, chest: { x: 212.5, y: 250, half: 47.5 } },
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
// Body mode looks up `figure` (a physiqueSrc path). An unknown figure returns
// null so pieces are not drawn on the wrong body.
export function resolveAuraAnchors(mode, { w, h, cx, cy, rx, ry }, figure) {
  if (mode === "body") {
    const lm = FIGURE_ANCHORS[figure];
    if (!lm) return null;
    const face = figurePoint(w, h, lm.head.x, lm.head.y);
    const shoulder = figurePoint(w, h, lm.shoulder.x, lm.shoulder.y);
    const chest = figurePoint(w, h, lm.chest.x, lm.chest.y);
    const half = lm.shoulder.half * shoulder.s;
    const span = half * 2;
    return {
      face: { x: face.x, y: face.y, eyeX: lm.head.half * EYE_FROM_HEAD.x * face.s, eyeW: lm.head.half * EYE_FROM_HEAD.w * face.s },
      shoulderY: shoulder.y,
      shoulderHalf: half,
      shoulderX: shoulder.x,
      cape: { x: shoulder.x, y: shoulder.y, w: span * 1.85 },
      torso: { x: chest.x, y: chest.y },
      sigil: { x: shoulder.x + half * 0.72, y: shoulder.y + (chest.y - shoulder.y) * 0.22, h: half * 0.95 },
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
