/* Synthesized SFX via Web Audio — no audio assets required.
   Everything routes through a compressor-backed master bus to stay gentle. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(comp);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function out(): GainNode {
  ac();
  return master!;
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function env(
  g: GainNode,
  t: number,
  peak: number,
  attack: number,
  decay: number
): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0002, t + attack + decay);
}

/** Short wooden blip — reels, landings, score counters. */
export function tick(freq = 1000, vol = 0.12, dur = 0.035): void {
  try {
    const c = ac();
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    const g = c.createGain();
    env(g, t, vol, 0.004, dur);
    o.connect(g).connect(out());
    o.start(t);
    o.stop(t + dur + 0.06);
    const n = c.createBufferSource();
    n.buffer = noise(c);
    const nf = c.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = Math.min(freq * 2, 12000);
    nf.Q.value = 1;
    const ng = c.createGain();
    env(ng, t, vol * 0.5, 0.002, 0.02);
    n.connect(nf).connect(ng).connect(out());
    n.start(t);
    n.stop(t + 0.05);
  } catch {
    /* audio unavailable — stay silent */
  }
}

/** Airy swoosh for the card burst. */
export function playWhoosh(): void {
  try {
    const c = ac();
    const t = c.currentTime;
    const n = c.createBufferSource();
    n.buffer = noise(c);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 0.7;
    f.frequency.setValueAtTime(260, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.55);
    const g = c.createGain();
    env(g, t, 0.16, 0.08, 0.85);
    n.connect(f).connect(g).connect(out());
    n.start(t);
    n.stop(t + 1.1);
  } catch {}
}

/** Soft click when locking in a choice. */
export function playPick(): void {
  tick(720, 0.14, 0.05);
}

/** Light universal UI click. */
export function playClick(): void {
  try {
    const c = ac();
    const t = c.currentTime;
    tick(840, 0.11, 0.04);
    bell(1567.98, t + 0.015, 0.05, 0.3);
  } catch {}
}

/** Gentle two-note sparkle for hovering the claim button. */
export function playHoverChime(): void {
  try {
    const c = ac();
    const t = c.currentTime;
    [1567.98, 2093.0].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = c.createGain();
      env(g, t + i * 0.035, 0.04, 0.006, 0.24);
      o.connect(g).connect(out());
      o.start(t + i * 0.035);
      o.stop(t + i * 0.035 + 0.35);
    });
  } catch {}
}

/** Warm, slightly mysterious pluck for hovering a mystery card. */
export function playCardHover(): void {
  try {
    const c = ac();
    const t = c.currentTime;
    bell(523.25, t, 0.055, 0.45); // C5 — inviting, tarot-adjacent
    bell(783.99, t + 0.05, 0.03, 0.4); // G5 whisper above it
    shimmer(t + 0.02, 0.35, 0.018);
  } catch {}
}

/** Warm ascending confirm for claiming the fate. */
export function playClaimClick(): void {
  try {
    const c = ac();
    const t = c.currentTime;
    tick(420, 0.1, 0.05);
    bell(1046.5, t + 0.02, 0.09, 0.5);
    bell(1318.51, t + 0.1, 0.075, 0.65);
    shimmer(t + 0.06, 0.45, 0.025);
  } catch {}
}

/** Glassy crunch for the vanishing cards. */
export function playShatter(): void {
  try {
    const c = ac();
    const t = c.currentTime;
    const n = c.createBufferSource();
    n.buffer = noise(c);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2400;
    const g = c.createGain();
    env(g, t, 0.13, 0.004, 0.32);
    n.connect(hp).connect(g).connect(out());
    n.start(t);
    n.stop(t + 0.4);
    for (let i = 0; i < 7; i++) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = 1700 + Math.random() * 2600;
      const og = c.createGain();
      const st = t + Math.random() * 0.09;
      env(og, st, 0.04 + Math.random() * 0.04, 0.003, 0.14 + Math.random() * 0.12);
      o.connect(og).connect(out());
      o.start(st);
      o.stop(st + 0.45);
    }
  } catch {}
}

/** Warm sub thud for impacts. */
function thud(freq = 130, vol = 0.22): void {
  try {
    const c = ac();
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * 1.7, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.16);
    const g = c.createGain();
    env(g, t, vol, 0.006, 0.22);
    o.connect(g).connect(out());
    o.start(t);
    o.stop(t + 0.4);
  } catch {}
}

