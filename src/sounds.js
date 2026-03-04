// ============================================================
// KIRSHAS MONOPOLIA — Sound Engine (Tone.js + Custom Audio)
// ============================================================
import * as Tone from 'tone';

let audioStarted = false;
let customAudioConfig = {};
let musicPlayer = null;
let currentMusicKey = null;

export const startAudio = async () => {
  if (!audioStarted) {
    await Tone.start();
    audioStarted = true;
  }
};

// --- CUSTOM AUDIO CONFIG (set by Game.jsx from devData) ---
export function setCustomAudio(audioConfig) {
  customAudioConfig = audioConfig || {};
}

// --- PLAY CUSTOM SFX from URL ---
function playCustomSfx(url, vol) {
  try {
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, vol));
    audio.play().catch(() => {});
    return true;
  } catch { return false; }
}

// --- BACKGROUND MUSIC ---
export function playMusic(key, vol = 0.5) {
  stopMusic();
  const url = customAudioConfig[key];
  if (!url) return;
  try {
    musicPlayer = new Audio(url);
    musicPlayer.loop = true;
    musicPlayer.volume = Math.min(1, Math.max(0, vol));
    musicPlayer.play().catch(() => {});
    currentMusicKey = key;
  } catch {}
}

export function stopMusic() {
  if (musicPlayer) {
    musicPlayer.pause();
    musicPlayer.currentTime = 0;
    musicPlayer = null;
    currentMusicKey = null;
  }
}

export function setMusicVolume(vol) {
  if (musicPlayer) musicPlayer.volume = Math.min(1, Math.max(0, vol));
}

export function getCurrentMusicKey() {
  return currentMusicKey;
}

// --- SFX FUNCTIONS (with custom audio fallback) ---

export const playDiceSound = (vol) => {
  if (vol <= 0) return;
  if (customAudioConfig.sfx_dice && playCustomSfx(customAudioConfig.sfx_dice, vol)) return;
  try {
    const synth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0 }
    }).toDestination();
    synth.volume.value = -20 + vol * 10;
    synth.triggerAttackRelease("8n");
    setTimeout(() => synth.dispose(), 500);
  } catch {}
};

export const playMoveSound = (vol) => {
  if (vol <= 0) return;
  if (customAudioConfig.sfx_move && playCustomSfx(customAudioConfig.sfx_move, vol * 0.5)) return;
  try {
    const synth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0 }
    }).toDestination();
    synth.volume.value = -15 + vol * 8;
    synth.triggerAttackRelease("C5", "16n");
    setTimeout(() => synth.dispose(), 300);
  } catch {}
};

export const playBuySound = (vol) => {
  if (vol <= 0) return;
  if (customAudioConfig.sfx_buy && playCustomSfx(customAudioConfig.sfx_buy, vol)) return;
  try {
    const synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0 }
    }).toDestination();
    synth.volume.value = -15 + vol * 8;
    synth.triggerAttackRelease("E5", "8n");
    setTimeout(() => { synth.triggerAttackRelease("G5", "8n"); }, 100);
    setTimeout(() => synth.dispose(), 500);
  } catch {}
};

export const playClickSound = (vol) => {
  if (vol <= 0) return;
  if (customAudioConfig.sfx_click && playCustomSfx(customAudioConfig.sfx_click, vol)) return;
  try {
    const synth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.005, decay: 0.05, sustain: 0 }
    }).toDestination();
    synth.volume.value = -25 + vol * 5;
    synth.triggerAttackRelease("A4", "32n");
    setTimeout(() => synth.dispose(), 200);
  } catch {}
};

export const playJailSound = (vol) => {
  if (vol <= 0) return;
  if (customAudioConfig.sfx_jail && playCustomSfx(customAudioConfig.sfx_jail, vol)) return;
  try {
    const synth = new Tone.Synth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0 }
    }).toDestination();
    synth.volume.value = -15 + vol * 8;
    synth.triggerAttackRelease("C3", "4n");
    setTimeout(() => synth.dispose(), 600);
  } catch {}
};

export const playVictorySound = (vol) => {
  if (vol <= 0) return;
  if (customAudioConfig.sfx_victory && playCustomSfx(customAudioConfig.sfx_victory, vol)) return;
  try {
    const synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.5 }
    }).toDestination();
    synth.volume.value = -10 + vol * 8;
    const notes = ["C5", "E5", "G5", "C6"];
    notes.forEach((note, i) => {
      setTimeout(() => synth.triggerAttackRelease(note, "8n"), i * 150);
    });
    setTimeout(() => synth.dispose(), 1200);
  } catch {}
};
