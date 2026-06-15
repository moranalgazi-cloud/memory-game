/** Circle centers on the cosmic star trail (512×768). Level 1 = bottom of the path. */
export const ROADMAP_MAP_SIZE = { w: 512, h: 768 };

export const ROADMAP_MAX_LEVELS = 70;

/** Winding polyline tracing the glowing trail on roadmap-map.png. */
export const ROADMAP_PATH_VERTICES = [
  [256, 710],
  [310, 685],
  [358, 655],
  [348, 618],
  [290, 592],
  [200, 572],
  [118, 548],
  [108, 512],
  [185, 482],
  [300, 452],
  [372, 420],
  [358, 385],
  [268, 358],
  [155, 335],
  [105, 302],
  [175, 272],
  [290, 245],
  [365, 215],
  [330, 182],
  [256, 152],
  [256, 108],
];

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

function buildLevelSpots(count) {
  return samplePathEvenly(ROADMAP_PATH_VERTICES, count);
}

export const ROADMAP_LEVEL_SPOTS = buildLevelSpots(ROADMAP_MAX_LEVELS);

/**
 * Build an SVG path `d` attribute from vertex coordinates.
 *
 * @param {[number, number][]} vertices
 * @returns {string}
 */
export function buildSvgPathFromVertices(vertices) {
  if (!vertices.length) return "";
  return vertices
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
}

/**
 * Fraction (0–1) along the path for a given level index among visible levels.
 *
 * @param {number} levelIndex 0-based index among visible levels
 * @param {number} totalVisible
 * @returns {number}
 */
export function pathFractionForLevelIndex(levelIndex, totalVisible) {
  if (totalVisible <= 1) return 0;
  return levelIndex / (totalVisible - 1);
}

/**
 * Map the given level numbers onto evenly spaced points along the path.
 *
 * @param {number[]} levelNumbers
 * @returns {Map<number, { x: number; y: number }>}
 */
export function getRoadmapDisplayPositionsForLevels(levelNumbers) {
  const count = Math.max(1, levelNumbers.length);
  const spots = samplePathEvenly(ROADMAP_PATH_VERTICES, count);
  const map = new Map();
  levelNumbers.forEach((level, index) => {
    const spot = spots[index];
    if (spot) map.set(level, { x: spot.x, y: spot.y });
  });
  return map;
}
