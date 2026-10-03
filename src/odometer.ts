// Easter egg: the dial odometer counts every trackpad turn ever spun.
// Pure logic; WheelPage wires it to input, settings and the toast.

/** Turn counts that get a one-off celebration. */
export const ODOMETER_MILESTONES = [25, 100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

/** The highest milestone crossed when going from `before` to `after` turns, or null. */
export function crossedMilestone(before: number, after: number): number | null {
  let hit: number | null = null;
  for (const m of ODOMETER_MILESTONES) if (before < m && after >= m) hit = m;
  return hit;
}
