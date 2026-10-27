import { test } from "node:test";
import assert from "node:assert/strict";

const { subscribeKeyboardAnalogWheel } = await import("../../src/padInput.ts");
const { wheelTick } = await import("../../src/haptics.ts");

function fakeInput({ registerThrows = false } = {}) {
  const actionset = [];
  let cb = null;
  globalThis.SteamClient = {
    Input: {
      RegisterForControllerAnalogInputMessages: (f) => {
        if (registerThrows) throw new Error("changed in this client");
        cb = f;
        return { unregister: () => (cb = null) };
      },
      EnableControllerAnalogInputMessages() {},
      SetKeyboardActionset: (on) => actionset.push(on),
    },
  };
  return { actionset, analog: (x, y) => cb?.(0, 48, true, x, y) };
}
const opts = (steps) => ({ stepDegrees: 40, pad: "left", onStep: (d) => steps.push(d) });

test("trackpad circle: rubbing clockwise steps forward, and stop() turns the action set off", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"] });
  const fake = fakeInput();
  const steps = [];
  const stop = subscribeKeyboardAnalogWheel(opts(steps));
  for (let deg = 0; deg <= 90; deg += 6) {
    const a = (-deg * Math.PI) / 180; // y-up: clockwise = decreasing angle
    fake.analog(Math.cos(a) * 0.8, Math.sin(a) * 0.8);
    t.mock.timers.tick(10);
  }
  assert.deepEqual(steps, [1, 1], "90° at 40° per game → 2 steps forward");
  t.mock.timers.tick(1000);
  assert.ok(fake.actionset.filter((on) => on).length >= 2, "the action set is kept on while subscribed");
  stop();
  assert.equal(fake.actionset.at(-1), false);
});

test("trackpad circle: if Steam's analog API fails, the action set is never left on", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const fake = fakeInput({ registerThrows: true });
  const stop = subscribeKeyboardAnalogWheel(opts([]));
  t.mock.timers.tick(3000);
  assert.equal(fake.actionset.filter((on) => on).length, 0, `turned on with nothing listening: ${fake.actionset}`);
  stop();
});

test("haptics: found once Steam has loaded its module, even if it wasn't there at first", (t) => {
  t.mock.timers.enable({ apis: ["Date"] });
  const ticks = [];
  wheelTick("left", false, 5); // no webpack bundle yet → silently nothing
  const mod = { svc: { PlaySteamDeckHaptic: (...a) => ticks.push(a) } };
  const req = (id) => (id === "7" ? mod : {});
  req.m = { 7: () => "PlaySteamDeckHaptic Playing legacy haptics" };
  globalThis.webpackChunksteamui = { push: ([, , cb]) => cb(req) };
  wheelTick("left", false, 5);
  assert.deepEqual(ticks, [], "not searched again on every tick");
  t.mock.timers.tick(6000);
  wheelTick("left", false, 5);
  assert.deepEqual(ticks, [[2, 1, 1, -12]], "left pad, Tick, gain for level 5");
});
