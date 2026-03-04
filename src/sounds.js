// ============================================================
// KIRSHAS MONOPOLIA — Sound Engine (Tone.js + Playlist System)
// ============================================================
import * as Tone from 'tone';

let audioStarted = false;
let customAudioConfig = {};

// --- PLAYLIST SYSTEM ---
let currentPlaylist = null;   // { keys: [...], index: 0, mode: 'menu'|'game' }
let musicPlayer = null;
let nextMusicPlayer = null;   // for crossfade
let currentMusicKey = null;
let musicVolume = 0.5;
let fadeDuration = 2000;      // ms crossfade
let fadeTimer = null;
let playlistTimer = null;

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

// --- PLAYLIST MUSIC SYSTEM ---

// Start a playlist of music keys that cycle
// keys: array of audio config keys like ['menuMusic', 'menuMusic2', ...]
// or a single mode string like 'menu' or 'game' which auto-collects matching keys
export function startPlaylist(mode, vol = 0.5) {
  stopMusic();
  musicVolume = Math.min(1, Math.max(0, vol));

  // Collect all keys for this mode
  const prefix = mode === 'menu' ? 'menuMusic' : mode === 'game' ? 'gameMusic' : mode;
  const keys = [];

  // Check for exact key first
  if (customAudioConfig[prefix]) keys.push(prefix);

  // Check numbered variants (menuMusic2, menuMusic3, etc.)
  for (let i = 2; i <= 20; i++) {
    const k = `${prefix}${i}`;
    if (customAudioConfig[k]) keys.push(k);
  }

  // Also check related keys for game mode
  if (mode === 'game') {
    if (customAudioConfig.battleMusic) keys.push('battleMusic');
    if (customAudioConfig.winterMusic) keys.push('winterMusic');
  }

  if (keys.length === 0) return;

  currentPlaylist = { keys, index: 0, mode };
  playTrack(0);
}

function playTrack(index) {
  if (!currentPlaylist || currentPlaylist.keys.length === 0) return;

  const idx = index % currentPlaylist.keys.length;
  currentPlaylist.index = idx;
  const key = currentPlaylist.keys[idx];
  const url = customAudioConfig[key];
  if (!url) { playNextTrack(); return; }

  try {
    if (musicPlayer) {
      musicPlayer.pause();
      musicPlayer = null;
    }

    musicPlayer = new Audio(url);
    musicPlayer.volume = musicVolume;
    currentMusicKey = key;

    // When track ends, crossfade to next
    musicPlayer.addEventListener('ended', () => {
      playNextTrack();
    });

    // Start fade-in
    musicPlayer.volume = 0;
    musicPlayer.play().catch(() => {});
    fadeIn(musicPlayer, musicVolume, fadeDuration);
  } catch {}
}

function playNextTrack() {
  if (!currentPlaylist || currentPlaylist.keys.length === 0) return;

  const nextIdx = (currentPlaylist.index + 1) % currentPlaylist.keys.length;
  const key = currentPlaylist.keys[nextIdx];
  const url = customAudioConfig[key];
  if (!url) {
    currentPlaylist.index = nextIdx;
    // try next after that
    if (currentPlaylist.keys.length > 1) playNextTrack();
    return;
  }

  // Crossfade: fade out current, fade in next
  const oldPlayer = musicPlayer;

  try {
    nextMusicPlayer = new Audio(url);
    nextMusicPlayer.volume = 0;
    currentMusicKey = key;
    currentPlaylist.index = nextIdx;

    nextMusicPlayer.addEventListener('ended', () => {
      playNextTrack();
    });

    nextMusicPlayer.play().catch(() => {});

    // Crossfade
    fadeOut(oldPlayer, fadeDuration);
    fadeIn(nextMusicPlayer, musicVolume, fadeDuration);

    // After fade, clean up old
    setTimeout(() => {
      if (oldPlayer) {
        oldPlayer.pause();
        oldPlayer.src = '';
      }
    }, fadeDuration + 100);

    musicPlayer = nextMusicPlayer;
    nextMusicPlayer = null;
  } catch {}
}

function fadeIn(audio, targetVol, duration) {
  if (!audio) return;
  const steps = 20;
  const interval = duration / steps;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    audio.volume = Math.min(targetVol, (step / steps) * targetVol);
    if (step >= steps) clearInterval(timer);
  }, interval);
}

function fadeOut(audio, duration) {
  if (!audio) return;
  const startVol = audio.volume;
  const steps = 20;
  const interval = duration / steps;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    audio.volume = Math.max(0, startVol * (1 - step / steps));
    if (step >= steps) clearInterval(timer);
  }, interval);
}

// Legacy single-track play (still works)
export function playMusic(key, vol = 0.5) {
  stopMusic();
  musicVolume = Math.min(1, Math.max(0, vol));
  const url = customAudioConfig[key];
  if (!url) return;
  try {
    musicPlayer = new Audio(url);
    musicPlayer.loop = true;
    musicPlayer.volume = musicVolume;
    musicPlayer.play().catch(() => {});
    currentMusicKey = key;
  } catch {}
}

export function stopMusic() {
  if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
  if (playlistTimer) { clearTimeout(playlistTimer); playlistTimer = null; }
  if (musicPlayer) {
    musicPlayer.pause();
    musicPlayer.src = '';
    musicPlayer = null;
  }
  if (nextMusicPlayer) {
    nextMusicPlayer.pause();
    nextMusicPlayer.src = '';
    nextMusicPlayer = null;
  }
  currentMusicKey = null;
  currentPlaylist = null;
}

export function setMusicVolume(vol) {
  musicVolume = Math.min(1, Math.max(0, vol));
  if (musicPlayer) musicPlayer.volume = musicVolume;
}

export function getCurrentMusicKey() {
  return currentMusicKey;
}

export function getCurrentPlaylistMode() {
  return currentPlaylist?.mode || null;
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
