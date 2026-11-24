import { test } from "node:test";
import assert from "node:assert/strict";
import { textFor, SW_MAX_MS } from "../public/js/notify.js";

test("rest notification names the next exercise and set", () => {
  assert.deepEqual(textFor("rest", { next: "Pull-Up", q: 1, n: 5 }), { title: "Hết giờ rest", body: "Tiếp theo: Pull-Up · set 2/5" });
  assert.equal(textFor("rest", { next: "Finisher", q: 0, n: 1 }).body, "Tiếp theo: Finisher");
  assert.equal(textFor("rest", {}).body, "Vào set tiếp theo");
});

test("other timers have their own wording", () => {
  assert.match(textFor("hold", { name: "Side Plank" }).body, /^Side Plank: xong/);
  assert.equal(textFor("emom").title, "EMOM xong");
  assert.match(textFor("walk", { target: 20 }).body, /20 phút/);
  assert.equal(textFor("nope").title, "Hết giờ");
});

test("worker-side alarm only covers short timers", () => {
  assert.ok(SW_MAX_MS > 120000, "a 2-minute rest is covered");
  assert.ok(SW_MAX_MS < 300000, "stays under the ~5 min worker limit");
});
