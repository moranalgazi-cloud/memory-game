/** @type {AudioContext | null} */
let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

/**
 * Call from a direct user gesture (e.g. card click) so the context can resume;
 * win detection runs shortly after in a timer, where resume alone may be blocked.
 */
export function armCelebrationAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

/**
 * Synthesized crowd applause: many short filtered-noise “claps” with random timing.
 */
function playApplause() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const duration = 2.45;
  const sr = ctx.sampleRate;
  const length = Math.min(Math.floor(duration * sr), sr * 8);

  const buffer = ctx.createBuffer(2, length, sr);
  const maxTail = 480;

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    const env = new Float32Array(length);
    const impulses = 420;

    for (let i = 0; i < impulses; i++) {
      // Bias toward the first ~1.5s so it builds like a room waking up, then thins out.
      const t01 = Math.pow(Math.random(), 0.72);
      const start = Math.floor(t01 * Math.max(1, length - maxTail - 80)) + (i % 7);
      const peak = (0.2 + Math.random() * 0.8) * (0.35 + 0.65 * (1 - start / length));
      const decaySamples = 22 + Math.random() * 95;
      const tail = Math.min(maxTail, length - start);
      for (let k = 0; k < tail; k++) {
        env[start + k] += peak * Math.exp(-k / decaySamples);
      }
    }

    let maxE = 1e-8;
    for (let i = 0; i < length; i++) {
      if (env[i] > maxE) maxE = env[i];
    }
    const norm = 1 / maxE;

    const fadeInLen = Math.floor(sr * 0.035);
    const fadeOutLen = Math.floor(sr * 0.38);
    const fadeOutStart = length - fadeOutLen;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      let e = env[i] * norm;
      if (i < fadeInLen) e *= i / fadeInLen;
      else if (i > fadeOutStart) e *= (length - i) / fadeOutLen;
      data[i] = white * e * 0.42;
    }
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const body = ctx.createBiquadFilter();
  body.type = "bandpass";
  body.frequency.value = 1650;
  body.Q.value = 0.55;

  const air = ctx.createBiquadFilter();
  air.type = "highpass";
  air.frequency.value = 2200;
  air.Q.value = 0.35;

  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 1;
  const airGain = ctx.createGain();
  airGain.gain.value = 0.28;

  const master = ctx.createGain();
  master.gain.value = 0.52;

  src.connect(body);
  src.connect(air);
  body.connect(bodyGain);
  air.connect(airGain);
  bodyGain.connect(master);
  airGain.connect(master);
  master.connect(ctx.destination);

  src.start();
}

const CONFETTI_COLORS = [
  "#ff6bcb",
  "#ffd166",
  "#4dd4ac",
  "#5b8cff",
  "#ff9f1c",
  "#7b5cff",
  "#fffef8",
];

function burstConfetti() {
  if (typeof document === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
  let w = 0;
  let h = 0;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const onResize = () => resize();
  window.addEventListener("resize", onResize);

  const cx = w * 0.5;
  const cy = h * 0.35;
  const count = Math.min(160, Math.floor((w * h) / 12000));
  /** @type {{ x: number; y: number; vx: number; vy: number; g: number; r: number; vr: number; w: number; h: number; color: string }[]} */
  const parts = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * -0.5 * Math.random()) + (Math.random() - 0.5) * 1.2;
    const speed = 6 + Math.random() * 10;
    parts.push({
      x: cx + (Math.random() - 0.5) * 80,
      y: cy + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
      vy: Math.sin(angle) * speed * 0.9,
      g: 0.22 + Math.random() * 0.12,
      r: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      w: 5 + Math.random() * 5,
      h: 7 + Math.random() * 9,
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
    });
  }

  const t0 = performance.now();
  const lifeMs = 2800;

  function frame(nowMs) {
    const t = nowMs - t0;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.995;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < lifeMs) {
      requestAnimationFrame(frame);
    } else {
      window.removeEventListener("resize", onResize);
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}

const WIN_EMOJIS = ["👏", "👍", "🙌"];

function burstWinEmojis() {
  if (typeof document === "undefined") return;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:10000;overflow:hidden";
  document.body.append(layer);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const count = Math.min(36, Math.max(18, Math.floor((w * h) / 28000)));

  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.textContent = WIN_EMOJIS[(Math.random() * WIN_EMOJIS.length) | 0];
    el.setAttribute("aria-hidden", "true");
    const size = 28 + Math.random() * 22;
    const x = Math.random() * Math.max(1, w - size);
    const startY = h * (0.55 + Math.random() * 0.38);
    const drift = (Math.random() - 0.5) * w * 0.18;
    el.style.cssText = [
      "position:absolute",
      `left:${x}px`,
      `top:${startY}px`,
      `font-size:${size}px`,
      "line-height:1",
      "will-change:transform,opacity",
      "user-select:none",
    ].join(";");
    layer.append(el);

    const duration = 2200 + Math.random() * 1400;
    const rise = h * (0.35 + Math.random() * 0.25);
    el.animate(
      [
        { transform: "translate(0, 0) scale(0.4) rotate(-12deg)", opacity: 0 },
        {
          transform: `translate(${drift * 0.35}px, ${-rise * 0.35}px) scale(1) rotate(6deg)`,
          opacity: 1,
          offset: 0.18,
        },
        {
          transform: `translate(${drift}px, ${-rise}px) scale(1.05) rotate(-4deg)`,
          opacity: 0.95,
          offset: 0.72,
        },
        {
          transform: `translate(${drift * 1.1}px, ${-rise * 1.15}px) scale(0.85) rotate(8deg)`,
          opacity: 0,
        },
      ],
      { duration, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)", fill: "forwards" },
    );
  }

  window.setTimeout(() => layer.remove(), 3800);
}

export function celebrateWin() {
  try {
    playApplause();
  } catch (e) {
    console.warn("[celebrate] audio:", e);
  }
  try {
    burstConfetti();
  } catch (e) {
    console.warn("[celebrate] confetti:", e);
  }
  try {
    burstWinEmojis();
  } catch (e) {
    console.warn("[celebrate] emojis:", e);
  }
}
