import { rngUnit, shuffle } from "./game.js";

/** @typedef {"math" | "sums" | "english1" | "english2" | "fractions"} GameMode */

/**
 * @typedef {{ n: number; d: number; key: string }} QuizPieChoice
 * @typedef {{ id: string; prompt: string; choices: string[]; correctIndex: number; pieChoices?: QuizPieChoice[] }} QuizQuestion
 * @typedef {{ key: string; prompt: string; answer: string; pieN?: number; pieD?: number; symbol?: string; hebrew?: string; english?: string }} QuizFact
 */

/**
 * @param {unknown[]} cards
 * @returns {Map<string, unknown[]>}
 */
function groupByFactKey(cards) {
  /** @type {Map<string, unknown[]>} */
  const map = new Map();
  for (const c of cards) {
    if (!c || typeof c !== "object") continue;
    const key = /** @type {{ factKey?: string }} */ (c).factKey;
    if (typeof key !== "string") continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  return map;
}

/**
 * @param {GameMode} mode
 * @param {unknown[]} cards
 * @returns {QuizFact[]}
 */
export function extractQuizFacts(mode, cards) {
  const groups = groupByFactKey(cards);
  /** @type {QuizFact[]} */
  const facts = [];

  for (const [key, group] of groups) {
    if (mode === "math") {
      const expr = group.find((c) => /** @type {{ side?: string }} */ (c).side === "expr");
      const ans = group.find((c) => /** @type {{ side?: string }} */ (c).side === "answer");
      if (expr?.label && ans?.label) {
        facts.push({
          key,
          prompt: `${expr.label} = ?`,
          answer: String(ans.label),
        });
      }
    } else if (mode === "sums") {
      const expr = group.find((c) => /** @type {{ side?: string }} */ (c).side === "expr");
      const ans = group.find((c) => /** @type {{ side?: string }} */ (c).side === "answer");
      if (expr?.label && ans?.label) {
        facts.push({
          key,
          prompt: `${expr.label} = ?`,
          answer: String(ans.label),
        });
      }
    } else if (mode === "fractions") {
      const frac = group.find((c) => /** @type {{ side?: string }} */ (c).side === "fraction");
      const diagram = group.find((c) => /** @type {{ side?: string }} */ (c).side === "diagram");
      const pieN = diagram?.n;
      const pieD = diagram?.d;
      if (
        frac?.label &&
        typeof pieN === "number" &&
        typeof pieD === "number" &&
        pieD > 0
      ) {
        facts.push({
          key,
          prompt: `${frac.label} = ?`,
          answer: key,
          pieN,
          pieD,
        });
      }
    } else if (mode === "english1") {
      const pic = group.find((c) => /** @type {{ side?: string }} */ (c).side === "picture");
      const word = group.find((c) => /** @type {{ side?: string }} */ (c).side === "word");
      const symbol = pic?.symbol;
      const english = word?.word ?? word?.label;
      if (symbol && english) {
        facts.push({
          key,
          prompt: symbol,
          answer: String(english),
          symbol: String(symbol),
          english: String(english),
        });
      }
    } else if (mode === "english2") {
      const he = group.find((c) => /** @type {{ side?: string }} */ (c).side === "he");
      const en = group.find((c) => /** @type {{ side?: string }} */ (c).side === "en");
      const hebrew = he?.label ?? he?.word;
      const english = en?.label ?? en?.word;
      if (hebrew && english) {
        facts.push({
          key,
          prompt: String(hebrew),
          answer: String(english),
          hebrew: String(hebrew),
          english: String(english),
        });
      }
    }
  }

  return facts;
}

/**
 * @param {string} correct
 * @param {QuizFact[]} facts
 * @param {QuizFact} self
 * @param {number} count
 * @param {() => number} rng
 */
function pickWrongAnswers(correct, facts, self, count, rng) {
  const pool = facts
    .filter((f) => f.key !== self.key && f.answer !== correct)
    .map((f) => f.answer);
  const wrong = [];
  const bag = [...pool];
  while (wrong.length < count && bag.length) {
    const i = Math.floor(rngUnit(rng) * bag.length);
    const v = bag.splice(i, 1)[0];
    if (!wrong.includes(v)) wrong.push(v);
  }
  let n = 1;
  while (wrong.length < count) {
    const delta = wrong.length % 2 === 0 ? n : -n;
    const candidate = String(Number(correct) + delta);
    if (candidate !== correct && !wrong.includes(candidate) && /^-?\d+$/.test(candidate)) {
      wrong.push(candidate);
    }
    n += 1;
    if (n > 20) {
      wrong.push(`${correct}?`);
      break;
    }
  }
  return wrong.slice(0, count);
}

/**
 * @param {string} correctKey
 * @param {QuizFact[]} facts
 * @param {QuizFact} self
 * @param {number} count
 * @param {() => number} rng
 * @returns {QuizFact[]}
 */
function pickWrongPieFacts(correctKey, facts, self, count, rng) {
  const pool = facts.filter(
    (f) => f.key !== self.key && f.key !== correctKey && f.pieN != null && f.pieD != null,
  );
  const wrong = [];
  const bag = [...pool];
  while (wrong.length < count && bag.length) {
    const i = Math.floor(rngUnit(rng) * bag.length);
    wrong.push(bag.splice(i, 1)[0]);
  }
  return wrong;
}

/**
 * @param {QuizFact} fact
 * @param {QuizFact[]} allFacts
 * @param {() => number} rng
 * @returns {QuizQuestion}
 */
export function factToQuestion(fact, allFacts, rng = Math.random) {
  if (fact.pieN != null && fact.pieD != null) {
    const wrongFacts = pickWrongPieFacts(fact.key, allFacts, fact, 3, rng);
    const pieChoices = shuffle(
      [
        { n: fact.pieN, d: fact.pieD, key: fact.key },
        ...wrongFacts.map((f) => ({
          n: /** @type {number} */ (f.pieN),
          d: /** @type {number} */ (f.pieD),
          key: f.key,
        })),
      ],
      rng,
    );
    const correctIndex = pieChoices.findIndex((p) => p.key === fact.key);
    return {
      id: fact.key,
      prompt: fact.prompt,
      choices: pieChoices.map((p) => p.key),
      pieChoices,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
    };
  }

  const wrong = pickWrongAnswers(fact.answer, allFacts, fact, 3, rng);
  const choices = shuffle([fact.answer, ...wrong], rng);
  const correctIndex = choices.indexOf(fact.answer);
  return {
    id: fact.key,
    prompt: fact.prompt,
    choices,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
  };
}

/**
 * @param {GameMode} mode
 * @param {unknown[]} cards
 * @param {() => number} [rng]
 * @returns {QuizQuestion[]}
 */
export function buildQuizFromGame(mode, cards, rng = Math.random) {
  const facts = extractQuizFacts(mode, cards);
  if (!facts.length) return [];
  const questions = facts.map((f) => factToQuestion(f, facts, rng));
  return shuffle(questions, rng);
}

/**
 * @param {number} correct
 * @param {number} total
 * @returns {number}
 */
export function scorePercent(correct, total) {
  if (!total || total <= 0) return 0;
  return Math.round((correct / total) * 100);
}