/** Bell voice with shimmering partials. */
function bell(fq: number, t: number, vol: number, dur: number): void {
  const c = ac();
  const partials: Array<[number, number]> = [
    [1, 1],
    [2.01, 0.42],
    [2.99, 0.2],
    [4.02, 0.09],
  ];
  for (const [mult, amp] of partials) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = fq * mult;
    const g = c.createGain();
    env(g, t, vol * amp, 0.006, dur);
    o.connect(g).connect(out());
    o.start(t);
    o.stop(t + dur + 0.15);
  }
}

/** Soft detuned saw pad for fanfare chords. */
function brass(fq: number, t: number, vol: number, dur: number): void {
  const c = ac();
  for (const det of [-5, 4]) {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = fq;
    o.detune.value = det;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(2800, t + Math.min(0.3, dur * 0.4));
    lp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.08);
    g.gain.setValueAtTime(vol, t + Math.max(0.1, dur - 0.25));
    g.gain.exponentialRampToValueAtTime(0.0002, t + dur);
    o.connect(lp).connect(g).connect(out());
    o.start(t);
    o.stop(t + dur + 0.1);
  }
}

function shimmer(t: number, dur: number, vol = 0.06): void {
  const c = ac();
  const n = c.createBufferSource();
  n.buffer = noise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(3800, t);
  bp.frequency.exponentialRampToValueAtTime(8200, t + dur);
  const g = c.createGain();
  env(g, t, vol, 0.15, dur);
  n.connect(bp).connect(g).connect(out());
  n.start(t);
  n.stop(t + dur + 0.25);
}

const N = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.26,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093.0,
  E7: 2637.02,
};

export type RewardTier = "doom" | "sad" | "plain" | "bright" | "epic" | "mythic";

/** Slot machine style jackpot sound for Absolute Fate. */
function playSlotMachineWin(c: AudioContext, t: number): void {
  // Classic slot machine winning sequence: ascending arpeggio with repeating "ding" pattern
  const baseNotes = [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6, N.C7];
  const delayBetween = 0.06;
  
  // Rapid fire dings (like coins pouring)
  for (let i = 0; i < 12; i++) {
    const note = baseNotes[i % baseNotes.length];
    const noteTime = t + i * delayBetween;
    bell(note, noteTime, 0.18, 0.5);
    
    // Add a subtle "coin" click
    const click = c.createOscillator();
    click.type = "square";
    click.frequency.value = 1200 + i * 50;
    const cg = c.createGain();
    env(cg, noteTime, 0.08, 0.001, 0.04);
    click.connect(cg).connect(out());
    click.start(noteTime);
    click.stop(noteTime + 0.05);
  }
  
  // Big ascending fanfare
  const fanfareNotes = [N.C4, N.E4, N.G4, N.C5, N.E5, N.G5, N.C6];
  fanfareNotes.forEach((f, i) => {
    const noteTime = t + 0.75 + i * 0.08;
    brass(f, noteTime, 0.12, 0.9);
    bell(f * 2, noteTime + 0.02, 0.1, 1.2);
  });
  
  // Final sustained chord with shimmer
  [N.C5, N.E5, N.G5].forEach((f) => {
    bell(f, t + 1.3, 0.15, 3.0);
  });
  shimmer(t + 1.3, 3.0, 0.12);
  
  // Celebration "ta-da" ending
  setTimeout(() => {
    try {
      const c2 = ac();
      const t2 = c2.currentTime;
      const tada = [N.C6, N.E6, N.G6, N.C7];
      tada.forEach((f, i) => bell(f, t2 + i * 0.1, 0.12, 1.5));
    } catch {}
  }, 2000);
}

export function rewardTierFor(category: string): RewardTier {
  switch (category) {
    case "Disaster":
      return "doom";
    case "Bad":
      return "sad";
    case "Good":
      return "bright";
    case "Legendary":
      return "epic";
    case "Absolute Fate":
      return "mythic";
    default:
      return "plain";
  }
}

/**
 * Rarity-scaled payoff. Returns approximate duration in seconds so the UI
 * can pace what happens next. Doom is a comic deflation, mythic is a full
 * dopamine cascade. All tiers now have satisfying reward sounds.
 */
