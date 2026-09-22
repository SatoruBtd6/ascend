import test from "node:test";
import assert from "node:assert/strict";
import { FACE_REGION, FIGURE_ANCHORS, resolveAuraAnchors } from "./anchors.js";
import { physiqueSrc } from "../tabs/train/physique.js";

const BOX = { w: 176, h: 224, cx: 88, cy: 116, rx: 40, ry: 60 };

test("photo anchors keep the headshot face, shoulder, and sigil", () => {
  const a = resolveAuraAnchors("circle", { w: 160, h: 160, cx: 80, cy: 80, rx: 52, ry: 52 });
  assert.equal(a.face.y, 80 + FACE_REGION.y * 52);
  assert.equal(a.face.eyeX, FACE_REGION.x * 52);
  assert.equal(a.shoulderY, 80 + 0.42 * 52);
  assert.ok(a.sigil.x > 80 && a.sigil.y < 80);
  assert.ok(a.cape.y < a.shoulderY);
});

test("E figure anchors sit on the measured head and shoulders", () => {
  const h = 220 * 1.02;
  const w = 220 * 0.8;
  const ring = resolveAuraAnchors("body", { w, h, cx: w / 2, cy: h * 0.52, rx: w * 0.28 * 0.84, ry: h * 0.36 * 0.84 }, "/avatars/E.webp");
  const oldEyeY = h * 0.52 + FACE_REGION.y * (h * 0.36 * 0.84);
  assert.ok(ring.face.y < oldEyeY - 40);
  assert.ok(ring.shoulderY < h * 0.4);
  assert.ok(ring.torso.y > ring.shoulderY);
  assert.ok(ring.sigil.x > ring.torso.x && ring.sigil.y < ring.torso.y);
  assert.ok(ring.pauldronH < ring.shoulderHalf * 2);
  assert.equal(FIGURE_ANCHORS["/avatars/E.webp"].head.y, 55);
});

test("every physiqueSrc figure has its own anchors and an unknown figure does not borrow one", () => {
  const keys = [];
  for (let tier = 0; tier < 7; tier++) {
    for (const sex of ["m", "f"]) {
      const src = physiqueSrc(sex, tier);
      keys.push(src);
      assert.ok(FIGURE_ANCHORS[src], src);
      const a = resolveAuraAnchors("body", BOX, src);
      assert.ok(a && a.face && a.shoulderHalf > 0 && a.cape.y === a.shoulderY);
    }
  }
  assert.deepEqual(keys.sort(), Object.keys(FIGURE_ANCHORS).sort());
  assert.equal(resolveAuraAnchors("body", BOX, "/avatars/E.webp".replace("E", "nope")), null);
  assert.equal(resolveAuraAnchors("body", BOX), null);
});

test("higher ranks and the female figures do not share the E shoulder and head", () => {
  const e = resolveAuraAnchors("body", BOX, "/avatars/E.webp");
  const ss = resolveAuraAnchors("body", BOX, "/avatars/SS.webp");
  const ef = resolveAuraAnchors("body", BOX, "/avatars/E-f.webp");
  const ssf = resolveAuraAnchors("body", BOX, "/avatars/SS-f.webp");
  assert.ok(ss.shoulderY > e.shoulderY && ss.shoulderHalf > e.shoulderHalf);
  assert.ok(ef.shoulderY > e.shoulderY);
  assert.ok(ef.face.x > e.face.x && ef.face.eyeX > e.face.eyeX);
  assert.ok(ssf.face.x > ss.face.x && ssf.shoulderY > ss.shoulderY);
});
