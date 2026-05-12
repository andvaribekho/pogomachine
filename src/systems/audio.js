let audioCtx = null;
let lastEmptySoundTime = -Infinity;
let invulnerabilityAudio = null;

function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playBounceSound() {
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
  } catch (_) {
    /* silent */
  }
}

export function playFailSound() {
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.45);
    gain.gain.setValueAtTime(0.32, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (_) {
    /* silent */
  }
}

export function playShootSound() {
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.13);
  } catch (_) {
    /* silent */
  }
}

export function playEmptyAmmoSound() {
  try {
    const ctx = ensureAudioCtx();
    if (ctx.currentTime - lastEmptySoundTime < 0.08) return;
    lastEmptySoundTime = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.setValueAtTime(110, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.16);
  } catch (_) {
    /* silent */
  }
}

export function playReloadSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(180, now);
    click.frequency.exponentialRampToValueAtTime(95, now + 0.055);
    clickGain.gain.setValueAtTime(0.22, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(now);
    click.stop(now + 0.08);

    const ching = ctx.createOscillator();
    const chingGain = ctx.createGain();
    ching.type = 'sine';
    ching.frequency.setValueAtTime(1320, now + 0.055);
    ching.frequency.exponentialRampToValueAtTime(1900, now + 0.13);
    chingGain.gain.setValueAtTime(0.001, now + 0.045);
    chingGain.gain.linearRampToValueAtTime(0.24, now + 0.065);
    chingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    ching.connect(chingGain);
    chingGain.connect(ctx.destination);
    ching.start(now + 0.045);
    ching.stop(now + 0.42);
  } catch (_) {
    /* silent */
  }
}

export function playBatDeathSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1250, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch (_) {
    /* silent */
  }
}

export function playBossDeathSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const growl = ctx.createOscillator();
    const grind = ctx.createOscillator();
    const gain = ctx.createGain();
    growl.type = 'sawtooth';
    grind.type = 'square';
    growl.frequency.setValueAtTime(135, now);
    growl.frequency.exponentialRampToValueAtTime(48, now + 2.8);
    grind.frequency.setValueAtTime(72, now);
    grind.frequency.exponentialRampToValueAtTime(34, now + 3);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.36, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3);
    growl.connect(gain);
    grind.connect(gain);
    gain.connect(ctx.destination);
    growl.start(now);
    grind.start(now);
    growl.stop(now + 3);
    grind.stop(now + 3);
  } catch (_) {
    /* silent */
  }
}

export function playBossSpawnSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const roar = ctx.createOscillator();
    const gain = ctx.createGain();
    roar.type = 'sawtooth';
    roar.frequency.setValueAtTime(95, now);
    roar.frequency.exponentialRampToValueAtTime(210, now + 0.2);
    roar.frequency.exponentialRampToValueAtTime(70, now + 0.85);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    roar.connect(gain);
    gain.connect(ctx.destination);
    roar.start(now);
    roar.stop(now + 0.9);
  } catch (_) {
    /* silent */
  }
}

export function playCannonActivateSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.32);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  } catch (_) {
    /* silent */
  }
}

export function playCannonFireSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const zap = ctx.createOscillator();
    const zapGain = ctx.createGain();
    zap.type = 'square';
    zap.frequency.setValueAtTime(1300, now);
    zap.frequency.exponentialRampToValueAtTime(220, now + 0.16);
    zapGain.gain.setValueAtTime(0.28, now);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    zap.connect(zapGain);
    zapGain.connect(ctx.destination);
    zap.start(now);
    zap.stop(now + 0.2);
  } catch (_) {
    /* silent */
  }
}

export function playRewardSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(780, now + 0.06);
    osc.frequency.setValueAtTime(1040, now + 0.13);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch (_) {
    /* silent */
  }
}

export function playCoinCubeCollectSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1480, now + 0.08);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch (_) {
    /* silent */
  }
}

export function playGlassBreakSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1350, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.18);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch (_) {
    /* silent */
  }
}

export function playPufferExplosionSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sawtooth';
    boom.frequency.setValueAtTime(180, now);
    boom.frequency.exponentialRampToValueAtTime(45, now + 0.38);
    boomGain.gain.setValueAtTime(0.34, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    boom.connect(boomGain);
    boomGain.connect(ctx.destination);
    boom.start(now);
    boom.stop(now + 0.42);

    const pop = ctx.createOscillator();
    const popGain = ctx.createGain();
    pop.type = 'square';
    pop.frequency.setValueAtTime(520, now);
    pop.frequency.exponentialRampToValueAtTime(120, now + 0.09);
    popGain.gain.setValueAtTime(0.22, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    pop.connect(popGain);
    popGain.connect(ctx.destination);
    pop.start(now);
    pop.stop(now + 0.12);
  } catch (_) {
    /* silent */
  }
}

export function playMetallicBlipSound() {
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (_) {
    /* silent */
  }
}

export function playAcidBurnSound() {
  try {
    const ctx = ensureAudioCtx();
    const now = ctx.currentTime;
    const hiss = ctx.createOscillator();
    const hissGain = ctx.createGain();
    hiss.type = 'sawtooth';
    hiss.frequency.setValueAtTime(2200, now);
    hiss.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    hissGain.gain.setValueAtTime(0.18, now);
    hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    hiss.connect(hissGain);
    hissGain.connect(ctx.destination);
    hiss.start(now);
    hiss.stop(now + 0.25);
    const pop = ctx.createOscillator();
    const popGain = ctx.createGain();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(300, now + 0.05);
    pop.frequency.exponentialRampToValueAtTime(120, now + 0.15);
    popGain.gain.setValueAtTime(0.14, now + 0.05);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    pop.connect(popGain);
    popGain.connect(ctx.destination);
    pop.start(now + 0.05);
    pop.stop(now + 0.2);
  } catch (_) {
    /* silent */
  }
}

export function startInvulnerabilityMusic() {
  try {
    if (invulnerabilityAudio) return;
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.045, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    invulnerabilityAudio = { osc, gain, nextChange: 0, note: 0 };
  } catch (_) {
    /* silent */
  }
}

export function updateInvulnerabilityMusic() {
  if (!invulnerabilityAudio || !audioCtx) return;
  const notes = [660, 880, 990, 1320];
  if (audioCtx.currentTime >= invulnerabilityAudio.nextChange) {
    invulnerabilityAudio.osc.frequency.setValueAtTime(notes[invulnerabilityAudio.note % notes.length], audioCtx.currentTime);
    invulnerabilityAudio.note += 1;
    invulnerabilityAudio.nextChange = audioCtx.currentTime + 0.16;
  }
}

export function stopInvulnerabilityMusic() {
  if (!invulnerabilityAudio || !audioCtx) return;
  invulnerabilityAudio.gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  invulnerabilityAudio.osc.stop(audioCtx.currentTime + 0.14);
  invulnerabilityAudio = null;
}