export function playReward(tier: RewardTier): number {
  try {
    const c = ac();
    const t0 = c.currentTime + 0.03;
    switch (tier) {
      case "doom": {
        // Disaster - comic deflation but still a "reward" sound
        thud(98, 0.2);
        const seq = [N.E4, N.D4, N.C4];
        seq.forEach((f, i) => bell(f, t0 + 0.05 + i * 0.3, 0.12, 0.6));
        // Add a small "pity" chime at the end
        setTimeout(() => {
          try {
            const c2 = ac();
            const t2 = c2.currentTime;
            bell(N.C5, t2, 0.08, 0.4);
          } catch {}
        }, 1200);
        return 1.5;
      }
      case "sad": {
        // Bad - gentle consolation prize feel
        bell(N.G4, t0, 0.11, 0.7);
        bell(N.E4, t0 + 0.28, 0.1, 0.8);
        // Rising "better luck next time" motif
        [N.C4, N.D4, N.E4].forEach((f, i) => bell(f, t0 + 0.7 + i * 0.12, 0.08, 0.5));
        shimmer(t0 + 0.7, 0.6, 0.03);
        return 1.5;
      }
      case "plain": {
        // Neutral - satisfying "you got something" feel
        bell(N.C5, t0, 0.14, 0.7);
        bell(N.G4, t0 + 0.12, 0.12, 0.8);
        bell(N.E5, t0 + 0.24, 0.1, 0.9);
        // Mini ascending arpeggio for dopamine
        [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(f, t0 + 0.4 + i * 0.06, 0.11, 0.7));
        shimmer(t0 + 0.4, 0.8, 0.04);
        brass(N.C4, t0 + 0.5, 0.05, 0.8);
        return 1.8;
      }
      case "bright": {
        // Good - clear dopamine hit, "nice reward" feel
        const run = [N.C5, N.E5, N.G5, N.C6];
        run.forEach((f, i) => bell(f, t0 + i * 0.08, 0.15, 1.1));
        brass(N.C5, t0 + 0.05, 0.05, 0.8);
        // Second wave
        [N.E5, N.G5, N.B5, N.D6].forEach((f, i) => bell(f, t0 + 0.45 + i * 0.07, 0.12, 1.0));
        shimmer(t0 + 0.25, 1.2, 0.05);
        brass(N.E4, t0 + 0.6, 0.05, 1.0);
        return 2.3;
      }
      case "epic": {
        // Legendary - strong dopamine cascade, "big win" feel
        thud(110, 0.24);
        [N.C4, N.E4, N.G4].forEach((f) => brass(f, t0 + 0.04, 0.07, 1.1));
        const run = [N.C5, N.E5, N.G5, N.C6, N.E6];
        run.forEach((f, i) => bell(f, t0 + 0.18 + i * 0.07, 0.18, 1.6));
        // Cascading arpeggio up and down
        const cascade = [N.C6, N.B5, N.A5, N.G5, N.E5, N.C5];
        cascade.forEach((f, i) => bell(f, t0 + 0.6 + i * 0.05, 0.14, 1.2));
        shimmer(t0 + 0.3, 1.8, 0.07);
        brass(N.G4, t0 + 0.8, 0.06, 1.3);
        bell(N.G5, t0 + 1.1, 0.12, 1.8);
        // Final sparkle
        setTimeout(() => {
          try {
            const c2 = ac();
            const t2 = c2.currentTime;
            [N.C7, N.E7].forEach((f, i) => bell(f, t2 + i * 0.1, 0.1, 1.5));
          } catch {}
        }, 1800);
        return 3.2;
      }
      case "mythic": {
        // Absolute Fate - maximum dopamine, slot machine jackpot
        playSlotMachineWin(c, t0);
        // riser
        const rise = c.createOscillator();
        rise.type = "sine";
        rise.frequency.setValueAtTime(180, t0);
        rise.frequency.exponentialRampToValueAtTime(760, t0 + 0.5);
        const rg = c.createGain();
        env(rg, t0, 0.05, 0.3, 0.25);
        rise.connect(rg).connect(out());
        rise.start(t0);
        rise.stop(t0 + 0.6);
        shimmer(t0, 0.55, 0.05);
        // impact + grand chord
        thud(65, 0.3);
        [N.C4, N.E4, N.G4, N.C5].forEach((f) => brass(f, t0 + 0.55, 0.08, 1.6));
        // cascading bell run
        const run = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6, N.D6, N.E6];
        run.forEach((f, i) => bell(f, t0 + 0.6 + i * 0.055, 0.18, 2.0));
        shimmer(t0 + 0.7, 2.2, 0.1);
        // final halo
        bell(N.C6, t0 + 1.4, 0.15, 2.8);
        bell(N.E6, t0 + 1.5, 0.13, 2.8);
        bell(N.G6, t0 + 1.6, 0.11, 2.8);
        return 6.0;
      }
    }
  } catch {}
  return 1;
}
