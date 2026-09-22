import test from "node:test";
import assert from "node:assert/strict";
import { FACE_REGION, FIGURE_LANDMARKS, resolveAuraAnchors } from "./anchors.js";

test("photo anchors keep the headshot face, shoulder, and sigil", () => {
  const a = resolveAuraAnchors("circle", { w: 160, h: 160, cx: 80, cy: 80, rx: 52, ry: 52 });
  assert.equal(a.face.y, 80 + FACE_REGION.y * 52);
  assert.equal(a.face.eyeX, FACE_REGION.x * 52);
  assert.equal(a.shoulderY, 80 + 0.42 * 52);
  assert.ok(a.sigil.x > 80 && a.sigil.y < 80);
  assert.ok(a.cape.y < a.shoulderY);
});

test("figure anchors sit on the measured head and shoulders, not the ring", () => {
  const h = 220 * 1.02;
  const w = 220 * 0.8;
  const ring = resolveAuraAnchors("body", { w, h, cx: w / 2, cy: h * 0.52, rx: w * 0.28 * 0.84, ry: h * 0.36 * 0.84 });
  const oldEyeY = h * 0.52 + FACE_REGION.y * (h * 0.36 * 0.84);
  assert.ok(ring.face.y < oldEyeY - 40, "eyes move from the chest up onto the head");
  assert.ok(ring.shoulderY < h * 0.4, "shoulders stay in the upper body");
  assert.ok(Math.abs(ring.shoulderX - w / 2) < 2);
  assert.ok(ring.torso.y > ring.shoulderY);
  assert.ok(ring.sigil.x > ring.torso.x && ring.sigil.y < ring.torso.y);
  assert.ok(ring.pauldronH < ring.shoulderHalf * 2);
  assert.equal(FIGURE_LANDMARKS.face.y, 64);
});
