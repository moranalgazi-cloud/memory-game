/**
 * @typedef {{ key: string; n: number; d: number; label: string }} FractionEntry
 * @typedef {{ id: string; factKey: string; side: "fraction" | "diagram"; label: string; n?: number; d?: number; word?: string }} FractionCard
 */

/**
 * @param {number} a
 * @param {number} b
 */
function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * @param {number} n
 * @param {number} d
 * @returns {{ n: number; d: number }}
 */
export function reduceFraction(n, d) {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/**
 * All **reduced** proper fractions with 2 ≤ denominator ≤ maxDen.
 * @param {number} maxDen
 * @returns {FractionEntry[]}
 */
export function buildFractionPool(maxDen) {
  const byKey = new Map();
  for (let den = 2; den <= maxDen; den += 1) {
    for (let num = 1; num < den; num += 1) {
      const r = reduceFraction(num, den);
      if (r.n >= r.d) continue;
      const key = `${r.n}/${r.d}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          n: r.n,
          d: r.d,
          label: `${r.n}/${r.d}`,
        });
      }
    }
  }
  return [...byKey.values()];
}

/**
 * @param {FractionEntry[]} pool
 * @param {number} count
 * @param {() => number} rng
 */
export function pickFractionEntries(pool, count, rng = Math.random) {
  const bag = [...pool];
  const chosen = [];
  const n = Math.min(count, bag.length);
  while (chosen.length < n && bag.length) {
    const i = Math.floor(rng() * bag.length);
    chosen.push(bag.splice(i, 1)[0]);
  }
  return chosen;
}

/**
 * @param {FractionEntry[]} entries
 * @returns {FractionCard[]}
 */
export function buildFractionDeck(entries) {
  /** @type {FractionCard[]} */
  const cards = [];
  let id = 0;
  for (const e of entries) {
    cards.push({
      id: `f${id++}`,
      factKey: e.key,
      side: "fraction",
      label: e.label,
      word: e.label,
    });
    cards.push({
      id: `f${id++}`,
      factKey: e.key,
      side: "diagram",
      label: "",
      n: e.n,
      d: e.d,
      word: e.label,
    });
  }
  return cards;
}

/**
 * @param {number} num
 * @param {number} den
 * @param {number} [size]
 * @returns {SVGSVGElement}
 */
export function createPieSvg(num, den, size = 100) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("xmlns", ns);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("class", "fraction-pie");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-hidden", "true");
  svg.style.display = "block";
  svg.style.flexShrink = "0";
  svg.style.transform = "translateZ(0)";

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const strokeW = Math.max(1.5, size * 0.02);

  const plateFill = "#cbd5e1";
  const plateStroke = "#64748b";
  const wedgeFill = "#1d4ed8";
  const wedgeStroke = "#1e3a8a";

  const plate = document.createElementNS(ns, "circle");
  plate.setAttribute("cx", String(cx));
  plate.setAttribute("cy", String(cy));
  plate.setAttribute("r", String(r));
  plate.setAttribute("fill", plateFill);
  plate.setAttribute("stroke", plateStroke);
  plate.setAttribute("stroke-width", String(strokeW));
  svg.append(plate);

  if (num <= 0 || den <= 0) return svg;

  const start = -Math.PI / 2;
  const sweep = (2 * Math.PI * num) / den;
  const end = start + sweep;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = sweep > Math.PI ? 1 : 0;

  const wedge = document.createElementNS(ns, "path");
  const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  wedge.setAttribute("d", pathD);
  wedge.setAttribute("fill", wedgeFill);
  wedge.setAttribute("stroke", wedgeStroke);
  wedge.setAttribute("stroke-width", String(Math.max(1.5, strokeW * 0.9)));
  wedge.setAttribute("stroke-linejoin", "round");
  svg.append(wedge);

  // Radial spokes: one per denominator slice (12 o'clock = first boundary), so the
  // circle is visibly divided into `den` equal parts.
  const spokeStroke = "#1e293b";
  const spokeW = Math.max(1.1, size * 0.016);
  for (let k = 0; k < den; k += 1) {
    const ang = start + (2 * Math.PI * k) / den;
    const x = cx + r * Math.cos(ang);
    const y = cy + r * Math.sin(ang);
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", String(cx));
    line.setAttribute("y1", String(cy));
    line.setAttribute("x2", String(x));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", spokeStroke);
    line.setAttribute("stroke-width", String(spokeW));
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(line);
  }

  return svg;
}
