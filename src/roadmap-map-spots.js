/** Circle centers on roadmap-map.png (512×768). Level 1 = bottom of the path. */
export const ROADMAP_MAP_SIZE = { w: 512, h: 768 };

export const ROADMAP_MAX_LEVELS = 70;

/** Dense polyline tracing the yellow road on roadmap-map.png. */
const PATH_VERTICES = [
  [248, 712],
  [278, 698],
  [308, 682],
  [338, 668],
  [352, 648],
  [328, 632],
  [278, 620],
  [218, 612],
  [162, 604],
  [178, 586],
  [228, 568],
  [288, 550],
  [342, 532],
  [362, 510],
  [322, 492],
  [258, 476],
  [192, 460],
  [142, 444],
  [168, 422],
  [242, 404],
  [318, 386],
  [356, 366],
  [342, 346],
  [278, 328],
  [188, 310],
  [152, 290],
  [218, 270],
  [312, 252],
  [358, 230],
  [288, 212],
  [188, 194],
  [218, 176],
  [292, 158],
  [318, 142],
  [252, 126],
];

/**
 * @param {[number, number][]} vertices
 * @param {number} count
 * @returns {{ level: number; x: number; y: number }[]}
 */
function samplePathEvenly(vertices, count) {
  const segments = [];
  let total = 0;

  for (let i = 0; i < vertices.length - 1; i++) {
    const [x1, y1] = vertices[i];
    const [x2, y2] = vertices[i + 1];
    const length = Math.hypot(x2 - x1, y2 - y1);
    segments.push(length);
    total += length;
  }

  const step = total / Math.max(1, count - 1);
  /** @type {{ level: number; x: number; y: number }[]} */
  const spots = [];
  let segIndex = 0;
  let segStart = 0;

  for (let level = 1; level <= count; level++) {
    const target = (level - 1) * step;

    while (segIndex < segments.length - 1 && segStart + segments[segIndex] < target) {
      segStart += segments[segIndex];
      segIndex++;
    }

    const segLen = segments[segIndex] || 1;
    const frac = (target - segStart) / segLen;
    const [ax, ay] = vertices[segIndex];
    const [bx, by] = vertices[segIndex + 1] ?? vertices[segIndex];

    spots.push({
      level,
      x: Math.round(ax + (bx - ax) * frac),
      y: Math.round(ay + (by - ay) * frac),
    });
  }

  return spots;
}

/** @param {number} count */
function buildLevelSpots(count) {
  return samplePathEvenly(PATH_VERTICES, count);
}

export const ROADMAP_LEVEL_SPOTS = buildLevelSpots(ROADMAP_MAX_LEVELS);

/**
 * Map the given level numbers onto evenly spaced points along the path.
 *
 * @param {number[]} levelNumbers
 * @returns {Map<number, { x: number; y: number }>}
 */
export function getRoadmapDisplayPositionsForLevels(levelNumbers) {
  const count = Math.max(1, levelNumbers.length);
  const spots = samplePathEvenly(PATH_VERTICES, count);
  const map = new Map();
  levelNumbers.forEach((level, index) => {
    const spot = spots[index];
    if (spot) map.set(level, { x: spot.x, y: spot.y });
  });
  return map;
}
