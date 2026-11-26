import { describe, expect, it } from "vitest";
import { MESSAGE_SWEEP_INTERVAL_MS, RELEASE_SWEEP_INTERVAL_MS } from "@/lib/constants";
import { SLOW_SWEEP_EVERY_TICKS, sweepsDueOnTick } from "@/lib/messaging";

const EVERY_TICK = ["expired release holds", "lapsed release orders", "ended releases", "release sequence"];

const SWEEPS: { name: string; everyTick?: boolean }[] = [
  ...EVERY_TICK.map((name) => ({ name, everyTick: true })),
  { name: "abandoned checkouts" },
  { name: "ended waitlists" },
];

const names = (tick: number) => sweepsDueOnTick(SWEEPS, tick).map((sweep) => sweep.name);

describe("sweepsDueOnTick", () => {
  it("takes the slow cadence from the two intervals", () => {
    expect(SLOW_SWEEP_EVERY_TICKS).toBe(MESSAGE_SWEEP_INTERVAL_MS / RELEASE_SWEEP_INTERVAL_MS);
  });

  it("runs every sweep on the first tick, the stock sweeps first", () => {
    expect(names(0)).toEqual([...EVERY_TICK, "abandoned checkouts", "ended waitlists"]);
  });

  it("runs only the every tick sweeps between slow ticks", () => {
    for (let tick = 1; tick < SLOW_SWEEP_EVERY_TICKS; tick += 1) {
      expect(names(tick)).toEqual(EVERY_TICK);
    }
  });

  it("runs every sweep again once per slow interval", () => {
    expect(names(SLOW_SWEEP_EVERY_TICKS)).toHaveLength(SWEEPS.length);
    expect(names(SLOW_SWEEP_EVERY_TICKS + 1)).toEqual(EVERY_TICK);
    expect(names(SLOW_SWEEP_EVERY_TICKS * 2)).toHaveLength(SWEEPS.length);
  });
});
