import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteSetAt, restoreSetAt } from "./setUndo.js";

test("restore puts the set back in its original position with its values", () => {
  const exercises = [
    {
      name: "Bench Press",
      sets: [
        { w: "135", r: "8", done: true, drop: false },
        { w: "155", r: "5", done: true, drop: true, warm: false },
        { w: "95", r: "10", done: false, warm: true, drop: false },
      ],
    },
    { name: "Row", sets: [{ w: "100", r: "8", done: true }] },
  ];
  const cut = deleteSetAt(exercises, 0, 1);
  assert.deepEqual(cut.exercises[0].sets.map((st) => st.w), ["135", "95"]);
  assert.equal(cut.exercises[1], exercises[1]);
  assert.deepEqual(cut.undo.set, { w: "155", r: "5", done: true, drop: true, warm: false });

  const back = restoreSetAt(cut.exercises, cut.undo);
  assert.equal(back[0].sets.length, 3);
  assert.equal(back[0].sets[0].w, "135");
  assert.deepEqual(back[0].sets[1], { w: "155", r: "5", done: true, drop: true, warm: false });
  assert.equal(back[0].sets[2].w, "95");
  assert.equal(back[0].sets[2].warm, true);
  assert.equal(back[0].sets[2].done, false);
  assert.equal(back[1].sets.length, 1);

  cut.undo.set.w = "999";
  assert.equal(back[0].sets[1].w, "155");
});
