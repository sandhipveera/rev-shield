"use client";

import { useCallback, useRef } from "react";

export function useSoundEffects() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.15) => {
      try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Audio may not be available
      }
    },
    [getCtx]
  );

  // Alert sound: two quick descending tones
  const playAlert = useCallback(() => {
    playTone(880, 0.15, "square", 0.1);
    setTimeout(() => playTone(660, 0.2, "square", 0.1), 150);
    setTimeout(() => playTone(440, 0.3, "square", 0.08), 350);
  }, [playTone]);

  // Detection blip
  const playDetect = useCallback(() => {
    playTone(600, 0.1, "sine", 0.1);
  }, [playTone]);

  // Score reveal
  const playScore = useCallback(() => {
    playTone(440, 0.1, "triangle", 0.08);
    setTimeout(() => playTone(550, 0.1, "triangle", 0.08), 100);
  }, [playTone]);

  // Diagnosis
  const playDiagnose = useCallback(() => {
    playTone(500, 0.15, "sine", 0.08);
    setTimeout(() => playTone(600, 0.15, "sine", 0.08), 120);
    setTimeout(() => playTone(700, 0.15, "sine", 0.08), 240);
  }, [playTone]);

  // Heal / remediation
  const playHeal = useCallback(() => {
    playTone(400, 0.12, "triangle", 0.08);
    setTimeout(() => playTone(500, 0.12, "triangle", 0.08), 100);
    setTimeout(() => playTone(600, 0.12, "triangle", 0.08), 200);
    setTimeout(() => playTone(800, 0.2, "triangle", 0.1), 300);
  }, [playTone]);

  // Success chime: ascending major chord
  const playSuccess = useCallback(() => {
    playTone(523, 0.3, "sine", 0.1);  // C5
    setTimeout(() => playTone(659, 0.3, "sine", 0.1), 150);  // E5
    setTimeout(() => playTone(784, 0.4, "sine", 0.12), 300); // G5
    setTimeout(() => playTone(1047, 0.5, "sine", 0.1), 500); // C6
  }, [playTone]);

  return { playAlert, playDetect, playScore, playDiagnose, playHeal, playSuccess };
}
