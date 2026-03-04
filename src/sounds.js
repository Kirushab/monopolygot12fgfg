// ============================================================
// KIRSHAS MONOPOLIA — Sound Engine (Tone.js)
// ============================================================
import * as Tone from 'tone';

let audioStarted = false;

export const startAudio = async () => {
  if (!audioStarted) {
    await Tone.start();
    audioStarted = true;
  }
};

export const playDiceSound = (vol) => {
  if (vol <= 0) return;
  try {
    const synth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0 }
    }).toDestination();
    synth.volume.value = -20 + vol * 10;
    synth.triggerAttackRelease("8n");
    setTimeout(() => synth.dispose(), 500);
  } catch (e) {}
};

export const playMoveSound = (vol) => {
  if (vol <= 0) return;
  try {
    const synth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0 }
    }).toDestination();
    synth.volume.value = -15 + vol * 8;
    synth.triggerAttackRelease("C5", "16n");
    setTimeout(() => synth.dispose(), 300);
  } catch (e) {}
};

export const playBuySound = (vol) => {
  if (vol <= 0) return;
  try {
    const synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0 }
    }).toDestination();
    synth.volume.value = -15 + vol * 8;
    synth.triggerAttackRelease("E5", "8n");
    setTimeout(() => { synth.triggerAttackRelease("G5", "8n"); }, 100);
    setTimeout(() => synth.dispose(), 500);
  } catch (e) {}
};

export const playClickSound = (vol) => {
  if (vol <= 0) return;
  try {
    const synth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.005, decay: 0.05, sustain: 0 }
    }).toDestination();
    synth.volume.value = -25 + vol * 5;
    synth.triggerAttackRelease("A4", "32n");
    setTimeout(() => synth.dispose(), 200);
  } catch (e) {}
};
